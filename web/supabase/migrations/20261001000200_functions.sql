-- =============================================================================
-- Business functions. Everything that must be atomic lives here.
-- Functions that change money or capacity are callable by the server only.
-- =============================================================================

-- ---------------------------------------------------------------- roles
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and not is_blocked
  );
$$;

-- Adds `user_role` to every access token so the proxy can route by role
-- without a database round trip. Enable it in Dashboard → Authentication → Hooks.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable as $$
declare
  claims jsonb;
  user_role public.user_role;
begin
  select p.role into user_role from public.profiles p where p.id = (event ->> 'user_id')::uuid;
  claims := coalesce(event -> 'claims', '{}'::jsonb);
  claims := jsonb_set(claims, '{user_role}', to_jsonb(coalesce(user_role, 'customer')::text));
  return jsonb_set(event, '{claims}', claims);
end $$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
grant select on table public.profiles to supabase_auth_admin;

-- ---------------------------------------------------------------- slots
-- Holds one place in a slot and creates the booking in the same transaction,
-- so two customers can never take the last place.
create or replace function public.create_pending_booking(p jsonb, p_hold_minutes int default 10)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare
  s public.time_slots;
  b public.bookings;
begin
  select * into s from public.time_slots where id = (p ->> 'slot_id')::uuid for update;
  if not found then
    raise exception 'SLOT_NOT_FOUND';
  end if;
  if s.is_blocked or s.booked >= s.capacity then
    raise exception 'SLOT_FULL';
  end if;
  if s.area_id <> (p ->> 'area_id')::uuid then
    raise exception 'SLOT_AREA_MISMATCH';
  end if;

  update public.time_slots set booked = booked + 1 where id = s.id;

  insert into public.bookings (
    customer_id, city_id, area_id, service_id, slot_id, offer_id, status_changed_by,
    slot_date, slot_start, slot_end,
    vehicle_type, vehicle_make_model, vehicle_plate,
    address_line, landmark, pincode, parking_type, parking_spot, car_access,
    contact_name, contact_phone, notes,
    base_price, area_charge, discount, total, expires_at
  ) values (
    (p ->> 'customer_id')::uuid, (p ->> 'city_id')::uuid, s.area_id, (p ->> 'service_id')::uuid, s.id,
    nullif(p ->> 'offer_id', '')::uuid, (p ->> 'customer_id')::uuid,
    s.slot_date, s.start_time, s.end_time,
    (p ->> 'vehicle_type')::public.vehicle_type, p ->> 'vehicle_make_model', p ->> 'vehicle_plate',
    p ->> 'address_line', nullif(p ->> 'landmark', ''), p ->> 'pincode',
    (p ->> 'parking_type')::public.parking_type, nullif(p ->> 'parking_spot', ''),
    (p ->> 'car_access')::public.car_access,
    p ->> 'contact_name', p ->> 'contact_phone', nullif(p ->> 'notes', ''),
    (p ->> 'base_price')::int, (p ->> 'area_charge')::int, (p ->> 'discount')::int, (p ->> 'total')::int,
    now() + make_interval(mins => p_hold_minutes)
  )
  returning * into b;

  return b;
end $$;

create or replace function public.release_slot(p_slot_id uuid)
returns void language sql security definer set search_path = '' as $$
  update public.time_slots set booked = greatest(0, booked - 1) where id = p_slot_id;
$$;

-- Moves a booking to another slot atomically (reschedule).
create or replace function public.move_booking_slot(p_booking_id uuid, p_new_slot_id uuid, p_actor uuid)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare
  b public.bookings;
  s public.time_slots;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;

  select * into s from public.time_slots where id = p_new_slot_id for update;
  if not found then raise exception 'SLOT_NOT_FOUND'; end if;
  if s.area_id <> b.area_id then raise exception 'SLOT_AREA_MISMATCH'; end if;
  if s.is_blocked or s.booked >= s.capacity then raise exception 'SLOT_FULL'; end if;

  update public.time_slots set booked = booked + 1 where id = s.id;
  update public.time_slots set booked = greatest(0, booked - 1) where id = b.slot_id;

  update public.bookings
     set slot_id = s.id, slot_date = s.slot_date, slot_start = s.start_time, slot_end = s.end_time,
         worker_id = null,
         status = case when status in ('assigned', 'accepted') then 'confirmed'::public.booking_status else status end,
         status_changed_by = p_actor
   where id = b.id
  returning * into b;
  return b;
end $$;

-- Runs every minute: unpaid bookings older than their hold are expired.
create or replace function public.expire_pending_bookings()
returns int language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  with expired as (
    update public.bookings
       set status = 'expired', status_changed_by = null
     where status = 'pending_payment' and expires_at < now()
    returning slot_id
  ), released as (
    update public.time_slots t
       set booked = greatest(0, t.booked - x.cnt)
      from (select slot_id, count(*)::int as cnt from expired group by slot_id) x
     where t.id = x.slot_id
    returning 1
  )
  select count(*) into n from expired;
  return n;
end $$;

-- Creates slots for the next p_days days for every active area of every active
-- city. Capacity defaults to the number of active workers in the area (min 1).
create or replace function public.generate_time_slots(p_days int default 14)
returns int language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  insert into public.time_slots (area_id, slot_date, start_time, end_time, capacity)
  select a.id,
         d::date,
         t::time,
         (t + make_interval(mins => c.slot_minutes))::time,
         greatest(1, (select count(*) from public.workers w where w.area_id = a.id and w.status = 'active'))
    from public.cities c
    join public.service_areas a on a.city_id = c.id and a.is_active
   cross join lateral generate_series(
           (now() at time zone c.timezone)::date,
           (now() at time zone c.timezone)::date + (p_days - 1),
           interval '1 day') as d
   cross join lateral generate_series(
           timestamp '2000-01-01' + c.open_time,
           timestamp '2000-01-01' + c.close_time - make_interval(mins => c.slot_minutes),
           make_interval(mins => c.slot_minutes)) as t
   where c.is_active
  on conflict (area_id, slot_date, start_time) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------- payments
-- Idempotent: safe to call from both the checkout callback and the webhook.
-- If the hold expired before payment arrived, the slot is re-taken when
-- possible; otherwise the booking is cancelled and `needs_refund` is true.
create or replace function public.confirm_payment(
  p_order_id text, p_payment_id text, p_method text, p_raw jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  pay public.payments;
  b public.bookings;
  s public.time_slots;
  needs_refund boolean := false;
begin
  select * into pay from public.payments where provider_order_id = p_order_id for update;
  if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;

  select * into b from public.bookings where id = pay.booking_id for update;

  if pay.status = 'captured' then
    return jsonb_build_object('booking_id', b.id, 'status', b.status, 'needs_refund', false, 'already', true);
  end if;

  update public.payments
     set status = 'captured', provider_payment_id = p_payment_id, method = p_method,
         raw = coalesce(p_raw, raw), error_reason = null
   where id = pay.id;

  if b.status = 'pending_payment' then
    update public.bookings set status = 'confirmed', expires_at = null, status_changed_by = null
     where id = b.id returning * into b;
  elsif b.status = 'expired' then
    select * into s from public.time_slots where id = b.slot_id for update;
    if not s.is_blocked and s.booked < s.capacity then
      update public.time_slots set booked = booked + 1 where id = s.id;
      update public.bookings set status = 'confirmed', expires_at = null, status_changed_by = null
       where id = b.id returning * into b;
    else
      update public.bookings
         set status = 'cancelled', cancelled_reason = 'Slot was no longer available when payment arrived',
             status_changed_by = null
       where id = b.id returning * into b;
      needs_refund := true;
    end if;
  elsif b.status = 'cancelled' then
    -- Customer cancelled while the payment was still in flight.
    needs_refund := true;
  end if;

  if b.status = 'confirmed' and b.offer_id is not null then
    insert into public.offer_usages (offer_id, user_id, booking_id, discount)
    values (b.offer_id, b.customer_id, b.id, b.discount)
    on conflict (booking_id) do nothing;
    if found then
      update public.offers set used_count = used_count + 1 where id = b.offer_id;
    end if;
  end if;

  return jsonb_build_object('booking_id', b.id, 'status', b.status, 'needs_refund', needs_refund, 'already', false);
end $$;

create or replace function public.mark_payment_failed(p_order_id text, p_reason text, p_raw jsonb)
returns void language sql security definer set search_path = '' as $$
  update public.payments
     set status = 'failed', error_reason = left(p_reason, 500), raw = coalesce(p_raw, raw)
   where provider_order_id = p_order_id and status = 'created';
$$;

-- ---------------------------------------------------------------- earnings & ratings
create or replace function public.on_booking_completed()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  rate numeric;
begin
  if new.status = 'completed' and old.status is distinct from 'completed' and new.worker_id is not null then
    select commission_rate into rate from public.workers where id = new.worker_id;
    insert into public.worker_earnings (worker_id, booking_id, amount)
    values (new.worker_id, new.id, round((new.base_price + new.area_charge) * coalesce(rate, 0.4)))
    on conflict (booking_id) do nothing;
    update public.workers set jobs_done = jobs_done + 1 where id = new.worker_id;
  end if;
  return new;
end $$;

create trigger bookings_completed
  after update of status on public.bookings
  for each row execute function public.on_booking_completed();

create or replace function public.on_review_created()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.worker_id is not null then
    update public.workers
       set rating = round(((rating * rating_count) + new.rating) / (rating_count + 1), 1),
           rating_count = rating_count + 1
     where id = new.worker_id;
  end if;
  return new;
end $$;

create trigger reviews_update_rating
  after insert on public.reviews
  for each row execute function public.on_review_created();

-- Groups last week's (Mon–Sun, IST) pending earnings into one payout per worker.
create or replace function public.build_weekly_payouts()
returns int language plpgsql security definer set search_path = '' as $$
declare
  week_start date := date_trunc('week', (now() at time zone 'Asia/Kolkata'))::date - 7;
  week_end   date := week_start + 6;
  n int;
begin
  with grouped as (
    select e.worker_id, sum(e.amount)::int as total
      from public.worker_earnings e
     where e.status = 'pending'
       and (e.created_at at time zone 'Asia/Kolkata')::date <= week_end
     group by e.worker_id
  ), inserted as (
    insert into public.payouts (worker_id, period_start, period_end, total)
    select worker_id, week_start, week_end, total from grouped
    on conflict (worker_id, period_start) do nothing
    returning id, worker_id
  ), linked as (
    update public.worker_earnings e
       set status = 'in_payout', payout_id = i.id
      from inserted i
     where e.worker_id = i.worker_id
       and e.status = 'pending'
       and (e.created_at at time zone 'Asia/Kolkata')::date <= week_end
    returning 1
  )
  select count(*) into n from inserted;
  return n;
end $$;

-- ---------------------------------------------------------------- lock down
revoke execute on function public.create_pending_booking(jsonb, int) from public, anon, authenticated;
revoke execute on function public.release_slot(uuid) from public, anon, authenticated;
revoke execute on function public.move_booking_slot(uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.expire_pending_bookings() from public, anon, authenticated;
revoke execute on function public.generate_time_slots(int) from public, anon, authenticated;
revoke execute on function public.confirm_payment(text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.mark_payment_failed(text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.build_weekly_payouts() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

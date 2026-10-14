-- =============================================================================
-- Offers v2: more discount types, finer targeting, monthly plan offers,
-- stacking, budgets, and restoring a coupon when its booking is cancelled.
--
-- New enum values are added here but not used anywhere else in this file,
-- so the migration is safe to run as a single transaction.
-- =============================================================================

-- ---------------------------------------------------------------- discount types
-- fixed_price       value = the final price the customer pays (area charge included)
-- price_match       customer pays the price of `price_service_id` (a free upgrade)
-- free_area_charge  removes the area (doorstep) charge
alter type public.discount_type add value if not exists 'fixed_price';
alter type public.discount_type add value if not exists 'price_match';
alter type public.discount_type add value if not exists 'free_area_charge';

-- ---------------------------------------------------------------- customer segments
-- returning    has at least one completed wash
-- inactive     has completed washes, but none in the last `inactive_days`
-- subscribers  has an active or paused monthly plan
-- list         email is in `customer_emails`
alter type public.offer_user_type add value if not exists 'returning';
alter type public.offer_user_type add value if not exists 'inactive';
alter type public.offer_user_type add value if not exists 'subscribers';
alter type public.offer_user_type add value if not exists 'list';

-- ---------------------------------------------------------------- offer rules
alter table public.offers
  add column if not exists applies_to text not null default 'booking' check (applies_to in ('booking', 'plan', 'both')),
  add column if not exists vehicle_types public.vehicle_type[] not null default '{}',
  add column if not exists area_ids uuid[] not null default '{}',
  add column if not exists plan_ids uuid[] not null default '{}',
  -- 0 = Sunday … 6 = Saturday, matched against the wash date (not the booking date).
  add column if not exists weekdays smallint[] not null default '{}',
  add column if not exists time_from time,
  add column if not exists time_to time,
  add column if not exists inactive_days int not null default 30 check (inactive_days between 1 and 365),
  add column if not exists customer_emails citext[] not null default '{}',
  -- Loyalty: needs this many completed washes, and/or applies to every Nth wash.
  add column if not exists min_completed int not null default 0 check (min_completed >= 0),
  add column if not exists every_nth int check (every_nth between 2 and 50),
  add column if not exists price_service_id uuid references public.services (id) on delete set null,
  -- Plan offers: how many paid months the discount applies to.
  add column if not exists plan_months int not null default 1 check (plan_months between 1 and 12),
  add column if not exists stackable boolean not null default false,
  add column if not exists priority int not null default 0,
  add column if not exists budget int check (budget > 0),
  add column if not exists daily_limit int check (daily_limit > 0),
  add column if not exists discount_given int not null default 0 check (discount_given >= 0),
  add column if not exists terms text check (char_length(terms) <= 300);

alter table public.offers drop constraint if exists offers_time_window_check;
alter table public.offers add constraint offers_time_window_check
  check ((time_from is null) = (time_to is null) and (time_from is null or time_to > time_from));

-- ---------------------------------------------------------------- usages: bookings or plan payments, several offers per booking
alter table public.offer_usages alter column booking_id drop not null;
alter table public.offer_usages drop constraint if exists offer_usages_booking_id_key;
alter table public.offer_usages add column if not exists subscription_payment_id uuid
  references public.subscription_payments (id) on delete cascade;
alter table public.offer_usages drop constraint if exists offer_usages_offer_booking_key;
alter table public.offer_usages add constraint offer_usages_offer_booking_key unique (offer_id, booking_id);
alter table public.offer_usages drop constraint if exists offer_usages_offer_sub_payment_key;
alter table public.offer_usages add constraint offer_usages_offer_sub_payment_key unique (offer_id, subscription_payment_id);
alter table public.offer_usages drop constraint if exists offer_usages_target_check;
alter table public.offer_usages add constraint offer_usages_target_check
  check (num_nonnulls(booking_id, subscription_payment_id) = 1);
create index if not exists offer_usages_offer_day_idx on public.offer_usages (offer_id, created_at);

-- Every offer applied to a booking, as [{"offer_id": "...", "discount": 50}, ...].
-- `bookings.offer_id` keeps the main one for existing reports.
alter table public.bookings add column if not exists applied_offers jsonb not null default '[]';

-- ---------------------------------------------------------------- plan discounts
alter table public.subscriptions
  add column if not exists offer_id uuid references public.offers (id) on delete set null,
  add column if not exists discount int not null default 0 check (discount >= 0);
alter table public.subscriptions drop constraint if exists subscriptions_total_check;
alter table public.subscriptions add constraint subscriptions_total_check
  check (total = plan_price + area_charge - discount and total >= 1);

alter table public.subscription_payments
  add column if not exists offer_id uuid references public.offers (id) on delete set null,
  add column if not exists discount int not null default 0 check (discount >= 0);

-- ---------------------------------------------------------------- bookkeeping triggers
-- Keep `discount_given` (used for budgets and reports) in step with usages.
create or replace function public.on_offer_usage_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update public.offers set discount_given = discount_given + new.discount where id = new.offer_id;
    return new;
  end if;
  update public.offers
     set used_count = greatest(0, used_count - 1),
         discount_given = greatest(0, discount_given - old.discount)
   where id = old.offer_id;
  return old;
end $$;

drop trigger if exists offer_usages_bookkeeping on public.offer_usages;
create trigger offer_usages_bookkeeping
  after insert or delete on public.offer_usages
  for each row execute function public.on_offer_usage_change();

-- A cancelled booking gives its coupons back to the customer.
create or replace function public.release_offer_usages()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    delete from public.offer_usages where booking_id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists bookings_release_offers on public.bookings;
create trigger bookings_release_offers
  after update of status on public.bookings
  for each row execute function public.release_offer_usages();

-- Records one offer use atomically. Safe to call twice: returns false the second time.
create or replace function public.record_offer_usage(
  p_offer_id uuid, p_user_id uuid, p_booking_id uuid, p_subscription_payment_id uuid, p_discount int
) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  insert into public.offer_usages (offer_id, user_id, booking_id, subscription_payment_id, discount)
  values (p_offer_id, p_user_id, p_booking_id, p_subscription_payment_id, greatest(0, p_discount))
  on conflict do nothing;
  if found then
    update public.offers set used_count = used_count + 1 where id = p_offer_id;
    return true;
  end if;
  return false;
end $$;

-- ---------------------------------------------------------------- payment capture records every applied offer
create or replace function public.confirm_payment(
  p_order_id text, p_payment_id text, p_method text, p_raw jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  pay public.payments;
  b public.bookings;
  s public.time_slots;
  item record;
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
    needs_refund := true;
  end if;

  if b.status = 'confirmed' then
    for item in
      select x.offer_id, x.discount
        from jsonb_to_recordset(
               case
                 when jsonb_array_length(b.applied_offers) > 0 then b.applied_offers
                 when b.offer_id is not null then jsonb_build_array(jsonb_build_object('offer_id', b.offer_id, 'discount', b.discount))
                 else '[]'::jsonb
               end
             ) as x(offer_id uuid, discount int)
    loop
      perform public.record_offer_usage(item.offer_id, b.customer_id, b.id, null, item.discount);
    end loop;
  end if;

  return jsonb_build_object('booking_id', b.id, 'status', b.status, 'needs_refund', needs_refund, 'already', false);
end $$;

revoke execute on function public.record_offer_usage(uuid, uuid, uuid, uuid, int) from public, anon, authenticated;
revoke execute on function public.on_offer_usage_change() from public, anon, authenticated;
revoke execute on function public.release_offer_usages() from public, anon, authenticated;
revoke execute on function public.confirm_payment(text, text, text, jsonb) from public, anon, authenticated;

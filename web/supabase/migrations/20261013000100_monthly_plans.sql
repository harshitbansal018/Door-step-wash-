-- =============================================================================
-- Monthly plans (prepaid subscriptions)
--
-- A plan is a bundle of washes per month at a per-city, per-vehicle price.
-- A subscription is one customer on one plan, paid month by month upfront.
-- Each wash in the month is a normal booking (status confirmed, total 0)
-- created automatically in the customer's fixed weekly slot, so assignment,
-- job progress, photos, earnings and reviews all work unchanged.
-- =============================================================================

create type public.subscription_status as enum ('pending_payment', 'active', 'paused', 'cancelled', 'expired');

-- ---------------------------------------------------------------- plans
create table public.plans (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name                 text not null,
  tagline              text not null default '',
  description          text not null default '',
  -- The service delivered on each regular visit (for example Express Wash).
  service_id           uuid not null references public.services (id),
  washes_per_month     int  not null check (washes_per_month between 1 and 31),
  -- Optional extra visit each month with a different service (for example one interior clean).
  bonus_service_id     uuid references public.services (id),
  bonus_count          int  not null default 0 check (bonus_count between 0 and 4),
  features             text[] not null default '{}',
  is_popular           boolean not null default false,
  sort_order           int not null default 0,
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (bonus_service_id is not null or bonus_count = 0)
);
create trigger plans_updated_at before update on public.plans
  for each row execute function public.set_updated_at();

create table public.city_plans (
  city_id       uuid not null references public.cities (id) on delete cascade,
  plan_id       uuid not null references public.plans (id) on delete cascade,
  vehicle_type  public.vehicle_type not null,
  price         int not null check (price > 0),
  is_active     boolean not null default true,
  primary key (city_id, plan_id, vehicle_type)
);

-- ---------------------------------------------------------------- subscriptions
create sequence public.subscription_code_seq start 2100;

create table public.subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  code                  text not null unique default ('PL-' || nextval('public.subscription_code_seq')),
  customer_id           uuid not null references public.profiles (id),
  plan_id               uuid not null references public.plans (id),
  city_id               uuid not null references public.cities (id),
  area_id               uuid not null references public.service_areas (id),
  status                public.subscription_status not null default 'pending_payment',
  -- Fixed weekly visit: 0 = Sunday … 6 = Saturday, at this slot start time.
  weekday               smallint not null check (weekday between 0 and 6),
  preferred_start       time not null,
  vehicle_type          public.vehicle_type not null,
  vehicle_make_model    text not null,
  vehicle_plate         text not null,
  address_line          text not null,
  landmark              text,
  pincode               text not null,
  parking_type          public.parking_type not null,
  parking_spot          text,
  car_access            public.car_access not null,
  contact_name          text not null,
  contact_phone         text not null check (contact_phone ~ '^[0-9]{10}$'),
  notes                 text check (char_length(notes) <= 500),
  -- Money for one period, in rupees.
  plan_price            int not null check (plan_price > 0),
  area_charge           int not null default 0 check (area_charge >= 0),
  total                 int not null check (total = plan_price + area_charge),
  -- Current paid period and its wash allowance.
  current_period_start  date,
  current_period_end    date,
  washes_total          int not null default 0 check (washes_total >= 0),
  washes_used           int not null default 0 check (washes_used >= 0),
  cancelled_reason      text,
  cancelled_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index subscriptions_customer_idx on public.subscriptions (customer_id, created_at desc);
create index subscriptions_status_idx on public.subscriptions (status);
create index subscriptions_area_idx on public.subscriptions (area_id, status);
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- One row per month paid. Separate from `payments` because those belong to a booking.
create table public.subscription_payments (
  id                   uuid primary key default gen_random_uuid(),
  subscription_id      uuid not null references public.subscriptions (id),
  provider             text not null default 'razorpay',
  provider_order_id    text not null unique,
  provider_payment_id  text unique,
  amount               int not null check (amount >= 0),
  currency             text not null default 'INR',
  status               public.payment_status not null default 'created',
  period_start         date not null,
  period_end           date not null,
  method               text,
  error_reason         text,
  raw                  jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (period_end > period_start)
);
create index subscription_payments_sub_idx on public.subscription_payments (subscription_id, created_at desc);
create trigger subscription_payments_updated_at before update on public.subscription_payments
  for each row execute function public.set_updated_at();

-- Bookings created by a plan point back to it.
alter table public.bookings add column subscription_id uuid references public.subscriptions (id) on delete set null;
create index bookings_subscription_idx on public.bookings (subscription_id, slot_date) where subscription_id is not null;

-- ---------------------------------------------------------------- functions
-- Idempotent capture for a plan payment. First capture activates the
-- subscription; later captures renew it for the paid period.
create or replace function public.confirm_subscription_payment(
  p_order_id text, p_payment_id text, p_method text, p_raw jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  pay public.subscription_payments;
  sub public.subscriptions;
  pl  public.plans;
  renewed boolean := false;
begin
  select * into pay from public.subscription_payments where provider_order_id = p_order_id for update;
  if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;

  select * into sub from public.subscriptions where id = pay.subscription_id for update;
  if not found then raise exception 'SUBSCRIPTION_NOT_FOUND'; end if;

  if pay.status = 'captured' then
    return jsonb_build_object('subscription_id', sub.id, 'status', sub.status, 'already', true, 'renewed', false);
  end if;

  update public.subscription_payments
     set status = 'captured', provider_payment_id = p_payment_id, method = p_method,
         raw = coalesce(p_raw, raw), error_reason = null
   where id = pay.id;

  select * into pl from public.plans where id = sub.plan_id;

  if sub.status = 'pending_payment' then
    update public.subscriptions
       set status = 'active',
           current_period_start = pay.period_start,
           current_period_end = pay.period_end,
           washes_total = pl.washes_per_month + pl.bonus_count,
           washes_used = 0
     where id = sub.id returning * into sub;
  elsif sub.status in ('active', 'paused', 'expired') then
    -- Renewal: the new period starts when the current one ends (or today if it already ended).
    update public.subscriptions
       set status = 'active',
           current_period_start = pay.period_start,
           current_period_end = pay.period_end,
           washes_total = pl.washes_per_month + pl.bonus_count,
           washes_used = 0
     where id = sub.id returning * into sub;
    renewed := true;
  end if;
  -- A cancelled subscription keeps the payment recorded for a manual refund.

  return jsonb_build_object('subscription_id', sub.id, 'status', sub.status, 'already', false, 'renewed', renewed);
end $$;

create or replace function public.mark_subscription_payment_failed(p_order_id text, p_reason text, p_raw jsonb)
returns void language sql security definer set search_path = '' as $$
  update public.subscription_payments
     set status = 'failed', error_reason = left(p_reason, 500), raw = coalesce(p_raw, raw)
   where provider_order_id = p_order_id and status = 'created';
$$;

-- Books one plan visit: takes a place in the slot and inserts a confirmed,
-- prepaid booking (total 0; base + area charge recorded so worker earnings
-- are calculated as usual). Also spends one wash credit.
create or replace function public.create_subscription_booking(p_subscription_id uuid, p_slot_id uuid, p_service_id uuid)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare
  sub public.subscriptions;
  s   public.time_slots;
  b   public.bookings;
  per_wash int;
begin
  select * into sub from public.subscriptions where id = p_subscription_id for update;
  if not found then raise exception 'SUBSCRIPTION_NOT_FOUND'; end if;
  if sub.status <> 'active' then raise exception 'SUBSCRIPTION_NOT_ACTIVE'; end if;
  if sub.washes_used >= sub.washes_total then raise exception 'NO_WASHES_LEFT'; end if;

  select * into s from public.time_slots where id = p_slot_id for update;
  if not found then raise exception 'SLOT_NOT_FOUND'; end if;
  if s.is_blocked or s.booked >= s.capacity then raise exception 'SLOT_FULL'; end if;
  if s.area_id <> sub.area_id then raise exception 'SLOT_AREA_MISMATCH'; end if;
  if sub.current_period_end is null or s.slot_date < sub.current_period_start or s.slot_date >= sub.current_period_end then
    raise exception 'OUTSIDE_PERIOD';
  end if;

  per_wash := greatest(1, round(sub.plan_price::numeric / greatest(1, sub.washes_total)));

  update public.time_slots set booked = booked + 1 where id = s.id;
  update public.subscriptions set washes_used = washes_used + 1 where id = sub.id;

  insert into public.bookings (
    customer_id, city_id, area_id, service_id, slot_id, subscription_id, status, status_changed_by,
    slot_date, slot_start, slot_end,
    vehicle_type, vehicle_make_model, vehicle_plate,
    address_line, landmark, pincode, parking_type, parking_spot, car_access,
    contact_name, contact_phone, notes,
    base_price, area_charge, discount, total, expires_at
  ) values (
    sub.customer_id, sub.city_id, sub.area_id, p_service_id, s.id, sub.id, 'confirmed', null,
    s.slot_date, s.start_time, s.end_time,
    sub.vehicle_type, sub.vehicle_make_model, sub.vehicle_plate,
    sub.address_line, sub.landmark, sub.pincode, sub.parking_type, sub.parking_spot, sub.car_access,
    sub.contact_name, sub.contact_phone, sub.notes,
    per_wash, 0, per_wash, 0, null
  )
  returning * into b;
  return b;
end $$;

-- Runs daily (and right after activation): books the next visits of every
-- active subscription for the days that already have slots, then expires
-- subscriptions whose paid period is over.
create or replace function public.schedule_subscription_bookings(p_days int default 14)
returns int language plpgsql security definer set search_path = '' as $$
declare
  sub record;
  d date;
  s public.time_slots;
  svc uuid;
  last_visit date;
  n int := 0;
begin
  for sub in
    select x.*, c.timezone, p.service_id as plan_service_id, p.bonus_service_id, p.bonus_count
      from public.subscriptions x
      join public.cities c on c.id = x.city_id
      join public.plans p on p.id = x.plan_id
     where x.status = 'active' and x.current_period_end is not null
  loop
    -- Last visit date of the period on the chosen weekday: used for the bonus service.
    last_visit := sub.current_period_end - 1;
    while extract(dow from last_visit)::int <> sub.weekday loop
      last_visit := last_visit - 1;
    end loop;

    d := (now() at time zone sub.timezone)::date;
    while d < (now() at time zone sub.timezone)::date + p_days loop
      exit when d >= sub.current_period_end;
      if d >= sub.current_period_start
         and extract(dow from d)::int = sub.weekday
         and (select washes_used from public.subscriptions where id = sub.id) < sub.washes_total
         and not exists (
           select 1 from public.bookings b
            where b.subscription_id = sub.id and b.slot_date = d and b.status <> 'cancelled'
         )
      then
        select * into s from public.time_slots t
         where t.area_id = sub.area_id and t.slot_date = d and t.start_time = sub.preferred_start
           and not t.is_blocked and t.booked < t.capacity
         limit 1;
        if found and (d > (now() at time zone sub.timezone)::date or s.start_time > (now() at time zone sub.timezone)::time + interval '1 hour') then
          svc := case when sub.bonus_service_id is not null and sub.bonus_count > 0 and d = last_visit
                      then sub.bonus_service_id else sub.plan_service_id end;
          begin
            perform public.create_subscription_booking(sub.id, s.id, svc);
            n := n + 1;
          exception when others then
            -- Slot taken between the check and the insert, or no credits left: try the next week.
            null;
          end;
        end if;
      end if;
      d := d + 1;
    end loop;
  end loop;

  update public.subscriptions
     set status = 'expired'
   where status in ('active', 'paused')
     and current_period_end is not null
     and current_period_end <= (now() at time zone 'Asia/Kolkata')::date;

  return n;
end $$;

revoke execute on function public.confirm_subscription_payment(text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.mark_subscription_payment_failed(text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.create_subscription_booking(uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.schedule_subscription_bookings(int) from public, anon, authenticated;

-- ---------------------------------------------------------------- security
alter table public.plans                 enable row level security;
alter table public.city_plans            enable row level security;
alter table public.subscriptions         enable row level security;
alter table public.subscription_payments enable row level security;

grant select on public.plans, public.city_plans to anon, authenticated;
grant select on public.subscriptions, public.subscription_payments to authenticated;

create policy "catalogue: plans readable" on public.plans
  for select to anon, authenticated using (true);
create policy "catalogue: plan prices readable" on public.city_plans
  for select to anon, authenticated using (true);
create policy "subscriptions: owner or admin" on public.subscriptions
  for select to authenticated using (customer_id = (select auth.uid()) or public.is_admin());
create policy "subscription payments: owner or admin" on public.subscription_payments
  for select to authenticated using (
    public.is_admin()
    or exists (select 1 from public.subscriptions s where s.id = subscription_id and s.customer_id = (select auth.uid()))
  );

-- ---------------------------------------------------------------- scheduled job
-- Daily 05:50 IST, after the slot generator (00:15 UTC) has added the day's slots.
select cron.schedule('schedule-subscription-bookings', '20 0 * * *', $$select public.schedule_subscription_bookings(14)$$);

-- ---------------------------------------------------------------- starter plans
-- Three plans built on the existing services. Prices below are starting
-- defaults for every city that exists today; change them in Admin → Plans.
insert into public.plans (slug, name, tagline, description, service_id, washes_per_month, bonus_service_id, bonus_count, features, is_popular, sort_order)
select v.slug, v.name, v.tagline, v.description, base.id, v.washes, bonus.id, v.bonus_count, v.features, v.is_popular, v.sort_order
  from (values
    ('weekly-shine', 'Weekly Shine', 'One Express wash every week.',
     'Four exterior washes a month in a fixed weekly slot. Ideal for daily drivers.',
     'express', 4, null, 0,
     array['4 × Express Wash', 'Fixed weekly slot, auto-booked', 'Reschedule any visit online', 'Before & after photos'],
     false, 1),
    ('shine-plus', 'Shine Plus', 'Weekly exterior, monthly interior.',
     'Four Express washes plus one Premium interior clean on the last visit of the month.',
     'express', 4, 'premium', 1,
     array['4 × Express Wash', '1 × Premium interior clean', 'Fixed weekly slot, auto-booked', 'Priority slot access', 'Before & after photos'],
     true, 2),
    ('premium-monthly', 'Premium Monthly', 'Inside and out, every week.',
     'Four Premium washes a month so the interior never gets a chance to get dusty.',
     'premium', 4, null, 0,
     array['4 × Premium Wash', 'Interior vacuum every visit', 'Fixed weekly slot, auto-booked', 'Before & after photos'],
     false, 3)
  ) as v (slug, name, tagline, description, service_slug, washes, bonus_slug, bonus_count, features, is_popular, sort_order)
  join public.services base on base.slug = v.service_slug
  left join public.services bonus on bonus.slug = v.bonus_slug
on conflict (slug) do nothing;

insert into public.city_plans (city_id, plan_id, vehicle_type, price)
select c.id, p.id, v.vehicle_type::public.vehicle_type, v.price
  from public.cities c
 cross join (values
    ('weekly-shine', 'hatchback', 899), ('weekly-shine', 'sedan', 1299), ('weekly-shine', 'suv', 1599), ('weekly-shine', 'bike', 349),
    ('shine-plus', 'hatchback', 1349), ('shine-plus', 'sedan', 1799), ('shine-plus', 'suv', 2199), ('shine-plus', 'bike', 499),
    ('premium-monthly', 'hatchback', 2199), ('premium-monthly', 'sedan', 2599), ('premium-monthly', 'suv', 3099), ('premium-monthly', 'bike', 849)
  ) as v (plan_slug, vehicle_type, price)
  join public.plans p on p.slug = v.plan_slug
on conflict do nothing;

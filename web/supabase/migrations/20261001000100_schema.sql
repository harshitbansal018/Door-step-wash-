-- =============================================================================
-- Core schema: users, cities, services, slots, workers, bookings, money, offers
-- =============================================================================

create extension if not exists citext;

-- ---------------------------------------------------------------- enums
create type public.user_role as enum ('customer', 'worker', 'admin');
create type public.vehicle_type as enum ('hatchback', 'sedan', 'suv', 'bike');
create type public.booking_status as enum (
  'pending_payment', 'confirmed', 'assigned', 'accepted',
  'on_the_way', 'in_progress', 'completed', 'cancelled', 'expired'
);
create type public.worker_status as enum ('pending_kyc', 'active', 'suspended');
create type public.payment_status as enum ('created', 'captured', 'failed', 'refunded', 'partially_refunded');
create type public.refund_status as enum ('pending', 'processed', 'failed');
create type public.discount_type as enum ('flat', 'percent');
create type public.offer_user_type as enum ('all', 'new');
create type public.parking_type as enum ('basement', 'open', 'covered', 'street');
create type public.car_access as enum ('customer_present', 'key_with_security', 'no_access');
create type public.photo_kind as enum ('before', 'after');
create type public.earning_status as enum ('pending', 'in_payout', 'paid');
create type public.payout_status as enum ('pending', 'paid');

-- ---------------------------------------------------------------- helpers
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------- users
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       citext not null,
  full_name   text not null default '' check (char_length(full_name) <= 120),
  phone       text check (phone ~ '^[0-9]{10}$'),
  role        public.user_role not null default 'customer',
  is_blocked  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Every new auth user gets a customer profile. The role is never taken from
-- user-supplied metadata; workers and admins are promoted server-side.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(left(trim(new.raw_user_meta_data ->> 'full_name'), 120), '')
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- cities & areas
create table public.cities (
  id                          uuid primary key default gen_random_uuid(),
  slug                        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name                        text not null,
  state                       text not null,
  timezone                    text not null default 'Asia/Kolkata',
  is_active                   boolean not null default false,
  launch_date                 date,
  open_time                   time not null default '08:00',
  close_time                  time not null default '18:00',
  slot_minutes                int not null default 60 check (slot_minutes between 30 and 240),
  cancellation_window_minutes int not null default 120 check (cancellation_window_minutes >= 0),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  check (close_time > open_time)
);
create trigger cities_updated_at before update on public.cities
  for each row execute function public.set_updated_at();

create table public.service_areas (
  id            uuid primary key default gen_random_uuid(),
  city_id       uuid not null references public.cities (id) on delete cascade,
  name          text not null,
  extra_charge  int not null default 0 check (extra_charge >= 0),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (city_id, name)
);
create index service_areas_city_idx on public.service_areas (city_id);
create trigger service_areas_updated_at before update on public.service_areas
  for each row execute function public.set_updated_at();

-- One pincode belongs to exactly one area.
create table public.area_pincodes (
  pincode  text primary key check (pincode ~ '^[0-9]{6}$'),
  area_id  uuid not null references public.service_areas (id) on delete cascade
);
create index area_pincodes_area_idx on public.area_pincodes (area_id);

create table public.waitlist (
  id           uuid primary key default gen_random_uuid(),
  email        citext not null,
  pincode      text not null check (pincode ~ '^[0-9]{6}$'),
  city_id      uuid references public.cities (id) on delete set null,
  notified_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (email, pincode)
);

-- ---------------------------------------------------------------- services & pricing
create table public.services (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name          text not null,
  description   text not null default '',
  duration_min  int not null check (duration_min > 0),
  features      text[] not null default '{}',
  is_popular    boolean not null default false,
  sort_order    int not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger services_updated_at before update on public.services
  for each row execute function public.set_updated_at();

create table public.city_services (
  city_id       uuid not null references public.cities (id) on delete cascade,
  service_id    uuid not null references public.services (id) on delete cascade,
  vehicle_type  public.vehicle_type not null,
  price         int not null check (price > 0),
  is_active     boolean not null default true,
  primary key (city_id, service_id, vehicle_type)
);

-- ---------------------------------------------------------------- slots
create table public.time_slots (
  id          uuid primary key default gen_random_uuid(),
  area_id     uuid not null references public.service_areas (id) on delete cascade,
  slot_date   date not null,
  start_time  time not null,
  end_time    time not null,
  capacity    int not null default 1 check (capacity >= 0),
  booked      int not null default 0 check (booked >= 0),
  is_blocked  boolean not null default false,
  unique (area_id, slot_date, start_time),
  check (end_time > start_time)
);
create index time_slots_lookup_idx on public.time_slots (area_id, slot_date);

-- ---------------------------------------------------------------- customer data
create table public.addresses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  label         text not null default 'Home',
  line1         text not null,
  landmark      text,
  pincode       text not null check (pincode ~ '^[0-9]{6}$'),
  area_id       uuid references public.service_areas (id) on delete set null,
  parking_type  public.parking_type not null default 'basement',
  parking_spot  text,
  car_access    public.car_access not null default 'customer_present',
  created_at    timestamptz not null default now()
);
create index addresses_user_idx on public.addresses (user_id);

create table public.vehicles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  vehicle_type  public.vehicle_type not null,
  make_model    text not null,
  plate         text not null,
  created_at    timestamptz not null default now(),
  unique (user_id, plate)
);

-- ---------------------------------------------------------------- workers
create table public.workers (
  id                 uuid primary key references public.profiles (id) on delete cascade,
  city_id            uuid not null references public.cities (id),
  area_id            uuid not null references public.service_areas (id),
  status             public.worker_status not null default 'pending_kyc',
  is_online          boolean not null default false,
  rating             numeric(2, 1) not null default 0,
  rating_count       int not null default 0,
  jobs_done          int not null default 0,
  commission_rate    numeric(4, 3) not null default 0.400 check (commission_rate between 0 and 1),
  kyc_document_path  text,
  bank_last4         text check (bank_last4 ~ '^[0-9]{4}$'),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index workers_area_idx on public.workers (area_id, status);
create trigger workers_updated_at before update on public.workers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- offers
create table public.offers (
  id              uuid primary key default gen_random_uuid(),
  code            citext not null unique check (code ~ '^[A-Za-z0-9_-]{3,30}$'),
  title           text not null,
  discount_type   public.discount_type not null,
  value           int not null check (value > 0),
  max_discount    int check (max_discount > 0),
  min_order       int not null default 0 check (min_order >= 0),
  city_ids        uuid[] not null default '{}',
  service_ids     uuid[] not null default '{}',
  user_type       public.offer_user_type not null default 'all',
  valid_from      timestamptz not null,
  valid_to        timestamptz not null,
  usage_limit     int check (usage_limit > 0),
  per_user_limit  int not null default 1 check (per_user_limit > 0),
  used_count      int not null default 0,
  auto_apply      boolean not null default false,
  is_active       boolean not null default true,
  created_by      uuid references public.profiles (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (valid_to > valid_from),
  check (discount_type <> 'percent' or value <= 100)
);
create trigger offers_updated_at before update on public.offers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- bookings
create sequence public.booking_code_seq start 10500;

create table public.bookings (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique default ('BK-' || nextval('public.booking_code_seq')),
  customer_id         uuid not null references public.profiles (id),
  city_id             uuid not null references public.cities (id),
  area_id             uuid not null references public.service_areas (id),
  service_id          uuid not null references public.services (id),
  slot_id             uuid not null references public.time_slots (id),
  worker_id           uuid references public.workers (id),
  offer_id            uuid references public.offers (id),
  status              public.booking_status not null default 'pending_payment',
  status_changed_by   uuid references public.profiles (id),
  slot_date           date not null,
  slot_start          time not null,
  slot_end            time not null,
  vehicle_type        public.vehicle_type not null,
  vehicle_make_model  text not null,
  vehicle_plate       text not null,
  address_line        text not null,
  landmark            text,
  pincode             text not null,
  parking_type        public.parking_type not null,
  parking_spot        text,
  car_access          public.car_access not null,
  contact_name        text not null,
  contact_phone       text not null check (contact_phone ~ '^[0-9]{10}$'),
  notes               text check (char_length(notes) <= 500),
  base_price          int not null check (base_price >= 0),
  area_charge         int not null default 0 check (area_charge >= 0),
  discount            int not null default 0 check (discount >= 0),
  total               int not null,
  expires_at          timestamptz,
  cancelled_reason    text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (total = base_price + area_charge - discount and total >= 0)
);
create index bookings_customer_idx on public.bookings (customer_id, created_at desc);
create index bookings_worker_idx on public.bookings (worker_id, slot_date);
create index bookings_status_idx on public.bookings (status);
create index bookings_city_date_idx on public.bookings (city_id, slot_date);
create index bookings_pending_idx on public.bookings (expires_at) where status = 'pending_payment';
create trigger bookings_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();

create table public.booking_status_log (
  id           bigint generated always as identity primary key,
  booking_id   uuid not null references public.bookings (id) on delete cascade,
  from_status  public.booking_status,
  to_status    public.booking_status not null,
  changed_by   uuid references public.profiles (id),
  created_at   timestamptz not null default now()
);
create index booking_status_log_booking_idx on public.booking_status_log (booking_id, created_at);

create or replace function public.log_booking_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.booking_status_log (booking_id, from_status, to_status, changed_by)
    values (
      new.id,
      case when tg_op = 'UPDATE' then old.status end,
      new.status,
      coalesce(new.status_changed_by, auth.uid())
    );
  end if;
  return new;
end $$;

create trigger bookings_status_log
  after insert or update of status on public.bookings
  for each row execute function public.log_booking_status();

create table public.booking_photos (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references public.bookings (id) on delete cascade,
  kind          public.photo_kind not null,
  storage_path  text not null unique,
  uploaded_by   uuid references public.profiles (id),
  created_at    timestamptz not null default now()
);
create index booking_photos_booking_idx on public.booking_photos (booking_id);

create table public.reviews (
  booking_id   uuid primary key references public.bookings (id) on delete cascade,
  customer_id  uuid not null references public.profiles (id),
  worker_id    uuid references public.workers (id),
  rating       smallint not null check (rating between 1 and 5),
  comment      text check (char_length(comment) <= 1000),
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------- money
create table public.payments (
  id                   uuid primary key default gen_random_uuid(),
  booking_id           uuid not null references public.bookings (id),
  provider             text not null default 'razorpay',
  provider_order_id    text not null unique,
  provider_payment_id  text unique,
  amount               int not null check (amount >= 0),
  currency             text not null default 'INR',
  status               public.payment_status not null default 'created',
  method               text,
  error_reason         text,
  raw                  jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index payments_booking_idx on public.payments (booking_id);
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

create table public.refunds (
  id                  uuid primary key default gen_random_uuid(),
  payment_id          uuid not null references public.payments (id),
  booking_id          uuid not null references public.bookings (id),
  amount              int not null check (amount > 0),
  reason              text not null,
  provider_refund_id  text unique,
  status              public.refund_status not null default 'pending',
  created_by          uuid references public.profiles (id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index refunds_booking_idx on public.refunds (booking_id);
create trigger refunds_updated_at before update on public.refunds
  for each row execute function public.set_updated_at();

create table public.payouts (
  id            uuid primary key default gen_random_uuid(),
  worker_id     uuid not null references public.workers (id),
  period_start  date not null,
  period_end    date not null,
  total         int not null check (total >= 0),
  status        public.payout_status not null default 'pending',
  reference     text,
  paid_at       timestamptz,
  paid_by       uuid references public.profiles (id),
  created_at    timestamptz not null default now(),
  unique (worker_id, period_start)
);

create table public.worker_earnings (
  id          uuid primary key default gen_random_uuid(),
  worker_id   uuid not null references public.workers (id),
  booking_id  uuid not null unique references public.bookings (id),
  amount      int not null check (amount >= 0),
  status      public.earning_status not null default 'pending',
  payout_id   uuid references public.payouts (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index worker_earnings_worker_idx on public.worker_earnings (worker_id, status);

create table public.offer_usages (
  id          uuid primary key default gen_random_uuid(),
  offer_id    uuid not null references public.offers (id),
  user_id     uuid not null references public.profiles (id),
  booking_id  uuid not null unique references public.bookings (id),
  discount    int not null check (discount >= 0),
  created_at  timestamptz not null default now()
);
create index offer_usages_offer_user_idx on public.offer_usages (offer_id, user_id);

-- Processed webhook events, for idempotency.
create table public.webhook_events (
  id           text primary key,
  provider     text not null,
  event_type   text not null,
  received_at  timestamptz not null default now()
);

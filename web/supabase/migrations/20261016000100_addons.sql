-- =============================================================================
-- Add-ons: optional extras (interior vacuum, tyre polish, ...) a customer can
-- add to a one-time booking at checkout. Each has one flat price and can be
-- limited to some vehicle types.
-- =============================================================================

create table if not exists public.addons (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 2 and 60),
  description   text not null default '' check (char_length(description) <= 200),
  price         int not null check (price between 1 and 100000),
  duration_min  int not null default 0 check (duration_min between 0 and 240),
  -- Empty means every vehicle type.
  vehicle_types public.vehicle_type[] not null default '{}',
  sort_order    int not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
drop trigger if exists addons_updated_at on public.addons;
create trigger addons_updated_at before update on public.addons
  for each row execute function public.set_updated_at();

alter table public.addons enable row level security;
drop policy if exists "catalogue: addons readable" on public.addons;
create policy "catalogue: addons readable" on public.addons
  for select to anon, authenticated using (true);

-- Seed a few common extras, inactive until an admin reviews the prices.
insert into public.addons (name, description, price, duration_min, vehicle_types, sort_order, is_active)
select * from (values
  ('Interior vacuum', 'Seats, mats and boot vacuumed', 149, 15, '{hatchback,sedan,suv}'::public.vehicle_type[], 1, false),
  ('Dashboard polish', 'Dashboard and door panels cleaned and shined', 99, 10, '{hatchback,sedan,suv}'::public.vehicle_type[], 2, false),
  ('Tyre shine', 'Tyres dressed for a deep black finish', 79, 10, '{}'::public.vehicle_type[], 3, false),
  ('Glass treatment', 'Water-repellent coating on the windscreen', 199, 15, '{hatchback,sedan,suv}'::public.vehicle_type[], 4, false)
) as seed(name, description, price, duration_min, vehicle_types, sort_order, is_active)
where not exists (select 1 from public.addons);

-- ---------------------------------------------------------------- bookings
-- `addons` is a snapshot [{id, name, price}] so later price edits do not change old bookings.
alter table public.bookings
  add column if not exists addons jsonb not null default '[]',
  add column if not exists addons_total int not null default 0 check (addons_total >= 0);

alter table public.bookings drop constraint if exists bookings_check;
alter table public.bookings drop constraint if exists bookings_total_check;
alter table public.bookings add constraint bookings_total_check
  check (total = base_price + area_charge + addons_total - discount and total >= 0);

-- Same as before, plus the two add-on fields.
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
    base_price, area_charge, addons, addons_total, discount, total, expires_at
  ) values (
    (p ->> 'customer_id')::uuid, (p ->> 'city_id')::uuid, s.area_id, (p ->> 'service_id')::uuid, s.id,
    nullif(p ->> 'offer_id', '')::uuid, (p ->> 'customer_id')::uuid,
    s.slot_date, s.start_time, s.end_time,
    (p ->> 'vehicle_type')::public.vehicle_type, p ->> 'vehicle_make_model', p ->> 'vehicle_plate',
    p ->> 'address_line', nullif(p ->> 'landmark', ''), p ->> 'pincode',
    (p ->> 'parking_type')::public.parking_type, nullif(p ->> 'parking_spot', ''),
    (p ->> 'car_access')::public.car_access,
    p ->> 'contact_name', p ->> 'contact_phone', nullif(p ->> 'notes', ''),
    (p ->> 'base_price')::int, (p ->> 'area_charge')::int,
    coalesce(p -> 'addons', '[]'::jsonb), coalesce((p ->> 'addons_total')::int, 0),
    (p ->> 'discount')::int, (p ->> 'total')::int,
    now() + make_interval(mins => p_hold_minutes)
  )
  returning * into b;

  return b;
end $$;

-- Partners earn their commission on add-ons too.
create or replace function public.on_booking_completed()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  rate numeric;
begin
  if new.status = 'completed' and old.status is distinct from 'completed' and new.worker_id is not null then
    select commission_rate into rate from public.workers where id = new.worker_id;
    insert into public.worker_earnings (worker_id, booking_id, amount)
    values (new.worker_id, new.id, round((new.base_price + new.area_charge + new.addons_total) * coalesce(rate, 0.4)))
    on conflict (booking_id) do nothing;
    update public.workers set jobs_done = jobs_done + 1 where id = new.worker_id;
  end if;
  return new;
end $$;

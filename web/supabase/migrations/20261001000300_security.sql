-- =============================================================================
-- Row Level Security
--
-- Model: browsers (anon / authenticated roles) may only READ, and only the rows
-- they are allowed to see. Every write goes through the Next.js API, which
-- checks the rules and writes with the service role.
-- =============================================================================

-- ---------------------------------------------------------------- read-only for browsers
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke insert, update, delete, truncate on tables from anon, authenticated;
revoke usage on all sequences in schema public from anon, authenticated;

-- ---------------------------------------------------------------- enable RLS everywhere
alter table public.profiles            enable row level security;
alter table public.cities              enable row level security;
alter table public.service_areas       enable row level security;
alter table public.area_pincodes       enable row level security;
alter table public.waitlist            enable row level security;
alter table public.services            enable row level security;
alter table public.city_services       enable row level security;
alter table public.time_slots          enable row level security;
alter table public.addresses           enable row level security;
alter table public.vehicles            enable row level security;
alter table public.workers             enable row level security;
alter table public.offers              enable row level security;
alter table public.bookings            enable row level security;
alter table public.booking_status_log  enable row level security;
alter table public.booking_photos      enable row level security;
alter table public.reviews             enable row level security;
alter table public.payments            enable row level security;
alter table public.refunds             enable row level security;
alter table public.payouts             enable row level security;
alter table public.worker_earnings     enable row level security;
alter table public.offer_usages        enable row level security;
alter table public.webhook_events      enable row level security;

-- ---------------------------------------------------------------- public catalogue
create policy "catalogue: cities readable" on public.cities
  for select to anon, authenticated using (true);
create policy "catalogue: areas readable" on public.service_areas
  for select to anon, authenticated using (true);
create policy "catalogue: pincodes readable" on public.area_pincodes
  for select to anon, authenticated using (true);
create policy "catalogue: services readable" on public.services
  for select to anon, authenticated using (true);
create policy "catalogue: prices readable" on public.city_services
  for select to anon, authenticated using (true);
create policy "catalogue: slots readable" on public.time_slots
  for select to anon, authenticated using (true);

-- ---------------------------------------------------------------- profiles
create policy "profiles: self, admin, or booking counterpart" on public.profiles
  for select to authenticated using (
    id = (select auth.uid())
    or public.is_admin()
    or exists (
      select 1 from public.bookings b
       where (b.worker_id = profiles.id and b.customer_id = (select auth.uid()))
          or (b.customer_id = profiles.id and b.worker_id = (select auth.uid()))
    )
  );

-- Needed by the custom access token hook.
create policy "profiles: auth hook reads roles" on public.profiles
  for select to supabase_auth_admin using (true);

-- ---------------------------------------------------------------- customer data
create policy "addresses: owner or admin" on public.addresses
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy "vehicles: owner or admin" on public.vehicles
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());

-- ---------------------------------------------------------------- workers
create policy "workers: self, admin, or their customers" on public.workers
  for select to authenticated using (
    id = (select auth.uid())
    or public.is_admin()
    or exists (
      select 1 from public.bookings b
       where b.worker_id = workers.id and b.customer_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------- bookings & children
create policy "bookings: customer, assigned worker, or admin" on public.bookings
  for select to authenticated using (
    customer_id = (select auth.uid())
    or worker_id = (select auth.uid())
    or public.is_admin()
  );

create policy "status log: visible with booking" on public.booking_status_log
  for select to authenticated using (exists (select 1 from public.bookings b where b.id = booking_id));
create policy "photos: visible with booking" on public.booking_photos
  for select to authenticated using (exists (select 1 from public.bookings b where b.id = booking_id));
create policy "reviews: visible with booking" on public.reviews
  for select to authenticated using (exists (select 1 from public.bookings b where b.id = booking_id));

-- ---------------------------------------------------------------- money
create policy "payments: booking customer or admin" on public.payments
  for select to authenticated using (
    public.is_admin()
    or exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = (select auth.uid()))
  );
create policy "refunds: booking customer or admin" on public.refunds
  for select to authenticated using (
    public.is_admin()
    or exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = (select auth.uid()))
  );
create policy "earnings: own or admin" on public.worker_earnings
  for select to authenticated using (worker_id = (select auth.uid()) or public.is_admin());
create policy "payouts: own or admin" on public.payouts
  for select to authenticated using (worker_id = (select auth.uid()) or public.is_admin());

-- ---------------------------------------------------------------- admin-only
create policy "offers: admin only" on public.offers
  for select to authenticated using (public.is_admin());
create policy "offer usages: own or admin" on public.offer_usages
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy "waitlist: admin only" on public.waitlist
  for select to authenticated using (public.is_admin());
-- webhook_events: no policies → service role only.

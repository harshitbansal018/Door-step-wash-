-- =============================================================================
-- Partner panel: arrival step and problem reports
--
-- "Arrived" is recorded as a timestamp instead of a new booking status, so
-- every existing status filter, report and customer screen keeps working.
-- A problem report does not change the booking status either; it flags the
-- job for an administrator, who decides whether to reschedule or cancel.
-- =============================================================================

alter table public.bookings add column if not exists arrived_at timestamptz;

create type public.job_issue_reason as enum (
  'customer_unavailable',
  'no_water',
  'no_access',
  'vehicle_not_found',
  'unsafe_location',
  'other'
);

create table public.job_issues (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references public.bookings (id) on delete cascade,
  worker_id    uuid not null references public.workers (id),
  reason       public.job_issue_reason not null,
  note         text check (char_length(note) <= 500),
  resolved_at  timestamptz,
  resolved_by  uuid references public.profiles (id),
  created_at   timestamptz not null default now()
);
create index job_issues_booking_idx on public.job_issues (booking_id, created_at desc);
create index job_issues_open_idx on public.job_issues (worker_id) where resolved_at is null;

alter table public.job_issues enable row level security;
grant select on public.job_issues to authenticated;
create policy "job issues: reporting worker or admin" on public.job_issues
  for select to authenticated using (worker_id = (select auth.uid()) or public.is_admin());

-- =============================================================================
-- Storage buckets and scheduled jobs
-- =============================================================================

-- Private buckets. Files are uploaded by the server and shown through
-- short-lived signed URLs, so no storage policies are granted to browsers.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('booking-photos', 'booking-photos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('kyc-documents', 'kyc-documents', false, 5242880, array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do nothing;

-- Scheduled jobs (pg_cron). Times are UTC.
create extension if not exists pg_cron;

-- Every minute: expire unpaid bookings and free their slots.
select cron.schedule('expire-pending-bookings', '* * * * *', $$select public.expire_pending_bookings()$$);

-- Daily 05:45 IST: keep 14 days of slots open.
select cron.schedule('generate-time-slots', '15 0 * * *', $$select public.generate_time_slots(14)$$);

-- Monday 01:00 IST: build last week's worker payouts.
select cron.schedule('build-weekly-payouts', '30 19 * * 0', $$select public.build_weekly_payouts()$$);

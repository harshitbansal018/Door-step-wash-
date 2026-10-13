-- Keep customer-cancelled monthly-plan visits cancelled. The original
-- scheduler ignored all cancelled rows, so its next run recreated a visit the
-- customer had explicitly cancelled.

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
            where b.subscription_id = sub.id
              and b.slot_date = d
              and (b.status <> 'cancelled' or b.cancelled_reason is distinct from 'Plan visit day changed')
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

revoke execute on function public.schedule_subscription_bookings(int) from public, anon, authenticated;

-- Repair replacement visits that were already recreated after a customer
-- cancellation and return their reserved slot capacity.
with recreated as (
  update public.bookings b
     set status = 'cancelled',
         cancelled_reason = 'Original plan visit was cancelled by customer',
         status_changed_by = b.customer_id
   where b.subscription_id is not null
     and b.status in ('confirmed', 'assigned', 'accepted')
     and exists (
       select 1
         from public.bookings original
        where original.subscription_id = b.subscription_id
          and original.slot_date = b.slot_date
          and original.id <> b.id
          and original.status = 'cancelled'
          and original.cancelled_reason = 'Cancelled by customer'
     )
  returning b.slot_id, b.subscription_id
), slot_counts as (
  select slot_id, count(*)::int as count
    from recreated
   group by slot_id
), released as (
  update public.time_slots t
     set booked = greatest(0, t.booked - slot_counts.count)
    from slot_counts
   where t.id = slot_counts.slot_id
  returning t.id
), subscription_counts as (
  select subscription_id, count(*)::int as count
    from recreated
   group by subscription_id
)
update public.subscriptions s
   set washes_used = greatest(0, s.washes_used - subscription_counts.count)
  from subscription_counts
 where s.id = subscription_counts.subscription_id;

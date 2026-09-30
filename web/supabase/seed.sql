-- Starting data: cities, areas, pincodes, services and prices.
-- Safe to run more than once.

insert into public.cities (slug, name, state, is_active, launch_date) values
  ('gurugram', 'Gurugram', 'Haryana', true, '2026-06-01'),
  ('noida', 'Noida', 'Uttar Pradesh', true, '2026-08-15'),
  ('pune', 'Pune', 'Maharashtra', false, '2026-11-01')
on conflict (slug) do nothing;

insert into public.service_areas (city_id, name, extra_charge, is_active)
select c.id, a.name, a.extra_charge, a.is_active
  from (values
    ('gurugram', 'DLF Phase 1–5', 0, true),
    ('gurugram', 'Sohna Road', 0, true),
    ('gurugram', 'New Gurugram', 50, true),
    ('noida', 'Sector 18–50', 0, true),
    ('noida', 'Noida Extension', 50, false),
    ('pune', 'Baner & Aundh', 0, true)
  ) as a (city_slug, name, extra_charge, is_active)
  join public.cities c on c.slug = a.city_slug
on conflict (city_id, name) do nothing;

insert into public.area_pincodes (pincode, area_id)
select p.pincode, sa.id
  from (values
    ('122002', 'DLF Phase 1–5'), ('122009', 'DLF Phase 1–5'),
    ('122018', 'Sohna Road'),
    ('122004', 'New Gurugram'), ('122005', 'New Gurugram'),
    ('201301', 'Sector 18–50'), ('201303', 'Sector 18–50'),
    ('201306', 'Noida Extension'),
    ('411045', 'Baner & Aundh'), ('411007', 'Baner & Aundh')
  ) as p (pincode, area_name)
  join public.service_areas sa on sa.name = p.area_name
on conflict (pincode) do nothing;

insert into public.services (slug, name, description, duration_min, features, is_popular, sort_order) values
  ('express', 'Express Wash', 'Quick exterior foam wash for a clean everyday look.', 30,
   array['Foam wash & rinse', 'Tyre & rim cleaning', 'Microfibre dry', 'Glass cleaning'], false, 1),
  ('premium', 'Premium Wash', 'Exterior wash plus a thorough interior clean.', 60,
   array['Everything in Express', 'Interior vacuuming', 'Dashboard polish', 'Door panel wipe-down', 'Tyre shine'], true, 2),
  ('deluxe', 'Deluxe Detailing', 'Showroom finish with wax protection and deep interior care.', 120,
   array['Everything in Premium', 'Carnauba wax coat', 'Seat shampoo', 'Engine bay dressing', 'AC vent sanitisation'], false, 3)
on conflict (slug) do nothing;

insert into public.city_services (city_id, service_id, vehicle_type, price)
select c.id, s.id, p.vehicle_type::public.vehicle_type, p.price
  from (values
    ('express', 'hatchback', 349), ('express', 'sedan', 399), ('express', 'suv', 499), ('express', 'bike', 149),
    ('premium', 'hatchback', 649), ('premium', 'sedan', 749), ('premium', 'suv', 899), ('premium', 'bike', 249),
    ('deluxe', 'hatchback', 1499), ('deluxe', 'sedan', 1699), ('deluxe', 'suv', 1999), ('deluxe', 'bike', 499)
  ) as p (service_slug, vehicle_type, price)
  join public.services s on s.slug = p.service_slug
  cross join public.cities c
on conflict do nothing;

select public.generate_time_slots(14);

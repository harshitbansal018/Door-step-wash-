-- Keep the live catalogue aligned with the public starting-price messaging.
update public.city_services as city_price
set price = case city_price.vehicle_type
  when 'bike' then 99
  when 'hatchback' then 259
  else city_price.price
end
from public.services as service
where city_price.service_id = service.id
  and service.slug = 'express'
  and city_price.vehicle_type in ('bike', 'hatchback');

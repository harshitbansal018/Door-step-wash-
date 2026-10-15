-- Lets admins feature one offer as a popup on the homepage.
alter table public.offers
  add column if not exists show_popup boolean not null default false;

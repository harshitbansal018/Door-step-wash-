-- Editable marketing and legal content managed from the admin console.
-- The browser never accesses this table directly; public pages and admin APIs
-- read it through the server-side service-role client.
create table public.site_content (
  id          text primary key default 'main' check (id = 'main'),
  content     jsonb not null,
  updated_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger site_content_updated_at before update on public.site_content
  for each row execute function public.set_updated_at();

alter table public.site_content enable row level security;
revoke all on public.site_content from anon, authenticated;
grant select, insert, update on public.site_content to service_role;

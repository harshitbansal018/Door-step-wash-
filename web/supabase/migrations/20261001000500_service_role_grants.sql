-- =============================================================================
-- Server-side database privileges
--
-- Secret/service-role API keys bypass Row Level Security, but PostgreSQL table
-- privileges are still required. The Next.js API uses this role after it has
-- performed its own authorization checks.
-- =============================================================================

grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Keep privileges correct for tables, sequences, and functions added by later
-- migrations executed as the Supabase `postgres` role.
alter default privileges for role postgres in schema public
  grant all privileges on tables to service_role;
alter default privileges for role postgres in schema public
  grant all privileges on sequences to service_role;
alter default privileges for role postgres in schema public
  grant execute on functions to service_role;

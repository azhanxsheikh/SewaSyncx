-- Supabase database linter checks 0028 and 0029, vendored from
-- https://github.com/supabase/splinter (lints/0028_anon_security_definer_function_executable.sql,
-- lints/0029_authenticated_security_definer_function_executable.sql).
--
-- `supabase db advisors` in the pinned CLI (2.84.2) does not ship these two
-- lints yet, so CI runs them directly. Read-only: no objects are created.
-- Prints one line per finding; empty output means clean.
--
-- Usage: psql -X -At -v ON_ERROR_STOP=1 -f scripts/ci/security-definer-lints.sql

with exposed_functions as (
  select
    n.nspname as schema_name,
    p.proname as function_name,
    pg_catalog.pg_get_function_identity_arguments(p.oid) as function_args,
    pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
    pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on p.pronamespace = n.oid
  where p.prosecdef = true
    and n.nspname = any(array(
      select trim(unnest(string_to_array(coalesce(current_setting('pgrst.db_schemas', 't'), 'public'), ',')))
    ))
    and n.nspname not in (
      '_timescaledb_cache', '_timescaledb_catalog', '_timescaledb_config', '_timescaledb_internal',
      'auth', 'cron', 'extensions', 'graphql', 'graphql_public', 'information_schema', 'net', 'pgmq',
      'pgroonga', 'pgsodium', 'pgsodium_masks', 'pgtle', 'pgbouncer', 'pg_catalog', 'realtime',
      'repack', 'storage', 'supabase_functions', 'supabase_migrations', 'tiger', 'topology', 'vault'
    )
)
select format('WARN 0028_anon_security_definer_function_executable  %s.%s(%s)',
              schema_name, function_name, function_args)
  from exposed_functions
 where anon_can_execute
union all
select format('WARN 0029_authenticated_security_definer_function_executable  %s.%s(%s)',
              schema_name, function_name, function_args)
  from exposed_functions
 where authenticated_can_execute
order by 1;

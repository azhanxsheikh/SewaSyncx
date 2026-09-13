-- =============================================================================
-- SewaSync — database linter remediation
--
-- Clears 0028_anon_security_definer_function_executable,
-- 0029_authenticated_security_definer_function_executable and
-- 0008_rls_enabled_no_policy. (auth_leaked_password_protection is a hosted
-- Auth setting, not a database object; see supabase/config.toml.)
--
-- search_path: every SECURITY DEFINER function already runs with
-- search_path = '' and fully qualified references, which is stricter than
-- `public, pg_temp`, so no function configuration changes here.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Trigger functions: not executable by any API role
--
-- Firing a trigger does not check EXECUTE on its function, so revoking only
-- removes the direct-call surface.
-- -----------------------------------------------------------------------------

revoke execute on function public.enforce_category_cap() from public, anon, authenticated;
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
revoke execute on function public.log_request_status_event() from public, anon, authenticated;
revoke execute on function public.snapshot_request_contact() from public, anon, authenticated;
revoke execute on function public.snapshot_technician_location_at_dispatch() from public, anon, authenticated;
revoke execute on function public.sync_technician_location_request() from public, anon, authenticated;


-- -----------------------------------------------------------------------------
-- 2. Client-callable RPCs
--
-- The privileged bodies move to the private schema, which PostgREST does not
-- expose. The public API keeps the same names, arguments and return types as
-- SECURITY INVOKER entry points that assert authentication and delegate. Each
-- private implementation keeps its own authorisation checks as well.
-- -----------------------------------------------------------------------------

alter function public.accept_request(uuid, uuid) set schema private;
alter function public.advance_request_status(uuid, public.request_status) set schema private;
alter function public.complete_profile(text, text) set schema private;
alter function public.report_technician_location(double precision, double precision, double precision, double precision, double precision, public.network_type, boolean) set schema private;

-- service_role reaches the private implementations through the public entry
-- points for system transitions (timeouts, admin assignment).
grant usage on schema private to service_role;

revoke execute on function private.accept_request(uuid, uuid) from public, anon;
revoke execute on function private.advance_request_status(uuid, public.request_status) from public, anon;
revoke execute on function private.complete_profile(text, text) from public, anon;
revoke execute on function private.report_technician_location(double precision, double precision, double precision, double precision, double precision, public.network_type, boolean) from public, anon;
grant execute on function private.accept_request(uuid, uuid) to authenticated, service_role;
grant execute on function private.advance_request_status(uuid, public.request_status) to authenticated, service_role;
grant execute on function private.complete_profile(text, text) to authenticated;
grant execute on function private.report_technician_location(double precision, double precision, double precision, double precision, double precision, public.network_type, boolean) to authenticated;

create function public.accept_request(p_request_id uuid, p_technician_id uuid)
returns public.requests
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_is_service boolean := coalesce(auth.role(), '') = 'service_role';
begin
  if auth.uid() is null and not v_is_service then
    raise exception using errcode = 'P0001', message = 'UNAUTHORIZED: Authentication required';
  end if;

  -- No accepting on another technician's behalf (also enforced in private.accept_request).
  if not v_is_service and p_technician_id is distinct from auth.uid() then
    raise exception using
      errcode = 'P0001',
      message = 'not_authorised',
      detail  = 'p_technician_id must match the authenticated caller';
  end if;

  return private.accept_request(p_request_id, p_technician_id);
end;
$$;

create function public.advance_request_status(p_request_id uuid, p_next_status public.request_status)
returns public.requests
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null and coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = 'P0001', message = 'UNAUTHORIZED: Authentication required';
  end if;

  return private.advance_request_status(p_request_id, p_next_status);
end;
$$;

-- private.complete_profile writes only the row whose id is auth.uid().
create function public.complete_profile(p_name text, p_phone text)
returns public.users
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHORIZED: Authentication required';
  end if;

  return private.complete_profile(p_name, p_phone);
end;
$$;

create function public.report_technician_location(
  p_lat                     double precision,
  p_lng                     double precision,
  p_heading                 double precision default null,
  p_speed                   double precision default null,
  p_accuracy_meters         double precision default null,
  p_network_type            public.network_type default null,
  p_battery_saver_suspected boolean default false
)
returns public.technician_locations
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHORIZED: Authentication required';
  end if;

  return private.report_technician_location(
    p_lat, p_lng, p_heading, p_speed, p_accuracy_meters, p_network_type, p_battery_saver_suspected
  );
end;
$$;

revoke execute on function public.accept_request(uuid, uuid) from public, anon;
revoke execute on function public.advance_request_status(uuid, public.request_status) from public, anon;
revoke execute on function public.complete_profile(text, text) from public, anon;
revoke execute on function public.report_technician_location(double precision, double precision, double precision, double precision, double precision, public.network_type, boolean) from public, anon;
grant execute on function public.accept_request(uuid, uuid) to authenticated, service_role;
grant execute on function public.advance_request_status(uuid, public.request_status) to authenticated, service_role;
grant execute on function public.complete_profile(text, text) to authenticated;
grant execute on function public.report_technician_location(double precision, double precision, double precision, double precision, double precision, public.network_type, boolean) to authenticated;


-- -----------------------------------------------------------------------------
-- 3. RLS policies for tables that had none (DATABASE §12)
--
-- RLS decides which rows; column privileges decide which columns. Where
-- participants may write, table-level privileges are narrowed to the columns
-- they own, so reputation, verification, role and lifecycle fields stay
-- system-maintained.
-- -----------------------------------------------------------------------------

-- Helpers ---------------------------------------------------------------------

-- The caller's role on a request: 'client', 'technician', or NULL if neither.
create function private.request_participant_role(p_request_id uuid)
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select case
           when r.client_id = auth.uid() then 'client'::public.user_role
           when r.technician_id = auth.uid() then 'technician'::public.user_role
         end
    from public.requests r
   where r.id = p_request_id;
$$;

-- p_user_id is a technician assigned to one of the caller's requests.
create function private.is_technician_for_caller(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.requests r
     where r.technician_id = p_user_id
       and r.client_id = auth.uid()
  );
$$;

revoke execute on function private.request_participant_role(uuid) from public;
revoke execute on function private.is_technician_for_caller(uuid) from public;
grant execute on function private.request_participant_role(uuid) to authenticated;
grant execute on function private.is_technician_for_caller(uuid) to authenticated;

-- Catalogue (read-only reference data) ----------------------------------------

create policy service_categories_select_all
  on public.service_categories for select to anon, authenticated
  using (true);

create policy service_offerings_select_all
  on public.service_offerings for select to anon, authenticated
  using (true);

-- users -------------------------------------------------------------------------

create policy users_select_self
  on public.users for select to authenticated
  using (id = (select auth.uid()));

-- A client can read the profile of a technician assigned to their request
-- (name and phone for the tracking and history screens). Technicians see the
-- client through the request's contact snapshot instead.
create policy users_select_assigned_technician
  on public.users for select to authenticated
  using (role = 'technician' and private.is_technician_for_caller(id));

create policy users_update_self
  on public.users for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Role, phone (normalised via complete_profile) and email (synced from auth)
-- are not self-editable.
revoke insert, update, delete on public.users from anon, authenticated;
grant update (name, preferred_language, default_location, default_street_address, default_unit_floor)
  on public.users to authenticated;

-- saved_addresses ----------------------------------------------------------------

create policy saved_addresses_select_own
  on public.saved_addresses for select to authenticated
  using (user_id = (select auth.uid()));

create policy saved_addresses_insert_own
  on public.saved_addresses for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy saved_addresses_update_own
  on public.saved_addresses for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy saved_addresses_delete_own
  on public.saved_addresses for delete to authenticated
  using (user_id = (select auth.uid()));

-- family_members (owned via owner_id) -------------------------------------------

create policy family_members_select_own
  on public.family_members for select to authenticated
  using (owner_id = (select auth.uid()));

create policy family_members_insert_own
  on public.family_members for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy family_members_update_own
  on public.family_members for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy family_members_delete_own
  on public.family_members for delete to authenticated
  using (owner_id = (select auth.uid()));

-- technician_profiles -------------------------------------------------------------

create policy technician_profiles_select_verified
  on public.technician_profiles for select to authenticated
  using (identity_verified and skill_verified and background_checked);

create policy technician_profiles_select_self
  on public.technician_profiles for select to authenticated
  using (id = (select auth.uid()));

create policy technician_profiles_update_self
  on public.technician_profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Verification flags and reputation (rating, review_count, total_jobs) are
-- system-maintained (DATABASE §9.3).
revoke insert, update, delete on public.technician_profiles from anon, authenticated;
grant update (vehicle_type, vehicle_registration, experience_years, is_online, photo_url)
  on public.technician_profiles to authenticated;

-- technician_categories (max three per technician, enforced by trigger) ----------

create policy technician_categories_select_all
  on public.technician_categories for select to authenticated
  using (true);

create policy technician_categories_insert_self
  on public.technician_categories for insert to authenticated
  with check (
    technician_id = (select auth.uid())
    and exists (select 1 from public.users u where u.id = (select auth.uid()) and u.role = 'technician')
  );

create policy technician_categories_update_self
  on public.technician_categories for update to authenticated
  using (technician_id = (select auth.uid()))
  with check (
    technician_id = (select auth.uid())
    and exists (select 1 from public.users u where u.id = (select auth.uid()) and u.role = 'technician')
  );

create policy technician_categories_delete_self
  on public.technician_categories for delete to authenticated
  using (technician_id = (select auth.uid()));

-- disputes --------------------------------------------------------------------------

create policy disputes_select_participant
  on public.disputes for select to authenticated
  using (private.is_request_participant(request_id));

-- A participant opens a dispute in their own name and in their actual role on
-- the request. Status, liability and resolution are not writable (column
-- privileges below); the checks restate that explicitly.
create policy disputes_insert_participant
  on public.disputes for insert to authenticated
  with check (
    initiator_id = (select auth.uid())
    and initiator_role = private.request_participant_role(request_id)
    and status = 'open'
    and liability_amount is null
    and liability_party is null
    and resolved_at is null
  );

revoke insert, update, delete on public.disputes from anon, authenticated;
grant insert (request_id, initiator_id, initiator_role, reason_category, description)
  on public.disputes to authenticated;


-- -----------------------------------------------------------------------------
-- 4. Ping partitions (private schema)
--
-- Partitions are only ever read or written through the parent
-- public.technician_location_pings, whose RLS applies. Direct access needs
-- table privileges that API roles do not hold, and the private schema is not
-- exposed, so partition-level RLS adds nothing and is disabled.
-- -----------------------------------------------------------------------------

do $$
declare
  v_partition regclass;
begin
  for v_partition in
    select i.inhrelid::regclass
      from pg_catalog.pg_inherits i
     where i.inhparent = 'public.technician_location_pings'::regclass
  loop
    execute format('alter table %s disable row level security', v_partition);
  end loop;
end;
$$;

-- Future partitions: same shape, without partition-level RLS.
create or replace function private.ensure_location_ping_partitions(p_months_ahead integer default 3)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_month   timestamp;
  v_name    text;
  v_created integer := 0;
begin
  for v_month in
    select generate_series(
             date_trunc('month', now() at time zone 'UTC') - interval '1 month',
             date_trunc('month', now() at time zone 'UTC') + make_interval(months => p_months_ahead),
             interval '1 month'
           )
  loop
    v_name := 'technician_location_pings_' || to_char(v_month, 'YYYY_MM');

    if to_regclass('private.' || v_name) is null then
      execute format(
        'create table private.%I partition of public.technician_location_pings for values from (%L) to (%L)',
        v_name,
        v_month at time zone 'UTC',
        (v_month + interval '1 month') at time zone 'UTC'
      );
      execute format('revoke all on table private.%I from anon, authenticated', v_name);
      v_created := v_created + 1;
    end if;
  end loop;

  return v_created;
end;
$$;

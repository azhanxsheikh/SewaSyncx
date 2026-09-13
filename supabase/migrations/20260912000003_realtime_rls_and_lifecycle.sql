-- =============================================================================
-- SewaSync — realtime RLS, dispatch lifecycle and phone policy
--
-- Design authority: docs/DATABASE.md §5.5, §8, §9.2, §12; docs/WORKFLOWS.md
-- §6.2–6.4, §8; docs/RULES_AND_LOGIC.md §10; docs/SRS.md FR-DISPATCH-001,
-- NFR-SEC-005.
--
--  1. Mandatory phone: users.phone NOT NULL; profiles for identities without a
--     phone are created at onboarding via complete_profile(); request creation
--     raises CLIENT_PHONE_REQUIRED when the client has no profile.
--  2. Dispatch position snapshot and technician_locations.request_id pointer,
--     maintained by triggers so every writer (RPCs, sweep, admin) is covered.
--     technician_location_pings (partitioned trajectory history) and
--     report_technician_location() as the single write path for positions.
--  3. Radius expansion / unfulfilment sweep with per-row failure isolation,
--     scheduled by pg_cron.
--  4. SELECT policies for requests and technician_locations, which gate
--     Realtime delivery.
--
-- Still deferred: INSERT/UPDATE policies (request creation needs a
-- server-priced create_request RPC), policies for the remaining tables,
-- chat_messages, throttle/tooling/insurance gates, ping partition retention.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. Extensions and private schema
-- -----------------------------------------------------------------------------

create extension if not exists pg_cron with schema pg_catalog;

-- Helpers that must not be reachable through PostgREST (which exposes public
-- only): RLS predicates, phone normalisation, scheduled jobs.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create function public.request_status_is_terminal(p_status public.request_status)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select p_status in ('completed', 'cancelled', 'declined', 'unfulfilled');
$$;


-- -----------------------------------------------------------------------------
-- 1. Mandatory phone policy
--
-- Storage stays canonical E.164 (users_phone_e164, DATABASE §1): tel: and
-- WhatsApp deep links both need the country code, so a bare 10-digit number is
-- accepted as input but never stored. private.normalize_phone() maps the
-- common Indian input formats onto E.164 and returns NULL for anything else.
-- -----------------------------------------------------------------------------

create function private.normalize_phone(p_raw text)
returns text
language plpgsql
immutable
parallel safe
set search_path = ''
as $$
declare
  v text;
begin
  if p_raw is null then
    return null;
  end if;

  v := regexp_replace(p_raw, '[\s().-]', '', 'g');

  if v ~ '^\+[1-9][0-9]{7,14}$' then
    return v;                               -- already E.164
  elsif v ~ '^[6-9][0-9]{9}$' then
    return '+91' || v;                      -- 98765 43210
  elsif v ~ '^0[6-9][0-9]{9}$' then
    return '+91' || substr(v, 2);           -- 098765 43210 (trunk prefix)
  elsif v ~ '^00[1-9][0-9]{7,14}$' then
    return '+' || substr(v, 3);             -- 0091 98765 43210 (international prefix)
  elsif v ~ '^[1-9][0-9]{10,14}$' then
    return '+' || v;                        -- 919876543210 (country code, no '+'; GoTrue's format)
  end if;

  return null;
end;
$$;

revoke execute on function private.normalize_phone(text) from public;

-- Fails loudly if any existing profile lacks a phone; backfill before applying.
alter table public.users alter column phone set not null;

-- Sign-up creates the profile only when the identity already carries a valid
-- phone (phone-OTP sign-up). Email and OAuth identities complete their profile
-- through complete_profile() during onboarding. A sign-up is never failed here.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text := private.normalize_phone(new.phone);
begin
  if v_phone is null then
    return new;
  end if;

  begin
    insert into public.users (id, name, phone, email)
    values (
      new.id,
      coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
        nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        v_phone
      ),
      v_phone,
      nullif(new.email, '')
    );
  exception
    when unique_violation then
      -- Phone or email already on another profile: leave it to onboarding,
      -- which reports the conflict, rather than failing the sign-up.
      null;
  end;

  return new;
end;
$$;

-- Onboarding: creates or updates the caller's profile. Role is never taken from
-- input; technician status is granted by a separate verified flow.
create function public.complete_profile(p_name text, p_phone text)
returns public.users
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid        uuid := auth.uid();
  v_name       text := nullif(trim(p_name), '');
  v_phone      text := private.normalize_phone(p_phone);
  v_email      text;
  v_user       public.users;
  v_constraint text;
begin
  select nullif(au.email, '')
    into v_email
    from auth.users au
   where au.id = v_uid;

  if v_uid is null or not found then
    raise exception using
      errcode = 'P0001',
      message = 'not_authenticated',
      detail  = 'complete_profile requires a signed-in user';
  end if;

  if v_name is null then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_name',
      detail  = 'name must not be empty';
  end if;

  if v_phone is null then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_phone',
      detail  = format('%L is not a 10-digit Indian mobile number or an E.164 number', p_phone);
  end if;

  begin
    insert into public.users (id, name, phone, email)
    values (v_uid, v_name, v_phone, v_email)
    on conflict (id) do update
      set name  = excluded.name,
          phone = excluded.phone
    returning * into v_user;
  exception
    when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = 'users_phone_key' then
        raise exception using
          errcode = 'P0001',
          message = 'phone_already_registered',
          detail  = format('%s is registered to another account', v_phone);
      end if;
      raise;
  end;

  return v_user;
end;
$$;

revoke execute on function public.complete_profile(text, text) from public, anon;
grant execute on function public.complete_profile(text, text) to authenticated;

-- Request creation: the client must have a profile (and therefore a phone).
-- Contact details snapshot from the beneficiary for delegated requests; when the
-- beneficiary has no phone, the booking client's phone is used so the
-- technician always has a reachable number.
create or replace function public.snapshot_request_contact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client_name  text;
  v_client_phone text;
  v_name         text;
  v_phone        text;
begin
  select u.name, u.phone
    into v_client_name, v_client_phone
    from public.users u
   where u.id = new.client_id;

  if not found or v_client_phone is null then
    raise exception using
      errcode = 'P0001',
      message = 'CLIENT_PHONE_REQUIRED: A valid phone number is mandatory for dispatch communication.',
      hint    = 'Complete the profile with complete_profile(p_name, p_phone) before creating a request.';
  end if;

  if new.family_member_id is not null then
    select fm.name, fm.phone
      into v_name, v_phone
      from public.family_members fm
     where fm.id = new.family_member_id
       and fm.owner_id = new.client_id;

    if not found then
      raise exception using
        errcode = 'P0001',
        message = 'family_member_not_owned',
        detail  = format('family member %s does not belong to client %s', new.family_member_id, new.client_id);
    end if;

    new.contact_name  := v_name;
    new.contact_phone := coalesce(v_phone, v_client_phone);
  else
    new.contact_name  := v_client_name;
    new.contact_phone := v_client_phone;
  end if;

  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- 2a. Position freshness
--
-- updated_at is the "last position report" signal used by the 90-second
-- freshness gate. The request_id pointer below is written on lifecycle events;
-- those writes must not make a stale position look fresh, so the timestamp is
-- maintained only when the reported position fields are written.
-- -----------------------------------------------------------------------------

drop trigger set_updated_at on public.technician_locations;

create trigger set_updated_at
  before update of location, heading, speed on public.technician_locations
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 2b. Dispatch snapshot and tracking pointer (DATABASE §5.4, WORKFLOWS §8)
-- -----------------------------------------------------------------------------

-- Captures the technician's position at the moment of acceptance into
-- requests.technician_location_at_dispatch (the §5.4 column for this purpose).
-- NULL when the technician has no position on record; acceptance is not blocked.
create function public.snapshot_technician_location_at_dispatch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select tl.location
    into new.technician_location_at_dispatch
    from public.technician_locations tl
   where tl.technician_id = new.technician_id;

  return new;
end;
$$;

-- Fires after guard_request_status_update (BEFORE triggers run in name order).
create trigger snapshot_technician_location_at_dispatch
  before update of status on public.requests
  for each row
  when (new.status = 'accepted' and old.status is distinct from new.status and new.technician_id is not null)
  execute function public.snapshot_technician_location_at_dispatch();

-- Maintains technician_locations.request_id, the "trip in progress" pointer
-- used for ping attribution and tracking:
--   accepted  → point at this request, unless the technician is already
--               pointed at another job (a future booking accepted mid-job must
--               not steal the pointer from the job in hand)
--   en_route  → point at this request: the technician is now travelling to it
--   terminal  → clear, but only if the pointer still refers to this request
create function public.sync_technician_location_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'accepted' and new.technician_id is not null then
    update public.technician_locations
       set request_id = new.id
     where technician_id = new.technician_id
       and request_id is null;
  elsif new.status = 'en_route' and new.technician_id is not null then
    update public.technician_locations
       set request_id = new.id
     where technician_id = new.technician_id
       and request_id is distinct from new.id;
  elsif public.request_status_is_terminal(new.status) then
    update public.technician_locations
       set request_id = null
     where request_id = new.id;
  end if;

  return null;
end;
$$;

create trigger sync_technician_location_request
  after update of status on public.requests
  for each row
  when (old.status is distinct from new.status)
  execute function public.sync_technician_location_request();


-- -----------------------------------------------------------------------------
-- 2c. Trajectory history (DATABASE §5.5, §8)
--
-- Append-only, RANGE-partitioned monthly on recorded_at. Partitions are created
-- by private.ensure_location_ping_partitions() (run now and daily by pg_cron).
-- Retention — detach, drain to the Parquet tier, drop — is deferred.
-- -----------------------------------------------------------------------------

create type public.network_type as enum ('wifi', 'cellular_4g', 'cellular_5g', 'unknown');

create table public.technician_location_pings (
  id                      bigint generated always as identity,
  technician_id           uuid not null references public.technician_profiles (id) on delete cascade,
  request_id              uuid references public.requests (id) on delete set null,
  location                extensions.geography(point, 4326) not null,
  heading                 double precision,
  speed                   double precision,
  accuracy_meters         double precision,
  network_type            public.network_type,
  battery_saver_suspected boolean not null default false,
  recorded_at             timestamptz not null default now(),
  primary key (id, recorded_at)
) partition by range (recorded_at);

-- Defined on the parent, so each partition gets its own local index.
create index technician_location_pings_geo_idx
  on public.technician_location_pings using gist (location);
create index technician_location_pings_trajectory_idx
  on public.technician_location_pings (technician_id, recorded_at);
create index technician_location_pings_request_idx
  on public.technician_location_pings (request_id, recorded_at)
  where request_id is not null;

alter table public.technician_location_pings enable row level security;

-- Creates monthly partitions (UTC) from the previous month through
-- p_months_ahead months ahead. Idempotent.
--
-- Partitions live in the private schema: a query that names a partition
-- directly is not subject to the parent's RLS, so they are kept off the API
-- surface (and out of generated types) entirely. RLS is still enabled and
-- API-role privileges revoked on each as defence in depth.
create function private.ensure_location_ping_partitions(p_months_ahead integer default 3)
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
      execute format('alter table private.%I enable row level security', v_name);
      execute format('revoke all on table private.%I from anon, authenticated', v_name);
      v_created := v_created + 1;
    end if;
  end loop;

  return v_created;
end;
$$;

revoke execute on function private.ensure_location_ping_partitions(integer) from public;

select private.ensure_location_ping_partitions(3);

-- The single write path for technician positions (WORKFLOWS §8.2): upserts the
-- current-position cache and appends to the trajectory in one transaction.
-- Pings are attributed to the trip in progress via the request_id pointer.
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
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_location extensions.geography;
  v_row      public.technician_locations;
begin
  if v_uid is null or not exists (
    select 1
      from public.users u
      join public.technician_profiles tp on tp.id = u.id
     where u.id = v_uid
       and u.role = 'technician'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'not_a_technician',
      detail  = 'only technicians report positions';
  end if;

  -- NaN compares greater than every number, so it fails the upper bounds.
  if p_lat is null or p_lng is null
     or p_lat < -90 or p_lat > 90
     or p_lng < -180 or p_lng > 180 then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_coordinates',
      detail  = format('(%s, %s) is not a valid latitude/longitude', p_lat, p_lng);
  end if;

  v_location := extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography;

  insert into public.technician_locations as tl (technician_id, location, heading, speed)
  values (v_uid, v_location, p_heading, p_speed)
  on conflict (technician_id) do update
    set location = excluded.location,
        heading  = excluded.heading,
        speed    = excluded.speed
  returning * into v_row;

  insert into public.technician_location_pings
    (technician_id, request_id, location, heading, speed, accuracy_meters, network_type, battery_saver_suspected)
  values
    (v_uid, v_row.request_id, v_location, p_heading, p_speed, p_accuracy_meters, p_network_type,
     coalesce(p_battery_saver_suspected, false));

  return v_row;
end;
$$;

revoke execute on function public.report_technician_location(double precision, double precision, double precision, double precision, double precision, public.network_type, boolean) from public, anon;
grant execute on function public.report_technician_location(double precision, double precision, double precision, double precision, double precision, public.network_type, boolean) to authenticated;


-- -----------------------------------------------------------------------------
-- 3. Radius expansion and unfulfilment sweep (WORKFLOWS §6.2–6.4)
--
-- Emergency: every dispatch_tier_hold_seconds (120) without acceptance, the
-- radius steps 10 → 15 → 20 → 25 → 30 km; a request held at 30 km for one more
-- interval becomes unfulfilled (~10 minutes end to end).
-- Scheduled: becomes unfulfilled once scheduled_unfulfilled_cutoff_minutes (30)
-- before scheduled_at is reached without acceptance.
--
-- Batch resilience:
--   * candidates are re-read under FOR UPDATE SKIP LOCKED and re-checked, so a
--     row being accepted right now is skipped (picked up next run if still
--     pending), never waited on;
--   * each row runs in its own exception block, so one failure is logged as a
--     WARNING and counted without aborting the rest of the batch.
-- -----------------------------------------------------------------------------

create function private.run_dispatch_sweep(p_batch_size integer default 500)
returns table (expanded integer, unfulfilled integer, skipped integer, failed integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_tier_hold  constant interval := interval '120 seconds';   -- dispatch_tier_hold_seconds
  c_step_km    constant integer  := 5;                         -- dispatch_radius_step_km
  c_max_km     constant integer  := 30;                        -- dispatch_radius_max_km
  c_cutoff     constant interval := interval '30 minutes';     -- scheduled_unfulfilled_cutoff_minutes
  v_candidate  uuid;
  v_request    public.requests;
begin
  expanded := 0;
  unfulfilled := 0;
  skipped := 0;
  failed := 0;

  for v_candidate in
    select r.id
      from public.requests r
     where r.status = 'pending'
       and r.technician_id is null
       and (
             (r.scheduled_at is null and coalesce(r.radius_expanded_at, r.created_at) <= now() - c_tier_hold)
          or (r.scheduled_at is not null and r.scheduled_at - c_cutoff <= now())
           )
     order by r.created_at
     limit p_batch_size
  loop
    begin
      select *
        into v_request
        from public.requests r
       where r.id = v_candidate
         and r.status = 'pending'
         and r.technician_id is null
         for update skip locked;

      if not found then
        skipped := skipped + 1;
        continue;
      end if;

      if v_request.scheduled_at is null then
        if coalesce(v_request.radius_expanded_at, v_request.created_at) > now() - c_tier_hold then
          skipped := skipped + 1;               -- expanded by a concurrent run
        elsif v_request.search_radius_km < c_max_km then
          update public.requests
             set search_radius_km   = least(v_request.search_radius_km + c_step_km, c_max_km),
                 radius_expanded_at = now()
           where id = v_request.id;
          expanded := expanded + 1;
        else
          perform set_config('sewasync.actor_role', 'system', true);
          perform set_config('sewasync.actor_id', '', true);
          perform set_config('sewasync.status_reason', 'system_timeout', true);
          update public.requests set status = 'unfulfilled' where id = v_request.id;
          unfulfilled := unfulfilled + 1;
        end if;
      else
        perform set_config('sewasync.actor_role', 'system', true);
        perform set_config('sewasync.actor_id', '', true);
        perform set_config('sewasync.status_reason', 'system_timeout', true);
        update public.requests set status = 'unfulfilled' where id = v_request.id;
        unfulfilled := unfulfilled + 1;
      end if;
    exception
      when others then
        failed := failed + 1;
        raise warning 'dispatch sweep: request % failed: % (SQLSTATE %)', v_candidate, sqlerrm, sqlstate;
    end;
  end loop;

  perform set_config('sewasync.actor_role', '', true);
  perform set_config('sewasync.actor_id', '', true);
  perform set_config('sewasync.status_reason', '', true);

  return next;
end;
$$;

revoke execute on function private.run_dispatch_sweep(integer) from public;


-- -----------------------------------------------------------------------------
-- 4. Row-Level Security policies (DATABASE §12)
--
-- Realtime delivers a change only to subscribers whose SELECT policy admits the
-- row, so these policies are also the Realtime visibility rules.
--
-- Predicates that need other RLS-protected tables go through SECURITY DEFINER
-- helpers in the private schema. Reading those tables directly from a policy
-- would be filtered by their own (absent) policies and never match, and a
-- policy pair that reads each other's tables would recurse.
-- -----------------------------------------------------------------------------

-- eligible-tech (FR-DISPATCH-001, NFR-SEC-005): the caller is an online
-- technician registered for the category whose current position lies within
-- the request's current search radius.
create function private.technician_can_view_pending_request(
  p_category_id      uuid,
  p_service_location extensions.geography,
  p_search_radius_km integer
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.technician_profiles tp
      join public.users u
        on u.id = tp.id
       and u.role = 'technician'
      join public.technician_categories tc
        on tc.technician_id = tp.id
       and tc.category_id = p_category_id
      join public.technician_locations tl
        on tl.technician_id = tp.id
     where tp.id = auth.uid()
       and tp.is_online
       and extensions.st_dwithin(tl.location, p_service_location, p_search_radius_km * 1000.0)
  );
$$;

-- Live tracking: the caller is the client of a request on which this technician
-- is travelling to or standing at the service location.
create function private.client_can_track_technician(p_technician_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.requests r
     where r.technician_id = p_technician_id
       and r.client_id = auth.uid()
       and r.status in ('en_route', 'arrived')
  );
$$;

revoke execute on function private.technician_can_view_pending_request(uuid, extensions.geography, integer) from public;
revoke execute on function private.client_can_track_technician(uuid) from public;
grant execute on function private.technician_can_view_pending_request(uuid, extensions.geography, integer) to authenticated;
grant execute on function private.client_can_track_technician(uuid) to authenticated;

-- requests
create policy requests_select_client
  on public.requests for select to authenticated
  using (client_id = (select auth.uid()));

create policy requests_select_assigned_technician
  on public.requests for select to authenticated
  using (technician_id = (select auth.uid()));

create policy requests_select_eligible_technician
  on public.requests for select to authenticated
  using (
    status = 'pending'
    and technician_id is null
    and private.technician_can_view_pending_request(category_id, service_location, search_radius_km)
  );

-- technician_locations
create policy technician_locations_select_self
  on public.technician_locations for select to authenticated
  using (technician_id = (select auth.uid()));

create policy technician_locations_select_tracking_client
  on public.technician_locations for select to authenticated
  using (private.client_can_track_technician(technician_id));


-- -----------------------------------------------------------------------------
-- 5. Scheduled jobs (WORKFLOWS §6.3, §14)
-- -----------------------------------------------------------------------------

select cron.schedule('dispatch-radius-sweep', '30 seconds', 'select private.run_dispatch_sweep()');
select cron.schedule('ensure-location-ping-partitions', '15 3 * * *', 'select private.ensure_location_ping_partitions(3)');

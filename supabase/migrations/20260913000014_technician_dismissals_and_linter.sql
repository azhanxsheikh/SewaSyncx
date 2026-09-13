-- =============================================================================
-- SewaSync — technician dismissals, stale-alert eviction, linter fixes
-- (2026-09-13)
-- Design authority: docs/DATABASE.md §5 / §12 (request_technician_dismissals),
-- docs/WORKFLOWS.md §1 ("On declined, redefined"), ARCHITECTURE ADR-010,
-- SRS FR-DISPATCH-008.
--
-- Hosted advisor findings closed here:
--   0028 anon_security_definer_function_executable
--        sync_request_address_fields, sync_saved_address_fields
--   0029 authenticated_security_definer_function_executable
--        sync_request_address_fields, sync_saved_address_fields,
--        register_technician_profile
-- auth_leaked_password_protection is a hosted Auth setting, not a migration
-- (see the comment under [auth] in supabase/config.toml).
-- =============================================================================

-- 1. Trigger functions are not RPCs ---------------------------------------------
--
-- Both run only from BEFORE triggers; EXECUTE is checked when a trigger is
-- created, not when it fires, so revoking it from API roles changes nothing
-- for inserts/updates. search_path stays '' (already the strictest setting).
-- PUBLIC, anon and authenticated each hold their own grant, so all three go.

revoke execute on function public.sync_request_address_fields() from public, anon, authenticated;
revoke execute on function public.sync_saved_address_fields() from public, anon, authenticated;

-- 2. register_technician_profile: privileged body out of the API schema --------
--
-- Same split as accept_request / verify_technician. It must stay definer:
-- 20260913000013 revoked INSERT on technician_profiles and technician_locations
-- from authenticated, so an invoker body would fail every signup. The body
-- below is 20260913000009's with one fix: array_length('{}', 1) is NULL, so an
-- empty array slipped past the 1–3 check and deleted every category. The
-- public signature and return type are unchanged, so TechnicianSignUpModal's
-- call keeps working.

create or replace function private.register_technician_profile(
  p_vehicle_type text,
  p_vehicle_registration text,
  p_category_ids uuid[],
  p_lat double precision,
  p_lng double precision
)
returns public.technician_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid         uuid := auth.uid();
  v_profile     public.technician_profiles;
  v_cat_id      uuid;
  v_location    extensions.geography;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;

  -- Ensure user role is technician in public.users
  update public.users set role = 'technician' where id = v_uid;

  -- Insert or update technician profile
  insert into public.technician_profiles (
    id, vehicle_type, vehicle_registration, is_online, identity_verified, skill_verified, background_checked
  )
  values (
    v_uid, p_vehicle_type, p_vehicle_registration, true, false, false, false
  )
  on conflict (id) do update
    set vehicle_type = excluded.vehicle_type,
        vehicle_registration = excluded.vehicle_registration,
        is_online = excluded.is_online
  returning * into v_profile;

  -- Insert categories (1 to 3 enforced by constraint trigger enforce_category_cap)
  if p_category_ids is not null then
    if coalesce(array_length(p_category_ids, 1), 0) not between 1 and 3 then
      raise exception using
        errcode = 'P0001',
        message = 'category_count_out_of_bounds',
        detail = 'technicians must select between 1 and 3 categories';
    end if;

    delete from public.technician_categories where technician_id = v_uid;
    foreach v_cat_id in array p_category_ids loop
      insert into public.technician_categories (technician_id, category_id)
      values (v_uid, v_cat_id);
    end loop;
  end if;

  -- Initial location if coordinates provided
  if p_lat is not null and p_lng is not null then
    v_location := extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography;
    insert into public.technician_locations (technician_id, location)
    values (v_uid, v_location)
    on conflict (technician_id) do update
      set location = excluded.location,
          updated_at = now();
  end if;

  return v_profile;
end;
$$;

revoke execute on function private.register_technician_profile(text, text, uuid[], double precision, double precision) from public, anon;
grant execute on function private.register_technician_profile(text, text, uuid[], double precision, double precision) to authenticated;

create or replace function public.register_technician_profile(
  p_vehicle_type text,
  p_vehicle_registration text,
  p_category_ids uuid[],
  p_lat double precision,
  p_lng double precision
)
returns public.technician_profiles
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHORIZED: Authentication required';
  end if;
  return private.register_technician_profile(p_vehicle_type, p_vehicle_registration, p_category_ids, p_lat, p_lng);
end;
$$;

revoke execute on function public.register_technician_profile(text, text, uuid[], double precision, double precision) from public, anon;
grant execute on function public.register_technician_profile(text, text, uuid[], double precision, double precision) to authenticated;

-- 3. request_technician_dismissals (DATABASE §5, RLS matrix §12) ----------------
--
-- A technician's private "not for me" on a broadcast request. It never changes
-- the request, so every other eligible technician still sees it. `declined`
-- stays reserved for an assigned technician withdrawing (WORKFLOWS §1).

create table if not exists public.request_technician_dismissals (
  request_id    uuid not null references public.requests (id) on delete cascade,
  technician_id uuid not null references public.users (id) on delete cascade,
  dismissed_at  timestamptz not null default now(),
  primary key (request_id, technician_id)
);

create index if not exists request_technician_dismissals_technician_idx
  on public.request_technician_dismissals (technician_id);

alter table public.request_technician_dismissals enable row level security;

revoke all on public.request_technician_dismissals from anon, authenticated;
grant select, insert on public.request_technician_dismissals to authenticated;

-- SELECT: self (technician), all (both staff roles).
drop policy if exists request_technician_dismissals_select_self_or_staff on public.request_technician_dismissals;
create policy request_technician_dismissals_select_self_or_staff
  on public.request_technician_dismissals for select to authenticated
  using (technician_id = (select auth.uid()) or private.is_platform_staff());

-- INSERT: self, as a technician, and only for a pending request the caller
-- can currently read (the subquery runs under the caller's RLS), so ids
-- outside their feed — jobs they are assigned, a client's own requests — are
-- refused.
drop policy if exists request_technician_dismissals_insert_self on public.request_technician_dismissals;
create policy request_technician_dismissals_insert_self
  on public.request_technician_dismissals for insert to authenticated
  with check (
    technician_id = (select auth.uid())
    and exists (
      select 1 from public.technician_profiles tp
       where tp.id = (select auth.uid())
    )
    and exists (
      select 1 from public.requests r
       where r.id = request_id
         and r.status = 'pending'
         and r.technician_id is null
    )
  );

-- Invoker: the table policies above are the whole authorisation.
create or replace function public.dismiss_request(p_request_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHORIZED: Authentication required';
  end if;

  -- Already claimed, cancelled or out of range: it has left this technician's
  -- feed anyway (the alert timer also lands here), so there is nothing to do.
  if not exists (
    select 1 from public.requests r
     where r.id = p_request_id
       and r.status = 'pending'
       and r.technician_id is null
  ) then
    return;
  end if;

  insert into public.request_technician_dismissals (request_id, technician_id)
  values (p_request_id, auth.uid())
  on conflict (request_id, technician_id) do nothing;
end;
$$;

revoke execute on function public.dismiss_request(uuid) from public, anon;
grant execute on function public.dismiss_request(uuid) to authenticated;

-- 4. Stale-alert eviction ----------------------------------------------------------
--
-- When a pending request is claimed or withdrawn, the row stops matching
-- requests_select_eligible_technician, so Realtime's RLS check drops the
-- UPDATE for every technician who was still being offered it — they never
-- learn it is gone (reproduced: 0 events for the observer). Announce the id
-- alone on a private broadcast topic; each client then re-runs its own
-- RLS-gated query. No request data is broadcast.

create or replace function private.announce_request_unavailable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- realtime.send swallows its own errors (RAISE WARNING), so a broadcast
  -- failure can never roll back the claim.
  perform realtime.send(
    jsonb_build_object('request_id', new.id),
    'request_unavailable',
    'dispatch:pending',
    true
  );
  return new;
end;
$$;

revoke execute on function private.announce_request_unavailable() from public, anon, authenticated;

drop trigger if exists announce_request_unavailable on public.requests;
create trigger announce_request_unavailable
  after update of status, technician_id on public.requests
  for each row
  when (old.status = 'pending' and (new.status <> 'pending' or new.technician_id is not null))
  execute function private.announce_request_unavailable();

-- Only technicians may join the private topic.
drop policy if exists dispatch_pending_technicians_receive on realtime.messages;
create policy dispatch_pending_technicians_receive
  on realtime.messages for select to authenticated
  using (
    (select realtime.topic()) = 'dispatch:pending'
    and realtime.messages.extension = 'broadcast'
    and exists (
      select 1 from public.technician_profiles tp
       where tp.id = (select auth.uid())
    )
  );

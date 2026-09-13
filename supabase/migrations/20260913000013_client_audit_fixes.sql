-- =============================================================================
-- SewaSync — client audit fixes (2026-09-13)
-- Design authority: docs/DATABASE.md §5.4 (request_attachments), §12 (RLS
-- matrix), §13 (storage buckets); docs/SRS.md §3 ("match requests to eligible
-- technicians using ... verified capability"); docs/RULES_AND_LOGIC.md §3.1.
--
-- Every section below closes a hole reproduced as a real `authenticated`
-- caller, not a theoretical one.
-- =============================================================================

-- 1. technician_profiles: no self-service INSERT ------------------------------
--
-- technician_profiles_insert_self (20260913000009) checked only
-- id = auth.uid(), so a client could insert themselves with
-- identity_verified / skill_verified / background_checked = true. Onboarding
-- goes through register_technician_profile(), which always writes the flags
-- false; direct INSERT is no longer needed.

drop policy if exists technician_profiles_insert_self on public.technician_profiles;
revoke insert on public.technician_profiles from authenticated;

-- 2. Dispatch eligibility requires verification --------------------------------
--
-- Any account can become an (unverified) technician via
-- register_technician_profile(). Neither the pending-request visibility
-- predicate nor accept_request() checked verification, so that account could
-- immediately read nearby clients' contact_name / contact_phone / address /
-- evidence media and claim their jobs. "Verified" is the same three-flag
-- definition technician_profiles_select_verified already uses.

create or replace function private.technician_can_view_pending_request(
  p_category_id uuid,
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
       and tp.identity_verified
       and tp.skill_verified
       and tp.background_checked
       and extensions.st_dwithin(tl.location, p_service_location, p_search_radius_km * 1000.0)
  );
$$;

create or replace function private.accept_request(p_request_id uuid, p_technician_id uuid)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_service boolean := coalesce(auth.role(), '') = 'service_role';
  v_request    public.requests;
  v_constraint text;
begin
  if p_technician_id is null or (not v_is_service and p_technician_id is distinct from auth.uid()) then
    raise exception using
      errcode = 'P0001',
      message = 'not_authorised',
      detail  = 'p_technician_id must match the authenticated caller';
  end if;

  if not exists (
    select 1
      from public.users u
      join public.technician_profiles tp on tp.id = u.id
     where u.id = p_technician_id
       and u.role = 'technician'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'not_a_technician',
      detail  = format('user %s has no technician profile', p_technician_id);
  end if;

  if not exists (
    select 1
      from public.technician_profiles tp
     where tp.id = p_technician_id
       and tp.identity_verified
       and tp.skill_verified
       and tp.background_checked
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'technician_not_verified',
      detail  = format('technician %s has not completed verification', p_technician_id);
  end if;

  -- Row lock: concurrent acceptors queue here. The loser re-reads the row after
  -- the winner commits and fails the precondition below.
  select *
    into v_request
    from public.requests
   where id = p_request_id
     for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'request_not_found',
      detail  = format('request %s does not exist', p_request_id);
  end if;

  if v_request.status <> 'pending' or v_request.technician_id is not null then
    raise exception using
      errcode = 'P0001',
      message = 'already_claimed',
      detail  = format('request %s is %s', p_request_id, v_request.status);
  end if;

  if not exists (
    select 1
      from public.technician_categories tc
     where tc.technician_id = p_technician_id
       and tc.category_id = v_request.category_id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'category_mismatch',
      detail  = format('technician %s is not registered for category %s', p_technician_id, v_request.category_id);
  end if;

  perform set_config('sewasync.actor_role', case when v_is_service then 'system' else 'technician' end, true);
  perform set_config('sewasync.actor_id', case when v_is_service then '' else p_technician_id::text end, true);
  perform set_config('sewasync.status_reason', '', true);

  -- execution_window recomputes in this statement; the exclusion constraint and
  -- the single-active-emergency index are evaluated as part of the write.
  begin
    update public.requests
       set technician_id = p_technician_id,
           status        = 'accepted',
           accepted_at   = now()
     where id = p_request_id
    returning * into v_request;
  exception
    when exclusion_violation or unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint in ('requests_no_overlapping_commitment', 'idx_technician_single_active_job') then
        raise exception using
          errcode = 'P0001',
          message = 'scheduling_conflict',
          detail  = format('request %s overlaps a commitment already held by technician %s', p_request_id, p_technician_id);
      end if;
      raise;
  end;

  perform set_config('sewasync.actor_role', '', true);
  perform set_config('sewasync.actor_id', '', true);

  return v_request;
end;
$$;

-- 2b. Staff verification path ----------------------------------------------------
--
-- Without this, the gate above is a dead end: register_technician_profile
-- writes all three flags false, technicians cannot update them (column grants
-- exclude them), and nothing else sets them. ADMIN_CONSOLE §2 lets both staff
-- roles "record verification outcomes". admin_actions and
-- technician_verification_records (ADMIN_CONSOLE §6.1) do not exist yet, so
-- the outcome is written straight to the flags without an audit row.

create or replace function private.verify_technician(
  p_technician_id uuid,
  p_identity_verified boolean,
  p_skill_verified boolean,
  p_background_checked boolean
)
returns public.technician_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.technician_profiles;
begin
  if not private.is_platform_staff() then
    raise exception using
      errcode = 'P0001',
      message = 'not_authorised',
      detail  = 'only platform staff record verification outcomes';
  end if;

  update public.technician_profiles
     set identity_verified  = coalesce(p_identity_verified, identity_verified),
         skill_verified     = coalesce(p_skill_verified, skill_verified),
         background_checked = coalesce(p_background_checked, background_checked)
   where id = p_technician_id
  returning * into v_profile;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'technician_not_found',
      detail  = format('no technician profile %s', p_technician_id);
  end if;

  return v_profile;
end;
$$;

revoke execute on function private.verify_technician(uuid, boolean, boolean, boolean) from public, anon;
grant execute on function private.verify_technician(uuid, boolean, boolean, boolean) to authenticated, service_role;

create or replace function public.verify_technician(
  p_technician_id uuid,
  p_identity_verified boolean default null,
  p_skill_verified boolean default null,
  p_background_checked boolean default null
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
  return private.verify_technician(p_technician_id, p_identity_verified, p_skill_verified, p_background_checked);
end;
$$;

revoke execute on function public.verify_technician(uuid, boolean, boolean, boolean) from public, anon;
grant execute on function public.verify_technician(uuid, boolean, boolean, boolean) to authenticated;

-- 3. technician_locations: no request_id rewrites ------------------------------
--
-- 20260913000010 granted table-level UPDATE, so a technician could set
-- request_id to a request they were never assigned (reproduced against a
-- pending request). request_id is owned by sync_technician_location_request;
-- direct streaming keeps only the telemetry columns. INSERT is done by the
-- security-definer RPCs (register_technician_profile,
-- report_technician_location), so the self-insert grant goes too.

drop policy if exists technician_locations_insert_self on public.technician_locations;
revoke insert, update on public.technician_locations from authenticated;
grant update (location, heading, speed, updated_at) on public.technician_locations to authenticated;

-- 4. requests: client INSERT cannot impersonate or set its own price -----------
--
-- requests_insert_client used `client_id = auth.uid() OR user_id = auth.uid()`,
-- so a client could file a request under another user's client_id by setting
-- only user_id to themselves. sync_request_address_fields (BEFORE INSERT) has
-- already harmonised the pair when WITH CHECK runs, so both must match.

drop policy if exists requests_insert_client on public.requests;
create policy requests_insert_client
  on public.requests for insert to authenticated
  with check (
    client_id = (select auth.uid())
    and user_id = (select auth.uid())
  );

-- estimated_total was taken verbatim from the client (reproduced at ₹1.00).
-- RULES_AND_LOGIC §3.1 prices an SOS as (sos_base_price + sos_emergency_fee)
-- × surge × (1 + tax); surge_pricing_rules and a tax-rate config do not exist
-- yet, so the server pins the catalogue part — the same figure the client
-- already sends — and the surge snapshot to 1.00. Scheduled requests use the
-- offering price (§3.2, platform fee pending config). Only end-user API
-- callers are repriced — PostgREST runs them under `SET LOCAL ROLE
-- authenticated`. Seed scripts, migrations and service_role keep their
-- explicit values; auth.uid() is not the discriminator, since a JWT claim can
-- be set on a trusted session too.

create or replace function private.price_request_from_catalogue()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_price numeric(10, 2);
begin
  if current_setting('role', true) is distinct from 'authenticated' then
    return new;
  end if;

  if new.offering_id is not null then
    select o.price into v_price
      from public.service_offerings o
     where o.id = new.offering_id
       and o.category_id = new.category_id;
  else
    select coalesce(c.sos_base_price, 0) + coalesce(c.sos_emergency_fee, 0) into v_price
      from public.service_categories c
     where c.id = new.category_id;
  end if;

  if v_price is null then
    raise exception using
      errcode = 'P0001',
      message = 'unpriced_request',
      detail  = 'category/offering has no catalogue price';
  end if;

  new.estimated_total := v_price;
  new.surge_multiplier_applied := 1.00;
  return new;
end;
$$;

drop trigger if exists price_request_from_catalogue on public.requests;
create trigger price_request_from_catalogue
  before insert on public.requests
  for each row execute function private.price_request_from_catalogue();

-- 5. Evidence upload: request_attachments + sos-media INSERT -------------------
--
-- DATABASE §12: client INSERT self (`pre_work`). The bucket and table only had
-- SELECT policies, so no client could ever upload. Storage policy follows §13's
-- path convention ({request_id}/{uuid}.{ext}), mirroring the existing
-- sos_media_select_visible_request lookup. Technician `post_work` upload is not
-- part of this client-side fix.

revoke insert, update, delete on public.request_attachments from authenticated;
grant insert (request_id, kind, phase, storage_path, file_name, uploaded_by)
  on public.request_attachments to authenticated;

drop policy if exists request_attachments_insert_client_pre_work on public.request_attachments;
create policy request_attachments_insert_client_pre_work
  on public.request_attachments for insert to authenticated
  with check (
    phase = 'pre_work'
    and uploaded_by = (select auth.uid())
    and exists (
      select 1 from public.requests r
       where r.id = request_attachments.request_id
         and r.client_id = (select auth.uid())
    )
  );

drop policy if exists sos_media_insert_client_request on storage.objects;
create policy sos_media_insert_client_request
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'sos-media'
    and exists (
      select 1 from public.requests r
       where r.id::text = (storage.foldername(name))[1]
         and r.client_id = (select auth.uid())
    )
  );

-- 6. notifications (DATABASE §3 enum, §5 table, §8 index, §12 matrix) ----------
--
-- Guarded throughout: 20260913000008–12 were found applied out-of-band on a
-- local database, and a bare CREATE is what made that state unrecoverable.

do $$
begin
  create type public.notification_type as enum (
    'status_update', 'eta_update', 'arrival', 'approval_request', 'invoice_ready', 'booking_confirmed'
  );
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  request_id uuid references public.requests (id) on delete cascade,
  type       public.notification_type not null,
  title      text not null,
  icon       text,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_unread_idx on public.notifications (user_id) where not is_read;
create index if not exists notifications_request_idx on public.notifications (request_id);

alter table public.notifications enable row level security;

-- ⁴ INSERT revoked; system-generated only. Participants may read, mark read and
-- dismiss their own rows.
revoke all on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant update (is_read) on public.notifications to authenticated;

-- One SELECT policy (self OR staff) rather than two permissive ones, so the
-- planner evaluates a single predicate (advisor 0006).
drop policy if exists notifications_select_self on public.notifications;
drop policy if exists notifications_select_staff on public.notifications;
drop policy if exists notifications_select_self_or_staff on public.notifications;
create policy notifications_select_self_or_staff
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()) or private.is_platform_staff());

drop policy if exists notifications_update_self on public.notifications;
create policy notifications_update_self
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists notifications_delete_self on public.notifications;
create policy notifications_delete_self
  on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

-- Every lifecycle transition is already written to request_status_events by
-- log_request_status_event, from every path (RPCs, settlement, system). Fan out
-- from there so no caller can forget to notify.
create or replace function private.notify_client_on_status_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client_id uuid;
  v_type      public.notification_type;
  v_title     text;
  v_icon      text;
begin
  select r.client_id into v_client_id from public.requests r where r.id = new.request_id;
  if v_client_id is null then
    return new;
  end if;

  case new.status
    when 'accepted'    then v_type := 'status_update'; v_title := 'A technician has accepted your request';     v_icon := '👨‍🔧';
    when 'en_route'    then v_type := 'eta_update';    v_title := 'Your technician is on the way';              v_icon := '🚗';
    when 'arrived'     then v_type := 'arrival';       v_title := 'Your technician has arrived';                v_icon := '📍';
    when 'in_progress' then v_type := 'status_update'; v_title := 'Work on your request has started';           v_icon := '⚡';
    when 'completed'   then v_type := 'invoice_ready'; v_title := 'Service completed — your invoice is ready';  v_icon := '🧾';
    when 'cancelled'   then v_type := 'status_update'; v_title := 'Your request was cancelled';                 v_icon := '❌';
    when 'declined'    then v_type := 'status_update'; v_title := 'Your technician withdrew — finding another'; v_icon := '🔄';
    when 'unfulfilled' then v_type := 'status_update'; v_title := 'No technician was available nearby';         v_icon := '⚠️';
    else return new; -- pending: the client just created it
  end case;

  insert into public.notifications (user_id, request_id, type, title, icon)
  values (v_client_id, new.request_id, v_type, v_title, v_icon);

  return new;
end;
$$;

drop trigger if exists notify_client_on_status_event on public.request_status_events;
create trigger notify_client_on_status_event
  after insert on public.request_status_events
  for each row execute function private.notify_client_on_status_event();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;

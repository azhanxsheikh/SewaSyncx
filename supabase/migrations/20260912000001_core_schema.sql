-- =============================================================================
-- SewaSync — core schema
--
-- Request spine, the two concurrency invariants, and the lifecycle RPCs.
-- Design authority: docs/DATABASE.md, docs/WORKFLOWS.md, docs/RULES_AND_LOGIC.md.
--
-- In scope: identity, catalogue, client addressing, requests + status events,
-- cost additions, invoices, payments, reviews, disputes; accept_request() and
-- advance_request_status(); RLS enabled deny-by-default (policies follow).
--
-- Deferred to later migrations: RLS policies and column-level revokes
-- (DATABASE §9.3), platform_staff and governance tables, invoice_line_items and
-- invoice generation, settle_job_payment(), dispute RPCs, rating sync, location
-- tables, telemetry outbox, storage, realtime publication, pg_cron, seed data.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Extensions
-- -----------------------------------------------------------------------------

create extension if not exists postgis with schema extensions;
-- Supplies the uuid equality operator class used inside the GiST exclusion
-- constraint on requests. The concurrency invariant depends on it.
create extension if not exists btree_gist with schema extensions;
-- gen_random_uuid() is built into PostgreSQL 13+; kept for parity with the spec.
create extension if not exists pgcrypto with schema extensions;


-- -----------------------------------------------------------------------------
-- 2. Enumerated types (DATABASE §3 — only those used by this migration)
-- -----------------------------------------------------------------------------

create type public.user_role as enum ('client', 'technician');

-- Nine states: the eight-state happy path plus `unfulfilled` (WORKFLOWS §1.1).
create type public.request_status as enum (
  'pending',
  'accepted',
  'en_route',
  'arrived',
  'in_progress',
  'completed',
  'cancelled',
  'declined',
  'unfulfilled'
);

create type public.request_priority as enum ('low', 'medium', 'high');

create type public.status_event_reason as enum (
  'client_initiated',
  'technician_honest',
  'technician_ghosted',
  'system_timeout',
  'admin_override'
);

create type public.actor_role as enum ('client', 'technician', 'system', 'admin');

create type public.liability_tier as enum ('tier_1', 'tier_2', 'tier_3');

create type public.price_adjustment_reason as enum (
  'additional_parts',
  'additional_labor_time',
  'access_difficulty',
  'misdiagnosis_correction',
  'customer_requested_scope_change',
  'other'
);

create type public.cost_addition_status as enum ('pending', 'approved', 'declined');

create type public.payment_method as enum ('upi', 'card', 'netbanking', 'cash');

create type public.payment_status as enum ('pending', 'processing', 'succeeded', 'failed');

create type public.dispute_reason as enum (
  'price_dispute',
  'quality_issue',
  'no_show',
  'safety_concern',
  'harassment',
  'property_damage',
  'other'
);

create type public.dispute_status as enum (
  'open',
  'under_review',
  'awaiting_response',
  'resolved_client_favor',
  'resolved_technician_favor',
  'resolved_split',
  'dismissed'
);

create type public.liability_party as enum ('client', 'technician', 'platform', 'split');


-- -----------------------------------------------------------------------------
-- 3. Pure helper functions (needed by table definitions)
-- -----------------------------------------------------------------------------

-- The canonical transition matrix (WORKFLOWS §1.2), actor-independent.
-- Single source of truth for both the status guard trigger and the RPCs.
-- Terminal states have no outgoing edges.
create function public.request_transition_allowed(
  p_from public.request_status,
  p_to public.request_status
)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case p_from
    when 'pending'     then p_to in ('accepted', 'cancelled', 'unfulfilled')
    when 'accepted'    then p_to in ('en_route', 'cancelled', 'declined')
    when 'en_route'    then p_to in ('arrived', 'cancelled')
    when 'arrived'     then p_to = 'in_progress'
    when 'in_progress' then p_to = 'completed'
    else false
  end;
$$;

-- Derives a request's execution window (DATABASE §9.1):
--   scheduled  → [scheduled_at, scheduled_at + duration)
--   emergency  → [accepted_at, ∞)   deliberately unbounded while non-terminal
--   unaccepted emergency → NULL      (occupies no calendar)
--
-- Declared IMMUTABLE so it can back a generated column. `timestamptz + interval`
-- is only STABLE because day/month arithmetic depends on the session time zone;
-- this function adds whole minutes only, which is time-zone independent, so the
-- IMMUTABLE marking is truthful.
create function public.request_execution_window(
  p_scheduled_at timestamptz,
  p_duration_minutes integer,
  p_accepted_at timestamptz
)
returns tstzrange
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when p_scheduled_at is not null then
      tstzrange(p_scheduled_at, p_scheduled_at + make_interval(mins => p_duration_minutes), '[)')
    when p_accepted_at is not null then
      tstzrange(p_accepted_at, null, '[)')
  end;
$$;


-- -----------------------------------------------------------------------------
-- 4. Identity and catalogue
-- -----------------------------------------------------------------------------

create table public.users (
  id                     uuid primary key references auth.users (id) on delete cascade,
  role                   public.user_role not null default 'client',
  name                   text not null,
  phone                  text unique,
  email                  text unique,
  preferred_language     text,
  default_location       extensions.geography(point, 4326),
  default_street_address text,
  default_unit_floor     text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint users_phone_e164 check (phone ~ '^\+[1-9][0-9]{7,14}$')
);

create table public.service_categories (
  id                       uuid primary key default gen_random_uuid(),
  slug                     text not null unique,
  name                     text not null,
  icon                     text not null,
  description              text,
  supports_sos             boolean not null default true,
  supports_scheduled       boolean not null default true,
  sos_base_price           numeric(10, 2) check (sos_base_price >= 0),
  sos_emergency_fee        numeric(10, 2) check (sos_emergency_fee >= 0),
  default_duration_minutes integer check (default_duration_minutes > 0),
  liability_tier           public.liability_tier not null default 'tier_1',
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint sos_pricing_required check (
    not supports_sos or (sos_base_price is not null and sos_emergency_fee is not null)
  )
);

create table public.service_offerings (
  id                   uuid primary key default gen_random_uuid(),
  category_id          uuid not null references public.service_categories (id) on delete cascade,
  name                 text not null,
  description          text,
  price                numeric(10, 2) not null check (price >= 0),
  duration_min_minutes integer check (duration_min_minutes > 0),
  duration_max_minutes integer,
  sort_order           integer not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint duration_range_ordered check (
    duration_max_minutes is null
    or duration_min_minutes is null
    or duration_max_minutes >= duration_min_minutes
  )
);

create table public.technician_profiles (
  id                   uuid primary key references public.users (id) on delete cascade,
  vehicle_type         text,
  vehicle_registration text,
  experience_years     numeric(4, 1) check (experience_years >= 0),
  identity_verified    boolean not null default false,
  skill_verified       boolean not null default false,
  background_checked   boolean not null default false,
  -- Bayesian-adjusted, system-maintained (RULES §4).
  rating               numeric(2, 1) not null default 0 check (rating between 0 and 5),
  review_count         integer not null default 0,
  total_jobs           integer not null default 0,
  is_online            boolean not null default false,
  photo_url            text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Capability registration. Capped at three rows per technician by the
-- enforce_category_cap constraint trigger (§8) — a CHECK cannot count siblings.
create table public.technician_categories (
  technician_id uuid not null references public.technician_profiles (id) on delete cascade,
  category_id   uuid not null references public.service_categories (id) on delete cascade,
  registered_at timestamptz not null default now(),
  primary key (technician_id, category_id)
);


-- -----------------------------------------------------------------------------
-- 5. Client addressing and delegation
-- -----------------------------------------------------------------------------

create table public.saved_addresses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users (id) on delete cascade,
  label        text not null,
  icon         text,
  address_line text not null,
  area         text not null,
  location     extensions.geography(point, 4326),
  is_default   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.family_members (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.users (id) on delete cascade,
  name         text not null,
  relation     text not null,
  phone        text,
  emoji        text,
  address_line text not null,
  area         text not null,
  location     extensions.geography(point, 4326),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint family_members_phone_e164 check (phone ~ '^\+[1-9][0-9]{7,14}$')
);


-- -----------------------------------------------------------------------------
-- 6. The request spine
-- -----------------------------------------------------------------------------

create table public.requests (
  id                              uuid primary key default gen_random_uuid(),
  client_id                       uuid not null references public.users (id) on delete restrict,
  family_member_id                uuid references public.family_members (id) on delete set null,
  saved_address_id                uuid references public.saved_addresses (id) on delete set null,
  -- RPC-only write.
  technician_id                   uuid references public.users (id) on delete set null,
  category_id                     uuid not null references public.service_categories (id) on delete restrict,
  offering_id                     uuid references public.service_offerings (id) on delete restrict,
  -- RPC-only write.
  status                          public.request_status not null default 'pending',
  priority                        public.request_priority,
  service_location                extensions.geography(point, 4326) not null,
  address_line                    text not null,
  area                            text not null,
  -- Snapshots, populated by snapshot_request_contact.
  contact_name                    text not null,
  contact_phone                   text not null,
  technician_location_at_dispatch extensions.geography(point, 4326),
  description                     text,
  symptoms                        text[] not null default '{}',
  estimated_total                 numeric(10, 2) not null check (estimated_total >= 0),
  surge_multiplier_applied        numeric(4, 2) not null default 1.00 check (surge_multiplier_applied >= 1.00),
  final_price                     numeric(10, 2) check (final_price >= 0),
  price_adjustment_reason         public.price_adjustment_reason,
  price_adjustment_notes          text,
  estimated_duration_minutes      integer check (estimated_duration_minutes > 0),
  scheduled_at                    timestamptz,
  accepted_at                     timestamptz,
  completed_at                    timestamptz,
  search_radius_km                integer not null default 10 check (search_radius_km between 10 and 30),
  radius_expanded_at              timestamptz,
  superseded_from_request_id      uuid references public.requests (id) on delete set null,
  execution_window                tstzrange generated always as (
    public.request_execution_window(scheduled_at, estimated_duration_minutes, accepted_at)
  ) stored,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now(),

  constraint emergency_requires_priority check (scheduled_at is not null or priority is not null),
  constraint offering_only_for_scheduled check (offering_id is null or scheduled_at is not null),
  constraint beneficiary_xor_saved_address check (
    not (family_member_id is not null and saved_address_id is not null)
  ),
  constraint variance_requires_reason check (
    final_price is null or final_price <= estimated_total or price_adjustment_reason is not null
  ),
  constraint other_reason_requires_notes check (
    price_adjustment_reason is distinct from 'other' or price_adjustment_notes is not null
  ),
  -- Not in DATABASE §5.4. Without it a scheduled row with a NULL duration would
  -- derive an unbounded window and silently block the technician's calendar.
  constraint scheduled_requires_duration check (
    scheduled_at is null or estimated_duration_minutes is not null
  ),
  constraint requests_contact_phone_e164 check (contact_phone ~ '^\+[1-9][0-9]{7,14}$')
);

-- Append-only audit, trigger-written (no participant INSERT path).
create table public.request_status_events (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.requests (id) on delete cascade,
  status      public.request_status not null,
  actor_id    uuid,
  actor_role  public.actor_role not null,
  reason      public.status_event_reason,
  occurred_at timestamptz not null default now()
);

-- The approval gate for every upward price variance.
create table public.request_cost_additions (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.requests (id) on delete cascade,
  reason      text not null,
  tags        text[] not null default '{}',
  amount      numeric(10, 2) not null check (amount > 0),
  status      public.cost_addition_status not null default 'pending',
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);


-- -----------------------------------------------------------------------------
-- 7. Financial, reputation and mediation
-- -----------------------------------------------------------------------------

create table public.invoices (
  id                      uuid primary key default gen_random_uuid(),
  request_id              uuid not null unique references public.requests (id) on delete restrict,
  invoice_number          text not null unique,
  subtotal                numeric(10, 2) not null,
  tax                     numeric(10, 2) not null,
  total                   numeric(10, 2) not null,
  -- Snapshotted so past invoices stay reproducible.
  commission_rate_applied numeric(5, 2) not null,
  issued_at               timestamptz not null default now()
);

create table public.payments (
  id                 uuid primary key default gen_random_uuid(),
  request_id         uuid not null references public.requests (id) on delete restrict,
  method             public.payment_method not null,
  status             public.payment_status not null default 'pending',
  amount             numeric(10, 2) not null,
  upi_id             text,
  provider_reference text,
  paid_at            timestamptz,
  created_at         timestamptz not null default now()
);

create table public.reviews (
  id            uuid primary key default gen_random_uuid(),
  -- UNIQUE is the one-review-per-job enforcement.
  request_id    uuid not null unique references public.requests (id) on delete restrict,
  client_id     uuid not null references public.users (id) on delete restrict,
  technician_id uuid not null references public.users (id) on delete restrict,
  rating        smallint not null check (rating between 1 and 5),
  tags          text[] not null default '{}',
  review_text   text,
  tip_amount    numeric(10, 2) not null default 0 check (tip_amount >= 0),
  created_at    timestamptz not null default now()
);

-- `assigned_admin_id` (FK → platform_staff) is added with the governance migration.
create table public.disputes (
  id               uuid primary key default gen_random_uuid(),
  request_id       uuid not null references public.requests (id) on delete restrict,
  initiator_id     uuid not null references public.users (id) on delete restrict,
  initiator_role   public.user_role not null,
  reason_category  public.dispute_reason not null,
  description      text not null,
  status           public.dispute_status not null default 'open',
  liability_amount numeric(10, 2) check (liability_amount >= 0),
  liability_party  public.liability_party,
  created_at       timestamptz not null default now(),
  resolved_at      timestamptz,
  constraint terminal_dispute_requires_liability_party check (
    status in ('open', 'under_review', 'awaiting_response') or liability_party is not null
  )
);


-- -----------------------------------------------------------------------------
-- 8. Concurrency invariants (RULES §1.2, DATABASE §9.1)
-- -----------------------------------------------------------------------------

-- Enforces both guarantees with one mechanism:
--   A. real-time exclusivity — an active emergency's [accepted_at, ∞) window
--      overlaps everything, blocking any second commitment;
--   B. calendar non-overlap — scheduled bookings conflict only when their
--      finite windows intersect.
-- A terminal transition drops the row out of the predicate, freeing the calendar.
alter table public.requests
  add constraint requests_no_overlapping_commitment
  exclude using gist (technician_id with =, execution_window with &&)
  where (status in ('pending', 'accepted', 'en_route', 'arrived', 'in_progress'));

-- Redundant B-tree backstop for guarantee A: at most one active emergency per
-- technician. Scoped to emergencies so it does not forbid a technician holding
-- several non-overlapping scheduled bookings (guarantee B).
create unique index idx_technician_single_active_job
  on public.requests (technician_id)
  where scheduled_at is null
    and status in ('accepted', 'en_route', 'arrived', 'in_progress');

-- Capability cap: maximum three categories per technician.
--
-- Locks the parent profile row before counting so concurrent inserts for the
-- same technician serialise; the count runs as a separate statement and so
-- takes a fresh READ COMMITTED snapshot that sees the winner's committed row.
--
-- Lock mode is FOR NO KEY UPDATE rather than FOR UPDATE: each insert's foreign
-- key check already holds FOR KEY SHARE on the parent, which FOR UPDATE would
-- conflict with — two concurrent inserts would deadlock. NO KEY UPDATE is
-- compatible with KEY SHARE but conflicts with itself, which is exactly the
-- serialisation required.
create function public.enforce_category_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform 1
    from public.technician_profiles
   where id = new.technician_id
     for no key update;

  select count(*)
    into v_count
    from public.technician_categories
   where technician_id = new.technician_id;

  if v_count > 3 then
    raise exception using
      errcode = 'P0001',
      message = 'category_cap_exceeded',
      detail  = format('technician %s would hold %s categories; the maximum is 3', new.technician_id, v_count);
  end if;

  return null;
end;
$$;

create constraint trigger enforce_category_cap
  after insert or update on public.technician_categories
  for each row
  execute function public.enforce_category_cap();


-- -----------------------------------------------------------------------------
-- 9. Indexes (DATABASE §7)
-- -----------------------------------------------------------------------------

-- Dispatch feeds
create index requests_emergency_dispatch_idx
  on public.requests (category_id, created_at desc)
  where status = 'pending' and scheduled_at is null;

create index requests_booking_dispatch_idx
  on public.requests (category_id, scheduled_at)
  where status = 'pending' and scheduled_at is not null;

create index requests_radius_sweep_idx
  on public.requests (radius_expanded_at)
  where status = 'pending' and scheduled_at is null;

-- History and calendar
create index requests_client_history_idx on public.requests (client_id, created_at desc);
create index requests_tech_history_idx on public.requests (technician_id, status, created_at desc);
create index requests_tech_calendar_idx on public.requests (technician_id, scheduled_at);

-- Spatial (analytics / demand density — not the live dispatch path)
create index requests_service_location_idx on public.requests using gist (service_location);

-- ON DELETE SET NULL targets
create index requests_family_member_idx on public.requests (family_member_id) where family_member_id is not null;
create index requests_saved_address_idx on public.requests (saved_address_id) where saved_address_id is not null;

create index status_events_idx on public.request_status_events (request_id, occurred_at);
create index tech_categories_reverse_idx on public.technician_categories (category_id, technician_id);
create index service_offerings_category_idx on public.service_offerings (category_id, sort_order);
create index saved_addresses_user_idx on public.saved_addresses (user_id);
create index family_members_owner_idx on public.family_members (owner_id);
create index cost_additions_request_idx on public.request_cost_additions (request_id, status);
create index payments_request_idx on public.payments (request_id);
create index reviews_technician_idx on public.reviews (technician_id, created_at desc);

create index disputes_inbox_idx
  on public.disputes (status, created_at desc)
  where status in ('open', 'under_review', 'awaiting_response');

-- Partial unique constraints
create unique index saved_addresses_one_default
  on public.saved_addresses (user_id)
  where is_default;

create unique index disputes_one_active_per_request
  on public.disputes (request_id)
  where status in ('open', 'under_review', 'awaiting_response');


-- -----------------------------------------------------------------------------
-- 10. Trigger functions and triggers (DATABASE §9.2)
-- -----------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.service_categories
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.service_offerings
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.technician_profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.saved_addresses
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.family_members
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.requests
  for each row execute function public.set_updated_at();

-- Creates the public profile for every new auth identity.
-- Role is always 'client': signup metadata is caller-controlled and must not be
-- able to self-assign 'technician', which is granted by a verified onboarding flow.
create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text;
begin
  -- GoTrue stores phone numbers without the leading '+'. Normalise to E.164 and
  -- drop anything that still does not conform rather than failing the signup.
  if nullif(new.phone, '') is not null then
    v_phone := '+' || ltrim(new.phone, '+');
    if v_phone !~ '^\+[1-9][0-9]{7,14}$' then
      v_phone := null;
    end if;
  end if;

  insert into public.users (id, name, phone, email)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      v_phone,
      'SewaSync user'
    ),
    v_phone,
    nullif(new.email, '')
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Snapshots contact details onto the request: from the beneficiary for a
-- delegated request, otherwise from the client (WORKFLOWS §4).
create function public.snapshot_request_contact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name  text;
  v_phone text;
begin
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
  else
    select u.name, u.phone
      into v_name, v_phone
      from public.users u
     where u.id = new.client_id;
  end if;

  new.contact_name  := coalesce(v_name, new.contact_name);
  new.contact_phone := coalesce(v_phone, new.contact_phone);
  return new;
end;
$$;

create trigger snapshot_request_contact
  before insert on public.requests
  for each row execute function public.snapshot_request_contact();

-- Lifecycle guard. Applies to every writer, including service_role, so the
-- transition matrix and terminal immutability hold even outside the RPCs.
create function public.guard_request_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'pending' or new.technician_id is not null or new.accepted_at is not null then
      raise exception using
        errcode = 'P0001',
        message = 'invalid_initial_state',
        detail  = 'requests are created pending and unassigned; assignment is via accept_request()';
    end if;
    return new;
  end if;

  if not public.request_transition_allowed(old.status, new.status) then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_transition',
      detail  = format('%s -> %s is not a permitted transition', old.status, new.status);
  end if;

  if new.status = 'completed' then
    new.completed_at := coalesce(new.completed_at, now());
  end if;

  return new;
end;
$$;

create trigger guard_request_status_insert
  before insert on public.requests
  for each row execute function public.guard_request_status();

create trigger guard_request_status_update
  before update of status on public.requests
  for each row
  when (old.status is distinct from new.status)
  execute function public.guard_request_status();

-- Appends the audit event. Actor and reason are read from transaction-local
-- settings written by the RPCs; a write that bypasses them is attributed to
-- 'system'.
create function public.log_request_status_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_role public.actor_role;
  v_actor_id   uuid;
  v_reason     public.status_event_reason;
begin
  if tg_op = 'INSERT' then
    v_actor_role := 'client';
    v_actor_id   := new.client_id;
  else
    v_actor_role := coalesce(nullif(current_setting('sewasync.actor_role', true), ''), 'system')::public.actor_role;
    v_actor_id   := nullif(current_setting('sewasync.actor_id', true), '')::uuid;
    v_reason     := nullif(current_setting('sewasync.status_reason', true), '')::public.status_event_reason;
  end if;

  insert into public.request_status_events (request_id, status, actor_id, actor_role, reason)
  values (new.id, new.status, v_actor_id, v_actor_role, v_reason);

  if tg_op = 'UPDATE' and new.status = 'completed' and new.technician_id is not null then
    update public.technician_profiles
       set total_jobs = total_jobs + 1
     where id = new.technician_id;
  end if;

  return null;
end;
$$;

create trigger log_request_status_event_insert
  after insert on public.requests
  for each row execute function public.log_request_status_event();

create trigger log_request_status_event_update
  after update of status on public.requests
  for each row
  when (old.status is distinct from new.status)
  execute function public.log_request_status_event();


-- -----------------------------------------------------------------------------
-- 11. RPCs (DATABASE §11)
--
-- Errors are raised with SQLSTATE P0001 and MESSAGE set to the taxonomy key
-- from WORKFLOWS §7, so clients can branch on `error.message`.
-- -----------------------------------------------------------------------------

-- Atomic acceptance (WORKFLOWS §7).
--
-- p_technician_id must equal the authenticated caller; only service_role may
-- assign on another technician's behalf. Without this check any authenticated
-- user could claim jobs for an arbitrary technician through this definer function.
--
-- Deferred gates, added by CREATE OR REPLACE once their tables exist:
-- ineligible_throttled, ineligible_uninsured, ineligible_tooling, and the
-- technician_location_at_dispatch snapshot.
create function public.accept_request(p_request_id uuid, p_technician_id uuid)
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

-- Lifecycle progression after acceptance (WORKFLOWS §1.2).
--
-- Actor-aware on top of the canonical matrix:
--   technician (assigned) — accepted→en_route→arrived→in_progress→completed,
--                           accepted→declined, accepted|en_route→cancelled
--   client                — pending|accepted|en_route→cancelled
--   system (service_role) — pending→unfulfilled, accepted|en_route→cancelled
-- pending→accepted is reachable only through accept_request().
create function public.advance_request_status(p_request_id uuid, p_next_status public.request_status)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := auth.uid();
  v_request   public.requests;
  v_actor     public.actor_role;
  v_permitted boolean;
  v_reason    public.status_event_reason;
begin
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

  if coalesce(auth.role(), '') = 'service_role' then
    v_actor := 'system';
  elsif v_uid is not null and v_uid = v_request.technician_id then
    v_actor := 'technician';
  elsif v_uid is not null and v_uid = v_request.client_id then
    v_actor := 'client';
  else
    raise exception using
      errcode = 'P0001',
      message = 'not_a_participant',
      detail  = format('caller is not a participant in request %s', p_request_id);
  end if;

  if p_next_status is null
     or p_next_status = 'accepted'
     or not public.request_transition_allowed(v_request.status, p_next_status) then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_transition',
      detail  = format('%s -> %s is not a permitted transition', v_request.status, p_next_status);
  end if;

  v_permitted := case v_actor
    when 'technician' then p_next_status in ('en_route', 'arrived', 'in_progress', 'completed', 'declined', 'cancelled')
    when 'client'     then p_next_status = 'cancelled'
    when 'system'     then p_next_status = 'unfulfilled'
                        or (p_next_status = 'cancelled' and v_request.status in ('accepted', 'en_route'))
    else false
  end;

  if not v_permitted then
    if v_actor = 'client' and p_next_status in ('en_route', 'arrived', 'in_progress', 'completed', 'declined') then
      raise exception using
        errcode = 'P0001',
        message = 'not_assigned_technician',
        detail  = format('only the assigned technician may move request %s to %s', p_request_id, p_next_status);
    end if;
    raise exception using
      errcode = 'P0001',
      message = 'invalid_transition',
      detail  = format('%s may not move request %s from %s to %s', v_actor, p_request_id, v_request.status, p_next_status);
  end if;

  -- Price-variance invariant: no completion while a cost addition awaits the client.
  if p_next_status = 'completed' and exists (
    select 1
      from public.request_cost_additions rca
     where rca.request_id = p_request_id
       and rca.status = 'pending'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'unsettled_cost_addition',
      detail  = format('request %s has a cost addition awaiting client approval', p_request_id);
  end if;

  if p_next_status in ('cancelled', 'declined', 'unfulfilled') then
    v_reason := case v_actor
      when 'client'     then 'client_initiated'::public.status_event_reason
      when 'technician' then 'technician_honest'::public.status_event_reason
      else 'system_timeout'::public.status_event_reason
    end;
  end if;

  perform set_config('sewasync.actor_role', v_actor::text, true);
  perform set_config('sewasync.actor_id', case when v_actor = 'system' then '' else v_uid::text end, true);
  perform set_config('sewasync.status_reason', coalesce(v_reason::text, ''), true);

  update public.requests
     set status = p_next_status
   where id = p_request_id
  returning * into v_request;

  perform set_config('sewasync.actor_role', '', true);
  perform set_config('sewasync.actor_id', '', true);
  perform set_config('sewasync.status_reason', '', true);

  return v_request;
end;
$$;

revoke execute on function public.accept_request(uuid, uuid) from public, anon;
grant execute on function public.accept_request(uuid, uuid) to authenticated, service_role;

revoke execute on function public.advance_request_status(uuid, public.request_status) from public, anon;
grant execute on function public.advance_request_status(uuid, public.request_status) to authenticated, service_role;


-- -----------------------------------------------------------------------------
-- 12. Row-Level Security — enabled, deny-by-default
--
-- No policies are defined here: anon and authenticated can neither read nor
-- write any table until the policy migration (DATABASE §12) lands. The
-- SECURITY DEFINER RPCs and triggers above are unaffected.
-- -----------------------------------------------------------------------------

alter table public.users                  enable row level security;
alter table public.service_categories     enable row level security;
alter table public.service_offerings      enable row level security;
alter table public.technician_profiles    enable row level security;
alter table public.technician_categories  enable row level security;
alter table public.saved_addresses        enable row level security;
alter table public.family_members         enable row level security;
alter table public.requests               enable row level security;
alter table public.request_status_events  enable row level security;
alter table public.request_cost_additions enable row level security;
alter table public.invoices               enable row level security;
alter table public.payments               enable row level security;
alter table public.reviews                enable row level security;
alter table public.disputes               enable row level security;

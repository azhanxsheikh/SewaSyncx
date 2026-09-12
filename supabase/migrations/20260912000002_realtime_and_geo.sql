-- =============================================================================
-- SewaSync — realtime publication and geospatial technician matching
--
-- Design authority: docs/DATABASE.md §5.5, §7.2, §10; docs/WORKFLOWS.md §6.1;
-- docs/ARCHITECTURE.md §7.
--
-- Adds the current-position cache (technician_locations), the realtime
-- publication set, and get_nearby_matching_technicians() — the phase-1
-- eligibility filter for dispatch.
--
-- Spatial index on requests: requests.service_location already carries the
-- GiST index requests_service_location_idx (20260912000001), so no second
-- index is created here.
--
-- Deferred: technician_location_pings (trajectory history), RLS policies,
-- chat_messages publication, the throttle/tooling/insurance gates, dismissals,
-- and capturing technician_location_at_dispatch inside accept_request().
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Current-position cache (DATABASE §5.5)
--
-- Exactly one row per technician, upserted on each position report. Serves
-- proximity search and live tracking only; trajectory history belongs in
-- technician_location_pings.
-- -----------------------------------------------------------------------------

create table public.technician_locations (
  id            uuid primary key default gen_random_uuid(),
  technician_id uuid not null unique references public.users (id) on delete cascade,
  request_id    uuid references public.requests (id) on delete set null,
  location      extensions.geography(point, 4326) not null,
  heading       double precision,
  speed         double precision,
  updated_at    timestamptz not null default now()
);

-- Dispatch hot path: the most frequently probed spatial index (NFR-PERF-002).
create index idx_technicians_last_geo
  on public.technician_locations using gist (location);

create index technician_locations_request_idx
  on public.technician_locations (request_id)
  where request_id is not null;

-- Keeps updated_at truthful on upsert; position freshness is read from it.
create trigger set_updated_at before update on public.technician_locations
  for each row execute function public.set_updated_at();

-- Upsert-heavy table: vacuum well before the 20% cluster default (DATABASE §8).
alter table public.technician_locations set (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.05
);

-- Deny-by-default until the policy migration (DATABASE §12).
alter table public.technician_locations enable row level security;


-- -----------------------------------------------------------------------------
-- 2. Realtime publication (DATABASE §10, ARCHITECTURE §7)
--
-- Delivery is gated by each table's SELECT policy, so with RLS enabled and no
-- policies yet, authenticated subscribers receive nothing until the policy
-- migration lands. chat_messages joins the set when that table is created.
--
-- Guarded so the migration does not fail against a project where a table was
-- already added to the publication (e.g. through the dashboard).
-- -----------------------------------------------------------------------------

do $$
declare
  v_table text;
begin
  foreach v_table in array array['requests', 'request_cost_additions', 'technician_locations'] loop
    if not exists (
      select 1
        from pg_catalog.pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = v_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
end;
$$;


-- -----------------------------------------------------------------------------
-- 3. get_nearby_matching_technicians (WORKFLOWS §6.1, phase 1)
--
-- Returns the technicians who pass every hard eligibility gate that can be
-- evaluated today, nearest first:
--   category match   — technician_categories holds the request's category
--                      (the 3-category cap is enforced at registration)
--   availability     — is_online, and a position report within 90 seconds
--   calendar         — no non-terminal commitment whose execution_window
--                      overlaps the window this request would occupy
--   proximity        — ST_DWithin over the GiST-indexed position cache
--
-- Ranking (RULES §7) is phase 2 and is not applied here. Throttle, tooling,
-- insurance and exploration gates are added by CREATE OR REPLACE once their
-- tables exist.
--
-- p_radius_meters: 1–30000 (dispatch_radius_max_km); NULL uses the request's
-- current search_radius_km.
--
-- Exposes technician positions, so it is callable by service_role only.
-- -----------------------------------------------------------------------------

create function public.get_nearby_matching_technicians(
  p_request_id uuid,
  p_radius_meters double precision
)
returns table (
  technician_id       uuid,
  distance_meters     double precision,
  rating              numeric,
  review_count        integer,
  total_jobs          integer,
  location_updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  -- Several missed ~15 s stationary heartbeats (WORKFLOWS §8); mirrors the
  -- ~90 s TTL of the hot proximity cache (ARCHITECTURE §8).
  c_max_location_age constant interval := interval '90 seconds';
  v_request   public.requests;
  v_radius    double precision;
  v_window    tstzrange;
begin
  select *
    into v_request
    from public.requests r
   where r.id = p_request_id;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'request_not_found',
      detail  = format('request %s does not exist', p_request_id);
  end if;

  if v_request.status <> 'pending' or v_request.technician_id is not null then
    raise exception using
      errcode = 'P0001',
      message = 'request_not_pending',
      detail  = format('request %s is %s; only pending, unassigned requests are matched', p_request_id, v_request.status);
  end if;

  v_radius := coalesce(p_radius_meters, v_request.search_radius_km * 1000.0);

  if v_radius is null or v_radius <= 0 or v_radius > 30000 then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_radius',
      detail  = format('radius must be greater than 0 and at most 30000 metres; got %s', v_radius);
  end if;

  -- (NaN and Infinity compare greater than any finite value, so both fail above.)

  -- The window the request would occupy if accepted now — the same derivation
  -- accept_request() triggers: [scheduled_at, +duration) or [now(), ∞).
  v_window := public.request_execution_window(
    v_request.scheduled_at,
    v_request.estimated_duration_minutes,
    now()
  );

  return query
    select tl.technician_id,
           extensions.st_distance(tl.location, v_request.service_location) as distance_meters,
           tp.rating,
           tp.review_count,
           tp.total_jobs,
           tl.updated_at
      from public.technician_locations tl
      join public.technician_profiles tp on tp.id = tl.technician_id
      join public.users u on u.id = tl.technician_id
     where extensions.st_dwithin(tl.location, v_request.service_location, v_radius)
       and tl.updated_at >= now() - c_max_location_age
       and tp.is_online
       and u.role = 'technician'
       and tl.technician_id <> v_request.client_id
       and exists (
             select 1
               from public.technician_categories tc
              where tc.technician_id = tl.technician_id
                and tc.category_id = v_request.category_id
           )
       and not exists (
             select 1
               from public.requests c
              where c.technician_id = tl.technician_id
                and c.status in ('accepted', 'en_route', 'arrived', 'in_progress')
                and c.execution_window && v_window
           )
     order by 2, 1;
end;
$$;

revoke execute on function public.get_nearby_matching_technicians(uuid, double precision) from public, anon, authenticated;
grant execute on function public.get_nearby_matching_technicians(uuid, double precision) to service_role;

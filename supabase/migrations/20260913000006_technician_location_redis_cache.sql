-- =============================================================================
-- SewaSync — cache technician positions in Redis via report_technician_location
--
-- Task 5: Postgres can't call ioredis directly, and there's no server process
-- between the browser and Postgres for a Redis write to happen in (the client
-- calls this RPC straight through PostgREST). pg_net's async http_post bridges
-- that gap: a fire-and-forget internal call to a new Edge Function
-- (supabase/functions/cache-technician-location) that does the actual
-- SETEX ... EX 90. See that function's header comment for the local-dev
-- auth trade-off (no JWT check — it's unreachable except from containers on
-- supabase_network_SewaSyncx, which Kong-facing clients are not).
--
-- pg_net is fire-and-forget by design: a Redis outage never blocks or fails
-- position reporting. public.technician_locations (written just above, in
-- the same function, unchanged) remains the source of truth; Redis is purely
-- an accelerator, matching src/lib/redis.ts's own framing.
-- =============================================================================

create extension if not exists pg_net with schema extensions;

create or replace function private.report_technician_location(
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

  -- Best-effort cache refresh. "edge_runtime" is the container's network
  -- alias on supabase_network_SewaSyncx (docker inspect), reachable only from
  -- containers on that network — never from PostgREST/Kong callers.
  begin
    perform net.http_post(
      url := 'http://edge_runtime:8081/cache-technician-location',
      body := jsonb_build_object('technician_id', v_uid, 'lat', p_lat, 'lng', p_lng)
    );
  exception when others then
    -- pg_net itself (as opposed to the HTTP call it schedules) failing must
    -- not fail a position report; log and move on.
    raise warning 'report_technician_location: pg_net dispatch failed: %', sqlerrm;
  end;

  return v_row;
end;
$$;

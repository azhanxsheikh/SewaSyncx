-- =============================================================================
-- SewaSync — restore optional parameters, add trigger-filled column defaults
-- (2026-09-13)
--
-- CI's "Generated types match migrations" step does a literal text diff
-- between a fresh `supabase gen types` and the committed database.ts — it has
-- no tolerance for hand-loosened types, however well-intentioned. Verified
-- against every real caller (FamilySOS.tsx, SOSConfirmation.tsx,
-- ClientSignUpModal.tsx, TechnicianSignUpModal.tsx) before writing this: most
-- of the previous hand-relaxation was unnecessary drift, not a real
-- requirement. Two things were genuinely wrong:
--
-- 1. requests.contact_name / contact_phone are NOT NULL with no default, but
--    both request-creation call sites correctly never set them — they are
--    always overwritten by the BEFORE INSERT trigger
--    snapshot_request_contact from the client's or family member's profile,
--    unconditionally. A column default lets the generator mark them Insert-
--    optional (honest: Row stays required, nothing about the NOT NULL
--    constraint or the trigger's behaviour changes) instead of requiring
--    every caller to fabricate a value that is thrown away.
--
-- 2. 20260913000014 moved register_technician_profile's privileged body into
--    private.register_technician_profile behind a public SECURITY INVOKER
--    wrapper, but the wrapper's signature dropped 20260913000009's
--    `p_lat double precision default null, p_lng double precision default
--    null` — a real regression, not a deliberate tightening. Restored here in
--    the same trailing position (no reordering — Postgres would treat a
--    different type order as a new overload, not a replacement, and
--    TechnicianSignUpModal.tsx's call is by named argument regardless).
--    p_vehicle_registration is left required: it has no default in 000009
--    either, and TechnicianSignUpModal.tsx is fixed instead (a required
--    `string` argument, not `string | null` — the generator never emits
--    `| null` for RPC Args in this CLI version; see settle_job_payment's
--    p_reason/p_notes for the same optional-without-null pattern).
-- =============================================================================

alter table public.requests
  alter column contact_name set default '',
  alter column contact_phone set default '';

-- p_vehicle_registration stays a required string (see above), so the public
-- wrapper is now fed '' rather than null for "not provided". Normalise here,
-- in the one place that writes the column, rather than in every caller —
-- vehicle_registration itself is unchanged (nullable, no format constraint).
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
  v_registration text := nullif(trim(p_vehicle_registration), '');
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;

  update public.users set role = 'technician' where id = v_uid;

  insert into public.technician_profiles (
    id, vehicle_type, vehicle_registration, is_online, identity_verified, skill_verified, background_checked
  )
  values (
    v_uid, p_vehicle_type, v_registration, true, false, false, false
  )
  on conflict (id) do update
    set vehicle_type = excluded.vehicle_type,
        vehicle_registration = excluded.vehicle_registration,
        is_online = excluded.is_online
  returning * into v_profile;

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
  p_lat double precision default null,
  p_lng double precision default null
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

-- =============================================================================
-- 20260913000009_onboarding_and_signup.sql
--
-- Enables authenticated users to complete onboarding:
-- 1. Updates handle_new_auth_user to read raw_user_meta_data for phone and role.
-- 2. Updates complete_profile to support role sync.
-- 3. Grants insert on technician_profiles and technician_locations to authenticated.
-- 4. Exposes atomic register_technician_profile RPC for technician onboarding.
-- =============================================================================

-- 1. Updates handle_new_auth_user --------------------------------------------

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff_role text := nullif(trim(new.raw_user_meta_data ->> 'staff_role'), '');
  v_raw_phone  text := coalesce(nullif(trim(new.phone), ''), nullif(trim(new.raw_user_meta_data ->> 'phone'), ''));
  v_phone      text;
  v_role       public.user_role := 'client';
  v_name       text;
begin
  if v_staff_role is not null then
    begin
      insert into public.platform_staff (id, staff_role, name, email)
      values (
        new.id,
        v_staff_role::public.staff_role,
        coalesce(
          nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
          nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
          nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
          'Staff'
        ),
        nullif(new.email, '')
      );
    exception
      when unique_violation then
        null;
    end;
    return new;
  end if;

  if (new.raw_user_meta_data ->> 'role') = 'technician' then
    v_role := 'technician';
  end if;

  if v_raw_phone is not null then
    v_phone := private.normalize_phone(v_raw_phone);
  end if;

  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'SewaSync user'
  );

  begin
    insert into public.users (id, role, name, phone, email)
    values (
      new.id,
      v_role,
      v_name,
      v_phone,
      nullif(new.email, '')
    )
    on conflict (id) do update
      set name  = excluded.name,
          phone = coalesce(excluded.phone, public.users.phone),
          role  = case
                    when public.users.role = 'client' and excluded.role = 'technician' then 'technician'
                    else public.users.role
                  end;
  exception
    when unique_violation then
      null;
  end;

  return new;
end;
$$;

-- 2. Updates private.complete_profile ----------------------------------------

create or replace function private.complete_profile(p_name text, p_phone text)
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
  v_role       public.user_role := 'client';
  v_user       public.users;
  v_constraint text;
begin
  select nullif(au.email, ''),
         case when (au.raw_user_meta_data ->> 'role') = 'technician' then 'technician'::public.user_role else 'client'::public.user_role end
    into v_email, v_role
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
    insert into public.users (id, role, name, phone, email)
    values (v_uid, v_role, v_name, v_phone, v_email)
    on conflict (id) do update
      set name  = excluded.name,
          phone = excluded.phone,
          role  = case
                    when public.users.role = 'client' and excluded.role = 'technician' then 'technician'
                    else public.users.role
                  end
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

-- 3. RLS Policies for technician onboarding ----------------------------------

-- Allow authenticated technicians to insert their own profile
drop policy if exists technician_profiles_insert_self on public.technician_profiles;
create policy technician_profiles_insert_self
  on public.technician_profiles for insert to authenticated
  with check (id = (select auth.uid()));

grant insert on public.technician_profiles to authenticated;

-- Allow authenticated technicians to insert their own location
drop policy if exists technician_locations_insert_self on public.technician_locations;
create policy technician_locations_insert_self
  on public.technician_locations for insert to authenticated
  with check (technician_id = (select auth.uid()));

grant insert on public.technician_locations to authenticated;

-- 4. Atomic technician onboarding RPC ----------------------------------------

create or replace function public.register_technician_profile(
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
    if array_length(p_category_ids, 1) < 1 or array_length(p_category_ids, 1) > 3 then
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

revoke execute on function public.register_technician_profile(text, text, uuid[], double precision, double precision) from public, anon;
grant execute on function public.register_technician_profile(text, text, uuid[], double precision, double precision) to authenticated;

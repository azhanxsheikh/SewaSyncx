-- =============================================================================
-- SewaSync — sign-up never fails on a missing phone (2026-09-13)
--
-- 20260912000003 made users.phone NOT NULL (UNIQUE, CHECK E.164) and gave
-- handle_new_auth_user a contract: "Sign-up creates the profile only when the
-- identity already carries a valid phone. Email and OAuth identities complete
-- their profile through complete_profile() during onboarding. A sign-up is
-- never failed here." 20260913000009 rewrote the trigger to read role/phone
-- from user metadata and dropped the phone guard, so an email-only sign-up
-- (admin-created user, test harness, OAuth) inserted a NULL phone and GoTrue
-- returned 500 "Database error saving new user".
--
-- A placeholder phone ('' or similar) is not an option: it fails the E.164
-- CHECK, and a shared value would collide on UNIQUE for the second user.
-- The profile is deferred instead — AuthProvider already treats a missing
-- users row as "not onboarded" (maybeSingle), and complete_profile() creates
-- it. Everything 000009 added (staff sign-up, role and name from metadata,
-- client→technician upgrade) is kept.
-- =============================================================================

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff_role text := nullif(trim(new.raw_user_meta_data ->> 'staff_role'), '');
  v_phone      text := private.normalize_phone(
                         coalesce(nullif(trim(new.phone), ''), nullif(trim(new.raw_user_meta_data ->> 'phone'), ''))
                       );
  v_role       public.user_role := 'client';
  v_name       text;
begin
  -- Profile sync must never abort the auth.users insert: any failure below is
  -- logged and the sign-up proceeds, with onboarding left to complete_profile().
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

    -- No usable phone (email/OAuth/admin-created identity, or an unparseable
    -- number): defer the profile to complete_profile().
    if v_phone is null then
      return new;
    end if;

    if (new.raw_user_meta_data ->> 'role') = 'technician' then
      v_role := 'technician';
    end if;

    v_name := coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'SewaSync user'
    );

    begin
      insert into public.users (id, role, name, phone, email)
      values (new.id, v_role, v_name, v_phone, nullif(new.email, ''))
      on conflict (id) do update
        set name  = excluded.name,
            phone = coalesce(excluded.phone, public.users.phone),
            role  = case
                      when public.users.role = 'client' and excluded.role = 'technician' then 'technician'
                      else public.users.role
                    end;
    exception
      when unique_violation then
        -- Phone or email already on another profile: onboarding reports the
        -- conflict (complete_profile → phone_already_registered).
        null;
    end;
  exception
    when others then
      raise warning 'handle_new_auth_user: profile sync skipped for %: % (%)', new.id, sqlerrm, sqlstate;
  end;

  return new;
end;
$$;

revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;

-- complete_profile() is the deferred path above. Its 000009 body initialised
-- `v_role public.user_role := 'client'` from an uncast text literal, which
-- `supabase db lint --level warning` (CI: "Lint PL/pgSQL") reports as 42804.
-- Body otherwise unchanged; CREATE OR REPLACE keeps its grants.

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
  v_role       public.user_role := 'client'::public.user_role;
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

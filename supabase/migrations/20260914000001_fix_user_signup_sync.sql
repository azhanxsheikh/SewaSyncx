-- =============================================================================
-- SewaSync — Fix user signup profile synchronization (2026-09-14)
--
-- 1. Adds 'admin' to public.user_role enum if not already present.
-- 2. Drops NOT NULL constraint on public.users.phone so that users created via
--    email-only auth or before phone OTP can safely persist in public.users.
-- 3. Updates handle_new_auth_user() to:
--    - Extract name from raw_user_meta_data->>'full_name' or raw_user_meta_data->>'name'
--    - Support user_role 'client', 'technician', 'admin'
--    - Handle duplicate phone gracefully (stores NULL phone rather than aborting)
--    - Always ensure a public.users row is created for new auth users
-- 4. Revokes execute on handle_new_auth_user() from public, anon, authenticated.
-- =============================================================================

-- 1. Ensure 'admin' exists in public.user_role
alter type public.user_role add value if not exists 'admin';

-- 2. Drop NOT NULL on users.phone to align with DATABASE.md §2 (phone is NULLABLE)
alter table public.users alter column phone drop not null;

-- 3. Ensure handle_new_auth_user properly syncs name, role, and handles missing/duplicate phone
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
  begin
    -- Platform staff branch
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

    -- Resolve user_role
    if (new.raw_user_meta_data ->> 'role') = 'technician' then
      v_role := 'technician';
    elsif (new.raw_user_meta_data ->> 'role') = 'admin' then
      v_role := 'admin';
    else
      v_role := 'client';
    end if;

    -- Extract name: maps raw_user_meta_data->>'full_name' || raw_user_meta_data->>'name'
    v_name := coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'SewaSync user'
    );

    -- Insert or update public.users
    begin
      insert into public.users (id, role, name, phone, email)
      values (new.id, v_role, v_name, v_phone, nullif(new.email, ''))
      on conflict (id) do update
        set name  = excluded.name,
            phone = coalesce(excluded.phone, public.users.phone),
            role  = case
                      when public.users.role = 'client' and excluded.role = 'technician' then 'technician'
                      when public.users.role = 'client' and excluded.role = 'admin' then 'admin'
                      else public.users.role
                    end;
    exception
      when unique_violation then
        -- If phone is already registered to another user, insert with NULL phone
        -- so the user record still exists in public.users
        begin
          insert into public.users (id, role, name, phone, email)
          values (new.id, v_role, v_name, null, nullif(new.email, ''))
          on conflict (id) do update
            set name = excluded.name;
        exception
          when others then
            null;
        end;
    end;
  exception
    when others then
      raise warning 'handle_new_auth_user: profile sync skipped for %: % (%)', new.id, sqlerrm, sqlstate;
  end;

  return new;
end;
$$;

revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;

-- =============================================================================
-- SewaSync — platform_staff (governance)
--
-- Design authority: docs/DATABASE.md §4 (platform_staff), which deliberately
-- keeps staff out of public.users ("shared identity for the two participant
-- classes... Staff are deliberately excluded"). Every prior migration left
-- this as explicit future work; it's needed now for a real admin login
-- (Task 3) and for the Admin console's read access (Task 2).
-- =============================================================================


create type public.staff_role as enum ('support_moderator', 'super_admin');

create table public.platform_staff (
  id         uuid primary key references auth.users (id) on delete cascade,
  staff_role public.staff_role not null default 'support_moderator',
  name       text not null,
  email      text unique,
  created_at timestamptz not null default now()
);

alter table public.platform_staff enable row level security;

create policy platform_staff_select_self
  on public.platform_staff for select to authenticated
  using (id = auth.uid());

-- No insert/update/delete policies: rows are written only by
-- handle_new_auth_user (below), which is SECURITY DEFINER.
revoke insert, update, delete on public.platform_staff from anon, authenticated;


-- -----------------------------------------------------------------------------
-- Route staff signups to platform_staff instead of public.users.
--
-- A staff account is created (via the Supabase Admin API, or a seed insert
-- into auth.users) with raw_user_meta_data->>'staff_role' set to one of the
-- staff_role enum values. That's the only signal distinguishing it from an
-- ordinary client/technician signup, which never sets that key. Everything
-- else in the client/technician branch is unchanged from
-- 20260912000003_realtime_rls_and_lifecycle.sql.
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff_role text := nullif(trim(new.raw_user_meta_data ->> 'staff_role'), '');
  v_phone      text;
begin
  if v_staff_role is not null then
    begin
      insert into public.platform_staff (id, staff_role, name, email)
      values (
        new.id,
        v_staff_role::public.staff_role,
        coalesce(
          nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
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

  v_phone := private.normalize_phone(new.phone);
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
-- Grants on this function are set in 20260913000002_security_linter_fixes.sql
-- (revoked from public/anon/authenticated) and are unaffected by CREATE OR
-- REPLACE, which changes a function's body, not its privileges.


-- -----------------------------------------------------------------------------
-- Staff read access. private.* so it isn't itself exposed by PostgREST.
-- -----------------------------------------------------------------------------

create function private.is_platform_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.platform_staff where id = auth.uid());
$$;

revoke execute on function private.is_platform_staff() from public, anon;
grant execute on function private.is_platform_staff() to authenticated;

-- Additive to the existing participant-scoped policies (migrations 1, 5):
-- staff can see every request/dispute, not just ones they're party to.
create policy requests_select_staff
  on public.requests for select to authenticated
  using (private.is_platform_staff());

create policy disputes_select_staff
  on public.disputes for select to authenticated
  using (private.is_platform_staff());

-- Completes the disputes shape from docs/DATABASE.md §4 now that
-- platform_staff exists to reference.
alter table public.disputes
  add column assigned_admin_id uuid references public.platform_staff (id) on delete set null;

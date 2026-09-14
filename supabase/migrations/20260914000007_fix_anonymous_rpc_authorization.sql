-- =============================================================================
-- SewaSync — Fix anonymous access to client/technician-only RPCs
--
-- 20260914000004_cost_additions_policies.sql and
-- 20260914000005_client_cancel_request.sql created public.cancel_request,
-- public.approve_cost_addition, public.decline_cost_addition and
-- public.create_cost_addition directly in the public schema as
-- SECURITY DEFINER, without revoking the default PUBLIC execute grant, and
-- each function's own authorization check fails OPEN (not closed) when
-- auth.uid() is NULL — i.e. when called by the anon role:
--
--   - cancel_request: v_is_client / v_is_tech become NULL when v_caller_id
--     is NULL, so `not (NULL or NULL or false)` evaluates to NULL, and
--     `if NULL then raise exception` never raises — execution falls into
--     the "admin_override" branch and cancels the request.
--   - {approve,decline,create}_cost_addition: private.request_participant_role()
--     returns NULL for a non-participant (documented behaviour), and
--     `if NULL != 'client' then raise exception` likewise never raises.
--
-- Confirmed exploitable against a local reset with no session at all:
--   begin; set local role anon;
--   select public.cancel_request('<any request id>', 'x');       -- cancels it
--   select public.create_cost_addition('<any request id>', ...); -- inserts it
--   rollback;
--
-- This is exactly the class of bug 20260913000002_security_linter_fixes.sql
-- already fixed once for accept_request/advance_request_status/
-- complete_profile/report_technician_location: move the SECURITY DEFINER
-- implementation into `private` (not exposed by PostgREST, so lints 0028/0029
-- — scripts/ci/security-definer-lints.sql — don't see it), and replace the
-- public-facing function with a thin SECURITY INVOKER wrapper that only
-- checks auth.uid() is not null before delegating. These four functions are
-- refactored the same way here, plus the NULL-safe authorization fix so the
-- fail-open bug can't resurface even if something calls the private
-- implementation directly.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- cancel_request
-- ---------------------------------------------------------------------------

create or replace function private.cancel_request(
  p_request_id uuid,
  p_reason text default 'client_initiated'
)
returns public.requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.requests;
  v_caller_id uuid;
  v_is_client boolean;
  v_is_tech boolean;
  v_reason_enum public.status_event_reason;
begin
  v_caller_id := auth.uid();

  -- Belt-and-suspenders: the public wrapper already rejects a null caller,
  -- but fail closed here too rather than let v_is_client/v_is_tech go NULL
  -- and silently fall through to the admin_override branch below.
  if v_caller_id is null then
    raise exception 'not_authorized_to_cancel';
  end if;

  -- Lock request
  select * into v_req
    from public.requests
   where id = p_request_id
     for update;

  if not found then
    raise exception 'request_not_found';
  end if;

  if v_req.status not in ('pending', 'accepted', 'en_route') then
    raise exception 'invalid_transition_cannot_cancel_in_current_state';
  end if;

  v_is_client := (v_req.client_id = v_caller_id or v_req.user_id = v_caller_id);
  v_is_tech := (v_req.technician_id = v_caller_id);

  if not (v_is_client or v_is_tech or private.is_platform_staff()) then
    raise exception 'not_authorized_to_cancel';
  end if;

  if v_is_client then
    v_reason_enum := 'client_initiated';
    perform set_config('sewasync.actor_role', 'client', true);
    perform set_config('sewasync.actor_id', v_caller_id::text, true);
    perform set_config('sewasync.status_reason', 'client_initiated', true);
  elsif v_is_tech then
    v_reason_enum := 'technician_honest';
    perform set_config('sewasync.actor_role', 'technician', true);
    perform set_config('sewasync.actor_id', v_caller_id::text, true);
    perform set_config('sewasync.status_reason', 'technician_honest', true);
  else
    v_reason_enum := 'admin_override';
    perform set_config('sewasync.actor_role', 'admin', true);
    perform set_config('sewasync.actor_id', v_caller_id::text, true);
    perform set_config('sewasync.status_reason', 'admin_override', true);
  end if;

  -- Update request
  update public.requests
     set status = 'cancelled',
         cancellation_reason = coalesce(p_reason, 'Client cancelled'),
         updated_at = now()
   where id = p_request_id
  returning * into v_req;

  -- Insert notification for technician if assigned
  if v_req.technician_id is not null and v_is_client then
    insert into public.notifications (user_id, request_id, type, title, icon)
    values (
      v_req.technician_id,
      v_req.id,
      'status_update',
      'Client cancelled request #' || substring(v_req.id::text, 1, 8),
      'x-circle'
    );
  end if;

  -- Insert notification for client if tech cancelled
  if v_is_tech then
    insert into public.notifications (user_id, request_id, type, title, icon)
    values (
      v_req.client_id,
      v_req.id,
      'status_update',
      'Technician cancelled booking #' || substring(v_req.id::text, 1, 8),
      'alert-circle'
    );
  end if;

  return v_req;
end;
$$;

-- Replaces the old direct-public-SECURITY-DEFINER function with a thin
-- SECURITY INVOKER wrapper, matching public.accept_request's shape.
create or replace function public.cancel_request(
  p_request_id uuid,
  p_reason text default 'client_initiated'
)
returns public.requests
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHORIZED: Authentication required';
  end if;

  return private.cancel_request(p_request_id, p_reason);
end;
$$;

revoke execute on function private.cancel_request(uuid, text) from public, anon;
grant execute on function private.cancel_request(uuid, text) to authenticated, service_role;

revoke execute on function public.cancel_request(uuid, text) from public, anon;
grant execute on function public.cancel_request(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- approve_cost_addition / decline_cost_addition / create_cost_addition
-- ---------------------------------------------------------------------------

create or replace function private.approve_cost_addition(p_addition_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_addition public.request_cost_additions%rowtype;
begin
  select * into v_addition
    from public.request_cost_additions
   where id = p_addition_id
     for update;

  if not found then
    raise exception 'Cost addition not found';
  end if;

  if v_addition.status != 'pending' then
    raise exception 'Cost addition is not in pending status';
  end if;

  -- IS DISTINCT FROM (not !=): fails closed when request_participant_role
  -- returns NULL (its documented behaviour for a non-participant), instead
  -- of the != comparison's NULL-propagating no-op that let any caller through.
  if private.request_participant_role(v_addition.request_id) is distinct from 'client'::public.user_role then
    raise exception 'Only the client of the request can approve cost additions';
  end if;

  update public.request_cost_additions
     set status = 'approved',
         resolved_at = now()
   where id = p_addition_id
  returning * into v_addition;

  return to_jsonb(v_addition);
end;
$$;

create or replace function public.approve_cost_addition(p_addition_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHORIZED: Authentication required';
  end if;

  return private.approve_cost_addition(p_addition_id);
end;
$$;

create or replace function private.decline_cost_addition(p_addition_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_addition public.request_cost_additions%rowtype;
begin
  select * into v_addition
    from public.request_cost_additions
   where id = p_addition_id
     for update;

  if not found then
    raise exception 'Cost addition not found';
  end if;

  if v_addition.status != 'pending' then
    raise exception 'Cost addition is not in pending status';
  end if;

  if private.request_participant_role(v_addition.request_id) is distinct from 'client'::public.user_role then
    raise exception 'Only the client of the request can decline cost additions';
  end if;

  update public.request_cost_additions
     set status = 'declined',
         resolved_at = now()
   where id = p_addition_id
  returning * into v_addition;

  return to_jsonb(v_addition);
end;
$$;

create or replace function public.decline_cost_addition(p_addition_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHORIZED: Authentication required';
  end if;

  return private.decline_cost_addition(p_addition_id);
end;
$$;

create or replace function private.create_cost_addition(
  p_request_id uuid,
  p_reason text,
  p_amount numeric,
  p_tags text[] default '{}'::text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_addition public.request_cost_additions%rowtype;
begin
  if p_amount <= 0 then
    raise exception 'Amount must be greater than 0';
  end if;

  if private.request_participant_role(p_request_id) is distinct from 'technician'::public.user_role then
    raise exception 'Only the assigned technician can request cost additions';
  end if;

  insert into public.request_cost_additions (
    request_id,
    reason,
    amount,
    tags,
    status
  ) values (
    p_request_id,
    p_reason,
    p_amount,
    coalesce(p_tags, '{}'::text[]),
    'pending'
  )
  returning * into v_addition;

  return to_jsonb(v_addition);
end;
$$;

create or replace function public.create_cost_addition(
  p_request_id uuid,
  p_reason text,
  p_amount numeric,
  p_tags text[] default '{}'::text[]
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHORIZED: Authentication required';
  end if;

  return private.create_cost_addition(p_request_id, p_reason, p_amount, p_tags);
end;
$$;

revoke execute on function private.approve_cost_addition(uuid) from public, anon;
revoke execute on function private.decline_cost_addition(uuid) from public, anon;
revoke execute on function private.create_cost_addition(uuid, text, numeric, text[]) from public, anon;
grant execute on function private.approve_cost_addition(uuid) to authenticated, service_role;
grant execute on function private.decline_cost_addition(uuid) to authenticated, service_role;
grant execute on function private.create_cost_addition(uuid, text, numeric, text[]) to authenticated, service_role;

revoke execute on function public.approve_cost_addition(uuid) from public, anon;
revoke execute on function public.decline_cost_addition(uuid) from public, anon;
revoke execute on function public.create_cost_addition(uuid, text, numeric, text[]) from public, anon;
grant execute on function public.approve_cost_addition(uuid) to authenticated;
grant execute on function public.decline_cost_addition(uuid) to authenticated;
grant execute on function public.create_cost_addition(uuid, text, numeric, text[]) to authenticated;

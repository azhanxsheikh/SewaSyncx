-- =============================================================================
-- SewaSync — fix a second NULL-propagation gap in private.cancel_request
--
-- 20260914000007 fixed the case where the *caller* is anonymous
-- (auth.uid() is null). It missed a second, more easily triggered case:
-- v_is_tech := (v_req.technician_id = v_caller_id) is NULL whenever
-- technician_id itself is NULL — i.e. for any request that is still
-- 'pending' and unassigned, which is the normal state of a fresh request.
--
-- With v_is_client = false (a real boolean, since client_id/user_id are
-- never null) and v_is_tech = null, `not (false or null or is_platform_staff())`
-- evaluates to `not null` = null, and `if null then raise exception` never
-- raises. Confirmed against a local reset: an authenticated user with no
-- relationship whatsoever to a pending request can cancel it.
--
-- Fix: coalesce both flags to a real boolean at the point they're computed,
-- so every downstream `if` in this function sees true/false, never null,
-- regardless of which side of either comparison is null. No other logic
-- changes.
-- =============================================================================

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
begin
  v_caller_id := auth.uid();

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

  -- coalesce(..., false): technician_id (and, in principle, client_id/user_id)
  -- can be null, and `null = v_caller_id` is null, not false. Left unguarded,
  -- that null propagates through `not (v_is_client or v_is_tech or ...)` and
  -- the exception below never fires for an unassigned request.
  v_is_client := coalesce(v_req.client_id = v_caller_id or v_req.user_id = v_caller_id, false);
  v_is_tech := coalesce(v_req.technician_id = v_caller_id, false);

  if not (v_is_client or v_is_tech or private.is_platform_staff()) then
    raise exception 'not_authorized_to_cancel';
  end if;

  if v_is_client then
    perform set_config('sewasync.actor_role', 'client', true);
    perform set_config('sewasync.actor_id', v_caller_id::text, true);
    perform set_config('sewasync.status_reason', 'client_initiated', true);
  elsif v_is_tech then
    perform set_config('sewasync.actor_role', 'technician', true);
    perform set_config('sewasync.actor_id', v_caller_id::text, true);
    perform set_config('sewasync.status_reason', 'technician_honest', true);
  else
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

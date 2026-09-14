-- =============================================================================
-- SewaSync — align private.cancel_request with the project's search_path standard
--
-- Every other SECURITY DEFINER function in this schema is declared with
-- `set search_path = ''` so that no unqualified identifier can be resolved
-- against a caller-controlled or mutable schema (search-path hijacking).
-- private.cancel_request inherited `set search_path = public` from
-- 20260914000005_client_cancel_request.sql and was the only exception.
--
-- Safe for this body: every identifier it references is already
-- schema-qualified (auth.uid(), private.is_platform_staff(), public.requests,
-- public.notifications, and the v_req public.requests rowtype). The remaining
-- calls — set_config, now, coalesce, substring — live in pg_catalog, which
-- Postgres always searches implicitly regardless of search_path. There are no
-- unqualified type casts (the one enum-typed local, v_reason_enum, was
-- removed as dead code in 20260914000008).
--
-- Body is otherwise byte-identical to 20260914000009.
-- =============================================================================

create or replace function private.cancel_request(
  p_request_id uuid,
  p_reason text default 'client_initiated'
)
returns public.requests
language plpgsql
security definer
set search_path = ''
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

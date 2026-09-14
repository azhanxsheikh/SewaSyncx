-- =============================================================================
-- SewaSync — remove dead variable flagged by `supabase db lint`
--
-- private.cancel_request (originally public.cancel_request in
-- 20260914000005_client_cancel_request.sql) declares and assigns
-- v_reason_enum in every branch but never reads it — the equivalent string
-- is already passed directly to set_config('sewasync.status_reason', ...).
-- CI's "Lint PL/pgSQL" step runs with --fail-on warning, so this pre-existing
-- "never read variable" warning fails that job on its own, independent of
-- 20260914000007's authorization fix. Pure dead-code removal: no behavior
-- change.
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

  v_is_client := (v_req.client_id = v_caller_id or v_req.user_id = v_caller_id);
  v_is_tech := (v_req.technician_id = v_caller_id);

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

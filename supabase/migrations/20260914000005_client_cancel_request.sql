-- -----------------------------------------------------------------------------
-- Migration: 20260914000005_client_cancel_request.sql
-- Enables client cancellation of requests, reason tracking, and status events
-- -----------------------------------------------------------------------------

-- 1. Add cancellation_reason to requests if not exists
alter table public.requests
  add column if not exists cancellation_reason text;

-- 2. Add notes to request_status_events if not exists
alter table public.request_status_events
  add column if not exists notes text;

-- 3. Policy allowing clients to cancel their pending or active requests
drop policy if exists requests_update_client_cancel on public.requests;
create policy requests_update_client_cancel
  on public.requests for update to authenticated
  using (
    client_id = (select auth.uid())
    and status in ('pending', 'accepted', 'en_route')
  )
  with check (
    client_id = (select auth.uid())
    and status = 'cancelled'
  );

-- 4. Privileged RPC cancel_request
create or replace function public.cancel_request(
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

grant execute on function public.cancel_request(uuid, text) to authenticated;

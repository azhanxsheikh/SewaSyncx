-- 20260914000004_cost_additions_policies.sql
-- Enable technician insertion and client approval/rejection for request_cost_additions

drop policy if exists request_cost_additions_insert_technician on public.request_cost_additions;
create policy request_cost_additions_insert_technician
  on public.request_cost_additions for insert to authenticated
  with check (
    private.request_participant_role(request_id) = 'technician'::public.user_role
    and status = 'pending'
  );

drop policy if exists request_cost_additions_update_client on public.request_cost_additions;
create policy request_cost_additions_update_client
  on public.request_cost_additions for update to authenticated
  using (
    private.request_participant_role(request_id) = 'client'::public.user_role
  )
  with check (
    private.request_participant_role(request_id) = 'client'::public.user_role
  );

-- Column grants: clients can only alter status and resolved_at
revoke update on public.request_cost_additions from public, anon;
grant select on public.request_cost_additions to authenticated, anon;
grant insert (request_id, reason, tags, amount, status) on public.request_cost_additions to authenticated;
grant update (status, resolved_at) on public.request_cost_additions to authenticated;

-- Helper RPC for client approving a cost addition
create or replace function public.approve_cost_addition(p_addition_id uuid)
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

  -- Ensure caller is client
  if private.request_participant_role(v_addition.request_id) != 'client'::public.user_role then
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

-- Helper RPC for client declining a cost addition
create or replace function public.decline_cost_addition(p_addition_id uuid)
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

  if private.request_participant_role(v_addition.request_id) != 'client'::public.user_role then
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

-- Helper RPC for technician creating a cost addition
create or replace function public.create_cost_addition(
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

  if private.request_participant_role(p_request_id) != 'technician'::public.user_role then
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

grant execute on function public.approve_cost_addition(uuid) to authenticated;
grant execute on function public.decline_cost_addition(uuid) to authenticated;
grant execute on function public.create_cost_addition(uuid, text, numeric, text[]) to authenticated;

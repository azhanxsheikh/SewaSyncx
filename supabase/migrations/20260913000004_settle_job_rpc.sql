-- =============================================================================
-- SewaSync — settle_job_payment: technician settlement + completion
--
-- Design authority: docs/DATABASE.md §11.3, CLAUDE.md's price-variance
-- invariant. Not a prior deferred implementation — greenfield.
--
-- Follows the private-impl / public-invoker-wrapper pattern established in
-- 20260913000002_security_linter_fixes.sql (see accept_request there for the
-- template) rather than a bare public SECURITY DEFINER function, which would
-- reproduce the 0028/0029 findings that migration fixed.
--
-- Nothing today ever advances a request past 'accepted' in the real
-- database — ActiveJob.tsx's en_route/arrived/in_progress step buttons only
-- touch local client state, never an RPC. So this function does not assume
-- the request is already 'in_progress'; it walks it forward itself, one
-- already-audited private.advance_request_status() call per hop.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Invoice numbering
--
-- invoices has no default generator (seed.sql hardcodes a number by hand).
-- A private sequence is the minimal real one; the format is a placeholder
-- pending a real numbering scheme.
-- -----------------------------------------------------------------------------

create sequence private.invoice_number_seq;


-- -----------------------------------------------------------------------------
-- 2. private.settle_job_payment — privileged implementation
-- -----------------------------------------------------------------------------

create function private.settle_job_payment(
  p_request_id uuid,
  p_final_price numeric(10, 2),
  p_reason public.price_adjustment_reason default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request      public.requests;
  v_updated      public.requests;
  v_delta        numeric(10, 2);
  v_approved     numeric(10, 2);
  v_target       public.request_status;
  v_invoice_id   uuid;
  v_subtotal     numeric(10, 2);
  v_tax          numeric(10, 2);
  v_invoice_no   text;
begin
  if p_final_price < 0 then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_final_price',
      detail  = 'p_final_price must be >= 0';
  end if;

  select *
    into v_request
    from public.requests
   where id = p_request_id
     and technician_id = auth.uid()
   for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'request_not_found',
      detail  = format('request %s does not exist or is not assigned to the caller', p_request_id);
  end if;

  if public.request_status_is_terminal(v_request.status) then
    raise exception using
      errcode = 'P0001',
      message = 'job_not_in_settleable_state',
      detail  = format('request %s is already %s', p_request_id, v_request.status);
  end if;

  -- Checked explicitly and first, rather than left to surface from the
  -- nested private.advance_request_status(..., 'completed') call below,
  -- which independently enforces the same rule for any pending row —
  -- including one unrelated to this settlement's own price delta. Failing
  -- fast here keeps the error unambiguous and avoids doing the forward-walk
  -- and the settlement UPDATE only to unwind them (no partial write either
  -- way — request_not_found/job_not_in_settleable_state etc. are peers of
  -- this check, not narrower).
  if exists (
    select 1 from public.request_cost_additions
     where request_id = p_request_id and status = 'pending'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'unsettled_cost_addition',
      detail  = format('request %s has a cost addition awaiting client approval', p_request_id);
  end if;

  v_delta := p_final_price - v_request.estimated_total;

  -- Price-variance invariant (docs/DATABASE.md §11.3): a price increase
  -- requires an already client-approved request_cost_additions row (or
  -- rows, summed) covering the delta. A price at or below the estimate
  -- needs no reason and no approval.
  if v_delta > 0 then
    if p_reason is null then
      raise exception using
        errcode = 'P0001',
        message = 'invalid_reason_missing_notes',
        detail  = 'a price above the estimate requires price_adjustment_reason';
    end if;

    if p_reason = 'other' and p_notes is null then
      raise exception using
        errcode = 'P0001',
        message = 'invalid_reason_missing_notes',
        detail  = 'price_adjustment_reason = other requires p_notes';
    end if;

    select coalesce(sum(amount), 0)
      into v_approved
      from public.request_cost_additions
     where request_id = p_request_id
       and status = 'approved';

    if v_approved < v_delta then
      raise exception using
        errcode = 'P0001',
        message = 'cost_addition_not_approved',
        detail  = format(
          'request %s needs an approved cost addition covering %s; %s is approved',
          p_request_id, v_delta, v_approved
        );
    end if;
  end if;

  -- Walk the request forward to in_progress. Each hop re-locks the row,
  -- re-validates the actor and the transition matrix, and logs its own
  -- audit event via the existing trigger — nothing here duplicates that.
  foreach v_target in array array['en_route', 'arrived', 'in_progress']::public.request_status[]
  loop
    if v_request.status <> v_target
       and public.request_transition_allowed(v_request.status, v_target) then
      v_request := private.advance_request_status(p_request_id, v_target);
    end if;
  end loop;

  -- Settlement fields only; status is untouched by this statement, so it
  -- does not fire guard_request_status / log_request_status_event.
  update public.requests
     set final_price             = p_final_price,
         price_adjustment_reason = p_reason,
         price_adjustment_notes  = p_notes
   where id = p_request_id;

  -- Reuses the fully-audited transition: sets completed_at, logs the event,
  -- clears technician_locations.request_id, checks unsettled_cost_addition
  -- again for anything unrelated to this delta that's still pending.
  v_updated := private.advance_request_status(p_request_id, 'completed');

  -- generate_invoice_on_completion (docs/DATABASE.md §7) is not built yet,
  -- so the invoice is written directly here, matching the real invoices
  -- columns exactly (see seed.sql's Scenario C for the same shape).
  --
  -- Placeholders pending real config, both matching seed.sql's precedent:
  --   - 18%-inclusive GST assumed on p_final_price.
  --   - 12% flat commission (the commission_rules table doesn't exist yet;
  --     technician_payouts is not created here either).
  v_subtotal := round(p_final_price / 1.18, 2);
  v_tax      := p_final_price - v_subtotal;
  v_invoice_no := 'SWS-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('private.invoice_number_seq')::text, 6, '0');

  insert into public.invoices (request_id, invoice_number, subtotal, tax, total, commission_rate_applied, issued_at)
  values (p_request_id, v_invoice_no, v_subtotal, v_tax, p_final_price, 12.00, now())
  returning id into v_invoice_id;

  return jsonb_build_object(
    'success', true,
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_no,
    'final_price', p_final_price,
    'request', to_jsonb(v_updated)
  );
end;
$$;

revoke execute on function private.settle_job_payment(uuid, numeric, public.price_adjustment_reason, text) from public, anon;
grant execute on function private.settle_job_payment(uuid, numeric, public.price_adjustment_reason, text) to authenticated, service_role;


-- -----------------------------------------------------------------------------
-- 3. public.settle_job_payment — thin SECURITY INVOKER wrapper
-- -----------------------------------------------------------------------------

create function public.settle_job_payment(
  p_request_id uuid,
  p_final_price numeric(10, 2),
  p_reason public.price_adjustment_reason default null,
  p_notes text default null
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

  return private.settle_job_payment(p_request_id, p_final_price, p_reason, p_notes);
end;
$$;

revoke execute on function public.settle_job_payment(uuid, numeric, public.price_adjustment_reason, text) from public, anon;
grant execute on function public.settle_job_payment(uuid, numeric, public.price_adjustment_reason, text) to authenticated;

-- AlliDesk Practice 2.0: protected Session cancellation and no-show outcomes.
--
-- This migration keeps Booking and Session lifecycle state atomic, preserves
-- history, cancels only unissued draft invoices, and leaves future no-show fee
-- billing outside this operation.

create or replace function public.apply_session_terminal_outcome(
  target_session_id uuid,
  target_outcome text,
  outcome_reason text default null
)
returns table (
  session_id uuid,
  booking_id uuid,
  terminal_outcome text,
  changed boolean,
  cancelled_invoice_id uuid
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  session_record public.sessions%rowtype;
  booking_record public.bookings%rowtype;
  invoice_record public.invoices%rowtype;
  previous_session_status text;
  previous_booking_status text;
  event_type text;
  event_reason text;
  transition_time timestamptz := statement_timestamp();
begin
  if target_outcome not in ('cancelled', 'no_show') then
    raise exception 'Unsupported terminal session outcome';
  end if;

  select s.*
  into session_record
  from public.sessions s
  where s.id = target_session_id
    and s.deleted_at is null
  for update;

  if session_record.id is null then
    raise exception 'Session not found';
  end if;

  if not public.has_tenant_role(session_record.tenant_id, array['admin', 'therapist']) then
    raise exception 'Not allowed to change this session outcome';
  end if;

  select b.*
  into booking_record
  from public.bookings b
  where b.id = session_record.booking_id
    and b.tenant_id = session_record.tenant_id
    and b.deleted_at is null
  for update;

  if booking_record.id is null then
    raise exception 'Linked booking not found';
  end if;

  if session_record.session_status = target_outcome
    and booking_record.booking_status = target_outcome
  then
    session_id := session_record.id;
    booking_id := booking_record.id;
    terminal_outcome := target_outcome;
    changed := false;
    cancelled_invoice_id := null;
    return next;
    return;
  end if;

  if session_record.session_status in ('completed', 'cancelled', 'no_show') then
    raise exception 'Completed or terminal sessions cannot be changed to another terminal outcome';
  end if;

  if booking_record.booking_status in ('completed', 'cancelled', 'no_show') then
    raise exception 'Completed or terminal bookings cannot be changed to another terminal outcome';
  end if;

  if target_outcome = 'cancelled' and btrim(coalesce(outcome_reason, '')) = '' then
    raise exception 'A cancellation reason is required';
  end if;

  select i.*
  into invoice_record
  from public.invoices i
  where i.tenant_id = session_record.tenant_id
    and i.session_id = session_record.id
    and i.deleted_at is null
    and i.invoice_status not in ('cancelled', 'voided')
  for update;

  if invoice_record.id is not null then
    if invoice_record.invoice_status not in ('draft', 'review_required', 'ready_to_confirm')
      or invoice_record.confirmed_at is not null
      or invoice_record.issued_at is not null
      or invoice_record.amount_paid <> 0
    then
      raise exception 'Confirmed, issued or paid invoices require a separate financial correction';
    end if;

    update public.invoices
    set
      invoice_status = 'cancelled',
      cancelled_at = transition_time,
      cancelled_by_profile_id = auth.uid(),
      cancellation_reason = case
        when target_outcome = 'no_show' then 'No show recorded; treatment was not delivered'
        else 'Session cancelled: ' || btrim(outcome_reason)
      end,
      patient_link_visible = false,
      patient_link_update_ready = true,
      updated_by_profile_id = auth.uid()
    where id = invoice_record.id;

    insert into public.invoice_status_history (
      tenant_id, invoice_id, session_id, booking_id, patient_id,
      from_status, to_status, event_type, event_reason,
      is_patient_visible, created_by_profile_id
    )
    values (
      invoice_record.tenant_id, invoice_record.id, session_record.id,
      booking_record.id, session_record.patient_id,
      invoice_record.invoice_status, 'cancelled', 'draft_invoice_cancelled',
      case
        when target_outcome = 'no_show' then 'Draft invoice cancelled because the patient did not attend'
        else 'Draft invoice cancelled because the session was cancelled'
      end,
      false, auth.uid()
    );

    insert into public.invoice_workflow_events (
      tenant_id, invoice_id, session_id, booking_id, patient_id,
      event_type, idempotency_key, payload, created_by_profile_id
    )
    values (
      invoice_record.tenant_id, invoice_record.id, session_record.id,
      booking_record.id, session_record.patient_id,
      'draft_invoice_cancelled',
      'invoice:' || invoice_record.id::text || ':draft_invoice_cancelled:' || target_outcome || ':v1',
      jsonb_build_object('source', 'session_terminal_outcome', 'outcome', target_outcome),
      auth.uid()
    )
    on conflict (tenant_id, idempotency_key) where deleted_at is null do nothing;

    cancelled_invoice_id := invoice_record.id;
  else
    cancelled_invoice_id := null;
  end if;

  previous_session_status := session_record.session_status;
  previous_booking_status := booking_record.booking_status;
  event_type := case when target_outcome = 'cancelled' then 'session_cancelled' else 'session_no_show_recorded' end;
  event_reason := case
    when target_outcome = 'cancelled' then btrim(outcome_reason)
    else 'Patient did not attend the scheduled session'
  end;

  update public.sessions
  set
    session_status = target_outcome,
    attendance_outcome = target_outcome,
    session_outcome = target_outcome,
    cancelled_at = case when target_outcome = 'cancelled' then transition_time else null end,
    cancelled_by_profile_id = case when target_outcome = 'cancelled' then auth.uid() else null end,
    cancellation_reason = case when target_outcome = 'cancelled' then btrim(outcome_reason) else null end,
    no_show_at = case when target_outcome = 'no_show' then transition_time else null end,
    draft_invoice_requested_at = null,
    draft_invoice_request_status = 'cancelled',
    patient_history_ready = true,
    patient_link_update_ready = true,
    updated_by_profile_id = auth.uid()
  where id = session_record.id;

  update public.bookings
  set
    booking_status = target_outcome,
    cancelled_at = case when target_outcome = 'cancelled' then transition_time else null end,
    cancellation_reason = case when target_outcome = 'cancelled' then btrim(outcome_reason) else null end,
    no_show_at = case when target_outcome = 'no_show' then transition_time else null end,
    session_ready = false,
    draft_invoice_ready = false,
    updated_by_profile_id = auth.uid()
  where id = booking_record.id;

  insert into public.session_status_history (
    tenant_id, session_id, booking_id, patient_id,
    from_status, to_status, event_type, event_reason,
    actual_start_at, actual_end_at, is_patient_visible,
    metadata, created_by_profile_id
  )
  values (
    session_record.tenant_id, session_record.id, booking_record.id,
    session_record.patient_id, previous_session_status, target_outcome,
    event_type, event_reason, session_record.actual_start_at,
    session_record.actual_end_at, true,
    jsonb_build_object('cancelled_invoice_id', cancelled_invoice_id), auth.uid()
  );

  insert into public.booking_status_history (
    tenant_id, booking_id, from_status, to_status, event_type,
    event_reason, old_start_at, old_end_at, new_start_at, new_end_at,
    is_patient_visible, metadata, created_by_profile_id
  )
  values (
    booking_record.tenant_id, booking_record.id, previous_booking_status,
    target_outcome,
    case when target_outcome = 'cancelled' then 'booking_cancelled' else 'no_show_recorded' end,
    event_reason, booking_record.start_at, booking_record.end_at,
    booking_record.start_at, booking_record.end_at, true,
    jsonb_build_object('session_id', session_record.id, 'cancelled_invoice_id', cancelled_invoice_id),
    auth.uid()
  );

  insert into public.session_workflow_events (
    tenant_id, session_id, booking_id, patient_id,
    event_type, idempotency_key, payload, created_by_profile_id
  )
  values (
    session_record.tenant_id, session_record.id, booking_record.id,
    session_record.patient_id, event_type,
    'session:' || session_record.id::text || ':' || event_type || ':v1',
    jsonb_build_object('reason', event_reason, 'cancelled_invoice_id', cancelled_invoice_id),
    auth.uid()
  )
  on conflict (tenant_id, idempotency_key) where deleted_at is null do nothing;

  insert into public.booking_workflow_events (
    tenant_id, booking_id, event_type, idempotency_key,
    payload, created_by_profile_id
  )
  values (
    booking_record.tenant_id, booking_record.id,
    case when target_outcome = 'cancelled' then 'booking_cancelled' else 'no_show_recorded' end,
    'booking:' || booking_record.id::text || ':' || target_outcome || ':v1',
    jsonb_build_object('session_id', session_record.id, 'reason', event_reason, 'cancelled_invoice_id', cancelled_invoice_id),
    auth.uid()
  )
  on conflict (tenant_id, idempotency_key) where deleted_at is null do nothing;

  insert into public.patient_history_events (
    tenant_id, patient_id, event_type, event_title, event_body,
    source_table, source_id, is_patient_visible,
    patient_visible_title, patient_visible_body,
    occurred_at, created_by_profile_id, metadata
  )
  values (
    session_record.tenant_id, session_record.patient_id,
    case when target_outcome = 'cancelled' then 'session_cancelled' else 'session_no_show_recorded' end,
    case when target_outcome = 'cancelled' then 'Session cancelled' else 'No show recorded' end,
    event_reason, 'sessions', session_record.id, true,
    case when target_outcome = 'cancelled' then 'Appointment cancelled' else 'No show recorded' end,
    event_reason, transition_time, auth.uid(),
    jsonb_build_object('booking_id', booking_record.id, 'cancelled_invoice_id', cancelled_invoice_id)
  );

  session_id := session_record.id;
  booking_id := booking_record.id;
  terminal_outcome := target_outcome;
  changed := true;
  return next;
end;
$$;

revoke all on function public.apply_session_terminal_outcome(uuid, text, text) from public, anon, authenticated;

create or replace function public.cancel_session(
  target_session_id uuid,
  cancellation_reason_input text
)
returns table (
  session_id uuid,
  booking_id uuid,
  terminal_outcome text,
  changed boolean,
  cancelled_invoice_id uuid
)
language sql
security definer
set search_path = pg_catalog, public
as $$
  select *
  from public.apply_session_terminal_outcome(
    target_session_id,
    'cancelled',
    cancellation_reason_input
  );
$$;

create or replace function public.record_session_no_show(target_session_id uuid)
returns table (
  session_id uuid,
  booking_id uuid,
  terminal_outcome text,
  changed boolean,
  cancelled_invoice_id uuid
)
language sql
security definer
set search_path = pg_catalog, public
as $$
  select *
  from public.apply_session_terminal_outcome(target_session_id, 'no_show', null);
$$;

revoke all on function public.cancel_session(uuid, text) from public, anon;
revoke all on function public.record_session_no_show(uuid) from public, anon;
grant execute on function public.cancel_session(uuid, text) to authenticated;
grant execute on function public.record_session_no_show(uuid) to authenticated;

comment on function public.cancel_session(uuid, text) is
  'Atomically cancels a non-terminal Session and its Booking, preserving history and cancelling only an unissued draft invoice.';

comment on function public.record_session_no_show(uuid) is
  'Atomically records a no-show for a non-terminal Session and its Booking. No treatment or no-show fee is charged by this operation.';

create or replace function public.prevent_direct_session_lifecycle_update()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  call_stack text := '';
  lifecycle_change boolean;
  approved_rpc_call boolean;
begin
  get diagnostics call_stack = pg_context;

  lifecycle_change :=
    old.session_status is distinct from new.session_status
    or old.attendance_outcome is distinct from new.attendance_outcome
    or old.session_outcome is distinct from new.session_outcome
    or old.completed_at is distinct from new.completed_at
    or old.cancelled_at is distinct from new.cancelled_at
    or old.no_show_at is distinct from new.no_show_at;

  approved_rpc_call :=
    call_stack like '%PL/pgSQL function complete_session(%'
    or call_stack like '%PL/pgSQL function reopen_completed_session(%'
    or call_stack like '%PL/pgSQL function apply_session_terminal_outcome(%';

  if lifecycle_change
    and auth.uid() is not null
    and not approved_rpc_call
  then
    raise exception 'Session lifecycle changes must use approved RPCs';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_direct_session_lifecycle_update() from public, anon, authenticated;

create or replace function public.prevent_direct_invoice_lifecycle_update()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  call_stack text := '';
  lifecycle_change boolean;
  approved_rpc_call boolean;
  approved_total_recalculation boolean;
begin
  get diagnostics call_stack = pg_context;

  lifecycle_change :=
    old.invoice_status is distinct from new.invoice_status
    or old.payment_status is distinct from new.payment_status
    or old.confirmed_at is distinct from new.confirmed_at
    or old.issued_at is distinct from new.issued_at
    or old.last_payment_at is distinct from new.last_payment_at
    or old.cancelled_at is distinct from new.cancelled_at
    or old.amount_paid is distinct from new.amount_paid
    or old.balance_due is distinct from new.balance_due;

  approved_rpc_call :=
    call_stack like '%PL/pgSQL function confirm_invoice(%'
    or call_stack like '%PL/pgSQL function issue_invoice(%'
    or call_stack like '%PL/pgSQL function recalculate_invoice_payment_balance(%'
    or call_stack like '%PL/pgSQL function apply_session_terminal_outcome(%';

  approved_total_recalculation :=
    old.invoice_status in ('draft', 'review_required', 'ready_to_confirm')
    and new.invoice_status = old.invoice_status
    and new.payment_status is not distinct from old.payment_status
    and new.confirmed_at is not distinct from old.confirmed_at
    and new.issued_at is not distinct from old.issued_at
    and new.last_payment_at is not distinct from old.last_payment_at
    and new.cancelled_at is not distinct from old.cancelled_at
    and new.amount_paid is not distinct from old.amount_paid
    and new.balance_due = greatest(0, round((new.total_amount - new.amount_paid)::numeric, 2))
    and exists (
      select 1
      from public.invoice_internal_recalculation_context c
      where c.transaction_id = txid_current()
        and c.backend_pid = pg_backend_pid()
        and c.tenant_id = new.tenant_id
        and c.invoice_id = new.id
        and c.operation = 'recalculate_invoice_totals'
    );

  if lifecycle_change
    and auth.uid() is not null
    and not approved_rpc_call
    and not approved_total_recalculation
  then
    raise exception 'Invoice lifecycle changes must use approved RPCs';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_direct_invoice_lifecycle_update() from public, anon, authenticated;

comment on function public.apply_session_terminal_outcome(uuid, text, text) is
  'Internal Session terminal-outcome operation. Direct execution is denied; authenticated users must use the protected Cancel or No Show wrappers.';


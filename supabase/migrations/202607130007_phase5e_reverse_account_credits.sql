-- AlliDesk Phase 5E hardening: keep account credits consistent when a payment
-- is reversed.
--
-- The original Phase 5E reversal function reversed payment allocations,
-- recalculated affected invoices, and reversed the receipt, but account credits
-- created from an unallocated payment balance remained available. This forward
-- migration preserves the same public function signature and adds reversal of
-- source-payment credits so reversed payments cannot leave usable credits.

create or replace function public.reverse_payment(target_payment_id uuid, reversal_reason_input text)
returns table (
  payment_id uuid,
  reversed_payment boolean,
  payment_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_record public.payments%rowtype;
  previous_payment_status text;
  allocation_record public.payment_allocations%rowtype;
  affected_invoice_ids uuid[] := '{}';
  affected_invoice_id uuid;
begin
  select * into payment_record
  from public.payments
  where id = target_payment_id
    and deleted_at is null
  for update;

  if payment_record.id is null then
    raise exception 'Payment not found';
  end if;

  if not public.has_tenant_role(payment_record.tenant_id, array['admin', 'finance']) then
    raise exception 'Not allowed to reverse this payment';
  end if;

  if reversal_reason_input is null or btrim(reversal_reason_input) = '' then
    raise exception 'Payment reversal reason is required';
  end if;

  if payment_record.payment_status = 'reversed' then
    payment_id := payment_record.id;
    reversed_payment := false;
    payment_status := payment_record.payment_status;
    return next;
    return;
  end if;

  previous_payment_status := payment_record.payment_status;

  for allocation_record in
    select * from public.payment_allocations
    where payment_id = payment_record.id
      and tenant_id = payment_record.tenant_id
      and allocation_status = 'active'
      and deleted_at is null
    for update
  loop
    update public.payment_allocations
    set
      allocation_status = 'reversed',
      reversed_at = now(),
      reversed_by_profile_id = auth.uid(),
      reversal_reason = reversal_reason_input,
      updated_by_profile_id = auth.uid()
    where id = allocation_record.id;

    affected_invoice_ids := array_append(affected_invoice_ids, allocation_record.invoice_id);

    insert into public.payment_workflow_events (
      tenant_id, payment_id, payment_allocation_id, invoice_id, financial_account_id, patient_id,
      responsible_party_id, event_type, idempotency_key, payload, created_by_profile_id
    )
    values (
      payment_record.tenant_id, payment_record.id, allocation_record.id, allocation_record.invoice_id,
      payment_record.financial_account_id, allocation_record.patient_id, allocation_record.responsible_party_id,
      'allocation_reversed',
      'payment:' || payment_record.id::text || ':allocation:' || allocation_record.id::text || ':allocation_reversed:v1',
      jsonb_build_object('reason', reversal_reason_input), auth.uid()
    )
    on conflict (tenant_id, idempotency_key) where deleted_at is null do nothing;
  end loop;

  update public.account_credits
  set
    credit_status = 'reversed',
    remaining_amount = 0,
    updated_by_profile_id = auth.uid()
  where tenant_id = payment_record.tenant_id
    and source_payment_id = payment_record.id
    and deleted_at is null
    and credit_status in ('available', 'partially_used');

  update public.payments
  set
    payment_status = 'reversed',
    reconciliation_status = 'reversed',
    allocated_amount = 0,
    unallocated_amount = 0,
    reversed_at = now(),
    reversed_by_profile_id = auth.uid(),
    reversal_reason = reversal_reason_input,
    updated_by_profile_id = auth.uid()
  where id = payment_record.id
  returning * into payment_record;

  if array_length(affected_invoice_ids, 1) is not null then
    for affected_invoice_id in
      select distinct unnest(affected_invoice_ids)
    loop
      perform public.recalculate_invoice_payment_balance(affected_invoice_id);
    end loop;
  end if;

  update public.receipts
  set
    receipt_status = 'reversed',
    reversed_at = now(),
    reversed_by_profile_id = auth.uid(),
    reversal_reason = reversal_reason_input,
    updated_by_profile_id = auth.uid()
  where payment_id = payment_record.id
    and tenant_id = payment_record.tenant_id
    and deleted_at is null
    and receipt_status = 'issued';

  insert into public.payment_status_history (
    tenant_id, payment_id, financial_account_id, patient_id, responsible_party_id,
    from_status, to_status, event_type, event_reason, created_by_profile_id
  )
  values (
    payment_record.tenant_id, payment_record.id, payment_record.financial_account_id, payment_record.patient_id,
    payment_record.responsible_party_id, previous_payment_status, 'reversed', 'payment_reversed', reversal_reason_input, auth.uid()
  );

  insert into public.payment_workflow_events (
    tenant_id, payment_id, financial_account_id, patient_id, responsible_party_id,
    event_type, idempotency_key, payload, created_by_profile_id
  )
  values (
    payment_record.tenant_id, payment_record.id, payment_record.financial_account_id, payment_record.patient_id,
    payment_record.responsible_party_id, 'payment_reversed',
    'payment:' || payment_record.id::text || ':payment_reversed:v1',
    jsonb_build_object('reason', reversal_reason_input), auth.uid()
  )
  on conflict (tenant_id, idempotency_key) where deleted_at is null do nothing;

  if payment_record.patient_id is not null then
    insert into public.patient_history_events (
      tenant_id, patient_id, event_type, event_title, event_body, source_table, source_id,
      is_patient_visible, occurred_at, created_by_profile_id, metadata
    )
    values (
      payment_record.tenant_id, payment_record.patient_id, 'payment_reversed', 'Payment reversed',
      'A payment was reversed on the account.', 'payments', payment_record.id,
      false, now(), auth.uid(), jsonb_build_object('payment_id', payment_record.id)
    );
  end if;

  payment_id := payment_record.id;
  reversed_payment := true;
  payment_status := payment_record.payment_status;
  return next;
end;
$$;

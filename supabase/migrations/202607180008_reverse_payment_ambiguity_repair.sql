-- Qualify payment lifecycle table references so reverse_payment does not
-- conflict with its payment_id output column. No payment data is changed by
-- this migration.

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
  affected_invoice_ids uuid[] := '{}'::uuid[];
  affected_invoice_id uuid;
begin
  select p.* into payment_record
  from public.payments p
  where p.id = target_payment_id
    and p.deleted_at is null
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
    select pa.*
    from public.payment_allocations pa
    where pa.payment_id = payment_record.id
      and pa.tenant_id = payment_record.tenant_id
      and pa.allocation_status = 'active'
      and pa.deleted_at is null
    for update
  loop
    update public.payment_allocations pa
    set
      allocation_status = 'reversed',
      reversed_at = now(),
      reversed_by_profile_id = auth.uid(),
      reversal_reason = reversal_reason_input,
      updated_by_profile_id = auth.uid()
    where pa.id = allocation_record.id;

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

  update public.account_credits ac
  set
    credit_status = 'reversed',
    remaining_amount = 0,
    updated_by_profile_id = auth.uid()
  where ac.tenant_id = payment_record.tenant_id
    and ac.source_payment_id = payment_record.id
    and ac.deleted_at is null
    and ac.credit_status in ('available', 'partially_used');

  update public.payments p
  set
    payment_status = 'reversed',
    reconciliation_status = 'reversed',
    allocated_amount = 0,
    unallocated_amount = 0,
    reversed_at = now(),
    reversed_by_profile_id = auth.uid(),
    reversal_reason = reversal_reason_input,
    updated_by_profile_id = auth.uid()
  where p.id = payment_record.id
  returning p.* into payment_record;

  if array_length(affected_invoice_ids, 1) is not null then
    for affected_invoice_id in
      select distinct unnest(affected_invoice_ids)
    loop
      perform public.recalculate_invoice_payment_balance(affected_invoice_id);
    end loop;
  end if;

  update public.receipts r
  set
    receipt_status = 'reversed',
    reversed_at = now(),
    reversed_by_profile_id = auth.uid(),
    reversal_reason = reversal_reason_input,
    updated_by_profile_id = auth.uid()
  where r.payment_id = payment_record.id
    and r.tenant_id = payment_record.tenant_id
    and r.deleted_at is null
    and r.receipt_status = 'issued';

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

revoke all on function public.reverse_payment(uuid, text) from public, anon;
grant execute on function public.reverse_payment(uuid, text) to authenticated;

comment on function public.reverse_payment(uuid, text) is
  'Reverses a payment and its active allocations and credits through the approved tenant-authorised finance lifecycle.';

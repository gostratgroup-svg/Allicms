-- Operational readiness repair:
-- Qualify invoice_lines.invoice_id in confirm_invoice to avoid PL/pgSQL
-- ambiguity with the function output column named invoice_id.

create or replace function public.confirm_invoice(target_invoice_id uuid)
returns table (
  invoice_id uuid,
  confirmed_invoice boolean,
  invoice_status text,
  invoice_number text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  invoice_record public.invoices%rowtype;
  sequence_record public.invoice_number_sequences%rowtype;
  billing_record public.billing_settings%rowtype;
  line_count integer;
  allocated_number text;
  previous_status text;
begin
  select *
  into invoice_record
  from public.invoices
  where id = target_invoice_id
    and deleted_at is null
  for update;

  if invoice_record.id is null then
    raise exception 'Invoice not found';
  end if;

  if not public.has_tenant_role(invoice_record.tenant_id, array['admin', 'finance']) then
    raise exception 'Not allowed to confirm this invoice';
  end if;

  if invoice_record.invoice_status in ('confirmed', 'issued', 'awaiting_payment', 'partially_paid', 'paid', 'overdue') then
    invoice_id := invoice_record.id;
    confirmed_invoice := false;
    invoice_status := invoice_record.invoice_status;
    invoice_number := invoice_record.invoice_number;
    return next;
    return;
  end if;

  if invoice_record.invoice_status not in ('draft', 'ready_to_confirm') then
    raise exception 'Only draft or ready-to-confirm invoices can be confirmed';
  end if;

  if invoice_record.reconciliation_required then
    raise exception 'Invoice requires reconciliation before confirmation';
  end if;

  select count(*)
  into line_count
  from public.invoice_lines
  where public.invoice_lines.invoice_id = invoice_record.id
    and public.invoice_lines.tenant_id = invoice_record.tenant_id
    and public.invoice_lines.deleted_at is null;

  if line_count = 0 then
    raise exception 'Invoice requires at least one line before confirmation';
  end if;

  if invoice_record.due_date is null then
    raise exception 'Invoice requires a due date before confirmation';
  end if;

  perform public.recalculate_invoice_totals(invoice_record.id);

  select *
  into invoice_record
  from public.invoices
  where id = target_invoice_id
    and deleted_at is null
  for update;

  if invoice_record.total_amount < 0 then
    raise exception 'Invoice total cannot be negative';
  end if;

  select *
  into billing_record
  from public.billing_settings
  where tenant_id = invoice_record.tenant_id
    and deleted_at is null
  order by created_at desc
  limit 1;

  insert into public.invoice_number_sequences (
    tenant_id,
    sequence_key,
    prefix,
    next_number,
    padding_length,
    created_by_profile_id,
    updated_by_profile_id
  )
  values (
    invoice_record.tenant_id,
    'default',
    coalesce(billing_record.invoice_prefix, invoice_record.invoice_prefix, 'INV'),
    coalesce(billing_record.next_invoice_number, 1),
    4,
    auth.uid(),
    auth.uid()
  )
  on conflict (tenant_id, sequence_key) where deleted_at is null do nothing;

  select *
  into sequence_record
  from public.invoice_number_sequences
  where tenant_id = invoice_record.tenant_id
    and sequence_key = 'default'
    and deleted_at is null
  for update;

  allocated_number := sequence_record.prefix || '-' || lpad(sequence_record.next_number::text, sequence_record.padding_length, '0') || coalesce(sequence_record.suffix, '');
  previous_status := invoice_record.invoice_status;

  update public.invoice_number_sequences
  set
    next_number = next_number + 1,
    updated_by_profile_id = auth.uid()
  where id = sequence_record.id;

  update public.invoices
  set
    invoice_status = 'confirmed',
    invoice_number = allocated_number,
    invoice_prefix = sequence_record.prefix,
    invoice_sequence_number = sequence_record.next_number,
    invoice_sequence_key = sequence_record.sequence_key,
    confirmed_at = now(),
    confirmed_by_profile_id = auth.uid(),
    patient_link_update_ready = true,
    updated_by_profile_id = auth.uid()
  where id = invoice_record.id;

  insert into public.invoice_status_history (
    tenant_id,
    invoice_id,
    session_id,
    booking_id,
    patient_id,
    from_status,
    to_status,
    event_type,
    event_reason,
    is_patient_visible,
    created_by_profile_id
  )
  values (
    invoice_record.tenant_id,
    invoice_record.id,
    invoice_record.session_id,
    invoice_record.booking_id,
    invoice_record.patient_id,
    previous_status,
    'confirmed',
    'invoice_confirmed',
    'Invoice confirmed and final number allocated',
    true,
    auth.uid()
  );

  insert into public.invoice_workflow_events (
    tenant_id,
    invoice_id,
    session_id,
    booking_id,
    patient_id,
    event_type,
    idempotency_key,
    payload,
    created_by_profile_id
  )
  values
    (
      invoice_record.tenant_id,
      invoice_record.id,
      invoice_record.session_id,
      invoice_record.booking_id,
      invoice_record.patient_id,
      'invoice_number_allocated',
      'invoice:' || invoice_record.id::text || ':invoice_number_allocated:v1',
      jsonb_build_object('invoice_number', allocated_number),
      auth.uid()
    ),
    (
      invoice_record.tenant_id,
      invoice_record.id,
      invoice_record.session_id,
      invoice_record.booking_id,
      invoice_record.patient_id,
      'invoice_confirmed',
      'invoice:' || invoice_record.id::text || ':invoice_confirmed:v1',
      jsonb_build_object('invoice_number', allocated_number),
      auth.uid()
    ),
    (
      invoice_record.tenant_id,
      invoice_record.id,
      invoice_record.session_id,
      invoice_record.booking_id,
      invoice_record.patient_id,
      'patient_link_update_ready',
      'invoice:' || invoice_record.id::text || ':patient_link_update_ready:v1',
      jsonb_build_object('invoice_number', allocated_number),
      auth.uid()
    )
  on conflict (tenant_id, idempotency_key) where deleted_at is null do nothing;

  insert into public.patient_history_events (
    tenant_id,
    patient_id,
    event_type,
    event_title,
    event_body,
    source_table,
    source_id,
    is_patient_visible,
    patient_visible_title,
    patient_visible_body,
    occurred_at,
    created_by_profile_id,
    metadata
  )
  values (
    invoice_record.tenant_id,
    invoice_record.patient_id,
    'invoice_confirmed',
    'Invoice confirmed',
    'An invoice was confirmed and is ready for payment tracking.',
    'invoices',
    invoice_record.id,
    true,
    'Invoice available',
    'An invoice is available from the practice.',
    now(),
    auth.uid(),
    jsonb_build_object('invoice_number', allocated_number)
  );

  invoice_id := invoice_record.id;
  confirmed_invoice := true;
  invoice_status := 'confirmed';
  invoice_number := allocated_number;
  return next;
end;
$$;

revoke all on function public.confirm_invoice(uuid) from public, anon;
grant execute on function public.confirm_invoice(uuid) to authenticated;

-- Practice 2.0 Milestone 2 blocker-repair validation.
-- Run only against allidesk-dev after migrations 202607180007-202607180010.
-- Every mutation is enclosed in one transaction and rolled back.

begin;

-- The Supabase CLI temporary login can assume postgres for fixture discovery;
-- each behavioural check below then switches to the real authenticated role.
set role postgres;

create temp table m2_auth_context (
  email text primary key,
  profile_id uuid not null
) on commit drop;

insert into m2_auth_context (email, profile_id)
select lower(email), id
from public.profiles
where lower(email) in (
  'gostratgroup+allidesk-admin-a@gmail.com',
  'gostratgroup+allidesk-therapist-a@gmail.com',
  'gostratgroup+allidesk-admin-b@gmail.com'
);

do $$
begin
  if (select count(*) from m2_auth_context) <> 3 then
    raise exception 'Required fictional authenticated users were not found';
  end if;
end;
$$;

grant select on m2_auth_context to authenticated;

-- Storage pending-intent authorization.
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from m2_auth_context where email = 'gostratgroup+allidesk-admin-a@gmail.com'),
  true
);

create temp table m2_upload_intent on commit drop as
select *
from public.create_document_upload_intent(
  '10000000-0000-4000-8000-000000000001',
  'generated-documents',
  '10000000-0000-4000-8000-000000000010',
  'invoice_pdf',
  'milestone-2-validation.pdf',
  'application/pdf',
  1024,
  'internal',
  null,
  null,
  null,
  null,
  '10000000-0000-4000-8000-000000000016',
  jsonb_build_object('validation', 'practice_2_milestone_02')
);

grant select on m2_upload_intent to authenticated;

do $$
declare
  intent m2_upload_intent%rowtype;
begin
  select * into intent from m2_upload_intent;

  if not public.can_upload_document_object(
    intent.bucket_id,
    intent.object_path,
    'application/pdf',
    1024
  ) then
    raise exception 'Authorised uploader cannot resolve its pending upload intent';
  end if;

  if exists (
    select 1 from public.document_files where id = intent.document_file_id
  ) then
    raise exception 'Pending upload metadata unexpectedly visible through normal document SELECT RLS';
  end if;
end;
$$;

-- A therapist in the same tenant cannot upload a finance-generated document.
select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from m2_auth_context where email = 'gostratgroup+allidesk-therapist-a@gmail.com'),
  true
);

do $$
declare
  intent m2_upload_intent%rowtype;
begin
  select * into intent from m2_upload_intent;
  if public.can_upload_document_object(intent.bucket_id, intent.object_path, 'application/pdf', 1024) then
    raise exception 'Therapist unexpectedly authorised for invoice PDF upload';
  end if;
end;
$$;

-- An admin in another tenant cannot use Tenant A's upload intent.
select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from m2_auth_context where email = 'gostratgroup+allidesk-admin-b@gmail.com'),
  true
);

do $$
declare
  intent m2_upload_intent%rowtype;
begin
  select * into intent from m2_upload_intent;
  if public.can_upload_document_object(intent.bucket_id, intent.object_path, 'application/pdf', 1024) then
    raise exception 'Cross-tenant admin unexpectedly authorised for pending upload';
  end if;
end;
$$;

reset role;

do $$
begin
  if has_function_privilege(
    'anon',
    'public.can_upload_document_object(text,text,text,bigint)',
    'EXECUTE'
  ) then
    raise exception 'Anonymous role unexpectedly has pending-upload helper access';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.recalculate_invoice_totals(uuid)',
    'EXECUTE'
  ) then
    raise exception 'Authenticated role unexpectedly has direct invoice total helper access';
  end if;

  if has_table_privilege('authenticated', 'public.invoice_internal_recalculation_context', 'SELECT')
    or has_table_privilege('authenticated', 'public.invoice_internal_recalculation_context', 'INSERT')
    or has_table_privilege('authenticated', 'public.invoice_internal_recalculation_context', 'UPDATE')
    or has_table_privilege('authenticated', 'public.invoice_internal_recalculation_context', 'DELETE')
  then
    raise exception 'Authenticated role unexpectedly has invoice recalculation context access';
  end if;
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from m2_auth_context where email = 'gostratgroup+allidesk-admin-a@gmail.com'),
  true
);

-- Exercise the actual storage.objects INSERT policy and the pending-to-uploaded
-- metadata transition. The object row and metadata change are rolled back.
insert into storage.objects (
  id,
  bucket_id,
  name,
  owner,
  owner_id,
  metadata
)
select
  gen_random_uuid(),
  intent.bucket_id,
  intent.object_path,
  auth.uid(),
  auth.uid()::text,
  jsonb_build_object('mimetype', 'application/pdf', 'size', 1024)
from m2_upload_intent intent;

select public.finalise_document_upload(intent.document_file_id)
from m2_upload_intent intent;

do $$
declare
  intent m2_upload_intent%rowtype;
begin
  select * into intent from m2_upload_intent;

  if not exists (
    select 1
    from public.document_files df
    where df.id = intent.document_file_id
      and df.document_status = 'uploaded'
      and df.bucket_id = intent.bucket_id
      and df.object_path = intent.object_path
      and df.invoice_id = '10000000-0000-4000-8000-000000000016'
  ) then
    raise exception 'Document metadata did not finalise after the authorised object insert';
  end if;
end;
$$;

-- Draft invoice creation must return the existing active invoice for the
-- completed fictional session and must not create a duplicate.
do $$
declare
  draft_result record;
  active_count integer;
begin
  perform *
  from public.complete_session(
    '10000000-0000-4000-8000-000000000014',
    timestamptz '2026-08-03 08:30:00+02',
    timestamptz '2026-08-03 09:30:00+02',
    'attended',
    'completed_as_planned',
    'Milestone 2 rollback-only validation'
  );

  select * into draft_result
  from public.create_draft_invoice_from_session(
    '10000000-0000-4000-8000-000000000014'
  );

  if draft_result.invoice_id <> '10000000-0000-4000-8000-000000000016'
     or draft_result.created_invoice then
    raise exception 'Draft invoice RPC did not return the existing active invoice';
  end if;

  select count(*) into active_count
  from public.invoices i
  where i.tenant_id = '10000000-0000-4000-8000-000000000001'
    and i.session_id = '10000000-0000-4000-8000-000000000014'
    and i.source_type = 'session'
    and i.invoice_status not in ('cancelled', 'voided')
    and i.deleted_at is null;

  if active_count <> 1 then
    raise exception 'Duplicate active session invoice detected';
  end if;
end;
$$;

-- Direct lifecycle mutation remains blocked, and Tenant A cannot mutate a
-- Tenant B invoice through ordinary table access.
do $$
declare
  target_invoice_id uuid;
  original_balance numeric;
  blocked boolean := false;
  affected_rows integer;
begin
  select i.id, i.balance_due
  into target_invoice_id, original_balance
  from public.invoices i
  where i.tenant_id = '10000000-0000-4000-8000-000000000001'
    and i.deleted_at is null
  order by i.created_at asc
  limit 1;

  begin
    update public.invoices
    set balance_due = original_balance + 1
    where id = target_invoice_id;
  exception when others then
    blocked := true;
  end;

  if not blocked then
    raise exception 'Direct authenticated balance mutation was not blocked';
  end if;

  update public.invoices
  set updated_at = now()
  where tenant_id = '20000000-0000-4000-8000-000000000001';

  get diagnostics affected_rows = row_count;
  if affected_rows <> 0 then
    raise exception 'Tenant A admin unexpectedly updated Tenant B invoices';
  end if;
end;
$$;

-- Create a fresh session, draft, issued invoice, payment and reversal from an
-- existing fictional booking. Every mutation is rolled back.
do $$
declare
  booking_record public.bookings%rowtype;
  session_result record;
  draft_result record;
  duplicate_result record;
  confirm_result record;
  issue_result record;
  payment_result record;
  reversal_result record;
  repeated_reversal_result record;
  invoice_record public.invoices%rowtype;
  financial_account_record public.financial_accounts%rowtype;
  expected_subtotal numeric(12, 2);
  expected_discount numeric(12, 2);
  expected_adjustment numeric(12, 2);
  expected_tax numeric(12, 2);
  expected_total numeric(12, 2);
  active_count integer;
begin
  insert into public.bookings (
    tenant_id,
    patient_id,
    therapist_profile_id,
    practice_location_id,
    price_list_id,
    booking_status,
    booking_type,
    booking_source,
    appointment_mode,
    start_at,
    end_at,
    duration_minutes,
    timezone,
    room_label,
    patient_facing_title,
    session_ready,
    draft_invoice_ready,
    metadata,
    created_by_profile_id,
    updated_by_profile_id
  )
  select
    b.tenant_id,
    b.patient_id,
    b.therapist_profile_id,
    b.practice_location_id,
    b.price_list_id,
    'confirmed',
    b.booking_type,
    'internal',
    b.appointment_mode,
    b.start_at + interval '14 days',
    b.end_at + interval '14 days',
    b.duration_minutes,
    b.timezone,
    b.room_label,
    b.patient_facing_title,
    true,
    false,
    jsonb_build_object('validation', 'practice_2_milestone_02'),
    auth.uid(),
    auth.uid()
  from public.bookings b
  where b.id = '10000000-0000-4000-8000-000000000012'
    and b.tenant_id = '10000000-0000-4000-8000-000000000001'
  returning * into booking_record;

  if booking_record.id is null then
    raise exception 'Deterministic fictional booking source was not found';
  end if;

  insert into public.booking_procedures (
    tenant_id,
    booking_id,
    price_list_id,
    price_list_item_id,
    procedure_name,
    procedure_code,
    description,
    unit_price,
    quantity,
    discount_amount,
    adjustment_amount,
    line_total,
    duration_minutes,
    currency_code,
    is_billable,
    metadata,
    created_by_profile_id,
    updated_by_profile_id
  )
  select
    bp.tenant_id,
    booking_record.id,
    bp.price_list_id,
    bp.price_list_item_id,
    bp.procedure_name,
    bp.procedure_code,
    bp.description,
    bp.unit_price,
    bp.quantity,
    bp.discount_amount,
    bp.adjustment_amount,
    bp.line_total,
    bp.duration_minutes,
    bp.currency_code,
    true,
    jsonb_build_object('validation', 'practice_2_milestone_02'),
    auth.uid(),
    auth.uid()
  from public.booking_procedures bp
  where bp.id = '10000000-0000-4000-8000-000000000013'
    and bp.tenant_id = booking_record.tenant_id;

  if not found then
    raise exception 'Deterministic fictional booking procedure source was not found';
  end if;

  select * into session_result
  from public.create_session_from_booking(booking_record.id);

  if not session_result.created_session then
    raise exception 'Fresh session was not created from the selected booking';
  end if;

  perform *
  from public.complete_session(
    session_result.session_id,
    booking_record.start_at,
    booking_record.end_at,
    'attended',
    'completed_as_planned',
    'Milestone 2 fresh draft validation'
  );

  select * into draft_result
  from public.create_draft_invoice_from_session(session_result.session_id);

  if not draft_result.created_invoice then
    raise exception 'Draft invoice was not created from the fresh completed session';
  end if;

  if not exists (
    select 1
    from public.invoices i
    where i.id = draft_result.invoice_id
      and i.session_id = session_result.session_id
      and i.booking_id = booking_record.id
      and i.patient_id = booking_record.patient_id
      and i.invoice_status in ('draft', 'review_required')
      and i.deleted_at is null
  ) then
    raise exception 'Fresh draft invoice traceability is incomplete';
  end if;

  if not exists (
    select 1
    from public.invoice_lines il
    where il.invoice_id = draft_result.invoice_id
      and il.source_session_procedure_id is not null
      and il.deleted_at is null
  ) then
    raise exception 'Fresh draft invoice has no delivered-procedure lines';
  end if;

  select
    coalesce(sum(il.line_subtotal), 0),
    coalesce(sum(il.discount_amount), 0),
    coalesce(sum(il.adjustment_amount), 0),
    coalesce(sum(il.tax_amount), 0),
    coalesce(sum(il.line_total), 0)
  into
    expected_subtotal,
    expected_discount,
    expected_adjustment,
    expected_tax,
    expected_total
  from public.invoice_lines il
  where il.invoice_id = draft_result.invoice_id
    and il.deleted_at is null;

  select * into invoice_record
  from public.invoices i
  where i.id = draft_result.invoice_id;

  if invoice_record.subtotal_amount <> expected_subtotal
    or invoice_record.discount_total <> expected_discount
    or invoice_record.adjustment_total <> expected_adjustment
    or invoice_record.tax_total <> expected_tax
    or invoice_record.total_amount <> round(expected_total + invoice_record.rounding_adjustment, 2)
    or invoice_record.balance_due <> greatest(invoice_record.total_amount - invoice_record.amount_paid, 0)
  then
    raise exception 'Fresh draft invoice totals or balance are incorrect';
  end if;

  select * into duplicate_result
  from public.create_draft_invoice_from_session(session_result.session_id);

  if duplicate_result.created_invoice
    or duplicate_result.invoice_id <> draft_result.invoice_id
  then
    raise exception 'Repeated draft invoice creation was not idempotent';
  end if;

  select count(*) into active_count
  from public.invoices i
  where i.tenant_id = booking_record.tenant_id
    and i.session_id = session_result.session_id
    and i.source_type = 'session'
    and i.invoice_status not in ('cancelled', 'voided')
    and i.deleted_at is null;

  if active_count <> 1 then
    raise exception 'Fresh session has duplicate active invoices';
  end if;

  if invoice_record.invoice_status = 'draft' then
    select * into confirm_result
    from public.confirm_invoice(draft_result.invoice_id);

    if not confirm_result.confirmed_invoice
      or confirm_result.invoice_status <> 'confirmed'
      or confirm_result.invoice_number is null
    then
      raise exception 'Approved invoice confirmation failed';
    end if;

    select * into issue_result
    from public.issue_invoice(draft_result.invoice_id);

    if not issue_result.issued_invoice
      or issue_result.invoice_status <> 'awaiting_payment'
    then
      raise exception 'Approved invoice issuing failed';
    end if;

    select * into invoice_record
    from public.invoices i
    where i.id = draft_result.invoice_id;

    select fa.* into financial_account_record
    from public.financial_accounts fa
    where fa.tenant_id = invoice_record.tenant_id
      and fa.patient_id = invoice_record.patient_id
      and fa.account_status = 'active'
      and fa.deleted_at is null
    order by fa.created_at asc
    limit 1;

    if financial_account_record.id is null then
      raise exception 'No active financial account exists for fresh invoice validation';
    end if;

    select * into payment_result
    from public.record_payment(
      invoice_record.tenant_id,
      financial_account_record.id,
      invoice_record.patient_id,
      invoice_record.responsible_party_id,
      invoice_record.id,
      'Milestone 2 Fictional Payer',
      current_date,
      invoice_record.total_amount,
      invoice_record.currency_code,
      'eft',
      'M2-ROLLBACK-ONLY',
      null,
      null,
      invoice_record.therapist_profile_id,
      invoice_record.practice_location_id,
      'Rollback-only regression validation',
      jsonb_build_array(jsonb_build_object(
        'invoice_id', invoice_record.id,
        'amount', invoice_record.total_amount
      ))
    );

    if payment_result.payment_status <> 'allocated'
      or payment_result.unallocated_amount <> 0
    then
      raise exception 'Approved payment recording or allocation failed';
    end if;

    if not exists (
      select 1
      from public.invoices i
      where i.id = invoice_record.id
        and i.balance_due = 0
        and i.payment_status = 'paid'
    ) then
      raise exception 'Invoice balance did not reconcile after payment';
    end if;

    select * into reversal_result
    from public.reverse_payment(
      payment_result.payment_id,
      'Milestone 2 rollback-only fresh payment reversal'
    );

    if not reversal_result.reversed_payment
      or reversal_result.payment_status <> 'reversed'
    then
      raise exception 'Approved fresh payment reversal failed';
    end if;

    if not exists (
      select 1
      from public.invoices i
      where i.id = invoice_record.id
        and i.amount_paid = 0
        and i.balance_due = i.total_amount
    ) then
      raise exception 'Invoice balance did not reconcile after fresh payment reversal';
    end if;

    select * into repeated_reversal_result
    from public.reverse_payment(
      payment_result.payment_id,
      'Milestone 2 rollback-only repeated payment reversal'
    );

    if repeated_reversal_result.reversed_payment
      or repeated_reversal_result.payment_status <> 'reversed'
    then
      raise exception 'Repeated fresh payment reversal was not idempotent';
    end if;
  elsif invoice_record.invoice_status <> 'review_required' then
    raise exception 'Fresh invoice has an unexpected lifecycle status';
  end if;

end;
$$;

reset role;

do $$
begin
  if exists (select 1 from public.invoice_internal_recalculation_context) then
    raise exception 'Invoice recalculation authorization marker was not cleared';
  end if;
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from m2_auth_context where email = 'gostratgroup+allidesk-admin-a@gmail.com'),
  true
);

-- Confirmed/issued invoice content must remain immutable.
do $$
declare
  target_final_invoice_id uuid;
  line_blocked boolean := false;
  party_snapshot_blocked boolean := false;
  issuer_snapshot_blocked boolean := false;
begin
  select i.id into target_final_invoice_id
  from public.invoices i
  where i.tenant_id = '10000000-0000-4000-8000-000000000001'
    and i.invoice_status not in ('draft', 'review_required', 'ready_to_confirm')
    and i.deleted_at is null
  order by i.created_at desc
  limit 1;

  if target_final_invoice_id is null then
    raise exception 'No final invoice is available for immutability validation';
  end if;

  begin
    update public.invoice_lines
    set description = 'This mutation must be rejected'
    where invoice_id = target_final_invoice_id;
  exception when others then
    line_blocked := true;
  end;

  begin
    update public.invoice_party_snapshots
    set patient_full_name = 'This mutation must be rejected'
    where invoice_id = target_final_invoice_id;
  exception when others then
    party_snapshot_blocked := true;
  end;

  begin
    update public.invoice_issuer_snapshots
    set practice_trading_name = 'This mutation must be rejected'
    where invoice_id = target_final_invoice_id;
  exception when others then
    issuer_snapshot_blocked := true;
  end;

  if not line_blocked then
    raise exception 'Final invoice line mutation was not blocked';
  end if;

  if not party_snapshot_blocked or not issuer_snapshot_blocked then
    raise exception 'Final invoice snapshot mutation was not blocked';
  end if;
end;
$$;

rollback;

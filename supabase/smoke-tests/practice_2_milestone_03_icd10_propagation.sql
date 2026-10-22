-- Practice 2.0 Milestone 3 ICD-10 snapshot regression.
-- Run after 202607180012 is approved and applied. All changes roll back.

begin;
set role postgres;

do $$
declare
  tenant_id_value uuid := '10000000-0000-4000-8000-000000000001';
  booking_id_value uuid := gen_random_uuid();
  booking_procedure_id_value uuid := gen_random_uuid();
  fallback_booking_procedure_id uuid := gen_random_uuid();
  empty_booking_procedure_id uuid := gen_random_uuid();
  session_id_value uuid := gen_random_uuid();
  invoice_id_value uuid := gen_random_uuid();
  patient_id_value uuid;
  therapist_id_value uuid;
  location_id_value uuid;
  actor_id_value uuid;
  session_icd10 text;
  invoice_icd10 text;
  fallback_session_procedure_id uuid;
  empty_session_procedure_id uuid;
  fallback_invoice_icd10 text;
  empty_invoice_icd10 text;
begin
  select p.id into patient_id_value
  from public.patients p
  where p.tenant_id = tenant_id_value and p.deleted_at is null
  order by p.created_at limit 1;

  select tp.id into therapist_id_value
  from public.therapist_profiles tp
  where tp.tenant_id = tenant_id_value and tp.is_active and tp.deleted_at is null
  order by tp.created_at limit 1;

  select pl.id into location_id_value
  from public.practice_locations pl
  where pl.tenant_id = tenant_id_value and pl.is_active and pl.deleted_at is null
  order by pl.created_at limit 1;

  select pr.id into actor_id_value
  from public.profiles pr
  where lower(pr.email) = 'gostratgroup+allidesk-admin-a@gmail.com';

  if patient_id_value is null or therapist_id_value is null or actor_id_value is null then
    raise exception 'Required fictional Milestone 3 fixtures are unavailable';
  end if;

  insert into public.bookings (
    id, tenant_id, patient_id, therapist_profile_id, practice_location_id,
    booking_status, booking_type, appointment_mode, start_at, end_at,
    duration_minutes, timezone, created_by_profile_id, updated_by_profile_id
  ) values (
    booking_id_value, tenant_id_value, patient_id_value, therapist_id_value,
    location_id_value, 'scheduled', 'standard', 'in_person',
    timestamptz '2026-12-01 08:00:00+02', timestamptz '2026-12-01 09:00:00+02',
    60, 'Africa/Johannesburg', actor_id_value, actor_id_value
  );

  insert into public.booking_procedures (
    id, tenant_id, booking_id, procedure_name, procedure_code, unit_price,
    quantity, discount_amount, adjustment_amount, line_total, currency_code,
    is_billable, metadata, created_by_profile_id, updated_by_profile_id
  ) values (
    booking_procedure_id_value, tenant_id_value, booking_id_value,
    'ICD-10 propagation validation', 'M3-ICD10', 100, 1, 0, 0, 100,
    'ZAR', true, jsonb_build_object('icd10_code', 'Z00.0'),
    actor_id_value, actor_id_value
  );

  insert into public.sessions (
    id, tenant_id, booking_id, patient_id, therapist_profile_id,
    practice_location_id, session_status, session_type, session_modality,
    scheduled_start_at, scheduled_end_at, timezone,
    created_by_profile_id, updated_by_profile_id
  ) values (
    session_id_value, tenant_id_value, booking_id_value, patient_id_value,
    therapist_id_value, location_id_value, 'not_started', 'standard',
    'in_person', timestamptz '2026-12-01 08:00:00+02',
    timestamptz '2026-12-01 09:00:00+02', 'Africa/Johannesburg',
    actor_id_value, actor_id_value
  );

  insert into public.session_procedures (
    tenant_id, session_id, booking_procedure_id, procedure_name,
    procedure_code, unit_price, quantity, discount_amount, adjustment_amount,
    line_total, currency_code, is_billable, metadata,
    created_by_profile_id, updated_by_profile_id
  ) values (
    tenant_id_value, session_id_value, booking_procedure_id_value,
    'ICD-10 propagation validation', 'M3-ICD10', 100, 1, 0, 0, 100,
    'ZAR', true, '{}'::jsonb, actor_id_value, actor_id_value
  ) returning metadata ->> 'icd10_code' into session_icd10;

  if session_icd10 is distinct from 'Z00.0' then
    raise exception 'Booking procedure ICD-10 was not preserved in Session procedure';
  end if;

  insert into public.invoices (
    id, tenant_id, patient_id, session_id, booking_id, source_type,
    invoice_status, payment_status, draft_reference, invoice_number, invoice_prefix,
    invoice_date, service_date, due_date, payment_terms_days, currency_code,
    subtotal_amount, total_amount, amount_paid, balance_due,
    created_by_profile_id, updated_by_profile_id
  ) values (
    invoice_id_value, tenant_id_value, patient_id_value, session_id_value,
    booking_id_value, 'session', 'draft', 'unpaid', 'DRAFT-M3-ICD10', 'M3-ICD10-DRAFT', 'INV',
    current_date, current_date, current_date + 7, 7, 'ZAR',
    100, 100, 0, 100, actor_id_value, actor_id_value
  );

  insert into public.invoice_lines (
    tenant_id, invoice_id, source_session_procedure_id,
    source_booking_procedure_id, therapist_profile_id, practice_location_id,
    line_type, line_order, service_date, procedure_name, procedure_code,
    icd10_code, quantity, unit_price, discount_amount, adjustment_amount,
    currency_code, created_by_profile_id, updated_by_profile_id
  )
  select
    tenant_id_value, invoice_id_value, sp.id, booking_procedure_id_value,
    therapist_id_value, location_id_value, 'session_procedure', 1,
    current_date, sp.procedure_name, sp.procedure_code, 'PATIENT-FALLBACK',
    sp.quantity, sp.unit_price, sp.discount_amount, sp.adjustment_amount,
    sp.currency_code, actor_id_value, actor_id_value
  from public.session_procedures sp
  where sp.session_id = session_id_value
  returning icd10_code into invoice_icd10;

  if invoice_icd10 is distinct from 'Z00.0' then
    raise exception 'Procedure ICD-10 did not take precedence on Invoice line';
  end if;

  if (select total_amount from public.invoices where id = invoice_id_value) <> 100 then
    raise exception 'Procedure ICD-10 propagation changed the original invoice total';
  end if;

  insert into public.booking_procedures (
    id, tenant_id, booking_id, procedure_name, procedure_code, unit_price,
    quantity, discount_amount, adjustment_amount, line_total, currency_code,
    is_billable, metadata, created_by_profile_id, updated_by_profile_id
  ) values
    (
      fallback_booking_procedure_id, tenant_id_value, booking_id_value,
      'Patient fallback validation', 'M3-FALLBACK', 50, 1, 0, 0, 50,
      'ZAR', true, '{}'::jsonb, actor_id_value, actor_id_value
    ),
    (
      empty_booking_procedure_id, tenant_id_value, booking_id_value,
      'Empty ICD-10 validation', 'M3-EMPTY', 25, 1, 0, 0, 25,
      'ZAR', true, '{}'::jsonb, actor_id_value, actor_id_value
    );

  insert into public.session_procedures (
    tenant_id, session_id, booking_procedure_id, procedure_name,
    procedure_code, unit_price, quantity, discount_amount, adjustment_amount,
    line_total, currency_code, is_billable, metadata,
    created_by_profile_id, updated_by_profile_id
  ) values (
    tenant_id_value, session_id_value, fallback_booking_procedure_id,
    'Patient fallback validation', 'M3-FALLBACK', 50, 1, 0, 0, 50,
    'ZAR', true, '{}'::jsonb, actor_id_value, actor_id_value
  ) returning id into fallback_session_procedure_id;

  insert into public.session_procedures (
    tenant_id, session_id, booking_procedure_id, procedure_name,
    procedure_code, unit_price, quantity, discount_amount, adjustment_amount,
    line_total, currency_code, is_billable, metadata,
    created_by_profile_id, updated_by_profile_id
  ) values (
    tenant_id_value, session_id_value, empty_booking_procedure_id,
    'Empty ICD-10 validation', 'M3-EMPTY', 25, 1, 0, 0, 25,
    'ZAR', true, '{}'::jsonb, actor_id_value, actor_id_value
  ) returning id into empty_session_procedure_id;

  insert into public.invoice_lines (
    tenant_id, invoice_id, source_session_procedure_id,
    source_booking_procedure_id, therapist_profile_id, practice_location_id,
    line_type, line_order, service_date, procedure_name, procedure_code,
    icd10_code, quantity, unit_price, discount_amount, adjustment_amount,
    currency_code, created_by_profile_id, updated_by_profile_id
  ) values (
    tenant_id_value, invoice_id_value, fallback_session_procedure_id,
    fallback_booking_procedure_id, therapist_id_value, location_id_value,
    'session_procedure', 2, current_date, 'Patient fallback validation',
    'M3-FALLBACK', 'PATIENT-FALLBACK', 1, 50, 0, 0, 'ZAR',
    actor_id_value, actor_id_value
  ) returning icd10_code into fallback_invoice_icd10;

  if fallback_invoice_icd10 is distinct from 'PATIENT-FALLBACK' then
    raise exception 'Patient-level ICD-10 fallback was not retained when the procedure had no code';
  end if;

  insert into public.invoice_lines (
    tenant_id, invoice_id, source_session_procedure_id,
    source_booking_procedure_id, therapist_profile_id, practice_location_id,
    line_type, line_order, service_date, procedure_name, procedure_code,
    icd10_code, quantity, unit_price, discount_amount, adjustment_amount,
    currency_code, created_by_profile_id, updated_by_profile_id
  ) values (
    tenant_id_value, invoice_id_value, empty_session_procedure_id,
    empty_booking_procedure_id, therapist_id_value, location_id_value,
    'session_procedure', 3, current_date, 'Empty ICD-10 validation',
    'M3-EMPTY', null, 1, 25, 0, 0, 'ZAR', actor_id_value, actor_id_value
  ) returning icd10_code into empty_invoice_icd10;

  if empty_invoice_icd10 is not null then
    raise exception 'An ICD-10 code was fabricated when neither source provided one';
  end if;

  if not exists (
    select 1 from public.invoice_lines
    where invoice_id = invoice_id_value
      and procedure_code = 'M3-FALLBACK'
      and unit_price = 50
      and quantity = 1
      and line_total = 50
  ) then
    raise exception 'ICD-10 propagation changed procedure pricing';
  end if;

  if not exists (
    select 1 from public.invoices
    where id = invoice_id_value
      and subtotal_amount = 175
      and total_amount = 175
      and balance_due = 175
  ) then
    raise exception 'Invoice totals did not reconcile to the three unchanged procedure prices';
  end if;
end;
$$;

rollback;

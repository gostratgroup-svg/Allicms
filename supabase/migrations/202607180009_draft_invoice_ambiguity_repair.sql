-- Qualify the invoice lookup in the draft-invoice RPC. No invoice data is
-- changed by this migration.

create or replace function public.create_draft_invoice_from_session(target_session_id uuid)
returns table (
  invoice_id uuid,
  created_invoice boolean,
  invoice_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  session_record public.sessions%rowtype;
  existing_invoice public.invoices%rowtype;
  patient_record public.patients%rowtype;
  responsible_party_record public.responsible_parties%rowtype;
  billing_record public.billing_settings%rowtype;
  practice_record public.practice_profiles%rowtype;
  branding_record public.practice_branding%rowtype;
  therapist_record public.therapist_profiles%rowtype;
  location_record public.practice_locations%rowtype;
  bank_record public.bank_accounts%rowtype;
  registration_record public.professional_registrations%rowtype;
  workflow_event public.session_workflow_events%rowtype;
  new_invoice_id uuid;
  draft_status text := 'draft';
  review_reason text;
  line_count integer;
begin
  select *
  into session_record
  from public.sessions
  where id = target_session_id
    and deleted_at is null
  for update;

  if session_record.id is null then
    raise exception 'Session not found';
  end if;

  if not public.has_tenant_role(session_record.tenant_id, array['admin', 'finance']) then
    raise exception 'Not allowed to create draft invoices for this session';
  end if;

  if session_record.session_status <> 'completed' then
    raise exception 'Draft invoices can only be created from completed sessions';
  end if;

  select i.*
  into existing_invoice
  from public.invoices i
  where i.tenant_id = session_record.tenant_id
    and i.session_id = session_record.id
    and i.source_type = 'session'
    and i.invoice_status not in ('cancelled', 'voided')
    and i.deleted_at is null;

  if existing_invoice.id is not null then
    invoice_id := existing_invoice.id;
    created_invoice := false;
    invoice_status := existing_invoice.invoice_status;
    return next;
    return;
  end if;

  select *
  into workflow_event
  from public.session_workflow_events
  where tenant_id = session_record.tenant_id
    and session_id = session_record.id
    and event_type = 'draft_invoice_requested'
    and deleted_at is null
  order by created_at desc
  limit 1;

  if workflow_event.id is null then
    raise exception 'Session has no draft invoice request event';
  end if;

  select *
  into patient_record
  from public.patients
  where id = session_record.patient_id
    and tenant_id = session_record.tenant_id
    and deleted_at is null;

  if patient_record.id is null then
    raise exception 'Invoice patient not found';
  end if;

  if patient_record.patient_status in ('archived', 'merged') then
    raise exception 'Cannot create draft invoice for archived or merged patient';
  end if;

  select *
  into responsible_party_record
  from public.responsible_parties
  where tenant_id = session_record.tenant_id
    and patient_id = session_record.patient_id
    and deleted_at is null
  order by is_billing_contact desc, is_primary desc, created_at asc
  limit 1;

  select *
  into billing_record
  from public.billing_settings
  where tenant_id = session_record.tenant_id
    and deleted_at is null
  order by created_at desc
  limit 1;

  select *
  into practice_record
  from public.practice_profiles
  where tenant_id = session_record.tenant_id
    and deleted_at is null
  order by created_at desc
  limit 1;

  select *
  into branding_record
  from public.practice_branding
  where tenant_id = session_record.tenant_id
    and deleted_at is null
  order by created_at desc
  limit 1;

  if session_record.therapist_profile_id is not null then
    select * into therapist_record from public.therapist_profiles where id = session_record.therapist_profile_id and deleted_at is null;
    select * into registration_record from public.professional_registrations where therapist_profile_id = session_record.therapist_profile_id and deleted_at is null and is_active = true order by is_primary desc, created_at asc limit 1;
  end if;

  if session_record.practice_location_id is not null then
    select * into location_record from public.practice_locations where id = session_record.practice_location_id and deleted_at is null;
  end if;

  if billing_record.default_bank_account_id is not null then
    select * into bank_record from public.bank_accounts where id = billing_record.default_bank_account_id and tenant_id = session_record.tenant_id and deleted_at is null and is_active = true;
  end if;

  select count(*)
  into line_count
  from public.session_procedures sp
  where sp.session_id = session_record.id
    and sp.tenant_id = session_record.tenant_id
    and sp.deleted_at is null
    and sp.is_billable = true;

  if line_count = 0 then
    raise exception 'At least one billable session procedure is required';
  end if;

  if responsible_party_record.id is null then
    review_reason := concat_ws('; ', review_reason, 'Responsible party requires review');
  end if;

  if billing_record.id is null then
    review_reason := concat_ws('; ', review_reason, 'Billing settings require review');
  end if;

  if bank_record.id is null then
    review_reason := concat_ws('; ', review_reason, 'Banking details require review');
  end if;

  if review_reason is not null then
    draft_status := 'review_required';
  end if;

  insert into public.invoices (
    tenant_id,
    patient_id,
    responsible_party_id,
    booking_id,
    session_id,
    therapist_profile_id,
    practice_location_id,
    source_workflow_event_id,
    source_type,
    invoice_status,
    draft_reference,
    invoice_prefix,
    invoice_date,
    service_date,
    due_date,
    payment_terms_days,
    currency_code,
    review_required_at,
    review_required_reason,
    created_by_profile_id,
    updated_by_profile_id,
    metadata
  )
  values (
    session_record.tenant_id,
    session_record.patient_id,
    responsible_party_record.id,
    session_record.booking_id,
    session_record.id,
    session_record.therapist_profile_id,
    session_record.practice_location_id,
    workflow_event.id,
    'session',
    draft_status,
    'DRAFT-' || upper(substr(gen_random_uuid()::text, 1, 8)),
    coalesce(billing_record.invoice_prefix, 'INV'),
    current_date,
    coalesce(session_record.actual_start_at::date, session_record.scheduled_start_at::date, current_date),
    current_date + coalesce(billing_record.payment_terms_days, 7),
    coalesce(billing_record.payment_terms_days, 7),
    coalesce(practice_record.default_currency, 'ZAR'),
    case when draft_status = 'review_required' then now() else null end,
    review_reason,
    auth.uid(),
    auth.uid(),
    jsonb_build_object('source_session_status', session_record.session_status)
  )
  returning id into new_invoice_id;

  insert into public.invoice_lines (
    tenant_id,
    invoice_id,
    source_session_procedure_id,
    source_booking_procedure_id,
    source_price_list_item_id,
    therapist_profile_id,
    practice_location_id,
    line_type,
    line_order,
    service_date,
    procedure_name,
    procedure_code,
    description,
    icd10_code,
    quantity,
    unit_price,
    discount_amount,
    adjustment_amount,
    currency_code,
    created_by_profile_id,
    updated_by_profile_id
  )
  select
    sp.tenant_id,
    new_invoice_id,
    sp.id,
    sp.booking_procedure_id,
    sp.price_list_item_id,
    session_record.therapist_profile_id,
    session_record.practice_location_id,
    'session_procedure',
    row_number() over (order by sp.created_at, sp.id),
    coalesce(session_record.actual_start_at::date, session_record.scheduled_start_at::date, current_date),
    sp.procedure_name,
    sp.procedure_code,
    sp.description,
    patient_record.active_icd10_code,
    sp.quantity,
    sp.unit_price,
    sp.discount_amount,
    sp.adjustment_amount,
    sp.currency_code,
    auth.uid(),
    auth.uid()
  from public.session_procedures sp
  where sp.session_id = session_record.id
    and sp.tenant_id = session_record.tenant_id
    and sp.deleted_at is null
    and sp.is_billable = true;

  insert into public.invoice_party_snapshots (
    tenant_id,
    invoice_id,
    patient_id,
    responsible_party_id,
    patient_full_name,
    patient_number,
    patient_date_of_birth,
    patient_id_number,
    patient_icd10_code,
    responsible_party_name,
    responsible_party_type,
    relationship_to_patient,
    responsible_party_id_number,
    billing_email,
    billing_phone,
    organisation_name,
    medical_aid_context,
    snapshot,
    created_by_profile_id,
    updated_by_profile_id
  )
  values (
    session_record.tenant_id,
    new_invoice_id,
    patient_record.id,
    responsible_party_record.id,
    btrim(patient_record.first_name || ' ' || patient_record.last_name),
    patient_record.patient_number,
    patient_record.date_of_birth,
    patient_record.id_number,
    patient_record.active_icd10_code,
    responsible_party_record.full_name,
    responsible_party_record.party_type,
    responsible_party_record.relationship_to_patient,
    responsible_party_record.id_number,
    coalesce(responsible_party_record.email, patient_record.email),
    coalesce(responsible_party_record.phone, patient_record.phone),
    responsible_party_record.organisation_name,
    jsonb_build_object(
      'member_number', responsible_party_record.medical_aid_member_number,
      'dependant_code', responsible_party_record.medical_aid_dependant_code
    ),
    jsonb_build_object('patient_status', patient_record.patient_status),
    auth.uid(),
    auth.uid()
  );

  insert into public.invoice_issuer_snapshots (
    tenant_id,
    invoice_id,
    practice_profile_id,
    therapist_profile_id,
    practice_location_id,
    bank_account_id,
    practice_legal_name,
    practice_trading_name,
    practice_registration_number,
    practice_tax_number,
    practice_vat_number,
    practice_email,
    practice_phone,
    practice_website,
    practice_address,
    therapist_name,
    therapist_profession,
    therapist_practice_number,
    therapist_registration,
    location_name,
    location_address,
    bank_account_holder,
    bank_name,
    bank_account_number,
    bank_branch_code,
    bank_account_type,
    branding,
    currency_code,
    payment_terms_days,
    snapshot,
    created_by_profile_id,
    updated_by_profile_id
  )
  values (
    session_record.tenant_id,
    new_invoice_id,
    practice_record.id,
    therapist_record.id,
    location_record.id,
    bank_record.id,
    practice_record.legal_name,
    practice_record.trading_name,
    practice_record.business_registration_number,
    practice_record.tax_number,
    practice_record.vat_number,
    practice_record.main_email,
    practice_record.main_phone,
    practice_record.website,
    jsonb_build_object('country', practice_record.default_country),
    therapist_record.display_name,
    therapist_record.profession,
    case
      when coalesce((billing_record.metadata ->> 'allow_therapist_practice_number_overrides')::boolean, false) then therapist_record.practice_number
      else null
    end,
    jsonb_build_object(
      'registration_body', registration_record.registration_body,
      'registration_number', registration_record.registration_number,
      'registration_type', registration_record.registration_type
    ),
    location_record.location_name,
    jsonb_build_object(
      'address_line_1', location_record.address_line_1,
      'address_line_2', location_record.address_line_2,
      'suburb', location_record.suburb,
      'city', location_record.city,
      'province', location_record.province,
      'postal_code', location_record.postal_code,
      'country', location_record.country
    ),
    bank_record.account_holder,
    bank_record.bank_name,
    bank_record.account_number,
    bank_record.branch_code,
    bank_record.account_type,
    jsonb_build_object(
      'logo_url', branding_record.logo_url,
      'primary_colour', branding_record.primary_colour,
      'invoice_logo_position', branding_record.invoice_logo_position,
      'patient_facing_display_name', branding_record.patient_facing_display_name
    ),
    coalesce(practice_record.default_currency, 'ZAR'),
    coalesce(billing_record.payment_terms_days, 7),
    jsonb_build_object('billing_settings_id', billing_record.id),
    auth.uid(),
    auth.uid()
  );

  perform public.recalculate_invoice_totals(new_invoice_id);

  insert into public.invoice_status_history (
    tenant_id,
    invoice_id,
    session_id,
    booking_id,
    patient_id,
    to_status,
    event_type,
    event_reason,
    created_by_profile_id
  )
  values (
    session_record.tenant_id,
    new_invoice_id,
    session_record.id,
    session_record.booking_id,
    session_record.patient_id,
    draft_status,
    case when draft_status = 'review_required' then 'draft_invoice_review_required' else 'draft_invoice_created' end,
    coalesce(review_reason, 'Draft invoice created from completed session'),
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
  values (
    session_record.tenant_id,
    new_invoice_id,
    session_record.id,
    session_record.booking_id,
    session_record.patient_id,
    'draft_invoice_created',
    'invoice:' || new_invoice_id::text || ':draft_invoice_created:v1',
    jsonb_build_object('source_workflow_event_id', workflow_event.id),
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
    occurred_at,
    created_by_profile_id,
    metadata
  )
  values (
    session_record.tenant_id,
    session_record.patient_id,
    'draft_invoice_created',
    'Draft invoice created',
    'A draft invoice was created from the completed session.',
    'invoices',
    new_invoice_id,
    false,
    now(),
    auth.uid(),
    jsonb_build_object('session_id', session_record.id, 'booking_id', session_record.booking_id)
  );

  invoice_id := new_invoice_id;
  created_invoice := true;
  invoice_status := draft_status;
  return next;
end;
$$;


revoke all on function public.create_draft_invoice_from_session(uuid) from public, anon;
grant execute on function public.create_draft_invoice_from_session(uuid) to authenticated;

comment on function public.create_draft_invoice_from_session(uuid) is
  'Creates or returns the active draft invoice for a completed session. Qualified invoice fields prevent PL/pgSQL output-column ambiguity.';

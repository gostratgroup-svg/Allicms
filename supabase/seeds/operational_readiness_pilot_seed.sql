-- AlliDesk operational-readiness pilot seed.
--
-- Purpose:
--   Create a small, fictional, repeatable smoke-test data set for a confirmed
--   development or staging Supabase project.
--
-- Safety:
--   - Do not run against production or any database containing real patient data.
--   - This script does not create Supabase Auth users.
--   - Create a test Auth user manually first, then pass its auth.users.id as
--     pilot_admin_profile_id.
--   - No passwords, tokens, or service-role secrets belong in this file.
--
-- Example psql usage after confirming the target is safe:
--   psql "$SUPABASE_DB_URL" \
--     -v pilot_admin_profile_id='00000000-0000-0000-0000-000000000000' \
--     -f supabase/seeds/operational_readiness_pilot_seed.sql

\if :{?pilot_admin_profile_id}
\else
  \echo 'Missing required psql variable: pilot_admin_profile_id'
  \echo 'Create a development Supabase Auth user first, then rerun with -v pilot_admin_profile_id=<auth.users.id>'
  \quit 1
\endif

begin;

create temp table operational_readiness_seed_context as
select :'pilot_admin_profile_id'::uuid as pilot_admin_profile_id;

do $$
declare
  pilot_admin_profile_id uuid := (select operational_readiness_seed_context.pilot_admin_profile_id from operational_readiness_seed_context limit 1);
  pilot_tenant_id uuid := '10000000-0000-4000-8000-000000000001';
  pilot_practice_profile_id uuid := '10000000-0000-4000-8000-000000000002';
  pilot_location_id uuid := '10000000-0000-4000-8000-000000000003';
  pilot_bank_account_id uuid := '10000000-0000-4000-8000-000000000004';
  pilot_billing_settings_id uuid := '10000000-0000-4000-8000-000000000005';
  pilot_branding_id uuid := '10000000-0000-4000-8000-000000000006';
  pilot_therapist_id uuid := '10000000-0000-4000-8000-000000000007';
  pilot_price_list_id uuid := '10000000-0000-4000-8000-000000000008';
  pilot_price_item_id uuid := '10000000-0000-4000-8000-000000000009';
  pilot_patient_id uuid := '10000000-0000-4000-8000-000000000010';
  pilot_responsible_party_id uuid := '10000000-0000-4000-8000-000000000011';
  pilot_booking_id uuid := '10000000-0000-4000-8000-000000000012';
  pilot_booking_procedure_id uuid := '10000000-0000-4000-8000-000000000013';
  pilot_session_id uuid := '10000000-0000-4000-8000-000000000014';
  pilot_session_procedure_id uuid := '10000000-0000-4000-8000-000000000015';
  pilot_invoice_id uuid := '10000000-0000-4000-8000-000000000016';
  pilot_invoice_line_id uuid := '10000000-0000-4000-8000-000000000017';
  pilot_financial_account_id uuid := '10000000-0000-4000-8000-000000000018';
  pilot_patient_link_id uuid := '10000000-0000-4000-8000-000000000019';
  pilot_workflow_definition_id uuid := '10000000-0000-4000-8000-000000000020';
  pilot_workflow_version_id uuid := '10000000-0000-4000-8000-000000000021';
  pilot_tenant_subscription_id uuid := '10000000-0000-4000-8000-000000000022';
  isolation_tenant_b_id uuid := '20000000-0000-4000-8000-000000000001';
  isolation_patient_b_id uuid := '20000000-0000-4000-8000-000000000002';
begin
  if not exists (select 1 from auth.users where id = pilot_admin_profile_id) then
    raise exception 'No auth.users row found for pilot_admin_profile_id %. Create the test Auth user first.', pilot_admin_profile_id;
  end if;

  insert into public.profiles (id, first_name, last_name, email, phone, is_super_admin)
  values (pilot_admin_profile_id, 'Pilot', 'Admin', 'pilot.admin@example.test', '+27000000000', false)
  on conflict (id) do update
  set first_name = excluded.first_name,
      last_name = excluded.last_name,
      email = excluded.email,
      phone = excluded.phone,
      is_super_admin = false,
      deleted_at = null;

  insert into public.tenants (
    id, practice_name, trading_name, primary_contact_name, primary_contact_email,
    primary_contact_phone, country, time_zone, tenant_status, metadata
  )
  values (
    pilot_tenant_id, 'AlliDesk Pilot Practice', 'AlliDesk Pilot',
    'Pilot Admin', 'pilot.admin@example.test', '+27000000000',
    'South Africa', 'Africa/Johannesburg', 'trial',
    jsonb_build_object('seed_key', 'operational_readiness_pilot', 'fictional_data', true)
  )
  on conflict (id) do update
  set practice_name = excluded.practice_name,
      trading_name = excluded.trading_name,
      primary_contact_name = excluded.primary_contact_name,
      primary_contact_email = excluded.primary_contact_email,
      primary_contact_phone = excluded.primary_contact_phone,
      tenant_status = excluded.tenant_status,
      metadata = excluded.metadata,
      deleted_at = null;

  insert into public.tenants (
    id, practice_name, trading_name, primary_contact_name, primary_contact_email,
    primary_contact_phone, country, time_zone, tenant_status, metadata
  )
  values (
    isolation_tenant_b_id, 'AlliDesk Isolation Tenant B', 'Isolation Tenant B',
    'Isolation Admin', 'tenant.b@example.test', '+27000000002',
    'South Africa', 'Africa/Johannesburg', 'trial',
    jsonb_build_object('seed_key', 'operational_readiness_isolation_b', 'fictional_data', true)
  )
  on conflict (id) do update
  set practice_name = excluded.practice_name,
      trading_name = excluded.trading_name,
      primary_contact_name = excluded.primary_contact_name,
      primary_contact_email = excluded.primary_contact_email,
      primary_contact_phone = excluded.primary_contact_phone,
      tenant_status = excluded.tenant_status,
      metadata = excluded.metadata,
      deleted_at = null;

  insert into public.tenant_users (tenant_id, profile_id, role, is_active, activated_at)
  values (pilot_tenant_id, pilot_admin_profile_id, 'admin', true, now())
  on conflict (tenant_id, profile_id) do update
  set role = 'admin',
      is_active = true,
      activated_at = coalesce(public.tenant_users.activated_at, now()),
      deleted_at = null;

  insert into public.tenant_subscriptions (
    id, tenant_id, subscription_plan_id, subscription_status, billing_cycle,
    trial_started_at, trial_ends_at, current_period_starts_at, current_period_ends_at,
    next_billing_date, metadata
  )
  values (
    pilot_tenant_subscription_id,
    pilot_tenant_id,
    (select id from public.subscription_plans where plan_code = 'free' limit 1),
    'trial', 'monthly', now(), now() + interval '30 days',
    now(), now() + interval '30 days', (current_date + 30),
    jsonb_build_object('seed_key', 'operational_readiness_pilot')
  )
  on conflict (id) do update
  set subscription_status = 'trial',
      billing_cycle = 'monthly',
      deleted_at = null;

  insert into public.practice_profiles (
    id, tenant_id, legal_name, trading_name, main_email, main_phone,
    website, default_time_zone, default_country, default_currency, profile_status
  )
  values (
    pilot_practice_profile_id, pilot_tenant_id, 'AlliDesk Pilot Practice (Pty) Ltd',
    'AlliDesk Pilot Practice', 'hello@example.test', '+27110000000',
    'https://example.test', 'Africa/Johannesburg', 'South Africa', 'ZAR', 'active'
  )
  on conflict (id) do update
  set legal_name = excluded.legal_name,
      trading_name = excluded.trading_name,
      main_email = excluded.main_email,
      main_phone = excluded.main_phone,
      profile_status = 'active',
      deleted_at = null;

  insert into public.practice_locations (
    id, tenant_id, practice_profile_id, location_name, location_type,
    address_line_1, suburb, city, province, postal_code, contact_email,
    contact_phone, is_main_location, is_active
  )
  values (
    pilot_location_id, pilot_tenant_id, pilot_practice_profile_id, 'Main Practice',
    'practice', '1 Pilot Street', 'Test Suburb', 'Cape Town', 'Western Cape',
    '8001', 'hello@example.test', '+27110000000', true, true
  )
  on conflict (id) do update
  set location_name = excluded.location_name,
      is_main_location = true,
      is_active = true,
      deleted_at = null;

  insert into public.bank_accounts (
    id, tenant_id, owner_type, account_label, bank_name, account_holder,
    account_number, branch_code, account_type, is_default, is_active
  )
  values (
    pilot_bank_account_id, pilot_tenant_id, 'tenant', 'Pilot default account',
    'Pilot Bank', 'AlliDesk Pilot Practice', '0000000000', '000000',
    'cheque', true, true
  )
  on conflict (id) do update
  set is_default = true,
      is_active = true,
      deleted_at = null;

  insert into public.billing_settings (
    id, tenant_id, practice_profile_id, invoice_prefix, next_invoice_number,
    statement_prefix, next_statement_number, payment_terms_days,
    default_bank_account_id, allow_price_override
  )
  values (
    pilot_billing_settings_id, pilot_tenant_id, pilot_practice_profile_id,
    'PILOT-INV', 1, 'PILOT-ST', 1, 7, pilot_bank_account_id, true
  )
  on conflict (id) do update
  set invoice_prefix = excluded.invoice_prefix,
      statement_prefix = excluded.statement_prefix,
      default_bank_account_id = excluded.default_bank_account_id,
      deleted_at = null;

  insert into public.practice_branding (
    id, tenant_id, practice_profile_id, patient_facing_display_name,
    primary_colour, document_branding_enabled, patient_link_branding_enabled
  )
  values (
    pilot_branding_id, pilot_tenant_id, pilot_practice_profile_id,
    'AlliDesk Pilot Practice', '#22146f', true, true
  )
  on conflict (id) do update
  set patient_facing_display_name = excluded.patient_facing_display_name,
      primary_colour = excluded.primary_colour,
      deleted_at = null;

  insert into public.therapist_profiles (
    id, tenant_id, user_id, display_name, profession, qualifications,
    default_appointment_duration_minutes, default_billing_rate,
    practice_number, billing_name, billing_email, billing_phone, is_active
  )
  values (
    pilot_therapist_id, pilot_tenant_id, pilot_admin_profile_id, 'Pilot Therapist',
    'Occupational Therapist', 'BSc OT', 60, 780, 'PILOT-OT-001',
    'Pilot Therapist', 'therapist@example.test', '+27110000001', true
  )
  on conflict (id) do update
  set display_name = excluded.display_name,
      is_active = true,
      deleted_at = null;

  insert into public.price_lists (id, tenant_id, name, description, list_type, is_default, is_active)
  values (pilot_price_list_id, pilot_tenant_id, 'Pilot Cash Rates', 'Operational readiness smoke-test rates', 'cash', true, true)
  on conflict (id) do update
  set name = excluded.name,
      is_default = true,
      is_active = true,
      deleted_at = null;

  insert into public.price_list_items (
    id, tenant_id, price_list_id, procedure_name, procedure_code,
    description, price, duration_minutes, is_active
  )
  values (
    pilot_price_item_id, pilot_tenant_id, pilot_price_list_id,
    'Therapy session', 'PILOT-THER-60', 'Fictional pilot therapy session', 780, 60, true
  )
  on conflict (id) do update
  set procedure_name = excluded.procedure_name,
      price = excluded.price,
      is_active = true,
      deleted_at = null;

  insert into public.patients (
    id, tenant_id, patient_number, patient_status, patient_type, first_name,
    last_name, date_of_birth, email, phone, active_icd10_code,
    assigned_therapist_profile_id, metadata, created_by_profile_id
  )
  values (
    pilot_patient_id, pilot_tenant_id, 'PILOT-PT-001', 'active', 'child',
    'Fictional', 'Patient', date '2018-04-10', 'guardian@example.test',
    '+27000000001', 'F82', pilot_therapist_id,
    jsonb_build_object('seed_key', 'operational_readiness_pilot', 'fictional_data', true),
    pilot_admin_profile_id
  )
  on conflict (id) do update
  set patient_status = 'active',
      active_icd10_code = 'F82',
      assigned_therapist_profile_id = pilot_therapist_id,
      deleted_at = null;

  insert into public.patients (
    id, tenant_id, patient_number, patient_status, patient_type, first_name,
    last_name, date_of_birth, email, phone, active_icd10_code, metadata
  )
  values (
    isolation_patient_b_id, isolation_tenant_b_id, 'ISOLATION-B-PT-001',
    'active', 'adult', 'Isolation', 'Patient B', date '1990-01-01',
    'patient.b@example.test', '+27000000003', 'Z00.0',
    jsonb_build_object('seed_key', 'operational_readiness_isolation_b', 'fictional_data', true)
  )
  on conflict (id) do update
  set patient_status = 'active',
      active_icd10_code = 'Z00.0',
      deleted_at = null;

  insert into public.responsible_parties (
    id, tenant_id, patient_id, party_type, relationship_to_patient, full_name,
    id_number, email, phone, is_primary, is_billing_contact,
    medical_aid_dependant_code, created_by_profile_id
  )
  values (
    pilot_responsible_party_id, pilot_tenant_id, pilot_patient_id, 'person',
    'parent_guardian', 'Fictional Guardian', '0000000000000',
    'guardian@example.test', '+27000000001', true, true, '01',
    pilot_admin_profile_id
  )
  on conflict (id) do update
  set full_name = excluded.full_name,
      is_primary = true,
      is_billing_contact = true,
      deleted_at = null;

  insert into public.financial_accounts (
    id, tenant_id, patient_id, responsible_party_id, account_type,
    account_name, account_reference, currency_code, account_status
  )
  values (
    pilot_financial_account_id, pilot_tenant_id, pilot_patient_id,
    pilot_responsible_party_id, 'patient', 'Fictional Patient Account',
    'PILOT-ACC-001', 'ZAR', 'active'
  )
  on conflict (id) do update
  set account_status = 'active',
      deleted_at = null;

  insert into public.bookings (
    id, tenant_id, patient_id, therapist_profile_id, practice_location_id,
    price_list_id, booking_status, booking_type, booking_source,
    appointment_mode, start_at, end_at, duration_minutes, timezone,
    room_label, patient_facing_title, session_ready, draft_invoice_ready,
    created_by_profile_id
  )
  values (
    pilot_booking_id, pilot_tenant_id, pilot_patient_id, pilot_therapist_id,
    pilot_location_id, pilot_price_list_id, 'confirmed', 'standard',
    'internal', 'in_person', timestamptz '2026-08-03 08:30:00+02',
    timestamptz '2026-08-03 09:30:00+02', 60, 'Africa/Johannesburg',
    'Room 1', 'Therapy session', true, false, pilot_admin_profile_id
  )
  on conflict (id) do update
  set booking_status = 'confirmed',
      session_ready = true,
      deleted_at = null;

  insert into public.booking_procedures (
    id, tenant_id, booking_id, price_list_id, price_list_item_id,
    procedure_name, procedure_code, description, unit_price, quantity,
    line_total, duration_minutes, currency_code, is_billable, created_by_profile_id
  )
  values (
    pilot_booking_procedure_id, pilot_tenant_id, pilot_booking_id,
    pilot_price_list_id, pilot_price_item_id, 'Therapy session',
    'PILOT-THER-60', 'Fictional pilot therapy session', 780, 1,
    780, 60, 'ZAR', true, pilot_admin_profile_id
  )
  on conflict (id) do update
  set line_total = 780,
      is_billable = true,
      deleted_at = null;

  insert into public.sessions (
    id, tenant_id, booking_id, patient_id, therapist_profile_id,
    practice_location_id, session_status, attendance_outcome, session_type,
    session_modality, scheduled_start_at, scheduled_end_at, timezone,
    room_label, created_by_profile_id
  )
  values (
    pilot_session_id, pilot_tenant_id, pilot_booking_id, pilot_patient_id,
    pilot_therapist_id, pilot_location_id, 'ready', 'not_recorded',
    'standard', 'in_person', timestamptz '2026-08-03 08:30:00+02',
    timestamptz '2026-08-03 09:30:00+02', 'Africa/Johannesburg',
    'Room 1', pilot_admin_profile_id
  )
  on conflict (id) do update
  set session_status = 'ready',
      deleted_at = null;

  insert into public.session_procedures (
    id, tenant_id, session_id, booking_procedure_id, price_list_id,
    price_list_item_id, procedure_name, procedure_code, description,
    unit_price, quantity, line_total, duration_minutes, currency_code,
    is_billable, created_by_profile_id
  )
  values (
    pilot_session_procedure_id, pilot_tenant_id, pilot_session_id,
    pilot_booking_procedure_id, pilot_price_list_id, pilot_price_item_id,
    'Therapy session', 'PILOT-THER-60', 'Fictional pilot therapy session',
    780, 1, 780, 60, 'ZAR', true, pilot_admin_profile_id
  )
  on conflict (id) do update
  set line_total = 780,
      is_billable = true,
      deleted_at = null;

  insert into public.invoices (
    id, tenant_id, patient_id, responsible_party_id, booking_id, session_id,
    therapist_profile_id, practice_location_id, source_type, invoice_status,
    draft_reference, invoice_date, service_date, payment_terms_days,
    due_date, currency_code, subtotal_amount, total_amount, balance_due,
    ready_to_confirm_at, patient_link_visible, patient_link_update_ready,
    created_by_profile_id
  )
  values (
    pilot_invoice_id, pilot_tenant_id, pilot_patient_id,
    pilot_responsible_party_id, pilot_booking_id, pilot_session_id,
    pilot_therapist_id, pilot_location_id, 'session', 'ready_to_confirm',
    'PILOT-DRAFT-001', current_date, date '2026-08-03', 7,
    current_date + 7, 'ZAR', 780, 780, 780, now(), false, false, pilot_admin_profile_id
  )
  on conflict (id) do update
  set invoice_status = 'ready_to_confirm',
      due_date = excluded.due_date,
      subtotal_amount = 780,
      total_amount = 780,
      balance_due = 780,
      deleted_at = null;

  insert into public.invoice_lines (
    id, tenant_id, invoice_id, source_session_procedure_id,
    source_booking_procedure_id, source_price_list_item_id,
    therapist_profile_id, practice_location_id, line_type, line_order,
    service_date, procedure_name, procedure_code, description, icd10_code,
    quantity, unit_price, line_subtotal, line_total, currency_code,
    created_by_profile_id
  )
  values (
    pilot_invoice_line_id, pilot_tenant_id, pilot_invoice_id,
    pilot_session_procedure_id, pilot_booking_procedure_id,
    pilot_price_item_id, pilot_therapist_id, pilot_location_id,
    'session_procedure', 1, date '2026-08-03', 'Therapy session',
    'PILOT-THER-60', 'Fictional pilot therapy session', 'F82',
    1, 780, 780, 780, 'ZAR', pilot_admin_profile_id
  )
  on conflict (id) do update
  set line_total = 780,
      deleted_at = null;

  insert into public.patient_links (
    id, tenant_id, patient_id, link_token, public_identifier, credential_hash,
    link_status, requires_intake, metadata, created_by_profile_id
  )
  values (
    pilot_patient_link_id, pilot_tenant_id, pilot_patient_id,
    'pilot-link-token-not-for-production',
    'pilot-public-identifier-not-for-production',
    encode(extensions.digest('pilot-link-token-not-for-production', 'sha256'), 'hex'),
    'active', true,
    jsonb_build_object('seed_key', 'operational_readiness_pilot', 'note', 'do not expose as a real patient link'),
    pilot_admin_profile_id
  )
  on conflict (id) do update
  set link_status = 'active',
      public_identifier = excluded.public_identifier,
      credential_hash = excluded.credential_hash,
      requires_intake = true,
      deleted_at = null;

  insert into public.workflow_definitions (
    id, tenant_id, workflow_key, name, description, category,
    workflow_owner_type, status, is_system_workflow, tenant_disable_allowed,
    tenant_clone_allowed, metadata, created_by_profile_id
  )
  values (
    pilot_workflow_definition_id, pilot_tenant_id,
    'pilot_booking_created_follow_up', 'Pilot booking follow-up',
    'Development-only smoke-test workflow definition.',
    'operational_readiness', 'tenant', 'draft', false, true, true,
    jsonb_build_object('seed_key', 'operational_readiness_pilot'),
    pilot_admin_profile_id
  )
  on conflict (id) do update
  set status = 'draft',
      deleted_at = null;

  insert into public.workflow_definition_versions (
    id, tenant_id, workflow_definition_id, version_number, trigger_type,
    trigger_event_type, trigger_config, condition_config, action_config,
    timezone_strategy, status, created_by_profile_id
  )
  values (
    pilot_workflow_version_id, pilot_tenant_id, pilot_workflow_definition_id,
    1, 'domain_event', 'booking.created',
    jsonb_build_object('source_domain', 'booking'),
    '[]'::jsonb,
    jsonb_build_array(jsonb_build_object('type', 'staff_task', 'title', 'Review new pilot booking')),
    'tenant_default', 'draft', pilot_admin_profile_id
  )
  on conflict (id) do update
  set status = 'draft',
      deleted_at = null;

  insert into public.audit_events (tenant_id, actor_profile_id, action, entity_table, entity_id, metadata)
  values (
    pilot_tenant_id, pilot_admin_profile_id, 'seed.operational_readiness_pilot.upserted',
    'tenants', pilot_tenant_id,
    jsonb_build_object('seed_key', 'operational_readiness_pilot', 'fictional_data', true)
  );
end $$;

commit;

-- Optional authenticated smoke path after seeding:
-- 1. Sign into the app as the pilot test Auth user.
-- 2. Complete the ready session through the UI or call complete_session as that
--    authenticated user.
-- 3. Create/confirm/issue an invoice through Finance.
-- 4. Record a manual payment through Finance.
-- These steps intentionally require a real authenticated context and are not
-- performed by this service/admin seed.

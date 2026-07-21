-- AlliDesk operational-readiness schema smoke checks.
--
-- Purpose:
--   Read-only checks for a confirmed development/staging Supabase project after
--   migrations are applied.
--
-- Safety:
--   - This file is read-only.
--   - It does not validate user-level RLS by itself.
--   - User-level RLS validation must use real authenticated JWT contexts.

with expected_tables(table_name) as (
  values
    ('tenants'),
    ('profiles'),
    ('tenant_users'),
    ('practice_profiles'),
    ('practice_locations'),
    ('therapist_profiles'),
    ('patients'),
    ('responsible_parties'),
    ('bookings'),
    ('sessions'),
    ('clinical_encounters'),
    ('clinical_notes'),
    ('clinical_note_templates'),
    ('clinical_template_sections'),
    ('invoices'),
    ('invoice_lines'),
    ('payments'),
    ('payment_allocations'),
    ('receipts'),
    ('patient_links'),
    ('patient_link_sessions'),
    ('workflow_definitions'),
    ('workflow_definition_versions'),
    ('workflow_event_outbox'),
    ('workflow_scheduled_jobs'),
    ('audit_events')
)
select
  expected_tables.table_name,
  case when pg_class.oid is null then 'missing' else 'present' end as table_status,
  coalesce(pg_class.relrowsecurity, false) as rls_enabled
from expected_tables
left join pg_class on pg_class.relname = expected_tables.table_name
left join pg_namespace on pg_namespace.oid = pg_class.relnamespace and pg_namespace.nspname = 'public'
order by expected_tables.table_name;

with expected_functions(function_name) as (
  values
    ('create_session_from_booking'),
    ('complete_session'),
    ('create_draft_invoice_from_session'),
    ('confirm_invoice'),
    ('issue_invoice'),
    ('record_payment'),
    ('allocate_payment'),
    ('reverse_payment'),
    ('create_or_get_patient_link'),
    ('request_patient_link_verification'),
    ('verify_patient_link'),
    ('create_patient_link_session'),
    ('revoke_patient_link_session'),
    ('enqueue_workflow_event'),
    ('claim_workflow_outbox_events'),
    ('claim_workflow_scheduled_jobs')
)
select
  expected_functions.function_name,
  case when pg_proc.oid is null then 'missing' else 'present' end as function_status
from expected_functions
left join pg_proc on pg_proc.proname = expected_functions.function_name
left join pg_namespace on pg_namespace.oid = pg_proc.pronamespace and pg_namespace.nspname = 'public'
order by expected_functions.function_name;

select
  table_schema,
  table_name,
  column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'practice_profiles', 'practice_locations', 'therapist_profiles',
    'patients', 'bookings', 'sessions', 'invoices', 'payments',
    'patient_links', 'workflow_event_outbox'
  )
  and column_name = 'tenant_id'
order by table_name;

select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'tenants', 'tenant_users', 'practice_profiles', 'patients',
    'bookings', 'sessions', 'invoices', 'payments', 'patient_links',
    'workflow_event_outbox', 'clinical_notes'
  )
order by tablename, policyname;

select
  plan_code,
  plan_name,
  is_active,
  is_public
from public.subscription_plans
order by plan_code;

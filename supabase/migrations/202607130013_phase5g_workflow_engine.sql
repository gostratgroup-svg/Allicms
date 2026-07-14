-- AlliDesk Phase 5G Step 2: Workflow Engine database foundation.
--
-- This migration adds the central workflow orchestration foundation without
-- replacing any domain-owned workflow-event tables and without implementing a
-- worker runtime, communication delivery, external actions, AI, or frontend UI.

create table public.workflow_event_outbox (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  event_type text not null,
  event_version integer not null default 1,
  source_domain text not null,
  source_table text not null,
  source_event_id uuid,
  source_record_id uuid,
  patient_id uuid references public.patients(id) on delete set null,
  responsible_party_id uuid references public.responsible_parties(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  patient_link_id uuid references public.patient_links(id) on delete set null,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  correlation_id uuid not null default gen_random_uuid(),
  causation_id uuid,
  idempotency_key text not null,
  payload jsonb not null default '{}'::jsonb,
  priority integer not null default 100,
  available_at timestamptz not null default now(),
  processing_status text not null default 'pending',
  attempt_count integer not null default 0,
  max_attempts integer not null default 5,
  locked_at timestamptz,
  locked_by text,
  completed_at timestamptz,
  failed_at timestamptz,
  last_error_code text,
  last_error_summary text,
  dead_lettered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint workflow_event_outbox_event_version_check check (event_version > 0),
  constraint workflow_event_outbox_source_domain_check
    check (source_domain in ('booking', 'session', 'invoice', 'payment', 'patient_link', 'patient', 'system')),
  constraint workflow_event_outbox_status_check
    check (processing_status in ('pending', 'scheduled', 'processing', 'processed', 'failed', 'ignored', 'dead_lettered', 'cancelled')),
  constraint workflow_event_outbox_attempts_check check (attempt_count >= 0 and max_attempts > 0),
  constraint workflow_event_outbox_priority_check check (priority between 0 and 1000),
  constraint workflow_event_outbox_idempotency_not_blank_check check (btrim(idempotency_key) <> ''),
  constraint workflow_event_outbox_error_summary_safe_check
    check (last_error_summary is null or char_length(last_error_summary) <= 1000),
  constraint workflow_event_outbox_payload_object_check check (jsonb_typeof(payload) = 'object')
);

create table public.workflow_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  workflow_key text not null,
  name text not null,
  description text,
  category text not null default 'system',
  workflow_owner_type text not null default 'system',
  status text not null default 'draft',
  active_version_id uuid,
  is_system_workflow boolean not null default false,
  tenant_disable_allowed boolean not null default true,
  tenant_clone_allowed boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workflow_definitions_owner_type_check check (workflow_owner_type in ('system', 'tenant')),
  constraint workflow_definitions_status_check check (status in ('draft', 'active', 'paused', 'disabled', 'archived')),
  constraint workflow_definitions_key_not_blank_check check (btrim(workflow_key) <> ''),
  constraint workflow_definitions_name_not_blank_check check (btrim(name) <> ''),
  constraint workflow_definitions_system_tenant_check
    check ((is_system_workflow = true and tenant_id is null and workflow_owner_type = 'system') or (is_system_workflow = false and tenant_id is not null and workflow_owner_type = 'tenant')),
  constraint workflow_definitions_metadata_object_check check (jsonb_typeof(metadata) = 'object')
);

create table public.workflow_definition_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  workflow_definition_id uuid not null references public.workflow_definitions(id) on delete cascade,
  version_number integer not null,
  trigger_type text not null,
  trigger_event_type text,
  trigger_config jsonb not null default '{}'::jsonb,
  condition_config jsonb not null default '[]'::jsonb,
  action_config jsonb not null default '[]'::jsonb,
  timezone_strategy text not null default 'tenant_default',
  status text not null default 'draft',
  validation_metadata jsonb not null default '{}'::jsonb,
  effective_from timestamptz,
  effective_until timestamptz,
  published_at timestamptz,
  published_by_profile_id uuid references public.profiles(id) on delete set null,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workflow_definition_versions_number_check check (version_number > 0),
  constraint workflow_definition_versions_trigger_type_check
    check (trigger_type in ('domain_event', 'scheduled_time', 'delay_after_event', 'date_relative_to_booking', 'date_relative_to_invoice_due_date', 'manual_trigger', 'retry_trigger', 'external_webhook')),
  constraint workflow_definition_versions_timezone_strategy_check
    check (timezone_strategy in ('tenant_default', 'practice_default', 'practice_location', 'booking_location', 'fixed')),
  constraint workflow_definition_versions_status_check
    check (status in ('draft', 'validating', 'active', 'superseded', 'disabled', 'archived')),
  constraint workflow_definition_versions_config_shape_check
    check (jsonb_typeof(trigger_config) = 'object' and jsonb_typeof(condition_config) = 'array' and jsonb_typeof(action_config) = 'array' and jsonb_typeof(validation_metadata) = 'object'),
  constraint workflow_definition_versions_effective_dates_check
    check (effective_until is null or effective_from is null or effective_until > effective_from)
);

alter table public.workflow_definitions
  add constraint workflow_definitions_active_version_fk
  foreign key (active_version_id)
  references public.workflow_definition_versions(id)
  on delete set null
  deferrable initially deferred;

create table public.workflow_executions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  workflow_definition_id uuid not null references public.workflow_definitions(id) on delete restrict,
  workflow_definition_version_id uuid not null references public.workflow_definition_versions(id) on delete restrict,
  triggering_outbox_event_id uuid references public.workflow_event_outbox(id) on delete set null,
  trigger_type text not null,
  status text not null default 'pending',
  idempotency_key text not null,
  correlation_id uuid not null default gen_random_uuid(),
  causation_id uuid,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  failed_at timestamptz,
  current_step_key text,
  attempt_count integer not null default 0,
  next_retry_at timestamptz,
  error_classification text,
  error_summary text,
  cancelled_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint workflow_executions_status_check
    check (status in ('pending', 'scheduled', 'running', 'waiting', 'completed', 'failed', 'cancelled', 'dead_lettered')),
  constraint workflow_executions_attempt_count_check check (attempt_count >= 0),
  constraint workflow_executions_idempotency_not_blank_check check (btrim(idempotency_key) <> ''),
  constraint workflow_executions_error_classification_check
    check (error_classification is null or error_classification in ('transient', 'configuration', 'validation', 'permission', 'domain_state', 'provider', 'security', 'unknown')),
  constraint workflow_executions_safe_error_check check (error_summary is null or char_length(error_summary) <= 1000),
  constraint workflow_executions_cancel_reason_check check (cancelled_reason is null or char_length(cancelled_reason) <= 1000)
);

create table public.workflow_step_executions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  workflow_execution_id uuid not null references public.workflow_executions(id) on delete cascade,
  workflow_definition_version_id uuid not null references public.workflow_definition_versions(id) on delete restrict,
  step_key text not null,
  step_order integer not null default 1,
  action_type text not null,
  status text not null default 'pending',
  input_summary jsonb not null default '{}'::jsonb,
  output_summary jsonb not null default '{}'::jsonb,
  attempt_count integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  next_retry_at timestamptz,
  error_classification text,
  error_summary text,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint workflow_step_executions_step_order_check check (step_order > 0),
  constraint workflow_step_executions_status_check
    check (status in ('pending', 'scheduled', 'running', 'waiting', 'completed', 'failed', 'cancelled', 'dead_lettered', 'skipped')),
  constraint workflow_step_executions_action_type_check
    check (action_type in ('create_communication_request', 'create_patient_link_invitation_request', 'mark_patient_link_content_available', 'create_staff_task', 'add_patient_history_event', 'create_internal_notification', 'request_draft_invoice_recovery', 'request_invoice_reconciliation_review', 'schedule_later_execution', 'trigger_domain_rpc', 'request_pdf_generation', 'create_external_webhook_request')),
  constraint workflow_step_executions_attempt_count_check check (attempt_count >= 0),
  constraint workflow_step_executions_idempotency_not_blank_check check (btrim(idempotency_key) <> ''),
  constraint workflow_step_executions_summary_shape_check check (jsonb_typeof(input_summary) = 'object' and jsonb_typeof(output_summary) = 'object'),
  constraint workflow_step_executions_error_classification_check
    check (error_classification is null or error_classification in ('transient', 'configuration', 'validation', 'permission', 'domain_state', 'provider', 'security', 'unknown')),
  constraint workflow_step_executions_safe_error_check check (error_summary is null or char_length(error_summary) <= 1000)
);

create table public.workflow_scheduled_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  workflow_execution_id uuid references public.workflow_executions(id) on delete cascade,
  workflow_step_execution_id uuid references public.workflow_step_executions(id) on delete cascade,
  source_outbox_event_id uuid references public.workflow_event_outbox(id) on delete set null,
  target_entity_type text,
  target_entity_id uuid,
  job_type text not null,
  scheduled_for timestamptz not null,
  timezone text not null default 'UTC',
  status text not null default 'scheduled',
  priority integer not null default 100,
  attempt_count integer not null default 0,
  locked_at timestamptz,
  locked_by text,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  next_retry_at timestamptz,
  superseded_by_job_id uuid references public.workflow_scheduled_jobs(id) on delete set null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint workflow_scheduled_jobs_status_check
    check (status in ('scheduled', 'processing', 'completed', 'failed', 'cancelled', 'superseded', 'dead_lettered')),
  constraint workflow_scheduled_jobs_priority_check check (priority between 0 and 1000),
  constraint workflow_scheduled_jobs_attempt_count_check check (attempt_count >= 0),
  constraint workflow_scheduled_jobs_idempotency_not_blank_check check (btrim(idempotency_key) <> ''),
  constraint workflow_scheduled_jobs_cancel_reason_check check (cancellation_reason is null or char_length(cancellation_reason) <= 1000)
);

create table public.workflow_dead_letters (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  outbox_event_id uuid references public.workflow_event_outbox(id) on delete set null,
  workflow_execution_id uuid references public.workflow_executions(id) on delete set null,
  workflow_step_execution_id uuid references public.workflow_step_executions(id) on delete set null,
  workflow_definition_id uuid references public.workflow_definitions(id) on delete set null,
  workflow_definition_version_id uuid references public.workflow_definition_versions(id) on delete set null,
  failure_class text not null default 'unknown',
  error_code text,
  error_summary text not null,
  safe_context jsonb not null default '{}'::jsonb,
  attempt_count integer not null default 0,
  first_failed_at timestamptz not null default now(),
  last_failed_at timestamptz not null default now(),
  dead_lettered_at timestamptz not null default now(),
  resolution_status text not null default 'unresolved',
  resolution_notes text,
  resolved_at timestamptz,
  resolved_by_profile_id uuid references public.profiles(id) on delete set null,
  retry_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint workflow_dead_letters_failure_class_check
    check (failure_class in ('transient', 'configuration', 'validation', 'permission', 'domain_state', 'provider', 'security', 'unknown')),
  constraint workflow_dead_letters_resolution_status_check
    check (resolution_status in ('unresolved', 'retry_scheduled', 'resolved', 'cancelled', 'ignored')),
  constraint workflow_dead_letters_attempts_check check (attempt_count >= 0 and retry_count >= 0),
  constraint workflow_dead_letters_safe_context_shape_check check (jsonb_typeof(safe_context) = 'object'),
  constraint workflow_dead_letters_error_summary_check check (char_length(error_summary) <= 1000),
  constraint workflow_dead_letters_resolution_notes_check check (resolution_notes is null or char_length(resolution_notes) <= 1000)
);

create table public.workflow_action_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  workflow_execution_id uuid references public.workflow_executions(id) on delete set null,
  workflow_step_execution_id uuid references public.workflow_step_executions(id) on delete set null,
  action_type text not null,
  target_entity_type text,
  target_entity_id uuid,
  patient_id uuid references public.patients(id) on delete set null,
  responsible_party_id uuid references public.responsible_parties(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  patient_link_id uuid references public.patient_links(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  idempotency_key text not null,
  available_at timestamptz not null default now(),
  attempt_count integer not null default 0,
  locked_at timestamptz,
  locked_by text,
  completed_at timestamptz,
  failed_at timestamptz,
  error_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint workflow_action_requests_action_type_check
    check (action_type in ('communication_request', 'patient_link_content_available', 'staff_task', 'draft_invoice_recovery', 'invoice_reconciliation_review', 'internal_notification', 'approved_domain_rpc', 'pdf_generation_request', 'external_webhook_request')),
  constraint workflow_action_requests_status_check
    check (status in ('pending', 'scheduled', 'processing', 'completed', 'failed', 'cancelled', 'dead_lettered')),
  constraint workflow_action_requests_payload_shape_check check (jsonb_typeof(payload) = 'object'),
  constraint workflow_action_requests_attempt_count_check check (attempt_count >= 0),
  constraint workflow_action_requests_idempotency_not_blank_check check (btrim(idempotency_key) <> ''),
  constraint workflow_action_requests_error_summary_check check (error_summary is null or char_length(error_summary) <= 1000)
);

create table public.communication_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  workflow_execution_id uuid references public.workflow_executions(id) on delete set null,
  workflow_step_execution_id uuid references public.workflow_step_executions(id) on delete set null,
  recipient_type text not null,
  recipient_patient_id uuid references public.patients(id) on delete set null,
  recipient_responsible_party_id uuid references public.responsible_parties(id) on delete set null,
  channel text not null,
  template_id uuid references public.communication_templates(id) on delete set null,
  template_key text,
  template_version text,
  approved_merge_fields jsonb not null default '{}'::jsonb,
  related_patient_id uuid references public.patients(id) on delete set null,
  related_booking_id uuid references public.bookings(id) on delete set null,
  related_session_id uuid references public.sessions(id) on delete set null,
  related_invoice_id uuid references public.invoices(id) on delete set null,
  related_payment_id uuid references public.payments(id) on delete set null,
  related_receipt_id uuid references public.receipts(id) on delete set null,
  related_patient_link_id uuid references public.patient_links(id) on delete set null,
  scheduled_send_at timestamptz,
  status text not null default 'draft',
  idempotency_key text not null,
  attempt_count integer not null default 0,
  locked_at timestamptz,
  locked_by text,
  completed_at timestamptz,
  failed_at timestamptz,
  error_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint communication_requests_recipient_type_check
    check (recipient_type in ('patient', 'responsible_party', 'practice_user', 'tenant_admin')),
  constraint communication_requests_channel_check
    check (channel in ('email', 'sms', 'whatsapp', 'internal')),
  constraint communication_requests_status_check
    check (status in ('draft', 'ready', 'scheduled', 'processing', 'sent', 'failed', 'blocked', 'cancelled')),
  constraint communication_requests_merge_fields_shape_check check (jsonb_typeof(approved_merge_fields) = 'object'),
  constraint communication_requests_attempt_count_check check (attempt_count >= 0),
  constraint communication_requests_idempotency_not_blank_check check (btrim(idempotency_key) <> ''),
  constraint communication_requests_error_summary_check check (error_summary is null or char_length(error_summary) <= 1000)
);

create table public.staff_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  description text,
  task_type text not null default 'workflow_follow_up',
  related_entity_type text,
  related_entity_id uuid,
  patient_id uuid references public.patients(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  patient_link_id uuid references public.patient_links(id) on delete set null,
  assigned_profile_id uuid references public.profiles(id) on delete set null,
  assigned_role text,
  priority text not null default 'normal',
  due_at timestamptz,
  status text not null default 'open',
  source_workflow_execution_id uuid references public.workflow_executions(id) on delete set null,
  idempotency_key text,
  completed_at timestamptz,
  completed_by_profile_id uuid references public.profiles(id) on delete set null,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_tasks_title_not_blank_check check (btrim(title) <> ''),
  constraint staff_tasks_priority_check check (priority in ('low', 'normal', 'high', 'urgent')),
  constraint staff_tasks_status_check check (status in ('open', 'in_progress', 'blocked', 'completed', 'cancelled')),
  constraint staff_tasks_assigned_role_check check (assigned_role is null or assigned_role in ('admin', 'receptionist', 'therapist', 'finance')),
  constraint staff_tasks_description_check check (description is null or char_length(description) <= 2000),
  constraint staff_tasks_idempotency_not_blank_check check (idempotency_key is null or btrim(idempotency_key) <> '')
);

create trigger workflow_event_outbox_set_updated_at
before update on public.workflow_event_outbox
for each row execute function public.set_updated_at();

create trigger workflow_definitions_set_updated_at
before update on public.workflow_definitions
for each row execute function public.set_updated_at();

create trigger workflow_definition_versions_set_updated_at
before update on public.workflow_definition_versions
for each row execute function public.set_updated_at();

create trigger workflow_executions_set_updated_at
before update on public.workflow_executions
for each row execute function public.set_updated_at();

create trigger workflow_step_executions_set_updated_at
before update on public.workflow_step_executions
for each row execute function public.set_updated_at();

create trigger workflow_scheduled_jobs_set_updated_at
before update on public.workflow_scheduled_jobs
for each row execute function public.set_updated_at();

create trigger workflow_dead_letters_set_updated_at
before update on public.workflow_dead_letters
for each row execute function public.set_updated_at();

create trigger workflow_action_requests_set_updated_at
before update on public.workflow_action_requests
for each row execute function public.set_updated_at();

create trigger communication_requests_set_updated_at
before update on public.communication_requests
for each row execute function public.set_updated_at();

create trigger staff_tasks_set_updated_at
before update on public.staff_tasks
for each row execute function public.set_updated_at();

create unique index workflow_event_outbox_source_event_idx
  on public.workflow_event_outbox (tenant_id, source_domain, source_table, source_event_id)
  where deleted_at is null and source_event_id is not null;

create unique index workflow_event_outbox_idempotency_idx
  on public.workflow_event_outbox (tenant_id, idempotency_key)
  where deleted_at is null;

create index workflow_event_outbox_claim_idx
  on public.workflow_event_outbox (processing_status, available_at, priority, created_at)
  where deleted_at is null and processing_status in ('pending', 'scheduled', 'failed');

create index workflow_event_outbox_tenant_status_idx
  on public.workflow_event_outbox (tenant_id, processing_status, available_at)
  where deleted_at is null;

create index workflow_event_outbox_trace_idx
  on public.workflow_event_outbox (correlation_id, causation_id);

create index workflow_event_outbox_entity_idx
  on public.workflow_event_outbox (tenant_id, patient_id, booking_id, session_id, invoice_id, payment_id)
  where deleted_at is null;

create unique index workflow_definitions_system_key_idx
  on public.workflow_definitions (workflow_key)
  where deleted_at is null and is_system_workflow = true;

create unique index workflow_definitions_tenant_key_idx
  on public.workflow_definitions (tenant_id, workflow_key)
  where deleted_at is null and is_system_workflow = false;

create index workflow_definitions_tenant_status_idx
  on public.workflow_definitions (tenant_id, status, category)
  where deleted_at is null;

create unique index workflow_definition_versions_number_idx
  on public.workflow_definition_versions (workflow_definition_id, version_number)
  where deleted_at is null;

create index workflow_definition_versions_trigger_idx
  on public.workflow_definition_versions (trigger_event_type, trigger_type, status)
  where deleted_at is null;

create unique index workflow_definition_versions_one_active_idx
  on public.workflow_definition_versions (workflow_definition_id)
  where deleted_at is null and status = 'active';

create unique index workflow_executions_idempotency_idx
  on public.workflow_executions (tenant_id, idempotency_key)
  where deleted_at is null;

create index workflow_executions_status_idx
  on public.workflow_executions (tenant_id, status, next_retry_at)
  where deleted_at is null;

create index workflow_executions_event_idx
  on public.workflow_executions (triggering_outbox_event_id)
  where deleted_at is null and triggering_outbox_event_id is not null;

create unique index workflow_step_executions_idempotency_idx
  on public.workflow_step_executions (tenant_id, idempotency_key)
  where deleted_at is null;

create unique index workflow_step_executions_step_key_idx
  on public.workflow_step_executions (workflow_execution_id, step_key)
  where deleted_at is null;

create index workflow_step_executions_execution_idx
  on public.workflow_step_executions (workflow_execution_id, step_order)
  where deleted_at is null;

create index workflow_scheduled_jobs_due_idx
  on public.workflow_scheduled_jobs (status, scheduled_for, priority, created_at)
  where deleted_at is null and status in ('scheduled', 'failed');

create unique index workflow_scheduled_jobs_idempotency_idx
  on public.workflow_scheduled_jobs (tenant_id, idempotency_key)
  where deleted_at is null and status not in ('cancelled', 'superseded');

create index workflow_scheduled_jobs_target_idx
  on public.workflow_scheduled_jobs (tenant_id, target_entity_type, target_entity_id)
  where deleted_at is null;

create index workflow_dead_letters_unresolved_idx
  on public.workflow_dead_letters (tenant_id, resolution_status, dead_lettered_at desc)
  where deleted_at is null;

create unique index workflow_action_requests_idempotency_idx
  on public.workflow_action_requests (tenant_id, idempotency_key)
  where deleted_at is null;

create index workflow_action_requests_claim_idx
  on public.workflow_action_requests (status, available_at, created_at)
  where deleted_at is null and status in ('pending', 'scheduled', 'failed');

create unique index communication_requests_idempotency_idx
  on public.communication_requests (tenant_id, idempotency_key)
  where deleted_at is null;

create index communication_requests_claim_idx
  on public.communication_requests (status, scheduled_send_at, created_at)
  where deleted_at is null and status in ('ready', 'scheduled', 'failed');

create index communication_requests_related_idx
  on public.communication_requests (tenant_id, related_patient_id, related_booking_id, related_invoice_id)
  where deleted_at is null;

create unique index staff_tasks_idempotency_idx
  on public.staff_tasks (tenant_id, idempotency_key)
  where deleted_at is null and idempotency_key is not null;

create index staff_tasks_queue_idx
  on public.staff_tasks (tenant_id, status, priority, due_at)
  where deleted_at is null;

create index staff_tasks_assignee_idx
  on public.staff_tasks (tenant_id, assigned_profile_id, status)
  where deleted_at is null and assigned_profile_id is not null;

create or replace function public.validate_workflow_tenant_integrity()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  definition_record public.workflow_definitions%rowtype;
  version_record public.workflow_definition_versions%rowtype;
  execution_record public.workflow_executions%rowtype;
  step_record public.workflow_step_executions%rowtype;
begin
  if TG_TABLE_NAME = 'workflow_definition_versions' then
    select * into definition_record
    from public.workflow_definitions
    where id = NEW.workflow_definition_id;

    if definition_record.id is null then
      raise exception 'Workflow version must reference an existing workflow definition';
    end if;

    if coalesce(NEW.tenant_id, '00000000-0000-0000-0000-000000000000'::uuid) <> coalesce(definition_record.tenant_id, '00000000-0000-0000-0000-000000000000'::uuid) then
      raise exception 'Workflow version tenant must match workflow definition tenant';
    end if;
  elsif TG_TABLE_NAME = 'workflow_definitions' and NEW.active_version_id is not null then
    select * into version_record
    from public.workflow_definition_versions
    where id = NEW.active_version_id;

    if version_record.id is null or version_record.workflow_definition_id <> NEW.id then
      raise exception 'Active workflow version must belong to the workflow definition';
    end if;
  elsif TG_TABLE_NAME = 'workflow_executions' then
    select * into definition_record
    from public.workflow_definitions
    where id = NEW.workflow_definition_id;

    select * into version_record
    from public.workflow_definition_versions
    where id = NEW.workflow_definition_version_id;

    if definition_record.id is null or version_record.id is null or version_record.workflow_definition_id <> definition_record.id then
      raise exception 'Workflow execution must reference a matching definition and version';
    end if;

    if coalesce(definition_record.tenant_id, NEW.tenant_id) <> NEW.tenant_id or coalesce(version_record.tenant_id, NEW.tenant_id) <> NEW.tenant_id then
      raise exception 'Workflow execution tenant must match tenant-scoped definition and version';
    end if;
  elsif TG_TABLE_NAME = 'workflow_step_executions' then
    select * into execution_record
    from public.workflow_executions
    where id = NEW.workflow_execution_id;

    if execution_record.id is null or execution_record.tenant_id <> NEW.tenant_id or execution_record.workflow_definition_version_id <> NEW.workflow_definition_version_id then
      raise exception 'Workflow step execution must match parent execution tenant and version';
    end if;
  elsif TG_TABLE_NAME = 'workflow_scheduled_jobs' then
    if NEW.workflow_execution_id is not null then
      select * into execution_record
      from public.workflow_executions
      where id = NEW.workflow_execution_id;

      if execution_record.id is null or execution_record.tenant_id <> NEW.tenant_id then
        raise exception 'Workflow scheduled job execution must belong to the same tenant';
      end if;
    end if;

    if NEW.workflow_step_execution_id is not null then
      select * into step_record
      from public.workflow_step_executions
      where id = NEW.workflow_step_execution_id;

      if step_record.id is null or step_record.tenant_id <> NEW.tenant_id then
        raise exception 'Workflow scheduled job step must belong to the same tenant';
      end if;
    end if;
  elsif TG_TABLE_NAME in ('workflow_action_requests', 'communication_requests') then
    if NEW.workflow_execution_id is not null then
      select * into execution_record
      from public.workflow_executions
      where id = NEW.workflow_execution_id;

      if execution_record.id is null or execution_record.tenant_id <> NEW.tenant_id then
        raise exception 'Workflow action request execution must belong to the same tenant';
      end if;
    end if;

    if NEW.workflow_step_execution_id is not null then
      select * into step_record
      from public.workflow_step_executions
      where id = NEW.workflow_step_execution_id;

      if step_record.id is null or step_record.tenant_id <> NEW.tenant_id then
        raise exception 'Workflow action request step must belong to the same tenant';
      end if;
    end if;
  end if;

  return NEW;
end;
$$;

create trigger workflow_definitions_validate_tenant_integrity
before insert or update on public.workflow_definitions
for each row execute function public.validate_workflow_tenant_integrity();

create trigger workflow_definition_versions_validate_tenant_integrity
before insert or update on public.workflow_definition_versions
for each row execute function public.validate_workflow_tenant_integrity();

create trigger workflow_executions_validate_tenant_integrity
before insert or update on public.workflow_executions
for each row execute function public.validate_workflow_tenant_integrity();

create trigger workflow_step_executions_validate_tenant_integrity
before insert or update on public.workflow_step_executions
for each row execute function public.validate_workflow_tenant_integrity();

create trigger workflow_scheduled_jobs_validate_tenant_integrity
before insert or update on public.workflow_scheduled_jobs
for each row execute function public.validate_workflow_tenant_integrity();

create trigger workflow_action_requests_validate_tenant_integrity
before insert or update on public.workflow_action_requests
for each row execute function public.validate_workflow_tenant_integrity();

create trigger communication_requests_validate_tenant_integrity
before insert or update on public.communication_requests
for each row execute function public.validate_workflow_tenant_integrity();

create or replace function public.enqueue_workflow_event(
  target_tenant_id uuid,
  event_type_input text,
  source_domain_input text,
  source_table_input text,
  source_event_id_input uuid,
  source_record_id_input uuid,
  idempotency_key_input text,
  payload_input jsonb default '{}'::jsonb,
  patient_id_input uuid default null,
  responsible_party_id_input uuid default null,
  booking_id_input uuid default null,
  session_id_input uuid default null,
  invoice_id_input uuid default null,
  payment_id_input uuid default null,
  patient_link_id_input uuid default null,
  actor_profile_id_input uuid default null,
  event_version_input integer default 1,
  priority_input integer default 100,
  available_at_input timestamptz default now(),
  correlation_id_input uuid default null,
  causation_id_input uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  outbox_id uuid;
begin
  if target_tenant_id is null then
    raise exception 'Workflow event tenant is required';
  end if;

  if idempotency_key_input is null or btrim(idempotency_key_input) = '' then
    raise exception 'Workflow event idempotency key is required';
  end if;

  if source_domain_input not in ('booking', 'session', 'invoice', 'payment', 'patient_link', 'patient', 'system') then
    raise exception 'Unsupported workflow source domain';
  end if;

  insert into public.workflow_event_outbox (
    tenant_id, event_type, event_version, source_domain, source_table, source_event_id, source_record_id,
    patient_id, responsible_party_id, booking_id, session_id, invoice_id, payment_id, patient_link_id,
    actor_profile_id, correlation_id, causation_id, idempotency_key, payload, priority, available_at
  )
  values (
    target_tenant_id, event_type_input, coalesce(event_version_input, 1), source_domain_input, source_table_input, source_event_id_input, source_record_id_input,
    patient_id_input, responsible_party_id_input, booking_id_input, session_id_input, invoice_id_input, payment_id_input, patient_link_id_input,
    actor_profile_id_input, coalesce(correlation_id_input, gen_random_uuid()), causation_id_input, idempotency_key_input, coalesce(payload_input, '{}'::jsonb),
    least(greatest(coalesce(priority_input, 100), 0), 1000), coalesce(available_at_input, now())
  )
  on conflict (tenant_id, idempotency_key) where deleted_at is null do update
    set updated_at = public.workflow_event_outbox.updated_at
  returning id into outbox_id;

  return outbox_id;
end;
$$;

create or replace function public.enqueue_domain_workflow_event_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  domain_name text;
  source_record uuid;
  outbox_id uuid;
  booking_patient_id uuid;
begin
  if TG_TABLE_NAME = 'booking_workflow_events' then
    domain_name := 'booking';
    source_record := NEW.booking_id;

    select patient_id into booking_patient_id
    from public.bookings
    where id = NEW.booking_id
      and tenant_id = NEW.tenant_id;

    outbox_id := public.enqueue_workflow_event(
      NEW.tenant_id, NEW.event_type, domain_name, TG_TABLE_NAME, NEW.id, source_record,
      domain_name || ':' || NEW.idempotency_key,
      jsonb_build_object('source_event_type', NEW.event_type, 'source_event_status', NEW.event_status, 'source_payload', NEW.payload),
      booking_patient_id, null, NEW.booking_id, null, null, null, null, NEW.created_by_profile_id
    );
  elsif TG_TABLE_NAME = 'session_workflow_events' then
    domain_name := 'session';
    source_record := NEW.session_id;
    outbox_id := public.enqueue_workflow_event(
      NEW.tenant_id, NEW.event_type, domain_name, TG_TABLE_NAME, NEW.id, source_record,
      domain_name || ':' || NEW.idempotency_key,
      jsonb_build_object('source_event_type', NEW.event_type, 'source_event_status', NEW.event_status, 'source_payload', NEW.payload),
      NEW.patient_id, null, NEW.booking_id, NEW.session_id, null, null, null, NEW.created_by_profile_id
    );
  elsif TG_TABLE_NAME = 'invoice_workflow_events' then
    domain_name := 'invoice';
    source_record := NEW.invoice_id;
    outbox_id := public.enqueue_workflow_event(
      NEW.tenant_id, NEW.event_type, domain_name, TG_TABLE_NAME, NEW.id, source_record,
      domain_name || ':' || NEW.idempotency_key,
      jsonb_build_object('source_event_type', NEW.event_type, 'source_event_status', NEW.event_status, 'source_payload', NEW.payload),
      NEW.patient_id, null, NEW.booking_id, NEW.session_id, NEW.invoice_id, null, null, NEW.created_by_profile_id
    );
  elsif TG_TABLE_NAME = 'payment_workflow_events' then
    domain_name := 'payment';
    source_record := coalesce(NEW.payment_id, NEW.payment_allocation_id, NEW.receipt_id, NEW.invoice_id);
    outbox_id := public.enqueue_workflow_event(
      NEW.tenant_id, NEW.event_type, domain_name, TG_TABLE_NAME, NEW.id, source_record,
      domain_name || ':' || NEW.idempotency_key,
      jsonb_build_object('source_event_type', NEW.event_type, 'source_event_status', NEW.event_status, 'source_payload', NEW.payload),
      NEW.patient_id, NEW.responsible_party_id, null, null, NEW.invoice_id, NEW.payment_id, null, NEW.created_by_profile_id
    );
  elsif TG_TABLE_NAME = 'patient_link_workflow_events' then
    domain_name := 'patient_link';
    source_record := NEW.patient_link_id;
    outbox_id := public.enqueue_workflow_event(
      NEW.tenant_id, NEW.event_type, domain_name, TG_TABLE_NAME, NEW.id, source_record,
      domain_name || ':' || NEW.idempotency_key,
      jsonb_build_object('source_event_type', NEW.event_type, 'source_event_status', NEW.event_status, 'source_payload', NEW.payload),
      NEW.patient_id, null, null, null, null, null, NEW.patient_link_id, NEW.created_by_profile_id
    );
  end if;

  return NEW;
end;
$$;

create trigger booking_workflow_events_enqueue_outbox
after insert on public.booking_workflow_events
for each row execute function public.enqueue_domain_workflow_event_trigger();

create trigger session_workflow_events_enqueue_outbox
after insert on public.session_workflow_events
for each row execute function public.enqueue_domain_workflow_event_trigger();

create trigger invoice_workflow_events_enqueue_outbox
after insert on public.invoice_workflow_events
for each row execute function public.enqueue_domain_workflow_event_trigger();

create trigger payment_workflow_events_enqueue_outbox
after insert on public.payment_workflow_events
for each row execute function public.enqueue_domain_workflow_event_trigger();

create trigger patient_link_workflow_events_enqueue_outbox
after insert on public.patient_link_workflow_events
for each row execute function public.enqueue_domain_workflow_event_trigger();

create or replace function public.validate_workflow_definition_version(target_version_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  version_record public.workflow_definition_versions%rowtype;
  validation_errors text[] := array[]::text[];
  action_item jsonb;
begin
  select * into version_record
  from public.workflow_definition_versions
  where id = target_version_id
    and deleted_at is null;

  if version_record.id is null then
    raise exception 'Workflow definition version not found';
  end if;

  if version_record.trigger_type = 'domain_event' and (version_record.trigger_event_type is null or btrim(version_record.trigger_event_type) = '') then
    validation_errors := array_append(validation_errors, 'domain_event triggers require trigger_event_type');
  end if;

  if jsonb_array_length(version_record.action_config) = 0 then
    validation_errors := array_append(validation_errors, 'workflow version requires at least one action');
  end if;

  for action_item in select value from jsonb_array_elements(version_record.action_config)
  loop
    if coalesce(action_item ->> 'action_type', '') not in (
      'create_communication_request',
      'create_patient_link_invitation_request',
      'mark_patient_link_content_available',
      'create_staff_task',
      'add_patient_history_event',
      'create_internal_notification',
      'request_draft_invoice_recovery',
      'request_invoice_reconciliation_review',
      'schedule_later_execution',
      'trigger_domain_rpc'
    ) then
      validation_errors := array_append(validation_errors, 'unsupported action_type: ' || coalesce(action_item ->> 'action_type', '<missing>'));
    end if;

    if action_item ? 'sql' or action_item ? 'javascript' or action_item ? 'script' or action_item ? 'code' or action_item ? 'url' then
      validation_errors := array_append(validation_errors, 'action configuration cannot contain executable code, SQL or external URL keys');
    end if;
  end loop;

  return jsonb_build_object(
    'valid', cardinality(validation_errors) = 0,
    'errors', to_jsonb(validation_errors)
  );
end;
$$;

create or replace function public.activate_workflow_version(target_version_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  version_record public.workflow_definition_versions%rowtype;
  definition_record public.workflow_definitions%rowtype;
  validation_result jsonb;
begin
  select * into version_record
  from public.workflow_definition_versions
  where id = target_version_id
    and deleted_at is null
  for update;

  if version_record.id is null then
    raise exception 'Workflow version not found';
  end if;

  select * into definition_record
  from public.workflow_definitions
  where id = version_record.workflow_definition_id
    and deleted_at is null
  for update;

  if definition_record.id is null then
    raise exception 'Workflow definition not found';
  end if;

  if definition_record.is_system_workflow and not public.is_super_admin() then
    raise exception 'Only Super Admin can activate system workflow versions';
  end if;

  if not definition_record.is_system_workflow and not public.has_tenant_role(definition_record.tenant_id, array['admin']) then
    raise exception 'Only tenant admins can activate tenant workflow versions';
  end if;

  validation_result := public.validate_workflow_definition_version(target_version_id);

  if coalesce((validation_result ->> 'valid')::boolean, false) = false then
    update public.workflow_definition_versions
    set status = 'validating',
        validation_metadata = validation_result
    where id = target_version_id;

    raise exception 'Workflow version failed validation';
  end if;

  update public.workflow_definition_versions
  set status = 'superseded',
      effective_until = now()
  where workflow_definition_id = definition_record.id
    and id <> target_version_id
    and status = 'active'
    and deleted_at is null;

  update public.workflow_definition_versions
  set status = 'active',
      validation_metadata = validation_result,
      effective_from = coalesce(effective_from, now()),
      effective_until = null,
      published_at = now(),
      published_by_profile_id = auth.uid()
  where id = target_version_id;

  update public.workflow_definitions
  set active_version_id = target_version_id,
      status = 'active',
      updated_by_profile_id = auth.uid()
  where id = definition_record.id;

  insert into public.audit_events (tenant_id, actor_profile_id, action, entity_table, entity_id, metadata)
  values (definition_record.tenant_id, auth.uid(), 'workflow_version_activated', 'workflow_definition_versions', target_version_id, jsonb_build_object('workflow_definition_id', definition_record.id));

  return target_version_id;
end;
$$;

create or replace function public.claim_workflow_outbox_events(worker_id_input text, batch_size integer default 25)
returns setof public.workflow_event_outbox
language plpgsql
security definer
set search_path = public
as $$
begin
  if worker_id_input is null or btrim(worker_id_input) = '' then
    raise exception 'Worker identifier is required';
  end if;

  return query
  with claimable as (
    select id
    from public.workflow_event_outbox
    where deleted_at is null
      and processing_status in ('pending', 'scheduled', 'failed')
      and available_at <= now()
      and (locked_at is null or locked_at < now() - interval '15 minutes')
      and attempt_count < max_attempts
    order by priority asc, available_at asc, created_at asc
    limit least(greatest(coalesce(batch_size, 25), 1), 100)
    for update skip locked
  )
  update public.workflow_event_outbox outbox
  set processing_status = 'processing',
      locked_at = now(),
      locked_by = worker_id_input,
      attempt_count = outbox.attempt_count + 1
  from claimable
  where outbox.id = claimable.id
  returning outbox.*;
end;
$$;

create or replace function public.complete_workflow_outbox_event(target_outbox_id uuid, worker_id_input text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.workflow_event_outbox
  set processing_status = 'processed',
      completed_at = now(),
      locked_at = null,
      locked_by = null,
      last_error_code = null,
      last_error_summary = null
  where id = target_outbox_id
    and locked_by = worker_id_input
    and processing_status = 'processing'
    and deleted_at is null;

  if not found then
    raise exception 'Workflow outbox event is not claimed by this worker';
  end if;

  return target_outbox_id;
end;
$$;

create or replace function public.fail_workflow_outbox_event(
  target_outbox_id uuid,
  worker_id_input text,
  error_code_input text,
  error_summary_input text,
  retryable_input boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  event_record public.workflow_event_outbox%rowtype;
begin
  select * into event_record
  from public.workflow_event_outbox
  where id = target_outbox_id
    and locked_by = worker_id_input
    and processing_status = 'processing'
    and deleted_at is null
  for update;

  if event_record.id is null then
    raise exception 'Workflow outbox event is not claimed by this worker';
  end if;

  if retryable_input and event_record.attempt_count < event_record.max_attempts then
    update public.workflow_event_outbox
    set processing_status = 'failed',
        failed_at = now(),
        available_at = now() + make_interval(mins => least(power(2, event_record.attempt_count)::integer, 60)),
        locked_at = null,
        locked_by = null,
        last_error_code = left(error_code_input, 120),
        last_error_summary = left(error_summary_input, 1000)
    where id = event_record.id;
  else
    update public.workflow_event_outbox
    set processing_status = 'dead_lettered',
        failed_at = now(),
        dead_lettered_at = now(),
        locked_at = null,
        locked_by = null,
        last_error_code = left(error_code_input, 120),
        last_error_summary = left(error_summary_input, 1000)
    where id = event_record.id;

    insert into public.workflow_dead_letters (
      tenant_id, outbox_event_id, failure_class, error_code, error_summary, safe_context, attempt_count
    )
    values (
      event_record.tenant_id, event_record.id, case when retryable_input then 'transient' else 'validation' end,
      left(error_code_input, 120), left(error_summary_input, 1000),
      jsonb_build_object('source_domain', event_record.source_domain, 'event_type', event_record.event_type),
      event_record.attempt_count
    );
  end if;

  return target_outbox_id;
end;
$$;

create or replace function public.claim_workflow_scheduled_jobs(worker_id_input text, batch_size integer default 25)
returns setof public.workflow_scheduled_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  if worker_id_input is null or btrim(worker_id_input) = '' then
    raise exception 'Worker identifier is required';
  end if;

  return query
  with claimable as (
    select id
    from public.workflow_scheduled_jobs
    where deleted_at is null
      and status in ('scheduled', 'failed')
      and scheduled_for <= now()
      and (locked_at is null or locked_at < now() - interval '15 minutes')
    order by priority asc, scheduled_for asc, created_at asc
    limit least(greatest(coalesce(batch_size, 25), 1), 100)
    for update skip locked
  )
  update public.workflow_scheduled_jobs jobs
  set status = 'processing',
      locked_at = now(),
      locked_by = worker_id_input,
      attempt_count = jobs.attempt_count + 1
  from claimable
  where jobs.id = claimable.id
  returning jobs.*;
end;
$$;

create or replace function public.cancel_workflow_execution(target_execution_id uuid, cancellation_reason_input text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  execution_record public.workflow_executions%rowtype;
begin
  select * into execution_record
  from public.workflow_executions
  where id = target_execution_id
    and deleted_at is null
  for update;

  if execution_record.id is null then
    raise exception 'Workflow execution not found';
  end if;

  if not public.is_super_admin() and not public.has_tenant_role(execution_record.tenant_id, array['admin']) then
    raise exception 'Only tenant admins can cancel workflow executions';
  end if;

  if execution_record.status in ('completed', 'cancelled') then
    return target_execution_id;
  end if;

  update public.workflow_executions
  set status = 'cancelled',
      cancelled_at = now(),
      cancelled_reason = left(cancellation_reason_input, 1000)
  where id = target_execution_id;

  update public.workflow_scheduled_jobs
  set status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = 'workflow_execution_cancelled'
  where workflow_execution_id = target_execution_id
    and status in ('scheduled', 'failed')
    and deleted_at is null;

  insert into public.audit_events (tenant_id, actor_profile_id, action, entity_table, entity_id, metadata)
  values (execution_record.tenant_id, auth.uid(), 'workflow_execution_cancelled', 'workflow_executions', target_execution_id, jsonb_build_object('reason', left(cancellation_reason_input, 1000)));

  return target_execution_id;
end;
$$;

create or replace function public.retry_workflow_dead_letter(target_dead_letter_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  dead_letter_record public.workflow_dead_letters%rowtype;
begin
  select * into dead_letter_record
  from public.workflow_dead_letters
  where id = target_dead_letter_id
    and deleted_at is null
  for update;

  if dead_letter_record.id is null then
    raise exception 'Workflow dead letter not found';
  end if;

  if not public.is_super_admin() and not public.has_tenant_role(dead_letter_record.tenant_id, array['admin']) then
    raise exception 'Only tenant admins can retry workflow dead letters';
  end if;

  update public.workflow_dead_letters
  set resolution_status = 'retry_scheduled',
      retry_count = retry_count + 1,
      resolved_at = now(),
      resolved_by_profile_id = auth.uid()
  where id = target_dead_letter_id;

  if dead_letter_record.outbox_event_id is not null then
    update public.workflow_event_outbox
    set processing_status = 'pending',
        available_at = now(),
        locked_at = null,
        locked_by = null,
        dead_lettered_at = null
    where id = dead_letter_record.outbox_event_id;
  end if;

  insert into public.audit_events (tenant_id, actor_profile_id, action, entity_table, entity_id, metadata)
  values (dead_letter_record.tenant_id, auth.uid(), 'workflow_dead_letter_retry_scheduled', 'workflow_dead_letters', target_dead_letter_id, '{}'::jsonb);

  return target_dead_letter_id;
end;
$$;

alter table public.workflow_event_outbox enable row level security;
alter table public.workflow_definitions enable row level security;
alter table public.workflow_definition_versions enable row level security;
alter table public.workflow_executions enable row level security;
alter table public.workflow_step_executions enable row level security;
alter table public.workflow_scheduled_jobs enable row level security;
alter table public.workflow_dead_letters enable row level security;
alter table public.workflow_action_requests enable row level security;
alter table public.communication_requests enable row level security;
alter table public.staff_tasks enable row level security;

create policy "tenant members can read workflow outbox"
on public.workflow_event_outbox for select to authenticated
using (deleted_at is null and (public.is_super_admin() or public.is_tenant_member(tenant_id)));

create policy "tenant admins can read workflow definitions"
on public.workflow_definitions for select to authenticated
using (deleted_at is null and (is_system_workflow = true or public.is_super_admin() or public.is_tenant_member(tenant_id)));

create policy "tenant admins can create workflow definitions"
on public.workflow_definitions for insert to authenticated
with check (is_system_workflow = false and public.has_tenant_role(tenant_id, array['admin']));

create policy "tenant admins can update workflow definitions"
on public.workflow_definitions for update to authenticated
using ((public.is_super_admin() and is_system_workflow = true) or (is_system_workflow = false and public.has_tenant_role(tenant_id, array['admin'])))
with check ((public.is_super_admin() and is_system_workflow = true) or (is_system_workflow = false and public.has_tenant_role(tenant_id, array['admin'])));

create policy "tenant members can read workflow versions"
on public.workflow_definition_versions for select to authenticated
using (deleted_at is null and (public.is_super_admin() or tenant_id is null or public.is_tenant_member(tenant_id)));

create policy "tenant admins can create workflow versions"
on public.workflow_definition_versions for insert to authenticated
with check ((tenant_id is null and public.is_super_admin()) or public.has_tenant_role(tenant_id, array['admin']));

create policy "tenant admins can update workflow versions"
on public.workflow_definition_versions for update to authenticated
using ((tenant_id is null and public.is_super_admin()) or public.has_tenant_role(tenant_id, array['admin']))
with check ((tenant_id is null and public.is_super_admin()) or public.has_tenant_role(tenant_id, array['admin']));

create policy "tenant members can read workflow executions"
on public.workflow_executions for select to authenticated
using (deleted_at is null and (public.is_super_admin() or public.is_tenant_member(tenant_id)));

create policy "tenant members can read workflow steps"
on public.workflow_step_executions for select to authenticated
using (deleted_at is null and (public.is_super_admin() or public.is_tenant_member(tenant_id)));

create policy "tenant members can read workflow scheduled jobs"
on public.workflow_scheduled_jobs for select to authenticated
using (deleted_at is null and (public.is_super_admin() or public.is_tenant_member(tenant_id)));

create policy "tenant members can read workflow dead letters"
on public.workflow_dead_letters for select to authenticated
using (deleted_at is null and (public.is_super_admin() or public.is_tenant_member(tenant_id)));

create policy "tenant members can read workflow action requests"
on public.workflow_action_requests for select to authenticated
using (deleted_at is null and (public.is_super_admin() or public.is_tenant_member(tenant_id)));

create policy "tenant members can read communication requests"
on public.communication_requests for select to authenticated
using (deleted_at is null and (public.is_super_admin() or public.is_tenant_member(tenant_id)));

create policy "tenant admins can create communication requests"
on public.communication_requests for insert to authenticated
with check (public.has_tenant_role(tenant_id, array['admin']));

create policy "tenant members can read staff tasks"
on public.staff_tasks for select to authenticated
using (
  deleted_at is null
  and (
    public.is_super_admin()
    or public.has_tenant_role(tenant_id, array['admin'])
    or assigned_profile_id = auth.uid()
    or (assigned_role is not null and public.has_tenant_role(tenant_id, array[assigned_role]))
  )
);

create policy "tenant admins can manage staff tasks"
on public.staff_tasks for all to authenticated
using (public.has_tenant_role(tenant_id, array['admin']))
with check (public.has_tenant_role(tenant_id, array['admin']));

revoke all on public.workflow_event_outbox from anon, authenticated;
revoke all on public.workflow_definitions from anon, authenticated;
revoke all on public.workflow_definition_versions from anon, authenticated;
revoke all on public.workflow_executions from anon, authenticated;
revoke all on public.workflow_step_executions from anon, authenticated;
revoke all on public.workflow_scheduled_jobs from anon, authenticated;
revoke all on public.workflow_dead_letters from anon, authenticated;
revoke all on public.workflow_action_requests from anon, authenticated;
revoke all on public.communication_requests from anon, authenticated;
revoke all on public.staff_tasks from anon, authenticated;

grant select on public.workflow_event_outbox to authenticated;
grant select, insert, update on public.workflow_definitions to authenticated;
grant select, insert, update on public.workflow_definition_versions to authenticated;
grant select on public.workflow_executions to authenticated;
grant select on public.workflow_step_executions to authenticated;
grant select on public.workflow_scheduled_jobs to authenticated;
grant select on public.workflow_dead_letters to authenticated;
grant select on public.workflow_action_requests to authenticated;
grant select, insert on public.communication_requests to authenticated;
grant select, insert, update on public.staff_tasks to authenticated;

revoke all on function public.enqueue_workflow_event(uuid, text, text, text, uuid, uuid, text, jsonb, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, integer, integer, timestamptz, uuid, uuid) from public, anon, authenticated;
revoke all on function public.enqueue_domain_workflow_event_trigger() from public, anon, authenticated;
revoke all on function public.claim_workflow_outbox_events(text, integer) from public, anon, authenticated;
revoke all on function public.complete_workflow_outbox_event(uuid, text) from public, anon, authenticated;
revoke all on function public.fail_workflow_outbox_event(uuid, text, text, text, boolean) from public, anon, authenticated;
revoke all on function public.claim_workflow_scheduled_jobs(text, integer) from public, anon, authenticated;
revoke all on function public.validate_workflow_tenant_integrity() from public, anon, authenticated;

grant execute on function public.activate_workflow_version(uuid) to authenticated;
grant execute on function public.validate_workflow_definition_version(uuid) to authenticated;
grant execute on function public.cancel_workflow_execution(uuid, text) to authenticated;
grant execute on function public.retry_workflow_dead_letter(uuid) to authenticated;

grant execute on function public.enqueue_workflow_event(uuid, text, text, text, uuid, uuid, text, jsonb, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, integer, integer, timestamptz, uuid, uuid) to service_role;
grant execute on function public.claim_workflow_outbox_events(text, integer) to service_role;
grant execute on function public.complete_workflow_outbox_event(uuid, text) to service_role;
grant execute on function public.fail_workflow_outbox_event(uuid, text, text, text, boolean) to service_role;
grant execute on function public.claim_workflow_scheduled_jobs(text, integer) to service_role;

insert into public.workflow_definitions (
  workflow_key, name, description, category, workflow_owner_type, status,
  is_system_workflow, tenant_disable_allowed, tenant_clone_allowed, metadata
)
values
  ('system.session_completed.draft_invoice_recovery', 'Session completed draft invoice recovery', 'Creates a readiness signal when a completed session is missing draft invoice recovery work.', 'finance_recovery', 'system', 'disabled', true, false, true, '{"seeded_in":"phase5g_step2","runtime_required":true}'::jsonb),
  ('system.invoice_issued.patient_link_available', 'Invoice issued Patient Link availability', 'Creates a readiness signal for showing issued invoices on Patient Link.', 'patient_link', 'system', 'disabled', true, false, true, '{"seeded_in":"phase5g_step2","runtime_required":true}'::jsonb),
  ('system.payment_recorded.receipt_available', 'Payment recorded receipt availability', 'Creates a readiness signal for making receipts available after payment recording.', 'patient_link', 'system', 'disabled', true, false, true, '{"seeded_in":"phase5g_step2","runtime_required":true}'::jsonb),
  ('system.booking_updated.patient_link_appointment', 'Booking update Patient Link appointment visibility', 'Creates a readiness signal to refresh Patient Link appointment projections after booking changes.', 'patient_link', 'system', 'disabled', true, false, true, '{"seeded_in":"phase5g_step2","runtime_required":true}'::jsonb),
  ('system.patient_link.access_failure.security_review', 'Patient Link access failure security review', 'Creates a security review readiness signal after repeated Patient Link access failures.', 'security', 'system', 'disabled', true, false, false, '{"seeded_in":"phase5g_step2","runtime_required":true}'::jsonb)
on conflict do nothing;

comment on table public.workflow_event_outbox is 'Central normalized workflow outbox for domain events. Does not replace domain workflow-event tables.';
comment on table public.workflow_definitions is 'Workflow definition shell for system and tenant workflows.';
comment on table public.workflow_definition_versions is 'Immutable workflow definition versions with controlled trigger, condition and action configuration.';
comment on table public.workflow_executions is 'Workflow run records created from normalized events or schedules.';
comment on table public.workflow_step_executions is 'Step/action execution records for retryable workflow actions.';
comment on table public.workflow_scheduled_jobs is 'Durable delayed and scheduled workflow job records.';
comment on table public.workflow_dead_letters is 'Workflow dead-letter records for safe review and retry.';
comment on table public.workflow_action_requests is 'Controlled action request readiness table. Actions are not executed by this migration.';
comment on table public.communication_requests is 'Communication request readiness table. Email, SMS and WhatsApp delivery are deferred.';
comment on table public.staff_tasks is 'Minimal staff task readiness table for workflow-created follow-up tasks.';

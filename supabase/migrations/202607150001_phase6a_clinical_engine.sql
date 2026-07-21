-- AlliDesk Phase 6A: Clinical Engine database foundation.
-- Scope: clinical encounters, clinical notes, note versions, note amendments,
-- clinical templates, treatment plans/goals, assessments/outcome measures,
-- diagnoses, clinical attachment metadata, clinical restrictions, explicit
-- Patient Link publication boundaries, and lifecycle RPCs.
--
-- Architecture notes:
-- - Clinical Engine owns clinical records only.
-- - Bookings, sessions, finance records, documents and Patient Link remain
--   separate domains.
-- - Finalised/signed note content is non-destructively immutable.
-- - Amendments append history instead of changing signed content.
-- - Super Admin has no default access to tenant clinical content.
-- - Patient Link exposure is explicit and contains safe publication metadata,
--   not unrestricted clinical content.

create table public.clinical_encounters (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  booking_id uuid references public.bookings(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  responsible_therapist_profile_id uuid references public.therapist_profiles(id) on delete set null,
  practice_location_id uuid references public.practice_locations(id) on delete set null,
  encounter_type text not null default 'session',
  encounter_status text not null default 'draft',
  clinical_visibility text not null default 'internal',
  occurred_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  summary text,
  restricted_reason text,
  metadata jsonb not null default '{}'::jsonb,
  lock_version integer not null default 1,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinical_encounters_type_check
    check (encounter_type in ('session', 'assessment', 'review', 'case_management', 'feedback', 'report_preparation', 'document_review', 'external_contact', 'other')),
  constraint clinical_encounters_status_check
    check (encounter_status in ('draft', 'in_progress', 'completed', 'cancelled', 'entered_in_error', 'archived')),
  constraint clinical_encounters_visibility_check
    check (clinical_visibility in ('internal', 'restricted', 'patient_facing')),
  constraint clinical_encounters_time_order_check
    check (started_at is null or ended_at is null or started_at <= ended_at),
  constraint clinical_encounters_metadata_object_check
    check (jsonb_typeof(metadata) = 'object'),
  constraint clinical_encounters_lock_version_check
    check (lock_version > 0)
);

create table public.clinical_note_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  template_owner_type text not null default 'tenant',
  template_key text not null,
  name text not null,
  description text,
  discipline_tags text[] not null default '{}'::text[],
  template_status text not null default 'draft',
  active_version_id uuid,
  is_system_template boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinical_note_templates_owner_type_check
    check (template_owner_type in ('system', 'tenant')),
  constraint clinical_note_templates_status_check
    check (template_status in ('draft', 'active', 'retired', 'archived')),
  constraint clinical_note_templates_key_not_blank_check
    check (btrim(template_key) <> ''),
  constraint clinical_note_templates_name_not_blank_check
    check (btrim(name) <> ''),
  constraint clinical_note_templates_metadata_object_check
    check (jsonb_typeof(metadata) = 'object'),
  constraint clinical_note_templates_owner_scope_check
    check (
      (template_owner_type = 'system' and tenant_id is null and is_system_template = true)
      or (template_owner_type = 'tenant' and tenant_id is not null and is_system_template = false)
    )
);

create table public.clinical_note_template_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  clinical_note_template_id uuid not null references public.clinical_note_templates(id) on delete cascade,
  version_number integer not null,
  version_status text not null default 'draft',
  template_schema jsonb not null default '{}'::jsonb,
  default_structured_content jsonb not null default '{}'::jsonb,
  default_free_text text,
  required_fields text[] not null default '{}'::text[],
  visibility_default text not null default 'internal',
  published_at timestamptz,
  published_by_profile_id uuid references public.profiles(id) on delete set null,
  retired_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinical_note_template_versions_number_check
    check (version_number > 0),
  constraint clinical_note_template_versions_status_check
    check (version_status in ('draft', 'active', 'retired', 'archived')),
  constraint clinical_note_template_versions_visibility_check
    check (visibility_default in ('internal', 'restricted', 'patient_facing')),
  constraint clinical_note_template_versions_schema_object_check
    check (jsonb_typeof(template_schema) = 'object'),
  constraint clinical_note_template_versions_default_object_check
    check (jsonb_typeof(default_structured_content) = 'object'),
  constraint clinical_note_template_versions_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

alter table public.clinical_note_templates
  add constraint clinical_note_templates_active_version_fk
  foreign key (active_version_id)
  references public.clinical_note_template_versions(id)
  on delete set null
  deferrable initially deferred;

create table public.clinical_notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  clinical_encounter_id uuid references public.clinical_encounters(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  responsible_therapist_profile_id uuid references public.therapist_profiles(id) on delete set null,
  author_profile_id uuid references public.profiles(id) on delete set null,
  note_type text not null default 'progress_note',
  note_title text,
  note_status text not null default 'draft',
  clinical_visibility text not null default 'internal',
  patient_visible_allowed boolean not null default false,
  is_restricted boolean not null default false,
  latest_version_id uuid,
  finalised_at timestamptz,
  finalised_by_profile_id uuid references public.profiles(id) on delete set null,
  signed_at timestamptz,
  signed_by_profile_id uuid references public.profiles(id) on delete set null,
  amended_at timestamptz,
  amended_by_profile_id uuid references public.profiles(id) on delete set null,
  locked_at timestamptz,
  locked_by_profile_id uuid references public.profiles(id) on delete set null,
  amendment_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  lock_version integer not null default 1,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinical_notes_type_check
    check (note_type in ('progress_note', 'process_note', 'session_feedback', 'assessment_note', 'case_management', 'report_note', 'treatment_plan_note', 'goal_review', 'other')),
  constraint clinical_notes_status_check
    check (note_status in ('draft', 'in_progress', 'finalised', 'signed', 'amended', 'locked', 'entered_in_error', 'archived')),
  constraint clinical_notes_visibility_check
    check (clinical_visibility in ('internal', 'restricted', 'patient_facing')),
  constraint clinical_notes_metadata_object_check
    check (jsonb_typeof(metadata) = 'object'),
  constraint clinical_notes_amendment_count_check
    check (amendment_count >= 0),
  constraint clinical_notes_lock_version_check
    check (lock_version > 0),
  constraint clinical_notes_patient_visibility_check
    check (patient_visible_allowed = false or clinical_visibility = 'patient_facing')
);

create table public.clinical_note_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  clinical_note_id uuid not null references public.clinical_notes(id) on delete cascade,
  version_number integer not null,
  clinical_note_template_version_id uuid references public.clinical_note_template_versions(id) on delete set null,
  free_text_content text,
  structured_content jsonb not null default '{}'::jsonb,
  version_status text not null default 'draft',
  author_profile_id uuid references public.profiles(id) on delete set null,
  finalised_at timestamptz,
  finalised_by_profile_id uuid references public.profiles(id) on delete set null,
  signed_at timestamptz,
  signed_by_profile_id uuid references public.profiles(id) on delete set null,
  signature_statement text,
  content_hash text,
  signature_hash text,
  change_reason text,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinical_note_versions_number_check
    check (version_number > 0),
  constraint clinical_note_versions_status_check
    check (version_status in ('draft', 'finalised', 'signed', 'amended', 'locked', 'entered_in_error')),
  constraint clinical_note_versions_structured_content_object_check
    check (jsonb_typeof(structured_content) = 'object'),
  constraint clinical_note_versions_metadata_object_check
    check (jsonb_typeof(metadata) = 'object'),
  constraint clinical_note_versions_finalised_state_check
    check (
      version_status not in ('finalised', 'signed', 'amended', 'locked')
      or (finalised_at is not null and finalised_by_profile_id is not null and content_hash is not null)
    ),
  constraint clinical_note_versions_signed_state_check
    check (
      version_status <> 'signed'
      or (signed_at is not null and signed_by_profile_id is not null and signature_hash is not null)
    )
);

alter table public.clinical_notes
  add constraint clinical_notes_latest_version_fk
  foreign key (latest_version_id)
  references public.clinical_note_versions(id)
  on delete set null
  deferrable initially deferred;

create table public.clinical_note_amendments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  clinical_note_id uuid not null references public.clinical_notes(id) on delete cascade,
  clinical_note_version_id uuid not null references public.clinical_note_versions(id) on delete restrict,
  amendment_number integer not null,
  amendment_reason text not null,
  amendment_free_text text,
  amendment_structured_content jsonb not null default '{}'::jsonb,
  author_profile_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint clinical_note_amendments_number_check
    check (amendment_number > 0),
  constraint clinical_note_amendments_reason_not_blank_check
    check (btrim(amendment_reason) <> ''),
  constraint clinical_note_amendments_structured_content_object_check
    check (jsonb_typeof(amendment_structured_content) = 'object'),
  constraint clinical_note_amendments_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create table public.treatment_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  responsible_therapist_profile_id uuid references public.therapist_profiles(id) on delete set null,
  plan_title text not null,
  plan_status text not null default 'draft',
  clinical_focus text,
  start_date date,
  end_date date,
  review_due_date date,
  patient_visible_allowed boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  lock_version integer not null default 1,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint treatment_plans_title_not_blank_check
    check (btrim(plan_title) <> ''),
  constraint treatment_plans_status_check
    check (plan_status in ('draft', 'active', 'paused', 'completed', 'discontinued', 'archived')),
  constraint treatment_plans_date_order_check
    check (start_date is null or end_date is null or start_date <= end_date),
  constraint treatment_plans_metadata_object_check
    check (jsonb_typeof(metadata) = 'object'),
  constraint treatment_plans_lock_version_check
    check (lock_version > 0)
);

create table public.clinical_goals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  treatment_plan_id uuid references public.treatment_plans(id) on delete cascade,
  clinical_encounter_id uuid references public.clinical_encounters(id) on delete set null,
  goal_domain text,
  goal_text text not null,
  measurable_criteria text,
  baseline_summary text,
  target_summary text,
  goal_status text not null default 'active',
  priority text not null default 'medium',
  review_due_date date,
  achieved_at timestamptz,
  discontinued_at timestamptz,
  patient_visible_allowed boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  lock_version integer not null default 1,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinical_goals_text_not_blank_check
    check (btrim(goal_text) <> ''),
  constraint clinical_goals_status_check
    check (goal_status in ('active', 'achieved', 'paused', 'discontinued', 'archived')),
  constraint clinical_goals_priority_check
    check (priority in ('low', 'medium', 'high', 'urgent')),
  constraint clinical_goals_metadata_object_check
    check (jsonb_typeof(metadata) = 'object'),
  constraint clinical_goals_lock_version_check
    check (lock_version > 0)
);

create table public.clinical_goal_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  clinical_goal_id uuid not null references public.clinical_goals(id) on delete cascade,
  review_status text not null default 'recorded',
  progress_rating numeric(5, 2),
  evidence_summary text,
  reviewed_by_profile_id uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint clinical_goal_reviews_status_check
    check (review_status in ('recorded', 'superseded', 'entered_in_error')),
  constraint clinical_goal_reviews_progress_rating_check
    check (progress_rating is null or (progress_rating >= 0 and progress_rating <= 100)),
  constraint clinical_goal_reviews_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create table public.outcome_measure_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  definition_owner_type text not null default 'tenant',
  measure_key text not null,
  name text not null,
  description text,
  discipline_tags text[] not null default '{}'::text[],
  scoring_method text,
  measure_schema jsonb not null default '{}'::jsonb,
  interpretation_rules jsonb not null default '{}'::jsonb,
  definition_status text not null default 'draft',
  version_label text,
  is_system_definition boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint outcome_measure_definitions_owner_type_check
    check (definition_owner_type in ('system', 'tenant')),
  constraint outcome_measure_definitions_status_check
    check (definition_status in ('draft', 'active', 'retired', 'archived')),
  constraint outcome_measure_definitions_key_not_blank_check
    check (btrim(measure_key) <> ''),
  constraint outcome_measure_definitions_name_not_blank_check
    check (btrim(name) <> ''),
  constraint outcome_measure_definitions_schema_object_check
    check (jsonb_typeof(measure_schema) = 'object'),
  constraint outcome_measure_definitions_rules_object_check
    check (jsonb_typeof(interpretation_rules) = 'object'),
  constraint outcome_measure_definitions_metadata_object_check
    check (jsonb_typeof(metadata) = 'object'),
  constraint outcome_measure_definitions_owner_scope_check
    check (
      (definition_owner_type = 'system' and tenant_id is null and is_system_definition = true)
      or (definition_owner_type = 'tenant' and tenant_id is not null and is_system_definition = false)
    )
);

create table public.clinical_assessments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  clinical_encounter_id uuid references public.clinical_encounters(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  outcome_measure_definition_id uuid references public.outcome_measure_definitions(id) on delete set null,
  assessor_therapist_profile_id uuid references public.therapist_profiles(id) on delete set null,
  assessment_type text not null default 'clinical',
  assessment_status text not null default 'draft',
  assessment_date date,
  summary text,
  interpretation text,
  patient_visible_allowed boolean not null default false,
  is_restricted boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  lock_version integer not null default 1,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinical_assessments_type_check
    check (assessment_type in ('clinical', 'standardised', 'screening', 'informal', 'outcome_measure', 'other')),
  constraint clinical_assessments_status_check
    check (assessment_status in ('draft', 'completed', 'finalised', 'amended', 'archived', 'entered_in_error')),
  constraint clinical_assessments_metadata_object_check
    check (jsonb_typeof(metadata) = 'object'),
  constraint clinical_assessments_lock_version_check
    check (lock_version > 0)
);

create table public.outcome_measure_results (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  clinical_assessment_id uuid references public.clinical_assessments(id) on delete cascade,
  outcome_measure_definition_id uuid references public.outcome_measure_definitions(id) on delete set null,
  clinical_encounter_id uuid references public.clinical_encounters(id) on delete set null,
  assessor_therapist_profile_id uuid references public.therapist_profiles(id) on delete set null,
  result_date date,
  raw_score numeric(12, 4),
  interpreted_score text,
  response_set jsonb not null default '{}'::jsonb,
  clinical_visibility text not null default 'internal',
  result_status text not null default 'draft',
  patient_visible_allowed boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  lock_version integer not null default 1,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint outcome_measure_results_visibility_check
    check (clinical_visibility in ('internal', 'restricted', 'patient_facing')),
  constraint outcome_measure_results_status_check
    check (result_status in ('draft', 'finalised', 'amended', 'archived', 'entered_in_error')),
  constraint outcome_measure_results_response_set_object_check
    check (jsonb_typeof(response_set) = 'object'),
  constraint outcome_measure_results_metadata_object_check
    check (jsonb_typeof(metadata) = 'object'),
  constraint outcome_measure_results_lock_version_check
    check (lock_version > 0),
  constraint outcome_measure_results_patient_visibility_check
    check (patient_visible_allowed = false or clinical_visibility = 'patient_facing')
);

create table public.clinical_diagnoses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  source_clinical_note_id uuid references public.clinical_notes(id) on delete set null,
  source_clinical_assessment_id uuid references public.clinical_assessments(id) on delete set null,
  practitioner_therapist_profile_id uuid references public.therapist_profiles(id) on delete set null,
  coding_system text not null default 'ICD-10',
  code text not null,
  label text,
  diagnosis_status text not null default 'active',
  is_primary boolean not null default false,
  onset_date date,
  resolved_date date,
  patient_visible_allowed boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinical_diagnoses_coding_system_not_blank_check
    check (btrim(coding_system) <> ''),
  constraint clinical_diagnoses_code_not_blank_check
    check (btrim(code) <> ''),
  constraint clinical_diagnoses_status_check
    check (diagnosis_status in ('active', 'resolved', 'entered_in_error', 'archived')),
  constraint clinical_diagnoses_date_order_check
    check (onset_date is null or resolved_date is null or onset_date <= resolved_date),
  constraint clinical_diagnoses_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create table public.clinical_attachments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  clinical_encounter_id uuid references public.clinical_encounters(id) on delete set null,
  clinical_note_id uuid references public.clinical_notes(id) on delete set null,
  clinical_assessment_id uuid references public.clinical_assessments(id) on delete set null,
  attachment_category text not null default 'supporting_document',
  storage_bucket text,
  storage_path text,
  external_document_id text,
  file_name text not null,
  mime_type text,
  file_size_bytes bigint,
  description text,
  is_restricted boolean not null default false,
  patient_visible_allowed boolean not null default false,
  uploaded_by_profile_id uuid references public.profiles(id) on delete set null,
  archived_at timestamptz,
  archived_by_profile_id uuid references public.profiles(id) on delete set null,
  archive_reason text,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinical_attachments_category_check
    check (attachment_category in ('assessment_file', 'clinical_image', 'report', 'external_document', 'supporting_document', 'other')),
  constraint clinical_attachments_file_name_not_blank_check
    check (btrim(file_name) <> ''),
  constraint clinical_attachments_file_size_check
    check (file_size_bytes is null or file_size_bytes >= 0),
  constraint clinical_attachments_metadata_object_check
    check (jsonb_typeof(metadata) = 'object'),
  constraint clinical_attachments_archived_state_check
    check (archived_at is null or archive_reason is not null)
);

create table public.clinical_record_restrictions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  record_type text not null,
  record_id uuid not null,
  restriction_reason text not null,
  restriction_status text not null default 'active',
  applied_by_profile_id uuid references public.profiles(id) on delete set null,
  applied_at timestamptz not null default now(),
  removed_by_profile_id uuid references public.profiles(id) on delete set null,
  removed_at timestamptz,
  review_due_date date,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinical_record_restrictions_type_check
    check (record_type in ('clinical_encounter', 'clinical_note', 'clinical_note_version', 'treatment_plan', 'clinical_goal', 'clinical_assessment', 'outcome_measure_result', 'clinical_diagnosis', 'clinical_attachment')),
  constraint clinical_record_restrictions_reason_not_blank_check
    check (btrim(restriction_reason) <> ''),
  constraint clinical_record_restrictions_status_check
    check (restriction_status in ('active', 'removed')),
  constraint clinical_record_restrictions_removed_state_check
    check (
      (restriction_status = 'removed' and removed_at is not null and removed_by_profile_id is not null)
      or restriction_status = 'active'
    ),
  constraint clinical_record_restrictions_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create table public.clinical_patient_link_publications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  patient_link_id uuid references public.patient_links(id) on delete set null,
  record_type text not null,
  record_id uuid not null,
  publication_status text not null default 'draft',
  safe_title text not null,
  safe_summary text,
  published_at timestamptz,
  published_by_profile_id uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz,
  revoked_by_profile_id uuid references public.profiles(id) on delete set null,
  revoke_reason text,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinical_patient_link_publications_type_check
    check (record_type in ('clinical_note', 'clinical_attachment', 'treatment_plan', 'clinical_assessment', 'outcome_measure_result')),
  constraint clinical_patient_link_publications_status_check
    check (publication_status in ('draft', 'published', 'revoked', 'expired')),
  constraint clinical_patient_link_publications_safe_title_not_blank_check
    check (btrim(safe_title) <> ''),
  constraint clinical_patient_link_publications_published_state_check
    check (
      (publication_status = 'published' and published_at is not null and published_by_profile_id is not null)
      or publication_status <> 'published'
    ),
  constraint clinical_patient_link_publications_revoked_state_check
    check (
      (publication_status = 'revoked' and revoked_at is not null and revoked_by_profile_id is not null)
      or publication_status <> 'revoked'
    ),
  constraint clinical_patient_link_publications_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create table public.clinical_workflow_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  patient_id uuid references public.patients(id) on delete set null,
  clinical_encounter_id uuid references public.clinical_encounters(id) on delete set null,
  clinical_note_id uuid references public.clinical_notes(id) on delete set null,
  clinical_note_version_id uuid references public.clinical_note_versions(id) on delete set null,
  treatment_plan_id uuid references public.treatment_plans(id) on delete set null,
  clinical_goal_id uuid references public.clinical_goals(id) on delete set null,
  clinical_assessment_id uuid references public.clinical_assessments(id) on delete set null,
  event_type text not null,
  event_key text,
  workflow_status text not null default 'pending',
  occurred_at timestamptz not null default now(),
  processed_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinical_workflow_events_type_not_blank_check
    check (btrim(event_type) <> ''),
  constraint clinical_workflow_events_status_check
    check (workflow_status in ('pending', 'processed', 'failed', 'ignored')),
  constraint clinical_workflow_events_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create or replace function public.increment_clinical_lock_version()
returns trigger
language plpgsql
as $$
begin
  if new.lock_version = old.lock_version then
    new.lock_version = old.lock_version + 1;
  end if;
  return new;
end;
$$;

create or replace function public.enforce_clinical_note_version_immutability()
returns trigger
language plpgsql
as $$
begin
  if old.version_status <> 'draft' then
    if new.free_text_content is distinct from old.free_text_content
      or new.structured_content is distinct from old.structured_content
      or new.clinical_note_template_version_id is distinct from old.clinical_note_template_version_id
      or new.clinical_note_id is distinct from old.clinical_note_id
      or new.version_number is distinct from old.version_number
      or new.author_profile_id is distinct from old.author_profile_id
      or new.finalised_at is distinct from old.finalised_at
      or new.finalised_by_profile_id is distinct from old.finalised_by_profile_id
      or new.content_hash is distinct from old.content_hash
      or new.deleted_at is distinct from old.deleted_at then
      raise exception 'Finalised clinical note version content cannot be destructively edited';
    end if;

    if old.version_status in ('signed', 'amended', 'locked')
      and (
        new.signed_at is distinct from old.signed_at
        or new.signed_by_profile_id is distinct from old.signed_by_profile_id
        or new.signature_statement is distinct from old.signature_statement
        or new.signature_hash is distinct from old.signature_hash
      ) then
      raise exception 'Signed clinical note metadata cannot be destructively edited';
    end if;

    if old.version_status = 'finalised'
      and new.version_status not in ('finalised', 'signed', 'amended', 'locked') then
      raise exception 'Finalised clinical note versions cannot return to draft';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_clinical_template_version_immutability()
returns trigger
language plpgsql
as $$
begin
  if old.version_status in ('active', 'retired', 'archived') then
    if new.template_schema is distinct from old.template_schema
      or new.default_structured_content is distinct from old.default_structured_content
      or new.default_free_text is distinct from old.default_free_text
      or new.required_fields is distinct from old.required_fields
      or new.clinical_note_template_id is distinct from old.clinical_note_template_id
      or new.version_number is distinct from old.version_number
      or new.deleted_at is distinct from old.deleted_at then
      raise exception 'Published clinical template versions cannot be destructively edited';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_clinical_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Clinical append-only records cannot be updated or deleted';
end;
$$;

create or replace function public.validate_clinical_tenant_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_data jsonb;
  related_id uuid;
  related_tenant_id uuid;
begin
  row_data := to_jsonb(new);

  if row_data ? 'patient_id' and row_data ->> 'patient_id' is not null then
    related_id := (row_data ->> 'patient_id')::uuid;
    select p.tenant_id into related_tenant_id from public.patients p where p.id = related_id and p.deleted_at is null;
    if related_tenant_id is null or related_tenant_id <> new.tenant_id then
      raise exception 'Clinical patient must belong to the same tenant';
    end if;
  end if;

  if row_data ? 'booking_id' and row_data ->> 'booking_id' is not null then
    related_id := (row_data ->> 'booking_id')::uuid;
    select b.tenant_id into related_tenant_id from public.bookings b where b.id = related_id and b.deleted_at is null;
    if related_tenant_id is null or related_tenant_id <> new.tenant_id then
      raise exception 'Clinical booking must belong to the same tenant';
    end if;
  end if;

  if row_data ? 'session_id' and row_data ->> 'session_id' is not null then
    related_id := (row_data ->> 'session_id')::uuid;
    select s.tenant_id into related_tenant_id from public.sessions s where s.id = related_id and s.deleted_at is null;
    if related_tenant_id is null or related_tenant_id <> new.tenant_id then
      raise exception 'Clinical session must belong to the same tenant';
    end if;
  end if;

  if row_data ? 'responsible_therapist_profile_id' and row_data ->> 'responsible_therapist_profile_id' is not null then
    related_id := (row_data ->> 'responsible_therapist_profile_id')::uuid;
    select tp.tenant_id into related_tenant_id from public.therapist_profiles tp where tp.id = related_id and tp.deleted_at is null;
    if related_tenant_id is null or related_tenant_id <> new.tenant_id then
      raise exception 'Clinical responsible therapist must belong to the same tenant';
    end if;
  end if;

  if row_data ? 'therapist_profile_id' and row_data ->> 'therapist_profile_id' is not null then
    related_id := (row_data ->> 'therapist_profile_id')::uuid;
    select tp.tenant_id into related_tenant_id from public.therapist_profiles tp where tp.id = related_id and tp.deleted_at is null;
    if related_tenant_id is null or related_tenant_id <> new.tenant_id then
      raise exception 'Clinical therapist must belong to the same tenant';
    end if;
  end if;

  if row_data ? 'assessor_therapist_profile_id' and row_data ->> 'assessor_therapist_profile_id' is not null then
    related_id := (row_data ->> 'assessor_therapist_profile_id')::uuid;
    select tp.tenant_id into related_tenant_id from public.therapist_profiles tp where tp.id = related_id and tp.deleted_at is null;
    if related_tenant_id is null or related_tenant_id <> new.tenant_id then
      raise exception 'Clinical assessor must belong to the same tenant';
    end if;
  end if;

  if row_data ? 'practice_location_id' and row_data ->> 'practice_location_id' is not null then
    related_id := (row_data ->> 'practice_location_id')::uuid;
    select pl.tenant_id into related_tenant_id from public.practice_locations pl where pl.id = related_id and pl.deleted_at is null;
    if related_tenant_id is null or related_tenant_id <> new.tenant_id then
      raise exception 'Clinical location must belong to the same tenant';
    end if;
  end if;

  if row_data ? 'clinical_encounter_id' and row_data ->> 'clinical_encounter_id' is not null then
    related_id := (row_data ->> 'clinical_encounter_id')::uuid;
    select ce.tenant_id into related_tenant_id from public.clinical_encounters ce where ce.id = related_id and ce.deleted_at is null;
    if related_tenant_id is null or related_tenant_id <> new.tenant_id then
      raise exception 'Clinical encounter must belong to the same tenant';
    end if;
  end if;

  if row_data ? 'clinical_note_id' and row_data ->> 'clinical_note_id' is not null then
    related_id := (row_data ->> 'clinical_note_id')::uuid;
    select cn.tenant_id into related_tenant_id from public.clinical_notes cn where cn.id = related_id and cn.deleted_at is null;
    if related_tenant_id is null or related_tenant_id <> new.tenant_id then
      raise exception 'Clinical note must belong to the same tenant';
    end if;
  end if;

  if row_data ? 'clinical_note_version_id' and row_data ->> 'clinical_note_version_id' is not null then
    related_id := (row_data ->> 'clinical_note_version_id')::uuid;
    select cnv.tenant_id into related_tenant_id from public.clinical_note_versions cnv where cnv.id = related_id and cnv.deleted_at is null;
    if related_tenant_id is null or related_tenant_id <> new.tenant_id then
      raise exception 'Clinical note version must belong to the same tenant';
    end if;
  end if;

  if row_data ? 'treatment_plan_id' and row_data ->> 'treatment_plan_id' is not null then
    related_id := (row_data ->> 'treatment_plan_id')::uuid;
    select tp.tenant_id into related_tenant_id from public.treatment_plans tp where tp.id = related_id and tp.deleted_at is null;
    if related_tenant_id is null or related_tenant_id <> new.tenant_id then
      raise exception 'Treatment plan must belong to the same tenant';
    end if;
  end if;

  if row_data ? 'clinical_goal_id' and row_data ->> 'clinical_goal_id' is not null then
    related_id := (row_data ->> 'clinical_goal_id')::uuid;
    select cg.tenant_id into related_tenant_id from public.clinical_goals cg where cg.id = related_id and cg.deleted_at is null;
    if related_tenant_id is null or related_tenant_id <> new.tenant_id then
      raise exception 'Clinical goal must belong to the same tenant';
    end if;
  end if;

  if row_data ? 'clinical_assessment_id' and row_data ->> 'clinical_assessment_id' is not null then
    related_id := (row_data ->> 'clinical_assessment_id')::uuid;
    select ca.tenant_id into related_tenant_id from public.clinical_assessments ca where ca.id = related_id and ca.deleted_at is null;
    if related_tenant_id is null or related_tenant_id <> new.tenant_id then
      raise exception 'Clinical assessment must belong to the same tenant';
    end if;
  end if;

  if row_data ? 'outcome_measure_definition_id' and row_data ->> 'outcome_measure_definition_id' is not null then
    related_id := (row_data ->> 'outcome_measure_definition_id')::uuid;
    select omd.tenant_id into related_tenant_id from public.outcome_measure_definitions omd where omd.id = related_id and omd.deleted_at is null;
    if related_tenant_id is not null and related_tenant_id <> new.tenant_id then
      raise exception 'Outcome measure definition must belong to the same tenant or be system-owned';
    end if;
  end if;

  if row_data ? 'clinical_note_template_version_id' and row_data ->> 'clinical_note_template_version_id' is not null then
    related_id := (row_data ->> 'clinical_note_template_version_id')::uuid;
    select cntv.tenant_id into related_tenant_id from public.clinical_note_template_versions cntv where cntv.id = related_id and cntv.deleted_at is null;
    if related_tenant_id is not null and related_tenant_id <> new.tenant_id then
      raise exception 'Clinical template version must belong to the same tenant or be system-owned';
    end if;
  end if;

  if row_data ? 'patient_link_id' and row_data ->> 'patient_link_id' is not null then
    related_id := (row_data ->> 'patient_link_id')::uuid;
    select pl.tenant_id into related_tenant_id from public.patient_links pl where pl.id = related_id and pl.deleted_at is null;
    if related_tenant_id is null or related_tenant_id <> new.tenant_id then
      raise exception 'Clinical Patient Link publication must reference a Patient Link in the same tenant';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.validate_clinical_note_template_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  version_record public.clinical_note_template_versions%rowtype;
begin
  if new.active_version_id is not null then
    select *
    into version_record
    from public.clinical_note_template_versions
    where id = new.active_version_id
      and deleted_at is null;

    if version_record.id is null then
      raise exception 'Active clinical template version not found';
    end if;

    if version_record.clinical_note_template_id <> new.id then
      raise exception 'Active clinical template version must belong to the same template';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.validate_clinical_note_template_version_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  template_record public.clinical_note_templates%rowtype;
begin
  select *
  into template_record
  from public.clinical_note_templates
  where id = new.clinical_note_template_id
    and deleted_at is null;

  if template_record.id is null then
    raise exception 'Clinical note template not found';
  end if;

  if template_record.template_owner_type = 'system' then
    if new.tenant_id is not null then
      raise exception 'System clinical template versions must not be tenant scoped';
    end if;
  elsif template_record.tenant_id is null or template_record.tenant_id <> new.tenant_id then
    raise exception 'Clinical template version must belong to the same tenant as the template';
  end if;

  return new;
end;
$$;

create trigger clinical_encounters_set_updated_at before update on public.clinical_encounters for each row execute function public.set_updated_at();
create trigger clinical_note_templates_set_updated_at before update on public.clinical_note_templates for each row execute function public.set_updated_at();
create trigger clinical_note_template_versions_set_updated_at before update on public.clinical_note_template_versions for each row execute function public.set_updated_at();
create trigger clinical_notes_set_updated_at before update on public.clinical_notes for each row execute function public.set_updated_at();
create trigger clinical_note_versions_set_updated_at before update on public.clinical_note_versions for each row execute function public.set_updated_at();
create trigger treatment_plans_set_updated_at before update on public.treatment_plans for each row execute function public.set_updated_at();
create trigger clinical_goals_set_updated_at before update on public.clinical_goals for each row execute function public.set_updated_at();
create trigger outcome_measure_definitions_set_updated_at before update on public.outcome_measure_definitions for each row execute function public.set_updated_at();
create trigger clinical_assessments_set_updated_at before update on public.clinical_assessments for each row execute function public.set_updated_at();
create trigger outcome_measure_results_set_updated_at before update on public.outcome_measure_results for each row execute function public.set_updated_at();
create trigger clinical_diagnoses_set_updated_at before update on public.clinical_diagnoses for each row execute function public.set_updated_at();
create trigger clinical_attachments_set_updated_at before update on public.clinical_attachments for each row execute function public.set_updated_at();
create trigger clinical_record_restrictions_set_updated_at before update on public.clinical_record_restrictions for each row execute function public.set_updated_at();
create trigger clinical_patient_link_publications_set_updated_at before update on public.clinical_patient_link_publications for each row execute function public.set_updated_at();
create trigger clinical_workflow_events_set_updated_at before update on public.clinical_workflow_events for each row execute function public.set_updated_at();

create trigger clinical_encounters_increment_lock_version before update on public.clinical_encounters for each row execute function public.increment_clinical_lock_version();
create trigger clinical_notes_increment_lock_version before update on public.clinical_notes for each row execute function public.increment_clinical_lock_version();
create trigger treatment_plans_increment_lock_version before update on public.treatment_plans for each row execute function public.increment_clinical_lock_version();
create trigger clinical_goals_increment_lock_version before update on public.clinical_goals for each row execute function public.increment_clinical_lock_version();
create trigger clinical_assessments_increment_lock_version before update on public.clinical_assessments for each row execute function public.increment_clinical_lock_version();
create trigger outcome_measure_results_increment_lock_version before update on public.outcome_measure_results for each row execute function public.increment_clinical_lock_version();

create trigger clinical_note_versions_enforce_immutability
before update on public.clinical_note_versions
for each row execute function public.enforce_clinical_note_version_immutability();

create trigger clinical_note_template_versions_enforce_immutability
before update on public.clinical_note_template_versions
for each row execute function public.enforce_clinical_template_version_immutability();

create trigger clinical_note_amendments_append_only
before update or delete on public.clinical_note_amendments
for each row execute function public.enforce_clinical_append_only();

create trigger clinical_goal_reviews_append_only
before update or delete on public.clinical_goal_reviews
for each row execute function public.enforce_clinical_append_only();

create trigger clinical_note_templates_validate_integrity before insert or update of id, active_version_id on public.clinical_note_templates for each row execute function public.validate_clinical_note_template_integrity();
create trigger clinical_note_template_versions_validate_integrity before insert or update of tenant_id, clinical_note_template_id on public.clinical_note_template_versions for each row execute function public.validate_clinical_note_template_version_integrity();
create trigger clinical_encounters_validate_tenant_integrity before insert or update of tenant_id, patient_id, booking_id, session_id, responsible_therapist_profile_id, practice_location_id on public.clinical_encounters for each row execute function public.validate_clinical_tenant_integrity();
create trigger clinical_notes_validate_tenant_integrity before insert or update of tenant_id, patient_id, clinical_encounter_id, booking_id, session_id, responsible_therapist_profile_id on public.clinical_notes for each row execute function public.validate_clinical_tenant_integrity();
create trigger clinical_note_versions_validate_tenant_integrity before insert or update of tenant_id, clinical_note_id, clinical_note_template_version_id on public.clinical_note_versions for each row execute function public.validate_clinical_tenant_integrity();
create trigger clinical_note_amendments_validate_tenant_integrity before insert on public.clinical_note_amendments for each row execute function public.validate_clinical_tenant_integrity();
create trigger treatment_plans_validate_tenant_integrity before insert or update of tenant_id, patient_id, responsible_therapist_profile_id on public.treatment_plans for each row execute function public.validate_clinical_tenant_integrity();
create trigger clinical_goals_validate_tenant_integrity before insert or update of tenant_id, patient_id, treatment_plan_id, clinical_encounter_id on public.clinical_goals for each row execute function public.validate_clinical_tenant_integrity();
create trigger clinical_goal_reviews_validate_tenant_integrity before insert on public.clinical_goal_reviews for each row execute function public.validate_clinical_tenant_integrity();
create trigger clinical_assessments_validate_tenant_integrity before insert or update of tenant_id, patient_id, clinical_encounter_id, session_id, outcome_measure_definition_id, assessor_therapist_profile_id on public.clinical_assessments for each row execute function public.validate_clinical_tenant_integrity();
create trigger outcome_measure_results_validate_tenant_integrity before insert or update of tenant_id, patient_id, clinical_assessment_id, outcome_measure_definition_id, clinical_encounter_id, assessor_therapist_profile_id on public.outcome_measure_results for each row execute function public.validate_clinical_tenant_integrity();
create trigger clinical_diagnoses_validate_tenant_integrity before insert or update of tenant_id, patient_id, source_clinical_note_id, source_clinical_assessment_id, practitioner_therapist_profile_id on public.clinical_diagnoses for each row execute function public.validate_clinical_tenant_integrity();
create trigger clinical_attachments_validate_tenant_integrity before insert or update of tenant_id, patient_id, clinical_encounter_id, clinical_note_id, clinical_assessment_id on public.clinical_attachments for each row execute function public.validate_clinical_tenant_integrity();
create trigger clinical_record_restrictions_validate_tenant_integrity before insert or update of tenant_id, patient_id on public.clinical_record_restrictions for each row execute function public.validate_clinical_tenant_integrity();
create trigger clinical_patient_link_publications_validate_tenant_integrity before insert or update of tenant_id, patient_id, patient_link_id on public.clinical_patient_link_publications for each row execute function public.validate_clinical_tenant_integrity();
create trigger clinical_workflow_events_validate_tenant_integrity before insert or update of tenant_id, patient_id, clinical_encounter_id, clinical_note_id, clinical_note_version_id, treatment_plan_id, clinical_goal_id, clinical_assessment_id on public.clinical_workflow_events for each row execute function public.validate_clinical_tenant_integrity();

create index clinical_encounters_tenant_patient_idx on public.clinical_encounters (tenant_id, patient_id, occurred_at desc) where deleted_at is null;
create index clinical_encounters_session_idx on public.clinical_encounters (session_id) where session_id is not null and deleted_at is null;
create index clinical_encounters_booking_idx on public.clinical_encounters (booking_id) where booking_id is not null and deleted_at is null;
create index clinical_encounters_therapist_idx on public.clinical_encounters (tenant_id, responsible_therapist_profile_id) where responsible_therapist_profile_id is not null and deleted_at is null;
create index clinical_encounters_status_idx on public.clinical_encounters (tenant_id, encounter_status) where deleted_at is null;

create unique index clinical_note_templates_tenant_key_idx on public.clinical_note_templates (tenant_id, lower(template_key)) where tenant_id is not null and deleted_at is null;
create unique index clinical_note_templates_system_key_idx on public.clinical_note_templates (lower(template_key)) where tenant_id is null and deleted_at is null;
create index clinical_note_templates_status_idx on public.clinical_note_templates (tenant_id, template_status) where deleted_at is null;
create unique index clinical_note_template_versions_number_idx on public.clinical_note_template_versions (clinical_note_template_id, version_number) where deleted_at is null;
create unique index clinical_note_template_versions_one_active_idx on public.clinical_note_template_versions (clinical_note_template_id) where version_status = 'active' and deleted_at is null;
create index clinical_note_template_versions_tenant_idx on public.clinical_note_template_versions (tenant_id) where deleted_at is null;

create index clinical_notes_tenant_patient_idx on public.clinical_notes (tenant_id, patient_id, created_at desc) where deleted_at is null;
create index clinical_notes_encounter_idx on public.clinical_notes (clinical_encounter_id) where clinical_encounter_id is not null and deleted_at is null;
create index clinical_notes_session_idx on public.clinical_notes (session_id) where session_id is not null and deleted_at is null;
create index clinical_notes_status_idx on public.clinical_notes (tenant_id, note_status) where deleted_at is null;
create index clinical_notes_author_idx on public.clinical_notes (tenant_id, author_profile_id) where author_profile_id is not null and deleted_at is null;
create index clinical_note_versions_note_idx on public.clinical_note_versions (clinical_note_id, version_number desc) where deleted_at is null;
create unique index clinical_note_versions_number_idx on public.clinical_note_versions (clinical_note_id, version_number) where deleted_at is null;
create index clinical_note_versions_status_idx on public.clinical_note_versions (tenant_id, version_status) where deleted_at is null;
create unique index clinical_note_amendments_number_idx on public.clinical_note_amendments (clinical_note_id, amendment_number) where deleted_at is null;
create index clinical_note_amendments_note_idx on public.clinical_note_amendments (clinical_note_id, created_at desc) where deleted_at is null;

create index treatment_plans_tenant_patient_idx on public.treatment_plans (tenant_id, patient_id) where deleted_at is null;
create index treatment_plans_status_idx on public.treatment_plans (tenant_id, plan_status) where deleted_at is null;
create index clinical_goals_tenant_patient_idx on public.clinical_goals (tenant_id, patient_id) where deleted_at is null;
create index clinical_goals_plan_idx on public.clinical_goals (treatment_plan_id) where treatment_plan_id is not null and deleted_at is null;
create index clinical_goals_status_idx on public.clinical_goals (tenant_id, goal_status) where deleted_at is null;
create index clinical_goal_reviews_goal_idx on public.clinical_goal_reviews (clinical_goal_id, reviewed_at desc) where deleted_at is null;

create unique index outcome_measure_definitions_tenant_key_idx on public.outcome_measure_definitions (tenant_id, lower(measure_key)) where tenant_id is not null and deleted_at is null;
create unique index outcome_measure_definitions_system_key_idx on public.outcome_measure_definitions (lower(measure_key)) where tenant_id is null and deleted_at is null;
create index outcome_measure_definitions_status_idx on public.outcome_measure_definitions (tenant_id, definition_status) where deleted_at is null;
create index clinical_assessments_tenant_patient_idx on public.clinical_assessments (tenant_id, patient_id, assessment_date desc) where deleted_at is null;
create index clinical_assessments_encounter_idx on public.clinical_assessments (clinical_encounter_id) where clinical_encounter_id is not null and deleted_at is null;
create index clinical_assessments_status_idx on public.clinical_assessments (tenant_id, assessment_status) where deleted_at is null;
create index outcome_measure_results_patient_idx on public.outcome_measure_results (tenant_id, patient_id, result_date desc) where deleted_at is null;
create index outcome_measure_results_assessment_idx on public.outcome_measure_results (clinical_assessment_id) where clinical_assessment_id is not null and deleted_at is null;

create index clinical_diagnoses_patient_idx on public.clinical_diagnoses (tenant_id, patient_id, diagnosis_status) where deleted_at is null;
create unique index clinical_diagnoses_one_primary_active_idx on public.clinical_diagnoses (patient_id) where is_primary = true and diagnosis_status = 'active' and deleted_at is null;
create index clinical_diagnoses_code_idx on public.clinical_diagnoses (tenant_id, coding_system, code) where deleted_at is null;
create index clinical_attachments_patient_idx on public.clinical_attachments (tenant_id, patient_id, created_at desc) where deleted_at is null;
create index clinical_attachments_note_idx on public.clinical_attachments (clinical_note_id) where clinical_note_id is not null and deleted_at is null;
create index clinical_record_restrictions_record_idx on public.clinical_record_restrictions (tenant_id, record_type, record_id) where deleted_at is null;
create index clinical_record_restrictions_patient_idx on public.clinical_record_restrictions (tenant_id, patient_id, restriction_status) where deleted_at is null;
create index clinical_patient_link_publications_patient_idx on public.clinical_patient_link_publications (tenant_id, patient_id, publication_status) where deleted_at is null;
create index clinical_patient_link_publications_record_idx on public.clinical_patient_link_publications (tenant_id, record_type, record_id) where deleted_at is null;
create unique index clinical_patient_link_publications_one_published_record_idx on public.clinical_patient_link_publications (tenant_id, record_type, record_id) where publication_status = 'published' and deleted_at is null;
create index clinical_workflow_events_tenant_status_idx on public.clinical_workflow_events (tenant_id, workflow_status, occurred_at) where deleted_at is null;
create unique index clinical_workflow_events_event_key_idx on public.clinical_workflow_events (tenant_id, event_key) where event_key is not null and deleted_at is null;

alter table public.clinical_encounters enable row level security;
alter table public.clinical_note_templates enable row level security;
alter table public.clinical_note_template_versions enable row level security;
alter table public.clinical_notes enable row level security;
alter table public.clinical_note_versions enable row level security;
alter table public.clinical_note_amendments enable row level security;
alter table public.treatment_plans enable row level security;
alter table public.clinical_goals enable row level security;
alter table public.clinical_goal_reviews enable row level security;
alter table public.outcome_measure_definitions enable row level security;
alter table public.clinical_assessments enable row level security;
alter table public.outcome_measure_results enable row level security;
alter table public.clinical_diagnoses enable row level security;
alter table public.clinical_attachments enable row level security;
alter table public.clinical_record_restrictions enable row level security;
alter table public.clinical_patient_link_publications enable row level security;
alter table public.clinical_workflow_events enable row level security;

do $$
declare
  clinical_table text;
begin
  foreach clinical_table in array array[
    'clinical_encounters',
    'treatment_plans',
    'clinical_goals',
    'clinical_assessments',
    'outcome_measure_results',
    'clinical_diagnoses',
    'clinical_attachments',
    'clinical_record_restrictions',
    'clinical_workflow_events'
  ] loop
    execute format('create policy %I on public.%I for select to authenticated using (deleted_at is null and public.has_tenant_role(tenant_id, array[''admin'', ''therapist'']))', 'tenant clinical users can read ' || clinical_table, clinical_table);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.has_tenant_role(tenant_id, array[''admin'', ''therapist'']))', 'tenant clinical users can create ' || clinical_table, clinical_table);
    execute format('create policy %I on public.%I for update to authenticated using (deleted_at is null and public.has_tenant_role(tenant_id, array[''admin'', ''therapist''])) with check (public.has_tenant_role(tenant_id, array[''admin'', ''therapist'']))', 'tenant clinical users can update ' || clinical_table, clinical_table);
  end loop;
end $$;

create policy "clinical users can read note templates"
on public.clinical_note_templates
for select
to authenticated
using (
  deleted_at is null
  and (
    tenant_id is null
    or public.has_tenant_role(tenant_id, array['admin', 'therapist'])
  )
);

create policy "clinical users can create tenant note templates"
on public.clinical_note_templates
for insert
to authenticated
with check (
  tenant_id is not null
  and public.has_tenant_role(tenant_id, array['admin', 'therapist'])
);

create policy "clinical users can update tenant note templates"
on public.clinical_note_templates
for update
to authenticated
using (
  deleted_at is null
  and (
    (tenant_id is null and public.is_super_admin())
    or public.has_tenant_role(tenant_id, array['admin', 'therapist'])
  )
)
with check (
  (tenant_id is null and public.is_super_admin())
  or public.has_tenant_role(tenant_id, array['admin', 'therapist'])
);

create policy "clinical users can read template versions"
on public.clinical_note_template_versions
for select
to authenticated
using (
  deleted_at is null
  and (
    tenant_id is null
    or public.has_tenant_role(tenant_id, array['admin', 'therapist'])
  )
);

create policy "clinical users can create tenant template versions"
on public.clinical_note_template_versions
for insert
to authenticated
with check (
  tenant_id is not null
  and public.has_tenant_role(tenant_id, array['admin', 'therapist'])
);

create policy "clinical users can update draft template versions"
on public.clinical_note_template_versions
for update
to authenticated
using (
  deleted_at is null
  and (
    (tenant_id is null and public.is_super_admin())
    or public.has_tenant_role(tenant_id, array['admin', 'therapist'])
  )
)
with check (
  version_status = 'draft'
  and (
    (tenant_id is null and public.is_super_admin())
    or public.has_tenant_role(tenant_id, array['admin', 'therapist'])
  )
);

create policy "tenant clinical users can read clinical notes"
on public.clinical_notes
for select
to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin', 'therapist']));

create policy "tenant clinical users can create clinical notes"
on public.clinical_notes
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'therapist']));

create policy "tenant clinical users can update draft clinical notes"
on public.clinical_notes
for update
to authenticated
using (
  deleted_at is null
  and note_status in ('draft', 'in_progress')
  and public.has_tenant_role(tenant_id, array['admin', 'therapist'])
)
with check (
  note_status in ('draft', 'in_progress')
  and public.has_tenant_role(tenant_id, array['admin', 'therapist'])
);

create policy "tenant clinical users can read note versions"
on public.clinical_note_versions
for select
to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin', 'therapist']));

create policy "tenant clinical users can create note versions"
on public.clinical_note_versions
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'therapist']));

create policy "tenant clinical users can update draft note versions"
on public.clinical_note_versions
for update
to authenticated
using (
  deleted_at is null
  and version_status = 'draft'
  and public.has_tenant_role(tenant_id, array['admin', 'therapist'])
)
with check (
  version_status = 'draft'
  and public.has_tenant_role(tenant_id, array['admin', 'therapist'])
);

create policy "tenant clinical users can read note amendments"
on public.clinical_note_amendments
for select
to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin', 'therapist']));

create policy "tenant clinical users can append note amendments"
on public.clinical_note_amendments
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'therapist']));

create policy "clinical users can read outcome definitions"
on public.outcome_measure_definitions
for select
to authenticated
using (
  deleted_at is null
  and (
    tenant_id is null
    or public.has_tenant_role(tenant_id, array['admin', 'therapist'])
  )
);

create policy "clinical users can create tenant outcome definitions"
on public.outcome_measure_definitions
for insert
to authenticated
with check (
  tenant_id is not null
  and public.has_tenant_role(tenant_id, array['admin', 'therapist'])
);

create policy "clinical users can update outcome definitions"
on public.outcome_measure_definitions
for update
to authenticated
using (
  deleted_at is null
  and (
    (tenant_id is null and public.is_super_admin())
    or public.has_tenant_role(tenant_id, array['admin', 'therapist'])
  )
)
with check (
  (tenant_id is null and public.is_super_admin())
  or public.has_tenant_role(tenant_id, array['admin', 'therapist'])
);

create policy "tenant clinical users can read goal reviews"
on public.clinical_goal_reviews
for select
to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin', 'therapist']));

create policy "tenant clinical users can append goal reviews"
on public.clinical_goal_reviews
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'therapist']));

create policy "tenant clinical users can read clinical patient link publications"
on public.clinical_patient_link_publications
for select
to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin', 'therapist']));

revoke all on table public.clinical_encounters from anon, authenticated;
revoke all on table public.clinical_note_templates from anon, authenticated;
revoke all on table public.clinical_note_template_versions from anon, authenticated;
revoke all on table public.clinical_notes from anon, authenticated;
revoke all on table public.clinical_note_versions from anon, authenticated;
revoke all on table public.clinical_note_amendments from anon, authenticated;
revoke all on table public.treatment_plans from anon, authenticated;
revoke all on table public.clinical_goals from anon, authenticated;
revoke all on table public.clinical_goal_reviews from anon, authenticated;
revoke all on table public.outcome_measure_definitions from anon, authenticated;
revoke all on table public.clinical_assessments from anon, authenticated;
revoke all on table public.outcome_measure_results from anon, authenticated;
revoke all on table public.clinical_diagnoses from anon, authenticated;
revoke all on table public.clinical_attachments from anon, authenticated;
revoke all on table public.clinical_record_restrictions from anon, authenticated;
revoke all on table public.clinical_patient_link_publications from anon, authenticated;
revoke all on table public.clinical_workflow_events from anon, authenticated;

grant select, insert, update on table public.clinical_encounters to authenticated;
grant select, insert, update on table public.clinical_note_templates to authenticated;
grant select, insert, update on table public.clinical_note_template_versions to authenticated;
grant select, insert, update on table public.clinical_notes to authenticated;
grant select, insert, update on table public.clinical_note_versions to authenticated;
grant select, insert on table public.clinical_note_amendments to authenticated;
grant select, insert, update on table public.treatment_plans to authenticated;
grant select, insert, update on table public.clinical_goals to authenticated;
grant select, insert on table public.clinical_goal_reviews to authenticated;
grant select, insert, update on table public.outcome_measure_definitions to authenticated;
grant select, insert, update on table public.clinical_assessments to authenticated;
grant select, insert, update on table public.outcome_measure_results to authenticated;
grant select, insert, update on table public.clinical_diagnoses to authenticated;
grant select, insert, update on table public.clinical_attachments to authenticated;
grant select, insert, update on table public.clinical_record_restrictions to authenticated;
grant select on table public.clinical_patient_link_publications to authenticated;
grant select, insert, update on table public.clinical_workflow_events to authenticated;

create or replace function public.finalise_clinical_note_version(target_note_version_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  version_record public.clinical_note_versions%rowtype;
  note_record public.clinical_notes%rowtype;
  hash_value text;
begin
  select *
  into version_record
  from public.clinical_note_versions
  where id = target_note_version_id
    and deleted_at is null
  for update;

  if version_record.id is null then
    raise exception 'Clinical note version not found';
  end if;

  select *
  into note_record
  from public.clinical_notes
  where id = version_record.clinical_note_id
    and deleted_at is null
  for update;

  if note_record.id is null then
    raise exception 'Clinical note not found';
  end if;

  if not public.has_tenant_role(note_record.tenant_id, array['admin', 'therapist']) then
    raise exception 'Not allowed to finalise clinical notes for this tenant';
  end if;

  if version_record.version_status <> 'draft' then
    raise exception 'Only draft clinical note versions can be finalised';
  end if;

  hash_value := md5(coalesce(version_record.free_text_content, '') || version_record.structured_content::text || version_record.id::text);

  update public.clinical_note_versions
  set version_status = 'finalised',
      finalised_at = now(),
      finalised_by_profile_id = auth.uid(),
      content_hash = hash_value
  where id = target_note_version_id;

  update public.clinical_notes
  set note_status = 'finalised',
      latest_version_id = target_note_version_id,
      finalised_at = now(),
      finalised_by_profile_id = auth.uid(),
      updated_by_profile_id = auth.uid()
  where id = note_record.id;

  insert into public.audit_events (tenant_id, actor_profile_id, action, entity_table, entity_id, metadata)
  values (
    note_record.tenant_id,
    auth.uid(),
    'clinical_note_version_finalised',
    'clinical_note_versions',
    target_note_version_id,
    jsonb_build_object('clinical_note_id', note_record.id, 'patient_id', note_record.patient_id)
  );

  insert into public.clinical_workflow_events (tenant_id, patient_id, clinical_encounter_id, clinical_note_id, clinical_note_version_id, event_type, event_key, metadata)
  values (
    note_record.tenant_id,
    note_record.patient_id,
    note_record.clinical_encounter_id,
    note_record.id,
    target_note_version_id,
    'clinical_note_finalised',
    'clinical_note_finalised:' || target_note_version_id::text,
    jsonb_build_object('note_status', 'finalised')
  )
  on conflict (tenant_id, event_key) where event_key is not null and deleted_at is null do nothing;

  return target_note_version_id;
end;
$$;

create or replace function public.sign_clinical_note_version(
  target_note_version_id uuid,
  signature_statement_input text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  version_record public.clinical_note_versions%rowtype;
  note_record public.clinical_notes%rowtype;
  signature_value text;
begin
  select *
  into version_record
  from public.clinical_note_versions
  where id = target_note_version_id
    and deleted_at is null
  for update;

  if version_record.id is null then
    raise exception 'Clinical note version not found';
  end if;

  select *
  into note_record
  from public.clinical_notes
  where id = version_record.clinical_note_id
    and deleted_at is null
  for update;

  if note_record.id is null then
    raise exception 'Clinical note not found';
  end if;

  if not public.has_tenant_role(note_record.tenant_id, array['admin', 'therapist']) then
    raise exception 'Not allowed to sign clinical notes for this tenant';
  end if;

  if version_record.version_status <> 'finalised' then
    raise exception 'Only finalised clinical note versions can be signed';
  end if;

  signature_value := md5(coalesce(version_record.content_hash, '') || auth.uid()::text || target_note_version_id::text);

  update public.clinical_note_versions
  set version_status = 'signed',
      signed_at = now(),
      signed_by_profile_id = auth.uid(),
      signature_statement = coalesce(signature_statement_input, 'Signed electronically in AlliDesk.'),
      signature_hash = signature_value
  where id = target_note_version_id;

  update public.clinical_notes
  set note_status = 'signed',
      latest_version_id = target_note_version_id,
      signed_at = now(),
      signed_by_profile_id = auth.uid(),
      updated_by_profile_id = auth.uid()
  where id = note_record.id;

  insert into public.audit_events (tenant_id, actor_profile_id, action, entity_table, entity_id, metadata)
  values (
    note_record.tenant_id,
    auth.uid(),
    'clinical_note_version_signed',
    'clinical_note_versions',
    target_note_version_id,
    jsonb_build_object('clinical_note_id', note_record.id, 'patient_id', note_record.patient_id)
  );

  insert into public.clinical_workflow_events (tenant_id, patient_id, clinical_encounter_id, clinical_note_id, clinical_note_version_id, event_type, event_key, metadata)
  values (
    note_record.tenant_id,
    note_record.patient_id,
    note_record.clinical_encounter_id,
    note_record.id,
    target_note_version_id,
    'clinical_note_signed',
    'clinical_note_signed:' || target_note_version_id::text,
    jsonb_build_object('note_status', 'signed')
  )
  on conflict (tenant_id, event_key) where event_key is not null and deleted_at is null do nothing;

  return target_note_version_id;
end;
$$;

create or replace function public.amend_clinical_note(
  target_clinical_note_id uuid,
  target_note_version_id uuid,
  amendment_reason_input text,
  amendment_free_text_input text default null,
  amendment_structured_content_input jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  note_record public.clinical_notes%rowtype;
  version_record public.clinical_note_versions%rowtype;
  new_amendment_id uuid;
  next_number integer;
begin
  if amendment_reason_input is null or btrim(amendment_reason_input) = '' then
    raise exception 'Amendment reason is required';
  end if;

  if jsonb_typeof(amendment_structured_content_input) <> 'object' then
    raise exception 'Amendment structured content must be a JSON object';
  end if;

  select *
  into note_record
  from public.clinical_notes
  where id = target_clinical_note_id
    and deleted_at is null
  for update;

  if note_record.id is null then
    raise exception 'Clinical note not found';
  end if;

  select *
  into version_record
  from public.clinical_note_versions
  where id = target_note_version_id
    and clinical_note_id = note_record.id
    and deleted_at is null
  for update;

  if version_record.id is null then
    raise exception 'Clinical note version not found';
  end if;

  if not public.has_tenant_role(note_record.tenant_id, array['admin', 'therapist']) then
    raise exception 'Not allowed to amend clinical notes for this tenant';
  end if;

  if note_record.note_status not in ('finalised', 'signed', 'amended', 'locked') then
    raise exception 'Only finalised, signed, amended or locked notes can be amended';
  end if;

  select coalesce(max(amendment_number), 0) + 1
  into next_number
  from public.clinical_note_amendments
  where clinical_note_id = note_record.id
    and deleted_at is null;

  insert into public.clinical_note_amendments (
    tenant_id,
    clinical_note_id,
    clinical_note_version_id,
    amendment_number,
    amendment_reason,
    amendment_free_text,
    amendment_structured_content,
    author_profile_id,
    metadata
  )
  values (
    note_record.tenant_id,
    note_record.id,
    version_record.id,
    next_number,
    amendment_reason_input,
    amendment_free_text_input,
    amendment_structured_content_input,
    auth.uid(),
    jsonb_build_object('amended_note_status', note_record.note_status)
  )
  returning id into new_amendment_id;

  update public.clinical_notes
  set note_status = 'amended',
      amended_at = now(),
      amended_by_profile_id = auth.uid(),
      amendment_count = amendment_count + 1,
      updated_by_profile_id = auth.uid()
  where id = note_record.id;

  update public.clinical_note_versions
  set version_status = 'amended'
  where id = version_record.id
    and version_status in ('finalised', 'signed', 'locked');

  insert into public.audit_events (tenant_id, actor_profile_id, action, entity_table, entity_id, metadata)
  values (
    note_record.tenant_id,
    auth.uid(),
    'clinical_note_amended',
    'clinical_note_amendments',
    new_amendment_id,
    jsonb_build_object('clinical_note_id', note_record.id, 'clinical_note_version_id', version_record.id, 'patient_id', note_record.patient_id)
  );

  insert into public.clinical_workflow_events (tenant_id, patient_id, clinical_encounter_id, clinical_note_id, clinical_note_version_id, event_type, event_key, metadata)
  values (
    note_record.tenant_id,
    note_record.patient_id,
    note_record.clinical_encounter_id,
    note_record.id,
    version_record.id,
    'clinical_note_amended',
    'clinical_note_amended:' || new_amendment_id::text,
    jsonb_build_object('amendment_id', new_amendment_id, 'amendment_number', next_number)
  )
  on conflict (tenant_id, event_key) where event_key is not null and deleted_at is null do nothing;

  return new_amendment_id;
end;
$$;

create or replace function public.publish_clinical_record_to_patient_link(
  target_record_type text,
  target_record_id uuid,
  safe_title_input text,
  safe_summary_input text default null,
  patient_link_id_input uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_tenant_id uuid;
  target_patient_id uuid;
  publication_allowed boolean;
  link_tenant_id uuid;
  link_patient_id uuid;
  new_publication_id uuid;
begin
  if safe_title_input is null or btrim(safe_title_input) = '' then
    raise exception 'Safe patient-facing title is required';
  end if;

  if target_record_type = 'clinical_note' then
    select tenant_id, patient_id, patient_visible_allowed
    into target_tenant_id, target_patient_id, publication_allowed
    from public.clinical_notes
    where id = target_record_id
      and note_status in ('finalised', 'signed', 'amended', 'locked')
      and deleted_at is null;
  elsif target_record_type = 'clinical_attachment' then
    select tenant_id, patient_id, patient_visible_allowed
    into target_tenant_id, target_patient_id, publication_allowed
    from public.clinical_attachments
    where id = target_record_id
      and deleted_at is null;
  elsif target_record_type = 'treatment_plan' then
    select tenant_id, patient_id, patient_visible_allowed
    into target_tenant_id, target_patient_id, publication_allowed
    from public.treatment_plans
    where id = target_record_id
      and deleted_at is null;
  elsif target_record_type = 'clinical_assessment' then
    select tenant_id, patient_id, patient_visible_allowed
    into target_tenant_id, target_patient_id, publication_allowed
    from public.clinical_assessments
    where id = target_record_id
      and assessment_status in ('finalised', 'amended')
      and deleted_at is null;
  elsif target_record_type = 'outcome_measure_result' then
    select tenant_id, patient_id, patient_visible_allowed
    into target_tenant_id, target_patient_id, publication_allowed
    from public.outcome_measure_results
    where id = target_record_id
      and result_status in ('finalised', 'amended')
      and deleted_at is null;
  else
    raise exception 'Unsupported clinical publication record type';
  end if;

  if target_tenant_id is null or target_patient_id is null then
    raise exception 'Clinical record not found or not publishable';
  end if;

  if publication_allowed is not true then
    raise exception 'Clinical record has not been explicitly marked as patient-visible';
  end if;

  if not public.has_tenant_role(target_tenant_id, array['admin', 'therapist']) then
    raise exception 'Not allowed to publish clinical records for this tenant';
  end if;

  if patient_link_id_input is not null then
    select tenant_id, patient_id
    into link_tenant_id, link_patient_id
    from public.patient_links
    where id = patient_link_id_input
      and deleted_at is null;

    if link_tenant_id is null or link_tenant_id <> target_tenant_id or link_patient_id <> target_patient_id then
      raise exception 'Patient Link must belong to the same tenant and patient';
    end if;
  end if;

  insert into public.clinical_patient_link_publications (
    tenant_id,
    patient_id,
    patient_link_id,
    record_type,
    record_id,
    publication_status,
    safe_title,
    safe_summary,
    published_at,
    published_by_profile_id
  )
  values (
    target_tenant_id,
    target_patient_id,
    patient_link_id_input,
    target_record_type,
    target_record_id,
    'published',
    safe_title_input,
    safe_summary_input,
    now(),
    auth.uid()
  )
  on conflict (tenant_id, record_type, record_id) where publication_status = 'published' and deleted_at is null
  do update
  set safe_title = excluded.safe_title,
      safe_summary = excluded.safe_summary,
      patient_link_id = excluded.patient_link_id,
      published_at = excluded.published_at,
      published_by_profile_id = excluded.published_by_profile_id,
      updated_at = now()
  returning id into new_publication_id;

  insert into public.audit_events (tenant_id, actor_profile_id, action, entity_table, entity_id, metadata)
  values (
    target_tenant_id,
    auth.uid(),
    'clinical_record_published_to_patient_link',
    'clinical_patient_link_publications',
    new_publication_id,
    jsonb_build_object('patient_id', target_patient_id, 'record_type', target_record_type, 'record_id', target_record_id)
  );

  insert into public.clinical_workflow_events (tenant_id, patient_id, event_type, event_key, metadata)
  values (
    target_tenant_id,
    target_patient_id,
    'clinical_record_patient_link_published',
    'clinical_publication:' || new_publication_id::text,
    jsonb_build_object('publication_id', new_publication_id, 'record_type', target_record_type, 'record_id', target_record_id)
  )
  on conflict (tenant_id, event_key) where event_key is not null and deleted_at is null do nothing;

  return new_publication_id;
end;
$$;

create or replace function public.revoke_clinical_patient_link_publication(
  target_publication_id uuid,
  revoke_reason_input text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  publication_record public.clinical_patient_link_publications%rowtype;
begin
  select *
  into publication_record
  from public.clinical_patient_link_publications
  where id = target_publication_id
    and deleted_at is null
  for update;

  if publication_record.id is null then
    raise exception 'Clinical Patient Link publication not found';
  end if;

  if not public.has_tenant_role(publication_record.tenant_id, array['admin', 'therapist']) then
    raise exception 'Not allowed to revoke clinical Patient Link publications for this tenant';
  end if;

  update public.clinical_patient_link_publications
  set publication_status = 'revoked',
      revoked_at = now(),
      revoked_by_profile_id = auth.uid(),
      revoke_reason = revoke_reason_input
  where id = target_publication_id;

  insert into public.audit_events (tenant_id, actor_profile_id, action, entity_table, entity_id, metadata)
  values (
    publication_record.tenant_id,
    auth.uid(),
    'clinical_record_patient_link_publication_revoked',
    'clinical_patient_link_publications',
    target_publication_id,
    jsonb_build_object('patient_id', publication_record.patient_id, 'record_type', publication_record.record_type, 'record_id', publication_record.record_id)
  );

  insert into public.clinical_workflow_events (tenant_id, patient_id, event_type, event_key, metadata)
  values (
    publication_record.tenant_id,
    publication_record.patient_id,
    'clinical_record_patient_link_revoked',
    'clinical_publication_revoked:' || target_publication_id::text,
    jsonb_build_object('publication_id', target_publication_id, 'reason', revoke_reason_input)
  )
  on conflict (tenant_id, event_key) where event_key is not null and deleted_at is null do nothing;

  return target_publication_id;
end;
$$;

revoke all on function public.increment_clinical_lock_version() from public, anon;
revoke all on function public.enforce_clinical_note_version_immutability() from public, anon;
revoke all on function public.enforce_clinical_template_version_immutability() from public, anon;
revoke all on function public.enforce_clinical_append_only() from public, anon;
revoke all on function public.validate_clinical_tenant_integrity() from public, anon;
revoke all on function public.validate_clinical_note_template_integrity() from public, anon;
revoke all on function public.validate_clinical_note_template_version_integrity() from public, anon;
revoke all on function public.finalise_clinical_note_version(uuid) from public, anon;
revoke all on function public.sign_clinical_note_version(uuid, text) from public, anon;
revoke all on function public.amend_clinical_note(uuid, uuid, text, text, jsonb) from public, anon;
revoke all on function public.publish_clinical_record_to_patient_link(text, uuid, text, text, uuid) from public, anon;
revoke all on function public.revoke_clinical_patient_link_publication(uuid, text) from public, anon;

grant execute on function public.finalise_clinical_note_version(uuid) to authenticated;
grant execute on function public.sign_clinical_note_version(uuid, text) to authenticated;
grant execute on function public.amend_clinical_note(uuid, uuid, text, text, jsonb) to authenticated;
grant execute on function public.publish_clinical_record_to_patient_link(text, uuid, text, text, uuid) to authenticated;
grant execute on function public.revoke_clinical_patient_link_publication(uuid, text) to authenticated;

comment on table public.clinical_notes is
  'Clinical note headers. Signed/finalised note content lives in immutable clinical_note_versions.';

comment on table public.clinical_note_versions is
  'Versioned clinical note content. Draft versions may be edited; finalised/signed versions are protected by trigger and lifecycle RPCs.';

comment on table public.clinical_note_amendments is
  'Append-only amendments to finalised or signed notes. Amendments do not overwrite signed content.';

comment on table public.clinical_patient_link_publications is
  'Explicit patient-facing publication boundary. Stores safe publication metadata only; does not grant direct clinical record access.';

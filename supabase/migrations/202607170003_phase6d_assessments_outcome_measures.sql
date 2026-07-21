-- AlliDesk Phase 6D: Assessments and Outcome Measures database foundation.
-- Scope: versioned assessment definitions, assessment structures, responses,
-- score components, interpretations, amendments, repeated-measure series,
-- explicit links, patient-reported invitation/import boundaries, patient-facing
-- publication metadata, protected lifecycle RPCs, RLS, grants and safe usage
-- metadata.
--
-- This migration intentionally does not implement frontend pages, Patient Link
-- rendering, external integrations, arbitrary scoring execution, AI, broad
-- reporting, or realtime collaboration.

alter table public.outcome_measure_definitions
  add column if not exists active_definition_version_id uuid,
  add column if not exists definition_scope text not null default 'tenant',
  add column if not exists profession_restrictions text[] not null default '{}'::text[],
  add column if not exists encounter_type_availability text[] not null default '{}'::text[],
  add column if not exists session_type_availability text[] not null default '{}'::text[],
  add column if not exists supports_patient_reported boolean not null default false,
  add column if not exists supports_clinician_administered boolean not null default true,
  add column if not exists supports_imported_results boolean not null default false,
  add column if not exists is_restricted_definition boolean not null default false,
  add column if not exists is_licensed_definition boolean not null default false,
  add column if not exists licence_metadata jsonb not null default '{}'::jsonb,
  add column if not exists effective_from date,
  add column if not exists effective_until date,
  add column if not exists retired_at timestamptz,
  add column if not exists retired_by_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists retirement_reason text,
  add column if not exists lock_version integer not null default 1;

alter table public.clinical_assessments
  add column if not exists assessment_definition_version_id uuid,
  add column if not exists booking_id uuid references public.bookings(id) on delete set null,
  add column if not exists treatment_plan_id uuid references public.treatment_plans(id) on delete set null,
  add column if not exists clinical_goal_id uuid references public.clinical_goals(id) on delete set null,
  add column if not exists assessment_source text not null default 'clinician',
  add column if not exists assessment_phase text,
  add column if not exists started_at timestamptz,
  add column if not exists started_by_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists finalised_at timestamptz,
  add column if not exists finalised_by_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists signed_at timestamptz,
  add column if not exists signed_by_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists signature_statement text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists cancellation_reason text,
  add column if not exists invalidated_at timestamptz,
  add column if not exists invalidated_by_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists invalidation_reason text,
  add column if not exists superseded_by_assessment_id uuid references public.clinical_assessments(id) on delete set null,
  add column if not exists amendment_count integer not null default 0,
  add column if not exists latest_result_id uuid,
  add column if not exists content_hash text;

alter table public.outcome_measure_results
  add column if not exists assessment_definition_version_id uuid,
  add column if not exists result_key text,
  add column if not exists result_label text,
  add column if not exists score_type text not null default 'total',
  add column if not exists numeric_score numeric(14, 4),
  add column if not exists normalised_score numeric(14, 4),
  add column if not exists percentage_score numeric(8, 4),
  add column if not exists score_unit text,
  add column if not exists calculation_status text not null default 'not_calculated',
  add column if not exists calculation_rule_key text,
  add column if not exists calculation_version integer,
  add column if not exists calculated_at timestamptz,
  add column if not exists calculated_by_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists interpretation_band_id uuid,
  add column if not exists practitioner_interpretation_id uuid,
  add column if not exists missing_item_count integer not null default 0,
  add column if not exists partial_score boolean not null default false,
  add column if not exists amended_at timestamptz,
  add column if not exists amended_by_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists invalidated_at timestamptz,
  add column if not exists invalidated_by_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists invalidation_reason text;

do $$
begin
  alter table public.outcome_measure_definitions drop constraint if exists outcome_measure_definitions_status_check;
  alter table public.outcome_measure_definitions add constraint outcome_measure_definitions_status_check
    check (definition_status in ('draft', 'published', 'active', 'retired', 'archived'));
  alter table public.outcome_measure_definitions add constraint outcome_measure_definitions_scope_check
    check (definition_scope in ('system', 'tenant', 'practitioner', 'discipline'));
  alter table public.outcome_measure_definitions add constraint outcome_measure_definitions_licence_metadata_object_check
    check (jsonb_typeof(licence_metadata) = 'object');
  alter table public.outcome_measure_definitions add constraint outcome_measure_definitions_effective_dates_check
    check (effective_from is null or effective_until is null or effective_from <= effective_until);
  alter table public.outcome_measure_definitions add constraint outcome_measure_definitions_lock_version_check
    check (lock_version > 0);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.clinical_assessments drop constraint if exists clinical_assessments_status_check;
  alter table public.clinical_assessments add constraint clinical_assessments_status_check
    check (assessment_status in ('draft', 'in_progress', 'completed', 'finalised', 'signed', 'amended', 'cancelled', 'invalidated', 'superseded', 'archived', 'entered_in_error'));
  alter table public.clinical_assessments add constraint clinical_assessments_source_check
    check (assessment_source in ('clinician', 'patient_reported', 'imported', 'external_device'));
  alter table public.clinical_assessments add constraint clinical_assessments_phase_check
    check (assessment_phase is null or assessment_phase in ('initial', 'follow_up', 'progress_review', 'discharge', 'screening', 'other'));
  alter table public.clinical_assessments add constraint clinical_assessments_completed_state_check
    check (assessment_status not in ('completed', 'finalised', 'signed', 'amended') or (completed_at is not null and completed_by_profile_id is not null));
  alter table public.clinical_assessments add constraint clinical_assessments_finalised_state_check
    check (assessment_status not in ('finalised', 'signed', 'amended') or (finalised_at is not null and finalised_by_profile_id is not null and content_hash is not null));
  alter table public.clinical_assessments add constraint clinical_assessments_signed_state_check
    check (assessment_status <> 'signed' or (signed_at is not null and signed_by_profile_id is not null));
  alter table public.clinical_assessments add constraint clinical_assessments_cancelled_state_check
    check (assessment_status <> 'cancelled' or (cancelled_at is not null and cancellation_reason is not null and btrim(cancellation_reason) <> ''));
  alter table public.clinical_assessments add constraint clinical_assessments_invalidated_state_check
    check (assessment_status <> 'invalidated' or (invalidated_at is not null and invalidation_reason is not null and btrim(invalidation_reason) <> ''));
  alter table public.clinical_assessments add constraint clinical_assessments_amendment_count_check
    check (amendment_count >= 0);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.outcome_measure_results drop constraint if exists outcome_measure_results_status_check;
  alter table public.outcome_measure_results add constraint outcome_measure_results_status_check
    check (result_status in ('draft', 'calculated', 'reviewed', 'finalised', 'amended', 'invalidated', 'archived', 'entered_in_error'));
  alter table public.outcome_measure_results add constraint outcome_measure_results_score_type_check
    check (score_type in ('raw', 'subscale', 'total', 'percentage', 'normalised', 'classification', 'derived'));
  alter table public.outcome_measure_results add constraint outcome_measure_results_calculation_status_check
    check (calculation_status in ('not_calculated', 'pending', 'calculated', 'partial', 'failed', 'not_applicable'));
  alter table public.outcome_measure_results add constraint outcome_measure_results_missing_item_count_check
    check (missing_item_count >= 0);
exception
  when duplicate_object then null;
end $$;

create table public.assessment_definition_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  outcome_measure_definition_id uuid not null references public.outcome_measure_definitions(id) on delete restrict,
  version_number integer not null,
  version_status text not null default 'draft',
  version_label text,
  definition_schema jsonb not null default '{}'::jsonb,
  scoring_schema jsonb not null default '{}'::jsonb,
  interpretation_schema jsonb not null default '{}'::jsonb,
  response_mode text not null default 'clinician_administered',
  effective_from date,
  effective_until date,
  release_notes text,
  source_definition_version_id uuid references public.assessment_definition_versions(id) on delete set null,
  publication_ready boolean not null default false,
  validation_status text not null default 'not_run',
  published_at timestamptz,
  published_by_profile_id uuid references public.profiles(id) on delete set null,
  retired_at timestamptz,
  retired_by_profile_id uuid references public.profiles(id) on delete set null,
  retirement_reason text,
  metadata jsonb not null default '{}'::jsonb,
  lock_version integer not null default 1,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_definition_versions_number_check check (version_number > 0),
  constraint assessment_definition_versions_status_check check (version_status in ('draft', 'published', 'active', 'retired', 'archived')),
  constraint assessment_definition_versions_response_mode_check check (response_mode in ('clinician_administered', 'patient_reported', 'observational', 'imported')),
  constraint assessment_definition_versions_validation_status_check check (validation_status in ('not_run', 'valid', 'warning', 'invalid')),
  constraint assessment_definition_versions_schema_object_check check (jsonb_typeof(definition_schema) = 'object'),
  constraint assessment_definition_versions_scoring_object_check check (jsonb_typeof(scoring_schema) = 'object'),
  constraint assessment_definition_versions_interpretation_object_check check (jsonb_typeof(interpretation_schema) = 'object'),
  constraint assessment_definition_versions_metadata_object_check check (jsonb_typeof(metadata) = 'object'),
  constraint assessment_definition_versions_effective_dates_check check (effective_from is null or effective_until is null or effective_from <= effective_until),
  constraint assessment_definition_versions_published_state_check check (version_status not in ('published', 'active') or (published_at is not null and published_by_profile_id is not null)),
  constraint assessment_definition_versions_lock_version_check check (lock_version > 0)
);

alter table public.outcome_measure_definitions
  add constraint outcome_measure_definitions_active_version_fk
  foreign key (active_definition_version_id)
  references public.assessment_definition_versions(id)
  on delete set null
  deferrable initially deferred;

alter table public.clinical_assessments
  add constraint clinical_assessments_definition_version_fk
  foreign key (assessment_definition_version_id)
  references public.assessment_definition_versions(id)
  on delete set null;

alter table public.outcome_measure_results
  add constraint outcome_measure_results_definition_version_fk
  foreign key (assessment_definition_version_id)
  references public.assessment_definition_versions(id)
  on delete set null;

create table public.assessment_definition_sections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  assessment_definition_version_id uuid not null references public.assessment_definition_versions(id) on delete restrict,
  parent_section_id uuid references public.assessment_definition_sections(id) on delete restrict,
  section_key text not null,
  section_label text not null,
  instructions text,
  display_order integer not null default 1,
  section_type text not null default 'standard',
  is_repeating boolean not null default false,
  patient_reported_eligible boolean not null default false,
  clinician_only boolean not null default false,
  is_restricted boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  lock_version integer not null default 1,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_definition_sections_key_check check (section_key ~ '^[a-z][a-z0-9_]{1,80}$'),
  constraint assessment_definition_sections_label_check check (btrim(section_label) <> ''),
  constraint assessment_definition_sections_order_check check (display_order > 0),
  constraint assessment_definition_sections_type_check check (section_type in ('standard', 'group', 'heading', 'instructions', 'repeating_group')),
  constraint assessment_definition_sections_visibility_check check (not (patient_reported_eligible and clinician_only)),
  constraint assessment_definition_sections_metadata_object_check check (jsonb_typeof(metadata) = 'object'),
  constraint assessment_definition_sections_lock_version_check check (lock_version > 0)
);

create table public.assessment_definition_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  assessment_definition_version_id uuid not null references public.assessment_definition_versions(id) on delete restrict,
  assessment_definition_section_id uuid not null references public.assessment_definition_sections(id) on delete restrict,
  parent_item_id uuid references public.assessment_definition_items(id) on delete restrict,
  item_key text not null,
  item_label text not null,
  item_prompt text,
  item_type text not null default 'short_text',
  display_order integer not null default 1,
  help_text text,
  placeholder text,
  default_value jsonb,
  item_config jsonb not null default '{}'::jsonb,
  validation_config jsonb not null default '{}'::jsonb,
  allowed_units text[] not null default '{}'::text[],
  is_required boolean not null default false,
  is_required_for_completion boolean not null default false,
  is_read_only boolean not null default false,
  is_calculated boolean not null default false,
  is_informational boolean not null default false,
  is_repeating boolean not null default false,
  patient_reported_eligible boolean not null default false,
  clinician_only boolean not null default false,
  is_restricted boolean not null default false,
  patient_facing_label text,
  patient_facing_description text,
  stable_identity_key text,
  metadata jsonb not null default '{}'::jsonb,
  lock_version integer not null default 1,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_definition_items_key_check check (item_key ~ '^[a-z][a-z0-9_]{1,80}$'),
  constraint assessment_definition_items_label_check check (btrim(item_label) <> ''),
  constraint assessment_definition_items_type_check check (item_type in ('short_text', 'long_text', 'integer', 'decimal', 'boolean', 'single_choice', 'multiple_choice', 'checklist', 'scale', 'measurement', 'date', 'time', 'datetime', 'laterality', 'body_area', 'observation', 'attachment_reference', 'clinical_record_reference', 'calculated', 'heading', 'instruction')),
  constraint assessment_definition_items_order_check check (display_order > 0),
  constraint assessment_definition_items_json_checks check (jsonb_typeof(item_config) = 'object' and jsonb_typeof(validation_config) = 'object' and jsonb_typeof(metadata) = 'object'),
  constraint assessment_definition_items_visibility_check check (not (patient_reported_eligible and clinician_only)),
  constraint assessment_definition_items_calculated_check check (is_calculated = false or (is_read_only = true and item_type = 'calculated')),
  constraint assessment_definition_items_lock_version_check check (lock_version > 0)
);

create table public.assessment_definition_item_options (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  assessment_definition_version_id uuid not null references public.assessment_definition_versions(id) on delete restrict,
  assessment_definition_item_id uuid not null references public.assessment_definition_items(id) on delete restrict,
  option_key text not null,
  option_label text not null,
  option_value jsonb,
  numeric_value numeric(14, 4),
  display_order integer not null default 1,
  is_default boolean not null default false,
  patient_reported_eligible boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  lock_version integer not null default 1,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_definition_item_options_key_check check (option_key ~ '^[a-z][a-z0-9_]{1,80}$'),
  constraint assessment_definition_item_options_label_check check (btrim(option_label) <> ''),
  constraint assessment_definition_item_options_order_check check (display_order > 0),
  constraint assessment_definition_item_options_json_checks check (option_value is null or jsonb_typeof(option_value) in ('string', 'number', 'boolean', 'object', 'array')),
  constraint assessment_definition_item_options_metadata_object_check check (jsonb_typeof(metadata) = 'object'),
  constraint assessment_definition_item_options_lock_version_check check (lock_version > 0)
);

create table public.assessment_definition_validation_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  assessment_definition_version_id uuid not null references public.assessment_definition_versions(id) on delete restrict,
  assessment_definition_section_id uuid references public.assessment_definition_sections(id) on delete restrict,
  assessment_definition_item_id uuid references public.assessment_definition_items(id) on delete restrict,
  rule_key text not null,
  rule_type text not null,
  severity text not null default 'error',
  applies_on text not null default 'completion',
  rule_config jsonb not null default '{}'::jsonb,
  message text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  lock_version integer not null default 1,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_definition_validation_rules_key_check check (rule_key ~ '^[a-z][a-z0-9_]{1,80}$'),
  constraint assessment_definition_validation_rules_type_check check (rule_type in ('required', 'numeric_range', 'character_limit', 'allowed_options', 'allowed_units', 'date_restriction', 'conditional_required', 'cross_item', 'completion_requirement', 'finalisation_requirement', 'patient_submission_requirement', 'licensed_definition_requirement')),
  constraint assessment_definition_validation_rules_severity_check check (severity in ('info', 'warning', 'error', 'blocking')),
  constraint assessment_definition_validation_rules_applies_on_check check (applies_on in ('draft_save', 'completion', 'finalisation', 'signing', 'patient_submission', 'import_review')),
  constraint assessment_definition_validation_rules_target_check check (assessment_definition_section_id is not null or assessment_definition_item_id is not null),
  constraint assessment_definition_validation_rules_metadata_check check (jsonb_typeof(rule_config) = 'object' and jsonb_typeof(metadata) = 'object'),
  constraint assessment_definition_validation_rules_lock_version_check check (lock_version > 0)
);

create table public.assessment_definition_calculation_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  assessment_definition_version_id uuid not null references public.assessment_definition_versions(id) on delete restrict,
  target_assessment_definition_item_id uuid references public.assessment_definition_items(id) on delete restrict,
  calculation_key text not null,
  calculation_label text,
  calculation_type text not null default 'total',
  allowed_operator text not null default 'sum',
  input_item_keys text[] not null default '{}'::text[],
  calculation_config jsonb not null default '{}'::jsonb,
  result_value_type text not null default 'decimal',
  result_unit text,
  missing_item_strategy text not null default 'block',
  calculation_version integer not null default 1,
  is_required_for_completion boolean not null default false,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  lock_version integer not null default 1,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_definition_calculation_rules_key_check check (calculation_key ~ '^[a-z][a-z0-9_]{1,80}$'),
  constraint assessment_definition_calculation_rules_type_check check (calculation_type in ('raw_item', 'subscale', 'total', 'percentage', 'normalised', 'classification', 'threshold')),
  constraint assessment_definition_calculation_rules_operator_check check (allowed_operator in ('sum', 'average', 'count', 'min', 'max', 'reverse_score', 'normalise', 'percentage', 'threshold_lookup', 'band_lookup')),
  constraint assessment_definition_calculation_rules_value_type_check check (result_value_type in ('integer', 'decimal', 'percentage', 'text', 'classification')),
  constraint assessment_definition_calculation_rules_missing_check check (missing_item_strategy in ('block', 'partial_allowed', 'ignore_missing', 'prorate')),
  constraint assessment_definition_calculation_rules_version_check check (calculation_version > 0),
  constraint assessment_definition_calculation_rules_json_check check (jsonb_typeof(calculation_config) = 'object' and jsonb_typeof(metadata) = 'object'),
  constraint assessment_definition_calculation_rules_lock_version_check check (lock_version > 0)
);

create table public.assessment_interpretation_bands (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  assessment_definition_version_id uuid not null references public.assessment_definition_versions(id) on delete restrict,
  calculation_rule_key text,
  band_key text not null,
  score_label text not null,
  severity_band text,
  classification text,
  lower_bound numeric(14, 4),
  upper_bound numeric(14, 4),
  lower_inclusive boolean not null default true,
  upper_inclusive boolean not null default true,
  reference_range_label text,
  minimal_clinically_important_difference numeric(14, 4),
  reliable_change_threshold numeric(14, 4),
  population_metadata jsonb not null default '{}'::jsonb,
  warning_text text,
  limitation_text text,
  patient_facing_eligible boolean not null default false,
  patient_facing_explanation text,
  metadata jsonb not null default '{}'::jsonb,
  lock_version integer not null default 1,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_interpretation_bands_key_check check (band_key ~ '^[a-z][a-z0-9_]{1,80}$'),
  constraint assessment_interpretation_bands_label_check check (btrim(score_label) <> ''),
  constraint assessment_interpretation_bands_bounds_check check (lower_bound is null or upper_bound is null or lower_bound <= upper_bound),
  constraint assessment_interpretation_bands_json_check check (jsonb_typeof(population_metadata) = 'object' and jsonb_typeof(metadata) = 'object'),
  constraint assessment_interpretation_bands_lock_version_check check (lock_version > 0)
);

alter table public.outcome_measure_results
  add constraint outcome_measure_results_interpretation_band_fk
  foreign key (interpretation_band_id)
  references public.assessment_interpretation_bands(id)
  on delete set null;

create table public.assessment_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  outcome_measure_definition_id uuid not null references public.outcome_measure_definitions(id) on delete restrict,
  assessment_definition_version_id uuid not null references public.assessment_definition_versions(id) on delete restrict,
  assignment_scope text not null default 'tenant',
  practice_location_id uuid references public.practice_locations(id) on delete set null,
  therapist_profile_id uuid references public.therapist_profiles(id) on delete set null,
  discipline text,
  encounter_type text,
  session_type text,
  assessment_phase text,
  patient_reported_eligible boolean not null default false,
  is_default boolean not null default false,
  is_recommended boolean not null default false,
  is_active boolean not null default true,
  assignment_priority integer not null default 100,
  effective_from date,
  effective_until date,
  assigned_by_profile_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  lock_version integer not null default 1,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_assignments_scope_check check (assignment_scope in ('tenant', 'location', 'practitioner', 'discipline', 'encounter_type', 'session_type', 'assessment_phase')),
  constraint assessment_assignments_phase_check check (assessment_phase is null or assessment_phase in ('initial', 'follow_up', 'progress_review', 'discharge', 'screening', 'other')),
  constraint assessment_assignments_priority_check check (assignment_priority > 0),
  constraint assessment_assignments_dates_check check (effective_from is null or effective_until is null or effective_from <= effective_until),
  constraint assessment_assignments_metadata_object_check check (jsonb_typeof(metadata) = 'object'),
  constraint assessment_assignments_lock_version_check check (lock_version > 0)
);

create table public.clinical_assessment_draft_states (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  clinical_assessment_id uuid not null references public.clinical_assessments(id) on delete cascade,
  assessment_definition_version_id uuid references public.assessment_definition_versions(id) on delete set null,
  draft_status text not null default 'active',
  draft_owner_profile_id uuid references public.profiles(id) on delete set null,
  active_editor_profile_id uuid references public.profiles(id) on delete set null,
  last_saved_at timestamptz not null default now(),
  last_saved_by_profile_id uuid references public.profiles(id) on delete set null,
  last_idempotency_key text,
  conflict_detected boolean not null default false,
  conflict_reason text,
  lock_version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinical_assessment_draft_states_status_check check (draft_status in ('active', 'completed', 'finalised', 'cancelled', 'abandoned')),
  constraint clinical_assessment_draft_states_json_check check (jsonb_typeof(metadata) = 'object'),
  constraint clinical_assessment_draft_states_lock_version_check check (lock_version > 0)
);

create table public.clinical_assessment_item_responses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  clinical_assessment_id uuid not null references public.clinical_assessments(id) on delete cascade,
  assessment_definition_version_id uuid not null references public.assessment_definition_versions(id) on delete restrict,
  assessment_definition_section_id uuid references public.assessment_definition_sections(id) on delete restrict,
  assessment_definition_item_id uuid not null references public.assessment_definition_items(id) on delete restrict,
  item_key text not null,
  response_source text not null default 'clinician',
  repeat_index integer not null default 1,
  response_value jsonb,
  text_value text,
  numeric_value numeric(14, 4),
  boolean_value boolean,
  date_value date,
  time_value time,
  datetime_value timestamptz,
  selected_option_keys text[] not null default '{}'::text[],
  measurement_value numeric(14, 4),
  measurement_unit text,
  attachment_id uuid references public.clinical_attachments(id) on delete set null,
  referenced_record_type text,
  referenced_record_id uuid,
  validation_status text not null default 'not_run',
  is_restricted boolean not null default false,
  lock_version integer not null default 1,
  idempotency_key text,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinical_assessment_item_responses_source_check check (response_source in ('clinician', 'patient_reported', 'imported', 'device')),
  constraint clinical_assessment_item_responses_repeat_check check (repeat_index > 0),
  constraint clinical_assessment_item_responses_key_check check (item_key ~ '^[a-z][a-z0-9_]{1,80}$'),
  constraint clinical_assessment_item_responses_value_json_check check (response_value is null or jsonb_typeof(response_value) in ('string', 'number', 'boolean', 'object', 'array')),
  constraint clinical_assessment_item_responses_validation_status_check check (validation_status in ('not_run', 'valid', 'warning', 'invalid')),
  constraint clinical_assessment_item_responses_lock_version_check check (lock_version > 0)
);

create table public.assessment_score_components (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  clinical_assessment_id uuid not null references public.clinical_assessments(id) on delete cascade,
  outcome_measure_result_id uuid references public.outcome_measure_results(id) on delete cascade,
  assessment_definition_version_id uuid not null references public.assessment_definition_versions(id) on delete restrict,
  calculation_rule_key text not null,
  component_key text not null,
  component_label text,
  score_type text not null default 'subscale',
  raw_score numeric(14, 4),
  calculated_score numeric(14, 4),
  normalised_score numeric(14, 4),
  percentage_score numeric(8, 4),
  score_unit text,
  calculation_status text not null default 'pending',
  missing_item_count integer not null default 0,
  partial_score boolean not null default false,
  source_response_ids uuid[] not null default '{}'::uuid[],
  calculation_snapshot jsonb not null default '{}'::jsonb,
  calculated_at timestamptz,
  calculated_by_profile_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_score_components_key_check check (component_key ~ '^[a-z][a-z0-9_]{1,80}$'),
  constraint assessment_score_components_type_check check (score_type in ('raw', 'subscale', 'total', 'percentage', 'normalised', 'classification', 'derived')),
  constraint assessment_score_components_status_check check (calculation_status in ('pending', 'calculated', 'partial', 'failed', 'not_applicable')),
  constraint assessment_score_components_missing_check check (missing_item_count >= 0),
  constraint assessment_score_components_json_check check (jsonb_typeof(calculation_snapshot) = 'object' and jsonb_typeof(metadata) = 'object')
);

create table public.assessment_practitioner_interpretations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  clinical_assessment_id uuid not null references public.clinical_assessments(id) on delete cascade,
  outcome_measure_result_id uuid references public.outcome_measure_results(id) on delete set null,
  assessment_definition_version_id uuid references public.assessment_definition_versions(id) on delete set null,
  interpretation_status text not null default 'draft',
  interpretation_text text,
  clinical_significance text,
  limitation_text text,
  follow_up_recommendation text,
  patient_facing_eligible boolean not null default false,
  is_restricted boolean not null default false,
  authored_by_profile_id uuid references public.profiles(id) on delete set null,
  finalised_at timestamptz,
  finalised_by_profile_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  lock_version integer not null default 1,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_practitioner_interpretations_status_check check (interpretation_status in ('draft', 'finalised', 'amended', 'invalidated')),
  constraint assessment_practitioner_interpretations_finalised_check check (interpretation_status not in ('finalised', 'amended') or (finalised_at is not null and finalised_by_profile_id is not null)),
  constraint assessment_practitioner_interpretations_json_check check (jsonb_typeof(metadata) = 'object'),
  constraint assessment_practitioner_interpretations_lock_version_check check (lock_version > 0)
);

alter table public.outcome_measure_results
  add constraint outcome_measure_results_practitioner_interpretation_fk
  foreign key (practitioner_interpretation_id)
  references public.assessment_practitioner_interpretations(id)
  on delete set null;

create table public.assessment_amendments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  clinical_assessment_id uuid not null references public.clinical_assessments(id) on delete cascade,
  amendment_number integer not null,
  amendment_type text not null default 'correction',
  amendment_reason text not null,
  target_record_type text not null,
  target_record_id uuid not null,
  original_snapshot jsonb not null default '{}'::jsonb,
  corrected_snapshot jsonb not null default '{}'::jsonb,
  recalculation_status text not null default 'not_required',
  patient_facing_impact text not null default 'none',
  author_profile_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint assessment_amendments_number_check check (amendment_number > 0),
  constraint assessment_amendments_reason_check check (btrim(amendment_reason) <> ''),
  constraint assessment_amendments_type_check check (amendment_type in ('correction', 'clarification', 'invalidation', 'supersession')),
  constraint assessment_amendments_target_check check (target_record_type in ('assessment', 'response', 'score', 'interpretation', 'publication')),
  constraint assessment_amendments_recalculation_check check (recalculation_status in ('not_required', 'pending', 'completed', 'failed')),
  constraint assessment_amendments_patient_impact_check check (patient_facing_impact in ('none', 'review_required', 'republish_required', 'revoked')),
  constraint assessment_amendments_json_check check (jsonb_typeof(original_snapshot) = 'object' and jsonb_typeof(corrected_snapshot) = 'object' and jsonb_typeof(metadata) = 'object')
);

create table public.assessment_repeated_measure_series (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  outcome_measure_definition_id uuid references public.outcome_measure_definitions(id) on delete set null,
  measure_family_key text not null,
  treatment_plan_id uuid references public.treatment_plans(id) on delete set null,
  clinical_goal_id uuid references public.clinical_goals(id) on delete set null,
  baseline_assessment_id uuid references public.clinical_assessments(id) on delete set null,
  series_status text not null default 'active',
  comparison_policy text not null default 'same_version_only',
  version_compatibility_metadata jsonb not null default '{}'::jsonb,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  closed_by_profile_id uuid references public.profiles(id) on delete set null,
  close_reason text,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_repeated_measure_series_key_check check (measure_family_key ~ '^[a-z][a-z0-9_]{1,80}$'),
  constraint assessment_repeated_measure_series_status_check check (series_status in ('active', 'closed', 'archived')),
  constraint assessment_repeated_measure_series_policy_check check (comparison_policy in ('same_version_only', 'declared_compatible_versions', 'manual_review_required')),
  constraint assessment_repeated_measure_series_closed_check check (series_status <> 'closed' or (closed_at is not null and close_reason is not null)),
  constraint assessment_repeated_measure_series_json_check check (jsonb_typeof(version_compatibility_metadata) = 'object' and jsonb_typeof(metadata) = 'object')
);

create table public.assessment_series_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  assessment_repeated_measure_series_id uuid not null references public.assessment_repeated_measure_series(id) on delete cascade,
  clinical_assessment_id uuid not null references public.clinical_assessments(id) on delete cascade,
  outcome_measure_result_id uuid references public.outcome_measure_results(id) on delete set null,
  series_role text not null default 'follow_up',
  comparison_eligible boolean not null default true,
  comparison_exclusion_reason text,
  added_by_profile_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint assessment_series_members_role_check check (series_role in ('baseline', 'follow_up', 'progress_review', 'discharge')),
  constraint assessment_series_members_json_check check (jsonb_typeof(metadata) = 'object')
);

create table public.assessment_treatment_goal_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  clinical_assessment_id uuid not null references public.clinical_assessments(id) on delete cascade,
  outcome_measure_result_id uuid references public.outcome_measure_results(id) on delete set null,
  treatment_plan_id uuid references public.treatment_plans(id) on delete set null,
  clinical_goal_id uuid references public.clinical_goals(id) on delete set null,
  clinical_goal_review_id uuid references public.clinical_goal_reviews(id) on delete set null,
  link_type text not null default 'progress_evidence',
  evidence_summary text,
  linked_by_profile_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint assessment_treatment_goal_links_target_check check (treatment_plan_id is not null or clinical_goal_id is not null or clinical_goal_review_id is not null),
  constraint assessment_treatment_goal_links_type_check check (link_type in ('baseline', 'progress_evidence', 'goal_review', 'discharge_criteria', 'supporting_evidence')),
  constraint assessment_treatment_goal_links_json_check check (jsonb_typeof(metadata) = 'object')
);

create table public.assessment_clinical_note_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  clinical_assessment_id uuid not null references public.clinical_assessments(id) on delete cascade,
  outcome_measure_result_id uuid references public.outcome_measure_results(id) on delete set null,
  clinical_note_id uuid references public.clinical_notes(id) on delete cascade,
  clinical_note_version_id uuid references public.clinical_note_versions(id) on delete cascade,
  clinical_encounter_id uuid references public.clinical_encounters(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  link_type text not null default 'referenced',
  copied_summary text,
  provenance_metadata jsonb not null default '{}'::jsonb,
  linked_by_profile_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint assessment_clinical_note_links_target_check check (clinical_note_id is not null or clinical_note_version_id is not null or clinical_encounter_id is not null or session_id is not null),
  constraint assessment_clinical_note_links_type_check check (link_type in ('referenced', 'summary_copied', 'triggered_from_note', 'supporting_evidence')),
  constraint assessment_clinical_note_links_json_check check (jsonb_typeof(provenance_metadata) = 'object' and jsonb_typeof(metadata) = 'object')
);

create table public.assessment_patient_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  patient_link_id uuid references public.patient_links(id) on delete set null,
  assessment_definition_version_id uuid not null references public.assessment_definition_versions(id) on delete restrict,
  assigned_practitioner_profile_id uuid references public.therapist_profiles(id) on delete set null,
  invitation_status text not null default 'draft',
  submission_status text not null default 'not_started',
  verification_token_hash text,
  starts_at timestamptz,
  expires_at timestamptz,
  submitted_at timestamptz,
  review_status text not null default 'not_required',
  reviewed_at timestamptz,
  reviewed_by_profile_id uuid references public.profiles(id) on delete set null,
  review_outcome text,
  accepted_clinical_assessment_id uuid references public.clinical_assessments(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_patient_invitations_status_check check (invitation_status in ('draft', 'sent', 'active', 'expired', 'revoked', 'completed')),
  constraint assessment_patient_invitations_submission_check check (submission_status in ('not_started', 'in_progress', 'submitted', 'accepted', 'rejected', 'invalidated')),
  constraint assessment_patient_invitations_review_check check (review_status in ('not_required', 'required', 'pending', 'accepted', 'rejected', 'invalidated')),
  constraint assessment_patient_invitations_dates_check check (starts_at is null or expires_at is null or starts_at < expires_at),
  constraint assessment_patient_invitations_json_check check (jsonb_typeof(metadata) = 'object')
);

create table public.assessment_external_imports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  assessment_definition_version_id uuid references public.assessment_definition_versions(id) on delete set null,
  clinical_assessment_id uuid references public.clinical_assessments(id) on delete set null,
  source_system text not null,
  vendor_name text,
  device_identifier text,
  external_reference text,
  import_batch_key text,
  source_version text,
  source_file_metadata jsonb not null default '{}'::jsonb,
  imported_by_profile_id uuid references public.profiles(id) on delete set null,
  imported_at timestamptz not null default now(),
  validation_status text not null default 'pending',
  duplicate_detection_key text,
  practitioner_review_status text not null default 'required',
  reviewed_at timestamptz,
  reviewed_by_profile_id uuid references public.profiles(id) on delete set null,
  review_outcome text,
  error_metadata jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_external_imports_source_check check (btrim(source_system) <> ''),
  constraint assessment_external_imports_validation_check check (validation_status in ('pending', 'valid', 'warning', 'invalid', 'failed')),
  constraint assessment_external_imports_review_check check (practitioner_review_status in ('required', 'pending', 'accepted', 'rejected', 'invalidated')),
  constraint assessment_external_imports_json_check check (jsonb_typeof(source_file_metadata) = 'object' and jsonb_typeof(error_metadata) = 'object' and jsonb_typeof(metadata) = 'object')
);

create table public.assessment_patient_link_publications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  patient_link_id uuid references public.patient_links(id) on delete set null,
  clinical_assessment_id uuid references public.clinical_assessments(id) on delete cascade,
  outcome_measure_result_id uuid references public.outcome_measure_results(id) on delete set null,
  patient_facing_title text not null,
  patient_facing_summary text,
  publication_state text not null default 'draft',
  published_at timestamptz,
  published_by_profile_id uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz,
  revoked_by_profile_id uuid references public.profiles(id) on delete set null,
  revocation_reason text,
  expires_at timestamptz,
  is_restricted boolean not null default false,
  version_metadata jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_patient_link_publications_title_check check (btrim(patient_facing_title) <> ''),
  constraint assessment_patient_link_publications_state_check check (publication_state in ('draft', 'published', 'revoked', 'expired')),
  constraint assessment_patient_link_publications_published_check check (publication_state <> 'published' or (published_at is not null and published_by_profile_id is not null)),
  constraint assessment_patient_link_publications_revoked_check check (publication_state <> 'revoked' or (revoked_at is not null and revocation_reason is not null)),
  constraint assessment_patient_link_publications_json_check check (jsonb_typeof(version_metadata) = 'object' and jsonb_typeof(metadata) = 'object')
);

create table public.assessment_usage_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  outcome_measure_definition_id uuid references public.outcome_measure_definitions(id) on delete cascade,
  assessment_definition_version_id uuid references public.assessment_definition_versions(id) on delete cascade,
  definition_usage_count integer not null default 0,
  assessment_count integer not null default 0,
  draft_count integer not null default 0,
  completed_count integer not null default 0,
  finalised_count integer not null default 0,
  invalidated_count integer not null default 0,
  active_assignment_count integer not null default 0,
  repeated_measure_series_count integer not null default 0,
  first_used_at timestamptz,
  last_used_at timestamptz,
  calculated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_usage_snapshots_counts_check check (definition_usage_count >= 0 and assessment_count >= 0 and draft_count >= 0 and completed_count >= 0 and finalised_count >= 0 and invalidated_count >= 0 and active_assignment_count >= 0 and repeated_measure_series_count >= 0),
  constraint assessment_usage_snapshots_json_check check (jsonb_typeof(metadata) = 'object')
);

alter table public.clinical_assessments
  add constraint clinical_assessments_latest_result_fk
  foreign key (latest_result_id)
  references public.outcome_measure_results(id)
  on delete set null
  deferrable initially deferred;

create unique index outcome_measure_definitions_tenant_key_active_idx
  on public.outcome_measure_definitions (tenant_id, lower(measure_key))
  where tenant_id is not null and deleted_at is null;
create unique index outcome_measure_definitions_system_key_active_idx
  on public.outcome_measure_definitions (lower(measure_key))
  where tenant_id is null and deleted_at is null;
create unique index assessment_definition_versions_number_idx
  on public.assessment_definition_versions (outcome_measure_definition_id, version_number)
  where deleted_at is null;
create unique index assessment_definition_versions_one_active_idx
  on public.assessment_definition_versions (outcome_measure_definition_id)
  where version_status = 'active' and deleted_at is null;
create index assessment_definition_versions_tenant_status_idx
  on public.assessment_definition_versions (tenant_id, version_status, effective_from, effective_until)
  where deleted_at is null;
create unique index assessment_definition_sections_version_key_idx
  on public.assessment_definition_sections (assessment_definition_version_id, lower(section_key))
  where deleted_at is null;
create index assessment_definition_sections_order_idx
  on public.assessment_definition_sections (assessment_definition_version_id, display_order)
  where deleted_at is null;
create unique index assessment_definition_items_version_key_idx
  on public.assessment_definition_items (assessment_definition_version_id, lower(item_key))
  where deleted_at is null;
create index assessment_definition_items_section_order_idx
  on public.assessment_definition_items (assessment_definition_section_id, display_order)
  where deleted_at is null;
create unique index assessment_definition_item_options_item_key_idx
  on public.assessment_definition_item_options (assessment_definition_item_id, lower(option_key))
  where deleted_at is null;
create index assessment_definition_item_options_order_idx
  on public.assessment_definition_item_options (assessment_definition_item_id, display_order)
  where deleted_at is null;
create unique index assessment_definition_validation_rules_key_idx
  on public.assessment_definition_validation_rules (assessment_definition_version_id, lower(rule_key))
  where deleted_at is null;
create unique index assessment_definition_calculation_rules_key_idx
  on public.assessment_definition_calculation_rules (assessment_definition_version_id, lower(calculation_key))
  where deleted_at is null;
create unique index assessment_interpretation_bands_key_idx
  on public.assessment_interpretation_bands (assessment_definition_version_id, lower(band_key))
  where deleted_at is null;
create index assessment_assignments_resolution_idx
  on public.assessment_assignments (tenant_id, assignment_scope, is_default, is_recommended, assignment_priority, effective_from, effective_until)
  where deleted_at is null and is_active = true;
create unique index assessment_assignments_default_scope_idx
  on public.assessment_assignments (
    tenant_id,
    assignment_scope,
    coalesce(practice_location_id::text, ''),
    coalesce(therapist_profile_id::text, ''),
    coalesce(discipline, ''),
    coalesce(encounter_type, ''),
    coalesce(session_type, ''),
    coalesce(assessment_phase, ''),
    assignment_priority
  )
  where deleted_at is null and is_active = true and is_default = true;
create unique index clinical_assessment_draft_states_assessment_idx
  on public.clinical_assessment_draft_states (clinical_assessment_id)
  where deleted_at is null;
create unique index clinical_assessment_responses_current_item_idx
  on public.clinical_assessment_item_responses (clinical_assessment_id, assessment_definition_item_id, repeat_index)
  where deleted_at is null;
create index clinical_assessment_responses_patient_idx
  on public.clinical_assessment_item_responses (tenant_id, patient_id, clinical_assessment_id)
  where deleted_at is null;
create unique index assessment_score_components_component_idx
  on public.assessment_score_components (clinical_assessment_id, lower(component_key))
  where deleted_at is null;
create index assessment_results_assessment_idx
  on public.outcome_measure_results (clinical_assessment_id, result_status)
  where deleted_at is null;
create index clinical_assessments_patient_status_idx
  on public.clinical_assessments (tenant_id, patient_id, assessment_status, assessment_date desc)
  where deleted_at is null;
create index clinical_assessments_context_idx
  on public.clinical_assessments (tenant_id, clinical_encounter_id, session_id, booking_id)
  where deleted_at is null;
create unique index assessment_series_members_assessment_idx
  on public.assessment_series_members (assessment_repeated_measure_series_id, clinical_assessment_id)
  where deleted_at is null;
create index assessment_goal_links_patient_idx
  on public.assessment_treatment_goal_links (tenant_id, patient_id, clinical_goal_id, treatment_plan_id)
  where deleted_at is null;
create index assessment_note_links_patient_idx
  on public.assessment_clinical_note_links (tenant_id, patient_id, clinical_note_id, clinical_note_version_id)
  where deleted_at is null;
create index assessment_patient_invitations_status_idx
  on public.assessment_patient_invitations (tenant_id, patient_id, invitation_status, submission_status, expires_at)
  where deleted_at is null;
create unique index assessment_external_imports_duplicate_idx
  on public.assessment_external_imports (tenant_id, duplicate_detection_key)
  where duplicate_detection_key is not null and deleted_at is null;
create index assessment_publications_patient_idx
  on public.assessment_patient_link_publications (tenant_id, patient_id, publication_state)
  where deleted_at is null;
create unique index assessment_usage_snapshots_version_idx
  on public.assessment_usage_snapshots (assessment_definition_version_id)
  where assessment_definition_version_id is not null and deleted_at is null;

create or replace function public.increment_assessment_lock_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.lock_version := coalesce(old.lock_version, 1) + 1;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.enforce_assessment_definition_immutability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  version_status_value text;
begin
  if tg_op = 'DELETE' then
    select version_status into version_status_value
    from public.assessment_definition_versions
    where id = old.assessment_definition_version_id;
    if version_status_value in ('published', 'active', 'retired', 'archived') then
      raise exception 'Published or retired assessment definition content is immutable';
    end if;
    return old;
  end if;

  select version_status into version_status_value
  from public.assessment_definition_versions
  where id = coalesce(new.assessment_definition_version_id, old.assessment_definition_version_id);
  if version_status_value in ('published', 'active', 'retired', 'archived') then
    raise exception 'Published or retired assessment definition content is immutable';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_assessment_response_immutability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assessment_status_value text;
begin
  if tg_op = 'DELETE' then
    select assessment_status into assessment_status_value
    from public.clinical_assessments
    where id = old.clinical_assessment_id;
    if assessment_status_value in ('finalised', 'signed', 'amended', 'invalidated', 'superseded') then
      raise exception 'Finalised assessment content is immutable';
    end if;
    return old;
  end if;

  select assessment_status into assessment_status_value
  from public.clinical_assessments
  where id = coalesce(new.clinical_assessment_id, old.clinical_assessment_id);
  if assessment_status_value in ('finalised', 'signed', 'amended', 'invalidated', 'superseded') then
    raise exception 'Finalised assessment content is immutable';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_assessment_append_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Assessment amendment records are append-only';
end;
$$;

create or replace function public.has_assessment_permission(target_tenant_id uuid, action_key text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    when target_tenant_id is null then public.is_super_admin() and action_key in ('system_definition_manage', 'definition_view')
    when action_key in ('definition_view', 'assessment_view') then public.has_tenant_role(target_tenant_id, array['admin', 'therapist'])
    when action_key in ('definition_create', 'definition_edit', 'assessment_start', 'assessment_edit', 'assessment_complete', 'assessment_finalise', 'assessment_sign', 'assessment_amend', 'interpretation_manage') then public.has_tenant_role(target_tenant_id, array['admin', 'therapist'])
    when action_key in ('definition_publish', 'definition_retire', 'assignment_manage', 'licensed_definition_manage', 'patient_publication_manage', 'submission_review', 'import_review') then public.has_tenant_role(target_tenant_id, array['admin'])
    else false
  end;
$$;

create or replace function public.validate_assessment_stable_key(key_input text)
returns boolean
language sql
immutable
as $$
  select key_input is not null and key_input ~ '^[a-z][a-z0-9_]{1,80}$';
$$;

create or replace function public.assert_assessment_definition_version_is_draft(target_definition_version_id uuid)
returns void
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  target_status text;
begin
  select version_status into target_status
  from public.assessment_definition_versions
  where id = target_definition_version_id
    and deleted_at is null;
  if target_status is null then
    raise exception 'Assessment definition version not found';
  end if;
  if target_status <> 'draft' then
    raise exception 'Only draft assessment definition versions can be edited';
  end if;
end;
$$;

create or replace function public.validate_assessment_definition_version_ready_for_publish(target_definition_version_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  version_record public.assessment_definition_versions%rowtype;
  definition_record public.outcome_measure_definitions%rowtype;
  section_count integer := 0;
  item_count integer := 0;
  required_optionless_count integer := 0;
  invalid_calculation_count integer := 0;
  errors jsonb := '[]'::jsonb;
begin
  select * into version_record from public.assessment_definition_versions where id = target_definition_version_id and deleted_at is null;
  if version_record.id is null then
    raise exception 'Assessment definition version not found';
  end if;
  select * into definition_record from public.outcome_measure_definitions where id = version_record.outcome_measure_definition_id and deleted_at is null;
  if definition_record.id is null then
    raise exception 'Assessment definition not found';
  end if;
  if not public.has_assessment_permission(version_record.tenant_id, 'definition_edit') then
    raise exception 'Not allowed to validate assessment definitions';
  end if;

  select count(*) into section_count from public.assessment_definition_sections where assessment_definition_version_id = version_record.id and deleted_at is null;
  select count(*) into item_count from public.assessment_definition_items where assessment_definition_version_id = version_record.id and deleted_at is null and is_informational = false and item_type not in ('heading', 'instruction');
  select count(*) into required_optionless_count
  from public.assessment_definition_items item
  where item.assessment_definition_version_id = version_record.id
    and item.deleted_at is null
    and item.item_type in ('single_choice', 'multiple_choice', 'checklist', 'scale', 'laterality', 'body_area')
    and not exists (
      select 1 from public.assessment_definition_item_options option_row
      where option_row.assessment_definition_item_id = item.id
        and option_row.deleted_at is null
    );
  select count(*) into invalid_calculation_count
  from public.assessment_definition_calculation_rules calculation
  where calculation.assessment_definition_version_id = version_record.id
    and calculation.deleted_at is null
    and exists (
      select 1
      from unnest(calculation.input_item_keys) input_key
      where not exists (
        select 1 from public.assessment_definition_items item
        where item.assessment_definition_version_id = version_record.id
          and item.item_key = input_key
          and item.deleted_at is null
      )
    );

  if nullif(btrim(definition_record.name), '') is null then
    errors := errors || jsonb_build_array('Assessment definition name is required');
  end if;
  if not public.validate_assessment_stable_key(definition_record.measure_key) then
    errors := errors || jsonb_build_array('Assessment definition key is invalid');
  end if;
  if section_count = 0 then
    errors := errors || jsonb_build_array('At least one assessment section is required');
  end if;
  if item_count = 0 then
    errors := errors || jsonb_build_array('At least one assessment item is required');
  end if;
  if required_optionless_count > 0 then
    errors := errors || jsonb_build_array('Choice-style assessment items must have options');
  end if;
  if invalid_calculation_count > 0 then
    errors := errors || jsonb_build_array('One or more calculation rules reference missing items');
  end if;

  update public.assessment_definition_versions
  set validation_status = case when jsonb_array_length(errors) = 0 then 'valid' else 'invalid' end,
      publication_ready = jsonb_array_length(errors) = 0,
      updated_by_profile_id = auth.uid()
  where id = version_record.id;

  return jsonb_build_object('valid', jsonb_array_length(errors) = 0, 'errors', errors);
end;
$$;

create or replace function public.create_outcome_measure_definition_draft(
  target_tenant_id uuid,
  measure_key_input text,
  definition_name_input text,
  description_input text default null,
  discipline_tags_input text[] default '{}'::text[],
  response_mode_input text default 'clinician_administered',
  idempotency_key_input text default null
)
returns table(outcome_measure_definition_id uuid, assessment_definition_version_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_definition_id uuid;
  existing_version_id uuid;
  existing_fingerprint text;
  request_fingerprint text;
  new_definition_id uuid;
  new_version_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not public.has_assessment_permission(target_tenant_id, 'definition_create') then
    raise exception 'Not allowed to create assessment definitions';
  end if;
  if not public.validate_assessment_stable_key(measure_key_input) then
    raise exception 'Assessment definition key is invalid';
  end if;
  if nullif(btrim(definition_name_input), '') is null then
    raise exception 'Assessment definition name is required';
  end if;

  request_fingerprint := md5(jsonb_build_object(
    'target_tenant_id', target_tenant_id,
    'measure_key_input', measure_key_input,
    'definition_name_input', btrim(definition_name_input),
    'description_input', nullif(description_input, ''),
    'discipline_tags_input', coalesce(discipline_tags_input, '{}'::text[]),
    'response_mode_input', response_mode_input
  )::text);

  if idempotency_key_input is not null then
    perform pg_advisory_xact_lock(hashtextextended(target_tenant_id::text || ':assessment-definition:' || idempotency_key_input, 0));
    select definition.id, version.id, definition.metadata ->> 'request_fingerprint'
    into existing_definition_id, existing_version_id, existing_fingerprint
    from public.outcome_measure_definitions definition
    join public.assessment_definition_versions version
      on version.outcome_measure_definition_id = definition.id
     and version.version_number = 1
     and version.deleted_at is null
    where definition.tenant_id = target_tenant_id
      and definition.metadata ->> 'idempotency_key' = idempotency_key_input
      and definition.deleted_at is null
    limit 1;

    if existing_definition_id is not null then
      if existing_fingerprint is distinct from request_fingerprint then
        raise exception 'Assessment definition idempotency key was reused with different request details';
      end if;
      return query select existing_definition_id, existing_version_id;
      return;
    end if;
  end if;

  insert into public.outcome_measure_definitions (
    tenant_id,
    definition_owner_type,
    definition_scope,
    measure_key,
    name,
    description,
    discipline_tags,
    definition_status,
    is_system_definition,
    supports_patient_reported,
    supports_clinician_administered,
    metadata,
    created_by_profile_id,
    updated_by_profile_id
  )
  values (
    target_tenant_id,
    'tenant',
    'tenant',
    measure_key_input,
    btrim(definition_name_input),
    nullif(description_input, ''),
    coalesce(discipline_tags_input, '{}'::text[]),
    'draft',
    false,
    response_mode_input = 'patient_reported',
    response_mode_input <> 'patient_reported',
    jsonb_build_object('idempotency_key', idempotency_key_input, 'request_fingerprint', request_fingerprint),
    auth.uid(),
    auth.uid()
  )
  returning id into new_definition_id;

  insert into public.assessment_definition_versions (
    tenant_id,
    outcome_measure_definition_id,
    version_number,
    version_status,
    response_mode,
    release_notes,
    created_by_profile_id,
    updated_by_profile_id,
    metadata
  )
  values (
    target_tenant_id,
    new_definition_id,
    1,
    'draft',
    response_mode_input,
    'Initial draft assessment definition',
    auth.uid(),
    auth.uid(),
    jsonb_build_object('created_from', 'phase6d_assessment_foundation', 'idempotency_key', idempotency_key_input)
  )
  returning id into new_version_id;

  insert into public.audit_events (tenant_id, actor_profile_id, action, entity_table, entity_id, metadata)
  values (target_tenant_id, auth.uid(), 'assessment_definition_created', 'outcome_measure_definitions', new_definition_id, jsonb_build_object('assessment_definition_version_id', new_version_id));

  return query select new_definition_id, new_version_id;
end;
$$;

create or replace function public.publish_assessment_definition_version(target_definition_version_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  version_record public.assessment_definition_versions%rowtype;
  definition_record public.outcome_measure_definitions%rowtype;
  validation_result jsonb;
begin
  select * into version_record from public.assessment_definition_versions where id = target_definition_version_id and deleted_at is null for update;
  if version_record.id is null then
    raise exception 'Assessment definition version not found';
  end if;
  select * into definition_record from public.outcome_measure_definitions where id = version_record.outcome_measure_definition_id and deleted_at is null for update;
  if definition_record.id is null then
    raise exception 'Assessment definition not found';
  end if;
  if version_record.tenant_id is null then
    if not public.has_assessment_permission(null, 'system_definition_manage') then
      raise exception 'Not allowed to publish system assessment definitions';
    end if;
  elsif not public.has_assessment_permission(version_record.tenant_id, 'definition_publish') then
    raise exception 'Not allowed to publish assessment definitions';
  end if;
  if version_record.version_status <> 'draft' then
    raise exception 'Only draft assessment definition versions can be published';
  end if;

  validation_result := public.validate_assessment_definition_version_ready_for_publish(target_definition_version_id);
  if coalesce((validation_result ->> 'valid')::boolean, false) is not true then
    raise exception 'Assessment definition version is not ready to publish';
  end if;

  update public.assessment_definition_versions
  set version_status = 'active',
      published_at = now(),
      published_by_profile_id = auth.uid(),
      validation_status = 'valid',
      publication_ready = true,
      updated_by_profile_id = auth.uid()
  where id = target_definition_version_id;

  update public.assessment_definition_versions
  set version_status = 'retired',
      retired_at = coalesce(retired_at, now()),
      updated_by_profile_id = auth.uid()
  where outcome_measure_definition_id = definition_record.id
    and id <> target_definition_version_id
    and version_status = 'active'
    and deleted_at is null;

  update public.outcome_measure_definitions
  set definition_status = 'active',
      active_definition_version_id = target_definition_version_id,
      updated_by_profile_id = auth.uid()
  where id = definition_record.id;

  insert into public.audit_events (tenant_id, actor_profile_id, action, entity_table, entity_id, metadata)
  values (version_record.tenant_id, auth.uid(), 'assessment_definition_version_published', 'assessment_definition_versions', target_definition_version_id, jsonb_build_object('outcome_measure_definition_id', definition_record.id, 'version_number', version_record.version_number));

  if version_record.tenant_id is not null then
    insert into public.clinical_workflow_events (tenant_id, event_type, event_key, metadata)
    values (
      version_record.tenant_id,
      'assessment_definition_published',
      'assessment_definition_published:' || target_definition_version_id::text,
      jsonb_build_object('outcome_measure_definition_id', definition_record.id, 'assessment_definition_version_id', target_definition_version_id)
    )
    on conflict (tenant_id, event_key) where event_key is not null and deleted_at is null do nothing;
  end if;

  return target_definition_version_id;
end;
$$;

create or replace function public.retire_assessment_definition_version(target_definition_version_id uuid, retirement_reason_input text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  version_record public.assessment_definition_versions%rowtype;
begin
  select * into version_record from public.assessment_definition_versions where id = target_definition_version_id and deleted_at is null for update;
  if version_record.id is null then
    raise exception 'Assessment definition version not found';
  end if;
  if version_record.tenant_id is null then
    if not public.has_assessment_permission(null, 'system_definition_manage') then
      raise exception 'Not allowed to retire system assessment definitions';
    end if;
  elsif not public.has_assessment_permission(version_record.tenant_id, 'definition_retire') then
    raise exception 'Not allowed to retire assessment definitions';
  end if;
  if version_record.version_status not in ('active', 'published') then
    raise exception 'Only active or published assessment definition versions can be retired';
  end if;

  update public.assessment_definition_versions
  set version_status = 'retired',
      retired_at = now(),
      retired_by_profile_id = auth.uid(),
      retirement_reason = nullif(retirement_reason_input, ''),
      updated_by_profile_id = auth.uid()
  where id = target_definition_version_id;

  update public.outcome_measure_definitions
  set active_definition_version_id = null,
      definition_status = 'retired',
      retired_at = now(),
      retired_by_profile_id = auth.uid(),
      retirement_reason = nullif(retirement_reason_input, ''),
      updated_by_profile_id = auth.uid()
  where id = version_record.outcome_measure_definition_id
    and active_definition_version_id = target_definition_version_id;

  return target_definition_version_id;
end;
$$;

create or replace function public.create_assessment_definition_version_from(source_definition_version_id uuid, change_reason_input text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  source_version public.assessment_definition_versions%rowtype;
  definition_record public.outcome_measure_definitions%rowtype;
  new_version_id uuid;
  next_version_number integer;
begin
  select * into source_version from public.assessment_definition_versions where id = source_definition_version_id and deleted_at is null;
  if source_version.id is null then
    raise exception 'Source assessment definition version not found';
  end if;
  select * into definition_record from public.outcome_measure_definitions where id = source_version.outcome_measure_definition_id and deleted_at is null;
  if definition_record.id is null then
    raise exception 'Assessment definition not found';
  end if;
  if not public.has_assessment_permission(source_version.tenant_id, 'definition_edit') then
    raise exception 'Not allowed to create new assessment definition versions';
  end if;

  select coalesce(max(version_number), 0) + 1 into next_version_number
  from public.assessment_definition_versions
  where outcome_measure_definition_id = definition_record.id
    and deleted_at is null;

  insert into public.assessment_definition_versions (
    tenant_id,
    outcome_measure_definition_id,
    version_number,
    version_status,
    version_label,
    definition_schema,
    scoring_schema,
    interpretation_schema,
    response_mode,
    release_notes,
    source_definition_version_id,
    created_by_profile_id,
    updated_by_profile_id,
    metadata
  )
  values (
    source_version.tenant_id,
    source_version.outcome_measure_definition_id,
    next_version_number,
    'draft',
    source_version.version_label,
    source_version.definition_schema,
    source_version.scoring_schema,
    source_version.interpretation_schema,
    source_version.response_mode,
    coalesce(nullif(change_reason_input, ''), 'New draft version'),
    source_version.id,
    auth.uid(),
    auth.uid(),
    jsonb_build_object('source_definition_version_id', source_version.id)
  )
  returning id into new_version_id;

  insert into public.assessment_definition_sections (tenant_id, assessment_definition_version_id, parent_section_id, section_key, section_label, instructions, display_order, section_type, is_repeating, patient_reported_eligible, clinician_only, is_restricted, metadata, created_by_profile_id, updated_by_profile_id)
  select tenant_id, new_version_id, null, section_key, section_label, instructions, display_order, section_type, is_repeating, patient_reported_eligible, clinician_only, is_restricted, metadata || jsonb_build_object('source_section_id', id), auth.uid(), auth.uid()
  from public.assessment_definition_sections
  where assessment_definition_version_id = source_version.id and deleted_at is null;

  insert into public.assessment_definition_items (tenant_id, assessment_definition_version_id, assessment_definition_section_id, parent_item_id, item_key, item_label, item_prompt, item_type, display_order, help_text, placeholder, default_value, item_config, validation_config, allowed_units, is_required, is_required_for_completion, is_read_only, is_calculated, is_informational, is_repeating, patient_reported_eligible, clinician_only, is_restricted, patient_facing_label, patient_facing_description, stable_identity_key, metadata, created_by_profile_id, updated_by_profile_id)
  select source_item.tenant_id, new_version_id, new_section.id, null, source_item.item_key, source_item.item_label, source_item.item_prompt, source_item.item_type, source_item.display_order, source_item.help_text, source_item.placeholder, source_item.default_value, source_item.item_config, source_item.validation_config, source_item.allowed_units, source_item.is_required, source_item.is_required_for_completion, source_item.is_read_only, source_item.is_calculated, source_item.is_informational, source_item.is_repeating, source_item.patient_reported_eligible, source_item.clinician_only, source_item.is_restricted, source_item.patient_facing_label, source_item.patient_facing_description, source_item.stable_identity_key, source_item.metadata || jsonb_build_object('source_item_id', source_item.id), auth.uid(), auth.uid()
  from public.assessment_definition_items source_item
  join public.assessment_definition_sections new_section on new_section.assessment_definition_version_id = new_version_id and new_section.metadata ->> 'source_section_id' = source_item.assessment_definition_section_id::text and new_section.deleted_at is null
  where source_item.assessment_definition_version_id = source_version.id and source_item.deleted_at is null;

  insert into public.assessment_definition_item_options (tenant_id, assessment_definition_version_id, assessment_definition_item_id, option_key, option_label, option_value, numeric_value, display_order, is_default, patient_reported_eligible, metadata)
  select source_option.tenant_id, new_version_id, new_item.id, source_option.option_key, source_option.option_label, source_option.option_value, source_option.numeric_value, source_option.display_order, source_option.is_default, source_option.patient_reported_eligible, source_option.metadata || jsonb_build_object('source_option_id', source_option.id)
  from public.assessment_definition_item_options source_option
  join public.assessment_definition_items new_item on new_item.assessment_definition_version_id = new_version_id and new_item.metadata ->> 'source_item_id' = source_option.assessment_definition_item_id::text and new_item.deleted_at is null
  where source_option.assessment_definition_version_id = source_version.id and source_option.deleted_at is null;

  return new_version_id;
end;
$$;

create or replace function public.upsert_assessment_assignment(
  target_definition_version_id uuid,
  assignment_id_input uuid default null,
  assignment_scope_input text default 'tenant',
  practice_location_id_input uuid default null,
  therapist_profile_id_input uuid default null,
  discipline_input text default null,
  encounter_type_input text default null,
  session_type_input text default null,
  assessment_phase_input text default null,
  patient_reported_eligible_input boolean default false,
  is_default_input boolean default false,
  is_recommended_input boolean default false,
  assignment_priority_input integer default 100,
  effective_from_input date default null,
  effective_until_input date default null,
  expected_lock_version integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  version_record public.assessment_definition_versions%rowtype;
  assignment_record public.assessment_assignments%rowtype;
  saved_assignment_id uuid;
begin
  select * into version_record from public.assessment_definition_versions where id = target_definition_version_id and deleted_at is null;
  if version_record.id is null or version_record.version_status <> 'active' then
    raise exception 'Only active assessment definition versions can be assigned';
  end if;
  if not public.has_assessment_permission(version_record.tenant_id, 'assignment_manage') then
    raise exception 'Not allowed to manage assessment assignments';
  end if;
  if assignment_priority_input <= 0 then
    raise exception 'Assignment priority must be positive';
  end if;
  if effective_from_input is not null and effective_until_input is not null and effective_from_input > effective_until_input then
    raise exception 'Assignment dates are invalid';
  end if;
  if practice_location_id_input is not null and not exists (select 1 from public.practice_locations where id = practice_location_id_input and tenant_id = version_record.tenant_id and deleted_at is null) then
    raise exception 'Assignment location does not belong to this tenant';
  end if;
  if therapist_profile_id_input is not null and not exists (select 1 from public.therapist_profiles where id = therapist_profile_id_input and tenant_id = version_record.tenant_id and deleted_at is null) then
    raise exception 'Assignment therapist does not belong to this tenant';
  end if;

  if assignment_id_input is not null then
    select * into assignment_record from public.assessment_assignments where id = assignment_id_input and tenant_id = version_record.tenant_id and deleted_at is null for update;
    if assignment_record.id is null then
      raise exception 'Assessment assignment not found';
    end if;
    if expected_lock_version is not null and assignment_record.lock_version <> expected_lock_version then
      raise exception 'Assessment assignment changed since it was loaded';
    end if;
    update public.assessment_assignments
    set assessment_definition_version_id = version_record.id,
        outcome_measure_definition_id = version_record.outcome_measure_definition_id,
        assignment_scope = assignment_scope_input,
        practice_location_id = practice_location_id_input,
        therapist_profile_id = therapist_profile_id_input,
        discipline = nullif(discipline_input, ''),
        encounter_type = nullif(encounter_type_input, ''),
        session_type = nullif(session_type_input, ''),
        assessment_phase = nullif(assessment_phase_input, ''),
        patient_reported_eligible = patient_reported_eligible_input,
        is_default = is_default_input,
        is_recommended = is_recommended_input,
        assignment_priority = assignment_priority_input,
        effective_from = effective_from_input,
        effective_until = effective_until_input,
        assigned_by_profile_id = auth.uid()
    where id = assignment_record.id
    returning id into saved_assignment_id;
  else
    insert into public.assessment_assignments (
      tenant_id, outcome_measure_definition_id, assessment_definition_version_id, assignment_scope, practice_location_id, therapist_profile_id, discipline, encounter_type, session_type, assessment_phase, patient_reported_eligible, is_default, is_recommended, assignment_priority, effective_from, effective_until, assigned_by_profile_id
    )
    values (
      version_record.tenant_id, version_record.outcome_measure_definition_id, version_record.id, assignment_scope_input, practice_location_id_input, therapist_profile_id_input, nullif(discipline_input, ''), nullif(encounter_type_input, ''), nullif(session_type_input, ''), nullif(assessment_phase_input, ''), patient_reported_eligible_input, is_default_input, is_recommended_input, assignment_priority_input, effective_from_input, effective_until_input, auth.uid()
    )
    returning id into saved_assignment_id;
  end if;

  insert into public.audit_events (tenant_id, actor_profile_id, action, entity_table, entity_id, metadata)
  values (version_record.tenant_id, auth.uid(), 'assessment_assignment_changed', 'assessment_assignments', saved_assignment_id, jsonb_build_object('assessment_definition_version_id', version_record.id));

  return saved_assignment_id;
end;
$$;

create or replace function public.create_clinical_assessment_draft(
  target_tenant_id uuid,
  target_patient_id uuid,
  assessment_definition_version_id_input uuid,
  clinical_encounter_id_input uuid default null,
  booking_id_input uuid default null,
  session_id_input uuid default null,
  treatment_plan_id_input uuid default null,
  clinical_goal_id_input uuid default null,
  assessment_phase_input text default null,
  idempotency_key_input text default null
)
returns table(clinical_assessment_id uuid, assessment_draft_state_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  patient_record public.patients%rowtype;
  version_record public.assessment_definition_versions%rowtype;
  definition_record public.outcome_measure_definitions%rowtype;
  therapist_id uuid;
  request_fingerprint text;
  existing_assessment_id uuid;
  existing_draft_id uuid;
  existing_fingerprint text;
  new_assessment_id uuid;
  new_draft_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not public.has_assessment_permission(target_tenant_id, 'assessment_start') then
    raise exception 'Not allowed to start clinical assessments';
  end if;
  select * into patient_record from public.patients where id = target_patient_id and tenant_id = target_tenant_id and deleted_at is null;
  if patient_record.id is null then
    raise exception 'Patient not found for tenant';
  end if;
  select * into version_record from public.assessment_definition_versions where id = assessment_definition_version_id_input and deleted_at is null;
  if version_record.id is null or version_record.version_status <> 'active' then
    raise exception 'Assessment definition version is not available';
  end if;
  if version_record.tenant_id is not null and version_record.tenant_id <> target_tenant_id then
    raise exception 'Assessment definition version does not belong to this tenant';
  end if;
  select * into definition_record from public.outcome_measure_definitions where id = version_record.outcome_measure_definition_id and deleted_at is null;
  if definition_record.id is null then
    raise exception 'Assessment definition not found';
  end if;
  if booking_id_input is not null and not exists (select 1 from public.bookings where id = booking_id_input and tenant_id = target_tenant_id and patient_id = target_patient_id and deleted_at is null) then
    raise exception 'Booking does not belong to this patient and tenant';
  end if;
  if session_id_input is not null and not exists (select 1 from public.sessions where id = session_id_input and tenant_id = target_tenant_id and patient_id = target_patient_id and deleted_at is null) then
    raise exception 'Session does not belong to this patient and tenant';
  end if;
  if clinical_encounter_id_input is not null and not exists (select 1 from public.clinical_encounters where id = clinical_encounter_id_input and tenant_id = target_tenant_id and patient_id = target_patient_id and deleted_at is null) then
    raise exception 'Clinical encounter does not belong to this patient and tenant';
  end if;
  if treatment_plan_id_input is not null and not exists (select 1 from public.treatment_plans where id = treatment_plan_id_input and tenant_id = target_tenant_id and patient_id = target_patient_id and deleted_at is null) then
    raise exception 'Treatment plan does not belong to this patient and tenant';
  end if;
  if clinical_goal_id_input is not null and not exists (select 1 from public.clinical_goals where id = clinical_goal_id_input and tenant_id = target_tenant_id and patient_id = target_patient_id and deleted_at is null) then
    raise exception 'Clinical goal does not belong to this patient and tenant';
  end if;

  select therapist.id into therapist_id
  from public.therapist_profiles therapist
  where therapist.tenant_id = target_tenant_id
    and therapist.user_id = auth.uid()
    and therapist.deleted_at is null
  limit 1;

  request_fingerprint := md5(jsonb_build_object(
    'target_tenant_id', target_tenant_id,
    'target_patient_id', target_patient_id,
    'assessment_definition_version_id_input', assessment_definition_version_id_input,
    'clinical_encounter_id_input', clinical_encounter_id_input,
    'booking_id_input', booking_id_input,
    'session_id_input', session_id_input,
    'assessment_phase_input', assessment_phase_input
  )::text);

  if idempotency_key_input is not null then
    perform pg_advisory_xact_lock(hashtextextended(target_tenant_id::text || ':clinical-assessment:' || idempotency_key_input, 0));
    select assessment.id, draft.id, assessment.metadata ->> 'request_fingerprint'
    into existing_assessment_id, existing_draft_id, existing_fingerprint
    from public.clinical_assessments assessment
    join public.clinical_assessment_draft_states draft on draft.clinical_assessment_id = assessment.id and draft.deleted_at is null
    where assessment.tenant_id = target_tenant_id
      and assessment.metadata ->> 'idempotency_key' = idempotency_key_input
      and assessment.deleted_at is null
    limit 1;
    if existing_assessment_id is not null then
      if existing_fingerprint is distinct from request_fingerprint then
        raise exception 'Assessment idempotency key was reused with different request details';
      end if;
      return query select existing_assessment_id, existing_draft_id;
      return;
    end if;
  end if;

  insert into public.clinical_assessments (
    tenant_id, patient_id, clinical_encounter_id, booking_id, session_id, treatment_plan_id, clinical_goal_id, outcome_measure_definition_id, assessment_definition_version_id, assessor_therapist_profile_id, assessment_type, assessment_status, assessment_source, assessment_phase, assessment_date, started_at, started_by_profile_id, metadata, created_by_profile_id, updated_by_profile_id
  )
  values (
    target_tenant_id, target_patient_id, clinical_encounter_id_input, booking_id_input, session_id_input, treatment_plan_id_input, clinical_goal_id_input, definition_record.id, version_record.id, therapist_id, 'outcome_measure', 'draft', 'clinician', assessment_phase_input, current_date, now(), auth.uid(), jsonb_build_object('idempotency_key', idempotency_key_input, 'request_fingerprint', request_fingerprint), auth.uid(), auth.uid()
  )
  returning id into new_assessment_id;

  insert into public.clinical_assessment_draft_states (tenant_id, patient_id, clinical_assessment_id, assessment_definition_version_id, draft_owner_profile_id, active_editor_profile_id, last_saved_by_profile_id, last_idempotency_key)
  values (target_tenant_id, target_patient_id, new_assessment_id, version_record.id, auth.uid(), auth.uid(), auth.uid(), idempotency_key_input)
  returning id into new_draft_id;

  insert into public.audit_events (tenant_id, actor_profile_id, action, entity_table, entity_id, metadata)
  values (target_tenant_id, auth.uid(), 'clinical_assessment_created', 'clinical_assessments', new_assessment_id, jsonb_build_object('assessment_definition_version_id', version_record.id));

  insert into public.clinical_workflow_events (tenant_id, patient_id, clinical_assessment_id, event_type, event_key, metadata)
  values (target_tenant_id, target_patient_id, new_assessment_id, 'assessment_started', 'assessment_started:' || new_assessment_id::text, jsonb_build_object('assessment_definition_version_id', version_record.id))
  on conflict (tenant_id, event_key) where event_key is not null and deleted_at is null do nothing;

  return query select new_assessment_id, new_draft_id;
end;
$$;

create or replace function public.assessment_response_value_is_valid(item_record public.assessment_definition_items, response_payload jsonb)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if item_record.item_type in ('heading', 'instruction') or item_record.is_informational = true or item_record.is_calculated = true then
    return false;
  end if;
  if response_payload is null then
    return item_record.is_required is false and item_record.is_required_for_completion is false;
  end if;
  case item_record.item_type
    when 'short_text', 'long_text', 'observation', 'laterality', 'body_area' then
      return jsonb_typeof(response_payload) = 'string';
    when 'integer', 'decimal', 'scale', 'measurement' then
      return jsonb_typeof(response_payload) = 'number';
    when 'boolean' then
      return jsonb_typeof(response_payload) = 'boolean';
    when 'single_choice' then
      return jsonb_typeof(response_payload) = 'string';
    when 'multiple_choice', 'checklist' then
      return jsonb_typeof(response_payload) = 'array';
    when 'date', 'time', 'datetime', 'attachment_reference', 'clinical_record_reference' then
      return jsonb_typeof(response_payload) in ('string', 'object');
    else
      return false;
  end case;
end;
$$;

create or replace function public.save_clinical_assessment_response(
  target_clinical_assessment_id uuid,
  target_assessment_definition_item_id uuid,
  response_payload jsonb,
  repeat_index_input integer default 1,
  expected_lock_version integer default null,
  idempotency_key_input text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  assessment_record public.clinical_assessments%rowtype;
  item_record public.assessment_definition_items%rowtype;
  existing_response public.clinical_assessment_item_responses%rowtype;
  saved_response_id uuid;
begin
  select * into assessment_record from public.clinical_assessments where id = target_clinical_assessment_id and deleted_at is null for update;
  if assessment_record.id is null then
    raise exception 'Clinical assessment not found';
  end if;
  if not public.has_assessment_permission(assessment_record.tenant_id, 'assessment_edit') then
    raise exception 'Not allowed to edit clinical assessments';
  end if;
  if assessment_record.assessment_status not in ('draft', 'in_progress', 'completed') then
    raise exception 'Assessment responses can only be edited before finalisation';
  end if;
  if repeat_index_input <= 0 then
    raise exception 'Repeat index must be positive';
  end if;
  select * into item_record from public.assessment_definition_items where id = target_assessment_definition_item_id and assessment_definition_version_id = assessment_record.assessment_definition_version_id and deleted_at is null;
  if item_record.id is null then
    raise exception 'Assessment item does not belong to this assessment definition version';
  end if;
  if not public.assessment_response_value_is_valid(item_record, response_payload) then
    raise exception 'Assessment response value is invalid for this item';
  end if;

  select * into existing_response
  from public.clinical_assessment_item_responses
  where clinical_assessment_id = assessment_record.id
    and assessment_definition_item_id = item_record.id
    and repeat_index = repeat_index_input
    and deleted_at is null
  for update;

  if existing_response.id is not null then
    if expected_lock_version is not null and existing_response.lock_version <> expected_lock_version then
      raise exception 'Assessment response changed since it was loaded';
    end if;
    update public.clinical_assessment_item_responses
    set response_value = response_payload,
        text_value = case when jsonb_typeof(response_payload) = 'string' then trim(both '"' from response_payload::text) else null end,
        numeric_value = case when jsonb_typeof(response_payload) = 'number' then (response_payload::text)::numeric else null end,
        boolean_value = case when jsonb_typeof(response_payload) = 'boolean' then (response_payload::text)::boolean else null end,
        selected_option_keys = case when jsonb_typeof(response_payload) = 'array' then array(select jsonb_array_elements_text(response_payload)) when item_record.item_type = 'single_choice' then array[trim(both '"' from response_payload::text)] else '{}'::text[] end,
        validation_status = 'not_run',
        updated_by_profile_id = auth.uid(),
        idempotency_key = idempotency_key_input
    where id = existing_response.id
    returning id into saved_response_id;
  else
    insert into public.clinical_assessment_item_responses (
      tenant_id, patient_id, clinical_assessment_id, assessment_definition_version_id, assessment_definition_section_id, assessment_definition_item_id, item_key, response_source, repeat_index, response_value, text_value, numeric_value, boolean_value, selected_option_keys, validation_status, is_restricted, idempotency_key, created_by_profile_id, updated_by_profile_id
    )
    values (
      assessment_record.tenant_id,
      assessment_record.patient_id,
      assessment_record.id,
      assessment_record.assessment_definition_version_id,
      item_record.assessment_definition_section_id,
      item_record.id,
      item_record.item_key,
      assessment_record.assessment_source,
      repeat_index_input,
      response_payload,
      case when jsonb_typeof(response_payload) = 'string' then trim(both '"' from response_payload::text) else null end,
      case when jsonb_typeof(response_payload) = 'number' then (response_payload::text)::numeric else null end,
      case when jsonb_typeof(response_payload) = 'boolean' then (response_payload::text)::boolean else null end,
      case when jsonb_typeof(response_payload) = 'array' then array(select jsonb_array_elements_text(response_payload)) when item_record.item_type = 'single_choice' then array[trim(both '"' from response_payload::text)] else '{}'::text[] end,
      'not_run',
      item_record.is_restricted,
      idempotency_key_input,
      auth.uid(),
      auth.uid()
    )
    returning id into saved_response_id;
  end if;

  update public.clinical_assessments
  set assessment_status = case when assessment_status = 'draft' then 'in_progress' else assessment_status end,
      updated_by_profile_id = auth.uid()
  where id = assessment_record.id;

  update public.clinical_assessment_draft_states
  set last_saved_at = now(),
      active_editor_profile_id = auth.uid(),
      last_saved_by_profile_id = auth.uid(),
      last_idempotency_key = idempotency_key_input
  where clinical_assessment_id = assessment_record.id
    and deleted_at is null;

  return saved_response_id;
end;
$$;

create or replace function public.validate_clinical_assessment_ready_for_completion(target_clinical_assessment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  assessment_record public.clinical_assessments%rowtype;
  missing_required_count integer := 0;
  errors jsonb := '[]'::jsonb;
begin
  select * into assessment_record from public.clinical_assessments where id = target_clinical_assessment_id and deleted_at is null;
  if assessment_record.id is null then
    raise exception 'Clinical assessment not found';
  end if;
  if not public.has_assessment_permission(assessment_record.tenant_id, 'assessment_complete') then
    raise exception 'Not allowed to complete clinical assessments';
  end if;
  select count(*) into missing_required_count
  from public.assessment_definition_items item
  where item.assessment_definition_version_id = assessment_record.assessment_definition_version_id
    and item.deleted_at is null
    and item.is_required_for_completion = true
    and item.is_informational = false
    and item.is_calculated = false
    and not exists (
      select 1 from public.clinical_assessment_item_responses response
      where response.clinical_assessment_id = assessment_record.id
        and response.assessment_definition_item_id = item.id
        and response.deleted_at is null
    );
  if missing_required_count > 0 then
    errors := errors || jsonb_build_array('Required assessment responses are missing');
  end if;
  return jsonb_build_object('valid', jsonb_array_length(errors) = 0, 'errors', errors);
end;
$$;

create or replace function public.complete_clinical_assessment(target_clinical_assessment_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  assessment_record public.clinical_assessments%rowtype;
  validation_result jsonb;
begin
  select * into assessment_record from public.clinical_assessments where id = target_clinical_assessment_id and deleted_at is null for update;
  if assessment_record.id is null then
    raise exception 'Clinical assessment not found';
  end if;
  if assessment_record.assessment_status not in ('draft', 'in_progress', 'completed') then
    raise exception 'Assessment cannot be completed from its current state';
  end if;
  validation_result := public.validate_clinical_assessment_ready_for_completion(target_clinical_assessment_id);
  if coalesce((validation_result ->> 'valid')::boolean, false) is not true then
    raise exception 'Clinical assessment is not ready for completion';
  end if;
  update public.clinical_assessments
  set assessment_status = 'completed',
      completed_at = coalesce(completed_at, now()),
      completed_by_profile_id = coalesce(completed_by_profile_id, auth.uid()),
      updated_by_profile_id = auth.uid()
  where id = assessment_record.id;
  update public.clinical_assessment_draft_states set draft_status = 'completed' where clinical_assessment_id = assessment_record.id and deleted_at is null;
  return assessment_record.id;
end;
$$;

create or replace function public.finalise_clinical_assessment(target_clinical_assessment_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  assessment_record public.clinical_assessments%rowtype;
begin
  select * into assessment_record from public.clinical_assessments where id = target_clinical_assessment_id and deleted_at is null for update;
  if assessment_record.id is null then
    raise exception 'Clinical assessment not found';
  end if;
  if not public.has_assessment_permission(assessment_record.tenant_id, 'assessment_finalise') then
    raise exception 'Not allowed to finalise clinical assessments';
  end if;
  if assessment_record.assessment_status <> 'completed' then
    raise exception 'Only completed assessments can be finalised';
  end if;
  update public.clinical_assessments
  set assessment_status = 'finalised',
      finalised_at = now(),
      finalised_by_profile_id = auth.uid(),
      content_hash = encode(extensions.digest(assessment_record.id::text || ':' || now()::text, 'sha256'), 'hex'),
      updated_by_profile_id = auth.uid()
  where id = assessment_record.id;
  update public.clinical_assessment_draft_states set draft_status = 'finalised' where clinical_assessment_id = assessment_record.id and deleted_at is null;
  return assessment_record.id;
end;
$$;

create or replace function public.sign_clinical_assessment(target_clinical_assessment_id uuid, signature_statement_input text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  assessment_record public.clinical_assessments%rowtype;
begin
  select * into assessment_record from public.clinical_assessments where id = target_clinical_assessment_id and deleted_at is null for update;
  if assessment_record.id is null then
    raise exception 'Clinical assessment not found';
  end if;
  if not public.has_assessment_permission(assessment_record.tenant_id, 'assessment_sign') then
    raise exception 'Not allowed to sign clinical assessments';
  end if;
  if assessment_record.assessment_status not in ('finalised', 'signed') then
    raise exception 'Only finalised assessments can be signed';
  end if;
  if assessment_record.assessment_status = 'signed' then
    return assessment_record.id;
  end if;
  update public.clinical_assessments
  set assessment_status = 'signed',
      signed_at = now(),
      signed_by_profile_id = auth.uid(),
      signature_statement = coalesce(nullif(signature_statement_input, ''), 'Clinician acknowledged this assessment result.'),
      updated_by_profile_id = auth.uid()
  where id = assessment_record.id;
  return assessment_record.id;
end;
$$;

create or replace function public.amend_clinical_assessment(
  target_clinical_assessment_id uuid,
  amendment_reason_input text,
  target_record_type_input text default 'assessment',
  target_record_id_input uuid default null,
  corrected_snapshot_input jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  assessment_record public.clinical_assessments%rowtype;
  next_number integer;
  amendment_id uuid;
begin
  select * into assessment_record from public.clinical_assessments where id = target_clinical_assessment_id and deleted_at is null for update;
  if assessment_record.id is null then
    raise exception 'Clinical assessment not found';
  end if;
  if not public.has_assessment_permission(assessment_record.tenant_id, 'assessment_amend') then
    raise exception 'Not allowed to amend clinical assessments';
  end if;
  if assessment_record.assessment_status not in ('finalised', 'signed', 'amended') then
    raise exception 'Only finalised or signed assessments can be amended';
  end if;
  if nullif(btrim(amendment_reason_input), '') is null then
    raise exception 'Assessment amendment reason is required';
  end if;
  select coalesce(max(amendment_number), 0) + 1 into next_number
  from public.assessment_amendments
  where clinical_assessment_id = assessment_record.id
    and deleted_at is null;
  insert into public.assessment_amendments (
    tenant_id, patient_id, clinical_assessment_id, amendment_number, amendment_reason, target_record_type, target_record_id, original_snapshot, corrected_snapshot, author_profile_id
  )
  values (
    assessment_record.tenant_id, assessment_record.patient_id, assessment_record.id, next_number, btrim(amendment_reason_input), target_record_type_input, coalesce(target_record_id_input, assessment_record.id), jsonb_build_object('assessment_status', assessment_record.assessment_status, 'content_hash', assessment_record.content_hash), coalesce(corrected_snapshot_input, '{}'::jsonb), auth.uid()
  )
  returning id into amendment_id;
  update public.clinical_assessments
  set assessment_status = 'amended',
      amendment_count = amendment_count + 1,
      updated_by_profile_id = auth.uid()
  where id = assessment_record.id;
  return amendment_id;
end;
$$;

create or replace view public.assessment_definition_usage_summary
with (security_invoker = true)
as
select
  definition.tenant_id,
  definition.id as outcome_measure_definition_id,
  version.id as assessment_definition_version_id,
  definition.measure_key,
  definition.name,
  version.version_number,
  version.version_status,
  count(distinct assessment.id) as assessment_count,
  count(distinct assessment.id) filter (where assessment.assessment_status = 'draft') as draft_count,
  count(distinct assessment.id) filter (where assessment.assessment_status = 'completed') as completed_count,
  count(distinct assessment.id) filter (where assessment.assessment_status in ('finalised', 'signed', 'amended')) as finalised_count,
  count(distinct assessment.id) filter (where assessment.assessment_status = 'invalidated') as invalidated_count,
  count(distinct assignment.id) filter (where assignment.is_active = true and assignment.deleted_at is null) as active_assignment_count,
  min(assessment.created_at) as first_used_at,
  max(assessment.created_at) as last_used_at
from public.outcome_measure_definitions definition
join public.assessment_definition_versions version
  on version.outcome_measure_definition_id = definition.id
 and version.deleted_at is null
left join public.clinical_assessments assessment
  on assessment.assessment_definition_version_id = version.id
 and assessment.deleted_at is null
left join public.assessment_assignments assignment
  on assignment.assessment_definition_version_id = version.id
 and assignment.deleted_at is null
where definition.deleted_at is null
group by definition.tenant_id, definition.id, version.id, definition.measure_key, definition.name, version.version_number, version.version_status;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'outcome_measure_definitions',
    'clinical_assessments',
    'outcome_measure_results',
    'assessment_definition_versions',
    'assessment_definition_sections',
    'assessment_definition_items',
    'assessment_definition_item_options',
    'assessment_definition_validation_rules',
    'assessment_definition_calculation_rules',
    'assessment_interpretation_bands',
    'assessment_assignments',
    'clinical_assessment_draft_states',
    'clinical_assessment_item_responses',
    'assessment_score_components',
    'assessment_practitioner_interpretations',
    'assessment_repeated_measure_series',
    'assessment_patient_invitations',
    'assessment_external_imports',
    'assessment_patient_link_publications',
    'assessment_usage_snapshots'
  ] loop
    execute format('drop trigger if exists %I on public.%I', target_table || '_increment_assessment_lock_version', target_table);
    execute format('create trigger %I before update on public.%I for each row execute function public.increment_assessment_lock_version()', target_table || '_increment_assessment_lock_version', target_table);
  end loop;
end $$;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'assessment_definition_sections',
    'assessment_definition_items',
    'assessment_definition_item_options',
    'assessment_definition_validation_rules',
    'assessment_definition_calculation_rules',
    'assessment_interpretation_bands'
  ] loop
    execute format('drop trigger if exists %I on public.%I', target_table || '_enforce_definition_immutability', target_table);
    execute format('create trigger %I before update or delete on public.%I for each row execute function public.enforce_assessment_definition_immutability()', target_table || '_enforce_definition_immutability', target_table);
  end loop;
end $$;

create trigger clinical_assessment_item_responses_enforce_immutability before update or delete on public.clinical_assessment_item_responses for each row execute function public.enforce_assessment_response_immutability();
create trigger assessment_score_components_enforce_immutability before update or delete on public.assessment_score_components for each row execute function public.enforce_assessment_response_immutability();
create trigger assessment_practitioner_interpretations_enforce_immutability before update or delete on public.assessment_practitioner_interpretations for each row execute function public.enforce_assessment_response_immutability();
create trigger assessment_amendments_append_only before update or delete on public.assessment_amendments for each row execute function public.enforce_assessment_append_only();

alter table public.assessment_definition_versions enable row level security;
alter table public.assessment_definition_sections enable row level security;
alter table public.assessment_definition_items enable row level security;
alter table public.assessment_definition_item_options enable row level security;
alter table public.assessment_definition_validation_rules enable row level security;
alter table public.assessment_definition_calculation_rules enable row level security;
alter table public.assessment_interpretation_bands enable row level security;
alter table public.assessment_assignments enable row level security;
alter table public.clinical_assessment_draft_states enable row level security;
alter table public.clinical_assessment_item_responses enable row level security;
alter table public.assessment_score_components enable row level security;
alter table public.assessment_practitioner_interpretations enable row level security;
alter table public.assessment_amendments enable row level security;
alter table public.assessment_repeated_measure_series enable row level security;
alter table public.assessment_series_members enable row level security;
alter table public.assessment_treatment_goal_links enable row level security;
alter table public.assessment_clinical_note_links enable row level security;
alter table public.assessment_patient_invitations enable row level security;
alter table public.assessment_external_imports enable row level security;
alter table public.assessment_patient_link_publications enable row level security;
alter table public.assessment_usage_snapshots enable row level security;

do $$
declare
  assessment_table text;
begin
  foreach assessment_table in array array[
    'assessment_definition_versions',
    'assessment_definition_sections',
    'assessment_definition_items',
    'assessment_definition_item_options',
    'assessment_definition_validation_rules',
    'assessment_definition_calculation_rules',
    'assessment_interpretation_bands'
  ] loop
    execute format('create policy %I on public.%I for select to authenticated using (deleted_at is null and (tenant_id is null or public.has_assessment_permission(tenant_id, ''definition_view'')))', 'assessment definition readers can read ' || assessment_table, assessment_table);
  end loop;
  foreach assessment_table in array array[
    'assessment_assignments',
    'clinical_assessment_draft_states',
    'clinical_assessment_item_responses',
    'assessment_score_components',
    'assessment_practitioner_interpretations',
    'assessment_amendments',
    'assessment_repeated_measure_series',
    'assessment_series_members',
    'assessment_treatment_goal_links',
    'assessment_clinical_note_links',
    'assessment_patient_invitations',
    'assessment_external_imports',
    'assessment_patient_link_publications',
    'assessment_usage_snapshots'
  ] loop
    execute format('create policy %I on public.%I for select to authenticated using (deleted_at is null and public.has_assessment_permission(tenant_id, ''assessment_view''))', 'tenant assessment users can read ' || assessment_table, assessment_table);
  end loop;
end $$;

revoke insert, update, delete on table public.clinical_assessments from authenticated;
revoke insert, update, delete on table public.outcome_measure_results from authenticated;

do $$
declare
  assessment_table text;
begin
  foreach assessment_table in array array[
    'assessment_definition_versions',
    'assessment_definition_sections',
    'assessment_definition_items',
    'assessment_definition_item_options',
    'assessment_definition_validation_rules',
    'assessment_definition_calculation_rules',
    'assessment_interpretation_bands',
    'assessment_assignments',
    'clinical_assessment_draft_states',
    'clinical_assessment_item_responses',
    'assessment_score_components',
    'assessment_practitioner_interpretations',
    'assessment_amendments',
    'assessment_repeated_measure_series',
    'assessment_series_members',
    'assessment_treatment_goal_links',
    'assessment_clinical_note_links',
    'assessment_patient_invitations',
    'assessment_external_imports',
    'assessment_patient_link_publications',
    'assessment_usage_snapshots'
  ] loop
    execute format('revoke all on table public.%I from anon, authenticated', assessment_table);
    execute format('grant select on table public.%I to authenticated', assessment_table);
  end loop;
end $$;

grant select on public.assessment_definition_usage_summary to authenticated;

revoke all on function public.increment_assessment_lock_version() from public, anon;
revoke all on function public.enforce_assessment_definition_immutability() from public, anon;
revoke all on function public.enforce_assessment_response_immutability() from public, anon;
revoke all on function public.enforce_assessment_append_only() from public, anon;
revoke all on function public.has_assessment_permission(uuid, text) from public, anon;
revoke all on function public.validate_assessment_stable_key(text) from public, anon;
revoke all on function public.assert_assessment_definition_version_is_draft(uuid) from public, anon;
revoke all on function public.validate_assessment_definition_version_ready_for_publish(uuid) from public, anon;
revoke all on function public.create_outcome_measure_definition_draft(uuid, text, text, text, text[], text, text) from public, anon;
revoke all on function public.publish_assessment_definition_version(uuid) from public, anon;
revoke all on function public.retire_assessment_definition_version(uuid, text) from public, anon;
revoke all on function public.create_assessment_definition_version_from(uuid, text) from public, anon;
revoke all on function public.upsert_assessment_assignment(uuid, uuid, text, uuid, uuid, text, text, text, text, boolean, boolean, boolean, integer, date, date, integer) from public, anon;
revoke all on function public.create_clinical_assessment_draft(uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, text, text) from public, anon;
revoke all on function public.assessment_response_value_is_valid(public.assessment_definition_items, jsonb) from public, anon;
revoke all on function public.save_clinical_assessment_response(uuid, uuid, jsonb, integer, integer, text) from public, anon;
revoke all on function public.validate_clinical_assessment_ready_for_completion(uuid) from public, anon;
revoke all on function public.complete_clinical_assessment(uuid) from public, anon;
revoke all on function public.finalise_clinical_assessment(uuid) from public, anon;
revoke all on function public.sign_clinical_assessment(uuid, text) from public, anon;
revoke all on function public.amend_clinical_assessment(uuid, text, text, uuid, jsonb) from public, anon;

grant execute on function public.has_assessment_permission(uuid, text) to authenticated;
grant execute on function public.validate_assessment_stable_key(text) to authenticated;
grant execute on function public.validate_assessment_definition_version_ready_for_publish(uuid) to authenticated;
grant execute on function public.create_outcome_measure_definition_draft(uuid, text, text, text, text[], text, text) to authenticated;
grant execute on function public.publish_assessment_definition_version(uuid) to authenticated;
grant execute on function public.retire_assessment_definition_version(uuid, text) to authenticated;
grant execute on function public.create_assessment_definition_version_from(uuid, text) to authenticated;
grant execute on function public.upsert_assessment_assignment(uuid, uuid, text, uuid, uuid, text, text, text, text, boolean, boolean, boolean, integer, date, date, integer) to authenticated;
grant execute on function public.create_clinical_assessment_draft(uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, text, text) to authenticated;
grant execute on function public.save_clinical_assessment_response(uuid, uuid, jsonb, integer, integer, text) to authenticated;
grant execute on function public.validate_clinical_assessment_ready_for_completion(uuid) to authenticated;
grant execute on function public.complete_clinical_assessment(uuid) to authenticated;
grant execute on function public.finalise_clinical_assessment(uuid) to authenticated;
grant execute on function public.sign_clinical_assessment(uuid, text) to authenticated;
grant execute on function public.amend_clinical_assessment(uuid, text, text, uuid, jsonb) to authenticated;

comment on table public.assessment_definition_versions is
  'Versioned assessment and outcome-measure definitions. Published versions are immutable and historical results remain tied to the exact version used.';
comment on table public.clinical_assessment_item_responses is
  'Typed assessment item responses. Authoritative assessment response data lives here, not inside clinical note template responses.';
comment on table public.assessment_score_components is
  'First-class score component storage. Calculation execution is protected and evaluator implementation is deferred until the scoring runtime milestone.';
comment on table public.assessment_patient_link_publications is
  'Explicit patient-facing assessment publication metadata. Eligibility never equals publication.';

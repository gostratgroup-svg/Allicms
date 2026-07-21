-- AlliDesk Phase 6B: Clinical Documentation database foundation.
-- Scope: configurable template sections/fields/rules/calculations,
-- structured note responses, draft state, copy-forward provenance, and
-- protected template/note lifecycle extensions.
--
-- Architecture notes:
-- - Extends Phase 6A clinical templates and note versions.
-- - Does not create a competing clinical note system.
-- - Published/active template versions remain immutable.
-- - Finalised/signed structured responses remain immutable.
-- - Patient-visible eligibility is metadata only, not publication.
-- - Super Admin has no default tenant clinical content access.

create table public.clinical_template_sections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  clinical_note_template_version_id uuid not null references public.clinical_note_template_versions(id) on delete restrict,
  parent_section_id uuid references public.clinical_template_sections(id) on delete restrict,
  section_key text not null,
  section_label text not null,
  description text,
  help_text text,
  display_order integer not null default 1,
  section_type text not null default 'standard',
  is_repeating boolean not null default false,
  min_repeats integer,
  max_repeats integer,
  visibility_class text not null default 'clinical_internal',
  patient_visible_eligible boolean not null default false,
  practitioner_only boolean not null default false,
  is_internal_admin boolean not null default false,
  default_collapsed boolean not null default false,
  visibility_rules jsonb not null default '[]'::jsonb,
  required_rules jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinical_template_sections_key_not_blank_check check (btrim(section_key) <> ''),
  constraint clinical_template_sections_label_not_blank_check check (btrim(section_label) <> ''),
  constraint clinical_template_sections_order_check check (display_order > 0),
  constraint clinical_template_sections_type_check check (section_type in ('standard', 'group', 'repeating_group', 'heading', 'instructions', 'table')),
  constraint clinical_template_sections_visibility_class_check check (visibility_class in ('clinical_internal', 'restricted_clinical', 'patient_facing_candidate', 'administrative_internal', 'read_only_context')),
  constraint clinical_template_sections_repeats_check check (
    (min_repeats is null or min_repeats >= 0)
    and (max_repeats is null or max_repeats > 0)
    and (min_repeats is null or max_repeats is null or min_repeats <= max_repeats)
  ),
  constraint clinical_template_sections_visibility_rules_array_check check (jsonb_typeof(visibility_rules) = 'array'),
  constraint clinical_template_sections_required_rules_array_check check (jsonb_typeof(required_rules) = 'array'),
  constraint clinical_template_sections_metadata_object_check check (jsonb_typeof(metadata) = 'object'),
  constraint clinical_template_sections_patient_visible_safety_check check (
    patient_visible_eligible = false
    or (
      visibility_class = 'patient_facing_candidate'
      and practitioner_only = false
      and is_internal_admin = false
    )
  )
);

create table public.clinical_template_fields (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  clinical_note_template_version_id uuid not null references public.clinical_note_template_versions(id) on delete restrict,
  clinical_template_section_id uuid not null references public.clinical_template_sections(id) on delete restrict,
  parent_field_id uuid references public.clinical_template_fields(id) on delete restrict,
  field_key text not null,
  field_label text not null,
  field_type text not null,
  display_order integer not null default 1,
  help_text text,
  placeholder text,
  default_value jsonb,
  field_config jsonb not null default '{}'::jsonb,
  validation_config jsonb not null default '{}'::jsonb,
  visibility_rules jsonb not null default '[]'::jsonb,
  required_rules jsonb not null default '[]'::jsonb,
  allowed_units text[] not null default '{}'::text[],
  is_required boolean not null default false,
  is_required_on_finalise boolean not null default false,
  is_read_only boolean not null default false,
  is_calculated boolean not null default false,
  is_repeating boolean not null default false,
  visibility_class text not null default 'clinical_internal',
  patient_visible_eligible boolean not null default false,
  practitioner_only boolean not null default false,
  is_internal_admin boolean not null default false,
  stable_identity_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinical_template_fields_key_not_blank_check check (btrim(field_key) <> ''),
  constraint clinical_template_fields_label_not_blank_check check (btrim(field_label) <> ''),
  constraint clinical_template_fields_order_check check (display_order > 0),
  constraint clinical_template_fields_type_check check (field_type in (
    'short_text',
    'long_text',
    'rich_text',
    'number',
    'decimal',
    'date',
    'time',
    'datetime',
    'boolean',
    'single_choice',
    'multiple_choice',
    'checklist',
    'scale',
    'measurement',
    'laterality',
    'body_area',
    'table',
    'repeating_group',
    'heading',
    'instruction',
    'outcome_measure_reference',
    'diagnosis_reference',
    'treatment_goal_reference',
    'attachment_reference',
    'calculated',
    'read_only_display'
  )),
  constraint clinical_template_fields_visibility_class_check check (visibility_class in ('clinical_internal', 'restricted_clinical', 'patient_facing_candidate', 'administrative_internal', 'read_only_context')),
  constraint clinical_template_fields_config_object_check check (jsonb_typeof(field_config) = 'object'),
  constraint clinical_template_fields_validation_object_check check (jsonb_typeof(validation_config) = 'object'),
  constraint clinical_template_fields_visibility_rules_array_check check (jsonb_typeof(visibility_rules) = 'array'),
  constraint clinical_template_fields_required_rules_array_check check (jsonb_typeof(required_rules) = 'array'),
  constraint clinical_template_fields_metadata_object_check check (jsonb_typeof(metadata) = 'object'),
  constraint clinical_template_fields_calculated_state_check check (
    (field_type = 'calculated' and is_calculated = true)
    or field_type <> 'calculated'
  ),
  constraint clinical_template_fields_patient_visible_safety_check check (
    patient_visible_eligible = false
    or (
      visibility_class = 'patient_facing_candidate'
      and practitioner_only = false
      and is_internal_admin = false
    )
  )
);

create table public.clinical_template_field_options (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  clinical_note_template_version_id uuid not null references public.clinical_note_template_versions(id) on delete restrict,
  clinical_template_field_id uuid not null references public.clinical_template_fields(id) on delete restrict,
  option_key text not null,
  option_label text not null,
  option_value jsonb,
  display_order integer not null default 1,
  is_default boolean not null default false,
  patient_visible_eligible boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinical_template_field_options_key_not_blank_check check (btrim(option_key) <> ''),
  constraint clinical_template_field_options_label_not_blank_check check (btrim(option_label) <> ''),
  constraint clinical_template_field_options_order_check check (display_order > 0),
  constraint clinical_template_field_options_metadata_object_check check (jsonb_typeof(metadata) = 'object')
);

create table public.clinical_template_validation_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  clinical_note_template_version_id uuid not null references public.clinical_note_template_versions(id) on delete restrict,
  clinical_template_section_id uuid references public.clinical_template_sections(id) on delete restrict,
  clinical_template_field_id uuid references public.clinical_template_fields(id) on delete restrict,
  rule_key text not null,
  rule_type text not null,
  severity text not null default 'error',
  applies_on text not null default 'finalise',
  rule_config jsonb not null default '{}'::jsonb,
  message text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinical_template_validation_rules_key_not_blank_check check (btrim(rule_key) <> ''),
  constraint clinical_template_validation_rules_type_check check (rule_type in ('required', 'character_limit', 'numeric_range', 'allowed_units', 'allowed_options', 'date_restriction', 'conditional_required', 'cross_field', 'finalisation_requirement', 'template_specific')),
  constraint clinical_template_validation_rules_severity_check check (severity in ('info', 'warning', 'error', 'blocking')),
  constraint clinical_template_validation_rules_applies_on_check check (applies_on in ('draft_save', 'finalise', 'sign', 'patient_publish')),
  constraint clinical_template_validation_rules_config_object_check check (jsonb_typeof(rule_config) = 'object'),
  constraint clinical_template_validation_rules_metadata_object_check check (jsonb_typeof(metadata) = 'object'),
  constraint clinical_template_validation_rules_target_check check (clinical_template_section_id is not null or clinical_template_field_id is not null)
);

create table public.clinical_template_calculation_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  clinical_note_template_version_id uuid not null references public.clinical_note_template_versions(id) on delete restrict,
  target_clinical_template_field_id uuid not null references public.clinical_template_fields(id) on delete restrict,
  calculation_key text not null,
  calculation_type text not null,
  input_field_keys text[] not null default '{}'::text[],
  calculation_config jsonb not null default '{}'::jsonb,
  result_unit text,
  result_value_type text not null default 'decimal',
  is_required_for_finalise boolean not null default false,
  calculation_status text not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinical_template_calculation_rules_key_not_blank_check check (btrim(calculation_key) <> ''),
  constraint clinical_template_calculation_rules_type_check check (calculation_type in ('arithmetic', 'aggregate', 'score', 'classification', 'reference_range', 'outcome_total')),
  constraint clinical_template_calculation_rules_result_type_check check (result_value_type in ('integer', 'decimal', 'text', 'boolean', 'classification')),
  constraint clinical_template_calculation_rules_status_check check (calculation_status in ('draft', 'active', 'retired', 'archived')),
  constraint clinical_template_calculation_rules_config_object_check check (jsonb_typeof(calculation_config) = 'object'),
  constraint clinical_template_calculation_rules_metadata_object_check check (jsonb_typeof(metadata) = 'object')
);

create table public.clinical_template_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  clinical_note_template_id uuid not null references public.clinical_note_templates(id) on delete restrict,
  clinical_note_template_version_id uuid references public.clinical_note_template_versions(id) on delete restrict,
  assignment_scope text not null default 'tenant',
  discipline text,
  encounter_type text,
  session_type text,
  practice_location_id uuid references public.practice_locations(id) on delete cascade,
  therapist_profile_id uuid references public.therapist_profiles(id) on delete cascade,
  is_default boolean not null default false,
  is_active boolean not null default true,
  effective_from date,
  effective_until date,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinical_template_assignments_scope_check check (assignment_scope in ('tenant', 'discipline', 'encounter_type', 'session_type', 'location', 'practitioner')),
  constraint clinical_template_assignments_date_order_check check (effective_from is null or effective_until is null or effective_from <= effective_until),
  constraint clinical_template_assignments_metadata_object_check check (jsonb_typeof(metadata) = 'object')
);

create table public.clinical_note_structured_responses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  clinical_note_id uuid not null references public.clinical_notes(id) on delete cascade,
  clinical_note_version_id uuid not null references public.clinical_note_versions(id) on delete cascade,
  clinical_note_template_version_id uuid references public.clinical_note_template_versions(id) on delete restrict,
  clinical_template_section_id uuid references public.clinical_template_sections(id) on delete restrict,
  clinical_template_field_id uuid references public.clinical_template_fields(id) on delete restrict,
  section_key text not null,
  field_key text not null,
  repeat_group_key text,
  repeat_index integer not null default 0,
  response_value jsonb,
  response_text text,
  response_number numeric(18, 6),
  response_boolean boolean,
  response_date date,
  response_datetime timestamptz,
  response_unit text,
  display_value text,
  value_type text not null,
  is_calculated boolean not null default false,
  is_required_snapshot boolean not null default false,
  patient_visible_eligible_snapshot boolean not null default false,
  practitioner_only_snapshot boolean not null default false,
  restricted_snapshot boolean not null default false,
  validation_state text not null default 'unchecked',
  validation_errors jsonb not null default '[]'::jsonb,
  copy_forward_event_id uuid,
  copied_value_edited boolean not null default false,
  lock_version integer not null default 1,
  saved_at timestamptz not null default now(),
  saved_by_profile_id uuid references public.profiles(id) on delete set null,
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinical_note_structured_responses_section_key_not_blank_check check (btrim(section_key) <> ''),
  constraint clinical_note_structured_responses_field_key_not_blank_check check (btrim(field_key) <> ''),
  constraint clinical_note_structured_responses_repeat_index_check check (repeat_index >= 0),
  constraint clinical_note_structured_responses_value_type_check check (value_type in ('text', 'number', 'decimal', 'date', 'time', 'datetime', 'boolean', 'choice', 'multi_choice', 'json', 'reference', 'calculated', 'empty')),
  constraint clinical_note_structured_responses_validation_state_check check (validation_state in ('unchecked', 'valid', 'warning', 'invalid')),
  constraint clinical_note_structured_responses_validation_errors_array_check check (jsonb_typeof(validation_errors) = 'array'),
  constraint clinical_note_structured_responses_metadata_object_check check (jsonb_typeof(metadata) = 'object'),
  constraint clinical_note_structured_responses_lock_version_check check (lock_version > 0),
  constraint clinical_note_structured_responses_patient_visible_safety_check check (
    patient_visible_eligible_snapshot = false
    or (practitioner_only_snapshot = false and restricted_snapshot = false)
  )
);

create table public.clinical_note_draft_states (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  clinical_note_id uuid not null references public.clinical_notes(id) on delete cascade,
  clinical_note_version_id uuid not null references public.clinical_note_versions(id) on delete cascade,
  draft_status text not null default 'active',
  active_editor_profile_id uuid references public.profiles(id) on delete set null,
  last_saved_at timestamptz not null default now(),
  last_saved_by_profile_id uuid references public.profiles(id) on delete set null,
  last_client_saved_at timestamptz,
  last_idempotency_key text,
  conflict_detected boolean not null default false,
  conflict_reason text,
  lock_version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinical_note_draft_states_status_check check (draft_status in ('active', 'interrupted', 'restored', 'superseded', 'finalised', 'abandoned')),
  constraint clinical_note_draft_states_metadata_object_check check (jsonb_typeof(metadata) = 'object'),
  constraint clinical_note_draft_states_lock_version_check check (lock_version > 0)
);

create table public.clinical_note_copy_forward_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  target_clinical_note_id uuid not null references public.clinical_notes(id) on delete cascade,
  target_clinical_note_version_id uuid not null references public.clinical_note_versions(id) on delete cascade,
  target_response_id uuid references public.clinical_note_structured_responses(id) on delete set null,
  source_clinical_note_id uuid not null references public.clinical_notes(id) on delete restrict,
  source_clinical_note_version_id uuid not null references public.clinical_note_versions(id) on delete restrict,
  source_response_id uuid references public.clinical_note_structured_responses(id) on delete set null,
  source_section_key text,
  source_field_key text,
  target_section_key text,
  target_field_key text,
  copy_reason text,
  copied_by_profile_id uuid references public.profiles(id) on delete set null,
  copied_at timestamptz not null default now(),
  copied_value_snapshot jsonb,
  copied_value_edited boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint clinical_note_copy_forward_events_metadata_object_check check (jsonb_typeof(metadata) = 'object')
);

alter table public.clinical_note_structured_responses
  add constraint clinical_note_structured_responses_copy_forward_fk
  foreign key (copy_forward_event_id)
  references public.clinical_note_copy_forward_events(id)
  on delete set null
  deferrable initially deferred;

create or replace function public.validate_clinical_documentation_template_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  version_record public.clinical_note_template_versions%rowtype;
  template_record public.clinical_note_templates%rowtype;
  section_tenant_id uuid;
  field_tenant_id uuid;
  target_field_tenant_id uuid;
  parent_section_version_id uuid;
  parent_field_version_id uuid;
  location_tenant_id uuid;
  therapist_tenant_id uuid;
begin
  if to_jsonb(new) ? 'clinical_note_template_version_id'
    and (to_jsonb(new) ->> 'clinical_note_template_version_id') is not null then
    select *
    into version_record
    from public.clinical_note_template_versions
    where id = (to_jsonb(new) ->> 'clinical_note_template_version_id')::uuid
      and deleted_at is null;

    if version_record.id is null then
      raise exception 'Clinical template version not found';
    end if;

    if version_record.tenant_id is distinct from new.tenant_id then
      raise exception 'Clinical template child row must match template version tenant scope';
    end if;
  end if;

  if to_jsonb(new) ? 'clinical_note_template_id'
    and (to_jsonb(new) ->> 'clinical_note_template_id') is not null then
    select *
    into template_record
    from public.clinical_note_templates
    where id = (to_jsonb(new) ->> 'clinical_note_template_id')::uuid
      and deleted_at is null;

    if template_record.id is null then
      raise exception 'Clinical template not found';
    end if;

    if template_record.tenant_id is distinct from new.tenant_id then
      raise exception 'Clinical template assignment must match template tenant scope';
    end if;
  end if;

  if version_record.id is not null
    and template_record.id is not null
    and version_record.clinical_note_template_id <> template_record.id then
    raise exception 'Clinical template assignment version must belong to the assigned template';
  end if;

  if to_jsonb(new) ? 'parent_section_id'
    and (to_jsonb(new) ->> 'parent_section_id') is not null then
    select clinical_note_template_version_id
    into parent_section_version_id
    from public.clinical_template_sections
    where id = (to_jsonb(new) ->> 'parent_section_id')::uuid
      and deleted_at is null;

    if parent_section_version_id is distinct from (to_jsonb(new) ->> 'clinical_note_template_version_id')::uuid then
      raise exception 'Parent clinical template section must belong to the same template version';
    end if;
  end if;

  if to_jsonb(new) ? 'parent_field_id'
    and (to_jsonb(new) ->> 'parent_field_id') is not null then
    select clinical_note_template_version_id
    into parent_field_version_id
    from public.clinical_template_fields
    where id = (to_jsonb(new) ->> 'parent_field_id')::uuid
      and deleted_at is null;

    if parent_field_version_id is distinct from (to_jsonb(new) ->> 'clinical_note_template_version_id')::uuid then
      raise exception 'Parent clinical template field must belong to the same template version';
    end if;
  end if;

  if to_jsonb(new) ? 'clinical_template_section_id'
    and (to_jsonb(new) ->> 'clinical_template_section_id') is not null then
    select tenant_id
    into section_tenant_id
    from public.clinical_template_sections
    where id = (to_jsonb(new) ->> 'clinical_template_section_id')::uuid
      and clinical_note_template_version_id = (to_jsonb(new) ->> 'clinical_note_template_version_id')::uuid
      and deleted_at is null;

    if section_tenant_id is distinct from new.tenant_id then
      raise exception 'Clinical template section must belong to the same template version and tenant scope';
    end if;
  end if;

  if to_jsonb(new) ? 'clinical_template_field_id'
    and (to_jsonb(new) ->> 'clinical_template_field_id') is not null then
    select tenant_id
    into field_tenant_id
    from public.clinical_template_fields
    where id = (to_jsonb(new) ->> 'clinical_template_field_id')::uuid
      and clinical_note_template_version_id = (to_jsonb(new) ->> 'clinical_note_template_version_id')::uuid
      and deleted_at is null;

    if field_tenant_id is distinct from new.tenant_id then
      raise exception 'Clinical template field must belong to the same template version and tenant scope';
    end if;
  end if;

  if to_jsonb(new) ? 'target_clinical_template_field_id'
    and (to_jsonb(new) ->> 'target_clinical_template_field_id') is not null then
    select tenant_id
    into target_field_tenant_id
    from public.clinical_template_fields
    where id = (to_jsonb(new) ->> 'target_clinical_template_field_id')::uuid
      and clinical_note_template_version_id = (to_jsonb(new) ->> 'clinical_note_template_version_id')::uuid
      and deleted_at is null;

    if target_field_tenant_id is distinct from new.tenant_id then
      raise exception 'Clinical calculation target field must belong to the same template version and tenant scope';
    end if;
  end if;

  if to_jsonb(new) ? 'practice_location_id'
    and (to_jsonb(new) ->> 'practice_location_id') is not null then
    select tenant_id into location_tenant_id
    from public.practice_locations
    where id = (to_jsonb(new) ->> 'practice_location_id')::uuid
      and deleted_at is null;

    if location_tenant_id is null or location_tenant_id is distinct from new.tenant_id then
      raise exception 'Clinical template assignment location must belong to the same tenant';
    end if;
  end if;

  if to_jsonb(new) ? 'therapist_profile_id'
    and (to_jsonb(new) ->> 'therapist_profile_id') is not null then
    select tenant_id into therapist_tenant_id
    from public.therapist_profiles
    where id = (to_jsonb(new) ->> 'therapist_profile_id')::uuid
      and deleted_at is null;

    if therapist_tenant_id is null or therapist_tenant_id is distinct from new.tenant_id then
      raise exception 'Clinical template assignment therapist must belong to the same tenant';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_clinical_template_definition_immutability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_version_status text;
  target_template_version_id uuid;
begin
  if tg_op = 'DELETE' then
    target_template_version_id := (to_jsonb(old) ->> 'clinical_note_template_version_id')::uuid;
  else
    target_template_version_id := (to_jsonb(new) ->> 'clinical_note_template_version_id')::uuid;
  end if;

  select version_status
  into target_version_status
  from public.clinical_note_template_versions
  where id = target_template_version_id;

  if target_version_status in ('active', 'retired', 'archived') then
    raise exception 'Published clinical template definitions cannot be destructively edited';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function public.validate_clinical_structured_response_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  note_record public.clinical_notes%rowtype;
  version_record public.clinical_note_versions%rowtype;
  section_record public.clinical_template_sections%rowtype;
  field_record public.clinical_template_fields%rowtype;
begin
  select *
  into version_record
  from public.clinical_note_versions
  where id = new.clinical_note_version_id
    and deleted_at is null;

  if version_record.id is null then
    raise exception 'Clinical note version not found';
  end if;

  select *
  into note_record
  from public.clinical_notes
  where id = new.clinical_note_id
    and deleted_at is null;

  if note_record.id is null then
    raise exception 'Clinical note not found';
  end if;

  if version_record.clinical_note_id <> new.clinical_note_id then
    raise exception 'Structured response must belong to the same clinical note as the note version';
  end if;

  if note_record.tenant_id <> new.tenant_id or version_record.tenant_id <> new.tenant_id then
    raise exception 'Structured response must match clinical note tenant';
  end if;

  if note_record.patient_id <> new.patient_id then
    raise exception 'Structured response patient must match clinical note patient';
  end if;

  if version_record.clinical_note_template_version_id is distinct from new.clinical_note_template_version_id then
    raise exception 'Structured response must reference the same template version as the note version';
  end if;

  if new.clinical_template_section_id is not null then
    select *
    into section_record
    from public.clinical_template_sections
    where id = new.clinical_template_section_id
      and clinical_note_template_version_id = new.clinical_note_template_version_id
      and deleted_at is null;

    if section_record.id is null then
      raise exception 'Structured response section must belong to the same template version';
    end if;

    if section_record.section_key <> new.section_key then
      raise exception 'Structured response section key must match template section key';
    end if;
  end if;

  if new.clinical_template_field_id is not null then
    select *
    into field_record
    from public.clinical_template_fields
    where id = new.clinical_template_field_id
      and clinical_note_template_version_id = new.clinical_note_template_version_id
      and deleted_at is null;

    if field_record.id is null then
      raise exception 'Structured response field must belong to the same template version';
    end if;

    if field_record.field_key <> new.field_key then
      raise exception 'Structured response field key must match template field key';
    end if;

    if field_record.clinical_template_section_id <> new.clinical_template_section_id then
      raise exception 'Structured response field must belong to the referenced section';
    end if;

    new.is_required_snapshot := field_record.is_required or field_record.is_required_on_finalise;
    new.patient_visible_eligible_snapshot := field_record.patient_visible_eligible;
    new.practitioner_only_snapshot := field_record.practitioner_only;
    new.restricted_snapshot := field_record.visibility_class = 'restricted_clinical';
  end if;

  if new.patient_visible_eligible_snapshot is true
    and (new.practitioner_only_snapshot is true or new.restricted_snapshot is true) then
    raise exception 'Restricted or practitioner-only structured responses cannot be patient-visible eligible';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_clinical_structured_response_immutability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  version_status text;
begin
  if tg_op = 'DELETE' then
    select cnv.version_status
    into version_status
    from public.clinical_note_versions cnv
    where cnv.id = old.clinical_note_version_id;

    if version_status <> 'draft' then
      raise exception 'Finalised clinical structured responses cannot be deleted';
    end if;

    return old;
  end if;

  select cnv.version_status
  into version_status
  from public.clinical_note_versions cnv
  where cnv.id = old.clinical_note_version_id;

  if version_status <> 'draft' then
    if new.response_value is distinct from old.response_value
      or new.response_text is distinct from old.response_text
      or new.response_number is distinct from old.response_number
      or new.response_boolean is distinct from old.response_boolean
      or new.response_date is distinct from old.response_date
      or new.response_datetime is distinct from old.response_datetime
      or new.response_unit is distinct from old.response_unit
      or new.display_value is distinct from old.display_value
      or new.value_type is distinct from old.value_type
      or new.deleted_at is distinct from old.deleted_at
      or new.clinical_note_version_id is distinct from old.clinical_note_version_id
      or new.clinical_template_field_id is distinct from old.clinical_template_field_id
      or new.field_key is distinct from old.field_key then
      raise exception 'Finalised clinical structured responses cannot be destructively edited';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.increment_clinical_response_lock_version()
returns trigger
language plpgsql
as $$
begin
  if new.lock_version = old.lock_version then
    new.lock_version = old.lock_version + 1;
  end if;
  new.saved_at = now();
  new.saved_by_profile_id = auth.uid();
  return new;
end;
$$;

create or replace function public.validate_clinical_note_draft_state_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  note_record public.clinical_notes%rowtype;
  version_record public.clinical_note_versions%rowtype;
begin
  select *
  into version_record
  from public.clinical_note_versions
  where id = new.clinical_note_version_id
    and deleted_at is null;

  if version_record.id is null then
    raise exception 'Clinical note version not found';
  end if;

  select *
  into note_record
  from public.clinical_notes
  where id = new.clinical_note_id
    and deleted_at is null;

  if note_record.id is null then
    raise exception 'Clinical note not found';
  end if;

  if version_record.clinical_note_id <> new.clinical_note_id then
    raise exception 'Draft state must belong to the same clinical note as the note version';
  end if;

  if note_record.tenant_id <> new.tenant_id or version_record.tenant_id <> new.tenant_id then
    raise exception 'Draft state must match clinical note tenant';
  end if;

  if note_record.patient_id <> new.patient_id then
    raise exception 'Draft state patient must match clinical note patient';
  end if;

  return new;
end;
$$;

create or replace function public.validate_clinical_copy_forward_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  source_note public.clinical_notes%rowtype;
  source_version public.clinical_note_versions%rowtype;
  target_note public.clinical_notes%rowtype;
  target_version public.clinical_note_versions%rowtype;
begin
  select * into source_note from public.clinical_notes where id = new.source_clinical_note_id and deleted_at is null;
  select * into source_version from public.clinical_note_versions where id = new.source_clinical_note_version_id and deleted_at is null;
  select * into target_note from public.clinical_notes where id = new.target_clinical_note_id and deleted_at is null;
  select * into target_version from public.clinical_note_versions where id = new.target_clinical_note_version_id and deleted_at is null;

  if source_note.id is null or source_version.id is null or target_note.id is null or target_version.id is null then
    raise exception 'Copy-forward source and target records must exist';
  end if;

  if source_version.clinical_note_id <> source_note.id or target_version.clinical_note_id <> target_note.id then
    raise exception 'Copy-forward note version references must match their notes';
  end if;

  if source_note.tenant_id <> new.tenant_id
    or source_version.tenant_id <> new.tenant_id
    or target_note.tenant_id <> new.tenant_id
    or target_version.tenant_id <> new.tenant_id then
    raise exception 'Copy-forward cannot cross tenant boundaries';
  end if;

  if target_note.patient_id <> new.patient_id then
    raise exception 'Copy-forward patient must match target note patient';
  end if;

  if source_note.patient_id <> target_note.patient_id then
    raise exception 'Cross-patient copy-forward is not enabled';
  end if;

  if target_version.version_status <> 'draft' then
    raise exception 'Copy-forward target must be a draft note version';
  end if;

  return new;
end;
$$;

create trigger clinical_template_sections_set_updated_at before update on public.clinical_template_sections for each row execute function public.set_updated_at();
create trigger clinical_template_fields_set_updated_at before update on public.clinical_template_fields for each row execute function public.set_updated_at();
create trigger clinical_template_field_options_set_updated_at before update on public.clinical_template_field_options for each row execute function public.set_updated_at();
create trigger clinical_template_validation_rules_set_updated_at before update on public.clinical_template_validation_rules for each row execute function public.set_updated_at();
create trigger clinical_template_calculation_rules_set_updated_at before update on public.clinical_template_calculation_rules for each row execute function public.set_updated_at();
create trigger clinical_template_assignments_set_updated_at before update on public.clinical_template_assignments for each row execute function public.set_updated_at();
create trigger clinical_note_structured_responses_set_updated_at before update on public.clinical_note_structured_responses for each row execute function public.set_updated_at();
create trigger clinical_note_draft_states_set_updated_at before update on public.clinical_note_draft_states for each row execute function public.set_updated_at();

create trigger clinical_note_structured_responses_increment_lock_version before update on public.clinical_note_structured_responses for each row execute function public.increment_clinical_response_lock_version();
create trigger clinical_note_draft_states_increment_lock_version before update on public.clinical_note_draft_states for each row execute function public.increment_clinical_lock_version();

create trigger clinical_template_sections_validate_scope before insert or update of tenant_id, clinical_note_template_version_id, parent_section_id on public.clinical_template_sections for each row execute function public.validate_clinical_documentation_template_scope();
create trigger clinical_template_fields_validate_scope before insert or update of tenant_id, clinical_note_template_version_id, clinical_template_section_id, parent_field_id on public.clinical_template_fields for each row execute function public.validate_clinical_documentation_template_scope();
create trigger clinical_template_field_options_validate_scope before insert or update of tenant_id, clinical_note_template_version_id, clinical_template_field_id on public.clinical_template_field_options for each row execute function public.validate_clinical_documentation_template_scope();
create trigger clinical_template_validation_rules_validate_scope before insert or update of tenant_id, clinical_note_template_version_id, clinical_template_section_id, clinical_template_field_id on public.clinical_template_validation_rules for each row execute function public.validate_clinical_documentation_template_scope();
create trigger clinical_template_calculation_rules_validate_scope before insert or update of tenant_id, clinical_note_template_version_id, target_clinical_template_field_id on public.clinical_template_calculation_rules for each row execute function public.validate_clinical_documentation_template_scope();
create trigger clinical_template_assignments_validate_scope before insert or update of tenant_id, clinical_note_template_id, clinical_note_template_version_id, practice_location_id, therapist_profile_id on public.clinical_template_assignments for each row execute function public.validate_clinical_documentation_template_scope();

create trigger clinical_template_sections_enforce_immutability before update or delete on public.clinical_template_sections for each row execute function public.enforce_clinical_template_definition_immutability();
create trigger clinical_template_fields_enforce_immutability before update or delete on public.clinical_template_fields for each row execute function public.enforce_clinical_template_definition_immutability();
create trigger clinical_template_field_options_enforce_immutability before update or delete on public.clinical_template_field_options for each row execute function public.enforce_clinical_template_definition_immutability();
create trigger clinical_template_validation_rules_enforce_immutability before update or delete on public.clinical_template_validation_rules for each row execute function public.enforce_clinical_template_definition_immutability();
create trigger clinical_template_calculation_rules_enforce_immutability before update or delete on public.clinical_template_calculation_rules for each row execute function public.enforce_clinical_template_definition_immutability();
create trigger clinical_template_assignments_enforce_immutability before update or delete on public.clinical_template_assignments for each row execute function public.enforce_clinical_template_definition_immutability();

create trigger clinical_note_structured_responses_validate_integrity before insert or update of tenant_id, patient_id, clinical_note_id, clinical_note_version_id, clinical_note_template_version_id, clinical_template_section_id, clinical_template_field_id, section_key, field_key, patient_visible_eligible_snapshot, practitioner_only_snapshot, restricted_snapshot on public.clinical_note_structured_responses for each row execute function public.validate_clinical_structured_response_integrity();
create trigger clinical_note_structured_responses_enforce_immutability before update or delete on public.clinical_note_structured_responses for each row execute function public.enforce_clinical_structured_response_immutability();
create trigger clinical_note_draft_states_validate_integrity before insert or update of tenant_id, patient_id, clinical_note_id, clinical_note_version_id on public.clinical_note_draft_states for each row execute function public.validate_clinical_note_draft_state_integrity();
create trigger clinical_note_copy_forward_events_validate_integrity before insert on public.clinical_note_copy_forward_events for each row execute function public.validate_clinical_copy_forward_integrity();
create trigger clinical_note_copy_forward_events_append_only before update or delete on public.clinical_note_copy_forward_events for each row execute function public.enforce_clinical_append_only();

create index clinical_template_sections_version_order_idx on public.clinical_template_sections (clinical_note_template_version_id, display_order) where deleted_at is null;
create unique index clinical_template_sections_version_key_idx on public.clinical_template_sections (clinical_note_template_version_id, lower(section_key)) where deleted_at is null;
create index clinical_template_sections_tenant_idx on public.clinical_template_sections (tenant_id) where deleted_at is null;
create index clinical_template_sections_patient_visible_idx on public.clinical_template_sections (clinical_note_template_version_id, patient_visible_eligible) where deleted_at is null;

create index clinical_template_fields_version_order_idx on public.clinical_template_fields (clinical_note_template_version_id, clinical_template_section_id, display_order) where deleted_at is null;
create unique index clinical_template_fields_version_key_idx on public.clinical_template_fields (clinical_note_template_version_id, lower(field_key)) where deleted_at is null;
create index clinical_template_fields_tenant_idx on public.clinical_template_fields (tenant_id) where deleted_at is null;
create index clinical_template_fields_type_idx on public.clinical_template_fields (clinical_note_template_version_id, field_type) where deleted_at is null;
create index clinical_template_fields_patient_visible_idx on public.clinical_template_fields (clinical_note_template_version_id, patient_visible_eligible) where deleted_at is null;

create index clinical_template_field_options_field_order_idx on public.clinical_template_field_options (clinical_template_field_id, display_order) where deleted_at is null;
create unique index clinical_template_field_options_field_key_idx on public.clinical_template_field_options (clinical_template_field_id, lower(option_key)) where deleted_at is null;

create index clinical_template_validation_rules_version_idx on public.clinical_template_validation_rules (clinical_note_template_version_id, applies_on, severity) where deleted_at is null and is_active = true;
create index clinical_template_validation_rules_field_idx on public.clinical_template_validation_rules (clinical_template_field_id) where clinical_template_field_id is not null and deleted_at is null;
create unique index clinical_template_validation_rules_key_idx on public.clinical_template_validation_rules (clinical_note_template_version_id, lower(rule_key)) where deleted_at is null;

create index clinical_template_calculation_rules_version_idx on public.clinical_template_calculation_rules (clinical_note_template_version_id, calculation_status) where deleted_at is null;
create unique index clinical_template_calculation_rules_key_idx on public.clinical_template_calculation_rules (clinical_note_template_version_id, lower(calculation_key)) where deleted_at is null;
create index clinical_template_calculation_rules_target_idx on public.clinical_template_calculation_rules (target_clinical_template_field_id) where deleted_at is null;

create index clinical_template_assignments_tenant_scope_idx on public.clinical_template_assignments (tenant_id, assignment_scope, is_active) where deleted_at is null;
create index clinical_template_assignments_template_idx on public.clinical_template_assignments (clinical_note_template_id) where deleted_at is null;
create index clinical_template_assignments_version_idx on public.clinical_template_assignments (clinical_note_template_version_id) where clinical_note_template_version_id is not null and deleted_at is null;

create index clinical_note_structured_responses_version_idx on public.clinical_note_structured_responses (clinical_note_version_id, section_key, field_key, repeat_index) where deleted_at is null;
create unique index clinical_note_structured_responses_unique_field_idx on public.clinical_note_structured_responses (clinical_note_version_id, lower(field_key), coalesce(repeat_group_key, ''), repeat_index) where deleted_at is null;
create index clinical_note_structured_responses_patient_idx on public.clinical_note_structured_responses (tenant_id, patient_id, created_at desc) where deleted_at is null;
create index clinical_note_structured_responses_template_field_idx on public.clinical_note_structured_responses (clinical_template_field_id) where clinical_template_field_id is not null and deleted_at is null;
create index clinical_note_structured_responses_patient_visible_idx on public.clinical_note_structured_responses (clinical_note_version_id, patient_visible_eligible_snapshot) where deleted_at is null;

create unique index clinical_note_draft_states_one_per_version_idx on public.clinical_note_draft_states (clinical_note_version_id) where deleted_at is null;
create index clinical_note_draft_states_active_editor_idx on public.clinical_note_draft_states (tenant_id, active_editor_profile_id, last_saved_at desc) where active_editor_profile_id is not null and deleted_at is null;

create index clinical_note_copy_forward_events_target_idx on public.clinical_note_copy_forward_events (target_clinical_note_version_id, copied_at desc) where deleted_at is null;
create index clinical_note_copy_forward_events_source_idx on public.clinical_note_copy_forward_events (source_clinical_note_version_id) where deleted_at is null;
create index clinical_note_copy_forward_events_patient_idx on public.clinical_note_copy_forward_events (tenant_id, patient_id, copied_at desc) where deleted_at is null;

alter table public.clinical_template_sections enable row level security;
alter table public.clinical_template_fields enable row level security;
alter table public.clinical_template_field_options enable row level security;
alter table public.clinical_template_validation_rules enable row level security;
alter table public.clinical_template_calculation_rules enable row level security;
alter table public.clinical_template_assignments enable row level security;
alter table public.clinical_note_structured_responses enable row level security;
alter table public.clinical_note_draft_states enable row level security;
alter table public.clinical_note_copy_forward_events enable row level security;

do $$
declare
  documentation_table text;
begin
  foreach documentation_table in array array[
    'clinical_template_sections',
    'clinical_template_fields',
    'clinical_template_field_options',
    'clinical_template_validation_rules',
    'clinical_template_calculation_rules',
    'clinical_template_assignments'
  ] loop
    execute format('create policy %I on public.%I for select to authenticated using (deleted_at is null and (tenant_id is null or public.has_tenant_role(tenant_id, array[''admin'', ''therapist''])))', 'clinical users can read ' || documentation_table, documentation_table);
    execute format('create policy %I on public.%I for insert to authenticated with check (tenant_id is not null and public.has_tenant_role(tenant_id, array[''admin'', ''therapist'']))', 'clinical users can create tenant ' || documentation_table, documentation_table);
    execute format('create policy %I on public.%I for update to authenticated using (deleted_at is null and tenant_id is not null and public.has_tenant_role(tenant_id, array[''admin'', ''therapist''])) with check (tenant_id is not null and public.has_tenant_role(tenant_id, array[''admin'', ''therapist'']))', 'clinical users can update tenant ' || documentation_table, documentation_table);
  end loop;
end $$;

do $$
declare
  documentation_table text;
begin
  foreach documentation_table in array array[
    'clinical_template_sections',
    'clinical_template_fields',
    'clinical_template_field_options',
    'clinical_template_validation_rules',
    'clinical_template_calculation_rules',
    'clinical_template_assignments'
  ] loop
    execute format('create policy %I on public.%I for insert to authenticated with check (tenant_id is null and public.is_super_admin())', 'super admins can create system ' || documentation_table, documentation_table);
    execute format('create policy %I on public.%I for update to authenticated using (deleted_at is null and tenant_id is null and public.is_super_admin()) with check (tenant_id is null and public.is_super_admin())', 'super admins can update system ' || documentation_table, documentation_table);
  end loop;
end $$;

create policy "tenant clinical users can read structured responses"
on public.clinical_note_structured_responses
for select
to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin', 'therapist']));

create policy "tenant clinical users can read draft states"
on public.clinical_note_draft_states
for select
to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin', 'therapist']));

create policy "tenant clinical users can read copy-forward events"
on public.clinical_note_copy_forward_events
for select
to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin', 'therapist']));

revoke all on table public.clinical_template_sections from anon, authenticated;
revoke all on table public.clinical_template_fields from anon, authenticated;
revoke all on table public.clinical_template_field_options from anon, authenticated;
revoke all on table public.clinical_template_validation_rules from anon, authenticated;
revoke all on table public.clinical_template_calculation_rules from anon, authenticated;
revoke all on table public.clinical_template_assignments from anon, authenticated;
revoke all on table public.clinical_note_structured_responses from anon, authenticated;
revoke all on table public.clinical_note_draft_states from anon, authenticated;
revoke all on table public.clinical_note_copy_forward_events from anon, authenticated;

grant select, insert, update on table public.clinical_template_sections to authenticated;
grant select, insert, update on table public.clinical_template_fields to authenticated;
grant select, insert, update on table public.clinical_template_field_options to authenticated;
grant select, insert, update on table public.clinical_template_validation_rules to authenticated;
grant select, insert, update on table public.clinical_template_calculation_rules to authenticated;
grant select, insert, update on table public.clinical_template_assignments to authenticated;
grant select on table public.clinical_note_structured_responses to authenticated;
grant select on table public.clinical_note_draft_states to authenticated;
grant select on table public.clinical_note_copy_forward_events to authenticated;

create or replace function public.validate_clinical_template_version_ready_for_publish(target_template_version_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  version_record public.clinical_note_template_versions%rowtype;
  section_count integer;
  field_count integer;
  invalid_required_count integer;
begin
  select *
  into version_record
  from public.clinical_note_template_versions
  where id = target_template_version_id
    and deleted_at is null;

  if version_record.id is null then
    return jsonb_build_object('valid', false, 'errors', jsonb_build_array('Template version not found'));
  end if;

  if version_record.tenant_id is not null
    and not public.has_tenant_role(version_record.tenant_id, array['admin', 'therapist']) then
    return jsonb_build_object('valid', false, 'errors', jsonb_build_array('Not allowed to validate this template version'));
  end if;

  select count(*) into section_count
  from public.clinical_template_sections
  where clinical_note_template_version_id = target_template_version_id
    and deleted_at is null;

  select count(*) into field_count
  from public.clinical_template_fields
  where clinical_note_template_version_id = target_template_version_id
    and deleted_at is null;

  select count(*) into invalid_required_count
  from public.clinical_template_fields
  where clinical_note_template_version_id = target_template_version_id
    and deleted_at is null
    and (is_required = true or is_required_on_finalise = true)
    and field_type in ('heading', 'instruction', 'read_only_display');

  return jsonb_build_object(
    'valid',
    section_count > 0 and field_count > 0 and invalid_required_count = 0,
    'section_count',
    section_count,
    'field_count',
    field_count,
    'errors',
    (
      case
        when section_count = 0 then jsonb_build_array('At least one template section is required')
        else '[]'::jsonb
      end
      ||
      case
        when field_count = 0 then jsonb_build_array('At least one template field is required')
        else '[]'::jsonb
      end
      ||
      case
        when invalid_required_count > 0 then jsonb_build_array('Instructional/read-only fields cannot be required clinical input fields')
        else '[]'::jsonb
      end
    )
  );
end;
$$;

create or replace function public.publish_clinical_template_version(target_template_version_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  version_record public.clinical_note_template_versions%rowtype;
  template_record public.clinical_note_templates%rowtype;
  validation_result jsonb;
begin
  select *
  into version_record
  from public.clinical_note_template_versions
  where id = target_template_version_id
    and deleted_at is null
  for update;

  if version_record.id is null then
    raise exception 'Clinical template version not found';
  end if;

  select *
  into template_record
  from public.clinical_note_templates
  where id = version_record.clinical_note_template_id
    and deleted_at is null
  for update;

  if template_record.id is null then
    raise exception 'Clinical template not found';
  end if;

  if version_record.tenant_id is null then
    if not public.is_super_admin() then
      raise exception 'Only Super Admin can publish system clinical templates';
    end if;
  elsif not public.has_tenant_role(version_record.tenant_id, array['admin', 'therapist']) then
    raise exception 'Not allowed to publish clinical templates for this tenant';
  end if;

  if version_record.version_status <> 'draft' then
    raise exception 'Only draft clinical template versions can be published';
  end if;

  validation_result := public.validate_clinical_template_version_ready_for_publish(target_template_version_id);
  if coalesce((validation_result ->> 'valid')::boolean, false) is not true then
    raise exception 'Clinical template version is not ready to publish: %', validation_result -> 'errors';
  end if;

  update public.clinical_note_template_versions
  set version_status = 'active',
      published_at = now(),
      published_by_profile_id = auth.uid(),
      updated_by_profile_id = auth.uid()
  where id = target_template_version_id;

  update public.clinical_note_template_versions
  set version_status = 'retired',
      retired_at = coalesce(retired_at, now()),
      updated_by_profile_id = auth.uid()
  where clinical_note_template_id = template_record.id
    and id <> target_template_version_id
    and version_status = 'active'
    and deleted_at is null;

  update public.clinical_note_templates
  set template_status = 'active',
      active_version_id = target_template_version_id,
      updated_by_profile_id = auth.uid()
  where id = template_record.id;

  insert into public.audit_events (tenant_id, actor_profile_id, action, entity_table, entity_id, metadata)
  values (
    version_record.tenant_id,
    auth.uid(),
    'clinical_template_version_published',
    'clinical_note_template_versions',
    target_template_version_id,
    jsonb_build_object('clinical_note_template_id', template_record.id, 'version_number', version_record.version_number)
  );

  if version_record.tenant_id is not null then
    insert into public.clinical_workflow_events (tenant_id, event_type, event_key, metadata)
    values (
      version_record.tenant_id,
      'clinical_template_published',
      'clinical_template_published:' || target_template_version_id::text,
      jsonb_build_object('clinical_note_template_id', template_record.id, 'clinical_note_template_version_id', target_template_version_id)
    )
    on conflict (tenant_id, event_key) where event_key is not null and deleted_at is null do nothing;
  end if;

  return target_template_version_id;
end;
$$;

create or replace function public.retire_clinical_template_version(
  target_template_version_id uuid,
  retirement_reason_input text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  version_record public.clinical_note_template_versions%rowtype;
  template_record public.clinical_note_templates%rowtype;
begin
  select *
  into version_record
  from public.clinical_note_template_versions
  where id = target_template_version_id
    and deleted_at is null
  for update;

  if version_record.id is null then
    raise exception 'Clinical template version not found';
  end if;

  select *
  into template_record
  from public.clinical_note_templates
  where id = version_record.clinical_note_template_id
    and deleted_at is null
  for update;

  if version_record.tenant_id is null then
    if not public.is_super_admin() then
      raise exception 'Only Super Admin can retire system clinical templates';
    end if;
  elsif not public.has_tenant_role(version_record.tenant_id, array['admin', 'therapist']) then
    raise exception 'Not allowed to retire clinical templates for this tenant';
  end if;

  if version_record.version_status not in ('active', 'draft') then
    raise exception 'Only draft or active clinical template versions can be retired';
  end if;

  update public.clinical_note_template_versions
  set version_status = 'retired',
      retired_at = now(),
      updated_by_profile_id = auth.uid(),
      metadata = metadata || jsonb_build_object('retirement_reason', retirement_reason_input)
  where id = target_template_version_id;

  if template_record.active_version_id = target_template_version_id then
    update public.clinical_note_templates
    set template_status = 'retired',
        active_version_id = null,
        updated_by_profile_id = auth.uid()
    where id = template_record.id;
  end if;

  insert into public.audit_events (tenant_id, actor_profile_id, action, entity_table, entity_id, metadata)
  values (
    version_record.tenant_id,
    auth.uid(),
    'clinical_template_version_retired',
    'clinical_note_template_versions',
    target_template_version_id,
    jsonb_build_object('clinical_note_template_id', template_record.id, 'reason', retirement_reason_input)
  );

  if version_record.tenant_id is not null then
    insert into public.clinical_workflow_events (tenant_id, event_type, event_key, metadata)
    values (
      version_record.tenant_id,
      'clinical_template_retired',
      'clinical_template_retired:' || target_template_version_id::text,
      jsonb_build_object('clinical_note_template_id', template_record.id, 'clinical_note_template_version_id', target_template_version_id)
    )
    on conflict (tenant_id, event_key) where event_key is not null and deleted_at is null do nothing;
  end if;

  return target_template_version_id;
end;
$$;

create or replace function public.create_clinical_template_version_from(
  source_template_version_id uuid,
  change_reason_input text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  source_version public.clinical_note_template_versions%rowtype;
  template_record public.clinical_note_templates%rowtype;
  new_version_id uuid;
  next_version_number integer;
begin
  select *
  into source_version
  from public.clinical_note_template_versions
  where id = source_template_version_id
    and deleted_at is null;

  if source_version.id is null then
    raise exception 'Source clinical template version not found';
  end if;

  select *
  into template_record
  from public.clinical_note_templates
  where id = source_version.clinical_note_template_id
    and deleted_at is null
  for update;

  if source_version.tenant_id is null then
    if not public.is_super_admin() then
      raise exception 'Only Super Admin can version system clinical templates';
    end if;
  elsif not public.has_tenant_role(source_version.tenant_id, array['admin', 'therapist']) then
    raise exception 'Not allowed to version clinical templates for this tenant';
  end if;

  select coalesce(max(version_number), 0) + 1
  into next_version_number
  from public.clinical_note_template_versions
  where clinical_note_template_id = template_record.id
    and deleted_at is null;

  insert into public.clinical_note_template_versions (
    tenant_id,
    clinical_note_template_id,
    version_number,
    version_status,
    template_schema,
    default_structured_content,
    default_free_text,
    required_fields,
    visibility_default,
    metadata,
    created_by_profile_id
  )
  values (
    source_version.tenant_id,
    template_record.id,
    next_version_number,
    'draft',
    source_version.template_schema,
    source_version.default_structured_content,
    source_version.default_free_text,
    source_version.required_fields,
    source_version.visibility_default,
    source_version.metadata || jsonb_build_object('source_template_version_id', source_version.id, 'change_reason', change_reason_input),
    auth.uid()
  )
  returning id into new_version_id;

  insert into public.clinical_template_sections (
    tenant_id,
    clinical_note_template_version_id,
    section_key,
    section_label,
    description,
    help_text,
    display_order,
    section_type,
    is_repeating,
    min_repeats,
    max_repeats,
    visibility_class,
    patient_visible_eligible,
    practitioner_only,
    is_internal_admin,
    default_collapsed,
    visibility_rules,
    required_rules,
    metadata,
    created_by_profile_id
  )
  select
    tenant_id,
    new_version_id,
    section_key,
    section_label,
    description,
    help_text,
    display_order,
    section_type,
    is_repeating,
    min_repeats,
    max_repeats,
    visibility_class,
    patient_visible_eligible,
    practitioner_only,
    is_internal_admin,
    default_collapsed,
    visibility_rules,
    required_rules,
    metadata || jsonb_build_object('source_section_id', id),
    auth.uid()
  from public.clinical_template_sections
  where clinical_note_template_version_id = source_version.id
    and deleted_at is null;

  update public.clinical_template_sections new_section
  set parent_section_id = new_parent.id
  from public.clinical_template_sections source_section
  join public.clinical_template_sections source_parent
    on source_parent.id = source_section.parent_section_id
  join public.clinical_template_sections new_parent
    on new_parent.clinical_note_template_version_id = new_version_id
   and new_parent.metadata ->> 'source_section_id' = source_parent.id::text
   and new_parent.deleted_at is null
  where new_section.clinical_note_template_version_id = new_version_id
    and new_section.metadata ->> 'source_section_id' = source_section.id::text
    and source_section.deleted_at is null;

  insert into public.clinical_template_fields (
    tenant_id,
    clinical_note_template_version_id,
    clinical_template_section_id,
    field_key,
    field_label,
    field_type,
    display_order,
    help_text,
    placeholder,
    default_value,
    field_config,
    validation_config,
    visibility_rules,
    required_rules,
    allowed_units,
    is_required,
    is_required_on_finalise,
    is_read_only,
    is_calculated,
    is_repeating,
    visibility_class,
    patient_visible_eligible,
    practitioner_only,
    is_internal_admin,
    stable_identity_key,
    metadata,
    created_by_profile_id
  )
  select
    source_field.tenant_id,
    new_version_id,
    new_section.id,
    source_field.field_key,
    source_field.field_label,
    source_field.field_type,
    source_field.display_order,
    source_field.help_text,
    source_field.placeholder,
    source_field.default_value,
    source_field.field_config,
    source_field.validation_config,
    source_field.visibility_rules,
    source_field.required_rules,
    source_field.allowed_units,
    source_field.is_required,
    source_field.is_required_on_finalise,
    source_field.is_read_only,
    source_field.is_calculated,
    source_field.is_repeating,
    source_field.visibility_class,
    source_field.patient_visible_eligible,
    source_field.practitioner_only,
    source_field.is_internal_admin,
    source_field.stable_identity_key,
    source_field.metadata || jsonb_build_object('source_field_id', source_field.id),
    auth.uid()
  from public.clinical_template_fields source_field
  join public.clinical_template_sections source_section
    on source_section.id = source_field.clinical_template_section_id
  join public.clinical_template_sections new_section
    on new_section.clinical_note_template_version_id = new_version_id
   and new_section.metadata ->> 'source_section_id' = source_section.id::text
   and new_section.deleted_at is null
  where source_field.clinical_note_template_version_id = source_version.id
    and source_field.deleted_at is null;

  update public.clinical_template_fields new_field
  set parent_field_id = new_parent.id
  from public.clinical_template_fields source_field
  join public.clinical_template_fields source_parent
    on source_parent.id = source_field.parent_field_id
  join public.clinical_template_fields new_parent
    on new_parent.clinical_note_template_version_id = new_version_id
   and new_parent.metadata ->> 'source_field_id' = source_parent.id::text
   and new_parent.deleted_at is null
  where new_field.clinical_note_template_version_id = new_version_id
    and new_field.metadata ->> 'source_field_id' = source_field.id::text
    and source_field.deleted_at is null;

  insert into public.clinical_template_field_options (
    tenant_id,
    clinical_note_template_version_id,
    clinical_template_field_id,
    option_key,
    option_label,
    option_value,
    display_order,
    is_default,
    patient_visible_eligible,
    metadata
  )
  select
    source_option.tenant_id,
    new_version_id,
    new_field.id,
    source_option.option_key,
    source_option.option_label,
    source_option.option_value,
    source_option.display_order,
    source_option.is_default,
    source_option.patient_visible_eligible,
    source_option.metadata || jsonb_build_object('source_option_id', source_option.id)
  from public.clinical_template_field_options source_option
  join public.clinical_template_fields new_field
    on new_field.clinical_note_template_version_id = new_version_id
   and new_field.metadata ->> 'source_field_id' = source_option.clinical_template_field_id::text
   and new_field.deleted_at is null
  where source_option.clinical_note_template_version_id = source_version.id
    and source_option.deleted_at is null;

  insert into public.clinical_template_validation_rules (
    tenant_id,
    clinical_note_template_version_id,
    clinical_template_section_id,
    clinical_template_field_id,
    rule_key,
    rule_type,
    severity,
    applies_on,
    rule_config,
    message,
    is_active,
    metadata
  )
  select
    source_rule.tenant_id,
    new_version_id,
    new_section.id,
    new_field.id,
    source_rule.rule_key,
    source_rule.rule_type,
    source_rule.severity,
    source_rule.applies_on,
    source_rule.rule_config,
    source_rule.message,
    source_rule.is_active,
    source_rule.metadata || jsonb_build_object('source_validation_rule_id', source_rule.id)
  from public.clinical_template_validation_rules source_rule
  left join public.clinical_template_sections new_section
    on new_section.clinical_note_template_version_id = new_version_id
   and new_section.metadata ->> 'source_section_id' = source_rule.clinical_template_section_id::text
   and new_section.deleted_at is null
  left join public.clinical_template_fields new_field
    on new_field.clinical_note_template_version_id = new_version_id
   and new_field.metadata ->> 'source_field_id' = source_rule.clinical_template_field_id::text
   and new_field.deleted_at is null
  where source_rule.clinical_note_template_version_id = source_version.id
    and source_rule.deleted_at is null;

  insert into public.clinical_template_calculation_rules (
    tenant_id,
    clinical_note_template_version_id,
    target_clinical_template_field_id,
    calculation_key,
    calculation_type,
    input_field_keys,
    calculation_config,
    result_unit,
    result_value_type,
    is_required_for_finalise,
    calculation_status,
    metadata
  )
  select
    source_calculation.tenant_id,
    new_version_id,
    new_field.id,
    source_calculation.calculation_key,
    source_calculation.calculation_type,
    source_calculation.input_field_keys,
    source_calculation.calculation_config,
    source_calculation.result_unit,
    source_calculation.result_value_type,
    source_calculation.is_required_for_finalise,
    'draft',
    source_calculation.metadata || jsonb_build_object('source_calculation_rule_id', source_calculation.id)
  from public.clinical_template_calculation_rules source_calculation
  join public.clinical_template_fields new_field
    on new_field.clinical_note_template_version_id = new_version_id
   and new_field.metadata ->> 'source_field_id' = source_calculation.target_clinical_template_field_id::text
   and new_field.deleted_at is null
  where source_calculation.clinical_note_template_version_id = source_version.id
    and source_calculation.deleted_at is null;

  insert into public.audit_events (tenant_id, actor_profile_id, action, entity_table, entity_id, metadata)
  values (
    source_version.tenant_id,
    auth.uid(),
    'clinical_template_version_created_from_source',
    'clinical_note_template_versions',
    new_version_id,
    jsonb_build_object('clinical_note_template_id', template_record.id, 'source_template_version_id', source_version.id, 'version_number', next_version_number)
  );

  return new_version_id;
end;
$$;

create or replace function public.validate_clinical_note_version_ready_for_finalisation(target_note_version_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  version_record public.clinical_note_versions%rowtype;
  note_record public.clinical_notes%rowtype;
  required_missing_count integer := 0;
  invalid_response_count integer := 0;
  required_calculation_missing_count integer := 0;
  draft_conflict_count integer := 0;
begin
  select *
  into version_record
  from public.clinical_note_versions
  where id = target_note_version_id
    and deleted_at is null;

  if version_record.id is null then
    return jsonb_build_object('valid', false, 'errors', jsonb_build_array('Clinical note version not found'));
  end if;

  select *
  into note_record
  from public.clinical_notes
  where id = version_record.clinical_note_id
    and deleted_at is null;

  if note_record.id is null then
    return jsonb_build_object('valid', false, 'errors', jsonb_build_array('Clinical note not found'));
  end if;

  if not public.has_tenant_role(note_record.tenant_id, array['admin', 'therapist']) then
    return jsonb_build_object('valid', false, 'errors', jsonb_build_array('Not allowed to validate this clinical note'));
  end if;

  if version_record.version_status <> 'draft' then
    return jsonb_build_object('valid', false, 'errors', jsonb_build_array('Only draft note versions can be finalised'));
  end if;

  if version_record.clinical_note_template_version_id is not null then
    select count(*)
    into required_missing_count
    from public.clinical_template_fields f
    where f.clinical_note_template_version_id = version_record.clinical_note_template_version_id
      and f.deleted_at is null
      and (f.is_required = true or f.is_required_on_finalise = true)
      and f.field_type not in ('heading', 'instruction', 'read_only_display')
      and not exists (
        select 1
        from public.clinical_note_structured_responses r
        where r.clinical_note_version_id = version_record.id
          and r.clinical_template_field_id = f.id
          and r.deleted_at is null
          and (
            r.response_value is not null
            or nullif(btrim(coalesce(r.response_text, '')), '') is not null
            or r.response_number is not null
            or r.response_boolean is not null
            or r.response_date is not null
            or r.response_datetime is not null
          )
      );

    select count(*)
    into invalid_response_count
    from public.clinical_note_structured_responses r
    where r.clinical_note_version_id = version_record.id
      and r.deleted_at is null
      and r.validation_state = 'invalid';

    select count(*)
    into required_calculation_missing_count
    from public.clinical_template_calculation_rules c
    where c.clinical_note_template_version_id = version_record.clinical_note_template_version_id
      and c.deleted_at is null
      and c.is_required_for_finalise = true
      and c.calculation_status in ('draft', 'active')
      and not exists (
        select 1
        from public.clinical_note_structured_responses r
        where r.clinical_note_version_id = version_record.id
          and r.clinical_template_field_id = c.target_clinical_template_field_id
          and r.deleted_at is null
          and r.is_calculated = true
          and r.validation_state <> 'invalid'
      );
  end if;

  select count(*)
  into draft_conflict_count
  from public.clinical_note_draft_states ds
  where ds.clinical_note_version_id = version_record.id
    and ds.deleted_at is null
    and ds.conflict_detected = true;

  return jsonb_build_object(
    'valid',
    required_missing_count = 0
      and invalid_response_count = 0
      and required_calculation_missing_count = 0
      and draft_conflict_count = 0,
    'required_missing_count',
    required_missing_count,
    'invalid_response_count',
    invalid_response_count,
    'required_calculation_missing_count',
    required_calculation_missing_count,
    'draft_conflict_count',
    draft_conflict_count,
    'errors',
    (
      case when required_missing_count > 0 then jsonb_build_array('Required structured fields are incomplete') else '[]'::jsonb end
      ||
      case when invalid_response_count > 0 then jsonb_build_array('Structured responses contain validation errors') else '[]'::jsonb end
      ||
      case when required_calculation_missing_count > 0 then jsonb_build_array('Required calculated values are missing') else '[]'::jsonb end
      ||
      case when draft_conflict_count > 0 then jsonb_build_array('Draft has a stale edit conflict') else '[]'::jsonb end
    )
  );
end;
$$;

create or replace function public.save_clinical_note_structured_response(
  target_note_version_id uuid,
  target_template_field_id uuid,
  response_payload jsonb,
  expected_lock_version integer default null,
  idempotency_key_input text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  version_record public.clinical_note_versions%rowtype;
  note_record public.clinical_notes%rowtype;
  field_record public.clinical_template_fields%rowtype;
  section_record public.clinical_template_sections%rowtype;
  existing_response public.clinical_note_structured_responses%rowtype;
  saved_response_id uuid;
  payload_value jsonb;
  payload_text text;
  payload_number numeric(18, 6);
  payload_boolean boolean;
  payload_date date;
  payload_datetime timestamptz;
begin
  if jsonb_typeof(response_payload) <> 'object' then
    raise exception 'Structured response payload must be an object';
  end if;

  select *
  into version_record
  from public.clinical_note_versions
  where id = target_note_version_id
    and deleted_at is null
  for update;

  if version_record.id is null then
    raise exception 'Clinical note version not found';
  end if;

  if version_record.version_status <> 'draft' then
    raise exception 'Only draft clinical note versions can be edited';
  end if;

  select *
  into note_record
  from public.clinical_notes
  where id = version_record.clinical_note_id
    and deleted_at is null;

  if note_record.id is null then
    raise exception 'Clinical note not found';
  end if;

  if not public.has_tenant_role(note_record.tenant_id, array['admin', 'therapist']) then
    raise exception 'Not allowed to edit clinical notes for this tenant';
  end if;

  select *
  into field_record
  from public.clinical_template_fields
  where id = target_template_field_id
    and clinical_note_template_version_id = version_record.clinical_note_template_version_id
    and deleted_at is null;

  if field_record.id is null then
    raise exception 'Clinical template field not found for this note version';
  end if;

  select *
  into section_record
  from public.clinical_template_sections
  where id = field_record.clinical_template_section_id
    and deleted_at is null;

  if field_record.is_read_only and field_record.is_calculated is false then
    raise exception 'Read-only clinical fields cannot be edited directly';
  end if;

  select *
  into existing_response
  from public.clinical_note_structured_responses
  where clinical_note_version_id = version_record.id
    and clinical_template_field_id = field_record.id
    and repeat_group_key is not distinct from nullif(response_payload ->> 'repeat_group_key', '')
    and repeat_index = coalesce((response_payload ->> 'repeat_index')::integer, 0)
    and deleted_at is null
  for update;

  if existing_response.id is not null
    and expected_lock_version is not null
    and existing_response.lock_version <> expected_lock_version then
    update public.clinical_note_draft_states
    set conflict_detected = true,
        conflict_reason = 'stale_structured_response',
        updated_at = now()
    where clinical_note_version_id = version_record.id
      and deleted_at is null;

    raise exception 'Structured response has changed since it was loaded';
  end if;

  payload_value := response_payload -> 'response_value';
  payload_text := response_payload ->> 'response_text';
  payload_number := nullif(response_payload ->> 'response_number', '')::numeric;
  payload_boolean := nullif(response_payload ->> 'response_boolean', '')::boolean;
  payload_date := nullif(response_payload ->> 'response_date', '')::date;
  payload_datetime := nullif(response_payload ->> 'response_datetime', '')::timestamptz;

  if existing_response.id is null then
    insert into public.clinical_note_structured_responses (
      tenant_id,
      patient_id,
      clinical_note_id,
      clinical_note_version_id,
      clinical_note_template_version_id,
      clinical_template_section_id,
      clinical_template_field_id,
      section_key,
      field_key,
      repeat_group_key,
      repeat_index,
      response_value,
      response_text,
      response_number,
      response_boolean,
      response_date,
      response_datetime,
      response_unit,
      display_value,
      value_type,
      is_calculated,
      validation_state,
      validation_errors,
      saved_by_profile_id,
      idempotency_key,
      metadata
    )
    values (
      note_record.tenant_id,
      note_record.patient_id,
      note_record.id,
      version_record.id,
      version_record.clinical_note_template_version_id,
      section_record.id,
      field_record.id,
      section_record.section_key,
      field_record.field_key,
      nullif(response_payload ->> 'repeat_group_key', ''),
      coalesce((response_payload ->> 'repeat_index')::integer, 0),
      payload_value,
      payload_text,
      payload_number,
      payload_boolean,
      payload_date,
      payload_datetime,
      nullif(response_payload ->> 'response_unit', ''),
      nullif(response_payload ->> 'display_value', ''),
      coalesce(nullif(response_payload ->> 'value_type', ''), 'json'),
      field_record.is_calculated,
      coalesce(nullif(response_payload ->> 'validation_state', ''), 'unchecked'),
      coalesce(response_payload -> 'validation_errors', '[]'::jsonb),
      auth.uid(),
      idempotency_key_input,
      coalesce(response_payload -> 'metadata', '{}'::jsonb)
    )
    returning id into saved_response_id;
  else
    update public.clinical_note_structured_responses
    set response_value = payload_value,
        response_text = payload_text,
        response_number = payload_number,
        response_boolean = payload_boolean,
        response_date = payload_date,
        response_datetime = payload_datetime,
        response_unit = nullif(response_payload ->> 'response_unit', ''),
        display_value = nullif(response_payload ->> 'display_value', ''),
        value_type = coalesce(nullif(response_payload ->> 'value_type', ''), existing_response.value_type),
        validation_state = coalesce(nullif(response_payload ->> 'validation_state', ''), existing_response.validation_state),
        validation_errors = coalesce(response_payload -> 'validation_errors', existing_response.validation_errors),
        copied_value_edited = existing_response.copy_forward_event_id is not null,
        idempotency_key = coalesce(idempotency_key_input, existing_response.idempotency_key),
        metadata = existing_response.metadata || coalesce(response_payload -> 'metadata', '{}'::jsonb)
    where id = existing_response.id
    returning id into saved_response_id;
  end if;

  insert into public.clinical_note_draft_states (
    tenant_id,
    patient_id,
    clinical_note_id,
    clinical_note_version_id,
    active_editor_profile_id,
    last_saved_by_profile_id,
    last_client_saved_at,
    last_idempotency_key
  )
  values (
    note_record.tenant_id,
    note_record.patient_id,
    note_record.id,
    version_record.id,
    auth.uid(),
    auth.uid(),
    nullif(response_payload ->> 'client_saved_at', '')::timestamptz,
    idempotency_key_input
  )
  on conflict (clinical_note_version_id) where deleted_at is null
  do update
  set draft_status = 'active',
      active_editor_profile_id = auth.uid(),
      last_saved_at = now(),
      last_saved_by_profile_id = auth.uid(),
      last_client_saved_at = excluded.last_client_saved_at,
      last_idempotency_key = excluded.last_idempotency_key,
      conflict_detected = false,
      conflict_reason = null,
      updated_at = now();

  return saved_response_id;
end;
$$;

create or replace function public.copy_forward_clinical_response(
  source_response_id_input uuid,
  target_note_version_id uuid,
  target_template_field_id uuid,
  copy_reason_input text default null,
  idempotency_key_input text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  source_response public.clinical_note_structured_responses%rowtype;
  target_response_id uuid;
  copy_event_id uuid;
  response_payload jsonb;
begin
  select *
  into source_response
  from public.clinical_note_structured_responses
  where id = source_response_id_input
    and deleted_at is null;

  if source_response.id is null then
    raise exception 'Source structured response not found';
  end if;

  if not public.has_tenant_role(source_response.tenant_id, array['admin', 'therapist']) then
    raise exception 'Not allowed to copy-forward clinical content for this tenant';
  end if;

  response_payload := jsonb_build_object(
    'response_value', source_response.response_value,
    'response_text', source_response.response_text,
    'response_number', source_response.response_number,
    'response_boolean', source_response.response_boolean,
    'response_date', source_response.response_date,
    'response_datetime', source_response.response_datetime,
    'response_unit', source_response.response_unit,
    'display_value', source_response.display_value,
    'value_type', source_response.value_type,
    'validation_state', 'unchecked',
    'metadata', jsonb_build_object('copy_forward_source_response_id', source_response.id)
  );

  target_response_id := public.save_clinical_note_structured_response(
    target_note_version_id,
    target_template_field_id,
    response_payload,
    null,
    idempotency_key_input
  );

  insert into public.clinical_note_copy_forward_events (
    tenant_id,
    patient_id,
    target_clinical_note_id,
    target_clinical_note_version_id,
    target_response_id,
    source_clinical_note_id,
    source_clinical_note_version_id,
    source_response_id,
    source_section_key,
    source_field_key,
    target_section_key,
    target_field_key,
    copy_reason,
    copied_by_profile_id,
    copied_value_snapshot
  )
  select
    target_response.tenant_id,
    target_response.patient_id,
    target_response.clinical_note_id,
    target_response.clinical_note_version_id,
    target_response.id,
    source_response.clinical_note_id,
    source_response.clinical_note_version_id,
    source_response.id,
    source_response.section_key,
    source_response.field_key,
    target_response.section_key,
    target_response.field_key,
    copy_reason_input,
    auth.uid(),
    jsonb_build_object(
      'value_type', source_response.value_type,
      'display_value', source_response.display_value,
      'copied_at', now()
    )
  from public.clinical_note_structured_responses target_response
  where target_response.id = target_response_id
  returning id into copy_event_id;

  update public.clinical_note_structured_responses
  set copy_forward_event_id = copy_event_id
  where id = target_response_id;

  insert into public.audit_events (tenant_id, actor_profile_id, action, entity_table, entity_id, metadata)
  values (
    source_response.tenant_id,
    auth.uid(),
    'clinical_copy_forward_used',
    'clinical_note_copy_forward_events',
    copy_event_id,
    jsonb_build_object('source_response_id', source_response.id, 'target_response_id', target_response_id)
  );

  insert into public.clinical_workflow_events (tenant_id, patient_id, clinical_note_version_id, event_type, event_key, metadata)
  select
    tenant_id,
    patient_id,
    clinical_note_version_id,
    'clinical_copy_forward_used',
    'clinical_copy_forward:' || copy_event_id::text,
    jsonb_build_object('copy_forward_event_id', copy_event_id)
  from public.clinical_note_structured_responses
  where id = target_response_id
  on conflict (tenant_id, event_key) where event_key is not null and deleted_at is null do nothing;

  return copy_event_id;
end;
$$;

create or replace function public.finalise_clinical_note_version(target_note_version_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  version_record public.clinical_note_versions%rowtype;
  note_record public.clinical_notes%rowtype;
  validation_result jsonb;
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

  validation_result := public.validate_clinical_note_version_ready_for_finalisation(target_note_version_id);
  if coalesce((validation_result ->> 'valid')::boolean, false) is not true then
    raise exception 'Clinical note version is not ready for finalisation: %', validation_result -> 'errors';
  end if;

  hash_value := md5(
    coalesce(version_record.free_text_content, '')
    || version_record.structured_content::text
    || coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'field_key', r.field_key,
          'repeat_index', r.repeat_index,
          'value', r.response_value,
          'text', r.response_text,
          'number', r.response_number,
          'boolean', r.response_boolean,
          'date', r.response_date,
          'datetime', r.response_datetime
        )
        order by r.section_key, r.field_key, r.repeat_index
      )::text
      from public.clinical_note_structured_responses r
      where r.clinical_note_version_id = version_record.id
        and r.deleted_at is null
    ), '[]')
    || version_record.id::text
  );

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

  update public.clinical_note_draft_states
  set draft_status = 'finalised',
      updated_at = now()
  where clinical_note_version_id = target_note_version_id
    and deleted_at is null;

  insert into public.audit_events (tenant_id, actor_profile_id, action, entity_table, entity_id, metadata)
  values (
    note_record.tenant_id,
    auth.uid(),
    'clinical_note_version_finalised',
    'clinical_note_versions',
    target_note_version_id,
    jsonb_build_object('clinical_note_id', note_record.id, 'patient_id', note_record.patient_id, 'structured_validation', validation_result - 'errors')
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

revoke all on function public.validate_clinical_documentation_template_scope() from public, anon;
revoke all on function public.enforce_clinical_template_definition_immutability() from public, anon;
revoke all on function public.validate_clinical_structured_response_integrity() from public, anon;
revoke all on function public.enforce_clinical_structured_response_immutability() from public, anon;
revoke all on function public.increment_clinical_response_lock_version() from public, anon;
revoke all on function public.validate_clinical_note_draft_state_integrity() from public, anon;
revoke all on function public.validate_clinical_copy_forward_integrity() from public, anon;
revoke all on function public.validate_clinical_template_version_ready_for_publish(uuid) from public, anon;
revoke all on function public.publish_clinical_template_version(uuid) from public, anon;
revoke all on function public.retire_clinical_template_version(uuid, text) from public, anon;
revoke all on function public.create_clinical_template_version_from(uuid, text) from public, anon;
revoke all on function public.validate_clinical_note_version_ready_for_finalisation(uuid) from public, anon;
revoke all on function public.save_clinical_note_structured_response(uuid, uuid, jsonb, integer, text) from public, anon;
revoke all on function public.copy_forward_clinical_response(uuid, uuid, uuid, text, text) from public, anon;
revoke all on function public.finalise_clinical_note_version(uuid) from public, anon;

grant execute on function public.validate_clinical_template_version_ready_for_publish(uuid) to authenticated;
grant execute on function public.publish_clinical_template_version(uuid) to authenticated;
grant execute on function public.retire_clinical_template_version(uuid, text) to authenticated;
grant execute on function public.create_clinical_template_version_from(uuid, text) to authenticated;
grant execute on function public.validate_clinical_note_version_ready_for_finalisation(uuid) to authenticated;
grant execute on function public.save_clinical_note_structured_response(uuid, uuid, jsonb, integer, text) to authenticated;
grant execute on function public.copy_forward_clinical_response(uuid, uuid, uuid, text, text) to authenticated;
grant execute on function public.finalise_clinical_note_version(uuid) to authenticated;

comment on table public.clinical_template_sections is
  'Queryable section definitions for a clinical note template version. Published template versions protect these rows from destructive edits.';

comment on table public.clinical_template_fields is
  'Queryable field definitions for clinical documentation templates. Field keys remain stable across versions where clinical meaning is stable.';

comment on table public.clinical_note_structured_responses is
  'First-class structured note responses linked to exact template versions and immutable once the note version is finalised or signed.';

comment on table public.clinical_note_copy_forward_events is
  'Append-only provenance for copied or reused clinical values. Does not carry legal status or signature from the source note.';

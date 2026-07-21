-- AlliDesk Phase 6C: Clinical Template Management database foundation.
-- Scope: template-management authoring state, review/validation metadata,
-- assignment priority/effective dates, usage metadata, protected template
-- creation/update/duplication/assignment RPCs, and publication hardening.
--
-- Architecture notes:
-- - Extends Phase 6A/6B clinical template objects.
-- - Does not create a competing template system.
-- - Published template versions remain immutable.
-- - Patient-visible eligibility remains metadata only.
-- - Super Admin may manage system templates, but receives no default access
--   to tenant clinical template content or tenant clinical records.

alter table public.clinical_note_templates
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists archive_reason text,
  add column if not exists lock_version integer not null default 1;

alter table public.clinical_note_templates
  add constraint clinical_note_templates_lock_version_check
  check (lock_version > 0) not valid;

alter table public.clinical_note_templates
  validate constraint clinical_note_templates_lock_version_check;

alter table public.clinical_note_template_versions
  add column if not exists release_notes text,
  add column if not exists effective_from date,
  add column if not exists effective_until date,
  add column if not exists review_status text not null default 'not_required',
  add column if not exists validation_status text not null default 'not_run',
  add column if not exists publication_ready boolean not null default false,
  add column if not exists submitted_for_review_at timestamptz,
  add column if not exists submitted_for_review_by_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists approval_comment text,
  add column if not exists retirement_reason text,
  add column if not exists source_template_version_id uuid references public.clinical_note_template_versions(id) on delete set null,
  add column if not exists lock_version integer not null default 1;

alter table public.clinical_note_template_versions
  add constraint clinical_note_template_versions_review_status_check
  check (review_status in ('not_required', 'draft', 'review_requested', 'in_review', 'approved', 'changes_requested', 'review_cancelled')) not valid,
  add constraint clinical_note_template_versions_validation_status_check
  check (validation_status in ('not_run', 'valid', 'warning', 'invalid')) not valid,
  add constraint clinical_note_template_versions_effective_dates_check
  check (effective_from is null or effective_until is null or effective_from <= effective_until) not valid,
  add constraint clinical_note_template_versions_lock_version_check
  check (lock_version > 0) not valid;

alter table public.clinical_note_template_versions
  validate constraint clinical_note_template_versions_review_status_check,
  validate constraint clinical_note_template_versions_validation_status_check,
  validate constraint clinical_note_template_versions_effective_dates_check,
  validate constraint clinical_note_template_versions_lock_version_check;

alter table public.clinical_template_sections
  add column if not exists patient_facing_label text,
  add column if not exists patient_facing_description text,
  add column if not exists lock_version integer not null default 1;

alter table public.clinical_template_fields
  add column if not exists patient_facing_label text,
  add column if not exists patient_facing_description text,
  add column if not exists lock_version integer not null default 1;

alter table public.clinical_template_field_options
  add column if not exists lock_version integer not null default 1;

alter table public.clinical_template_validation_rules
  add column if not exists lock_version integer not null default 1;

alter table public.clinical_template_calculation_rules
  add column if not exists lock_version integer not null default 1;

alter table public.clinical_template_assignments
  add column if not exists assignment_priority integer not null default 100,
  add column if not exists assigned_by_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists assignment_reason text,
  add column if not exists lock_version integer not null default 1;

alter table public.clinical_template_assignments
  add constraint clinical_template_assignments_priority_check
  check (assignment_priority > 0) not valid,
  add constraint clinical_template_assignments_lock_version_check
  check (lock_version > 0) not valid;

alter table public.clinical_template_assignments
  validate constraint clinical_template_assignments_priority_check,
  validate constraint clinical_template_assignments_lock_version_check;

create table public.clinical_template_draft_states (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  clinical_note_template_id uuid not null references public.clinical_note_templates(id) on delete cascade,
  clinical_note_template_version_id uuid not null references public.clinical_note_template_versions(id) on delete cascade,
  draft_status text not null default 'active',
  draft_owner_profile_id uuid references public.profiles(id) on delete set null,
  active_editor_profile_id uuid references public.profiles(id) on delete set null,
  last_saved_at timestamptz not null default now(),
  last_saved_by_profile_id uuid references public.profiles(id) on delete set null,
  last_client_saved_at timestamptz,
  last_idempotency_key text,
  validation_status text not null default 'not_run',
  review_status text not null default 'not_required',
  publication_ready boolean not null default false,
  conflict_detected boolean not null default false,
  conflict_reason text,
  lock_version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinical_template_draft_states_status_check
    check (draft_status in ('active', 'interrupted', 'restored', 'superseded', 'published', 'retired', 'abandoned')),
  constraint clinical_template_draft_states_validation_status_check
    check (validation_status in ('not_run', 'valid', 'warning', 'invalid')),
  constraint clinical_template_draft_states_review_status_check
    check (review_status in ('not_required', 'draft', 'review_requested', 'in_review', 'approved', 'changes_requested', 'review_cancelled')),
  constraint clinical_template_draft_states_metadata_object_check
    check (jsonb_typeof(metadata) = 'object'),
  constraint clinical_template_draft_states_lock_version_check
    check (lock_version > 0)
);

create table public.clinical_template_review_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  clinical_note_template_id uuid not null references public.clinical_note_templates(id) on delete cascade,
  clinical_note_template_version_id uuid not null references public.clinical_note_template_versions(id) on delete cascade,
  review_status text not null default 'review_requested',
  requested_by_profile_id uuid references public.profiles(id) on delete set null,
  requested_at timestamptz not null default now(),
  reviewer_profile_id uuid references public.profiles(id) on delete set null,
  decision_at timestamptz,
  decision_reason text,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinical_template_review_requests_status_check
    check (review_status in ('review_requested', 'in_review', 'approved', 'changes_requested', 'review_cancelled')),
  constraint clinical_template_review_requests_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create table public.clinical_template_validation_results (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  clinical_note_template_id uuid not null references public.clinical_note_templates(id) on delete cascade,
  clinical_note_template_version_id uuid not null references public.clinical_note_template_versions(id) on delete cascade,
  validation_status text not null,
  validation_scope text not null default 'publish',
  finding_count integer not null default 0,
  error_count integer not null default 0,
  warning_count integer not null default 0,
  info_count integer not null default 0,
  findings jsonb not null default '[]'::jsonb,
  validated_by_profile_id uuid references public.profiles(id) on delete set null,
  validated_at timestamptz not null default now(),
  template_lock_version integer,
  version_lock_version integer,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinical_template_validation_results_status_check
    check (validation_status in ('valid', 'warning', 'invalid')),
  constraint clinical_template_validation_results_scope_check
    check (validation_scope in ('draft_save', 'review', 'publish', 'assignment')),
  constraint clinical_template_validation_results_counts_check
    check (finding_count >= 0 and error_count >= 0 and warning_count >= 0 and info_count >= 0),
  constraint clinical_template_validation_results_findings_array_check
    check (jsonb_typeof(findings) = 'array'),
  constraint clinical_template_validation_results_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create table public.clinical_template_usage_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  clinical_note_template_id uuid not null references public.clinical_note_templates(id) on delete cascade,
  clinical_note_template_version_id uuid references public.clinical_note_template_versions(id) on delete cascade,
  note_count integer not null default 0,
  first_used_at timestamptz,
  last_used_at timestamptz,
  active_assignment_count integer not null default 0,
  draft_version_count integer not null default 0,
  active_version_count integer not null default 0,
  retired_version_count integer not null default 0,
  calculated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinical_template_usage_snapshots_counts_check
    check (
      note_count >= 0
      and active_assignment_count >= 0
      and draft_version_count >= 0
      and active_version_count >= 0
      and retired_version_count >= 0
    ),
  constraint clinical_template_usage_snapshots_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create unique index clinical_template_draft_states_active_version_idx
  on public.clinical_template_draft_states (clinical_note_template_version_id)
  where deleted_at is null;

create index clinical_template_draft_states_tenant_idx
  on public.clinical_template_draft_states (tenant_id, draft_status, updated_at desc)
  where deleted_at is null;

create index clinical_template_draft_states_owner_idx
  on public.clinical_template_draft_states (tenant_id, draft_owner_profile_id)
  where deleted_at is null;

create index clinical_template_review_requests_version_idx
  on public.clinical_template_review_requests (clinical_note_template_version_id, review_status)
  where deleted_at is null;

create index clinical_template_review_requests_reviewer_idx
  on public.clinical_template_review_requests (tenant_id, reviewer_profile_id, review_status)
  where deleted_at is null;

create index clinical_template_validation_results_version_idx
  on public.clinical_template_validation_results (clinical_note_template_version_id, validated_at desc)
  where deleted_at is null;

create index clinical_template_validation_results_status_idx
  on public.clinical_template_validation_results (tenant_id, validation_status, validated_at desc)
  where deleted_at is null;

create unique index clinical_template_usage_snapshots_version_idx
  on public.clinical_template_usage_snapshots (clinical_note_template_version_id)
  where clinical_note_template_version_id is not null and deleted_at is null;

create index clinical_template_usage_snapshots_template_idx
  on public.clinical_template_usage_snapshots (tenant_id, clinical_note_template_id, calculated_at desc)
  where deleted_at is null;

create index clinical_note_templates_status_lock_idx
  on public.clinical_note_templates (tenant_id, template_status, lock_version)
  where deleted_at is null;

create index clinical_note_template_versions_review_idx
  on public.clinical_note_template_versions (tenant_id, review_status, validation_status, version_status)
  where deleted_at is null;

create index clinical_template_assignments_priority_idx
  on public.clinical_template_assignments (tenant_id, assignment_scope, is_default, assignment_priority, effective_from, effective_until)
  where deleted_at is null and is_active = true;

create or replace function public.increment_clinical_template_lock_version()
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

create or replace function public.assert_clinical_template_version_is_draft(target_template_version_id uuid)
returns void
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  target_status text;
begin
  select version_status
  into target_status
  from public.clinical_note_template_versions
  where id = target_template_version_id
    and deleted_at is null;

  if target_status is null then
    raise exception 'Clinical template version not found';
  end if;

  if target_status <> 'draft' then
    raise exception 'Only draft clinical template versions can be edited';
  end if;
end;
$$;

create or replace function public.has_clinical_template_management_permission(
  target_tenant_id uuid,
  action_key text
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    when target_tenant_id is null then public.is_super_admin()
    when action_key in ('view', 'create', 'edit', 'duplicate') then public.has_tenant_role(target_tenant_id, array['admin', 'therapist'])
    when action_key in ('publish', 'retire', 'assign', 'review', 'approve', 'usage') then public.has_tenant_role(target_tenant_id, array['admin'])
    else false
  end;
$$;

create or replace function public.validate_clinical_template_stable_key(key_input text)
returns boolean
language sql
immutable
as $$
  select key_input is not null and key_input ~ '^[a-z][a-z0-9_]{1,80}$';
$$;

create or replace function public.validate_clinical_template_visibility_rule_references(
  target_template_version_id uuid,
  rules_input jsonb
)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  ref_key text;
begin
  if rules_input is null then
    return true;
  end if;

  if jsonb_typeof(rules_input) <> 'array' then
    return false;
  end if;

  for ref_key in
    select distinct reference_value
    from jsonb_array_elements(rules_input) rule_row
    cross join lateral jsonb_array_elements_text(coalesce(rule_row -> 'field_keys', '[]'::jsonb)) reference_value
  loop
    if not exists (
      select 1
      from public.clinical_template_fields field_row
      where field_row.clinical_note_template_version_id = target_template_version_id
        and field_row.field_key = ref_key
        and field_row.deleted_at is null
    ) then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

create or replace function public.touch_clinical_template_draft_state(
  target_template_version_id uuid,
  idempotency_key_input text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  version_record public.clinical_note_template_versions%rowtype;
begin
  select *
  into version_record
  from public.clinical_note_template_versions
  where id = target_template_version_id
    and deleted_at is null;

  if version_record.id is null then
    raise exception 'Clinical template version not found';
  end if;

  insert into public.clinical_template_draft_states (
    tenant_id,
    clinical_note_template_id,
    clinical_note_template_version_id,
    draft_owner_profile_id,
    active_editor_profile_id,
    last_saved_by_profile_id,
    last_idempotency_key
  )
  values (
    version_record.tenant_id,
    version_record.clinical_note_template_id,
    version_record.id,
    auth.uid(),
    auth.uid(),
    auth.uid(),
    idempotency_key_input
  )
  on conflict (clinical_note_template_version_id) where deleted_at is null
  do update
  set draft_status = 'active',
      active_editor_profile_id = auth.uid(),
      last_saved_at = now(),
      last_saved_by_profile_id = auth.uid(),
      last_idempotency_key = excluded.last_idempotency_key,
      validation_status = 'not_run',
      publication_ready = false,
      conflict_detected = false,
      conflict_reason = null,
      updated_at = now();
end;
$$;

create or replace function public.create_clinical_template_draft(
  target_tenant_id uuid,
  template_key_input text,
  template_name_input text,
  description_input text default null,
  discipline_tags_input text[] default '{}'::text[],
  default_note_type_input text default 'progress_note',
  idempotency_key_input text default null
)
returns table(clinical_note_template_id uuid, clinical_note_template_version_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_template_id uuid;
  existing_version_id uuid;
  existing_fingerprint text;
  request_fingerprint text;
  new_template_id uuid;
  new_version_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.has_clinical_template_management_permission(target_tenant_id, 'create') then
    raise exception 'Not allowed to create clinical templates for this tenant';
  end if;

  if not public.validate_clinical_template_stable_key(template_key_input) then
    raise exception 'Template key is invalid';
  end if;

  if nullif(btrim(template_name_input), '') is null then
    raise exception 'Template name is required';
  end if;

  request_fingerprint := md5(jsonb_build_object(
    'target_tenant_id', target_tenant_id,
    'template_key_input', template_key_input,
    'template_name_input', btrim(template_name_input),
    'description_input', nullif(description_input, ''),
    'discipline_tags_input', coalesce(discipline_tags_input, '{}'::text[]),
    'default_note_type_input', coalesce(nullif(default_note_type_input, ''), 'progress_note')
  )::text);

  if idempotency_key_input is not null then
    perform pg_advisory_xact_lock(hashtextextended(target_tenant_id::text || ':clinical-template:' || idempotency_key_input, 0));

    select template.id, version.id, template.metadata ->> 'request_fingerprint'
    into existing_template_id, existing_version_id, existing_fingerprint
    from public.clinical_note_templates template
    join public.clinical_note_template_versions version
      on version.clinical_note_template_id = template.id
     and version.version_number = 1
     and version.deleted_at is null
    where template.tenant_id = target_tenant_id
      and template.deleted_at is null
      and template.metadata ->> 'idempotency_key' = idempotency_key_input
    limit 1;

    if existing_template_id is not null then
      if existing_fingerprint is distinct from request_fingerprint then
        raise exception 'Clinical template idempotency key was reused with different request details';
      end if;

      return query select existing_template_id, existing_version_id;
      return;
    end if;
  end if;

  if exists (
    select 1
    from public.clinical_note_templates template
    where template.tenant_id = target_tenant_id
      and lower(template.template_key) = lower(template_key_input)
      and template.deleted_at is null
  ) then
    raise exception 'Template key already exists for this tenant';
  end if;

  insert into public.clinical_note_templates (
    tenant_id,
    template_key,
    name,
    description,
    discipline_tags,
    template_status,
    template_owner_type,
    is_system_template,
    created_by_profile_id,
    updated_by_profile_id,
    metadata
  )
  values (
    target_tenant_id,
    template_key_input,
    btrim(template_name_input),
    nullif(description_input, ''),
    coalesce(discipline_tags_input, '{}'::text[]),
    'draft',
    'tenant',
    false,
    auth.uid(),
    auth.uid(),
    jsonb_build_object('idempotency_key', idempotency_key_input, 'request_fingerprint', request_fingerprint)
  )
  returning id into new_template_id;

  insert into public.clinical_note_template_versions (
    tenant_id,
    clinical_note_template_id,
    version_number,
    version_status,
    template_schema,
    default_structured_content,
    visibility_default,
    release_notes,
    validation_status,
    review_status,
    publication_ready,
    created_by_profile_id,
    updated_by_profile_id,
    metadata
  )
  values (
    target_tenant_id,
    new_template_id,
    1,
    'draft',
    jsonb_build_object('note_type', coalesce(nullif(default_note_type_input, ''), 'progress_note')),
    '{}'::jsonb,
    'internal',
    'Initial draft template version',
    'not_run',
    'not_required',
    false,
    auth.uid(),
    auth.uid(),
    jsonb_build_object('created_from', 'clinical_template_management', 'idempotency_key', idempotency_key_input, 'request_fingerprint', request_fingerprint)
  )
  returning id into new_version_id;

  perform public.touch_clinical_template_draft_state(new_version_id, idempotency_key_input);

  insert into public.audit_events (tenant_id, actor_profile_id, action, entity_table, entity_id, metadata)
  values (
    target_tenant_id,
    auth.uid(),
    'clinical_template_created',
    'clinical_note_templates',
    new_template_id,
    jsonb_build_object('clinical_note_template_version_id', new_version_id, 'template_key', template_key_input)
  );

  insert into public.clinical_workflow_events (tenant_id, event_type, event_key, metadata)
  values (
    target_tenant_id,
    'clinical_template_created',
    'clinical_template_created:' || new_template_id::text,
    jsonb_build_object('clinical_note_template_id', new_template_id, 'clinical_note_template_version_id', new_version_id)
  )
  on conflict (tenant_id, event_key) where event_key is not null and deleted_at is null do nothing;

  return query select new_template_id, new_version_id;
end;
$$;

create or replace function public.update_clinical_template_draft_metadata(
  target_template_version_id uuid,
  template_name_input text,
  description_input text default null,
  discipline_tags_input text[] default null,
  release_notes_input text default null,
  expected_template_lock_version integer default null,
  expected_version_lock_version integer default null,
  idempotency_key_input text default null
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

  if version_record.version_status <> 'draft' then
    raise exception 'Only draft clinical template versions can be edited';
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

  if not public.has_clinical_template_management_permission(version_record.tenant_id, 'edit') then
    raise exception 'Not allowed to edit this clinical template';
  end if;

  if expected_template_lock_version is not null and template_record.lock_version <> expected_template_lock_version then
    raise exception 'Clinical template metadata has changed since it was loaded';
  end if;

  if expected_version_lock_version is not null and version_record.lock_version <> expected_version_lock_version then
    raise exception 'Clinical template version has changed since it was loaded';
  end if;

  if nullif(btrim(template_name_input), '') is null then
    raise exception 'Template name is required';
  end if;

  update public.clinical_note_templates
  set name = btrim(template_name_input),
      description = nullif(description_input, ''),
      discipline_tags = coalesce(discipline_tags_input, discipline_tags),
      updated_by_profile_id = auth.uid()
  where id = template_record.id;

  update public.clinical_note_template_versions
  set release_notes = release_notes_input,
      validation_status = 'not_run',
      publication_ready = false,
      updated_by_profile_id = auth.uid()
  where id = version_record.id;

  perform public.touch_clinical_template_draft_state(version_record.id, idempotency_key_input);

  insert into public.audit_events (tenant_id, actor_profile_id, action, entity_table, entity_id, metadata)
  values (
    version_record.tenant_id,
    auth.uid(),
    'clinical_template_metadata_updated',
    'clinical_note_template_versions',
    version_record.id,
    jsonb_build_object('clinical_note_template_id', template_record.id)
  );

  return version_record.id;
end;
$$;

create or replace function public.upsert_clinical_template_section(
  target_template_version_id uuid,
  section_id_input uuid default null,
  section_key_input text default null,
  section_label_input text default null,
  display_order_input integer default 1,
  section_type_input text default 'standard',
  patient_visible_eligible_input boolean default false,
  practitioner_only_input boolean default false,
  expected_lock_version integer default null,
  idempotency_key_input text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  version_record public.clinical_note_template_versions%rowtype;
  existing_section public.clinical_template_sections%rowtype;
  saved_section_id uuid;
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

  if version_record.version_status <> 'draft' then
    raise exception 'Only draft clinical template versions can be edited';
  end if;

  if not public.has_clinical_template_management_permission(version_record.tenant_id, 'edit') then
    raise exception 'Not allowed to edit clinical template sections';
  end if;

  if not public.validate_clinical_template_stable_key(section_key_input) then
    raise exception 'Section key is invalid';
  end if;

  if nullif(btrim(section_label_input), '') is null then
    raise exception 'Section label is required';
  end if;

  if display_order_input <= 0 then
    raise exception 'Section display order must be positive';
  end if;

  if patient_visible_eligible_input = true and practitioner_only_input = true then
    raise exception 'Practitioner-only sections cannot be patient-visible eligible';
  end if;

  if section_id_input is not null then
    select *
    into existing_section
    from public.clinical_template_sections
    where id = section_id_input
      and clinical_note_template_version_id = target_template_version_id
      and deleted_at is null
    for update;

    if existing_section.id is null then
      raise exception 'Clinical template section not found';
    end if;

    if expected_lock_version is not null and existing_section.lock_version <> expected_lock_version then
      raise exception 'Clinical template section changed since it was loaded';
    end if;

    update public.clinical_template_sections
    set section_label = btrim(section_label_input),
        display_order = display_order_input,
        section_type = section_type_input,
        patient_visible_eligible = patient_visible_eligible_input,
        practitioner_only = practitioner_only_input,
        visibility_class = case when patient_visible_eligible_input then 'patient_facing_candidate' else visibility_class end,
        updated_by_profile_id = auth.uid()
    where id = existing_section.id
    returning id into saved_section_id;
  else
    insert into public.clinical_template_sections (
      tenant_id,
      clinical_note_template_version_id,
      section_key,
      section_label,
      display_order,
      section_type,
      visibility_class,
      patient_visible_eligible,
      practitioner_only,
      created_by_profile_id,
      updated_by_profile_id,
      metadata
    )
    values (
      version_record.tenant_id,
      version_record.id,
      section_key_input,
      btrim(section_label_input),
      display_order_input,
      section_type_input,
      case when patient_visible_eligible_input then 'patient_facing_candidate' else 'clinical_internal' end,
      patient_visible_eligible_input,
      practitioner_only_input,
      auth.uid(),
      auth.uid(),
      jsonb_build_object('idempotency_key', idempotency_key_input)
    )
    returning id into saved_section_id;
  end if;

  perform public.touch_clinical_template_draft_state(version_record.id, idempotency_key_input);
  return saved_section_id;
end;
$$;

create or replace function public.upsert_clinical_template_field(
  target_template_version_id uuid,
  target_section_id uuid,
  field_id_input uuid default null,
  field_key_input text default null,
  field_label_input text default null,
  field_type_input text default 'short_text',
  display_order_input integer default 1,
  is_required_input boolean default false,
  is_required_on_finalise_input boolean default false,
  patient_visible_eligible_input boolean default false,
  practitioner_only_input boolean default false,
  allowed_units_input text[] default '{}'::text[],
  expected_lock_version integer default null,
  idempotency_key_input text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  version_record public.clinical_note_template_versions%rowtype;
  section_record public.clinical_template_sections%rowtype;
  existing_field public.clinical_template_fields%rowtype;
  saved_field_id uuid;
begin
  select * into version_record from public.clinical_note_template_versions where id = target_template_version_id and deleted_at is null for update;
  if version_record.id is null or version_record.version_status <> 'draft' then
    raise exception 'Clinical template draft version not found';
  end if;

  if not public.has_clinical_template_management_permission(version_record.tenant_id, 'edit') then
    raise exception 'Not allowed to edit clinical template fields';
  end if;

  select * into section_record from public.clinical_template_sections where id = target_section_id and clinical_note_template_version_id = target_template_version_id and deleted_at is null;
  if section_record.id is null then
    raise exception 'Clinical template section not found';
  end if;

  if not public.validate_clinical_template_stable_key(field_key_input) then
    raise exception 'Field key is invalid';
  end if;

  if nullif(btrim(field_label_input), '') is null then
    raise exception 'Field label is required';
  end if;

  if display_order_input <= 0 then
    raise exception 'Field display order must be positive';
  end if;

  if patient_visible_eligible_input = true and practitioner_only_input = true then
    raise exception 'Practitioner-only fields cannot be patient-visible eligible';
  end if;

  if field_id_input is not null then
    select * into existing_field from public.clinical_template_fields where id = field_id_input and clinical_note_template_version_id = target_template_version_id and deleted_at is null for update;
    if existing_field.id is null then
      raise exception 'Clinical template field not found';
    end if;
    if expected_lock_version is not null and existing_field.lock_version <> expected_lock_version then
      raise exception 'Clinical template field changed since it was loaded';
    end if;
    if existing_field.field_key <> field_key_input then
      raise exception 'Published-stable field keys cannot be changed through this draft editor operation';
    end if;

    update public.clinical_template_fields
    set field_label = btrim(field_label_input),
        field_type = field_type_input,
        display_order = display_order_input,
        is_required = is_required_input,
        is_required_on_finalise = is_required_on_finalise_input,
        patient_visible_eligible = patient_visible_eligible_input,
        practitioner_only = practitioner_only_input,
        visibility_class = case when patient_visible_eligible_input then 'patient_facing_candidate' else visibility_class end,
        allowed_units = coalesce(allowed_units_input, '{}'::text[]),
        updated_by_profile_id = auth.uid()
    where id = existing_field.id
    returning id into saved_field_id;
  else
    insert into public.clinical_template_fields (
      tenant_id,
      clinical_note_template_version_id,
      clinical_template_section_id,
      field_key,
      field_label,
      field_type,
      display_order,
      is_required,
      is_required_on_finalise,
      visibility_class,
      patient_visible_eligible,
      practitioner_only,
      allowed_units,
      created_by_profile_id,
      updated_by_profile_id,
      metadata
    )
    values (
      version_record.tenant_id,
      version_record.id,
      section_record.id,
      field_key_input,
      btrim(field_label_input),
      field_type_input,
      display_order_input,
      is_required_input,
      is_required_on_finalise_input,
      case when patient_visible_eligible_input then 'patient_facing_candidate' else 'clinical_internal' end,
      patient_visible_eligible_input,
      practitioner_only_input,
      coalesce(allowed_units_input, '{}'::text[]),
      auth.uid(),
      auth.uid(),
      jsonb_build_object('idempotency_key', idempotency_key_input)
    )
    returning id into saved_field_id;
  end if;

  perform public.touch_clinical_template_draft_state(version_record.id, idempotency_key_input);
  return saved_field_id;
end;
$$;

create or replace function public.upsert_clinical_template_field_option(
  target_template_version_id uuid,
  target_field_id uuid,
  option_id_input uuid default null,
  option_key_input text default null,
  option_label_input text default null,
  display_order_input integer default 1,
  is_default_input boolean default false,
  expected_lock_version integer default null,
  idempotency_key_input text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  version_record public.clinical_note_template_versions%rowtype;
  field_record public.clinical_template_fields%rowtype;
  existing_option public.clinical_template_field_options%rowtype;
  saved_option_id uuid;
begin
  select * into version_record from public.clinical_note_template_versions where id = target_template_version_id and deleted_at is null for update;
  if version_record.id is null or version_record.version_status <> 'draft' then
    raise exception 'Clinical template draft version not found';
  end if;
  if not public.has_clinical_template_management_permission(version_record.tenant_id, 'edit') then
    raise exception 'Not allowed to edit clinical template options';
  end if;
  select * into field_record from public.clinical_template_fields where id = target_field_id and clinical_note_template_version_id = target_template_version_id and deleted_at is null;
  if field_record.id is null then
    raise exception 'Clinical template field not found';
  end if;
  if not public.validate_clinical_template_stable_key(option_key_input) then
    raise exception 'Option key is invalid';
  end if;
  if nullif(btrim(option_label_input), '') is null then
    raise exception 'Option label is required';
  end if;
  if display_order_input <= 0 then
    raise exception 'Option display order must be positive';
  end if;

  if option_id_input is not null then
    select * into existing_option from public.clinical_template_field_options where id = option_id_input and clinical_note_template_version_id = target_template_version_id and deleted_at is null for update;
    if existing_option.id is null then
      raise exception 'Clinical template option not found';
    end if;
    if expected_lock_version is not null and existing_option.lock_version <> expected_lock_version then
      raise exception 'Clinical template option changed since it was loaded';
    end if;
    if existing_option.option_key <> option_key_input then
      raise exception 'Published-stable option keys cannot be changed through this draft editor operation';
    end if;

    update public.clinical_template_field_options
    set option_label = btrim(option_label_input),
        display_order = display_order_input,
        is_default = is_default_input
    where id = existing_option.id
    returning id into saved_option_id;
  else
    insert into public.clinical_template_field_options (
      tenant_id,
      clinical_note_template_version_id,
      clinical_template_field_id,
      option_key,
      option_label,
      display_order,
      is_default,
      metadata
    )
    values (
      version_record.tenant_id,
      version_record.id,
      field_record.id,
      option_key_input,
      btrim(option_label_input),
      display_order_input,
      is_default_input,
      jsonb_build_object('idempotency_key', idempotency_key_input)
    )
    returning id into saved_option_id;
  end if;

  perform public.touch_clinical_template_draft_state(version_record.id, idempotency_key_input);
  return saved_option_id;
end;
$$;

create or replace function public.upsert_clinical_template_validation_rule(
  target_template_version_id uuid,
  rule_id_input uuid default null,
  rule_key_input text default null,
  rule_type_input text default 'required',
  severity_input text default 'error',
  applies_on_input text default 'finalise',
  target_section_id uuid default null,
  target_field_id uuid default null,
  rule_config_input jsonb default '{}'::jsonb,
  message_input text default null,
  is_active_input boolean default true,
  expected_lock_version integer default null,
  idempotency_key_input text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  version_record public.clinical_note_template_versions%rowtype;
  section_record public.clinical_template_sections%rowtype;
  field_record public.clinical_template_fields%rowtype;
  existing_rule public.clinical_template_validation_rules%rowtype;
  saved_rule_id uuid;
begin
  select * into version_record from public.clinical_note_template_versions where id = target_template_version_id and deleted_at is null for update;
  if version_record.id is null or version_record.version_status <> 'draft' then
    raise exception 'Clinical template draft version not found';
  end if;
  if not public.has_clinical_template_management_permission(version_record.tenant_id, 'edit') then
    raise exception 'Not allowed to edit clinical template validation rules';
  end if;
  if not public.validate_clinical_template_stable_key(rule_key_input) then
    raise exception 'Validation rule key is invalid';
  end if;
  if jsonb_typeof(coalesce(rule_config_input, '{}'::jsonb)) <> 'object' then
    raise exception 'Validation rule configuration must be an object';
  end if;
  if target_section_id is null and target_field_id is null then
    raise exception 'Validation rules must target a section or field';
  end if;
  if target_section_id is not null then
    select * into section_record from public.clinical_template_sections where id = target_section_id and clinical_note_template_version_id = target_template_version_id and deleted_at is null;
    if section_record.id is null then
      raise exception 'Validation rule section target is invalid';
    end if;
  end if;
  if target_field_id is not null then
    select * into field_record from public.clinical_template_fields where id = target_field_id and clinical_note_template_version_id = target_template_version_id and deleted_at is null;
    if field_record.id is null then
      raise exception 'Validation rule field target is invalid';
    end if;
  end if;

  if rule_id_input is not null then
    select * into existing_rule from public.clinical_template_validation_rules where id = rule_id_input and clinical_note_template_version_id = target_template_version_id and deleted_at is null for update;
    if existing_rule.id is null then
      raise exception 'Clinical template validation rule not found';
    end if;
    if expected_lock_version is not null and existing_rule.lock_version <> expected_lock_version then
      raise exception 'Clinical template validation rule changed since it was loaded';
    end if;
    if existing_rule.rule_key <> rule_key_input then
      raise exception 'Published-stable validation rule keys cannot be changed through this draft editor operation';
    end if;
    update public.clinical_template_validation_rules
    set rule_type = rule_type_input,
        severity = severity_input,
        applies_on = applies_on_input,
        clinical_template_section_id = target_section_id,
        clinical_template_field_id = target_field_id,
        rule_config = coalesce(rule_config_input, '{}'::jsonb),
        message = nullif(message_input, ''),
        is_active = is_active_input
    where id = existing_rule.id
    returning id into saved_rule_id;
  else
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
    values (
      version_record.tenant_id,
      version_record.id,
      target_section_id,
      target_field_id,
      rule_key_input,
      rule_type_input,
      severity_input,
      applies_on_input,
      coalesce(rule_config_input, '{}'::jsonb),
      nullif(message_input, ''),
      is_active_input,
      jsonb_build_object('idempotency_key', idempotency_key_input)
    )
    returning id into saved_rule_id;
  end if;

  perform public.touch_clinical_template_draft_state(version_record.id, idempotency_key_input);
  return saved_rule_id;
end;
$$;

create or replace function public.upsert_clinical_template_calculation_rule(
  target_template_version_id uuid,
  calculation_rule_id_input uuid default null,
  target_field_id uuid default null,
  calculation_key_input text default null,
  calculation_type_input text default 'arithmetic',
  input_field_keys_input text[] default '{}'::text[],
  calculation_config_input jsonb default '{}'::jsonb,
  result_unit_input text default null,
  result_value_type_input text default 'decimal',
  is_required_for_finalise_input boolean default false,
  expected_lock_version integer default null,
  idempotency_key_input text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  version_record public.clinical_note_template_versions%rowtype;
  target_field public.clinical_template_fields%rowtype;
  existing_rule public.clinical_template_calculation_rules%rowtype;
  input_key text;
  saved_rule_id uuid;
begin
  select * into version_record from public.clinical_note_template_versions where id = target_template_version_id and deleted_at is null for update;
  if version_record.id is null or version_record.version_status <> 'draft' then
    raise exception 'Clinical template draft version not found';
  end if;
  if not public.has_clinical_template_management_permission(version_record.tenant_id, 'edit') then
    raise exception 'Not allowed to edit clinical template calculation rules';
  end if;
  if not public.validate_clinical_template_stable_key(calculation_key_input) then
    raise exception 'Calculation key is invalid';
  end if;
  if jsonb_typeof(coalesce(calculation_config_input, '{}'::jsonb)) <> 'object' then
    raise exception 'Calculation configuration must be an object';
  end if;
  select * into target_field from public.clinical_template_fields where id = target_field_id and clinical_note_template_version_id = target_template_version_id and deleted_at is null;
  if target_field.id is null then
    raise exception 'Calculation target field is invalid';
  end if;
  for input_key in select unnest(coalesce(input_field_keys_input, '{}'::text[])) loop
    if not exists (
      select 1
      from public.clinical_template_fields field_row
      where field_row.clinical_note_template_version_id = target_template_version_id
        and field_row.field_key = input_key
        and field_row.deleted_at is null
    ) then
      raise exception 'Calculation input field reference is invalid';
    end if;
  end loop;
  if target_field.field_key = any(coalesce(input_field_keys_input, '{}'::text[])) then
    raise exception 'Calculation cannot directly reference its output field';
  end if;

  if calculation_rule_id_input is not null then
    select * into existing_rule from public.clinical_template_calculation_rules where id = calculation_rule_id_input and clinical_note_template_version_id = target_template_version_id and deleted_at is null for update;
    if existing_rule.id is null then
      raise exception 'Clinical template calculation rule not found';
    end if;
    if expected_lock_version is not null and existing_rule.lock_version <> expected_lock_version then
      raise exception 'Clinical template calculation rule changed since it was loaded';
    end if;
    if existing_rule.calculation_key <> calculation_key_input then
      raise exception 'Published-stable calculation keys cannot be changed through this draft editor operation';
    end if;
    update public.clinical_template_calculation_rules
    set target_clinical_template_field_id = target_field_id,
        calculation_type = calculation_type_input,
        input_field_keys = coalesce(input_field_keys_input, '{}'::text[]),
        calculation_config = coalesce(calculation_config_input, '{}'::jsonb),
        result_unit = nullif(result_unit_input, ''),
        result_value_type = result_value_type_input,
        is_required_for_finalise = is_required_for_finalise_input
    where id = existing_rule.id
    returning id into saved_rule_id;
  else
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
    values (
      version_record.tenant_id,
      version_record.id,
      target_field_id,
      calculation_key_input,
      calculation_type_input,
      coalesce(input_field_keys_input, '{}'::text[]),
      coalesce(calculation_config_input, '{}'::jsonb),
      nullif(result_unit_input, ''),
      result_value_type_input,
      is_required_for_finalise_input,
      'draft',
      jsonb_build_object('idempotency_key', idempotency_key_input)
    )
    returning id into saved_rule_id;
  end if;

  update public.clinical_template_fields
  set is_calculated = true,
      is_read_only = true,
      updated_by_profile_id = auth.uid()
  where id = target_field_id;

  perform public.touch_clinical_template_draft_state(version_record.id, idempotency_key_input);
  return saved_rule_id;
end;
$$;

create or replace function public.run_clinical_template_validation(
  target_template_version_id uuid,
  validation_scope_input text default 'publish'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  version_record public.clinical_note_template_versions%rowtype;
  template_record public.clinical_note_templates%rowtype;
  result jsonb;
  errors jsonb := '[]'::jsonb;
  warnings jsonb := '[]'::jsonb;
  section_count integer := 0;
  field_count integer := 0;
  duplicate_section_key_count integer := 0;
  duplicate_field_key_count integer := 0;
  duplicate_option_key_count integer := 0;
  unsafe_patient_visible_count integer := 0;
  broken_calculation_count integer := 0;
  error_count integer := 0;
  warning_count integer := 0;
  status text;
begin
  select * into version_record from public.clinical_note_template_versions where id = target_template_version_id and deleted_at is null;
  if version_record.id is null then
    raise exception 'Clinical template version not found';
  end if;
  select * into template_record from public.clinical_note_templates where id = version_record.clinical_note_template_id and deleted_at is null;
  if template_record.id is null then
    raise exception 'Clinical template not found';
  end if;
  if not public.has_clinical_template_management_permission(version_record.tenant_id, 'edit') then
    raise exception 'Not allowed to validate this clinical template';
  end if;

  select count(*) into section_count from public.clinical_template_sections where clinical_note_template_version_id = version_record.id and deleted_at is null;
  select count(*) into field_count from public.clinical_template_fields where clinical_note_template_version_id = version_record.id and deleted_at is null and field_type not in ('heading', 'instruction', 'read_only_display');
  select count(*) into duplicate_section_key_count from (
    select lower(section_key) from public.clinical_template_sections where clinical_note_template_version_id = version_record.id and deleted_at is null group by lower(section_key) having count(*) > 1
  ) duplicate_sections;
  select count(*) into duplicate_field_key_count from (
    select lower(field_key) from public.clinical_template_fields where clinical_note_template_version_id = version_record.id and deleted_at is null group by lower(field_key) having count(*) > 1
  ) duplicate_fields;
  select count(*) into duplicate_option_key_count from (
    select clinical_template_field_id, lower(option_key) from public.clinical_template_field_options where clinical_note_template_version_id = version_record.id and deleted_at is null group by clinical_template_field_id, lower(option_key) having count(*) > 1
  ) duplicate_options;
  select count(*) into unsafe_patient_visible_count from public.clinical_template_fields where clinical_note_template_version_id = version_record.id and deleted_at is null and patient_visible_eligible = true and (practitioner_only = true or visibility_class = 'restricted_clinical' or is_internal_admin = true);
  select count(*) into broken_calculation_count
  from public.clinical_template_calculation_rules calculation
  where calculation.clinical_note_template_version_id = version_record.id
    and calculation.deleted_at is null
    and exists (
      select 1
      from unnest(calculation.input_field_keys) input_key
      where not exists (
        select 1 from public.clinical_template_fields field_row
        where field_row.clinical_note_template_version_id = version_record.id
          and field_row.field_key = input_key
          and field_row.deleted_at is null
      )
    );

  if nullif(btrim(template_record.name), '') is null then
    errors := errors || jsonb_build_array('Template name is required');
  end if;
  if not public.validate_clinical_template_stable_key(template_record.template_key) then
    errors := errors || jsonb_build_array('Template key is invalid');
  end if;
  if section_count = 0 then
    errors := errors || jsonb_build_array('At least one section is required');
  end if;
  if field_count = 0 then
    errors := errors || jsonb_build_array('At least one meaningful documentation field is required');
  end if;
  if duplicate_section_key_count > 0 then
    errors := errors || jsonb_build_array('Duplicate section keys are not allowed');
  end if;
  if duplicate_field_key_count > 0 then
    errors := errors || jsonb_build_array('Duplicate field keys are not allowed');
  end if;
  if duplicate_option_key_count > 0 then
    errors := errors || jsonb_build_array('Duplicate option keys are not allowed within a field');
  end if;
  if unsafe_patient_visible_count > 0 then
    errors := errors || jsonb_build_array('Patient-visible eligibility is unsafe for one or more fields');
  end if;
  if broken_calculation_count > 0 then
    errors := errors || jsonb_build_array('One or more calculation rules reference missing fields');
  end if;

  error_count := jsonb_array_length(errors);
  warning_count := jsonb_array_length(warnings);
  status := case when error_count > 0 then 'invalid' when warning_count > 0 then 'warning' else 'valid' end;
  result := jsonb_build_object('valid', error_count = 0, 'status', status, 'errors', errors, 'warnings', warnings);

  insert into public.clinical_template_validation_results (
    tenant_id,
    clinical_note_template_id,
    clinical_note_template_version_id,
    validation_status,
    validation_scope,
    finding_count,
    error_count,
    warning_count,
    info_count,
    findings,
    validated_by_profile_id,
    template_lock_version,
    version_lock_version,
    metadata
  )
  values (
    version_record.tenant_id,
    template_record.id,
    version_record.id,
    status,
    coalesce(nullif(validation_scope_input, ''), 'publish'),
    error_count + warning_count,
    error_count,
    warning_count,
    0,
    jsonb_build_array(jsonb_build_object('errors', errors, 'warnings', warnings)),
    auth.uid(),
    template_record.lock_version,
    version_record.lock_version,
    '{}'::jsonb
  );

  update public.clinical_note_template_versions
  set validation_status = status,
      publication_ready = (error_count = 0),
      updated_by_profile_id = auth.uid()
  where id = version_record.id;

  perform public.touch_clinical_template_draft_state(version_record.id, null);

  if error_count > 0 then
    insert into public.clinical_workflow_events (tenant_id, event_type, event_key, metadata)
    values (
      version_record.tenant_id,
      'clinical_template_validation_failed',
      'clinical_template_validation_failed:' || version_record.id::text || ':' || extract(epoch from now())::text,
      jsonb_build_object('clinical_note_template_id', template_record.id, 'clinical_note_template_version_id', version_record.id, 'error_count', error_count)
    );
  end if;

  return result;
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
  latest_validation public.clinical_template_validation_results%rowtype;
  review_required boolean;
begin
  select * into version_record from public.clinical_note_template_versions where id = target_template_version_id and deleted_at is null for update;
  if version_record.id is null then
    raise exception 'Clinical template version not found';
  end if;
  select * into template_record from public.clinical_note_templates where id = version_record.clinical_note_template_id and deleted_at is null for update;
  if template_record.id is null then
    raise exception 'Clinical template not found';
  end if;
  if version_record.tenant_id is null then
    if not public.is_super_admin() then
      raise exception 'Only Super Admin can publish system clinical templates';
    end if;
  elsif not public.has_clinical_template_management_permission(version_record.tenant_id, 'publish') then
    raise exception 'Not allowed to publish clinical templates for this tenant';
  end if;
  if version_record.version_status <> 'draft' then
    raise exception 'Only draft clinical template versions can be published';
  end if;

  validation_result := public.run_clinical_template_validation(target_template_version_id, 'publish');
  if coalesce((validation_result ->> 'valid')::boolean, false) is not true then
    raise exception 'Clinical template version is not ready to publish: %', validation_result -> 'errors';
  end if;

  select * into latest_validation
  from public.clinical_template_validation_results
  where clinical_note_template_version_id = target_template_version_id
    and deleted_at is null
  order by validated_at desc
  limit 1;

  if latest_validation.version_lock_version is distinct from version_record.lock_version then
    raise exception 'Clinical template version changed after validation; rerun validation before publishing';
  end if;

  review_required := coalesce((template_record.metadata ->> 'review_required')::boolean, false);
  if review_required and version_record.review_status <> 'approved' then
    raise exception 'Clinical template review approval is required before publication';
  end if;

  update public.clinical_note_template_versions
  set version_status = 'active',
      published_at = now(),
      published_by_profile_id = auth.uid(),
      validation_status = 'valid',
      publication_ready = true,
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

  update public.clinical_template_draft_states
  set draft_status = 'published',
      publication_ready = true,
      updated_at = now()
  where clinical_note_template_version_id = target_template_version_id
    and deleted_at is null;

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
      'clinical_template_version_published',
      'clinical_template_version_published:' || target_template_version_id::text,
      jsonb_build_object('clinical_note_template_id', template_record.id, 'clinical_note_template_version_id', target_template_version_id)
    )
    on conflict (tenant_id, event_key) where event_key is not null and deleted_at is null do nothing;
  end if;

  return target_template_version_id;
end;
$$;

create or replace function public.duplicate_clinical_template(
  source_template_version_id uuid,
  target_tenant_id uuid,
  new_template_key_input text,
  new_template_name_input text,
  idempotency_key_input text default null
)
returns table(clinical_note_template_id uuid, clinical_note_template_version_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  source_version public.clinical_note_template_versions%rowtype;
  source_template public.clinical_note_templates%rowtype;
  existing_template_id uuid;
  existing_version_id uuid;
  request_fingerprint text;
  existing_fingerprint text;
  new_template_id uuid;
  new_version_id uuid;
begin
  select * into source_version from public.clinical_note_template_versions where id = source_template_version_id and deleted_at is null;
  if source_version.id is null then
    raise exception 'Source clinical template version not found';
  end if;
  select * into source_template from public.clinical_note_templates where id = source_version.clinical_note_template_id and deleted_at is null;
  if source_template.id is null then
    raise exception 'Source clinical template not found';
  end if;
  if source_template.tenant_id is not null and source_template.tenant_id <> target_tenant_id then
    raise exception 'Cross-tenant tenant-template duplication is not supported';
  end if;
  if not public.has_clinical_template_management_permission(target_tenant_id, 'duplicate') then
    raise exception 'Not allowed to duplicate clinical templates for this tenant';
  end if;
  if source_template.tenant_id is null and source_template.is_system_template is not true then
    raise exception 'Invalid system template source';
  end if;
  if not public.validate_clinical_template_stable_key(new_template_key_input) then
    raise exception 'New template key is invalid';
  end if;
  if nullif(btrim(new_template_name_input), '') is null then
    raise exception 'New template name is required';
  end if;

  request_fingerprint := md5(jsonb_build_object(
    'source_template_version_id', source_template_version_id,
    'target_tenant_id', target_tenant_id,
    'new_template_key_input', new_template_key_input,
    'new_template_name_input', btrim(new_template_name_input)
  )::text);

  if idempotency_key_input is not null then
    perform pg_advisory_xact_lock(hashtextextended(target_tenant_id::text || ':clinical-template-duplicate:' || idempotency_key_input, 0));
    select template.id, version.id, template.metadata ->> 'request_fingerprint'
    into existing_template_id, existing_version_id, existing_fingerprint
    from public.clinical_note_templates template
    join public.clinical_note_template_versions version on version.clinical_note_template_id = template.id and version.version_number = 1 and version.deleted_at is null
    where template.tenant_id = target_tenant_id
      and template.metadata ->> 'idempotency_key' = idempotency_key_input
      and template.deleted_at is null
    limit 1;
    if existing_template_id is not null then
      if existing_fingerprint is distinct from request_fingerprint then
        raise exception 'Clinical template duplication idempotency key was reused with different request details';
      end if;
      return query select existing_template_id, existing_version_id;
      return;
    end if;
  end if;

  insert into public.clinical_note_templates (
    tenant_id, template_key, name, description, discipline_tags, template_status, template_owner_type, is_system_template, created_by_profile_id, updated_by_profile_id, metadata
  )
  values (
    target_tenant_id, new_template_key_input, btrim(new_template_name_input), source_template.description, source_template.discipline_tags, 'draft', 'tenant', false, auth.uid(), auth.uid(),
    jsonb_build_object('source_template_id', source_template.id, 'source_template_version_id', source_version.id, 'idempotency_key', idempotency_key_input, 'request_fingerprint', request_fingerprint)
  )
  returning id into new_template_id;

  insert into public.clinical_note_template_versions (
    tenant_id, clinical_note_template_id, version_number, version_status, template_schema, default_structured_content, default_free_text, required_fields, visibility_default, release_notes, source_template_version_id, created_by_profile_id, updated_by_profile_id, metadata
  )
  values (
    target_tenant_id, new_template_id, 1, 'draft', source_version.template_schema, source_version.default_structured_content, source_version.default_free_text, source_version.required_fields, source_version.visibility_default, 'Duplicated from template ' || source_template.template_key, source_version.id, auth.uid(), auth.uid(),
    jsonb_build_object('source_template_version_id', source_version.id, 'duplicated_at', now())
  )
  returning id into new_version_id;

  insert into public.clinical_template_sections (
    tenant_id, clinical_note_template_version_id, section_key, section_label, description, help_text, display_order, section_type, is_repeating, min_repeats, max_repeats, visibility_class, patient_visible_eligible, practitioner_only, is_internal_admin, default_collapsed, visibility_rules, required_rules, metadata, created_by_profile_id, updated_by_profile_id, patient_facing_label, patient_facing_description
  )
  select target_tenant_id, new_version_id, section_key, section_label, description, help_text, display_order, section_type, is_repeating, min_repeats, max_repeats, visibility_class, patient_visible_eligible, practitioner_only, is_internal_admin, default_collapsed, visibility_rules, required_rules, metadata || jsonb_build_object('source_section_id', id), auth.uid(), auth.uid(), patient_facing_label, patient_facing_description
  from public.clinical_template_sections
  where clinical_note_template_version_id = source_version.id and deleted_at is null;

  insert into public.clinical_template_fields (
    tenant_id, clinical_note_template_version_id, clinical_template_section_id, field_key, field_label, field_type, display_order, help_text, placeholder, default_value, field_config, validation_config, visibility_rules, required_rules, allowed_units, is_required, is_required_on_finalise, is_read_only, is_calculated, is_repeating, visibility_class, patient_visible_eligible, practitioner_only, is_internal_admin, stable_identity_key, metadata, created_by_profile_id, updated_by_profile_id, patient_facing_label, patient_facing_description
  )
  select target_tenant_id, new_version_id, new_section.id, source_field.field_key, source_field.field_label, source_field.field_type, source_field.display_order, source_field.help_text, source_field.placeholder, source_field.default_value, source_field.field_config, source_field.validation_config, source_field.visibility_rules, source_field.required_rules, source_field.allowed_units, source_field.is_required, source_field.is_required_on_finalise, source_field.is_read_only, source_field.is_calculated, source_field.is_repeating, source_field.visibility_class, source_field.patient_visible_eligible, source_field.practitioner_only, source_field.is_internal_admin, source_field.stable_identity_key, source_field.metadata || jsonb_build_object('source_field_id', source_field.id), auth.uid(), auth.uid(), source_field.patient_facing_label, source_field.patient_facing_description
  from public.clinical_template_fields source_field
  join public.clinical_template_sections source_section on source_section.id = source_field.clinical_template_section_id
  join public.clinical_template_sections new_section on new_section.clinical_note_template_version_id = new_version_id and new_section.metadata ->> 'source_section_id' = source_section.id::text and new_section.deleted_at is null
  where source_field.clinical_note_template_version_id = source_version.id and source_field.deleted_at is null;

  insert into public.clinical_template_field_options (
    tenant_id, clinical_note_template_version_id, clinical_template_field_id, option_key, option_label, option_value, display_order, is_default, patient_visible_eligible, metadata
  )
  select target_tenant_id, new_version_id, new_field.id, source_option.option_key, source_option.option_label, source_option.option_value, source_option.display_order, source_option.is_default, source_option.patient_visible_eligible, source_option.metadata || jsonb_build_object('source_option_id', source_option.id)
  from public.clinical_template_field_options source_option
  join public.clinical_template_fields new_field on new_field.clinical_note_template_version_id = new_version_id and new_field.metadata ->> 'source_field_id' = source_option.clinical_template_field_id::text and new_field.deleted_at is null
  where source_option.clinical_note_template_version_id = source_version.id and source_option.deleted_at is null;

  insert into public.clinical_template_validation_rules (
    tenant_id, clinical_note_template_version_id, clinical_template_section_id, clinical_template_field_id, rule_key, rule_type, severity, applies_on, rule_config, message, is_active, metadata
  )
  select target_tenant_id, new_version_id, new_section.id, new_field.id, source_rule.rule_key, source_rule.rule_type, source_rule.severity, source_rule.applies_on, source_rule.rule_config, source_rule.message, source_rule.is_active, source_rule.metadata || jsonb_build_object('source_validation_rule_id', source_rule.id)
  from public.clinical_template_validation_rules source_rule
  left join public.clinical_template_sections new_section on new_section.clinical_note_template_version_id = new_version_id and new_section.metadata ->> 'source_section_id' = source_rule.clinical_template_section_id::text and new_section.deleted_at is null
  left join public.clinical_template_fields new_field on new_field.clinical_note_template_version_id = new_version_id and new_field.metadata ->> 'source_field_id' = source_rule.clinical_template_field_id::text and new_field.deleted_at is null
  where source_rule.clinical_note_template_version_id = source_version.id and source_rule.deleted_at is null;

  insert into public.clinical_template_calculation_rules (
    tenant_id, clinical_note_template_version_id, target_clinical_template_field_id, calculation_key, calculation_type, input_field_keys, calculation_config, result_unit, result_value_type, is_required_for_finalise, calculation_status, metadata
  )
  select target_tenant_id, new_version_id, new_field.id, source_calculation.calculation_key, source_calculation.calculation_type, source_calculation.input_field_keys, source_calculation.calculation_config, source_calculation.result_unit, source_calculation.result_value_type, source_calculation.is_required_for_finalise, 'draft', source_calculation.metadata || jsonb_build_object('source_calculation_rule_id', source_calculation.id)
  from public.clinical_template_calculation_rules source_calculation
  join public.clinical_template_fields new_field on new_field.clinical_note_template_version_id = new_version_id and new_field.metadata ->> 'source_field_id' = source_calculation.target_clinical_template_field_id::text and new_field.deleted_at is null
  where source_calculation.clinical_note_template_version_id = source_version.id and source_calculation.deleted_at is null;

  perform public.touch_clinical_template_draft_state(new_version_id, idempotency_key_input);

  insert into public.audit_events (tenant_id, actor_profile_id, action, entity_table, entity_id, metadata)
  values (target_tenant_id, auth.uid(), 'clinical_template_duplicated', 'clinical_note_templates', new_template_id, jsonb_build_object('source_template_id', source_template.id, 'source_template_version_id', source_version.id));

  return query select new_template_id, new_version_id;
end;
$$;

create or replace function public.upsert_clinical_template_assignment(
  target_template_version_id uuid,
  assignment_id_input uuid default null,
  assignment_scope_input text default 'tenant',
  discipline_input text default null,
  encounter_type_input text default null,
  session_type_input text default null,
  practice_location_id_input uuid default null,
  therapist_profile_id_input uuid default null,
  is_default_input boolean default false,
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
  version_record public.clinical_note_template_versions%rowtype;
  existing_assignment public.clinical_template_assignments%rowtype;
  saved_assignment_id uuid;
begin
  select * into version_record from public.clinical_note_template_versions where id = target_template_version_id and deleted_at is null;
  if version_record.id is null or version_record.version_status <> 'active' then
    raise exception 'Only active published clinical template versions can be assigned';
  end if;
  if not public.has_clinical_template_management_permission(version_record.tenant_id, 'assign') then
    raise exception 'Not allowed to manage clinical template assignments';
  end if;
  if effective_from_input is not null and effective_until_input is not null and effective_from_input > effective_until_input then
    raise exception 'Assignment effective dates are invalid';
  end if;
  if assignment_priority_input <= 0 then
    raise exception 'Assignment priority must be positive';
  end if;

  if assignment_id_input is not null then
    select * into existing_assignment from public.clinical_template_assignments where id = assignment_id_input and tenant_id = version_record.tenant_id and deleted_at is null for update;
    if existing_assignment.id is null then
      raise exception 'Clinical template assignment not found';
    end if;
    if expected_lock_version is not null and existing_assignment.lock_version <> expected_lock_version then
      raise exception 'Clinical template assignment changed since it was loaded';
    end if;
    update public.clinical_template_assignments
    set assignment_scope = assignment_scope_input,
        clinical_note_template_version_id = version_record.id,
        discipline = discipline_input,
        encounter_type = encounter_type_input,
        session_type = session_type_input,
        practice_location_id = practice_location_id_input,
        therapist_profile_id = therapist_profile_id_input,
        is_default = is_default_input,
        assignment_priority = assignment_priority_input,
        effective_from = effective_from_input,
        effective_until = effective_until_input,
        assigned_by_profile_id = auth.uid()
    where id = existing_assignment.id
    returning id into saved_assignment_id;
  else
    insert into public.clinical_template_assignments (
      tenant_id, clinical_note_template_id, clinical_note_template_version_id, assignment_scope, discipline, encounter_type, session_type, practice_location_id, therapist_profile_id, is_default, is_active, assignment_priority, effective_from, effective_until, assigned_by_profile_id, metadata
    )
    values (
      version_record.tenant_id, version_record.clinical_note_template_id, version_record.id, assignment_scope_input, discipline_input, encounter_type_input, session_type_input, practice_location_id_input, therapist_profile_id_input, is_default_input, true, assignment_priority_input, effective_from_input, effective_until_input, auth.uid(), '{}'::jsonb
    )
    returning id into saved_assignment_id;
  end if;

  insert into public.audit_events (tenant_id, actor_profile_id, action, entity_table, entity_id, metadata)
  values (version_record.tenant_id, auth.uid(), 'clinical_template_assignment_changed', 'clinical_template_assignments', saved_assignment_id, jsonb_build_object('clinical_note_template_version_id', version_record.id));

  insert into public.clinical_workflow_events (tenant_id, event_type, event_key, metadata)
  values (
    version_record.tenant_id,
    'clinical_template_assignment_changed',
    'clinical_template_assignment_changed:' || saved_assignment_id::text || ':' || extract(epoch from now())::text,
    jsonb_build_object('clinical_template_assignment_id', saved_assignment_id, 'clinical_note_template_version_id', version_record.id)
  );

  return saved_assignment_id;
end;
$$;

create or replace view public.clinical_template_usage_summary
with (security_invoker = true)
as
select
  template.tenant_id,
  template.id as clinical_note_template_id,
  version.id as clinical_note_template_version_id,
  template.template_key,
  template.name,
  version.version_number,
  version.version_status,
  count(distinct note.id) as note_count,
  min(note.created_at) as first_used_at,
  max(note.created_at) as last_used_at,
  count(distinct assignment.id) filter (where assignment.is_active = true and assignment.deleted_at is null) as active_assignment_count
from public.clinical_note_templates template
join public.clinical_note_template_versions version
  on version.clinical_note_template_id = template.id
 and version.deleted_at is null
left join public.clinical_note_versions note_version
  on note_version.clinical_note_template_version_id = version.id
 and note_version.deleted_at is null
left join public.clinical_notes note
  on note.id = note_version.clinical_note_id
 and note.deleted_at is null
left join public.clinical_template_assignments assignment
  on assignment.clinical_note_template_version_id = version.id
 and assignment.deleted_at is null
where template.deleted_at is null
group by template.tenant_id, template.id, version.id, template.template_key, template.name, version.version_number, version.version_status;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'clinical_note_templates',
    'clinical_note_template_versions',
    'clinical_template_sections',
    'clinical_template_fields',
    'clinical_template_field_options',
    'clinical_template_validation_rules',
    'clinical_template_calculation_rules',
    'clinical_template_assignments'
  ] loop
    execute format('drop trigger if exists %I on public.%I', target_table || '_increment_template_lock_version', target_table);
    execute format('create trigger %I before update on public.%I for each row execute function public.increment_clinical_template_lock_version()', target_table || '_increment_template_lock_version', target_table);
  end loop;
end $$;

create trigger clinical_template_draft_states_set_updated_at before update on public.clinical_template_draft_states for each row execute function public.set_updated_at();
create trigger clinical_template_review_requests_set_updated_at before update on public.clinical_template_review_requests for each row execute function public.set_updated_at();
create trigger clinical_template_validation_results_set_updated_at before update on public.clinical_template_validation_results for each row execute function public.set_updated_at();
create trigger clinical_template_usage_snapshots_set_updated_at before update on public.clinical_template_usage_snapshots for each row execute function public.set_updated_at();

alter table public.clinical_template_draft_states enable row level security;
alter table public.clinical_template_review_requests enable row level security;
alter table public.clinical_template_validation_results enable row level security;
alter table public.clinical_template_usage_snapshots enable row level security;

create policy "tenant clinical template managers can read draft states"
on public.clinical_template_draft_states
for select
to authenticated
using (deleted_at is null and (tenant_id is null or public.has_clinical_template_management_permission(tenant_id, 'view')));

create policy "tenant clinical template managers can read review requests"
on public.clinical_template_review_requests
for select
to authenticated
using (deleted_at is null and (tenant_id is null or public.has_clinical_template_management_permission(tenant_id, 'view')));

create policy "tenant clinical template managers can read validation results"
on public.clinical_template_validation_results
for select
to authenticated
using (deleted_at is null and (tenant_id is null or public.has_clinical_template_management_permission(tenant_id, 'view')));

create policy "tenant clinical template managers can read usage snapshots"
on public.clinical_template_usage_snapshots
for select
to authenticated
using (deleted_at is null and (tenant_id is null or public.has_clinical_template_management_permission(tenant_id, 'usage')));

revoke all on table public.clinical_template_draft_states from anon, authenticated;
revoke all on table public.clinical_template_review_requests from anon, authenticated;
revoke all on table public.clinical_template_validation_results from anon, authenticated;
revoke all on table public.clinical_template_usage_snapshots from anon, authenticated;
revoke all on public.clinical_template_usage_summary from anon, authenticated;

grant select on table public.clinical_template_draft_states to authenticated;
grant select on table public.clinical_template_review_requests to authenticated;
grant select on table public.clinical_template_validation_results to authenticated;
grant select on table public.clinical_template_usage_snapshots to authenticated;
grant select on public.clinical_template_usage_summary to authenticated;

-- Phase 6C moves template-authoring mutations behind protected RPCs. The
-- clinical workspace still needs read access to render published templates.
revoke insert, update, delete on table public.clinical_note_templates from authenticated;
revoke insert, update, delete on table public.clinical_note_template_versions from authenticated;
revoke insert, update, delete on table public.clinical_template_sections from authenticated;
revoke insert, update, delete on table public.clinical_template_fields from authenticated;
revoke insert, update, delete on table public.clinical_template_field_options from authenticated;
revoke insert, update, delete on table public.clinical_template_validation_rules from authenticated;
revoke insert, update, delete on table public.clinical_template_calculation_rules from authenticated;
revoke insert, update, delete on table public.clinical_template_assignments from authenticated;

grant select on table public.clinical_note_templates to authenticated;
grant select on table public.clinical_note_template_versions to authenticated;
grant select on table public.clinical_template_sections to authenticated;
grant select on table public.clinical_template_fields to authenticated;
grant select on table public.clinical_template_field_options to authenticated;
grant select on table public.clinical_template_validation_rules to authenticated;
grant select on table public.clinical_template_calculation_rules to authenticated;
grant select on table public.clinical_template_assignments to authenticated;

revoke all on function public.increment_clinical_template_lock_version() from public, anon;
revoke all on function public.assert_clinical_template_version_is_draft(uuid) from public, anon;
revoke all on function public.has_clinical_template_management_permission(uuid, text) from public, anon;
revoke all on function public.validate_clinical_template_stable_key(text) from public, anon;
revoke all on function public.validate_clinical_template_visibility_rule_references(uuid, jsonb) from public, anon;
revoke all on function public.touch_clinical_template_draft_state(uuid, text) from public, anon;
revoke all on function public.create_clinical_template_draft(uuid, text, text, text, text[], text, text) from public, anon;
revoke all on function public.update_clinical_template_draft_metadata(uuid, text, text, text[], text, integer, integer, text) from public, anon;
revoke all on function public.upsert_clinical_template_section(uuid, uuid, text, text, integer, text, boolean, boolean, integer, text) from public, anon;
revoke all on function public.upsert_clinical_template_field(uuid, uuid, uuid, text, text, text, integer, boolean, boolean, boolean, boolean, text[], integer, text) from public, anon;
revoke all on function public.upsert_clinical_template_field_option(uuid, uuid, uuid, text, text, integer, boolean, integer, text) from public, anon;
revoke all on function public.upsert_clinical_template_validation_rule(uuid, uuid, text, text, text, text, uuid, uuid, jsonb, text, boolean, integer, text) from public, anon;
revoke all on function public.upsert_clinical_template_calculation_rule(uuid, uuid, uuid, text, text, text[], jsonb, text, text, boolean, integer, text) from public, anon;
revoke all on function public.run_clinical_template_validation(uuid, text) from public, anon;
revoke all on function public.publish_clinical_template_version(uuid) from public, anon;
revoke all on function public.duplicate_clinical_template(uuid, uuid, text, text, text) from public, anon;
revoke all on function public.upsert_clinical_template_assignment(uuid, uuid, text, text, text, text, uuid, uuid, boolean, integer, date, date, integer) from public, anon;

grant execute on function public.has_clinical_template_management_permission(uuid, text) to authenticated;
grant execute on function public.validate_clinical_template_stable_key(text) to authenticated;
grant execute on function public.validate_clinical_template_visibility_rule_references(uuid, jsonb) to authenticated;
grant execute on function public.create_clinical_template_draft(uuid, text, text, text, text[], text, text) to authenticated;
grant execute on function public.update_clinical_template_draft_metadata(uuid, text, text, text[], text, integer, integer, text) to authenticated;
grant execute on function public.upsert_clinical_template_section(uuid, uuid, text, text, integer, text, boolean, boolean, integer, text) to authenticated;
grant execute on function public.upsert_clinical_template_field(uuid, uuid, uuid, text, text, text, integer, boolean, boolean, boolean, boolean, text[], integer, text) to authenticated;
grant execute on function public.upsert_clinical_template_field_option(uuid, uuid, uuid, text, text, integer, boolean, integer, text) to authenticated;
grant execute on function public.upsert_clinical_template_validation_rule(uuid, uuid, text, text, text, text, uuid, uuid, jsonb, text, boolean, integer, text) to authenticated;
grant execute on function public.upsert_clinical_template_calculation_rule(uuid, uuid, uuid, text, text, text[], jsonb, text, text, boolean, integer, text) to authenticated;
grant execute on function public.run_clinical_template_validation(uuid, text) to authenticated;
grant execute on function public.publish_clinical_template_version(uuid) to authenticated;
grant execute on function public.duplicate_clinical_template(uuid, uuid, text, text, text) to authenticated;
grant execute on function public.upsert_clinical_template_assignment(uuid, uuid, text, text, text, text, uuid, uuid, boolean, integer, date, date, integer) to authenticated;

comment on table public.clinical_template_draft_states is
  'Phase 6C template-authoring draft state, concurrency, validation and review metadata. Contains no clinical response content.';

comment on table public.clinical_template_review_requests is
  'Lightweight clinical template review workflow for draft template versions. Approval is template metadata only.';

comment on table public.clinical_template_validation_results is
  'Deterministic template validation findings for draft publication readiness. Findings must not contain clinical response content.';

comment on view public.clinical_template_usage_summary is
  'Safe aggregate clinical template usage metadata. Does not expose note content or structured response values.';

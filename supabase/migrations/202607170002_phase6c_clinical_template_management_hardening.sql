-- Phase 6C Step 4: Clinical Template Management hardening.
-- Forward-only migration. This migration tightens template integrity around
-- stable keys, compatible field option usage, scoped assignments, and publish validation.

create unique index if not exists clinical_template_sections_version_key_unique_active
  on public.clinical_template_sections (clinical_note_template_version_id, lower(section_key))
  where deleted_at is null;

create unique index if not exists clinical_template_fields_version_key_unique_active
  on public.clinical_template_fields (clinical_note_template_version_id, lower(field_key))
  where deleted_at is null;

create unique index if not exists clinical_template_field_options_field_key_unique_active
  on public.clinical_template_field_options (clinical_template_field_id, lower(option_key))
  where deleted_at is null;

create unique index if not exists clinical_template_validation_rules_version_key_unique_active
  on public.clinical_template_validation_rules (clinical_note_template_version_id, lower(rule_key))
  where deleted_at is null;

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
  select *
  into version_record
  from public.clinical_note_template_versions
  where id = target_template_version_id
    and deleted_at is null
  for update;

  if version_record.id is null or version_record.version_status <> 'draft' then
    raise exception 'Clinical template draft version not found';
  end if;

  if not public.has_clinical_template_management_permission(version_record.tenant_id, 'edit') then
    raise exception 'Not allowed to edit clinical template fields';
  end if;

  select *
  into section_record
  from public.clinical_template_sections
  where id = target_section_id
    and clinical_note_template_version_id = target_template_version_id
    and deleted_at is null;

  if section_record.id is null then
    raise exception 'Clinical template section not found';
  end if;

  if not public.validate_clinical_template_stable_key(field_key_input) then
    raise exception 'Field key is invalid';
  end if;

  if nullif(btrim(field_label_input), '') is null then
    raise exception 'Field label is required';
  end if;

  if coalesce(field_type_input, '') not in (
    'short_text',
    'long_text',
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
    'heading',
    'instruction'
  ) then
    raise exception 'This field type is not supported by the safe clinical template editor yet';
  end if;

  if display_order_input <= 0 then
    raise exception 'Field display order must be positive';
  end if;

  if patient_visible_eligible_input = true and practitioner_only_input = true then
    raise exception 'Practitioner-only fields cannot be patient-visible eligible';
  end if;

  if exists (
    select 1
    from public.clinical_template_fields duplicate_field
    where duplicate_field.clinical_note_template_version_id = target_template_version_id
      and duplicate_field.deleted_at is null
      and lower(duplicate_field.field_key) = lower(field_key_input)
      and (field_id_input is null or duplicate_field.id <> field_id_input)
  ) then
    raise exception 'Duplicate field keys are not allowed within a clinical template version';
  end if;

  if field_id_input is not null then
    select *
    into existing_field
    from public.clinical_template_fields
    where id = field_id_input
      and clinical_note_template_version_id = target_template_version_id
      and deleted_at is null
    for update;

    if existing_field.id is null then
      raise exception 'Clinical template field not found';
    end if;
    if expected_lock_version is not null and existing_field.lock_version <> expected_lock_version then
      raise exception 'Clinical template field changed since it was loaded';
    end if;
    if existing_field.field_key <> field_key_input then
      raise exception 'Published-stable field keys cannot be changed through this draft editor operation';
    end if;
    if existing_field.field_type <> field_type_input then
      raise exception 'Field type changes are not allowed after creation; create a new field to avoid incompatible options or rules';
    end if;

    update public.clinical_template_fields
    set field_label = btrim(field_label_input),
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
  select *
  into version_record
  from public.clinical_note_template_versions
  where id = target_template_version_id
    and deleted_at is null
  for update;

  if version_record.id is null or version_record.version_status <> 'draft' then
    raise exception 'Clinical template draft version not found';
  end if;
  if not public.has_clinical_template_management_permission(version_record.tenant_id, 'edit') then
    raise exception 'Not allowed to edit clinical template options';
  end if;

  select *
  into field_record
  from public.clinical_template_fields
  where id = target_field_id
    and clinical_note_template_version_id = target_template_version_id
    and deleted_at is null;

  if field_record.id is null then
    raise exception 'Clinical template field not found';
  end if;

  if field_record.field_type not in ('single_choice', 'multiple_choice', 'checklist', 'scale', 'laterality', 'body_area') then
    raise exception 'Options can only be managed for choice, checklist, scale, laterality and body-area fields';
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

  if exists (
    select 1
    from public.clinical_template_field_options duplicate_option
    where duplicate_option.clinical_template_field_id = target_field_id
      and duplicate_option.deleted_at is null
      and lower(duplicate_option.option_key) = lower(option_key_input)
      and (option_id_input is null or duplicate_option.id <> option_id_input)
  ) then
    raise exception 'Duplicate option keys are not allowed within a field';
  end if;

  if option_id_input is not null then
    select *
    into existing_option
    from public.clinical_template_field_options
    where id = option_id_input
      and clinical_note_template_version_id = target_template_version_id
      and deleted_at is null
    for update;

    if existing_option.id is null then
      raise exception 'Clinical template option not found';
    end if;
    if expected_lock_version is not null and existing_option.lock_version <> expected_lock_version then
      raise exception 'Clinical template option changed since it was loaded';
    end if;
    if existing_option.clinical_template_field_id <> target_field_id then
      raise exception 'Clinical template options cannot be moved between fields';
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
  select *
  into version_record
  from public.clinical_note_template_versions
  where id = target_template_version_id
    and deleted_at is null
  for update;

  if version_record.id is null or version_record.version_status <> 'draft' then
    raise exception 'Clinical template draft version not found';
  end if;
  if not public.has_clinical_template_management_permission(version_record.tenant_id, 'edit') then
    raise exception 'Not allowed to edit clinical template validation rules';
  end if;
  if not public.validate_clinical_template_stable_key(rule_key_input) then
    raise exception 'Validation rule key is invalid';
  end if;
  if rule_type_input not in ('required', 'character_limit', 'numeric_range', 'allowed_units', 'allowed_options', 'date_restriction', 'conditional_required', 'finalisation_requirement') then
    raise exception 'Validation rule type is not supported';
  end if;
  if severity_input not in ('info', 'warning', 'error', 'blocking') then
    raise exception 'Validation rule severity is invalid';
  end if;
  if applies_on_input not in ('draft_save', 'finalise', 'sign', 'patient_publish') then
    raise exception 'Validation rule stage is invalid';
  end if;
  if jsonb_typeof(coalesce(rule_config_input, '{}'::jsonb)) <> 'object' then
    raise exception 'Validation rule configuration must be an object';
  end if;
  if target_section_id is null and target_field_id is null then
    raise exception 'Validation rules must target a section or field';
  end if;

  if exists (
    select 1
    from public.clinical_template_validation_rules duplicate_rule
    where duplicate_rule.clinical_note_template_version_id = target_template_version_id
      and duplicate_rule.deleted_at is null
      and lower(duplicate_rule.rule_key) = lower(rule_key_input)
      and (rule_id_input is null or duplicate_rule.id <> rule_id_input)
  ) then
    raise exception 'Duplicate validation rule keys are not allowed within a clinical template version';
  end if;

  if target_section_id is not null then
    select *
    into section_record
    from public.clinical_template_sections
    where id = target_section_id
      and clinical_note_template_version_id = target_template_version_id
      and deleted_at is null;
    if section_record.id is null then
      raise exception 'Validation rule section target is invalid';
    end if;
  end if;

  if target_field_id is not null then
    select *
    into field_record
    from public.clinical_template_fields
    where id = target_field_id
      and clinical_note_template_version_id = target_template_version_id
      and deleted_at is null;
    if field_record.id is null then
      raise exception 'Validation rule field target is invalid';
    end if;
  end if;

  if target_field_id is not null then
    if rule_type_input = 'numeric_range' and field_record.field_type not in ('number', 'decimal', 'measurement', 'scale') then
      raise exception 'Numeric range rules can only target numeric, measurement or scale fields';
    end if;
    if rule_type_input = 'character_limit' and field_record.field_type not in ('short_text', 'long_text') then
      raise exception 'Character limit rules can only target text fields';
    end if;
    if rule_type_input = 'allowed_options' and field_record.field_type not in ('single_choice', 'multiple_choice', 'checklist', 'scale', 'laterality', 'body_area') then
      raise exception 'Allowed option rules can only target choice-style fields';
    end if;
    if rule_type_input = 'allowed_units' and field_record.field_type not in ('number', 'decimal', 'measurement') then
      raise exception 'Allowed unit rules can only target numeric or measurement fields';
    end if;
    if rule_type_input = 'date_restriction' and field_record.field_type not in ('date', 'datetime') then
      raise exception 'Date restriction rules can only target date fields';
    end if;
  end if;

  if rule_id_input is not null then
    select *
    into existing_rule
    from public.clinical_template_validation_rules
    where id = rule_id_input
      and clinical_note_template_version_id = target_template_version_id
      and deleted_at is null
    for update;
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
  optionless_choice_field_count integer := 0;
  incompatible_option_count integer := 0;
  unsupported_field_count integer := 0;
  incompatible_validation_rule_count integer := 0;
  error_count integer := 0;
  warning_count integer := 0;
  status text;
begin
  select *
  into version_record
  from public.clinical_note_template_versions
  where id = target_template_version_id
    and deleted_at is null;

  if version_record.id is null then
    raise exception 'Clinical template version not found';
  end if;

  select *
  into template_record
  from public.clinical_note_templates
  where id = version_record.clinical_note_template_id
    and deleted_at is null;

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
        select 1
        from public.clinical_template_fields field_row
        where field_row.clinical_note_template_version_id = version_record.id
          and field_row.field_key = input_key
          and field_row.deleted_at is null
      )
    );
  select count(*) into optionless_choice_field_count
  from public.clinical_template_fields field_row
  where field_row.clinical_note_template_version_id = version_record.id
    and field_row.deleted_at is null
    and field_row.field_type in ('single_choice', 'multiple_choice', 'checklist', 'scale', 'laterality', 'body_area')
    and not exists (
      select 1
      from public.clinical_template_field_options option_row
      where option_row.clinical_template_field_id = field_row.id
        and option_row.deleted_at is null
    );
  select count(*) into incompatible_option_count
  from public.clinical_template_field_options option_row
  join public.clinical_template_fields field_row on field_row.id = option_row.clinical_template_field_id
  where option_row.clinical_note_template_version_id = version_record.id
    and option_row.deleted_at is null
    and field_row.deleted_at is null
    and field_row.field_type not in ('single_choice', 'multiple_choice', 'checklist', 'scale', 'laterality', 'body_area');
  select count(*) into unsupported_field_count
  from public.clinical_template_fields field_row
  where field_row.clinical_note_template_version_id = version_record.id
    and field_row.deleted_at is null
    and field_row.field_type not in (
      'short_text',
      'long_text',
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
      'heading',
      'instruction',
      'read_only_display'
    );
  select count(*) into incompatible_validation_rule_count
  from public.clinical_template_validation_rules rule_row
  join public.clinical_template_fields field_row on field_row.id = rule_row.clinical_template_field_id
  where rule_row.clinical_note_template_version_id = version_record.id
    and rule_row.deleted_at is null
    and field_row.deleted_at is null
    and (
      (rule_row.rule_type = 'numeric_range' and field_row.field_type not in ('number', 'decimal', 'measurement', 'scale'))
      or (rule_row.rule_type = 'character_limit' and field_row.field_type not in ('short_text', 'long_text'))
      or (rule_row.rule_type = 'allowed_options' and field_row.field_type not in ('single_choice', 'multiple_choice', 'checklist', 'scale', 'laterality', 'body_area'))
      or (rule_row.rule_type = 'allowed_units' and field_row.field_type not in ('number', 'decimal', 'measurement'))
      or (rule_row.rule_type = 'date_restriction' and field_row.field_type not in ('date', 'datetime'))
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
  if optionless_choice_field_count > 0 then
    errors := errors || jsonb_build_array('Choice-style fields must have at least one option before publication');
  end if;
  if incompatible_option_count > 0 then
    errors := errors || jsonb_build_array('Options are attached to one or more non-choice fields');
  end if;
  if unsupported_field_count > 0 then
    errors := errors || jsonb_build_array('One or more fields use an unsupported safe-editor field type');
  end if;
  if incompatible_validation_rule_count > 0 then
    errors := errors || jsonb_build_array('One or more validation rules are incompatible with their target field type');
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
  select *
  into version_record
  from public.clinical_note_template_versions
  where id = target_template_version_id
    and deleted_at is null;

  if version_record.id is null or version_record.version_status <> 'active' then
    raise exception 'Only active published clinical template versions can be assigned';
  end if;
  if not public.has_clinical_template_management_permission(version_record.tenant_id, 'assign') then
    raise exception 'Not allowed to manage clinical template assignments';
  end if;
  if assignment_scope_input not in ('tenant', 'discipline', 'encounter_type', 'session_type') then
    raise exception 'Clinical template assignment scope is invalid';
  end if;
  if effective_from_input is not null and effective_until_input is not null and effective_from_input > effective_until_input then
    raise exception 'Assignment effective dates are invalid';
  end if;
  if assignment_priority_input <= 0 then
    raise exception 'Assignment priority must be positive';
  end if;
  if practice_location_id_input is not null and not exists (
    select 1
    from public.practice_locations location
    where location.id = practice_location_id_input
      and location.tenant_id = version_record.tenant_id
      and location.deleted_at is null
  ) then
    raise exception 'Clinical template assignment location does not belong to this tenant';
  end if;
  if therapist_profile_id_input is not null and not exists (
    select 1
    from public.therapist_profiles therapist
    where therapist.id = therapist_profile_id_input
      and therapist.tenant_id = version_record.tenant_id
      and therapist.deleted_at is null
  ) then
    raise exception 'Clinical template assignment therapist does not belong to this tenant';
  end if;
  if is_default_input = true and exists (
    select 1
    from public.clinical_template_assignments assignment
    where assignment.tenant_id = version_record.tenant_id
      and assignment.deleted_at is null
      and assignment.is_active = true
      and assignment.is_default = true
      and assignment.assignment_scope = assignment_scope_input
      and coalesce(assignment.discipline, '') = coalesce(discipline_input, '')
      and coalesce(assignment.encounter_type, '') = coalesce(encounter_type_input, '')
      and coalesce(assignment.session_type, '') = coalesce(session_type_input, '')
      and coalesce(assignment.practice_location_id::text, '') = coalesce(practice_location_id_input::text, '')
      and coalesce(assignment.therapist_profile_id::text, '') = coalesce(therapist_profile_id_input::text, '')
      and assignment.assignment_priority = assignment_priority_input
      and (assignment_id_input is null or assignment.id <> assignment_id_input)
  ) then
    raise exception 'A default assignment already exists for this scope and priority';
  end if;

  if assignment_id_input is not null then
    select *
    into existing_assignment
    from public.clinical_template_assignments
    where id = assignment_id_input
      and tenant_id = version_record.tenant_id
      and deleted_at is null
    for update;

    if existing_assignment.id is null then
      raise exception 'Clinical template assignment not found';
    end if;
    if expected_lock_version is not null and existing_assignment.lock_version <> expected_lock_version then
      raise exception 'Clinical template assignment changed since it was loaded';
    end if;

    update public.clinical_template_assignments
    set assignment_scope = assignment_scope_input,
        clinical_note_template_id = version_record.clinical_note_template_id,
        clinical_note_template_version_id = version_record.id,
        discipline = nullif(discipline_input, ''),
        encounter_type = nullif(encounter_type_input, ''),
        session_type = nullif(session_type_input, ''),
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
      tenant_id,
      clinical_note_template_id,
      clinical_note_template_version_id,
      assignment_scope,
      discipline,
      encounter_type,
      session_type,
      practice_location_id,
      therapist_profile_id,
      is_default,
      is_active,
      assignment_priority,
      effective_from,
      effective_until,
      assigned_by_profile_id,
      metadata
    )
    values (
      version_record.tenant_id,
      version_record.clinical_note_template_id,
      version_record.id,
      assignment_scope_input,
      nullif(discipline_input, ''),
      nullif(encounter_type_input, ''),
      nullif(session_type_input, ''),
      practice_location_id_input,
      therapist_profile_id_input,
      is_default_input,
      true,
      assignment_priority_input,
      effective_from_input,
      effective_until_input,
      auth.uid(),
      '{}'::jsonb
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

comment on function public.upsert_clinical_template_field(uuid, uuid, uuid, text, text, text, integer, boolean, boolean, boolean, boolean, text[], integer, text)
  is 'Safe clinical template field editor RPC. Field type is immutable after creation to prevent incompatible options, validation rules and clinical note rendering.';

comment on function public.upsert_clinical_template_field_option(uuid, uuid, uuid, text, text, integer, boolean, integer, text)
  is 'Safe clinical template option editor RPC. Options are limited to choice-style fields.';

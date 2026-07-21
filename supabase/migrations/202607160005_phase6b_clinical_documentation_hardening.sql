-- Phase 6B Step 4: Clinical documentation integration hardening.
-- Forward-only corrections for idempotent draft creation, protected free-text saves,
-- structured field validation, and copy-forward compatibility checks.

create or replace function public.clinical_template_version_is_available_for_context(
  target_tenant_id uuid,
  target_template_version_id uuid,
  target_encounter_id uuid default null
)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  template_version_record public.clinical_note_template_versions%rowtype;
  encounter_record public.clinical_encounters%rowtype;
  assignment_count integer := 0;
  matching_assignment_count integer := 0;
begin
  select *
  into template_version_record
  from public.clinical_note_template_versions
  where id = target_template_version_id
    and deleted_at is null
    and version_status = 'active'
    and (tenant_id = target_tenant_id or tenant_id is null);

  if template_version_record.id is null then
    return false;
  end if;

  if target_encounter_id is not null then
    select *
    into encounter_record
    from public.clinical_encounters
    where id = target_encounter_id
      and tenant_id = target_tenant_id
      and deleted_at is null;

    if encounter_record.id is null then
      return false;
    end if;
  end if;

  select count(*)
  into assignment_count
  from public.clinical_template_assignments assignment
  where assignment.deleted_at is null
    and assignment.is_active = true
    and (assignment.tenant_id = target_tenant_id or assignment.tenant_id is null)
    and assignment.clinical_note_template_id = template_version_record.clinical_note_template_id
    and (assignment.clinical_note_template_version_id is null or assignment.clinical_note_template_version_id = template_version_record.id)
    and (assignment.effective_from is null or assignment.effective_from <= current_date)
    and (assignment.effective_until is null or assignment.effective_until >= current_date);

  if assignment_count = 0 then
    return true;
  end if;

  select count(*)
  into matching_assignment_count
  from public.clinical_template_assignments assignment
  where assignment.deleted_at is null
    and assignment.is_active = true
    and (assignment.tenant_id = target_tenant_id or assignment.tenant_id is null)
    and assignment.clinical_note_template_id = template_version_record.clinical_note_template_id
    and (assignment.clinical_note_template_version_id is null or assignment.clinical_note_template_version_id = template_version_record.id)
    and (assignment.effective_from is null or assignment.effective_from <= current_date)
    and (assignment.effective_until is null or assignment.effective_until >= current_date)
    and (
      assignment.assignment_scope = 'tenant'
      or (
        encounter_record.id is not null
        and assignment.assignment_scope = 'encounter_type'
        and assignment.encounter_type = encounter_record.encounter_type
      )
      or (
        encounter_record.id is not null
        and assignment.assignment_scope = 'location'
        and assignment.practice_location_id = encounter_record.practice_location_id
      )
      or (
        encounter_record.id is not null
        and assignment.assignment_scope = 'practitioner'
        and assignment.therapist_profile_id = encounter_record.responsible_therapist_profile_id
      )
    );

  return matching_assignment_count > 0;
end;
$$;

create or replace function public.clinical_response_value_type_for_field(field_type_input text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when field_type_input in ('short_text', 'long_text', 'rich_text') then 'text'
    when field_type_input in ('number', 'scale', 'measurement') then 'number'
    when field_type_input = 'decimal' then 'decimal'
    when field_type_input = 'date' then 'date'
    when field_type_input = 'time' then 'time'
    when field_type_input = 'datetime' then 'datetime'
    when field_type_input = 'boolean' then 'boolean'
    when field_type_input in ('single_choice', 'laterality', 'body_area') then 'choice'
    when field_type_input in ('multiple_choice', 'checklist') then 'multi_choice'
    when field_type_input in ('outcome_measure_reference', 'diagnosis_reference', 'treatment_goal_reference', 'attachment_reference') then 'reference'
    when field_type_input = 'calculated' then 'calculated'
    else 'json'
  end
$$;

create or replace function public.validate_clinical_structured_response_payload(
  field_record public.clinical_template_fields,
  response_payload jsonb
)
returns void
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  expected_value_type text;
  supplied_value_type text;
  supplied_text text;
  supplied_number numeric;
  supplied_boolean boolean;
  supplied_date date;
  supplied_datetime timestamptz;
  option_key text;
  allowed_option_count integer;
  supplied_unit text;
begin
  if field_record.field_type in ('heading', 'instruction', 'read_only_display', 'table', 'repeating_group') then
    raise exception 'This clinical template field type cannot be saved as a structured response';
  end if;

  if field_record.is_read_only = true or field_record.is_calculated = true then
    raise exception 'Read-only or calculated clinical fields cannot be edited directly';
  end if;

  expected_value_type := public.clinical_response_value_type_for_field(field_record.field_type);
  supplied_value_type := coalesce(nullif(response_payload ->> 'value_type', ''), expected_value_type);

  if supplied_value_type <> expected_value_type then
    raise exception 'Structured response value type does not match the template field type';
  end if;

  supplied_text := nullif(response_payload ->> 'response_text', '');

  if field_record.field_type in ('short_text', 'long_text', 'rich_text', 'time') then
    return;
  elsif field_record.field_type in ('number', 'decimal', 'scale', 'measurement') then
    supplied_number := nullif(response_payload ->> 'response_number', '')::numeric;
    if supplied_number is null and response_payload ? 'response_number' then
      raise exception 'Numeric structured response is invalid';
    end if;
  elsif field_record.field_type = 'boolean' then
    supplied_boolean := nullif(response_payload ->> 'response_boolean', '')::boolean;
    if supplied_boolean is null and response_payload ? 'response_boolean' then
      raise exception 'Boolean structured response is invalid';
    end if;
  elsif field_record.field_type = 'date' then
    supplied_date := nullif(response_payload ->> 'response_date', '')::date;
    if supplied_date is null and response_payload ? 'response_date' then
      raise exception 'Date structured response is invalid';
    end if;
  elsif field_record.field_type = 'datetime' then
    supplied_datetime := nullif(response_payload ->> 'response_datetime', '')::timestamptz;
    if supplied_datetime is null and response_payload ? 'response_datetime' then
      raise exception 'Date-time structured response is invalid';
    end if;
  elsif field_record.field_type in ('single_choice', 'laterality', 'body_area') then
    if supplied_text is null then
      supplied_text := nullif(response_payload ->> 'response_value', '');
    end if;

    if supplied_text is not null then
      select count(*)
      into allowed_option_count
      from public.clinical_template_field_options option_row
      where option_row.clinical_template_field_id = field_record.id
        and option_row.deleted_at is null
        and option_row.option_key = supplied_text;

      if allowed_option_count = 0 then
        raise exception 'Selected clinical option is not allowed for this field';
      end if;
    end if;
  elsif field_record.field_type in ('multiple_choice', 'checklist') then
    if response_payload -> 'response_value' is not null and jsonb_typeof(response_payload -> 'response_value') <> 'array' then
      raise exception 'Multi-choice structured response must be an array';
    end if;

    for option_key in select jsonb_array_elements_text(coalesce(response_payload -> 'response_value', '[]'::jsonb)) loop
      select count(*)
      into allowed_option_count
      from public.clinical_template_field_options option_row
      where option_row.clinical_template_field_id = field_record.id
        and option_row.deleted_at is null
        and option_row.option_key = option_key;

      if allowed_option_count = 0 then
        raise exception 'Selected clinical option is not allowed for this field';
      end if;
    end loop;
  elsif field_record.field_type in ('outcome_measure_reference', 'diagnosis_reference', 'treatment_goal_reference', 'attachment_reference') then
    if response_payload -> 'response_value' is null then
      return;
    end if;

    if jsonb_typeof(response_payload -> 'response_value') <> 'object' then
      raise exception 'Clinical reference response must store approved reference metadata';
    end if;
  end if;

  supplied_unit := nullif(response_payload ->> 'response_unit', '');
  if supplied_unit is not null and array_length(field_record.allowed_units, 1) is not null and not (supplied_unit = any(field_record.allowed_units)) then
    raise exception 'Measurement unit is not allowed for this clinical field';
  end if;
end;
$$;

create or replace function public.create_clinical_note_draft(
  target_tenant_id uuid,
  target_patient_id uuid,
  clinical_encounter_id_input uuid default null,
  note_type_input text default 'progress_note',
  note_title_input text default null,
  clinical_note_template_version_id_input uuid default null,
  free_text_content_input text default null,
  structured_content_input jsonb default '{}'::jsonb,
  clinical_visibility_input text default 'internal',
  patient_visible_allowed_input boolean default false,
  is_restricted_input boolean default false,
  idempotency_key_input text default null
)
returns table(clinical_note_id uuid, clinical_note_version_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  patient_record public.patients%rowtype;
  encounter_record public.clinical_encounters%rowtype;
  template_version_record public.clinical_note_template_versions%rowtype;
  existing_note_id uuid;
  existing_version_id uuid;
  new_note_id uuid;
  new_version_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.has_tenant_role(target_tenant_id, array['admin', 'therapist']) then
    raise exception 'Not allowed to create clinical notes for this tenant';
  end if;

  if idempotency_key_input is not null then
    perform pg_advisory_xact_lock(hashtextextended(target_tenant_id::text || ':' || idempotency_key_input, 0));

    select note.id, note.latest_version_id
    into existing_note_id, existing_version_id
    from public.clinical_notes note
    where note.tenant_id = target_tenant_id
      and note.deleted_at is null
      and note.metadata ->> 'idempotency_key' = idempotency_key_input
    limit 1;

    if existing_note_id is not null then
      return query select existing_note_id, existing_version_id;
      return;
    end if;
  end if;

  if jsonb_typeof(coalesce(structured_content_input, '{}'::jsonb)) <> 'object' then
    raise exception 'Structured clinical content must be an object';
  end if;

  select *
  into patient_record
  from public.patients
  where id = target_patient_id
    and tenant_id = target_tenant_id
    and deleted_at is null;

  if patient_record.id is null then
    raise exception 'Patient not found';
  end if;

  if clinical_encounter_id_input is not null then
    select *
    into encounter_record
    from public.clinical_encounters
    where id = clinical_encounter_id_input
      and tenant_id = target_tenant_id
      and patient_id = target_patient_id
      and deleted_at is null;

    if encounter_record.id is null then
      raise exception 'Clinical encounter not found';
    end if;
  end if;

  if clinical_note_template_version_id_input is not null then
    select *
    into template_version_record
    from public.clinical_note_template_versions
    where id = clinical_note_template_version_id_input
      and deleted_at is null
      and (tenant_id = target_tenant_id or tenant_id is null)
      and version_status = 'active';

    if template_version_record.id is null
      or not public.clinical_template_version_is_available_for_context(target_tenant_id, clinical_note_template_version_id_input, clinical_encounter_id_input) then
      raise exception 'Clinical template version is not available';
    end if;
  end if;

  if patient_visible_allowed_input = true and clinical_visibility_input <> 'patient_facing' then
    raise exception 'Patient-visible clinical notes must use patient-facing visibility';
  end if;

  if is_restricted_input = true and patient_visible_allowed_input = true then
    raise exception 'Restricted clinical notes cannot be marked patient-visible';
  end if;

  insert into public.clinical_notes (
    tenant_id,
    patient_id,
    clinical_encounter_id,
    booking_id,
    session_id,
    responsible_therapist_profile_id,
    author_profile_id,
    note_type,
    note_title,
    clinical_visibility,
    patient_visible_allowed,
    is_restricted,
    created_by_profile_id,
    updated_by_profile_id,
    metadata
  )
  values (
    target_tenant_id,
    target_patient_id,
    clinical_encounter_id_input,
    encounter_record.booking_id,
    encounter_record.session_id,
    encounter_record.responsible_therapist_profile_id,
    auth.uid(),
    coalesce(nullif(note_type_input, ''), 'progress_note'),
    nullif(note_title_input, ''),
    coalesce(nullif(clinical_visibility_input, ''), 'internal'),
    coalesce(patient_visible_allowed_input, false),
    coalesce(is_restricted_input, false),
    auth.uid(),
    auth.uid(),
    jsonb_build_object('created_from', 'clinical_documentation_workspace', 'idempotency_key', idempotency_key_input)
  )
  returning id into new_note_id;

  insert into public.clinical_note_versions (
    tenant_id,
    clinical_note_id,
    version_number,
    clinical_note_template_version_id,
    free_text_content,
    structured_content,
    author_profile_id,
    metadata
  )
  values (
    target_tenant_id,
    new_note_id,
    1,
    clinical_note_template_version_id_input,
    nullif(free_text_content_input, ''),
    coalesce(structured_content_input, '{}'::jsonb),
    auth.uid(),
    jsonb_build_object('created_from', 'clinical_documentation_workspace', 'idempotency_key', idempotency_key_input)
  )
  returning id into new_version_id;

  update public.clinical_notes
  set latest_version_id = new_version_id,
      updated_by_profile_id = auth.uid(),
      updated_at = now()
  where id = new_note_id;

  insert into public.clinical_note_draft_states (
    tenant_id,
    patient_id,
    clinical_note_id,
    clinical_note_version_id,
    active_editor_profile_id,
    last_saved_by_profile_id,
    last_idempotency_key
  )
  values (
    target_tenant_id,
    target_patient_id,
    new_note_id,
    new_version_id,
    auth.uid(),
    auth.uid(),
    idempotency_key_input
  );

  insert into public.audit_events (tenant_id, actor_profile_id, action, entity_table, entity_id, metadata)
  values (
    target_tenant_id,
    auth.uid(),
    'clinical_note_draft_created',
    'clinical_notes',
    new_note_id,
    jsonb_build_object('clinical_note_version_id', new_version_id, 'patient_id', target_patient_id)
  );

  insert into public.clinical_workflow_events (
    tenant_id,
    patient_id,
    clinical_encounter_id,
    clinical_note_id,
    clinical_note_version_id,
    event_type,
    event_key,
    metadata
  )
  values (
    target_tenant_id,
    target_patient_id,
    clinical_encounter_id_input,
    new_note_id,
    new_version_id,
    'clinical_note_draft_created',
    'clinical_note_draft_created:' || new_note_id::text,
    jsonb_build_object('clinical_note_id', new_note_id, 'clinical_note_version_id', new_version_id)
  )
  on conflict (tenant_id, event_key) where event_key is not null and deleted_at is null do nothing;

  return query select new_note_id, new_version_id;
end;
$$;

create or replace function public.save_clinical_note_free_text_draft(
  target_note_version_id uuid,
  free_text_content_input text,
  expected_draft_lock_version integer default null,
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
  draft_record public.clinical_note_draft_states%rowtype;
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
  into draft_record
  from public.clinical_note_draft_states
  where clinical_note_version_id = version_record.id
    and deleted_at is null
  for update;

  if draft_record.id is not null
    and expected_draft_lock_version is not null
    and draft_record.lock_version <> expected_draft_lock_version then
    update public.clinical_note_draft_states
    set conflict_detected = true,
        conflict_reason = 'stale_free_text_draft',
        updated_at = now()
    where id = draft_record.id;

    raise exception 'Clinical free-text draft has changed since it was loaded';
  end if;

  update public.clinical_note_versions
  set free_text_content = nullif(free_text_content_input, ''),
      change_reason = 'Draft free text edited from Clinical documentation workspace',
      updated_at = now()
  where id = version_record.id;

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
    now(),
    idempotency_key_input
  )
  on conflict (clinical_note_version_id) where deleted_at is null
  do update
  set draft_status = 'active',
      active_editor_profile_id = auth.uid(),
      last_saved_at = now(),
      last_saved_by_profile_id = auth.uid(),
      last_client_saved_at = now(),
      last_idempotency_key = excluded.last_idempotency_key,
      conflict_detected = false,
      conflict_reason = null,
      updated_at = now();

  insert into public.audit_events (tenant_id, actor_profile_id, action, entity_table, entity_id, metadata)
  values (
    note_record.tenant_id,
    auth.uid(),
    'clinical_note_free_text_saved',
    'clinical_note_versions',
    version_record.id,
    jsonb_build_object('clinical_note_id', note_record.id, 'patient_id', note_record.patient_id)
  );

  return version_record.id;
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

  perform public.validate_clinical_structured_response_payload(field_record, response_payload);

  select *
  into section_record
  from public.clinical_template_sections
  where id = field_record.clinical_template_section_id
    and clinical_note_template_version_id = version_record.clinical_note_template_version_id
    and deleted_at is null;

  if section_record.id is null then
    raise exception 'Clinical template section not found for this note version';
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
      public.clinical_response_value_type_for_field(field_record.field_type),
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
        value_type = public.clinical_response_value_type_for_field(field_record.field_type),
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
  target_version public.clinical_note_versions%rowtype;
  target_note public.clinical_notes%rowtype;
  target_field public.clinical_template_fields%rowtype;
  source_field public.clinical_template_fields%rowtype;
  target_response_id uuid;
  copy_event_id uuid;
  existing_copy_event_id uuid;
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

  select * into target_version from public.clinical_note_versions where id = target_note_version_id and deleted_at is null;
  select * into target_note from public.clinical_notes where id = target_version.clinical_note_id and deleted_at is null;
  select * into target_field from public.clinical_template_fields where id = target_template_field_id and deleted_at is null;
  select * into source_field from public.clinical_template_fields where id = source_response.clinical_template_field_id and deleted_at is null;

  if target_version.id is null or target_note.id is null or target_field.id is null or source_field.id is null then
    raise exception 'Copy-forward target or source field not found';
  end if;

  if source_response.tenant_id <> target_note.tenant_id or source_response.patient_id <> target_note.patient_id then
    raise exception 'Copy-forward cannot cross tenant or patient boundaries';
  end if;

  if target_version.version_status <> 'draft' then
    raise exception 'Copy-forward target must be a draft note version';
  end if;

  if target_field.clinical_note_template_version_id <> target_version.clinical_note_template_version_id then
    raise exception 'Copy-forward target field must belong to the target note template version';
  end if;

  if public.clinical_response_value_type_for_field(target_field.field_type) <> source_response.value_type then
    raise exception 'Copy-forward source and target fields are not compatible';
  end if;

  if source_response.restricted_snapshot = true or source_response.practitioner_only_snapshot = true then
    raise exception 'Restricted or practitioner-only fields cannot be copied forward through the generic workflow';
  end if;

  if idempotency_key_input is not null then
    select id
    into existing_copy_event_id
    from public.clinical_note_copy_forward_events
    where tenant_id = source_response.tenant_id
      and target_clinical_note_version_id = target_note_version_id
      and source_response_id = source_response_id_input
      and target_field_key = target_field.field_key
      and metadata ->> 'idempotency_key' = idempotency_key_input
      and deleted_at is null
    limit 1;

    if existing_copy_event_id is not null then
      return existing_copy_event_id;
    end if;
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
    copied_value_snapshot,
    metadata
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
    ),
    jsonb_build_object('idempotency_key', idempotency_key_input)
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

revoke all on function public.clinical_template_version_is_available_for_context(uuid, uuid, uuid) from public, anon;
revoke all on function public.clinical_response_value_type_for_field(text) from public, anon;
revoke all on function public.validate_clinical_structured_response_payload(public.clinical_template_fields, jsonb) from public, anon;
revoke all on function public.save_clinical_note_free_text_draft(uuid, text, integer, text) from public, anon;

grant execute on function public.clinical_template_version_is_available_for_context(uuid, uuid, uuid) to authenticated;
grant execute on function public.clinical_response_value_type_for_field(text) to authenticated;
grant execute on function public.save_clinical_note_free_text_draft(uuid, text, integer, text) to authenticated;

comment on function public.clinical_template_version_is_available_for_context(uuid, uuid, uuid) is
  'Validates whether an active clinical note template version is selectable for a tenant and optional encounter context.';

comment on function public.save_clinical_note_free_text_draft(uuid, text, integer, text) is
  'Protected free-text draft save with draft-state optimistic locking for clinical documentation.';

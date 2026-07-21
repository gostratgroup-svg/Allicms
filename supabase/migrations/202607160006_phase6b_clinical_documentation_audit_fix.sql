-- Phase 6B Step 5 audit fixes.
-- Corrects idempotency-key reuse safety and optional numeric/date payload validation.

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
  raw_number text;
  raw_boolean text;
  raw_date text;
  raw_datetime text;
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
    null;
  elsif field_record.field_type in ('number', 'decimal', 'scale', 'measurement') then
    raw_number := nullif(response_payload ->> 'response_number', '');
    if raw_number is not null and raw_number !~ '^-?[0-9]+(\.[0-9]+)?$' then
      raise exception 'Numeric structured response is invalid';
    end if;
  elsif field_record.field_type = 'boolean' then
    raw_boolean := nullif(response_payload ->> 'response_boolean', '');
    if raw_boolean is not null and raw_boolean not in ('true', 'false') then
      raise exception 'Boolean structured response is invalid';
    end if;
  elsif field_record.field_type = 'date' then
    raw_date := nullif(response_payload ->> 'response_date', '');
    if raw_date is not null then
      perform raw_date::date;
    end if;
  elsif field_record.field_type = 'datetime' then
    raw_datetime := nullif(response_payload ->> 'response_datetime', '');
    if raw_datetime is not null then
      perform raw_datetime::timestamptz;
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
      null;
    elsif jsonb_typeof(response_payload -> 'response_value') <> 'object' then
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
  existing_request_fingerprint text;
  request_fingerprint text;
  new_note_id uuid;
  new_version_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.has_tenant_role(target_tenant_id, array['admin', 'therapist']) then
    raise exception 'Not allowed to create clinical notes for this tenant';
  end if;

  if jsonb_typeof(coalesce(structured_content_input, '{}'::jsonb)) <> 'object' then
    raise exception 'Structured clinical content must be an object';
  end if;

  request_fingerprint := md5(jsonb_build_object(
    'target_patient_id', target_patient_id,
    'clinical_encounter_id_input', clinical_encounter_id_input,
    'note_type_input', coalesce(nullif(note_type_input, ''), 'progress_note'),
    'note_title_input', nullif(note_title_input, ''),
    'clinical_note_template_version_id_input', clinical_note_template_version_id_input,
    'free_text_content_input', nullif(free_text_content_input, ''),
    'structured_content_input', coalesce(structured_content_input, '{}'::jsonb),
    'clinical_visibility_input', coalesce(nullif(clinical_visibility_input, ''), 'internal'),
    'patient_visible_allowed_input', coalesce(patient_visible_allowed_input, false),
    'is_restricted_input', coalesce(is_restricted_input, false)
  )::text);

  if idempotency_key_input is not null then
    perform pg_advisory_xact_lock(hashtextextended(target_tenant_id::text || ':' || idempotency_key_input, 0));

    select note.id, note.latest_version_id, note.metadata ->> 'request_fingerprint'
    into existing_note_id, existing_version_id, existing_request_fingerprint
    from public.clinical_notes note
    where note.tenant_id = target_tenant_id
      and note.deleted_at is null
      and note.metadata ->> 'idempotency_key' = idempotency_key_input
    limit 1;

    if existing_note_id is not null then
      if existing_request_fingerprint is distinct from request_fingerprint then
        raise exception 'Clinical draft idempotency key was reused with different request details';
      end if;

      return query select existing_note_id, existing_version_id;
      return;
    end if;
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
    jsonb_build_object(
      'created_from', 'clinical_documentation_workspace',
      'idempotency_key', idempotency_key_input,
      'request_fingerprint', request_fingerprint
    )
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
    jsonb_build_object(
      'created_from', 'clinical_documentation_workspace',
      'idempotency_key', idempotency_key_input,
      'request_fingerprint', request_fingerprint
    )
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

comment on function public.create_clinical_note_draft(uuid, uuid, uuid, text, text, uuid, text, jsonb, text, boolean, boolean, text) is
  'Creates a clinical note draft transactionally; idempotency keys are scoped to tenant and validated against a request fingerprint.';

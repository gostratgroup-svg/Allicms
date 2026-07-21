-- AlliDesk Phase 6D hardening: assessment availability, response validation,
-- and finalisation safety. This is forward-only and intentionally does not
-- add frontend scope, scoring runtime, Patient Link rendering, or automation.

create or replace function public.assessment_definition_version_is_available_for_tenant(
  target_tenant_id uuid,
  target_definition_version_id uuid
)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  version_record public.assessment_definition_versions%rowtype;
  definition_record public.outcome_measure_definitions%rowtype;
  tenant_assignment_count integer := 0;
  valid_assignment_count integer := 0;
  license_state text;
begin
  select * into version_record
  from public.assessment_definition_versions
  where id = target_definition_version_id
    and deleted_at is null;

  if version_record.id is null then
    return false;
  end if;

  if version_record.tenant_id is not null and version_record.tenant_id <> target_tenant_id then
    return false;
  end if;

  if version_record.version_status <> 'active'
    or version_record.retired_at is not null
    or (version_record.effective_from is not null and version_record.effective_from > current_date)
    or (version_record.effective_until is not null and version_record.effective_until < current_date) then
    return false;
  end if;

  select * into definition_record
  from public.outcome_measure_definitions
  where id = version_record.outcome_measure_definition_id
    and deleted_at is null;

  if definition_record.id is null then
    return false;
  end if;

  if definition_record.tenant_id is not null and definition_record.tenant_id <> target_tenant_id then
    return false;
  end if;

  if definition_record.definition_status <> 'active'
    or definition_record.retired_at is not null
    or (definition_record.effective_from is not null and definition_record.effective_from > current_date)
    or (definition_record.effective_until is not null and definition_record.effective_until < current_date) then
    return false;
  end if;

  if coalesce(definition_record.is_licensed_definition, false) then
    license_state := coalesce(nullif(definition_record.licence_metadata ->> 'license_status', ''), 'not_configured');
    if license_state not in ('active', 'not_required') then
      return false;
    end if;
  end if;

  select count(*) into tenant_assignment_count
  from public.assessment_assignments assignment
  where assignment.tenant_id = target_tenant_id
    and assignment.assessment_definition_version_id = version_record.id
    and assignment.deleted_at is null;

  if tenant_assignment_count > 0 then
    select count(*) into valid_assignment_count
    from public.assessment_assignments assignment
    where assignment.tenant_id = target_tenant_id
      and assignment.assessment_definition_version_id = version_record.id
      and assignment.deleted_at is null
      and assignment.is_active = true
      and (assignment.effective_from is null or assignment.effective_from <= current_date)
      and (assignment.effective_until is null or assignment.effective_until >= current_date);

    if valid_assignment_count = 0 then
      return false;
    end if;
  end if;

  return true;
end;
$$;

create or replace function public.assessment_response_value_is_valid(
  item_record public.assessment_definition_items,
  response_payload jsonb
)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  option_count integer := 0;
  invalid_option_count integer := 0;
  min_value numeric;
  max_value numeric;
  numeric_payload numeric;
begin
  if item_record.item_type in ('heading', 'instruction') or item_record.is_informational = true or item_record.is_calculated = true then
    return false;
  end if;

  if response_payload is null then
    return item_record.is_required is false and item_record.is_required_for_completion is false;
  end if;

  if item_record.is_required or item_record.is_required_for_completion then
    if jsonb_typeof(response_payload) = 'string' and nullif(btrim(trim(both '"' from response_payload::text)), '') is null then
      return false;
    end if;
    if jsonb_typeof(response_payload) = 'array' and jsonb_array_length(response_payload) = 0 then
      return false;
    end if;
  end if;

  case item_record.item_type
    when 'short_text', 'long_text', 'observation' then
      return jsonb_typeof(response_payload) = 'string';

    when 'integer', 'decimal', 'scale', 'measurement' then
      if jsonb_typeof(response_payload) <> 'number' then
        return false;
      end if;
      numeric_payload := (response_payload::text)::numeric;
      min_value := coalesce(item_record.score_min, nullif(item_record.validation_config ->> 'min', '')::numeric);
      max_value := coalesce(item_record.score_max, nullif(item_record.validation_config ->> 'max', '')::numeric);
      if min_value is not null and numeric_payload < min_value then
        return false;
      end if;
      if max_value is not null and numeric_payload > max_value then
        return false;
      end if;
      return true;

    when 'boolean' then
      return jsonb_typeof(response_payload) = 'boolean';

    when 'single_choice', 'laterality', 'body_area' then
      if jsonb_typeof(response_payload) <> 'string' then
        return false;
      end if;
      select count(*) into option_count
      from public.assessment_definition_item_options option_row
      where option_row.assessment_definition_item_id = item_record.id
        and option_row.deleted_at is null;
      if option_count = 0 then
        return false;
      end if;
      return exists (
        select 1
        from public.assessment_definition_item_options option_row
        where option_row.assessment_definition_item_id = item_record.id
          and option_row.option_key = trim(both '"' from response_payload::text)
          and option_row.deleted_at is null
      );

    when 'multiple_choice', 'checklist' then
      if jsonb_typeof(response_payload) <> 'array' then
        return false;
      end if;
      select count(*) into option_count
      from public.assessment_definition_item_options option_row
      where option_row.assessment_definition_item_id = item_record.id
        and option_row.deleted_at is null;
      if option_count = 0 then
        return false;
      end if;
      select count(*) into invalid_option_count
      from jsonb_array_elements_text(response_payload) selected_key
      where not exists (
        select 1
        from public.assessment_definition_item_options option_row
        where option_row.assessment_definition_item_id = item_record.id
          and option_row.option_key = selected_key
          and option_row.deleted_at is null
      );
      return invalid_option_count = 0;

    when 'date', 'time', 'datetime', 'attachment_reference', 'clinical_record_reference' then
      return jsonb_typeof(response_payload) in ('string', 'object');

    else
      return false;
  end case;
exception
  when invalid_text_representation then
    return false;
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
  if not public.assessment_definition_version_is_available_for_tenant(target_tenant_id, version_record.id) then
    raise exception 'Assessment definition version is not available for this tenant';
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

create or replace function public.validate_clinical_assessment_ready_for_completion(target_clinical_assessment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  assessment_record public.clinical_assessments%rowtype;
  missing_required_count integer := 0;
  invalid_response_count integer := 0;
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

  select count(*) into invalid_response_count
  from public.clinical_assessment_item_responses response
  join public.assessment_definition_items item on item.id = response.assessment_definition_item_id
  where response.clinical_assessment_id = assessment_record.id
    and response.deleted_at is null
    and item.deleted_at is null
    and not public.assessment_response_value_is_valid(item, response.response_value);
  if invalid_response_count > 0 then
    errors := errors || jsonb_build_array('One or more assessment responses are no longer valid for this definition');
  end if;

  return jsonb_build_object('valid', jsonb_array_length(errors) = 0, 'errors', errors);
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
  validation_result jsonb;
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

  validation_result := public.validate_clinical_assessment_ready_for_completion(target_clinical_assessment_id);
  if coalesce((validation_result ->> 'valid')::boolean, false) is not true then
    raise exception 'Clinical assessment is not ready for finalisation';
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

revoke all on function public.assessment_definition_version_is_available_for_tenant(uuid, uuid) from public, anon, authenticated;
revoke all on function public.assessment_response_value_is_valid(public.assessment_definition_items, jsonb) from public, anon;
grant execute on function public.create_clinical_assessment_draft(uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, text, text) to authenticated;
grant execute on function public.save_clinical_assessment_response(uuid, uuid, jsonb, integer, integer, text) to authenticated;
grant execute on function public.validate_clinical_assessment_ready_for_completion(uuid) to authenticated;
grant execute on function public.finalise_clinical_assessment(uuid) to authenticated;

comment on function public.assessment_definition_version_is_available_for_tenant(uuid, uuid) is
  'Internal Phase 6D guard for active, effective, licensed and tenant-assigned assessment definition availability.';

comment on function public.assessment_response_value_is_valid(public.assessment_definition_items, jsonb) is
  'Internal Phase 6D guard that validates response JSON type, numeric bounds and choice option membership before saving or finalising assessments.';

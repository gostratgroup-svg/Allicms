-- Phase 6B Step 3: transactional clinical draft creation for the documentation UI.
-- This avoids leaving a clinical_notes row without its initial version/draft state if a
-- multi-step frontend operation fails.

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

    if template_version_record.id is null then
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

revoke all on function public.create_clinical_note_draft(uuid, uuid, uuid, text, text, uuid, text, jsonb, text, boolean, boolean, text) from public, anon;
grant execute on function public.create_clinical_note_draft(uuid, uuid, uuid, text, text, uuid, text, jsonb, text, boolean, boolean, text) to authenticated;

comment on function public.create_clinical_note_draft(uuid, uuid, uuid, text, text, uuid, text, jsonb, text, boolean, boolean, text) is
  'Creates a clinical note, initial draft version, draft state, audit event and workflow event transactionally for the clinician documentation workspace.';

-- AlliDesk Phase 6A Step 4: Clinical Engine hardening.
--
-- Scope:
-- - Validate that clinical_notes.latest_version_id always belongs to the same note.
-- - Enforce Patient Link publication eligibility at the database boundary for
--   polymorphic clinical publication records.
-- - Block restricted clinical records from Patient Link publication.
--
-- This is a forward-only migration and does not alter the original Phase 6A
-- Clinical Engine migration.

create or replace function public.validate_clinical_note_latest_version_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  version_record public.clinical_note_versions%rowtype;
begin
  if new.latest_version_id is null then
    return new;
  end if;

  select *
  into version_record
  from public.clinical_note_versions
  where id = new.latest_version_id
    and deleted_at is null;

  if version_record.id is null then
    raise exception 'Clinical note latest version not found';
  end if;

  if version_record.clinical_note_id <> new.id then
    raise exception 'Clinical note latest version must belong to the same note';
  end if;

  if version_record.tenant_id <> new.tenant_id then
    raise exception 'Clinical note latest version must belong to the same tenant';
  end if;

  return new;
end;
$$;

drop trigger if exists clinical_notes_validate_latest_version_integrity on public.clinical_notes;

create trigger clinical_notes_validate_latest_version_integrity
before insert or update of id, tenant_id, latest_version_id on public.clinical_notes
for each row execute function public.validate_clinical_note_latest_version_integrity();

create or replace function public.validate_clinical_patient_link_publication_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_tenant_id uuid;
  target_patient_id uuid;
  publication_allowed boolean;
  record_is_restricted boolean;
  lifecycle_is_publishable boolean;
  has_active_restriction boolean;
begin
  if new.record_type = 'clinical_note' then
    select tenant_id,
           patient_id,
           patient_visible_allowed,
           is_restricted,
           note_status in ('finalised', 'signed', 'amended', 'locked')
    into target_tenant_id,
         target_patient_id,
         publication_allowed,
         record_is_restricted,
         lifecycle_is_publishable
    from public.clinical_notes
    where id = new.record_id
      and deleted_at is null;
  elsif new.record_type = 'clinical_attachment' then
    select tenant_id,
           patient_id,
           patient_visible_allowed,
           is_restricted,
           true
    into target_tenant_id,
         target_patient_id,
         publication_allowed,
         record_is_restricted,
         lifecycle_is_publishable
    from public.clinical_attachments
    where id = new.record_id
      and deleted_at is null;
  elsif new.record_type = 'treatment_plan' then
    select tenant_id,
           patient_id,
           patient_visible_allowed,
           false,
           plan_status <> 'archived'
    into target_tenant_id,
         target_patient_id,
         publication_allowed,
         record_is_restricted,
         lifecycle_is_publishable
    from public.treatment_plans
    where id = new.record_id
      and deleted_at is null;
  elsif new.record_type = 'clinical_assessment' then
    select tenant_id,
           patient_id,
           patient_visible_allowed,
           is_restricted,
           assessment_status in ('finalised', 'amended')
    into target_tenant_id,
         target_patient_id,
         publication_allowed,
         record_is_restricted,
         lifecycle_is_publishable
    from public.clinical_assessments
    where id = new.record_id
      and deleted_at is null;
  elsif new.record_type = 'outcome_measure_result' then
    select tenant_id,
           patient_id,
           patient_visible_allowed,
           false,
           result_status in ('finalised', 'amended')
    into target_tenant_id,
         target_patient_id,
         publication_allowed,
         record_is_restricted,
         lifecycle_is_publishable
    from public.outcome_measure_results
    where id = new.record_id
      and deleted_at is null;
  else
    raise exception 'Unsupported clinical publication record type';
  end if;

  if target_tenant_id is null or target_patient_id is null then
    raise exception 'Clinical publication target not found';
  end if;

  if target_tenant_id <> new.tenant_id or target_patient_id <> new.patient_id then
    raise exception 'Clinical publication target must belong to the same tenant and patient';
  end if;

  if publication_allowed is not true then
    raise exception 'Clinical publication target is not patient-visible';
  end if;

  if lifecycle_is_publishable is not true then
    raise exception 'Clinical publication target lifecycle state is not publishable';
  end if;

  select exists (
    select 1
    from public.clinical_record_restrictions crr
    where crr.tenant_id = new.tenant_id
      and crr.patient_id = new.patient_id
      and crr.record_type = new.record_type
      and crr.record_id = new.record_id
      and crr.restriction_status = 'active'
      and crr.deleted_at is null
  )
  into has_active_restriction;

  if record_is_restricted is true or has_active_restriction is true then
    raise exception 'Restricted clinical records cannot be published to Patient Link';
  end if;

  return new;
end;
$$;

drop trigger if exists clinical_patient_link_publications_validate_record_integrity on public.clinical_patient_link_publications;

create trigger clinical_patient_link_publications_validate_record_integrity
before insert or update of tenant_id, patient_id, record_type, record_id, publication_status
on public.clinical_patient_link_publications
for each row execute function public.validate_clinical_patient_link_publication_integrity();

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
  record_is_restricted boolean;
  lifecycle_is_publishable boolean;
  has_active_restriction boolean;
  link_tenant_id uuid;
  link_patient_id uuid;
  new_publication_id uuid;
begin
  if safe_title_input is null or btrim(safe_title_input) = '' then
    raise exception 'Safe patient-facing title is required';
  end if;

  if target_record_type = 'clinical_note' then
    select tenant_id, patient_id, patient_visible_allowed, is_restricted, note_status in ('finalised', 'signed', 'amended', 'locked')
    into target_tenant_id, target_patient_id, publication_allowed, record_is_restricted, lifecycle_is_publishable
    from public.clinical_notes
    where id = target_record_id
      and deleted_at is null;
  elsif target_record_type = 'clinical_attachment' then
    select tenant_id, patient_id, patient_visible_allowed, is_restricted, true
    into target_tenant_id, target_patient_id, publication_allowed, record_is_restricted, lifecycle_is_publishable
    from public.clinical_attachments
    where id = target_record_id
      and deleted_at is null;
  elsif target_record_type = 'treatment_plan' then
    select tenant_id, patient_id, patient_visible_allowed, false, plan_status <> 'archived'
    into target_tenant_id, target_patient_id, publication_allowed, record_is_restricted, lifecycle_is_publishable
    from public.treatment_plans
    where id = target_record_id
      and deleted_at is null;
  elsif target_record_type = 'clinical_assessment' then
    select tenant_id, patient_id, patient_visible_allowed, is_restricted, assessment_status in ('finalised', 'amended')
    into target_tenant_id, target_patient_id, publication_allowed, record_is_restricted, lifecycle_is_publishable
    from public.clinical_assessments
    where id = target_record_id
      and deleted_at is null;
  elsif target_record_type = 'outcome_measure_result' then
    select tenant_id, patient_id, patient_visible_allowed, false, result_status in ('finalised', 'amended')
    into target_tenant_id, target_patient_id, publication_allowed, record_is_restricted, lifecycle_is_publishable
    from public.outcome_measure_results
    where id = target_record_id
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

  if lifecycle_is_publishable is not true then
    raise exception 'Clinical record lifecycle state is not publishable';
  end if;

  select exists (
    select 1
    from public.clinical_record_restrictions crr
    where crr.tenant_id = target_tenant_id
      and crr.patient_id = target_patient_id
      and crr.record_type = target_record_type
      and crr.record_id = target_record_id
      and crr.restriction_status = 'active'
      and crr.deleted_at is null
  )
  into has_active_restriction;

  if record_is_restricted is true or has_active_restriction is true then
    raise exception 'Restricted clinical records cannot be published to Patient Link';
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

revoke all on function public.validate_clinical_note_latest_version_integrity() from public, anon;
revoke all on function public.validate_clinical_patient_link_publication_integrity() from public, anon;
revoke all on function public.publish_clinical_record_to_patient_link(text, uuid, text, text, uuid) from public, anon;

grant execute on function public.publish_clinical_record_to_patient_link(text, uuid, text, text, uuid) to authenticated;

comment on function public.validate_clinical_note_latest_version_integrity() is
  'Ensures clinical_notes.latest_version_id points to a version owned by the same clinical note and tenant.';

comment on function public.validate_clinical_patient_link_publication_integrity() is
  'Validates polymorphic clinical Patient Link publication records and blocks restricted clinical records from publication.';

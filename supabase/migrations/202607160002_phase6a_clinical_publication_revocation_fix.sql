-- AlliDesk Phase 6A audit fix: allow clinical Patient Link publication
-- revocation even when the source record has since become restricted,
-- archived, soft-deleted or otherwise non-publishable.
--
-- The publication integrity trigger must protect draft/published publication
-- rows, but it must not prevent revocation/expiry state transitions.

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
  if new.publication_status in ('revoked', 'expired') then
    return new;
  end if;

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

revoke all on function public.validate_clinical_patient_link_publication_integrity() from public, anon;

comment on function public.validate_clinical_patient_link_publication_integrity() is
  'Validates publishable clinical Patient Link publication records while allowing safe revoked/expired state transitions.';

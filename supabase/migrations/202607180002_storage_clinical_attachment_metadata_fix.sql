-- Operational Readiness Step 2 repair:
-- Preserve selected clinical attachment metadata when finalising private storage uploads.

create or replace function public.finalise_document_upload(target_document_file_id uuid)
returns public.document_files
language plpgsql
security definer
set search_path = public
as $$
declare
  document_record public.document_files%rowtype;
  object_exists boolean;
  selected_attachment_category text;
begin
  select *
  into document_record
  from public.document_files
  where id = target_document_file_id
    and deleted_at is null
  for update;

  if document_record.id is null then
    raise exception 'Document not found';
  end if;

  if not public.can_manage_document_file(document_record.id) then
    raise exception 'Not allowed to finalise this document upload';
  end if;

  select exists (
    select 1
    from storage.objects so
    where so.bucket_id = document_record.bucket_id
      and so.name = document_record.object_path
  )
  into object_exists;

  if not object_exists then
    raise exception 'Uploaded object was not found';
  end if;

  update public.document_files
  set document_status = 'uploaded',
      upload_completed_at = coalesce(upload_completed_at, now()),
      updated_by_profile_id = auth.uid()
  where id = document_record.id
  returning * into document_record;

  if document_record.document_category = 'clinical_attachment'
    and document_record.clinical_attachment_id is null
  then
    selected_attachment_category := case
      when document_record.metadata ->> 'attachment_category' in (
        'assessment_file',
        'clinical_image',
        'report',
        'external_document',
        'supporting_document',
        'other'
      )
      then document_record.metadata ->> 'attachment_category'
      else 'supporting_document'
    end;

    insert into public.clinical_attachments (
      tenant_id,
      patient_id,
      clinical_note_id,
      attachment_category,
      storage_bucket,
      storage_path,
      document_file_id,
      file_name,
      mime_type,
      file_size_bytes,
      description,
      is_restricted,
      patient_visible_allowed,
      uploaded_by_profile_id,
      created_by_profile_id,
      updated_by_profile_id,
      metadata
    )
    values (
      document_record.tenant_id,
      document_record.patient_id,
      document_record.clinical_note_id,
      selected_attachment_category,
      document_record.bucket_id,
      document_record.object_path,
      document_record.id,
      document_record.original_filename,
      document_record.content_type,
      document_record.file_size_bytes,
      document_record.metadata ->> 'description',
      coalesce((document_record.metadata ->> 'is_restricted')::boolean, false),
      false,
      auth.uid(),
      auth.uid(),
      auth.uid(),
      jsonb_build_object(
        'document_file_id', document_record.id,
        'clinical_encounter_id', document_record.metadata ->> 'clinical_encounter_id',
        'clinical_assessment_id', document_record.metadata ->> 'clinical_assessment_id'
      )
    )
    returning id into document_record.clinical_attachment_id;

    update public.document_files
    set clinical_attachment_id = document_record.clinical_attachment_id,
        updated_by_profile_id = auth.uid()
    where id = document_record.id
    returning * into document_record;
  end if;

  if document_record.document_category = 'proof_of_payment'
    and document_record.payment_id is not null
  then
    update public.payments
    set proof_document_id = document_record.id,
        updated_by_profile_id = auth.uid()
    where id = document_record.payment_id
      and tenant_id = document_record.tenant_id
      and deleted_at is null;
  end if;

  return document_record;
end;
$$;

comment on function public.finalise_document_upload(uuid) is
  'Finalises a private Storage upload, preserving clinical attachment metadata and linking finance proof documents where applicable.';

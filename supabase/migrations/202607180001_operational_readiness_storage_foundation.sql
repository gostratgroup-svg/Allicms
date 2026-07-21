-- Operational Readiness Step 2: tenant-scoped Storage and file metadata.
--
-- Scope:
-- - private Supabase Storage buckets
-- - tenant-scoped document metadata
-- - upload/finalise/archive RPCs
-- - Storage object RLS policies linked to metadata
-- - Patient Link shared-document projection foundation
--
-- This migration intentionally does not implement PDF generation, full Patient
-- Link document rendering, communication delivery, payment gateways, AI, or
-- workflow workers.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('patient-documents', 'patient-documents', false, 15728640, array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]),
  ('clinical-attachments', 'clinical-attachments', false, 15728640, array[
    'application/pdf',
    'image/jpeg',
    'image/png'
  ]),
  ('practice-assets', 'practice-assets', false, 5242880, array[
    'image/jpeg',
    'image/png'
  ]),
  ('generated-documents', 'generated-documents', false, 20971520, array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table public.document_files (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  patient_id uuid references public.patients(id) on delete restrict,
  responsible_party_id uuid references public.responsible_parties(id) on delete set null,
  practice_profile_id uuid references public.practice_profiles(id) on delete set null,
  practice_branding_id uuid references public.practice_branding(id) on delete set null,
  clinical_encounter_id uuid references public.clinical_encounters(id) on delete set null,
  clinical_note_id uuid references public.clinical_notes(id) on delete set null,
  clinical_attachment_id uuid,
  payment_id uuid references public.payments(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  receipt_id uuid references public.receipts(id) on delete set null,
  bucket_id text not null,
  object_path text not null,
  original_filename text not null,
  safe_filename text not null,
  content_type text not null,
  file_size_bytes bigint not null,
  document_category text not null,
  document_status text not null default 'pending_upload',
  sharing_scope text not null default 'internal',
  patient_link_visible boolean not null default false,
  patient_link_shared_at timestamptz,
  patient_link_shared_by_profile_id uuid references public.profiles(id) on delete set null,
  upload_intent_created_at timestamptz not null default now(),
  upload_completed_at timestamptz,
  uploaded_by_profile_id uuid references public.profiles(id) on delete set null,
  archived_at timestamptz,
  archived_by_profile_id uuid references public.profiles(id) on delete set null,
  archive_reason text,
  checksum_sha256 text,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_files_bucket_check
    check (bucket_id in ('patient-documents', 'clinical-attachments', 'practice-assets', 'generated-documents')),
  constraint document_files_original_filename_check
    check (btrim(original_filename) <> ''),
  constraint document_files_safe_filename_check
    check (btrim(safe_filename) <> '' and safe_filename !~ '[\\/]' and safe_filename not in ('.', '..')),
  constraint document_files_content_type_check
    check (content_type in (
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )),
  constraint document_files_file_size_check
    check (file_size_bytes > 0 and file_size_bytes <= 20971520),
  constraint document_files_category_check
    check (document_category in (
      'patient_document',
      'referral_document',
      'clinical_attachment',
      'practice_logo',
      'branding_asset',
      'proof_of_payment',
      'invoice_pdf',
      'receipt_pdf',
      'statement_pdf',
      'generated_document',
      'other'
    )),
  constraint document_files_status_check
    check (document_status in ('pending_upload', 'uploaded', 'archived', 'upload_failed', 'deleted')),
  constraint document_files_sharing_scope_check
    check (sharing_scope in ('internal', 'patient_link', 'finance', 'clinical', 'practice')),
  constraint document_files_metadata_object_check
    check (jsonb_typeof(metadata) = 'object'),
  constraint document_files_archive_state_check
    check (archived_at is null or archive_reason is not null),
  constraint document_files_patient_required_check
    check (
      document_category not in ('patient_document', 'referral_document', 'clinical_attachment', 'proof_of_payment')
      or patient_id is not null
    ),
  constraint document_files_practice_asset_scope_check
    check (
      document_category not in ('practice_logo', 'branding_asset')
      or bucket_id = 'practice-assets'
    ),
  constraint document_files_clinical_bucket_check
    check (
      document_category <> 'clinical_attachment'
      or bucket_id = 'clinical-attachments'
    ),
  constraint document_files_generated_bucket_check
    check (
      document_category not in ('invoice_pdf', 'receipt_pdf', 'statement_pdf', 'generated_document')
      or bucket_id = 'generated-documents'
    ),
  constraint document_files_patient_link_state_check
    check (
      (patient_link_visible = false and patient_link_shared_at is null)
      or (patient_link_visible = true and sharing_scope = 'patient_link')
    )
);

alter table public.clinical_attachments
  add column if not exists document_file_id uuid references public.document_files(id) on delete set null;

alter table public.payments
  add constraint payments_proof_document_id_fkey
  foreign key (proof_document_id)
  references public.document_files(id)
  on delete set null
  not valid;

alter table public.payments validate constraint payments_proof_document_id_fkey;

create unique index document_files_object_path_unique_idx
  on public.document_files (bucket_id, object_path)
  where deleted_at is null;

create index document_files_tenant_idx
  on public.document_files (tenant_id, created_at desc)
  where deleted_at is null;

create index document_files_patient_idx
  on public.document_files (tenant_id, patient_id, created_at desc)
  where patient_id is not null and deleted_at is null;

create index document_files_category_idx
  on public.document_files (tenant_id, document_category, created_at desc)
  where deleted_at is null;

create index document_files_status_idx
  on public.document_files (tenant_id, document_status, created_at desc)
  where deleted_at is null;

create index document_files_patient_link_idx
  on public.document_files (tenant_id, patient_id, patient_link_visible, created_at desc)
  where deleted_at is null;

create index document_files_payment_idx
  on public.document_files (payment_id)
  where payment_id is not null and deleted_at is null;

create index clinical_attachments_document_file_idx
  on public.clinical_attachments (document_file_id)
  where document_file_id is not null and deleted_at is null;

create trigger document_files_set_updated_at
before update on public.document_files
for each row execute function public.set_updated_at();

create or replace function public.get_document_file_max_size(target_bucket_id text)
returns bigint
language sql
immutable
set search_path = public
as $$
  select case target_bucket_id
    when 'practice-assets' then 5242880::bigint
    when 'generated-documents' then 20971520::bigint
    when 'patient-documents' then 15728640::bigint
    when 'clinical-attachments' then 15728640::bigint
    else 0::bigint
  end;
$$;

create or replace function public.is_allowed_document_content_type(target_bucket_id text, target_content_type text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select case target_bucket_id
    when 'clinical-attachments' then target_content_type in ('application/pdf', 'image/jpeg', 'image/png')
    when 'practice-assets' then target_content_type in ('image/jpeg', 'image/png')
    when 'patient-documents' then target_content_type in (
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
    when 'generated-documents' then target_content_type in (
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
    else false
  end;
$$;

create or replace function public.sanitise_storage_filename(input_filename text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  cleaned text;
begin
  cleaned := lower(coalesce(input_filename, 'file'));
  cleaned := regexp_replace(cleaned, '[^a-z0-9._-]+', '-', 'g');
  cleaned := regexp_replace(cleaned, '-+', '-', 'g');
  cleaned := trim(both '-.' from cleaned);

  if cleaned is null or cleaned = '' or cleaned in ('.', '..') then
    cleaned := 'file';
  end if;

  return left(cleaned, 160);
end;
$$;

create or replace function public.document_file_path_matches_metadata(
  target_tenant_id uuid,
  target_patient_id uuid,
  target_bucket_id text,
  target_category text,
  target_document_id uuid,
  target_safe_filename text,
  target_object_path text
)
returns boolean
language sql
stable
set search_path = public
as $$
  select target_object_path = case
    when target_bucket_id = 'patient-documents' then
      'tenant/' || target_tenant_id::text || '/patients/' || target_patient_id::text || '/documents/' || target_document_id::text || '/' || target_safe_filename
    when target_bucket_id = 'clinical-attachments' then
      'tenant/' || target_tenant_id::text || '/patients/' || target_patient_id::text || '/clinical/' || target_document_id::text || '/' || target_safe_filename
    when target_bucket_id = 'practice-assets' then
      'tenant/' || target_tenant_id::text || '/practice-assets/' || target_document_id::text || '/' || target_safe_filename
    when target_bucket_id = 'generated-documents' then
      'tenant/' || target_tenant_id::text || '/generated/' || target_category || '/' || target_document_id::text || '/' || target_safe_filename
    else null
  end;
$$;

create or replace function public.validate_document_file_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  related_tenant_id uuid;
begin
  if not public.is_allowed_document_content_type(new.bucket_id, new.content_type) then
    raise exception 'File type is not allowed for this bucket';
  end if;

  if new.file_size_bytes > public.get_document_file_max_size(new.bucket_id) then
    raise exception 'File size exceeds bucket limit';
  end if;

  if not public.document_file_path_matches_metadata(
    new.tenant_id,
    new.patient_id,
    new.bucket_id,
    new.document_category,
    new.id,
    new.safe_filename,
    new.object_path
  ) then
    raise exception 'Object path does not match document metadata';
  end if;

  if new.patient_id is not null then
    select p.tenant_id into related_tenant_id
    from public.patients p
    where p.id = new.patient_id
      and p.deleted_at is null;

    if related_tenant_id is null or related_tenant_id <> new.tenant_id then
      raise exception 'Document patient must belong to the same tenant';
    end if;
  end if;

  if new.responsible_party_id is not null then
    select rp.tenant_id into related_tenant_id
    from public.responsible_parties rp
    where rp.id = new.responsible_party_id
      and rp.deleted_at is null;

    if related_tenant_id is null or related_tenant_id <> new.tenant_id then
      raise exception 'Document responsible party must belong to the same tenant';
    end if;
  end if;

  if new.practice_profile_id is not null then
    select pp.tenant_id into related_tenant_id
    from public.practice_profiles pp
    where pp.id = new.practice_profile_id
      and pp.deleted_at is null;

    if related_tenant_id is null or related_tenant_id <> new.tenant_id then
      raise exception 'Document practice profile must belong to the same tenant';
    end if;
  end if;

  if new.clinical_note_id is not null then
    select cn.tenant_id into related_tenant_id
    from public.clinical_notes cn
    where cn.id = new.clinical_note_id
      and cn.deleted_at is null;

    if related_tenant_id is null or related_tenant_id <> new.tenant_id then
      raise exception 'Document clinical note must belong to the same tenant';
    end if;
  end if;

  if new.payment_id is not null then
    select p.tenant_id into related_tenant_id
    from public.payments p
    where p.id = new.payment_id
      and p.deleted_at is null;

    if related_tenant_id is null or related_tenant_id <> new.tenant_id then
      raise exception 'Document payment must belong to the same tenant';
    end if;
  end if;

  if new.invoice_id is not null then
    select i.tenant_id into related_tenant_id
    from public.invoices i
    where i.id = new.invoice_id
      and i.deleted_at is null;

    if related_tenant_id is null or related_tenant_id <> new.tenant_id then
      raise exception 'Document invoice must belong to the same tenant';
    end if;
  end if;

  return new;
end;
$$;

create trigger document_files_validate_integrity
before insert or update of tenant_id, patient_id, responsible_party_id, practice_profile_id, clinical_note_id, payment_id, invoice_id, bucket_id, object_path, safe_filename, content_type, file_size_bytes, document_category
on public.document_files
for each row execute function public.validate_document_file_integrity();

create or replace function public.can_read_document_file(target_document_file_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((
    select
      df.deleted_at is null
      and df.document_status in ('uploaded', 'archived')
      and (
        public.has_tenant_role(df.tenant_id, array['admin'])
        or (
          df.document_category in ('patient_document', 'referral_document')
          and public.has_tenant_role(df.tenant_id, array['therapist', 'receptionist'])
        )
        or (
          df.document_category = 'clinical_attachment'
          and public.has_tenant_role(df.tenant_id, array['therapist'])
        )
        or (
          df.document_category in ('proof_of_payment', 'invoice_pdf', 'receipt_pdf', 'statement_pdf', 'generated_document')
          and public.has_tenant_role(df.tenant_id, array['finance'])
        )
        or (
          df.document_category in ('practice_logo', 'branding_asset')
          and public.is_tenant_member(df.tenant_id)
        )
      )
    from public.document_files df
    where df.id = target_document_file_id
  ), false);
$$;

create or replace function public.can_manage_document_file(target_document_file_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((
    select
      df.deleted_at is null
      and (
        public.has_tenant_role(df.tenant_id, array['admin'])
        or (
          df.document_category in ('patient_document', 'referral_document')
          and public.has_tenant_role(df.tenant_id, array['therapist', 'receptionist'])
        )
        or (
          df.document_category = 'clinical_attachment'
          and public.has_tenant_role(df.tenant_id, array['therapist'])
        )
        or (
          df.document_category in ('proof_of_payment', 'invoice_pdf', 'receipt_pdf', 'statement_pdf', 'generated_document')
          and public.has_tenant_role(df.tenant_id, array['finance'])
        )
      )
    from public.document_files df
    where df.id = target_document_file_id
  ), false);
$$;

create or replace function public.can_create_document_file(
  target_tenant_id uuid,
  target_category text
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.has_tenant_role(target_tenant_id, array['admin'])
    or (
      target_category in ('patient_document', 'referral_document')
      and public.has_tenant_role(target_tenant_id, array['therapist', 'receptionist'])
    )
    or (
      target_category = 'clinical_attachment'
      and public.has_tenant_role(target_tenant_id, array['therapist'])
    )
    or (
      target_category in ('proof_of_payment', 'invoice_pdf', 'receipt_pdf', 'statement_pdf', 'generated_document')
      and public.has_tenant_role(target_tenant_id, array['finance'])
    );
$$;

create or replace function public.create_document_upload_intent(
  target_tenant_id uuid,
  target_bucket_id text,
  target_patient_id uuid,
  target_document_category text,
  original_filename_input text,
  content_type_input text,
  file_size_bytes_input bigint,
  sharing_scope_input text default 'internal',
  target_practice_profile_id uuid default null,
  target_practice_branding_id uuid default null,
  target_clinical_note_id uuid default null,
  target_payment_id uuid default null,
  target_invoice_id uuid default null,
  metadata_input jsonb default '{}'::jsonb
)
returns table (
  document_file_id uuid,
  bucket_id text,
  object_path text,
  max_file_size_bytes bigint,
  allowed_content_types text[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_document_id uuid := gen_random_uuid();
  safe_name text;
  generated_path text;
begin
  if not public.can_create_document_file(target_tenant_id, target_document_category) then
    raise exception 'Not allowed to create this document upload';
  end if;

  if not public.is_allowed_document_content_type(target_bucket_id, content_type_input) then
    raise exception 'File type is not allowed for this bucket';
  end if;

  if file_size_bytes_input is null or file_size_bytes_input <= 0 or file_size_bytes_input > public.get_document_file_max_size(target_bucket_id) then
    raise exception 'File size is not allowed for this bucket';
  end if;

  safe_name := public.sanitise_storage_filename(original_filename_input);

  generated_path := case
    when target_bucket_id = 'patient-documents' then
      'tenant/' || target_tenant_id::text || '/patients/' || target_patient_id::text || '/documents/' || new_document_id::text || '/' || safe_name
    when target_bucket_id = 'clinical-attachments' then
      'tenant/' || target_tenant_id::text || '/patients/' || target_patient_id::text || '/clinical/' || new_document_id::text || '/' || safe_name
    when target_bucket_id = 'practice-assets' then
      'tenant/' || target_tenant_id::text || '/practice-assets/' || new_document_id::text || '/' || safe_name
    when target_bucket_id = 'generated-documents' then
      'tenant/' || target_tenant_id::text || '/generated/' || target_document_category || '/' || new_document_id::text || '/' || safe_name
    else null
  end;

  if generated_path is null then
    raise exception 'Unsupported storage bucket';
  end if;

  insert into public.document_files (
    id,
    tenant_id,
    patient_id,
    practice_profile_id,
    practice_branding_id,
    clinical_note_id,
    payment_id,
    invoice_id,
    bucket_id,
    object_path,
    original_filename,
    safe_filename,
    content_type,
    file_size_bytes,
    document_category,
    sharing_scope,
    metadata,
    uploaded_by_profile_id,
    created_by_profile_id,
    updated_by_profile_id
  )
  values (
    new_document_id,
    target_tenant_id,
    target_patient_id,
    target_practice_profile_id,
    target_practice_branding_id,
    target_clinical_note_id,
    target_payment_id,
    target_invoice_id,
    target_bucket_id,
    generated_path,
    original_filename_input,
    safe_name,
    content_type_input,
    file_size_bytes_input,
    target_document_category,
    coalesce(sharing_scope_input, 'internal'),
    coalesce(metadata_input, '{}'::jsonb),
    auth.uid(),
    auth.uid(),
    auth.uid()
  );

  document_file_id := new_document_id;
  bucket_id := target_bucket_id;
  object_path := generated_path;
  max_file_size_bytes := public.get_document_file_max_size(target_bucket_id);
  allowed_content_types := case target_bucket_id
    when 'clinical-attachments' then array['application/pdf', 'image/jpeg', 'image/png']
    when 'practice-assets' then array['image/jpeg', 'image/png']
    else array[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  end;
  return next;
end;
$$;

create or replace function public.finalise_document_upload(target_document_file_id uuid)
returns public.document_files
language plpgsql
security definer
set search_path = public
as $$
declare
  document_record public.document_files%rowtype;
  object_exists boolean;
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
      'supporting_document',
      document_record.bucket_id,
      document_record.object_path,
      document_record.id,
      document_record.original_filename,
      document_record.content_type,
      document_record.file_size_bytes,
      document_record.metadata ->> 'description',
      coalesce((document_record.metadata ->> 'is_restricted')::boolean, false),
      document_record.patient_link_visible,
      auth.uid(),
      auth.uid(),
      auth.uid(),
      jsonb_build_object('document_file_id', document_record.id)
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

create or replace function public.archive_document_file(
  target_document_file_id uuid,
  archive_reason_input text
)
returns public.document_files
language plpgsql
security definer
set search_path = public
as $$
declare
  document_record public.document_files%rowtype;
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
    raise exception 'Not allowed to archive this document';
  end if;

  if archive_reason_input is null or btrim(archive_reason_input) = '' then
    raise exception 'Archive reason is required';
  end if;

  update public.document_files
  set document_status = 'archived',
      archived_at = coalesce(archived_at, now()),
      archived_by_profile_id = auth.uid(),
      archive_reason = archive_reason_input,
      patient_link_visible = false,
      patient_link_shared_at = null,
      updated_by_profile_id = auth.uid()
  where id = document_record.id
  returning * into document_record;

  if document_record.clinical_attachment_id is not null then
    update public.clinical_attachments
    set archived_at = coalesce(archived_at, now()),
        archived_by_profile_id = auth.uid(),
        archive_reason = archive_reason_input,
        patient_visible_allowed = false,
        updated_by_profile_id = auth.uid()
    where id = document_record.clinical_attachment_id;
  end if;

  return document_record;
end;
$$;

create or replace function public.share_document_file_to_patient_link(target_document_file_id uuid)
returns public.document_files
language plpgsql
security definer
set search_path = public
as $$
declare
  document_record public.document_files%rowtype;
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

  if document_record.document_status <> 'uploaded' then
    raise exception 'Only uploaded documents can be shared';
  end if;

  if document_record.patient_id is null then
    raise exception 'Only patient-linked documents can be shared';
  end if;

  if document_record.document_category = 'clinical_attachment' then
    raise exception 'Clinical attachments require explicit clinical publication before Patient Link sharing';
  end if;

  if not public.can_manage_document_file(document_record.id) then
    raise exception 'Not allowed to share this document';
  end if;

  update public.document_files
  set sharing_scope = 'patient_link',
      patient_link_visible = true,
      patient_link_shared_at = coalesce(patient_link_shared_at, now()),
      patient_link_shared_by_profile_id = auth.uid(),
      updated_by_profile_id = auth.uid()
  where id = document_record.id
  returning * into document_record;

  return document_record;
end;
$$;

create or replace function public.get_patient_link_shared_documents(
  target_public_identifier text,
  session_token_input text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  link_record public.patient_links%rowtype;
  session_record public.patient_link_sessions%rowtype;
begin
  select *
  into link_record
  from public.patient_links
  where public_identifier = target_public_identifier
    and deleted_at is null
    and link_status = 'active'
  limit 1;

  if link_record.id is null then
    return jsonb_build_object('access_state', 'unavailable', 'documents', '[]'::jsonb);
  end if;

  select *
  into session_record
  from public.patient_link_sessions
  where patient_link_id = link_record.id
    and patient_id = link_record.patient_id
    and session_token_hash = public.hash_patient_link_secret(session_token_input)
    and session_status = 'active'
    and expires_at > now()
    and deleted_at is null
  limit 1;

  if session_record.id is null then
    return jsonb_build_object('access_state', 'expired_session', 'documents', '[]'::jsonb);
  end if;

  update public.patient_link_sessions
  set last_activity_at = now()
  where id = session_record.id;

  insert into public.patient_link_access_logs (
    tenant_id, patient_link_id, access_grant_id, session_id, patient_id, event_type, event_status, resource_type
  )
  values (
    session_record.tenant_id, session_record.patient_link_id, session_record.access_grant_id,
    session_record.id, session_record.patient_id, 'document_viewed', 'recorded', 'document_files'
  );

  return jsonb_build_object(
    'access_state', 'active',
    'documents', coalesce((
      select jsonb_agg(jsonb_build_object(
        'document_id', df.id,
        'filename', df.original_filename,
        'content_type', df.content_type,
        'file_size_bytes', df.file_size_bytes,
        'document_category', df.document_category,
        'created_at', df.created_at
      ) order by df.created_at desc)
      from public.document_files df
      where df.tenant_id = link_record.tenant_id
        and df.patient_id = link_record.patient_id
        and df.deleted_at is null
        and df.document_status = 'uploaded'
        and df.patient_link_visible = true
        and df.sharing_scope = 'patient_link'
        and df.document_category <> 'clinical_attachment'
    ), '[]'::jsonb)
  );
end;
$$;

alter table public.document_files enable row level security;

create policy "tenant document readers can read document files"
on public.document_files
for select
to authenticated
using (public.can_read_document_file(id));

create policy "tenant document managers can create document files"
on public.document_files
for insert
to authenticated
with check (public.can_create_document_file(tenant_id, document_category));

create policy "tenant document managers can update document files"
on public.document_files
for update
to authenticated
using (public.can_manage_document_file(id))
with check (public.can_manage_document_file(id));

drop policy if exists "allidesk authenticated users can upload known document objects" on storage.objects;
drop policy if exists "allidesk authenticated users can read known document objects" on storage.objects;
drop policy if exists "allidesk authenticated users can update known document objects" on storage.objects;
drop policy if exists "allidesk no direct document object deletes" on storage.objects;

create policy "allidesk authenticated users can upload known document objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('patient-documents', 'clinical-attachments', 'practice-assets', 'generated-documents')
  and exists (
    select 1
    from public.document_files df
    where df.bucket_id = storage.objects.bucket_id
      and df.object_path = storage.objects.name
      and df.deleted_at is null
      and df.document_status = 'pending_upload'
      and public.can_manage_document_file(df.id)
      and public.is_allowed_document_content_type(df.bucket_id, coalesce(storage.objects.metadata ->> 'mimetype', df.content_type))
      and coalesce((storage.objects.metadata ->> 'size')::bigint, df.file_size_bytes) <= public.get_document_file_max_size(df.bucket_id)
  )
);

create policy "allidesk authenticated users can read known document objects"
on storage.objects
for select
to authenticated
using (
  bucket_id in ('patient-documents', 'clinical-attachments', 'practice-assets', 'generated-documents')
  and exists (
    select 1
    from public.document_files df
    where df.bucket_id = storage.objects.bucket_id
      and df.object_path = storage.objects.name
      and df.deleted_at is null
      and public.can_read_document_file(df.id)
  )
);

create policy "allidesk authenticated users can update known document objects"
on storage.objects
for update
to authenticated
using (
  bucket_id in ('patient-documents', 'clinical-attachments', 'practice-assets', 'generated-documents')
  and exists (
    select 1
    from public.document_files df
    where df.bucket_id = storage.objects.bucket_id
      and df.object_path = storage.objects.name
      and df.deleted_at is null
      and public.can_manage_document_file(df.id)
  )
)
with check (
  bucket_id in ('patient-documents', 'clinical-attachments', 'practice-assets', 'generated-documents')
  and exists (
    select 1
    from public.document_files df
    where df.bucket_id = storage.objects.bucket_id
      and df.object_path = storage.objects.name
      and df.deleted_at is null
      and public.can_manage_document_file(df.id)
  )
);

revoke all on public.document_files from anon, authenticated;
grant select, insert, update on public.document_files to authenticated;

revoke all on function public.get_document_file_max_size(text) from public, anon, authenticated;
revoke all on function public.is_allowed_document_content_type(text, text) from public, anon, authenticated;
revoke all on function public.sanitise_storage_filename(text) from public, anon, authenticated;
revoke all on function public.document_file_path_matches_metadata(uuid, uuid, text, text, uuid, text, text) from public, anon, authenticated;
revoke all on function public.validate_document_file_integrity() from public, anon, authenticated;
revoke all on function public.can_read_document_file(uuid) from public, anon;
revoke all on function public.can_manage_document_file(uuid) from public, anon;
revoke all on function public.can_create_document_file(uuid, text) from public, anon;
revoke all on function public.create_document_upload_intent(uuid, text, uuid, text, text, text, bigint, text, uuid, uuid, uuid, uuid, uuid, jsonb) from public, anon;
revoke all on function public.finalise_document_upload(uuid) from public, anon;
revoke all on function public.archive_document_file(uuid, text) from public, anon;
revoke all on function public.share_document_file_to_patient_link(uuid) from public, anon;
revoke all on function public.get_patient_link_shared_documents(text, text) from public;

grant execute on function public.can_read_document_file(uuid) to authenticated;
grant execute on function public.can_manage_document_file(uuid) to authenticated;
grant execute on function public.can_create_document_file(uuid, text) to authenticated;
grant execute on function public.create_document_upload_intent(uuid, text, uuid, text, text, text, bigint, text, uuid, uuid, uuid, uuid, uuid, jsonb) to authenticated;
grant execute on function public.finalise_document_upload(uuid) to authenticated;
grant execute on function public.archive_document_file(uuid, text) to authenticated;
grant execute on function public.share_document_file_to_patient_link(uuid) to authenticated;
grant execute on function public.get_patient_link_shared_documents(text, text) to anon, authenticated;

comment on table public.document_files is
  'Tenant-scoped private file metadata for patient, referral, practice, finance and generated documents. Object paths are stored; signed URLs are not persisted.';

comment on column public.document_files.object_path is
  'Private Storage object path. Must be tenant scoped and generated by approved logic.';

comment on function public.create_document_upload_intent(uuid, text, uuid, text, text, text, bigint, text, uuid, uuid, uuid, uuid, uuid, jsonb) is
  'Creates validated metadata and returns the tenant-scoped object path a client may upload to. Does not upload bytes.';

comment on function public.finalise_document_upload(uuid) is
  'Marks a pending upload as uploaded only after the matching Storage object exists.';

comment on function public.get_patient_link_shared_documents(text, text) is
  'Returns Patient Link shared document metadata for a valid external Patient Link session. Does not return signed URLs.';

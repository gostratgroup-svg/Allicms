-- Allow Storage RLS to validate an authorised pending upload intent without
-- exposing pending document metadata through the normal document read policy.

create or replace function public.can_upload_document_object(
  target_bucket_id text,
  target_object_path text,
  target_content_type text,
  target_file_size_bytes bigint
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((
    select
      df.deleted_at is null
      and df.document_status = 'pending_upload'
      and public.can_manage_document_file(df.id)
      and public.is_allowed_document_content_type(
        df.bucket_id,
        coalesce(nullif(target_content_type, ''), df.content_type)
      )
      and coalesce(target_file_size_bytes, df.file_size_bytes)
        <= public.get_document_file_max_size(df.bucket_id)
    from public.document_files df
    where df.bucket_id = target_bucket_id
      and df.object_path = target_object_path
  ), false);
$$;

revoke all on function public.can_upload_document_object(text, text, text, bigint)
from public, anon, authenticated;

grant execute on function public.can_upload_document_object(text, text, text, bigint)
to authenticated;

drop policy if exists "allidesk authenticated users can upload known document objects"
on storage.objects;

create policy "allidesk authenticated users can upload known document objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('patient-documents', 'clinical-attachments', 'practice-assets', 'generated-documents')
  and public.can_upload_document_object(
    bucket_id,
    name,
    metadata ->> 'mimetype',
    nullif(metadata ->> 'size', '')::bigint
  )
);

comment on function public.can_upload_document_object(text, text, text, bigint) is
  'Authorises a Storage object insert against its exact pending document intent while keeping pending metadata hidden from normal document readers.';

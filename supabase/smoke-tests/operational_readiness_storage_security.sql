-- AlliDesk Operational Readiness Step 2 storage/RLS validation harness.
--
-- Purpose:
--   Validate tenant-scoped document metadata, role-sensitive document access,
--   Patient Link shared-document boundaries, and protected upload intent checks.
--
-- Safety:
--   - Development only.
--   - Uses fictional seed rows.
--   - Does not store passwords, JWTs, raw Patient Link secrets, or service-role
--     secrets.

create temp table if not exists operational_readiness_storage_results (
  area text,
  actor_email text,
  check_name text,
  observed text,
  expected text,
  status text,
  details text
) on commit preserve rows;

truncate operational_readiness_storage_results;
grant insert, select on operational_readiness_storage_results to authenticated;
grant insert, select on operational_readiness_storage_results to anon;

create temp table if not exists operational_readiness_storage_auth_context (
  email text primary key,
  profile_id uuid not null
) on commit preserve rows;

truncate operational_readiness_storage_auth_context;
grant select on operational_readiness_storage_auth_context to authenticated;

insert into operational_readiness_storage_auth_context (email, profile_id)
select lower(email), id
from auth.users
where lower(email) in (
  'gostratgroup+allidesk-admin-a@gmail.com',
  'gostratgroup+allidesk-therapist-a@gmail.com',
  'gostratgroup+allidesk-reception-a@gmail.com',
  'gostratgroup+allidesk-finance-a@gmail.com',
  'gostratgroup+allidesk-admin-b@gmail.com'
);

insert into operational_readiness_storage_results
select
  'auth_context',
  'system',
  'All required auth users discovered',
  count(*)::text,
  '5',
  case when count(*) = 5 then 'passed' else 'failed' end,
  null
from operational_readiness_storage_auth_context;

-- Tenant A admin.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', (select profile_id::text from operational_readiness_storage_auth_context where email = 'gostratgroup+allidesk-admin-a@gmail.com'), true);

insert into operational_readiness_storage_results
select
  'tenant_isolation',
  'gostratgroup+allidesk-admin-a@gmail.com',
  'Tenant A admin sees Tenant A document files only',
  jsonb_build_object(
    'tenant_a', (select count(*) from public.document_files where tenant_id = '10000000-0000-4000-8000-000000000001'),
    'tenant_b', (select count(*) from public.document_files where tenant_id = '20000000-0000-4000-8000-000000000001')
  )::text,
  'Tenant A rows visible; Tenant B hidden',
  case
    when (select count(*) from public.document_files where tenant_id = '10000000-0000-4000-8000-000000000001') >= 6
     and (select count(*) from public.document_files where tenant_id = '20000000-0000-4000-8000-000000000001') = 0
    then 'passed'
    else 'failed'
  end,
  null;

insert into operational_readiness_storage_results
select
  'role_access',
  'gostratgroup+allidesk-admin-a@gmail.com',
  'Admin sees patient, clinical, practice, and generated documents',
  jsonb_object_agg(document_category, document_count)::text,
  'Patient, referral, clinical, practice logo, shared, generated visible',
  case when count(*) filter (where document_category = 'clinical_attachment') = 1
         and count(*) filter (where document_category = 'invoice_pdf') = 1
         and count(*) filter (where document_category = 'practice_logo') = 1
       then 'passed'
       else 'failed'
  end,
  null
from (
  select document_category, count(*) as document_count
  from public.document_files
  group by document_category
) categories;

do $$
declare
  message text := null;
begin
  begin
    perform *
    from public.create_document_upload_intent(
      '10000000-0000-4000-8000-000000000001',
      'patient-documents',
      '10000000-0000-4000-8000-000000000010',
      'patient_document',
      'blocked.exe',
      'application/x-msdownload',
      1024,
      'internal'
    );
    raise exception 'invalid file type unexpectedly accepted';
  exception when others then
    message := sqlerrm;
    insert into operational_readiness_storage_results
    values (
      'upload_validation',
      'gostratgroup+allidesk-admin-a@gmail.com',
      'Executable file type is rejected',
      message,
      'File type is not allowed',
      case when message like '%File type is not allowed%' then 'passed' else 'failed' end,
      message
    );
  end;
end $$;

do $$
declare
  message text := null;
begin
  begin
    perform *
    from public.create_document_upload_intent(
      '10000000-0000-4000-8000-000000000001',
      'practice-assets',
      null,
      'practice_logo',
      'too-large.png',
      'image/png',
      6291456,
      'practice'
    );
    raise exception 'oversized practice asset unexpectedly accepted';
  exception when others then
    message := sqlerrm;
    insert into operational_readiness_storage_results
    values (
      'upload_validation',
      'gostratgroup+allidesk-admin-a@gmail.com',
      'Oversized practice logo is rejected',
      message,
      'File size is not allowed',
      case when message like '%File size is not allowed%' then 'passed' else 'failed' end,
      message
    );
  end;
end $$;

do $$
declare
  message text := null;
begin
  begin
    insert into public.document_files (
      tenant_id,
      patient_id,
      bucket_id,
      object_path,
      original_filename,
      safe_filename,
      content_type,
      file_size_bytes,
      document_category
    )
    values (
      '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000010',
      'patient-documents',
      'tenant/20000000-0000-4000-8000-000000000001/patients/10000000-0000-4000-8000-000000000010/documents/00000000-0000-4000-8000-000000000001/bad.pdf',
      'bad.pdf',
      'bad.pdf',
      'application/pdf',
      1024,
      'patient_document'
    );
    raise exception 'path mismatch unexpectedly accepted';
  exception when others then
    message := sqlerrm;
    insert into operational_readiness_storage_results
    values (
      'upload_validation',
      'gostratgroup+allidesk-admin-a@gmail.com',
      'Object path must match tenant and metadata',
      message,
      'Object path does not match document metadata',
      case when message like '%Object path does not match document metadata%' then 'passed' else 'failed' end,
      message
    );
  end;
end $$;
commit;

-- Tenant A therapist.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', (select profile_id::text from operational_readiness_storage_auth_context where email = 'gostratgroup+allidesk-therapist-a@gmail.com'), true);
insert into operational_readiness_storage_results
select
  'role_access',
  'gostratgroup+allidesk-therapist-a@gmail.com',
  'Therapist sees patient/referral/clinical documents but not finance generated documents',
  jsonb_object_agg(document_category, document_count)::text,
  'patient/referral/clinical visible; invoice_pdf hidden',
  case when count(*) filter (where document_category = 'clinical_attachment') = 1
         and count(*) filter (where document_category = 'invoice_pdf') = 0
       then 'passed'
       else 'failed'
  end,
  null
from (
  select document_category, count(*) as document_count
  from public.document_files
  group by document_category
) categories;
commit;

-- Tenant A receptionist.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', (select profile_id::text from operational_readiness_storage_auth_context where email = 'gostratgroup+allidesk-reception-a@gmail.com'), true);
insert into operational_readiness_storage_results
select
  'role_access',
  'gostratgroup+allidesk-reception-a@gmail.com',
  'Reception sees patient/referral/practice documents but not clinical or finance documents',
  jsonb_object_agg(document_category, document_count)::text,
  'patient/referral/practice visible; clinical/finance hidden',
  case when count(*) filter (where document_category = 'clinical_attachment') = 0
         and count(*) filter (where document_category = 'invoice_pdf') = 0
         and count(*) filter (where document_category = 'practice_logo') = 1
       then 'passed'
       else 'failed'
  end,
  null
from (
  select document_category, count(*) as document_count
  from public.document_files
  group by document_category
) categories;
commit;

-- Tenant A finance.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', (select profile_id::text from operational_readiness_storage_auth_context where email = 'gostratgroup+allidesk-finance-a@gmail.com'), true);
insert into operational_readiness_storage_results
select
  'role_access',
  'gostratgroup+allidesk-finance-a@gmail.com',
  'Finance sees generated finance documents but not clinical attachments',
  jsonb_object_agg(document_category, document_count)::text,
  'invoice_pdf visible; clinical hidden',
  case when count(*) filter (where document_category = 'invoice_pdf') = 1
         and count(*) filter (where document_category = 'clinical_attachment') = 0
       then 'passed'
       else 'failed'
  end,
  null
from (
  select document_category, count(*) as document_count
  from public.document_files
  group by document_category
) categories;
commit;

-- Tenant B admin.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', (select profile_id::text from operational_readiness_storage_auth_context where email = 'gostratgroup+allidesk-admin-b@gmail.com'), true);
insert into operational_readiness_storage_results
select
  'tenant_isolation',
  'gostratgroup+allidesk-admin-b@gmail.com',
  'Tenant B admin sees Tenant B documents only',
  jsonb_build_object(
    'tenant_a', (select count(*) from public.document_files where tenant_id = '10000000-0000-4000-8000-000000000001'),
    'tenant_b', (select count(*) from public.document_files where tenant_id = '20000000-0000-4000-8000-000000000001')
  )::text,
  'Tenant B rows visible; Tenant A hidden',
  case
    when (select count(*) from public.document_files where tenant_id = '10000000-0000-4000-8000-000000000001') = 0
     and (select count(*) from public.document_files where tenant_id = '20000000-0000-4000-8000-000000000001') = 1
    then 'passed'
    else 'failed'
  end,
  null;
commit;

-- Anonymous direct table access is denied by default.
begin;
set local role anon;
do $$
declare
  observed_count integer := null;
  message text := null;
begin
  begin
    select count(*) into observed_count from public.document_files;
  exception when others then
    message := sqlerrm;
  end;

  insert into operational_readiness_storage_results
  values (
    'anonymous_access',
    'anon',
    'Anonymous cannot list document_files directly',
    coalesce(observed_count::text, message),
    'permission denied or zero rows',
    case when message like '%permission denied%' or coalesce(observed_count, 0) = 0 then 'passed' else 'failed' end,
    message
  );
end $$;
commit;

-- Patient Link access uses the scoped RPC only.
do $$
declare
  test_token text := 'fictional-storage-harness-token';
begin
  delete from public.patient_link_sessions
  where metadata ->> 'seed_key' = 'storage_harness_patient_link_session';

  insert into public.patient_link_sessions (
    id,
    tenant_id,
    patient_link_id,
    access_grant_id,
    patient_id,
    session_token_hash,
    session_status,
    expires_at,
    metadata
  )
  values (
    '10000000-0000-4000-8000-000000000046',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000019',
    '10000000-0000-4000-8000-000000000033',
    '10000000-0000-4000-8000-000000000010',
    public.hash_patient_link_secret(test_token),
    'active',
    now() + interval '15 minutes',
    jsonb_build_object('seed_key', 'storage_harness_patient_link_session')
  )
  on conflict (id) do update
  set session_token_hash = excluded.session_token_hash,
      session_status = 'active',
      expires_at = excluded.expires_at,
      revoked_at = null,
      revocation_reason = null,
      deleted_at = null,
      metadata = excluded.metadata;
end $$;

begin;
set local role anon;
insert into operational_readiness_storage_results
select
  'patient_link_access',
  'anon',
  'Valid Patient Link session sees only explicitly shared documents',
  (public.get_patient_link_shared_documents('pilot-public-identifier-not-for-production', 'fictional-storage-harness-token') -> 'documents')::text,
  'One shared document; no internal-only documents',
  case
    when jsonb_array_length(public.get_patient_link_shared_documents('pilot-public-identifier-not-for-production', 'fictional-storage-harness-token') -> 'documents') = 1
    then 'passed'
    else 'failed'
  end,
  null;

insert into operational_readiness_storage_results
select
  'patient_link_access',
  'anon',
  'Invalid Patient Link session cannot see documents',
  public.get_patient_link_shared_documents('pilot-public-identifier-not-for-production', 'wrong-token')::text,
  'expired_session with empty documents',
  case
    when public.get_patient_link_shared_documents('pilot-public-identifier-not-for-production', 'wrong-token') ->> 'access_state' = 'expired_session'
     and jsonb_array_length(public.get_patient_link_shared_documents('pilot-public-identifier-not-for-production', 'wrong-token') -> 'documents') = 0
    then 'passed'
    else 'failed'
  end,
  null;
commit;

select *
from operational_readiness_storage_results
order by area, actor_email, check_name;

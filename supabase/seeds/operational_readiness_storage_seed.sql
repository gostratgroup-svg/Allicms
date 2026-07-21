-- AlliDesk operational-readiness storage metadata seed.
--
-- Purpose:
--   Create fictional, repeatable document metadata rows for validating
--   tenant-scoped storage policies and document RLS in allidesk-dev.
--
-- Safety:
--   - Development environment only.
--   - No real patient, clinical, billing, or document data.
--   - No binary files are inserted by this seed.
--   - Rows are stable and safe to rerun.

begin;

do $$
declare
  tenant_a_id uuid := '10000000-0000-4000-8000-000000000001';
  tenant_b_id uuid := '20000000-0000-4000-8000-000000000001';
  practice_profile_a_id uuid := '10000000-0000-4000-8000-000000000002';
  practice_branding_a_id uuid := '10000000-0000-4000-8000-000000000006';
  patient_a_id uuid := '10000000-0000-4000-8000-000000000010';
  responsible_party_a_id uuid := '10000000-0000-4000-8000-000000000011';
  patient_b_id uuid := '20000000-0000-4000-8000-000000000002';
  invoice_a_id uuid := '10000000-0000-4000-8000-000000000016';
begin
  if not exists (select 1 from public.tenants where id = tenant_a_id) then
    raise exception 'Tenant A seed fixture is missing. Run operational_readiness_pilot_seed.sql first.';
  end if;

  insert into public.document_files (
    id,
    tenant_id,
    patient_id,
    responsible_party_id,
    practice_profile_id,
    practice_branding_id,
    invoice_id,
    bucket_id,
    object_path,
    original_filename,
    safe_filename,
    content_type,
    file_size_bytes,
    document_category,
    document_status,
    sharing_scope,
    patient_link_visible,
    patient_link_shared_at,
    upload_completed_at,
    metadata
  )
  values
    (
      '10000000-0000-4000-8000-000000000040',
      tenant_a_id,
      patient_a_id,
      responsible_party_a_id,
      null,
      null,
      null,
      'patient-documents',
      'tenant/10000000-0000-4000-8000-000000000001/patients/10000000-0000-4000-8000-000000000010/documents/10000000-0000-4000-8000-000000000040/fictional-intake.pdf',
      'fictional-intake.pdf',
      'fictional-intake.pdf',
      'application/pdf',
      2048,
      'patient_document',
      'uploaded',
      'internal',
      false,
      null,
      now(),
      jsonb_build_object('seed_key', 'storage_patient_document_a')
    ),
    (
      '10000000-0000-4000-8000-000000000041',
      tenant_a_id,
      patient_a_id,
      responsible_party_a_id,
      null,
      null,
      null,
      'patient-documents',
      'tenant/10000000-0000-4000-8000-000000000001/patients/10000000-0000-4000-8000-000000000010/documents/10000000-0000-4000-8000-000000000041/fictional-referral.pdf',
      'fictional-referral.pdf',
      'fictional-referral.pdf',
      'application/pdf',
      2048,
      'referral_document',
      'uploaded',
      'internal',
      false,
      null,
      now(),
      jsonb_build_object('seed_key', 'storage_referral_document_a')
    ),
    (
      '10000000-0000-4000-8000-000000000042',
      tenant_a_id,
      patient_a_id,
      null,
      null,
      null,
      null,
      'clinical-attachments',
      'tenant/10000000-0000-4000-8000-000000000001/patients/10000000-0000-4000-8000-000000000010/clinical/10000000-0000-4000-8000-000000000042/fictional-clinical-attachment.pdf',
      'fictional-clinical-attachment.pdf',
      'fictional-clinical-attachment.pdf',
      'application/pdf',
      2048,
      'clinical_attachment',
      'uploaded',
      'clinical',
      false,
      null,
      now(),
      jsonb_build_object('seed_key', 'storage_clinical_attachment_a', 'attachment_category', 'assessment_file')
    ),
    (
      '10000000-0000-4000-8000-000000000043',
      tenant_a_id,
      null,
      null,
      practice_profile_a_id,
      practice_branding_a_id,
      null,
      'practice-assets',
      'tenant/10000000-0000-4000-8000-000000000001/practice-assets/10000000-0000-4000-8000-000000000043/fictional-logo.png',
      'fictional-logo.png',
      'fictional-logo.png',
      'image/png',
      1024,
      'practice_logo',
      'uploaded',
      'practice',
      false,
      null,
      now(),
      jsonb_build_object('seed_key', 'storage_practice_logo_a')
    ),
    (
      '10000000-0000-4000-8000-000000000044',
      tenant_a_id,
      patient_a_id,
      responsible_party_a_id,
      null,
      null,
      null,
      'patient-documents',
      'tenant/10000000-0000-4000-8000-000000000001/patients/10000000-0000-4000-8000-000000000010/documents/10000000-0000-4000-8000-000000000044/fictional-shared-care-summary.pdf',
      'fictional-shared-care-summary.pdf',
      'fictional-shared-care-summary.pdf',
      'application/pdf',
      2048,
      'patient_document',
      'uploaded',
      'patient_link',
      true,
      now(),
      now(),
      jsonb_build_object('seed_key', 'storage_patient_link_shared_a')
    ),
    (
      '10000000-0000-4000-8000-000000000045',
      tenant_a_id,
      null,
      null,
      null,
      null,
      invoice_a_id,
      'generated-documents',
      'tenant/10000000-0000-4000-8000-000000000001/generated/invoice_pdf/10000000-0000-4000-8000-000000000045/fictional-invoice.pdf',
      'fictional-invoice.pdf',
      'fictional-invoice.pdf',
      'application/pdf',
      2048,
      'invoice_pdf',
      'uploaded',
      'finance',
      false,
      null,
      now(),
      jsonb_build_object('seed_key', 'storage_generated_invoice_a')
    ),
    (
      '20000000-0000-4000-8000-000000000040',
      tenant_b_id,
      patient_b_id,
      null,
      null,
      null,
      null,
      'patient-documents',
      'tenant/20000000-0000-4000-8000-000000000001/patients/20000000-0000-4000-8000-000000000002/documents/20000000-0000-4000-8000-000000000040/fictional-tenant-b-document.pdf',
      'fictional-tenant-b-document.pdf',
      'fictional-tenant-b-document.pdf',
      'application/pdf',
      2048,
      'patient_document',
      'uploaded',
      'internal',
      false,
      null,
      now(),
      jsonb_build_object('seed_key', 'storage_patient_document_b')
    )
  on conflict (id) do update
  set document_status = excluded.document_status,
      sharing_scope = excluded.sharing_scope,
      patient_link_visible = excluded.patient_link_visible,
      patient_link_shared_at = excluded.patient_link_shared_at,
      upload_completed_at = excluded.upload_completed_at,
      metadata = excluded.metadata,
      deleted_at = null,
      archived_at = null,
      archive_reason = null,
      updated_at = now();
end;
$$;

commit;

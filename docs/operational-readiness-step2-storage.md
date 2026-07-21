# Operational Readiness Step 2 — Tenant-Scoped Storage Foundation

Date: 2026-07-18

## Target Environment

- Supabase project: `allidesk-dev`
- Project ref: `wdhfhdpcrcuyxqjehiyy`
- Classification: development only
- Data classification: fictional files and metadata only

## Baseline Audit

Pre-implementation checks:

- `git branch --show-current`: `main`
- `npx supabase projects list`: linked project is `allidesk-dev`, ref `wdhfhdpcrcuyxqjehiyy`
- `npx supabase migration list --linked`: local and remote ledgers match through `202607170007`
- `npm run build`: passed with the known Vite large-chunk warning

Existing surfaces found:

| Area | Existing state |
| --- | --- |
| Clinical attachments | `clinical_attachments` table exists with metadata fields `storage_bucket`, `storage_path`, `file_name`, `mime_type`, `file_size_bytes`, `is_restricted`, and `patient_visible_allowed`. The UI currently stores metadata only and explicitly says secure upload/download is deferred. |
| Finance proof of payment | `payments.proof_document_id` exists but has no file metadata/table contract connected yet. |
| Practice branding | `practice_branding.logo_url` exists and the UI accepts a logo URL/path. No Supabase Storage upload flow exists. |
| Patient documents | No general tenant-scoped patient document table exists. |
| Referral documents | No separate referral table exists; referral documents should be classified under patient documents. |
| Generated documents | Invoice/receipt/statement readiness fields exist in finance, but production PDF generation and file storage are deferred. |
| Patient Link documents | Patient Link has document visibility flags and public/session boundaries, but no shared-document storage model yet. |
| Supabase Storage assumptions | No storage bucket migrations or storage object RLS policies existed before this step. |

## Storage Model

The minimum bucket model uses private buckets only:

- `patient-documents`
- `clinical-attachments`
- `practice-assets`
- `generated-documents`

No patient, clinical, finance, or generated bucket is public.

Practice assets are private for this pilot foundation. Rendering should use signed URLs or a controlled delivery path. The whole `practice-assets` bucket is not public.

## Metadata Contract

This step introduces a central `document_files` metadata table for non-clinical and cross-domain documents.

Clinical metadata remains owned by the Clinical Engine through `clinical_attachments`. Clinical attachment rows are extended only where necessary to interoperate with Storage.

`document_files` supports:

- tenant ownership
- patient linkage where relevant
- practice branding references
- payment/proof references
- generated document references
- bucket and object path
- original filename
- content type
- file size
- document category
- sharing scope
- upload status
- archive status
- Patient Link visibility metadata
- audit-compatible actor fields

## Object Path Rules

All object paths must be tenant scoped.

Approved path patterns:

```text
tenant/{tenant_id}/patients/{patient_id}/documents/{document_id}/{safe_filename}
tenant/{tenant_id}/patients/{patient_id}/clinical/{document_id}/{safe_filename}
tenant/{tenant_id}/practice-assets/{document_id}/{safe_filename}
tenant/{tenant_id}/generated/{document_type}/{document_id}/{safe_filename}
```

Frontend-supplied tenant ids are not trusted. Metadata insert/update policies and RPCs validate tenant membership and related record ownership.

## Upload Restrictions

Pilot content types:

- Patient/referral/proof/generated documents: PDF, JPG/JPEG, PNG, DOC, DOCX
- Clinical attachments: PDF, JPG/JPEG, PNG
- Practice assets: PNG, JPG/JPEG

SVG and arbitrary executable files are excluded for the pilot.

Pilot size limits:

- Patient documents: 15 MB
- Clinical attachments: 15 MB
- Practice assets: 5 MB
- Generated documents: 20 MB

## Role Access Model

| Role | Storage intent |
| --- | --- |
| Admin | Tenant-wide patient documents, practice assets, generated documents, finance documents, and clinical attachments where current clinical policy allows. |
| Therapist | Patient/referral documents and clinical attachments for tenant patients; no finance-only files. |
| Receptionist | Operational patient/referral documents and practice assets; no protected clinical attachments or finance-only files. |
| Finance | Finance-relevant documents, proof-of-payment files, and generated invoice/receipt/statement documents; no protected clinical attachments. |
| Patient Link | Future scoped access only to explicitly shared documents through a valid Patient Link session; cannot list buckets or infer object paths. |
| Anonymous | Denied by default except public Patient Link RPC boundaries. |

## Signed URL Strategy

The database stores object paths, not signed URLs.

Frontend and future server workflows should request short-lived signed URLs only after metadata/RLS checks pass.

## Archive/Delete Strategy

Normal user flows archive or soft-delete metadata.

Hard deletion of sensitive clinical or finance files is not part of the pilot foundation.

## Deferred From This Step

- PDF generation
- Full Patient Link document rendering
- Communication delivery
- Workflow worker runtime
- Payment gateways
- Medical aid claims
- AI

## Implementation Completed

Migrations applied to `allidesk-dev`:

- `202607180001_operational_readiness_storage_foundation.sql`
- `202607180002_storage_clinical_attachment_metadata_fix.sql`
- `202607180003_patient_link_document_access_log_event.sql`

Frontend foundation added:

- `src/lib/storageDocuments.ts`
  - Creates upload intents through `create_document_upload_intent(...)`.
  - Uploads files to private Supabase Storage buckets.
  - Finalises uploaded document metadata through `finalise_document_upload(...)`.
  - Provides short-lived signed URL helper for future preview/download flows.
- `src/pages/PracticeBranding.tsx`
  - Supports private logo upload into `practice-assets`.
  - Stores the resulting object path in `practice_branding.logo_url`.
- `src/pages/Clinical.tsx`
  - Supports private clinical attachment upload into `clinical-attachments`.
  - Keeps clinical attachment metadata owned by the Clinical Engine through finalisation.

Validation artifacts added:

- `supabase/seeds/operational_readiness_storage_seed.sql`
- `supabase/smoke-tests/operational_readiness_storage_security.sql`

## Validation Results

Passed:

- Migration comparison matched through `202607180003`.
- Schema smoke test passed.
- Storage seed executed and was safe to rerun.
- Storage seed remained stable at 7 fictional metadata rows.
- Storage security harness passed all checks.
- Supabase TypeScript types regenerated.
- `npm run build` passed.

Storage harness coverage:

- Tenant A cannot see Tenant B document metadata.
- Tenant B cannot see Tenant A document metadata.
- Admin, therapist, receptionist and finance storage visibility follows the current role model.
- Anonymous direct `document_files` access is denied.
- Valid Patient Link session returns only explicitly shared documents.
- Invalid Patient Link session returns no documents.
- Executable files are rejected.
- Oversized practice logo files are rejected.
- Object paths must match tenant/document metadata.

Known remaining warning:

- Existing Vite large chunk warning remains.

## Notes

The seed creates document metadata fixtures only. Binary file fixtures are intentionally not committed. Real upload validation is performed through the application helper path and Supabase Storage policies.

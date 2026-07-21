# Phase 6A Step 4 Clinical Engine Validation

## Objective

Phase 6A Step 4 reviewed and hardened the completed Clinical Engine architecture, database foundation, frontend foundation, permissions, patient-context routing, note lifecycle, Patient Link publication boundary, restricted-record handling, attachment safety, audit integrity, and validation posture.

This step did not add broad product scope. It did not implement AI features, reporting, profession-specific modules, full Patient Link rendering, storage uploads/downloads, or new clinical product areas.

## Areas Reviewed

- `docs/phase6a-step1-clinical-engine-architecture.md`
- `supabase/migrations/202607150001_phase6a_clinical_engine.sql`
- `src/lib/database.types.ts`
- `src/pages/Clinical.tsx`
- `src/pages/Patients.tsx`
- `src/routes/appRoutes.tsx`
- `src/auth/permissions.ts`
- `src/styles.css`
- `docs/phase6a-step2-clinical-database-summary.md`
- `docs/phase6a-step3-clinical-frontend-summary.md`

## Defects Found

### Patient-Context Loading Was Too Broad

The Clinical workspace loaded tenant-wide clinical records and then filtered them client-side by selected patient. RLS still protected cross-tenant access, but this did not meet the patient-context integrity target for the clinical workspace.

Resolution:

- The Clinical page now loads tenant-level reference data separately.
- Clinical records are loaded only for the selected valid patient.
- Invalid or inaccessible patient query parameters no longer silently open another patient’s clinical record set.

### Patient Link Publication Needed Stronger Database Validation

The original publication RPC required patient-visible records and approved lifecycle states for some record types, but restricted records could still be marked patient-visible and submitted for publication.

Resolution:

- A forward-only hardening migration now blocks restricted records from Patient Link publication at the database boundary.
- Publication integrity is validated by trigger as well as RPC logic.
- The frontend publication selector also excludes restricted publication targets.

### Clinical Note Latest Version Needed Same-Note Integrity

`clinical_notes.latest_version_id` referenced an existing note version, but needed explicit enforcement that the version belongs to the same clinical note and tenant.

Resolution:

- A forward-only hardening migration adds a validation trigger to enforce same-note and same-tenant latest-version integrity.

## Hardening Changes Made

### Frontend

- `src/pages/Clinical.tsx`
  - Split tenant reference loading from selected-patient clinical loading.
  - Scoped bookings, sessions, encounters, notes, versions, amendments, plans, goals, reviews, assessments, results, diagnoses, attachments, restrictions, and publications to the selected patient.
  - Kept patient list access tenant-scoped so users can select a patient safely.
  - Added safe handling for invalid patient route parameters.
  - Excluded restricted records from Patient Link publication choices.

- `docs/phase6a-step3-clinical-frontend-summary.md`
  - Updated the data-loading description to distinguish tenant-scoped reference reads from selected-patient clinical reads.

### Database

Added migration:

- `supabase/migrations/202607160001_phase6a_clinical_engine_hardening.sql`

The migration adds:

- `validate_clinical_note_latest_version_integrity()`
- `clinical_notes_validate_latest_version_integrity` trigger
- `validate_clinical_patient_link_publication_integrity()`
- `clinical_patient_link_publications_validate_record_integrity` trigger
- Hardened replacement of `publish_clinical_record_to_patient_link(...)`

## Permission Alignment

Frontend permissions remain aligned with the existing authorization model:

- Read access: `tenant.clinical.view`
- Mutation access: `tenant.clinical.manage`
- Route access area: `clinical`

Database RLS follows the established AlliDesk role-based convention:

- Clinical tenant access is limited to tenant `admin` and `therapist` roles.
- Receptionist and finance roles are not included in Clinical Engine RLS policies.
- Super Admin has no default tenant clinical RLS access.

The frontend named permissions map to the same role intent as the database role policies. No separate database permission-table migration was required because the current platform still resolves operational permissions from tenant roles.

## Route And Patient-Context Validation

Validated:

- `/patients/clinical` is hidden from top-level navigation.
- Direct URL access is still protected by the central route guard.
- Super Admin cannot access the tenant clinical route through the normal app shell.
- Tenant ID is never read from the URL.
- Patient ID is treated only as a selector within the active tenant context.
- Invalid patient IDs fail safely and do not load another patient’s clinical record set.
- Clinical records are now fetched only for the selected patient.
- Navigation back to `/patients` remains visible.

## Clinical Note Lifecycle Validation

Validated:

- Draft note versions can be edited directly.
- Finalised, signed, amended, and locked notes are treated as immutable in the UI.
- Finalisation uses `finalise_clinical_note_version(...)`.
- Signing uses `sign_clinical_note_version(...)`.
- Amendment uses `amend_clinical_note(...)`.
- Amendment records remain append-only.
- Database trigger `enforce_clinical_note_version_immutability()` blocks destructive edits to non-draft note content.
- Database trigger `enforce_clinical_append_only()` blocks update/delete on amendment rows.
- Workflow events and audit events store identifiers and lifecycle metadata, not full clinical note content.

Deferred live validation:

- Concurrent stale draft edits should be tested against real Supabase data.
- Lock-version behaviour exists on many clinical tables, but note versions do not yet have a user-facing optimistic concurrency token. This is acceptable for the current foundation and should be revisited during workflow hardening.

## Template Validation

Validated:

- Notes store `clinical_note_template_version_id`, not only a template key.
- Template versions are protected by immutability triggers once active, retired, or archived.
- Existing notes are not rewritten when templates change.
- Free-text and structured JSON content can coexist.
- Structured content is validated as a JSON object.
- Tenant templates and system templates are separated by `tenant_id`, `template_owner_type`, and owner-scope checks.

Deferred:

- Full schema validation against template schema definitions remains future work.

## Clinical Domain Integration

Validated:

- Clinical records may reference bookings and sessions but remain tenant-owned clinical records.
- Finance roles do not receive clinical RLS access.
- Clinical diagnoses are independent clinical coding records and are not treated as invoice billing codes.
- Session completion does not finalise or sign clinical notes.
- Clinical workflow events contain safe IDs and compact metadata.
- Deleted/cancelled/rescheduled operational records use nullable references where appropriate, so historical clinical context is not destroyed by operational lifecycle changes.

## Patient Link Boundary Validation

Validated and hardened:

- Publication is explicit through protected RPC.
- Publication records store safe title and summary metadata only.
- Internal clinical content is not copied into publication records.
- Revocation updates publication state and does not delete internal clinical records.
- Publication records do not grant general clinical table access.
- Approved record types remain constrained.
- Approved lifecycle states are enforced for notes, assessments, and outcome results.
- Restricted notes, assessments, attachments, and actively restricted records are blocked from publication.

## Restricted-Record Validation

Validated:

- Restricted-record metadata exists in `clinical_record_restrictions`.
- The frontend shows restricted-record counts and restricted badges.
- Restricted records are excluded from Patient Link publication options.
- Database hardening blocks restricted records from publication even if the frontend is bypassed.

Deferred:

- A future `tenant.clinical.restricted.view` permission can further refine which tenant clinical users can view restricted clinical records. Current RLS follows the approved Phase 6A baseline of tenant admin/therapist clinical access.

## Attachment Security Status

Validated:

- The Clinical frontend records and displays attachment metadata only.
- No upload or download UI was added.
- No public storage bucket is assumed.
- No unsigned or public storage URLs are generated.
- Storage integration remains deferred.

## Audit And Medico-Legal Integrity Review

Validated:

- Clinical lifecycle RPCs create `audit_events`.
- Note finalisation, signing, amendment, publication, and revocation record actor, tenant, entity, record IDs, and safe metadata.
- Full clinical note content is not copied into audit metadata.
- Signed/finalised note content is protected by database triggers.
- Amendments append history instead of replacing signed content.
- Patient Link publication and revocation history is preserved.

## SQL Hardening Review

Reviewed:

- Forward-only migration strategy
- RLS policies
- Grants
- Security definer search paths
- Tenant-integrity trigger coverage
- Polymorphic Patient Link publication boundaries
- Note latest-version integrity
- Append-only protections
- Workflow event payloads

Hardening added:

- Same-note latest-version validation.
- Polymorphic clinical publication target validation.
- Restricted-record publication blocking.

## Deferred Live Supabase Tests

These require a connected Supabase development database with representative seed data:

- Cross-tenant reference rejection through triggers.
- Invalid lifecycle transition rejection.
- Direct edit attempts against finalised/signed note versions.
- Amendment update/delete rejection.
- Publication of invalid record types.
- Publication of restricted records.
- Publication of non-finalised notes or non-finalised outcomes.
- Super Admin tenant clinical access checks.
- Receptionist/finance clinical route and RLS denial.
- Concurrent/stale draft update behaviour.
- Existing RLS policy behaviour against real tenant memberships.

## Validation Results

- `npm run build`: passed.
- Existing Vite large-chunk warning remains.
- `git diff --check`: passed.

## Final Readiness Assessment

Phase 6A Clinical Engine is ready to proceed to Step 5 testing and completion work.

No genuine blocker remains before Phase 6A Step 5. The remaining items are live Supabase validation tasks and future clinical refinement tasks, not architecture-blocking defects.

# Phase 6B Step 4: Clinical Documentation Validation

## Overall Status

Phase 6B Step 4 reviewed and hardened the Clinical Documentation System created across Phase 6B Steps 1-3.

Status: **PASS WITH HARDENING CHANGES**

No broad product scope was added. No administrative template designer, AI, voice transcription, realtime collaboration, discipline-specific module, advanced reporting, or Patient Link clinical rendering was implemented.

## Areas Reviewed

Reviewed:

- Phase 6B architecture documentation
- Phase 6B clinical documentation migration
- Phase 6B frontend transactional draft RPC migration
- Phase 6A Clinical Engine migrations and hardening migrations
- Generated database types
- `src/pages/Clinical.tsx`
- `src/components/clinical/ClinicalDocumentationWorkspace.tsx`
- Clinical workspace styles
- Documentation summary files
- Existing auth, permissions, RLS and lifecycle RPC conventions

## Genuine Defects Found

### 1. Draft Creation Retry Risk

`create_clinical_note_draft(...)` created note, version and draft-state records transactionally, but repeated submissions with the same client idempotency key could still create duplicate draft notes.

Impact:

- Duplicate clinical draft notes could appear if a network retry or duplicate click reached the database more than once.

Resolution:

- Added idempotency lookup and transaction-scoped advisory locking inside `create_clinical_note_draft(...)`.
- Repeated requests with the same tenant/idempotency key return the existing draft note/version.

### 2. Free-Text Draft Save Used Direct Table Update

The frontend free-text draft save updated `clinical_note_versions` directly.

Impact:

- Free-text saves did not use a protected RPC boundary.
- Draft lock-state validation was not consistently applied to free-text edits.

Resolution:

- Added `save_clinical_note_free_text_draft(...)`.
- Updated the frontend to call the RPC with `expected_draft_lock_version`.
- Free-text saves now update the note version and draft state through protected database logic.

### 3. Structured Response Payload Validation Needed Hardening

`save_clinical_note_structured_response(...)` already validated note/template relationships and stale lock versions, but relied too heavily on frontend-formed payloads for value type and option safety.

Impact:

- A crafted client could attempt to save mismatched value types or unsupported options.

Resolution:

- Added `clinical_response_value_type_for_field(...)`.
- Added `validate_clinical_structured_response_payload(...)`.
- Replaced `save_clinical_note_structured_response(...)` with a hardened version that:
  - Rejects non-response field types.
  - Rejects read-only/calculated fields.
  - Enforces expected value type.
  - Enforces allowed choice/checklist options.
  - Enforces measurement units when configured.
  - Preserves existing optimistic-lock behaviour.

### 4. Copy-Forward Compatibility Needed Hardening

Copy-forward was selective and same-patient enforced through integrity triggers, but compatibility between source and target fields was not explicitly checked before copying.

Impact:

- A source value could be copied into an incompatible target field type.

Resolution:

- Replaced `copy_forward_clinical_response(...)` with a hardened version that:
  - Verifies source and target tenant/patient boundaries before copying.
  - Verifies the target note version is a draft.
  - Verifies the target field belongs to the target note template version.
  - Verifies compatible field value types.
  - Rejects generic copy-forward of restricted or practitioner-only fields.
  - Adds idempotency metadata for duplicate request handling.

## Migrations Added

Added:

- `supabase/migrations/202607160005_phase6b_clinical_documentation_hardening.sql`

Objects added or replaced:

- `clinical_template_version_is_available_for_context(...)`
- `clinical_response_value_type_for_field(...)`
- `validate_clinical_structured_response_payload(...)`
- `create_clinical_note_draft(...)`
- `save_clinical_note_free_text_draft(...)`
- `save_clinical_note_structured_response(...)`
- `copy_forward_clinical_response(...)`

## Transactional Draft Validation

Validated and hardened:

- Authenticated user required.
- Tenant clinical role required through existing `has_tenant_role(..., ['admin', 'therapist'])` pattern.
- Patient must belong to the target tenant.
- Encounter must belong to the same tenant and patient.
- Booking/session/practitioner context is derived from the validated encounter only.
- Template version must be active and tenant/system scoped.
- Template availability now honours assignment context where assignments exist.
- Author, tenant and lifecycle state are not caller-spoofable.
- Draft note, initial version and draft state are created in one RPC transaction.
- Idempotency key retries return the existing draft instead of creating duplicates.
- Function uses fixed `search_path = public`.

Live Supabase validation still required:

- Concurrent duplicate request race testing under real Postgres runtime.

## Template Availability Validation

Validated and hardened:

- New drafts can only select active template versions.
- Tenant templates are constrained to the active tenant.
- System templates are selectable without exposing tenant content.
- If active assignments exist, selection must match tenant, encounter, location or practitioner context.
- Retired versions remain available for historical rendering but are not selectable for new notes.
- Existing notes remain linked to the exact template version used.

Deferred:

- Full administrative assignment management UI.
- Favourite/recent template persistence.

## Structured Response And Locking Validation

Validated and hardened:

- Responses must belong to the same note, note version, patient, tenant and template version.
- Field and section references must belong to the note template version.
- Draft-only editing remains enforced.
- Stale `lock_version` updates are rejected and mark the draft state as conflicted.
- Current responses remain unique per note version, field and repeat position.
- Unsupported non-response fields are rejected.
- Read-only and calculated fields are rejected.
- Choice values must match configured options.
- Multi-choice/checklist values must be arrays of configured options.
- Measurement units must match configured allowed units when configured.
- Finalised/signed response edits remain blocked by existing immutability triggers.

Concurrency model:

- Structured response locking is field-level.
- Draft state also records broader conflict state for UX visibility.

## Free-Text Integration

Validated and hardened:

- Free-text and structured responses remain attached to the same note version.
- Free-text saves no longer overwrite structured responses.
- Structured saves do not overwrite free-text.
- Free-text editing is protected through `save_clinical_note_free_text_draft(...)`.
- The frontend passes the current draft lock version.
- Finalised/signed versions remain immutable.

## Finalisation And Signing Validation

Validated:

- Frontend calls `validate_clinical_note_version_ready_for_finalisation(...)` before finalisation.
- Finalisation remains protected by `finalise_clinical_note_version(...)`.
- Signing remains protected by `sign_clinical_note_version(...)`.
- Finalisation does not automatically sign.
- Signing requires the database lifecycle state.
- Finalised and signed content cannot be edited directly.

Live Supabase validation still required:

- Seeded-template finalisation scenarios for required fields, missing calculations and invalid responses.

## Copy-Forward Safety

Validated and hardened:

- Copy-forward remains explicit and field-level.
- Full-note automatic copy-forward is not implemented.
- Cross-tenant and cross-patient copying is rejected.
- Target must be a draft note version.
- Target field must belong to the target note template version.
- Source and target value types must be compatible.
- Restricted and practitioner-only fields cannot be copied through the generic workflow.
- Provenance remains append-only through `clinical_note_copy_forward_events`.
- Broad audit and workflow payloads use identifiers, not clinical content.

Live Supabase validation still required:

- Race and duplicate copy-forward idempotency tests.

## Patient Link Boundaries

Validated:

- Patient-visible eligibility remains metadata only.
- Eligibility does not publish content.
- Restricted and practitioner-only fields are not patient-visible eligible at the schema/trigger layer.
- Full internal note content is not rendered in Patient Link.
- Existing publication/revocation RPCs remain separate and protected.

Deferred:

- Full Patient Link clinical rendering.

## Permission And RLS Alignment

Validated:

- Frontend checks use `tenant.clinical.view` and `tenant.clinical.manage`.
- Database RLS and protected RPCs use the existing clinical role pattern: tenant `admin` and `therapist`.
- Super Admin receives no tenant clinical content access through the frontend.
- Receptionist and finance roles do not receive clinical editing capability.
- Direct table writes are not used for structured responses or free-text draft saves.
- Service-role access is not used in the frontend.

Known design note:

- Database clinical RLS is role-based, while frontend authorization exposes permission labels. This matches current AlliDesk architecture and remains acceptable until database-level permission tables become more granular.

## Audit And Workflow Payload Review

Validated:

- Draft creation audit/workflow payloads contain identifiers only.
- Structured response saves do not write clinical values into workflow events.
- Copy-forward workflow payloads contain copy event identifiers only.
- Copy-forward event table intentionally stores a limited internal value snapshot for medico-legal provenance; broad audit/workflow surfaces do not duplicate clinical content.

## Component Maintainability

Reviewed:

- `ClinicalDocumentationWorkspace.tsx` is sizeable but remains focused on one workspace.
- It avoids inflating `src/pages/Clinical.tsx`.
- Further extraction may be useful later for template picker, field renderer and timeline, but no correctness-driven refactor was required in Step 4.

## Deterministic Test Scenarios To Run In Supabase

Do not claim these as live-passed until run against a connected project with seeded identities:

- Cross-tenant template access.
- Cross-tenant response saving.
- Wrong-template field response.
- Saving to finalised/signed notes.
- Stale lock-version saves.
- Duplicate draft creation with same idempotency key.
- Invalid template selection by assignment context.
- Missing required field finalisation.
- Invalid option values.
- Editing published template definitions.
- Deleting referenced template versions.
- Cross-patient copy-forward.
- Restricted-field copy-forward.
- Practitioner-only patient-visible eligibility.
- Super Admin tenant clinical access.
- Receptionist/finance clinical access.
- Workflow payload content safety.

## Validation Performed

- `npm run build` passed.
- `git diff --check` passed.
- Existing Vite large-chunk warning remains.

## Deferred Live Supabase Tests

Still requires live Supabase validation:

- RPC runtime behaviour under RLS and seeded roles.
- Advisory-lock idempotency under concurrent duplicate submissions.
- Assignment precedence with seeded template assignments.
- Trigger behaviour for restricted/practitioner-only snapshots.
- Finalisation validation with realistic clinical templates.
- Copy-forward provenance and duplicate request behaviour.

## Final Readiness Assessment

Phase 6B Step 4 is ready for Phase 6B Step 5 testing and completion review.

No genuine blockers were identified after the hardening migration and frontend free-text RPC update.

# Phase 6B Step 3: Clinical Documentation Frontend Summary

## Overview

Phase 6B Step 3 adds the clinician-facing documentation workspace on top of the Phase 6A Clinical Engine and Phase 6B documentation database foundation.

The implementation extends the existing hidden Clinical Workspace route and does not create a competing clinical page. The focus is on clinicians creating draft documentation, selecting active templates, completing structured fields, saving draft free-text content, validating before finalisation, and selectively copying prior field values forward.

## Routes Changed

- `/patients/clinical`
  - Existing Clinical Workspace route remains in place.
  - A new `Documentation` tab was added inside the existing patient clinical workspace.

No public Patient Link rendering route was added or changed.

## Pages And Components Changed Or Added

Changed:

- `src/pages/Clinical.tsx`
  - Loads Phase 6B template definition data.
  - Loads patient-scoped structured responses, draft states, and copy-forward events.
  - Adds the `Documentation` tab.
  - Uses protected RPCs for structured response saves, copy-forward, validation, and lifecycle actions.
  - Uses the new transactional draft-note creation RPC.

Added:

- `src/components/clinical/ClinicalDocumentationWorkspace.tsx`
  - Template picker.
  - Draft note creation panel.
  - Free-text note editor.
  - Metadata-driven structured field renderer.
  - Draft indicator.
  - Validation summary.
  - Previous structured-response review and selective copy-forward.
  - Documentation timeline.

Changed styles:

- `src/styles.css`
  - Adds layout, field, timeline, template picker, validation, and responsive styles for the documentation workspace.

## Schema Defect Discovered And Fixed

The existing frontend draft creation flow required three separate client-side operations:

1. Insert `clinical_notes`.
2. Insert `clinical_note_versions`.
3. Update `clinical_notes.latest_version_id`.

That could leave a partial clinical note behind if the frontend failed mid-flow. This was a frontend-blocking integrity issue for Step 3, so a small forward-only migration was added:

- `supabase/migrations/202607160004_phase6b_clinical_documentation_frontend_rpc.sql`

Added RPC:

- `create_clinical_note_draft(...)`

The RPC creates the clinical note, initial version, draft state, audit event, and workflow event transactionally.

## Template Picker Behaviour

The picker displays only active template versions available to the current tenant context:

- Tenant templates.
- System templates.
- Template name and description.
- Version number.
- System vs tenant template distinction.
- Search by template name, description, or version.

Unpublished or unavailable versions are not shown. Retired versions remain available only for existing historical note context, not for new draft creation.

Favourite templates and recently used ordering are deferred because dedicated backend support does not exist yet.

## Renderer Architecture

The renderer is metadata-driven from:

- `clinical_template_sections`
- `clinical_template_fields`
- `clinical_template_field_options`
- `clinical_template_calculation_rules`

The UI does not hardcode SOAP, discipline-specific screens, or profession-specific workflows.

## Supported Field Types

Implemented editable controls:

- Short text
- Long text
- Rich text as text area
- Number
- Decimal
- Date
- Time
- Date and time
- Boolean
- Single choice
- Multiple choice
- Checklist
- Scale
- Measurement and units
- Laterality
- Body area

Safe read-only or deferred rendering:

- Heading
- Instruction
- Table
- Repeating group
- Read-only display
- Calculated
- Outcome measure reference
- Diagnosis reference
- Treatment goal reference
- Attachment reference

Calculated fields are rendered as read-only. The frontend does not execute arbitrary formulas, JavaScript, SQL, or template-provided code.

## Draft Save And Locking Behaviour

Structured responses are saved through:

- `save_clinical_note_structured_response(...)`

The UI passes:

- Current response payload
- Template field ID
- Current `lock_version` where a response already exists
- Idempotency key

Stale edits surface as a visible field-level conflict instead of silently overwriting newer data.

Free-text draft content remains editable only while the selected note version is in `draft` status.

## Validation Workflow

The UI provides:

- Client-side required-field hints from template metadata.
- Database-authoritative validation through `validate_clinical_note_version_ready_for_finalisation(...)`.
- A validation summary before finalisation.

Finalisation still relies on the protected database lifecycle RPC, so frontend validation is usability support only.

## Note Lifecycle Integration

Existing protected RPC-backed lifecycle actions are preserved:

- `finalise_clinical_note_version(...)`
- `sign_clinical_note_version(...)`
- `amend_clinical_note(...)`

Finalised and signed note versions are rendered as immutable in the documentation workspace.

## Copy-Forward Behaviour

The workspace lists previous structured responses for the current patient and allows selective copy-forward of individual fields only.

Copy-forward uses:

- `copy_forward_clinical_response(...)`

The UI displays source version context and copy-forward provenance where available. Copied content becomes new draft content and does not inherit the source note’s signature or legal status.

## Timeline Integration

The documentation timeline shows:

- Encounters
- Notes
- Finalisation events
- Signing events
- Copy-forward events

The timeline uses safe metadata and existing clinical permissions.

## Patient Link Boundaries

The documentation workspace distinguishes:

- Internal clinical fields
- Practitioner-only fields
- Patient-visible eligible fields
- Restricted notes

Patient-visible eligibility does not publish content automatically.

Full Patient Link clinical rendering remains deferred.

## Permission Behaviour

The workspace respects the existing authorization foundation:

- View: `tenant.clinical.view`
- Edit: `tenant.clinical.manage`

Super Admin remains excluded from tenant clinical content.

RLS remains authoritative. The frontend does not use service-role access and does not bypass tenant isolation.

## Deferred Functionality

Deferred by design:

- Administrative template designer
- Favourite templates
- Recently used template persistence
- Specialised reference pickers
- Formula/calculation execution
- Drag-and-drop template building
- AI-generated documentation
- Voice transcription
- Realtime collaboration
- Clinical image annotation
- Advanced reporting
- Full Patient Link clinical rendering
- Secure clinical attachment upload/download infrastructure

## Validation Performed

- `npm run build` passed.
- Existing Vite large-chunk warning remains.
- Structured fields are metadata-driven.
- Protected RPCs are used for structured response saves, copy-forward, validation, and lifecycle transitions.
- New draft creation is transactional through `create_clinical_note_draft(...)`.
- No hardcoded SOAP workflow was introduced.
- No arbitrary formula execution was introduced.
- No insecure attachment URLs were introduced.

# Phase 6B Step 2: Clinical Documentation Database Foundation

Date: 2026-07-16  
Status: Database foundation implemented. No frontend pages, template builder UI, structured note renderer, autosave UI, AI features, Patient Link rendering, storage delivery, or reporting dashboards were implemented.

## Scope

This step implements the configurable Clinical Documentation System database foundation described in:

- `docs/phase6a-step1-clinical-engine-architecture.md`
- `docs/phase6b-step1-clinical-documentation-architecture.md`

The implementation extends the Phase 6A Clinical Engine. It does not replace `clinical_note_templates`, `clinical_note_template_versions`, `clinical_notes`, or `clinical_note_versions`.

Forward-only migration added:

- `supabase/migrations/202607160003_phase6b_clinical_documentation.sql`

## Entities Added

### Template Definition Model

Added:

- `clinical_template_sections`
- `clinical_template_fields`
- `clinical_template_field_options`
- `clinical_template_validation_rules`
- `clinical_template_calculation_rules`
- `clinical_template_assignments`

These tables make the Phase 6A template-version JSON model queryable and builder-ready while keeping `clinical_note_template_versions` as the immutable version anchor.

The model supports:

- ordered sections
- ordered fields
- stable section and field keys
- nested sections and fields
- repeating sections or groups
- field help text
- default values
- patient-visible eligibility metadata
- practitioner-only metadata
- internal administrative metadata
- encounter, session, location, discipline and practitioner availability metadata

SOAP or any profession-specific format is not hardcoded.

## Field-Type Model

`clinical_template_fields.field_type` is constrained to approved values:

- `short_text`
- `long_text`
- `rich_text`
- `number`
- `decimal`
- `date`
- `time`
- `datetime`
- `boolean`
- `single_choice`
- `multiple_choice`
- `checklist`
- `scale`
- `measurement`
- `laterality`
- `body_area`
- `table`
- `repeating_group`
- `heading`
- `instruction`
- `outcome_measure_reference`
- `diagnosis_reference`
- `treatment_goal_reference`
- `attachment_reference`
- `calculated`
- `read_only_display`

No arbitrary executable code is stored in template definitions.

## Validation and Visibility Model

Added `clinical_template_validation_rules` for constrained validation metadata.

Supported rule types:

- `required`
- `character_limit`
- `numeric_range`
- `allowed_units`
- `allowed_options`
- `date_restriction`
- `conditional_required`
- `cross_field`
- `finalisation_requirement`
- `template_specific`

Rules include:

- severity
- lifecycle point such as draft save, finalise, sign or patient publish
- declarative JSON configuration
- section or field target

Visibility metadata is represented through:

- `visibility_class`
- `visibility_rules`
- `required_rules`
- `patient_visible_eligible`
- `practitioner_only`
- `is_internal_admin`

Patient-visible eligibility is metadata only. It does not publish content to Patient Link.

## Calculation Model

Added `clinical_template_calculation_rules`.

Supported calculation types:

- `arithmetic`
- `aggregate`
- `score`
- `classification`
- `reference_range`
- `outcome_total`

Calculations reference stable field keys and target a calculated field definition. Calculation evaluation is not implemented in this step. The database stores constrained, versioned calculation definitions for later server-side or controlled client-side execution.

## Structured-Response Storage

Added `clinical_note_structured_responses`.

Structured responses are linked to:

- tenant
- patient
- clinical note
- clinical note version
- exact clinical note template version
- template section
- template field
- stable section and field keys

Responses support:

- JSON values
- text
- numeric values
- booleans
- dates
- datetimes
- units
- display values
- repeat groups
- calculated-value flags
- validation state
- patient-visible eligibility snapshots
- practitioner-only snapshots
- restricted snapshots

Structured and free-text content can coexist. Phase 6A `clinical_note_versions.free_text_content` and `structured_content` remain available.

## Draft and Concurrency Model

Added:

- `clinical_note_draft_states`
- `save_clinical_note_structured_response(...)`

Draft state supports:

- last saved timestamp
- active editor metadata
- client idempotency keys
- conflict detection
- optimistic lock versioning
- interrupted draft restoration metadata

Structured responses use `lock_version`. The save RPC rejects stale updates when an expected lock version is supplied and no longer matches the authoritative row.

Realtime collaboration is not implemented.

## Copy-Forward Provenance

Added:

- `clinical_note_copy_forward_events`
- `copy_forward_clinical_response(...)`

Copy-forward records:

- source note
- source note version
- source response
- target note
- target note version
- target response
- source and target field keys
- copy timestamp
- copying user
- safe display-value snapshot
- whether the copied value was subsequently edited

Copy-forward creates new draft content. It does not copy legal finalisation, signature or amendment status from the source record.

## Template Lifecycle RPCs

Added:

- `validate_clinical_template_version_ready_for_publish(target_template_version_id uuid)`
- `publish_clinical_template_version(target_template_version_id uuid)`
- `retire_clinical_template_version(target_template_version_id uuid, retirement_reason_input text default null)`
- `create_clinical_template_version_from(source_template_version_id uuid, change_reason_input text default null)`

Publishing validates that a template version has sections, fields and valid required-field definitions.

Publishing changes the Phase 6A template version status to `active`, consistent with existing Phase 6A status values. In this implementation, `active` represents the published/usable template-version state.

Published/active, retired and archived template definitions are protected from destructive edits by triggers.

Creating a new template version from an existing version deep-copies:

- sections
- nested section parent references
- fields
- nested field parent references
- field options
- validation rules
- calculation rules

The copied rows store source IDs in metadata so future tooling can display provenance without mutating the published source version.

## Note Lifecycle Integration

Added:

- `validate_clinical_note_version_ready_for_finalisation(target_note_version_id uuid)`

Replaced forward-only:

- `finalise_clinical_note_version(target_note_version_id uuid)`

The replacement preserves the existing Phase 6A RPC signature and lifecycle behaviour, while adding template-driven validation.

Before finalisation, the RPC validates:

- target note version exists and is draft
- current user has tenant clinical access
- required structured fields are complete
- invalid structured responses are not present
- required calculated values are available
- draft state has no stale-edit conflict

The content hash now includes structured responses as well as free-text and JSON structured content.

## Integrity and Immutability

Added validation triggers for:

- template-version and tenant scope
- section/field/option/rule/calculation consistency
- assignment tenant/template/version consistency
- structured response note/template/patient consistency
- copy-forward tenant and patient consistency
- draft state note/version consistency

Added immutability triggers for:

- published/active template sections
- published/active template fields
- published/active field options
- published/active validation rules
- published/active calculation rules
- published/active assignments
- finalised/signed structured responses
- append-only copy-forward provenance

Cross-tenant template references, response references and copy-forward are blocked.

Cross-patient copy-forward is not enabled in this foundation.

## Permissions and RLS

RLS is enabled on every new table.

Tenant clinical users with existing Phase 6A clinical roles (`admin`, `therapist`) can read tenant clinical documentation definitions and records.

Tenant clinical users can create and update tenant-owned template definitions while the referenced template version remains draft.

Structured responses, draft states and copy-forward events are read-only by direct table grants. Mutations are intended to go through protected RPCs.

System template definitions are managed separately:

- authenticated users with clinical access can read system definitions
- Super Admin can create/update system definitions where `tenant_id is null`
- Super Admin still receives no default access to tenant clinical content

Receptionist and finance roles do not receive clinical documentation RLS access.

## Patient Link Boundaries

This step adds metadata only.

Patient Link publication remains explicit through Phase 6A protected publication RPCs. Structured response eligibility does not publish content.

Safety rules prevent:

- restricted fields being marked patient-visible eligible
- practitioner-only fields being marked patient-visible eligible
- internal administrative fields being marked patient-visible eligible

No Patient Link rendering was implemented.

## Audit and Workflow Events

Safe audit events are written for:

- template version publication
- template version retirement
- new template version creation from source
- copy-forward use
- note finalisation

Safe clinical workflow events are written for:

- template publication
- template retirement
- copy-forward use
- note finalisation

Workflow payloads contain identifiers and lifecycle metadata only. They do not contain unrestricted clinical note text, response values, diagnoses or assessment results.

## Generated Types

Updated:

- `src/lib/database.types.ts`

Added table type entries for:

- `clinical_template_sections`
- `clinical_template_fields`
- `clinical_template_field_options`
- `clinical_template_validation_rules`
- `clinical_template_calculation_rules`
- `clinical_template_assignments`
- `clinical_note_structured_responses`
- `clinical_note_draft_states`
- `clinical_note_copy_forward_events`

Added RPC signatures for:

- `validate_clinical_template_version_ready_for_publish`
- `publish_clinical_template_version`
- `retire_clinical_template_version`
- `create_clinical_template_version_from`
- `validate_clinical_note_version_ready_for_finalisation`
- `save_clinical_note_structured_response`
- `copy_forward_clinical_response`

## Deferred Runtime and Frontend Work

Deferred:

- template builder UI
- structured note renderer
- autosave UI
- calculation evaluation runtime
- advanced conditional-rule execution
- Patient Link clinical document rendering
- storage upload/download
- AI documentation assistance
- reporting dashboards
- field-level restricted RLS
- live Supabase RLS/concurrency validation

## Required Live Supabase Validation

The following must be tested against a connected Supabase project with seeded users and data:

- cross-tenant template references are rejected
- publishing invalid templates is rejected
- published template definitions cannot be edited
- referenced template versions cannot be destructively removed
- stale structured response saves are rejected
- responses cannot reference fields from another template version
- finalisation fails when required structured fields are missing
- finalisation fails when structured responses are invalid
- finalised/signed structured responses cannot be edited
- cross-tenant and cross-patient copy-forward are rejected
- restricted/practitioner-only fields cannot become patient-visible
- unauthorised users cannot publish templates
- Super Admin cannot access tenant clinical configuration or note content by default
- workflow payloads contain no clinical content

## Assumptions

- Existing Phase 6A role convention remains in force: tenant `admin` and `therapist` are clinical users until a finer permission model is introduced.
- `active` template version status is the Phase 6A equivalent of a published template version.
- System template authoring remains a platform reference-data activity and is separate from tenant clinical content.
- Full calculation execution and complex conditional rule evaluation are deferred to later Phase 6B runtime work.

# Phase 6D Step 2: Assessments and Outcome Measures Database Summary

## Objective

Phase 6D Step 2 implements the database foundation for the AlliDesk Assessments and Outcome Measures subsystem.

This step extends the existing Phase 6A Clinical Engine assessment tables without replacing them. It adds the structures required for versioned assessment definitions, structured assessment items, clinician-entered responses, scoring metadata, longitudinal outcome tracking, patient-facing publication boundaries, and protected lifecycle transitions.

No frontend functionality, routes, patient-link pages, scoring runtime, communication delivery, or workflow automation was implemented in this step.

## Migration Added

`supabase/migrations/202607170003_phase6d_assessments_outcome_measures.sql`

The migration is forward-only and preserves previous Phase 6A, 6B, and 6C migrations.

## Existing Tables Extended

### `outcome_measure_definitions`

Extended to support:

- Active published definition version reference
- Definition scope
- Profession restrictions
- Encounter and session availability
- Patient, clinician, and import completion support
- Licensing and restriction metadata
- Effective and retirement dates
- Lock version

### `clinical_assessments`

Extended to support:

- Assessment definition version reference
- Booking, treatment plan, and clinical goal references
- Assessment source and phase
- Started, completed, finalised, signed, cancelled, and invalidated metadata
- Amendment count
- Latest result reference
- Content hash
- Lock version

### `outcome_measure_results`

Extended to support:

- Assessment definition version reference
- Result key and label
- Numeric, normalised, and percentage scoring
- Calculation status, key, and version
- Interpretation band and practitioner interpretation references
- Partial score and missing item metadata
- Amendment and invalidation metadata

## New Tables Created

### Assessment Definition Design

- `assessment_definition_versions`
- `assessment_definition_sections`
- `assessment_definition_items`
- `assessment_definition_item_options`
- `assessment_definition_validation_rules`
- `assessment_definition_calculation_rules`
- `assessment_interpretation_bands`
- `assessment_assignments`
- `assessment_usage_snapshots`

These tables allow outcome measures to be designed, versioned, assigned, published, retired, and analysed without destructive edits to historical definitions.

### Assessment Execution

- `clinical_assessment_draft_states`
- `clinical_assessment_item_responses`
- `assessment_score_components`
- `assessment_practitioner_interpretations`
- `assessment_amendments`

These tables support draft state tracking, structured response capture, score component storage, clinician interpretation, and non-destructive amendments.

### Longitudinal Measures and Links

- `assessment_repeated_measure_series`
- `assessment_series_members`
- `assessment_treatment_goal_links`
- `assessment_clinical_note_links`

These tables connect assessments to repeated outcome tracking, treatment goals, and clinical notes while keeping the Assessment domain separate from Clinical Documentation and Treatment Planning ownership.

### Patient-Facing and External Intake Boundaries

- `assessment_patient_invitations`
- `assessment_external_imports`
- `assessment_patient_link_publications`

These tables create explicit boundaries for future patient-completed assessments, imported assessment results, and Patient Link publication. Patient-facing visibility remains opt-in and separate from internal clinical access.

## View Added

### `assessment_definition_usage_summary`

Provides read-only usage information for assessment definitions and versions:

- Assessment count
- Result count
- First and last use timestamps
- Active assignment count

This view is intended for administrative definition management and future reporting.

## Functions and RPCs Added

### Permission and Validation

- `has_assessment_permission(target_tenant_id, action_key)`
- `validate_assessment_stable_key(key_input)`
- `assert_assessment_definition_version_is_draft(target_definition_version_id)`
- `validate_assessment_definition_version_ready_for_publish(target_definition_version_id)`
- `validate_clinical_assessment_ready_for_completion(target_clinical_assessment_id)`
- `assessment_response_value_is_valid(item_record, response_payload)`

### Assessment Definition Lifecycle

- `create_outcome_measure_definition_draft(...)`
- `publish_assessment_definition_version(target_definition_version_id)`
- `retire_assessment_definition_version(target_definition_version_id, retirement_reason_input)`
- `create_assessment_definition_version_from(source_definition_version_id, change_reason_input)`
- `upsert_assessment_assignment(...)`

### Assessment Execution Lifecycle

- `create_clinical_assessment_draft(...)`
- `save_clinical_assessment_response(...)`
- `complete_clinical_assessment(target_clinical_assessment_id)`
- `finalise_clinical_assessment(target_clinical_assessment_id)`
- `sign_clinical_assessment(target_clinical_assessment_id, signature_statement_input)`
- `amend_clinical_assessment(...)`

The public lifecycle operations are exposed as RPCs and use `SECURITY DEFINER` with `search_path = public`.

## Triggers Added

### Updated At and Lock Version

New assessment tables use existing `public.set_updated_at()` where appropriate and assessment-specific lock-version triggers through `increment_assessment_lock_version()`.

### Immutability

`enforce_assessment_definition_immutability()` prevents destructive updates to published, active, retired, or archived assessment definition versions and their child definition tables.

`enforce_assessment_response_immutability()` prevents destructive updates to assessment response, score, and interpretation records after the parent assessment is finalised, signed, amended, locked, invalidated, or archived.

### Append-Only Amendments

`enforce_assessment_append_only()` prevents updates and deletes to `assessment_amendments`.

## RLS Policies

RLS is enabled on every new table.

### Definition Tables

Definition management tables are readable to authenticated users who pass `has_assessment_permission(..., 'definition_view')`.

Direct table writes are not granted for definition lifecycle operations. Definition creation, publishing, retirement, version creation, and assignment changes are routed through RPCs.

### Tenant Assessment Tables

Assessment execution and patient-facing boundary tables are readable to authenticated tenant members who pass `has_assessment_permission(..., 'assessment_view')`.

Direct table writes are not granted for protected assessment lifecycle tables. Draft creation, response saving, completion, finalisation, signing, and amendment operations are routed through RPCs.

### Existing Assessment Tables

Direct insert, update, and delete privileges are revoked from:

- `clinical_assessments`
- `outcome_measure_results`

This preserves lifecycle control through RPC boundaries.

## Integrity Decisions

### Versioned Definitions

Published assessment versions are immutable. Historical assessment results remain linked to the exact definition version used at capture time.

### Non-Destructive Assessment Records

Finalised and signed assessments cannot have response, score, or interpretation records destructively edited. Changes are represented as amendments and audit events.

### Discipline-Neutral Structure

Assessment definitions support generic sections, items, options, validation rules, calculation rules, and interpretation bands rather than profession-specific tables.

### Domain Separation

Assessments can reference patients, bookings, sessions, clinical encounters, treatment plans, goals, notes, and Patient Link records, but they do not own those domains.

### Patient Link Boundary

Patient-visible eligibility does not equal publication. Explicit records in `assessment_patient_link_publications` are required for future Patient Link exposure.

### Audit Compatibility

Important lifecycle RPCs write to `audit_events` and `clinical_workflow_events` where appropriate.

## Indexes and Constraints

The migration adds indexes for:

- Tenant filtering
- Definition lookup by key and status
- Version status and active version lookup
- Section, item, option, rule, calculation, and band ordering
- Assessment status, patient, encounter, booking, session, therapist, and definition lookup
- Response lookup by assessment and item
- Score and interpretation lookup
- Repeated measure series membership
- Treatment goal and clinical note links
- Patient invitation, import, and publication lookups

Constraints cover:

- Valid lifecycle statuses
- Valid item, response, score, source, publication, and assignment states
- JSON object fields
- Positive ordering, repeat index, duration, score, and priority values
- Unique stable keys within definition versions
- Unique active/default assignment patterns where appropriate
- Append-only amendment numbering

## Type Updates

`src/lib/database.types.ts` was updated to include:

- New assessment definition and execution tables
- `assessment_definition_usage_summary`
- Assessment lifecycle RPC signatures
- Supporting relationship aliases

The project currently uses a broad hand-maintained Supabase type file rather than a freshly generated narrow schema file, so the update follows the existing local convention.

## Deferred Functionality

The following are intentionally deferred:

- Frontend pages or components for assessment management
- Scoring runtime/evaluator implementation
- Patient-completed assessment UI
- Patient Link rendering
- Communication delivery
- Workflow automation execution
- Clinical dashboard/reporting views
- Attachment upload or document rendering
- Live Supabase migration execution in this local step

## Live Supabase Validation Required

Before Phase 6D is applied to a shared environment, validate:

- Forward-only migration execution
- RLS policy behaviour for admin, therapist, receptionist, finance, patient-link, and Super Admin contexts
- RPC execution permissions
- Assessment definition publish/retire/version flows
- Assessment draft/response/complete/finalise/sign/amend flows
- Immutability triggers on finalised and signed assessments
- Patient Link publication boundaries
- Audit and workflow event writes
- Concurrency behaviour under competing draft edits

## Build Validation

This step requires:

- `npm run build`
- `git diff --check`

Results are recorded in the completion response for Phase 6D Step 2.

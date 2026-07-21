# Phase 6C Step 2: Clinical Template Management Database Summary

Date: 2026-07-17  
Status: Database foundation implemented. No frontend pages, UI components, migrations rewrites, Patient Link rendering, AI, reporting, realtime editing, or generated workflow features were added.

## Migration Files

Added:

- `supabase/migrations/202607170001_phase6c_clinical_template_management.sql`

Existing Phase 6A and Phase 6B migrations were not rewritten.

## Existing Tables Extended

Phase 6C extends the existing template model rather than creating a competing system.

Extended tables:

- `clinical_note_templates`
- `clinical_note_template_versions`
- `clinical_template_sections`
- `clinical_template_fields`
- `clinical_template_field_options`
- `clinical_template_validation_rules`
- `clinical_template_calculation_rules`
- `clinical_template_assignments`

Important additions:

- `lock_version` on template-management authoring tables
- version `release_notes`
- version `effective_from` / `effective_until`
- version `review_status`
- version `validation_status`
- version `publication_ready`
- version approval metadata
- version `source_template_version_id`
- section and field patient-facing label/description metadata
- assignment priority and assigned-by metadata
- template archive metadata

## New Tables

### `clinical_template_draft_states`

Tracks draft authoring state and concurrency metadata for a draft template version.

Supports:

- draft owner
- active editor
- last saved timestamp
- last saved by
- idempotency key
- validation status
- review status
- publication readiness
- conflict flags
- lock version

It stores template-management metadata only and no clinical response content.

### `clinical_template_review_requests`

Provides a lightweight review workflow boundary for future clinical lead approval.

Supports:

- review requested
- in review
- approved
- changes requested
- review cancelled
- requester
- reviewer
- decision timestamp
- decision reason

This is not a general-purpose approval engine.

### `clinical_template_validation_results`

Stores deterministic validation outcomes for draft template versions.

Supports:

- validation status
- validation scope
- error/warning/info counts
- structured findings
- validated by
- template/version lock versions at validation time

Findings must remain safe template metadata and must not contain clinical note content.

### `clinical_template_usage_snapshots`

Stores safe aggregate usage metadata for template administration.

Supports:

- note count
- first used date
- last used date
- active assignment count
- draft/active/retired version counts

This table must not store clinical response values, diagnoses, assessment scores, attachments, or patient-facing content.

## Views

### `clinical_template_usage_summary`

Provides safe aggregate template usage by template version.

It uses `security_invoker = true` so underlying RLS remains authoritative.

Returned data is aggregate metadata only:

- template identifiers
- template key/name
- version number/status
- note count
- first/last used dates
- active assignment count

## Functions And RPCs

Added helper functions:

- `has_clinical_template_management_permission(target_tenant_id, action_key)`
- `validate_clinical_template_stable_key(key_input)`
- `validate_clinical_template_visibility_rule_references(target_template_version_id, rules_input)`
- `touch_clinical_template_draft_state(target_template_version_id, idempotency_key_input)`
- `assert_clinical_template_version_is_draft(target_template_version_id)`

Added protected RPCs:

- `create_clinical_template_draft(...)`
- `update_clinical_template_draft_metadata(...)`
- `upsert_clinical_template_section(...)`
- `upsert_clinical_template_field(...)`
- `upsert_clinical_template_field_option(...)`
- `upsert_clinical_template_validation_rule(...)`
- `upsert_clinical_template_calculation_rule(...)`
- `run_clinical_template_validation(...)`
- `duplicate_clinical_template(...)`
- `upsert_clinical_template_assignment(...)`

Hardened existing RPC:

- `publish_clinical_template_version(...)`

## Permission Model

The current database uses role-based helpers rather than a granular permissions table. Phase 6C therefore adds a template-management permission helper aligned with existing conventions.

Tenant roles:

- `admin`: may create, edit, publish, retire, assign, review, approve and view usage.
- `therapist`: may view, create, edit and duplicate draft templates where tenant policy permits authoring.
- `receptionist`: no clinical template-management access.
- `finance`: no clinical template-management access.

Super Admin:

- may manage system templates where `tenant_id is null`
- does not receive default access to tenant templates, tenant notes, tenant responses, or tenant clinical content.

## Authoring-State Model

Template lifecycle remains split across:

- template-level status on `clinical_note_templates`
- version-level status on `clinical_note_template_versions`
- authoring/draft state on `clinical_template_draft_states`
- review state on `clinical_template_review_requests` and version columns
- validation state on `clinical_template_validation_results` and version columns

This avoids duplicating the authoritative lifecycle while still supporting draft recovery, optimistic locking and future autosave.

## Concurrency Model

Optimistic locking is implemented using `lock_version`.

The migration adds lock-version triggers to:

- templates
- template versions
- sections
- fields
- options
- validation rules
- calculation rules
- assignments

Protected RPCs accept expected lock versions where relevant and reject stale edits. This prevents silent overwrites and supports future autosave without tenant-wide locks.

Realtime collaborative editing is still deferred.

## Template Creation

`create_clinical_template_draft(...)` creates:

- tenant template shell
- initial draft version
- draft-state metadata
- audit event
- safe Workflow event

The RPC:

- derives author identity from `auth.uid()`
- validates tenant membership and role-based template permission
- rejects invalid stable template keys
- creates template and version atomically
- supports idempotency
- rejects reuse of an idempotency key with incompatible parameters

## Draft-Edit Boundaries

Draft editing is protected through focused RPCs rather than one generic table/column mutation RPC.

Implemented protected boundaries:

- update draft metadata
- upsert section
- upsert field
- upsert field option
- upsert validation rule
- upsert calculation rule

The RPCs validate:

- authenticated identity
- tenant role
- draft lifecycle state
- expected lock version
- stable key format
- positive ordering
- patient-visible/practitioner-only safety
- same template-version relationships
- validation-rule targets
- calculation input references
- calculation output field compatibility boundary

More specialised visibility-rule RPCs may be added in later frontend integration if the rule-builder UI needs a richer constrained editor than the current validation metadata model.

## Review Workflow

The migration adds schema-ready review support:

- review requested
- in review
- approved
- changes requested
- review cancelled

Publishing checks review approval only when template metadata sets `review_required = true`.

This keeps review lightweight and avoids building a general approval engine.

## Validation Results

`run_clinical_template_validation(...)` stores deterministic validation results and updates version/draft-state validation status.

Initial checks include:

- template name/key validity
- at least one section
- at least one meaningful documentation field
- duplicate section keys
- duplicate field keys
- duplicate option keys
- unsafe patient-visible eligibility
- calculation references to missing fields

Future frontend steps may add more detailed rule and circular dependency validation using this same results model.

## Publication Lifecycle

`publish_clinical_template_version(...)` is hardened to:

- require draft status
- require publication permission
- rerun database validation
- reject validation errors
- enforce approval where review is required
- publish the target version
- retire older active versions
- set template active version
- mark draft state as published
- write audit and safe Workflow events

Published versions remain immutable through existing Phase 6A/6B triggers.

## Version Creation

Existing Phase 6B `create_clinical_template_version_from(...)` remains the base new-version workflow.

Phase 6C adds `source_template_version_id`, release notes and lock-version metadata to support provenance and safer future UI.

Idempotent new-version creation can be added in a later hardening step if the frontend creates retryable versioning actions.

## Duplication

`duplicate_clinical_template(...)` supports:

- system template copied into a tenant draft template
- tenant template duplicated within the same tenant

It does not support cross-tenant tenant-template copying.

Duplication copies:

- template metadata
- draft version metadata
- sections
- fields
- options
- validation rules
- calculation rules

Duplication excludes:

- clinical notes
- structured responses
- signatures
- assignments
- usage history
- audit history
- publication/review state

It supports idempotency and records duplication provenance in metadata.

## Retirement

Existing Phase 6B retirement remains in place. Phase 6C adds:

- version retirement reason column
- template archive metadata
- assignment priority/effective dates for safer retirement impact analysis

Retirement must remain non-destructive so historical notes continue to render.

## Assignment Management

`upsert_clinical_template_assignment(...)` manages assignment metadata for active published versions only.

Supported dimensions:

- tenant
- discipline
- encounter type
- session type
- location
- practitioner
- default
- priority
- effective dates

It rejects:

- assignments to non-active versions
- invalid date ranges
- non-positive priority
- stale assignment updates
- unauthorised tenant access

The deterministic precedence model is supported by `assignment_priority` and effective dates.

## Patient Link Protections

Phase 6C preserves Phase 6A/6B Patient Link boundaries.

Template authors may configure patient-facing labels/descriptions and patient-visible eligibility, but:

- eligibility does not publish clinical content
- restricted fields cannot safely become patient-visible
- practitioner-only fields cannot safely become patient-visible
- publishing a template does not publish a clinical record
- Patient Link publication remains a separate protected boundary

## Audit And Workflow Events

The migration adds safe identifier-only audit/workflow events for:

- template created
- metadata updated
- validation failed
- version published
- template duplicated
- assignment changed

Payloads contain safe identifiers and lifecycle metadata only. They do not contain clinical response values, note content, patient data, diagnoses, assessment results or restricted clinical content.

## RLS

New tables have RLS enabled.

Read policies:

- allow tenant template managers to view draft state, review requests and validation results
- allow usage metadata only for users with usage-level template permission
- keep system-template administration separate through helper logic

Table write grants are not provided for the new metadata tables. Phase 6C also revokes direct insert/update/delete access from the existing template-definition tables and preserves select access for rendering. Template-authoring mutations are expected through protected RPCs.

## Security-Definer Hardening

New functions use:

- fixed `search_path = public`
- authenticated identity from `auth.uid()`
- tenant membership and role checks
- scoped grants to `authenticated`
- revoked access from `public` and `anon`
- safe errors without clinical content

System-template authority is kept separate from tenant-template authority.

## Generated Types

Updated:

- `src/lib/database.types.ts`

Added types for:

- `clinical_template_draft_states`
- `clinical_template_review_requests`
- `clinical_template_validation_results`
- `clinical_template_usage_snapshots`
- `clinical_template_usage_summary`
- new Phase 6C RPC signatures

## Deferred Frontend Work

No frontend work was implemented.

Deferred:

- template list
- template detail
- template editor
- validation-rule editor
- visibility-rule editor
- calculation editor
- preview UI
- publication workflow UI
- assignment management UI
- usage dashboard

## Required Live Supabase Validation

The following must be tested against a live Supabase development project with seeded users and roles:

- unauthorised template creation
- cross-tenant template access
- duplicate draft creation with idempotency
- idempotency-key reuse with different parameters
- stale metadata/section/field/option saves
- editing published versions
- duplicate stable keys under concurrent edits
- invalid patient-visible eligibility
- publication with validation errors
- publication with review required
- duplication from system to tenant
- cross-tenant tenant-template duplication rejection
- invalid assignments and date ranges
- receptionist and finance access denial
- Super Admin tenant-template denial
- Workflow payload safety

## Blockers Before Phase 6C Step 3

No architectural blockers are identified.

Before frontend integration, confirm whether the first UI requires specialised RPCs for validation rules, visibility rules and calculation rules, or whether those are deferred to the rule-editor milestone.

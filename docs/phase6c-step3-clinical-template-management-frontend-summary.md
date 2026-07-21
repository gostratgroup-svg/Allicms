# Phase 6C Step 3 - Clinical Template Management Frontend Summary

## Overall Status

Phase 6C Step 3 adds the first production-quality frontend foundation for clinical documentation template management.

The implementation extends the existing authenticated AlliDesk app shell and keeps clinical template administration inside the Practice/clinical-configuration context. It does not introduce a competing administration shell, visual system, database model, or direct table-mutation path.

## Routes And Navigation

Added route:

- `/practice/clinical-templates`

Navigation entry:

- Added a Clinical Templates card to the Practice hub.

Route protection:

- The route uses the existing route guard with the `clinical` access area.
- Tenant users require clinical access through the existing authorization foundation.
- Super Admin does not receive tenant-template access through this tenant route.
- Receptionist and finance users remain excluded by the existing permission map unless future permissions explicitly change.

## Pages And Components

Created:

- `src/pages/ClinicalTemplates.tsx`

Updated:

- `src/routes/appRoutes.tsx`
- `src/pages/Practice.tsx`
- `src/styles.css`

The page is split into focused internal panels for:

- Template list and filters
- Transactional draft creation
- Template metadata
- Sections, fields, and options
- Validation rules and validation results
- Safe preview
- Version history
- Assignment management
- Review inspection
- Usage metadata

The implementation uses existing AlliDesk primitives:

- `Card`
- `Button`
- `SearchBar`
- `StatusBadge`
- `LoadingState`
- `EmptyState`
- `ErrorState`
- Existing workflow/grid/card CSS patterns

## Template List

The template list loads tenant templates and eligible system templates using tenant-scoped queries and RLS.

Displayed metadata includes:

- Template name
- Description
- Stable template key
- System versus tenant ownership
- Template lifecycle status
- Latest version
- Published version
- Draft version
- Validation status
- Assignment count
- Aggregate usage count
- Last used timestamp where available

Implemented filters:

- Search
- Lifecycle
- Ownership
- Discipline

The frontend does not load unrelated tenant templates and then filter them only in the browser.

## Template Creation

New templates are created only through:

- `create_clinical_template_draft(...)`

The frontend sends:

- Tenant id
- Template key
- Template name
- Description
- Discipline tags
- Default note type
- Idempotency key

On success, the created draft template/version is selected and opened in the editor.

The frontend does not create the template and first version through separate inserts.

## Editor Architecture

The editor shows:

- Current template
- Current version
- Lifecycle state
- Draft lock/version counters
- Last saved timestamp
- Review state
- Validation state
- Publication readiness

Published and retired versions open as immutable views.

Draft editing is available only when:

- The user has template edit access through the existing authorization foundation.
- The selected version is a draft.
- The template belongs to the active tenant.

## Section, Field, And Option Management

Protected RPCs used:

- `upsert_clinical_template_section(...)`
- `upsert_clinical_template_field(...)`
- `upsert_clinical_template_field_option(...)`

Supported:

- Add/edit sections
- Add/edit fields
- Add/edit options
- Accessible ordering through display-order controls
- Stable-key protection for existing rows
- Patient-visible eligibility flags
- Practitioner-only flags
- Required and required-on-finalise flags
- Allowed units
- Choice option defaults

Deferred:

- Destructive removal of sections, fields, and options because no safe protected deletion RPC exists yet.
- Full drag-and-drop because deterministic display-order controls are safer for the current foundation.
- Full advanced field configuration for tables, repeating groups, reference fields, and calculated fields.

## Validation And Visibility Boundaries

Protected RPCs used:

- `upsert_clinical_template_validation_rule(...)`
- `run_clinical_template_validation(...)`

The validation panel displays:

- Rule summaries
- Rule severity
- Rule stage
- Database-authoritative validation result history
- Error, warning, and info counts

The frontend does not expose SQL, JavaScript, arbitrary expression editors, or raw internal database details.

Visibility and calculation boundaries:

- Patient-visible eligibility remains metadata only.
- Visibility-rule authoring remains deferred until a dedicated safe editor exists.
- Calculation rules are displayed read-only as advanced configuration.
- No formula execution or free-form formula authoring was added.

## Preview

The preview renders temporary clinician-facing example controls from template sections, fields, and options.

Preview rules:

- No patient records are created.
- No encounters are created.
- No clinical notes are created.
- No structured responses are saved.
- Unsupported advanced field types are shown as inspection-only placeholders.

## Version History

Implemented:

- Version list
- Status display
- Publication and retirement timestamps
- Release notes
- Immutable historical version opening
- New draft version creation from an existing version

Protected RPC used:

- `create_clinical_template_version_from(...)`

Rollback is not implemented by mutating an older version. Future revert behaviour must create a new draft version.

## Duplication

Protected RPC used:

- `duplicate_clinical_template(...)`

The UI supports:

- Duplicating an eligible tenant/system template into a new tenant-owned draft template.
- New template name and stable key.
- Idempotency key per attempt.

The operation intentionally does not copy:

- Assignments
- Usage history
- Clinical notes
- Structured responses
- Publication state
- Review state

## Review Workflow

Review request rows are displayed read-only.

Review actions are deferred because Phase 6C Step 2 did not introduce protected review-request, approval, change-request, or cancel-review RPCs.

This avoids unsafe direct writes and preserves the RPC-only mutation boundary.

## Publication And Retirement

Protected RPCs used:

- `publish_clinical_template_version(...)`
- `retire_clinical_template_version(...)`

Publication behaviour:

- Requires explicit confirmation.
- Uses the protected publication RPC.
- Relies on database-authoritative validation inside the RPC.
- Refreshes state after completion.
- Opens the published version as immutable after reload.

Retirement behaviour:

- Requires explicit confirmation.
- Captures an optional retirement reason.
- Uses the protected retirement RPC.
- Preserves historical rendering and clinical note history.

## Assignments

Protected RPC used:

- `upsert_clinical_template_assignment(...)`

Supported:

- Tenant-wide assignment
- Discipline assignment
- Encounter-type assignment
- Session-type assignment
- Default assignment flag
- Priority
- Effective start/end dates

Deferred:

- Location and practitioner-specific assignment pickers because those require additional tenant lookup UI and validation UX.

## Usage Metadata

The page displays aggregate usage from:

- `clinical_template_usage_summary`

Displayed:

- Note count
- First-used date
- Last-used date
- Active assignment count

Not displayed:

- Patient identities
- Clinical note content
- Structured response values
- Diagnoses
- Restricted clinical data

## Draft And Concurrency Handling

Implemented:

- Explicit save controls.
- Save-in-progress states.
- Database lock-version submission for metadata, sections, fields, options, validation rules, and assignments.
- Stale conflict messages when lock-version validation fails.
- State reload after successful RPC mutations.

Not implemented:

- Autosave.
- Realtime collaboration.
- Silent conflict resolution.

## Permissions

Frontend access uses existing authorization helpers.

Current assumptions:

- View/edit access is based on `tenant.clinical.view`, `tenant.clinical.manage`, and `tenant.practice.configure`.
- Publication, retirement, and assignment administration is restricted to tenant Admin via existing role and permission checks.
- RLS and protected RPCs remain authoritative.

Receptionist and finance roles receive no clinical template-management access through current permissions.

Super Admin receives no default tenant-template access through this route.

## Deferred Functionality

Deferred intentionally:

- AI template generation
- Realtime collaborative editing
- Free-form formula authoring
- Full calculation execution
- Advanced visibility-rule builder
- Destructive deletion for published or dependency-linked template objects
- Patient Link clinical rendering
- Profession-specific hardcoded templates
- Cross-tenant tenant-template sharing
- Full review decision workflow until protected RPCs exist
- Location/practitioner assignment selectors

## Database Defects Discovered

No frontend-blocking database defect was discovered.

No forward-only migration was added in this step.

## Validation Performed

Commands run:

- `npm run build`
- `git diff --check`

Result:

- Build passed.
- Diff whitespace check passed.
- Existing Vite large-chunk warning remains.

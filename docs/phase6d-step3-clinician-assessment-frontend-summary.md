# Phase 6D Step 3: Clinician Assessment Frontend Summary

## Objective

Phase 6D Step 3 implements the clinician-facing assessment and outcome-measure frontend foundation inside the existing patient Clinical Workspace.

The implementation extends the existing `/patients/clinical` route. It does not introduce a new app shell, primary sidebar item, assessment-definition editor, Patient Link assessment form, external integration, AI interpretation, scoring runtime, or reporting module.

## Route And Workspace Placement

Assessment access remains patient-contextual in:

`/patients/clinical`

The existing Clinical Workspace patient selector and patient query parameter continue to provide patient context. The route remains protected by the existing route guard and `tenant.clinical.view` permission. Super Admin mode, receptionist roles, and finance roles do not receive tenant clinical access through this route under the existing authorization model.

The Assessments tab now renders the new clinician assessment workspace instead of the earlier prototype direct-create form.

## Components Added

### `src/components/clinical-assessments/ClinicalAssessmentWorkspace.tsx`

The new component provides:

- Assessment overview
- Assessment picker
- Patient assessment history
- Metadata-driven assessment runner
- Draft status and save state display
- Validation summary
- Lifecycle action controls
- Score summary
- Practitioner interpretation display
- Repeated-measure display
- Treatment-goal and clinical-note link display
- Patient-reported invitation metadata
- External import metadata
- Patient Link publication metadata
- Append-only amendment action boundary

The component is intentionally clinician-facing. It does not edit assessment definitions.

## Clinical Page Integration

### `src/pages/Clinical.tsx`

The Clinical page now loads:

- Active outcome-measure definitions
- Active assessment definition versions
- Assessment sections
- Assessment items
- Assessment item options
- Active assessment assignments
- Patient clinical assessments
- Outcome measure results
- Assessment draft states
- Assessment item responses
- Score components
- Practitioner interpretations
- Assessment amendments
- Repeated-measure series and members
- Treatment-goal links
- Clinical-note links
- Patient invitations
- External imports
- Assessment Patient Link publication metadata

Patient assessment data is loaded with tenant and patient filters. The frontend does not rely on query parameters for tenant scope.

## Assessment Picker

The picker shows active published/available definitions and versions loaded from Supabase with server-side filters:

- `outcome_measure_definitions.definition_status = active`
- `assessment_definition_versions.version_status = active`
- Tenant-owned or system definitions only
- Non-deleted records only

The UI then applies safe presentation filters:

- Search
- Discipline
- Clinician-administered versus patient-reported
- Available versus historical metadata

The picker displays:

- Name
- Description/key via search
- Version number
- Response mode
- Default or recommended assignment state
- Restricted indicator
- Licensed indicator

## Transactional Assessment Creation

Assessment creation uses the protected Phase 6D RPC:

- `create_clinical_assessment_draft(...)`

The frontend does not insert directly into:

- `clinical_assessments`
- `clinical_assessment_draft_states`
- Initial response/result tables

The create flow passes:

- Tenant id from active tenant context
- Patient id from the selected patient context
- Assessment definition version id
- Optional clinical encounter
- Optional booking
- Optional session
- Optional assessment phase
- Idempotency key

After the RPC succeeds, the workspace reloads patient clinical data and opens the created assessment.

## Dynamic Renderer

Assessment sections and items render from:

- `assessment_definition_sections`
- `assessment_definition_items`
- `assessment_definition_item_options`

Supported editable item types:

- Short text
- Long text
- Integer
- Decimal
- Boolean
- Single choice
- Multiple choice
- Checklist
- Scale
- Measurement
- Date
- Time
- Date/time
- Laterality
- Body area
- Observation

Read-only or deferred handling is shown for:

- Calculated values
- Attachment references
- Clinical-record references
- Informational headings and instructions

Informational, heading, calculated, and read-only items do not save responses.

## Response Saving And Optimistic Locking

Response saving uses the protected Phase 6D RPC:

- `save_clinical_assessment_response(...)`

The frontend does not write directly to `clinical_assessment_item_responses`.

Each save passes:

- Clinical assessment id
- Assessment definition item id
- Typed JSON payload
- Repeat index
- Existing response lock version when available
- Idempotency key

Stale-lock and permission failures are surfaced as safe user messages. Database validation remains authoritative.

## Draft Experience

The workspace displays:

- Draft state
- Last saved timestamp
- Last editor state where available
- Unsaved-change indicator
- Save state
- Persisted response lock version

Explicit Save remains available per editable item. Autosave was not implemented in this step.

## Validation And Lifecycle Integration

The workspace uses protected RPCs:

- `validate_clinical_assessment_ready_for_completion(...)`
- `complete_clinical_assessment(...)`
- `finalise_clinical_assessment(...)`
- `sign_clinical_assessment(...)`
- `amend_clinical_assessment(...)`

Supported lifecycle states in the UI include:

- Draft
- In progress
- Completed
- Finalised
- Signed
- Amended
- Locked
- Cancelled
- Invalidated
- Archived

Finalised, signed, amended, locked, invalidated, and archived records render as immutable. Amendments are appended through RPC rather than destructive edits.

## Score And Interpretation Display

The score panel displays stored authoritative results from:

- `outcome_measure_results`
- `assessment_score_components`

It shows:

- Raw score
- Numeric score
- Percentage score
- Calculation status
- Partial-score indicator
- Missing-item count

The browser does not execute arbitrary formulas or invent authoritative scores.

Practitioner interpretations display from:

- `assessment_practitioner_interpretations`

Automated/deterministic results and practitioner interpretation remain separate. Interpretation editing is deferred because no protected interpretation-editing RPC is implemented yet.

## History And Repeated Measures

The workspace displays:

- Assessment history
- Amendments
- Repeated-measure series members
- Comparable/incomparable status
- Baseline/follow-up role
- Stored score values only

The UI does not automatically compare incompatible definition versions or infer improvement/deterioration beyond stored metadata.

## Treatment Goal And Note Links

The workspace displays explicit links from:

- `assessment_treatment_goal_links`
- `assessment_clinical_note_links`

It does not silently update treatment plan or goal status, and it does not duplicate authoritative assessment response data into clinical notes.

## Patient-Reported And External Import Boundaries

The workspace displays metadata from:

- `assessment_patient_invitations`
- `assessment_external_imports`

It does not build Patient Link forms, accept patient submissions as final clinical results, expose secure tokens, or display raw vendor payloads.

## Patient Link Boundaries

The workspace displays assessment publication metadata from:

- `assessment_patient_link_publications`

It clearly separates eligible metadata from published content. It does not render Patient Link result pages or expose internal responses/practitioner interpretation externally.

## Restricted And Licensed Behaviour

Restricted and licensed indicators are displayed for definitions, versions, sections, items, assessments, and interpretations where metadata is available.

Access control remains enforced by:

- Existing route guards
- Existing authorization framework
- Supabase RLS
- Protected RPCs

The frontend does not add a Super Admin bypass and does not grant receptionist or finance clinical access.

## Deferred Functionality

Deferred intentionally:

- Assessment-definition editor
- Patient Link patient-completed assessment forms
- External imports or device integrations
- Protected interpretation editing RPC/UI
- Protected goal/note linking RPC/UI
- Patient Link result rendering
- Advanced scoring runtime
- Arbitrary browser scoring formulas
- AI interpretation
- Automated diagnosis creation
- Advanced reporting
- Realtime collaboration

## Database Defects Discovered

No frontend-blocking database defect was discovered. No migration was added in this step.

## Validation Performed

- `npm run build`
- `git diff --check`

The existing Vite large-chunk warning remains and is unrelated to this step.

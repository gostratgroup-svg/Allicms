# Phase 6D Step 1 - Assessments And Outcome Measures Architecture

## 1. Scope

Phase 6D designs the discipline-neutral Assessments and Outcome Measures layer for AlliDesk. It builds on the Phase 6A Clinical Engine entities:

- `clinical_assessments`
- `outcome_measure_definitions`
- `outcome_measure_results`

The goal is to support standardised measures, practice-defined assessments, repeated outcome tracking, clinical interpretation, and future patient-reported assessments without creating a competing model for clinical notes or clinical documentation templates.

This document is architecture only. It does not create SQL, migrations, RPCs, frontend code, generated types, or workflow automation.

## 2. Product Principles

- Capture once, reuse everywhere.
- Assessment definitions are versioned clinical configuration.
- Assessment records are clinical records.
- Outcome results must preserve the exact definition and calculation version used.
- Clinical notes may reference assessment results but must not own them.
- Patient-facing exposure is explicit and separate from internal clinical access.
- Super Admin manages platform definitions only and receives no default access to tenant assessment results.
- Calculations must be deterministic, declarative, auditable, and non-executable.
- Automated interpretation supports, but never replaces, clinician judgement.

## 3. Domain Boundaries

### Assessment Configuration

Assessment configuration owns reusable definitions:

- assessment or outcome-measure definition metadata
- definition versions
- sections
- items/questions
- response options
- validation rules
- scoring rules
- interpretation bands
- licensing and availability metadata

Published definitions are immutable. Changes require a new version.

### Clinical Assessment Records

Clinical assessment records own real patient-specific assessment activity:

- assessment instance
- patient, practitioner, encounter, session, treatment-plan and goal links
- draft/final lifecycle state
- raw item responses
- calculated results
- practitioner interpretation
- amendments and invalidations
- patient-facing publication metadata

### Raw Responses

Raw responses are the exact patient or clinician-entered item values. They must be retained with item identity, definition version, response type, units, provenance, author, and lock metadata.

### Calculated Scores

Calculated scores are derived records. They store:

- calculation-definition version used
- raw inputs included or excluded
- score components
- total or subscale result
- missing-item handling
- interpretation metadata version

Scores must not be silently recalculated after a definition changes.

### Clinical Interpretation

Clinical interpretation is separate from calculation. It may include:

- system-derived severity band
- practitioner interpretation text
- clinical significance notes
- warnings and limitations
- patient-facing explanation, when explicitly published

### Patient-Visible Summaries

Patient-visible summaries are explicit publication records, not a default property of an assessment result. Patient-facing eligibility does not equal publication.

### Reporting Aggregates

Reporting may aggregate de-identified, permission-safe assessment metrics. Broad reports must not expose restricted responses, patient identities, or sensitive clinical interpretation without the correct tenant clinical permissions.

## 4. Assessment Types

The model should support:

- standardised outcome measures
- practice-defined assessments
- profession-specific assessments
- screening tools
- functional assessments
- symptom scales
- risk assessments
- progress assessments
- initial assessments
- follow-up assessments
- discharge assessments
- patient-reported outcome measures
- clinician-administered assessments
- observational assessments
- imported external assessment results

### Initial Phase 6D Support

Initial implementation should support:

- tenant-owned definitions
- system definitions that tenants can use or duplicate where allowed
- clinician-administered assessments
- practice-defined assessments
- basic standardised outcome-measure metadata without embedding copyrighted content
- draft, completed, finalised and amended results
- repeated-measure grouping for same definition lineage

### Future Extensions

Future phases may add:

- patient-reported assessment completion through Patient Link
- licensed assessment vendor integrations
- device/wearable imports
- location-specific availability
- practitioner-specific availability
- advanced population norms
- payment or per-administration licensing controls

## 5. Definition Ownership And Scope

Definitions may be owned by:

- `system`: platform-provided definition metadata managed by Super Admin
- `tenant`: tenant-created practice definition
- `practitioner`: future practitioner-specific definition

Recommended initial scopes:

- system definition metadata
- tenant definitions
- discipline tags
- encounter-type availability
- session-type availability

Deferred scopes:

- practitioner-specific definitions
- location-specific availability
- licensed restricted availability
- geography or accreditation-based availability

Super Admin may create or maintain system definition metadata. That authority must not grant tenant clinical result access.

## 6. Definition Lifecycle

Definition lifecycle states:

- `draft`: editable, not available for new assessment instances
- `published`: immutable version that has passed validation
- `active`: selectable for new assessments
- `retired`: no longer selectable for new assessments but remains available for historical rendering
- `archived`: hidden from normal lists when never used or when policy allows

Lifecycle rules:

- Published versions are immutable.
- Retired versions remain readable for historical results.
- Existing assessment records stay linked to the exact definition version used.
- New changes create a new definition version.
- Effective dates control availability.
- Retirement must not delete records.
- Deletion is restricted when any result, audit event, assignment, or publication references the definition.
- Reactivation should create or explicitly reactivate an eligible published version through a protected workflow.

## 7. Assessment Structure

Assessment definitions should support:

- sections
- items/questions
- stable keys
- display labels
- clinician instructions
- patient instructions
- response types
- response options
- required and optional items
- repeating items
- clinician-only items
- patient-reported items
- informational content
- units
- laterality
- body area
- date and time observations
- attachment or evidence references

Stable keys identify logical items across versions. Display labels can change, but stable keys should preserve continuity unless the item meaning changes materially.

## 8. Response Model

Supported response types should align with Clinical Documentation rendering where practical:

- short text
- long text
- integer
- decimal
- boolean
- single choice
- multiple choice
- checklist
- scale
- measurement with units
- date
- time
- date and time
- laterality
- body area
- observation
- file or attachment reference
- clinical-record reference
- read-only calculated result

Assessment response infrastructure should reuse field-rendering and validation concepts from clinical documentation templates, but assessment results must remain authoritative in the Assessment domain. Clinical Documentation may display or reference results; it must not duplicate authoritative response values unnecessarily.

## 9. Assessment Authoring Workflow

Clinician workflow:

1. Select an assessment definition/version available to the tenant and context.
2. Start an assessment for a patient.
3. Optionally link it to an encounter, session, treatment plan, goal or diagnosis.
4. Save a draft.
5. Resume an interrupted draft.
6. Complete all required fields.
7. Run validation and scoring.
8. Complete the assessment.
9. Finalise the result.
10. Sign or acknowledge when required.
11. Amend or invalidate through protected non-destructive workflows if needed.
12. Repeat the assessment later as part of a longitudinal series.

Assessments may be recorded without a booking when clinically appropriate, but the reason and context should be captured.

## 10. Assessment Lifecycle

Assessment instance lifecycle states:

- `draft`: editable by authorised clinician or allowed patient-submission workflow
- `in_progress`: started and partially completed
- `completed`: required responses captured, not yet finalised
- `finalised`: clinically locked result
- `signed`: finalised and practitioner signed or acknowledged
- `amended`: finalised/signed result has an appended correction
- `cancelled`: assessment stopped before clinical completion
- `invalidated`: result marked clinically invalid but retained
- `superseded`: replaced by a corrected or more appropriate result

Editing rules:

- Draft and in-progress results are editable with optimistic locking.
- Completed results may be edited until finalisation, subject to permissions.
- Finalised or signed results cannot be destructively edited.
- Amendments append correction records.
- Invalidated results remain visible in history with reason and author.
- Supersession preserves both old and new records.
- Finalisation and signing should remain distinct because some tenants may not require signatures for every assessment.

## 11. Score And Calculation Model

Calculations must be declarative and constrained. Do not permit arbitrary SQL, JavaScript, Python, dynamic formulas, or executable expressions.

Calculation configuration should support:

- item values
- item weighting
- reverse scoring
- subscale scores
- total scores
- normalisation
- percentage scores
- derived classifications
- thresholds
- severity bands
- reference ranges
- missing-item handling
- partial-score rules
- calculation versioning
- interpretation versioning

Recommended calculation format:

- JSON declarative operation graph
- allowed operation names only
- explicit input item stable keys
- explicit output score keys
- typed operands
- bounded operators such as sum, average, count, min, max, threshold, band lookup, reverse-score, normalise
- no string-evaluated expressions

Every calculated score should store the exact calculation rule version and source input values or source response IDs used.

## 12. Interpretation Model

Interpretation records should distinguish:

- calculated classification
- practitioner interpretation
- patient-facing explanation

Supported interpretation metadata:

- score labels
- severity bands
- clinical classifications
- reference ranges
- minimal clinically important difference
- reliable change thresholds
- improvement, deterioration and unchanged states
- warnings and limitations
- population-specific ranges
- age-specific ranges

Automated interpretation must always be labelled as calculated/derived metadata. It must not finalise clinical judgement or create diagnoses.

## 13. Repeated Measures And Longitudinal Series

Repeated-measure series group assessment results across time. Series may be linked by:

- patient
- definition lineage
- definition version
- episode of care
- treatment plan
- clinical goal
- practitioner
- location
- encounter/session context
- baseline marker
- follow-up marker
- discharge marker

Comparison rules:

- Results from the same definition version are directly comparable when scoring metadata is unchanged.
- Results from different versions are comparable only if the versions declare compatible scoring.
- Materially different versions must not be auto-compared.
- Invalidated results should be excluded from default trend calculations but remain visible.
- Amended results should show the current amended result with access to the amendment history.
- Missing data and partial scores must be labelled.

## 14. Clinical Progress Views

Initial Phase 6D views should include:

- assessment list for a patient
- result summary
- raw response view
- calculated score summary
- basic result history
- baseline and latest comparison where safe

Future reporting enhancements may include:

- score trend charts
- percentage change
- reliable change indicators
- clinically meaningful change
- goal-related progress
- treatment-plan progress
- patient-facing progress reports
- discipline-level aggregates
- tenant-level outcomes dashboards

## 15. Clinical Note Integration

Clinical Documentation may:

- reference an assessment result
- display selected score summaries
- display a trend summary
- trigger an assessment workflow
- link an assessment to a note
- include practitioner interpretation

Clinical notes must not duplicate authoritative raw responses unless a snapshot is intentionally copied into note text for medico-legal context. Any copied summary must preserve provenance:

- assessment result ID
- definition version ID
- score version
- copied timestamp
- copied by profile ID

Finalising a clinical note must not automatically finalise an incomplete assessment unless a dedicated protected workflow explicitly does this with validation.

## 16. Treatment Plan And Goal Integration

Assessments may support:

- treatment-plan baseline
- clinical-goal baseline
- progress evidence
- goal review evidence
- discharge criteria

Assessments must not silently overwrite treatment plans or clinical goals. Updates require explicit practitioner action and should create audit events.

## 17. Diagnosis Integration

Assessments may relate to:

- clinical diagnoses
- screening outcomes
- diagnostic indicators
- differential considerations
- diagnosis status
- coding systems

Assessment scores must not autonomously create diagnoses. Clinical diagnoses must not automatically become finance or medical-aid billing codes.

## 18. Patient-Reported Assessments

Future Patient Link workflows should support:

- practitioner assignment
- patient invitation
- secure Patient Link access
- start and expiry dates
- identity verification
- draft completion
- submission
- practitioner review
- acceptance into the clinical record
- rejection or invalidation
- late submission handling
- multiple submission handling
- accessibility and language configuration
- patient instructions

Patient-submitted data remains a submission until reviewed. It must not become a final clinical record without practitioner acceptance.

This should be prepared in Phase 6D data design but likely implemented in a later Patient Link integration milestone.

## 19. Patient Link Boundaries

Patient Link can eventually show:

- patient-completed assessment status
- patient-visible score summary
- patient-facing explanation
- outcome progress report

Patient Link must not automatically expose:

- full internal responses
- restricted items
- practitioner-only items
- risk/safeguarding content
- internal clinical interpretation
- copyrighted/licensed assessment content

Publication remains explicit and revocable. Patient-facing eligibility is only metadata.

## 20. Restricted And Sensitive Assessments

Restriction can apply at:

- assessment level
- section level
- item level
- response level
- score level
- interpretation level
- Patient Link publication level

Examples:

- psychological assessments
- risk assessments
- safeguarding assessments
- sensitive screening tools
- licensed tools
- practitioner-only interpretations
- patient-reported sensitive responses

Restricted records should follow the Phase 6A restricted-record baseline. Tenant Admin access to restricted clinical content should depend on clinical permissions and explicit restriction rules, not generic administration authority.

## 21. Licensed And Copyrighted Assessments

AlliDesk should support licensed or restricted assessment metadata without embedding unauthorised copyrighted content.

Architecture should support:

- license owner
- version
- permitted countries
- permitted professions
- permitted tenants
- permitted practitioners
- accreditation requirement
- per-administration restriction
- display limitations
- external scoring provider metadata

Documentation, seed data and demo data must not reproduce proprietary questions, scoring tables or copyrighted wording without permission.

## 22. Permissions

Permission areas:

- view definitions
- create definitions
- edit draft definitions
- publish definitions
- retire definitions
- assign assessments
- start assessments
- edit drafts
- complete assessments
- finalise results
- sign/acknowledge results
- amend results
- view restricted assessments
- view score interpretations
- publish patient-facing outcomes
- manage licensed definitions

Role boundaries:

- Tenant Admin: configure tenant assessment availability and non-restricted administration; not automatic access to restricted clinical responses.
- Clinical Lead: publish/retire tenant clinical definitions, review restricted access, validate clinical governance.
- Therapist/Clinician: start, complete, finalise and interpret assessments for patients they may access.
- Assessment Author: create/edit draft definitions if granted.
- Assessment Reviewer: review definitions or patient submissions where assigned.
- Read-only clinical user: view permitted assessment records without mutation.
- Receptionist: no clinical result access by default.
- Finance user: no assessment result access by default.
- Patient: only Patient Link records explicitly published or assigned for completion.
- Super Admin: platform/system-definition metadata only; no default tenant assessment results or clinical content.

## 23. Validation Model

Validation layers:

- frontend usability validation
- database integrity validation
- protected completion/finalisation validation

Validation should cover:

- required items
- allowed response types
- allowed options
- numeric ranges
- units
- date ranges
- conditional items
- cross-item validation
- missing-item handling
- score completeness
- finalisation requirements
- licensed-definition restrictions
- patient-submission requirements

The frontend must not be the only enforcement boundary. Completion and finalisation must use protected database workflows.

## 24. Draft Persistence And Concurrency

Draft model:

- explicit Save initially
- future safe autosave
- last saved timestamp
- last saved by profile ID
- draft owner
- active editor metadata
- optimistic lock version
- stale conflict handling
- idempotency keys for duplicate submissions
- interrupted assessment recovery

Concurrent patient and clinician access must be separated. A patient-submitted draft and clinician review record should not edit the same row without an explicit review boundary.

Realtime collaboration is deferred.

## 25. Amendments And Corrections

Finalised/signed assessments may be corrected only by append-only amendment workflow.

Amendment records should include:

- assessment result ID
- original response/result reference
- corrected value or corrected interpretation
- correction reason
- author profile ID
- timestamp
- recalculation result, if applicable
- impact on interpretation
- impact on trend
- Patient Link publication impact

Invalidation and supersession must preserve the original record.

## 26. Attachments And Evidence

Assessments may reference:

- scanned forms
- images
- audio
- video
- external reports
- device-generated files
- consent records
- supporting documents

Storage boundaries:

- no insecure public URLs
- use tenant-scoped storage
- store metadata separately from file binary content
- reference existing Clinical Attachments/Document domain where possible
- respect restricted-record controls
- audit access, upload, replacement and revocation

## 27. External Systems And Devices

Future integrations may include:

- assessment vendors
- medical devices
- wearables
- laboratory or diagnostic systems
- imported CSV/PDF results
- API-based scoring platforms
- mobile assessment applications

Integration boundaries:

- source provenance
- import identity
- vendor version
- device ID or source system
- validation status
- duplicate detection
- unit normalisation
- error handling
- manual practitioner review
- audit events

Imported results remain unreviewed until accepted into the clinical record.

## 28. Workflow Engine Events

Safe workflow events:

- `assessment_assigned`
- `assessment_started`
- `assessment_draft_saved`
- `assessment_completed`
- `assessment_finalised`
- `assessment_signed`
- `assessment_amended`
- `assessment_invalidated`
- `outcome_threshold_reached`
- `clinically_meaningful_deterioration_detected`
- `patient_assessment_submitted`
- `practitioner_review_required`
- `assessment_overdue`

Payloads should contain safe identifiers and lifecycle metadata only:

- tenant ID
- patient ID only where event consumers are tenant-clinical scoped
- assessment ID
- definition version ID
- lifecycle status
- timestamps
- workflow correlation IDs

Payloads must not include full responses, sensitive scores, interpretation text, diagnoses, restricted clinical content or attachment content.

## 29. Notifications And Tasks

Future automation opportunities:

- assessment reminders
- practitioner review tasks
- overdue assessments
- follow-up scheduling
- required reassessment
- goal-review reminders
- patient completion reminders

No automation should make clinical decisions autonomously. High-risk or sensitive outcomes must not be sent through unsafe notification channels.

## 30. Audit Principles

Audit events required:

- definition created
- definition version published
- definition retired
- assessment assigned
- draft created
- response saved
- assessment completed
- assessment finalised
- assessment signed
- assessment amended
- assessment invalidated
- external import received
- patient submission received
- practitioner review completed
- patient-facing publication created
- patient-facing publication revoked

Broad audit records should not contain unrestricted assessment responses, sensitive scores or interpretation text. Store identifiers and safe metadata, with detailed clinical data remaining in protected clinical tables.

## 31. Reporting Boundaries

Future reporting:

- assessment completion rates
- outcome trends
- repeated-measure change
- goal-linked outcomes
- treatment-plan outcomes
- practitioner-level aggregates
- discipline-level aggregates
- tenant-level aggregates
- patient-level longitudinal views
- de-identified benchmarking
- restricted-assessment exclusions

Super Admin may receive only approved aggregated and de-identified platform metrics, never tenant clinical result details.

## 32. Proposed Entities And Extensions

### Existing Phase 6A Entities To Reuse

- `outcome_measure_definitions`: definition catalogue and high-level metadata.
- `clinical_assessments`: patient-specific assessment instances.
- `outcome_measure_results`: calculated or recorded outcome result records.

### Existing Objects To Extend

- `clinical_assessments`: lifecycle, definition-version link, encounter/session/note/plan/goal context, status, lock version, restriction metadata.
- `outcome_measure_definitions`: ownership, lifecycle, discipline tags, licensing metadata, active version pointer.
- `outcome_measure_results`: score component metadata, interpretation, calculation version, amendment status, patient-facing publication metadata.

### New Entities Likely Needed

- `assessment_definition_versions`
- `assessment_definition_sections`
- `assessment_definition_items`
- `assessment_definition_item_options`
- `assessment_definition_validation_rules`
- `assessment_definition_calculation_rules`
- `assessment_interpretation_bands`
- `assessment_assignments`
- `assessment_draft_states`
- `assessment_item_responses`
- `assessment_score_components`
- `assessment_interpretations`
- `assessment_amendments`
- `assessment_repeated_measure_series`
- `assessment_treatment_goal_links`
- `assessment_clinical_note_links`
- `assessment_patient_invitations`
- `assessment_external_imports`
- `assessment_usage_metadata`
- `assessment_patient_link_publications`

## 33. Frontend Architecture

Recommended frontend structure:

- Assessment Definitions list
- Definition editor
- Assessment picker
- Assessment runner
- Draft indicator
- Validation summary
- Score summary
- Interpretation panel
- Result history
- Longitudinal trend
- Comparison view
- Treatment-plan and goal linking
- Clinical note integration panel
- Patient Link publication management
- Future patient-reported assessment experience

Initial UI should prioritise clinician-owned assessment recording and result review. Patient-reported UI should be prepared architecturally but deferred until secure Patient Link workflows are ready.

## 34. Clinical Safety Safeguards

Safeguards:

- verify patient context before starting
- verify definition version availability
- verify encounter/session context
- prevent duplicate accidental starts
- require mandatory items before completion
- validate scores before finalisation
- reject stale edits
- confirm finalisation and signing
- prevent unsafe cross-version comparisons
- preserve provenance when copying summaries
- prevent automated diagnosis
- prevent restricted response exposure
- prevent internal interpretation publication by default
- prevent silent recalculation after definition changes
- block use of expired or retired definitions for new assessments
- retain patient-submitted data while requiring practitioner review
- require review for external imported data

## 35. AI Boundaries

Future AI may:

- suggest appropriate assessments
- summarise results
- highlight trends
- draft practitioner interpretations
- detect incomplete assessments
- perform quality checks
- draft patient-friendly explanations

AI must not:

- complete responses
- alter scores
- finalise assessments
- sign assessments
- make diagnoses
- publish results
- override clinician interpretation
- access restricted data without approved governance
- make high-risk decisions without clinician review

No AI implementation is part of Phase 6D Step 1.

## 36. Deferred Functionality

Deferred:

- Patient Link completion UI
- automated reminders
- external vendor integrations
- device imports
- licensed assessment enforcement beyond metadata
- advanced population norms
- real-time collaboration
- AI-assisted interpretation
- advanced reporting warehouse
- cross-tenant assessment marketplace

## 37. Recommended Implementation Sequence

### Step 1: Architecture

Complete this blueprint and confirm Phase 6D domain boundaries.

### Step 2: Database Foundation

Create forward-only migrations for assessment definition versions, sections, items, options, validation rules, calculation rules, assignments, assessment instances, responses, score components, interpretations, amendments and Patient Link publication metadata where needed.

### Step 3: Types

Regenerate Supabase database types and verify RPC signatures.

### Step 4: Clinician Assessment Frontend

Implement assessment list, picker, runner, draft save, completion, validation summary and result display.

### Step 5: Longitudinal Outcomes And Integration

Implement repeated-measure series, patient clinical timeline integration, clinical-note references, treatment-plan/goal links and basic progress views.

### Step 6: Hardening And Validation

Harden lifecycle transitions, scoring validation, amendment workflows, restricted-access handling, concurrency and audit payloads.

### Step 7: Independent Production-Readiness Audit

Perform an independent audit before beginning Patient Link assessment completion or advanced reporting.

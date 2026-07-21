# Phase 6A Step 1: Clinical Engine Architecture

Date: 2026-07-15  
Status: Architecture blueprint only. No SQL, migrations, generated types, RPCs, frontend code, or workflow runtime changes are created by this document.

## 1. Objective

Phase 6A defines the production Clinical Engine architecture for AlliDesk.

The Clinical Engine is the medico-legal documentation layer for tenant clinical work. It must support multiple allied healthcare professions without being hardcoded to one discipline, while preserving the completed Phase 1 to Phase 5 foundations:

- Platform and tenant isolation
- Supabase Auth, profiles, tenant users, roles and RLS
- Practice Foundation
- Patient Engine
- Booking Engine
- Session Engine
- Draft Invoice and Finance Workflow
- Patient Link
- Workflow Engine

This document defines domain boundaries, proposed entities, lifecycle rules, access rules, immutability rules, amendment rules, integration events, and the recommended Phase 6 implementation sequence.

## 2. Clinical Engine Principles

### Clinical Work Is Not Operational Work

AlliDesk must distinguish:

- booking intent
- session delivery facts
- clinical encounter context
- clinical documentation
- finance records
- patient-facing communication
- internal audit history

The Clinical Engine owns clinical records. It does not own bookings, sessions, invoices, payments, Patient Link access, or platform support records.

### Versioned By Default

Clinical notes and clinically meaningful documentation must not be destructively overwritten after finalisation.

Drafts may be edited while still draft. Finalised, signed, amended, and locked records require append-only versioning or amendment records.

### Practitioner Accountability

Every clinical record must identify:

- responsible practitioner
- author
- signer where applicable
- tenant
- patient
- source session or encounter where applicable
- finalisation and amendment history

### Discipline-Neutral Core

The Clinical Engine must support occupational therapy, speech therapy, psychology, physiotherapy, dietetics, audiology, social work, remedial therapy, and future allied health disciplines.

Core tables should store common clinical constructs. Discipline-specific modules should extend the core through templates, structured sections, outcome measure definitions, clinical coding, and metadata rather than requiring new hardcoded tables for every profession.

### Privacy By Architecture

Clinical content is more sensitive than operational and finance content.

The default rule is:

```text
Only authorised tenant clinical users can access clinical records.
```

Super Admin must not have default access to tenant clinical data.

Patient Link receives only explicitly patient-facing content.

## 3. Domain Boundaries

### Operational Session Data

Owned by the Session Engine.

Examples:

- session status
- attendance outcome
- actual start and end time
- room or modality
- operational summary
- delivered procedure readiness
- draft invoice readiness

Operational session data answers:

```text
What happened operationally?
```

### Clinical Encounter Data

Owned by the Clinical Engine.

Examples:

- clinical encounter type
- treating practitioner
- linked session
- clinical setting
- clinical status
- clinical documentation status
- encounter-level restrictions

Clinical encounter data answers:

```text
What clinical contact or clinical event occurred?
```

### Clinical Documentation

Owned by the Clinical Engine.

Examples:

- session process notes
- assessment notes
- progress notes
- clinical observations
- treatment-plan notes
- goal reviews
- outcome measure entries
- clinical reports metadata
- signed note versions
- amendments

Clinical documentation answers:

```text
What clinical reasoning, observations, decisions, and care records were documented?
```

### Financial Data

Owned by the Draft Invoice and Finance engines.

Examples:

- draft invoices
- invoice line items
- payments
- statements
- account balances
- receipts
- finance workflow events

Finance may reference session and procedure facts. It must not depend on unrestricted access to clinical note content.

### Patient-Visible Data

Owned by Patient Link projection and communication boundaries.

Examples:

- patient-facing feedback
- upcoming sessions
- invoice availability
- receipt availability
- statements
- safe history items

Clinical content is not patient-visible unless explicitly published as patient-facing feedback or a patient-facing document.

### Internal Audit History

Owned by `audit_events` and domain history/event tables.

Clinical audit history records access, creation, finalisation, signing, amendment, lock, restricted access, export, and deletion/archive actions.

## 4. High-Level Architecture

```text
Tenant
|
+-- Patient
    |
    +-- Booking
        |
        +-- Session
            |
            +-- Clinical Encounter
                |
                +-- Clinical Notes
                |   |
                |   +-- Clinical Note Versions
                |   +-- Clinical Note Amendments
                |
                +-- Treatment Plans
                |   |
                |   +-- Clinical Goals
                |
                +-- Assessments
                |   |
                |   +-- Outcome Measure Results
                |
                +-- Clinical Attachments
                +-- Clinical Workflow Events
```

The Clinical Engine should be linked to sessions where clinical work happens during a booked session, but it must also support clinical records that are not session-based, such as:

- intake review
- school report preparation
- parent feedback review
- case management contact
- document review
- multidisciplinary meeting
- external report review

## 5. Proposed Domain Entities

This section defines entity responsibilities only. It does not create SQL.

### `clinical_encounters`

Purpose:

Stable clinical contact/event record for a patient.

Responsibilities:

- Connect clinical work to tenant, patient, practitioner, session, and booking where applicable.
- Store encounter type and lifecycle state.
- Provide a parent record for notes, assessments, attachments, and treatment-plan updates.

Suggested relationships:

- belongs to `tenant`
- belongs to `patient`
- optionally belongs to `booking`
- optionally belongs to `session`
- belongs to responsible `therapist_profile`
- may reference `practice_location`

Tenant scoped: yes  
Soft delete: yes, with clinical archive rules  
Audit required: yes

### `clinical_notes`

Purpose:

Stable identity for a clinical note.

Responsibilities:

- Store note header, note type, clinical visibility, current lifecycle state, latest version pointer, author, responsible practitioner, and linked encounter/session/patient.
- Avoid storing mutable finalised note content directly as the only source of truth.

Suggested relationships:

- belongs to `tenant`
- belongs to `patient`
- belongs to `clinical_encounter`
- optionally belongs to `session`
- authored by `profile`
- responsible practitioner `therapist_profile`
- latest version references `clinical_note_versions`

Tenant scoped: yes  
Soft delete: archive only, not hard delete  
Audit required: yes

### `clinical_note_versions`

Purpose:

Append-only note content versions.

Responsibilities:

- Store structured and free-text note content for each saved version.
- Preserve draft edits and finalised versions.
- Store reason for version where appropriate.
- Preserve author and timestamp.

Content model:

- `free_text_content`
- `structured_content`
- `template_version_id`
- `content_hash`
- `version_number`
- `version_status`

Tenant scoped: yes  
Soft delete: no under normal operation  
Audit required: yes

### `clinical_note_amendments`

Purpose:

Append-only amendments to finalised, signed, or locked notes.

Responsibilities:

- Record amendment reason, amendment content, author, timestamp, and link to the note/version being amended.
- Preserve the original finalised note.

Tenant scoped: yes  
Soft delete: no under normal operation  
Audit required: yes

### `clinical_note_templates`

Purpose:

Stable template identity for reusable clinical documentation patterns.

Responsibilities:

- Support general and discipline-specific templates.
- Separate template header from template versions.
- Allow tenant-owned and system-provided templates.

Examples:

- OT progress note
- Speech therapy session feedback
- Initial assessment
- Parent feedback note
- Case management note
- Outcome measure review

Tenant scoped: system templates may be global; tenant templates are tenant scoped  
Soft delete: yes  
Audit required: yes

### `clinical_note_template_versions`

Purpose:

Versioned template schema and content structure.

Responsibilities:

- Preserve template history.
- Define sections, required fields, structured field definitions, default prompts, visibility defaults, and discipline tags.
- Prevent old notes from changing when a template is updated.

Tenant scoped: follows parent template  
Soft delete: no for published versions  
Audit required: yes

### `treatment_plans`

Purpose:

Clinical plan of care for a patient.

Responsibilities:

- Store plan title, plan status, responsible practitioner, start/end dates, review date, clinical focus, and linked diagnosis/coding where appropriate.
- Provide parent for clinical goals.

Tenant scoped: yes  
Soft delete: archive only  
Audit required: yes

### `clinical_goals`

Purpose:

Specific therapy goals within a treatment plan.

Responsibilities:

- Store goal text, goal domain, measurable criteria, baseline, target, status, review date, achievement notes, and priority.
- Support discipline-neutral goal tracking.

Tenant scoped: yes  
Soft delete: yes with archive trail  
Audit required: yes

### `clinical_goal_reviews`

Purpose:

Append-only goal progress snapshots.

Responsibilities:

- Store reviewed status, progress rating, evidence summary, reviewer, and date.
- Avoid overwriting previous reviews.

Tenant scoped: yes  
Soft delete: no under normal operation  
Audit required: yes

### `clinical_assessments`

Purpose:

Assessment record connected to patient, encounter, session, or treatment plan.

Responsibilities:

- Store assessment type, tool/category, assessor, status, date, summary, interpretation, and restricted flag.
- Provide parent for outcome measure results.

Tenant scoped: yes  
Soft delete: archive only  
Audit required: yes

### `outcome_measure_definitions`

Purpose:

Reusable definitions for structured measures.

Responsibilities:

- Define measure name, scoring method, domains, scale, discipline tags, version, and interpretation rules.
- Support system-provided and tenant-defined measures.

Tenant scoped: optional, system definitions may be global  
Soft delete: yes for draft/custom definitions  
Audit required: yes for activation/change

### `outcome_measure_results`

Purpose:

Measured outcome result captured for a patient.

Responsibilities:

- Store result date, raw score, interpreted score, structured response set, assessor, linked assessment/encounter, and visibility.
- Support longitudinal reporting without exposing raw clinical content outside clinical permissions.

Tenant scoped: yes  
Soft delete: archive only  
Audit required: yes

### `clinical_diagnoses`

Purpose:

Clinical diagnoses, clinical impressions, or condition/coding records connected to the patient.

Responsibilities:

- Support one or more clinical codes while respecting product decisions where billing ICD-10 may remain patient-level.
- Store coding system, code, label, status, onset date, resolved date, primary indicator, clinical note reference, and practitioner.

Examples:

- ICD-10
- DSM where relevant
- ICF or local clinical classification in future
- tenant-defined clinical category

Tenant scoped: yes  
Soft delete: archive/resolved, not destructive  
Audit required: yes

### `clinical_attachments`

Purpose:

Clinical supporting documents metadata.

Responsibilities:

- Reference documents stored through the future Documents/File engine.
- Store attachment category, linked encounter/note/assessment, restricted flag, patient-visible flag, description, and uploader.

Examples:

- scanned assessment form
- school report
- referral letter
- parent questionnaire
- external report
- signed clinical form

Tenant scoped: yes  
Soft delete: archive only  
Audit required: yes

### `clinical_record_restrictions`

Purpose:

Record-level restriction metadata for sensitive clinical records.

Responsibilities:

- Mark records that need elevated clinical access.
- Define restriction reason, applied by, applied at, review date, and allowed roles/users where future permission model supports it.

Tenant scoped: yes  
Soft delete: yes through removal/archive audit  
Audit required: yes

### `clinical_workflow_events`

Purpose:

Domain-owned event source for Workflow Engine ingestion.

Responsibilities:

- Emit safe workflow metadata when meaningful clinical events occur.
- Avoid clinical note body payloads.
- Support idempotency and tenant-scoped automation.

Examples:

- `clinical_note.finalised`
- `clinical_note.signed`
- `clinical_note.amended`
- `clinical_feedback.published`
- `treatment_plan.created`
- `goal.review_due`
- `assessment.completed`
- `restricted_record.accessed`

Tenant scoped: yes  
Soft delete: no under normal operation  
Audit required: yes where security relevant

## 6. Lifecycle States

### Clinical Encounter Lifecycle

Recommended `clinical_encounter_status` values:

- `planned`
- `in_progress`
- `completed`
- `cancelled`
- `entered_in_error`
- `archived`

Rules:

- A session-based encounter should generally be created when a session is ready or started.
- Completion does not imply all notes are finalised.
- `entered_in_error` must be audited and should not physically delete the record.

### Clinical Note Lifecycle

Recommended `clinical_note_status` values:

- `draft`
- `finalised`
- `signed`
- `amended`
- `locked`
- `entered_in_error`
- `archived`

Rules:

- Draft notes can be edited by authorised clinical users.
- Finalised notes cannot be destructively edited.
- Signed notes require practitioner signature accountability.
- Amended notes preserve original versions and append amendment records.
- Locked notes cannot be changed except through a controlled amendment/unlock workflow.
- Archived notes remain available for medico-legal retention unless retention rules permit destruction.

### Template Lifecycle

Recommended `template_status` values:

- `draft`
- `active`
- `retired`
- `archived`

Rules:

- Active template versions should not be mutated in place.
- Retired templates remain available for historical note rendering.
- Notes should reference the template version used at creation.

### Treatment Plan Lifecycle

Recommended `treatment_plan_status` values:

- `draft`
- `active`
- `on_hold`
- `completed`
- `cancelled`
- `archived`

### Clinical Goal Lifecycle

Recommended `clinical_goal_status` values:

- `draft`
- `active`
- `progressing`
- `achieved`
- `not_achieved`
- `paused`
- `discontinued`
- `archived`

### Assessment Lifecycle

Recommended `assessment_status` values:

- `planned`
- `in_progress`
- `completed`
- `reviewed`
- `amended`
- `archived`

## 7. Ownership Rules

Every tenant clinical record must include `tenant_id`.

Primary ownership:

- Tenant owns the clinical record.
- Patient is the subject of the clinical record.
- Responsible practitioner is clinically accountable.
- Author creates the record.
- Signer confirms the finalised record where signature is required.

Session relationship:

- A session may have zero, one, or multiple clinical notes.
- A clinical encounter may be linked to a session or may exist without a session.
- Clinical documentation must not depend on finance records existing.

Practitioner relationship:

- Notes should link to `therapist_profiles` for clinical accountability.
- Authorship should link to `profiles`.
- Future supervision can add supervisor and reviewer relationships without replacing author/signature fields.

## 8. Access Rules

### Tenant Admin

Can manage tenant configuration and users.

Clinical access should depend on explicit clinical permissions, not admin status alone, unless the tenant admin is also a clinician and has appropriate role/permission.

### Therapist or Practitioner

Can access clinical records for patients and encounters they are allowed to treat or review.

May create, edit draft, finalise, sign, and amend records according to tenant policy and professional rules.

### Receptionist

Can access operational booking and patient administrative data.

Must not access clinical note content by default.

May see safe operational flags such as "note outstanding" without seeing note content.

### Finance

Can access billing-relevant session/procedure data and finance records.

Must not access clinical note content by default.

May see safe indicators such as "clinical documentation finalised" only where needed for operational workflow.

### Patient Link User

Can see only explicitly patient-facing content:

- published session feedback
- patient-facing documents
- safe patient-facing history entries
- finance documents and notices
- upcoming/completed sessions where permitted

Patient Link must not expose internal process notes, restricted records, draft notes, clinician-only assessments, or clinical audit records.

### Super Admin

Can manage platform, tenants, subscriptions, support, and system health.

Must not browse, search, export, edit, or view tenant clinical records by default.

Any future exceptional support access must use a separate audited support-access workflow with tenant approval, time limits, and purpose limitation.

## 9. RLS Principles

Clinical tables require stricter RLS than most operational tables.

Baseline principles:

- All clinical operational tables include `tenant_id`.
- All clinical RLS checks tenant membership through `tenant_users`.
- Clinical content read policies require clinical permission, not just tenant membership.
- Finance and receptionist roles are blocked from clinical content unless explicit permission is later granted.
- Patient Link public access never reads internal clinical tables directly unless through controlled public-safe projections/RPCs.
- Super Admin has no default clinical RLS bypass.
- Service-role access is reserved for backend worker processes and must never be exposed to the browser.

Recommended permission concepts for future implementation:

- `tenant.clinical.view`
- `tenant.clinical.manage`
- `tenant.clinical.sign`
- `tenant.clinical.restricted.view`
- `tenant.clinical.templates.manage`
- `tenant.clinical.publish_feedback`

## 10. Immutability Rules

Clinical immutability is stricter than normal operational data.

Immutable after finalisation:

- note version content
- signed note content
- amendment records
- signature records
- assessment result records after review/finalisation
- goal review snapshots

Mutable while draft:

- draft note content
- draft template versions
- draft treatment plans
- draft assessment records

Controlled status changes:

- finalise
- sign
- amend
- lock
- archive
- entered in error

These transitions must be RPC-controlled in future implementation and must write audit events.

## 11. Amendment Rules

Finalised and signed clinical notes must not be edited directly.

Amendment flow:

1. User selects finalised/signed note.
2. User provides amendment reason.
3. System creates `clinical_note_amendments`.
4. System may create a new note version with amendment reference if rendering requires it.
5. Original note version remains unchanged.
6. Note status becomes `amended` or remains `signed` with amendment count depending on product decision.
7. Audit event is recorded.
8. Workflow event is emitted.

Amendments must record:

- amended note
- amended version
- amendment author
- amendment reason
- amendment content or structured correction
- timestamp
- visibility
- audit metadata

## 12. Practitioner Accountability And Digital Signing

Digital signing must support:

- signer profile
- signer therapist profile
- signature timestamp
- signature statement
- content hash of the signed version
- optional signature image/reference from professional profile
- IP/session metadata where appropriate
- audit event

Signature should mean:

```text
The practitioner confirms the clinical record content as complete and accurate at the time of signing.
```

Signing should lock the signed note version against destructive edits.

Future support:

- supervisor co-signing
- countersignature
- trainee/supervised practitioner workflows
- signature revocation through amendment/entered-in-error process

## 13. Structured And Free-Text Content

Clinical notes should support both:

- free-text narrative
- structured sections and fields

Free-text content supports natural clinical documentation.

Structured content supports:

- templates
- reporting
- outcome tracking
- AI assistance
- form completion
- clinical consistency
- discipline-specific modules

Structured content should be stored as JSON with controlled template schemas, not arbitrary code.

Important:

- The database stores content.
- Rendering logic belongs in the application.
- Template versions define field structure.
- Old notes keep their original template version context.

## 14. Clinical Note Templates And Versioning

Templates must be versioned.

Template version should define:

- sections
- field keys
- field labels
- field types
- required fields
- visibility defaults
- discipline tags
- note type
- patient-facing eligibility
- AI-assist eligibility
- validation hints

Template versioning rules:

- Active template versions are immutable.
- Editing an active template creates a new draft version.
- Retired template versions still render old notes.
- Notes reference `template_version_id`.
- Template changes never silently change old clinical notes.

## 15. Treatment Plans And Goals

Treatment plans provide longer-term clinical direction.

Treatment plan responsibilities:

- define care focus
- link to patient and practitioner
- set plan dates and review dates
- group goals
- connect to assessments and notes
- support reporting without exposing private note content

Clinical goals should support:

- measurable target
- baseline
- priority
- domain/category
- status
- review cycle
- evidence summaries
- goal review snapshots

Goals must not require a specific discipline. Discipline-specific goal domains should be configurable through reference data or templates.

## 16. Assessments And Outcome Measures

Assessments and outcome measures should support:

- intake assessments
- standardised measures
- informal clinical assessments
- screening tools
- school/parent questionnaires
- reassessments
- discharge measures

Outcome measures must preserve:

- measure definition/version
- assessor
- date
- raw result
- interpreted result
- structured response set
- linked encounter/assessment
- audit and visibility settings

Future reporting can use structured outcome data without reading full clinical note text.

## 17. Diagnoses And Clinical Coding

Clinical coding must be flexible.

The Finance workflow may use patient-level ICD-10 for billing, but the Clinical Engine should allow richer clinical coding over time.

Supported future coding concepts:

- ICD-10
- discipline-specific categories
- clinical impressions
- referral reason
- functional domains
- ICF-style categories
- custom tenant clinical labels

Clinical diagnosis/coding records should include:

- coding system
- code
- label
- status
- primary indicator
- onset/resolved dates
- practitioner
- source note/assessment
- patient-visible flag where needed

## 18. Clinical Attachments And Supporting Documents

Clinical attachments should store metadata and references, not binary blobs directly in clinical tables.

Attachment metadata should include:

- patient
- encounter
- note or assessment
- document category
- storage object/document reference
- uploaded by
- restricted flag
- patient-visible flag
- source
- description
- created and archived timestamps

Examples:

- referral letter
- scanned assessment
- parent questionnaire
- school report
- medical aid correspondence
- signed consent relevant to clinical care

Document download/view events should be audited.

## 19. Sensitive Or Restricted Clinical Records

Some records require stricter handling.

Examples:

- safeguarding concerns
- legal notes
- sensitive family information
- restricted psychological content
- internal risk concerns
- third-party confidential information

Restricted clinical records should support:

- explicit restricted flag
- restriction reason
- applied by
- allowed role/user rules in future
- access audit
- patient-visible exclusion by default

Restricted records should never appear in Patient Link unless explicitly released through a controlled workflow.

## 20. Patient Link Exposure Boundaries

Patient Link exposure is projection-based.

Patient Link may show:

- published session feedback
- patient-facing clinical documents
- safe history entries
- treatment-plan summaries if explicitly published
- upcoming/completed sessions from Booking/Session engines
- finance records from Finance engine

Patient Link must not show:

- draft clinical notes
- internal process notes
- restricted records
- clinician-only assessments
- amendment reasoning not intended for patient view
- audit events
- AI drafts
- internal treatment reasoning unless explicitly published

Publishing to Patient Link should create:

- clinical workflow event
- patient history event where appropriate
- audit event
- safe projection/update for Patient Link

## 21. Workflow Engine Integration

The Clinical Engine should emit domain-owned `clinical_workflow_events`.

Events should be safe and metadata-only.

Recommended clinical workflow events:

- `clinical_encounter.created`
- `clinical_encounter.completed`
- `clinical_note.created`
- `clinical_note.finalised`
- `clinical_note.signed`
- `clinical_note.amended`
- `clinical_note.locked`
- `clinical_feedback.published`
- `treatment_plan.created`
- `treatment_plan.review_due`
- `clinical_goal.created`
- `clinical_goal.reviewed`
- `assessment.completed`
- `outcome_measure.recorded`
- `restricted_record.accessed`

Workflow payload rules:

- include IDs and status metadata
- do not include clinical note body
- do not include restricted content
- do not include full assessment responses by default
- include idempotency keys
- include correlation/causation where available

The Workflow Engine coordinates downstream actions. It does not become the owner of clinical state.

## 22. Billing And Session Integration

Clinical Engine integrates with Session and Finance without blending responsibilities.

Session integration:

- Clinical encounter can be created from a session.
- Session completion can require clinical documentation status checks if tenant policy requires it.
- Clinical note status may update session readiness indicators.

Billing integration:

- Finance should use session/procedure data and billing rules.
- Finance should not require clinical note text.
- Some billing workflows may require "clinical note finalised" as a safe boolean/status, not content.
- Clinical documentation should not mutate invoices.

Draft invoice flow remains:

```text
Booking -> Session -> Draft Invoice -> Finance
```

Clinical flow runs alongside:

```text
Session -> Clinical Encounter -> Clinical Note -> Finalise/Sign -> Workflow/History/Patient Link if published
```

## 23. Reporting And Analytics Boundaries

Clinical reporting should separate:

- operational metrics
- finance metrics
- clinical outcome metrics
- clinical documentation compliance

Safe clinical analytics:

- note completion rates
- signed note counts
- treatment-plan review due counts
- goal status counts
- outcome measure trend summaries
- assessment completion counts

Avoid broad reporting over free-text clinical note content unless:

- tenant explicitly enables it
- access is clinical-only
- audit logging is present
- AI/privacy rules are met

Super Admin platform analytics must not aggregate identifiable tenant clinical content.

## 24. AI-Assisted Documentation Boundaries

AI may assist clinical documentation later, but must be bounded.

Allowed future AI support:

- draft note structuring
- grammar cleanup
- session summary draft from practitioner-entered notes
- goal wording suggestions
- outcome trend summary
- missing-field prompts
- documentation quality checks

Required boundaries:

- AI drafts are never final clinical records.
- Human clinician must review and approve.
- AI-generated content must be labelled and audited.
- Restricted records require stricter opt-in.
- Patient Link must not expose AI drafts.
- No automated diagnosis without clinician approval.
- AI output must not mutate signed/finalised clinical records directly.

Suggested future entities:

- `clinical_ai_drafts`
- `clinical_ai_review_events`
- `clinical_ai_usage_events`

## 25. Data Retention, Archival, And Deletion

Clinical data retention must support medico-legal obligations.

Principles:

- Clinical records are archived, not hard-deleted, under normal product workflows.
- Signed/finalised content remains retained.
- "Entered in error" hides from normal clinical workflow but remains auditable.
- Tenant cancellation/deletion must follow a documented clinical-data retention/export/destruction policy.
- POPIA data rights must be balanced with healthcare record retention requirements.

Clinical archival should preserve:

- note versions
- amendments
- signatures
- audit events
- attachments metadata
- patient-visible publication events

## 26. Concurrency And Version Integrity

Concurrency risks:

- two practitioners editing the same draft
- one user finalising while another is editing
- duplicate finalisation clicks
- signing stale content
- amendment conflicts
- template version updates while notes are being created

Recommended controls:

- `updated_at` stale-write checks for drafts
- RPC-controlled finalise/sign/amend transitions
- content hash at finalisation/signing
- version number uniqueness per note
- one latest version pointer per note
- immutable finalised/signed versions
- row locking inside finalise/sign/amend RPCs
- idempotency keys for workflow event emission

## 27. Access And Visibility Matrix

| Area | Therapist/Practitioner | Admin | Receptionist | Finance | Patient Link | Super Admin |
| --- | --- | --- | --- | --- | --- | --- |
| Clinical encounter header | Allowed if clinical access | Depends on clinical permission | Limited operational indicator only | Limited status only | No | No default access |
| Draft clinical note | Author/allowed clinician | Clinical permission only | No | No | No | No default access |
| Finalised/signed note | Allowed clinician | Clinical permission only | No | No | No unless published | No default access |
| Patient-facing feedback | Allowed clinician | Clinical permission only | No | No | Yes if published | No default access |
| Treatment plan/goals | Allowed clinician | Clinical permission only | No | No | Only if explicitly published | No default access |
| Assessments/outcomes | Allowed clinician | Clinical permission only | No | No | Only if explicitly published | No default access |
| Clinical audit events | Restricted clinical/admin audit | Restricted | No | No | No | No default access |
| Finance records | If permission allows | If permission allows | Limited if permission allows | Yes | Finance projection only | No default access |

## 28. Auditability And Medico-Legal Integrity

Audit events should be recorded for:

- clinical encounter created/updated/archived
- note created
- note version saved
- note finalised
- note signed
- note amended
- note locked/unlocked
- restricted record accessed
- patient-facing feedback published/unpublished
- clinical attachment uploaded/viewed/downloaded/archived
- treatment plan created/updated/completed
- clinical goal created/reviewed/closed
- assessment completed/amended
- outcome measure recorded/amended
- AI draft created/accepted/rejected in future

Clinical audit metadata should include:

- tenant
- patient
- actor profile
- actor role
- entity table/id
- action
- timestamp
- reason where applicable
- request/session context where appropriate

Audit events should not store full note bodies.

## 29. Future Extensibility For Discipline-Specific Modules

Core should remain discipline-neutral.

Future discipline-specific modules can add:

- template packs
- structured assessment schemas
- outcome measure definitions
- goal libraries
- report templates
- discipline-specific reference data
- AI assist prompts
- document generation rules

Examples:

- OT sensory profile module
- speech articulation assessment module
- physiotherapy mobility outcome module
- psychology treatment-plan module
- dietetics nutrition recall module
- audiology hearing screening module

These modules should extend core records through definitions, templates, and structured JSON schemas, not by bypassing clinical versioning/audit rules.

## 30. Integration Events

Recommended event flow:

```text
session.completed
  -> clinical_encounter.created or clinical_encounter.ready
  -> clinical_note.created
  -> clinical_note.finalised
  -> clinical_note.signed
  -> clinical_feedback.published optional
  -> patient_history_events
  -> patient_link update if patient-facing
  -> workflow_event_outbox
```

Clinical Engine should emit:

- audit events for compliance
- patient history events for safe internal timeline
- clinical workflow events for automation
- Patient Link projection events only for explicitly published patient-facing content

## 31. Recommended Phase 6 Implementation Sequence

### Phase 6A

1. Clinical Engine architecture document.
2. Clinical database design specification.
3. Core clinical database migration:
   - clinical encounters
   - clinical notes
   - note versions
   - note amendments
   - clinical workflow events
4. Generated database types.
5. Clinical workspace frontend foundation.

### Phase 6B

1. Clinical note template architecture.
2. Template and template-version migration.
3. Template management UI.
4. Draft note creation from templates.
5. Finalise/sign RPCs.

### Phase 6C

1. Treatment plans and goals architecture.
2. Treatment plan and goal migrations.
3. Goal review versioning.
4. Treatment plan UI.
5. Workflow integration for review due items.

### Phase 6D

1. Assessments and outcome measures architecture.
2. Definitions and result migrations.
3. Assessment/outcome UI.
4. Reporting-safe summary views.

### Phase 6E

1. Clinical attachments and restricted records.
2. Patient Link publication boundaries.
3. Clinical audit review UI.
4. Workflow event integration hardening.

### Phase 6F

1. Clinical Engine validation and hardening.
2. RLS role testing.
3. Versioning and concurrency tests.
4. Signing/amendment tests.
5. Patient Link exposure tests.
6. Production readiness review.

## 32. Genuine Blockers Before Phase 6A Step 2

No architectural blockers are identified.

Before SQL implementation, Phase 6A Step 2 should decide:

- exact initial table set for the first migration
- whether note templates are included in the first migration or Phase 6B
- initial clinical role/permission mapping using current role values
- minimum required note types for the first pilot
- whether clinical signing uses existing therapist signature metadata immediately or only signature timestamps/content hashes first

These are implementation-scope decisions, not blockers.

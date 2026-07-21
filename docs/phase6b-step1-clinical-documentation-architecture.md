# Phase 6B Step 1: Clinical Documentation and Template Architecture

Date: 2026-07-16  
Status: Architecture blueprint only. No SQL, migrations, generated types, RPCs, frontend code, or Phase 6A behaviour changes are created by this document.

## Scope

Phase 6B turns the Phase 6A Clinical Engine foundation into a flexible, discipline-neutral clinical documentation system.

This step defines how AlliDesk should support configurable clinical note templates, structured documentation, free-text documentation, validation, clinical safety controls, Patient Link boundaries, auditability, and future AI/reporting integration.

This architecture preserves the completed Phase 6A principles:

- Clinical Engine owns clinical records only.
- Patient, Booking, Session, Finance, Workflow, and Patient Link remain separate domains.
- Finalised and signed clinical content is immutable.
- Amendments are append-only.
- Patient Link publication is explicit and protected.
- Restricted clinical records cannot be published.
- Super Admin has no default access to tenant clinical content.
- Multi-tenancy and RLS remain the security source of truth.
- Core clinical architecture remains discipline-neutral.

## Domain Boundaries

### Clinical Documentation Domain

The Clinical Documentation System owns:

- clinical note template definitions
- clinical note template versions
- structured documentation schemas
- note authoring state
- note structured responses
- note free-text content
- note validation rules
- copy-forward provenance
- clinical documentation lifecycle events

It does not own:

- patient identity or demographics
- bookings
- operational session attendance
- invoice or payment records
- Patient Link authentication
- communication delivery
- file storage delivery
- workflow execution runtime

### Documentation Versus Operational Records

Operational records answer:

```text
What was booked, attended, cancelled, completed, charged or paid?
```

Clinical documentation answers:

```text
What clinical observations, reasoning, decisions, interventions, plans and outcomes were documented by an authorised practitioner?
```

The two domains may reference each other, but neither should duplicate ownership of the other.

## Documentation Model

AlliDesk must support multiple documentation styles without forcing all clinicians into one format.

### Supported Note Content

Clinical notes should support:

- free-text notes
- structured note sections
- mixed structured and free-text notes
- repeating sections
- conditional sections
- required and optional fields
- read-only calculated fields
- clinical measurements
- scales and scores
- tables
- checklists
- multiple-choice fields
- single-choice fields
- date and time fields
- numeric values with units
- body-area or laterality fields
- practitioner-only fields
- patient-visible summary fields
- internal administrative fields

### Field Types

Recommended field types:

- `text`
- `long_text`
- `rich_text`
- `number`
- `measurement`
- `date`
- `time`
- `datetime`
- `single_choice`
- `multi_choice`
- `checkbox`
- `checklist`
- `scale`
- `score`
- `table`
- `repeating_group`
- `body_area`
- `laterality`
- `calculated`
- `attachment_reference`
- `diagnosis_reference`
- `goal_reference`
- `outcome_measure_reference`
- `read_only_display`

Field definitions should be stored as structured schema metadata, not executable code.

### Field Visibility Classes

Each section or field should declare a visibility class:

- `clinical_internal`: visible to authorised clinical users only.
- `restricted_clinical`: visible only to authorised users with restricted-record access.
- `patient_facing_candidate`: may be included in a patient-facing summary if explicitly published.
- `administrative_internal`: used for internal workflow/admin context, not clinical reasoning.
- `read_only_context`: displays referenced information from another domain without owning it.

Patient-visible fields are candidates only. They do not become visible on Patient Link unless a protected publication action publishes safe content.

## Template Ownership and Scope

### Template Ownership Types

AlliDesk should support these ownership patterns:

- System templates: platform-provided templates available across tenants.
- Tenant templates: practice-owned templates configured by the tenant.
- Practitioner templates: personal templates created by a clinician.
- Discipline templates: templates intended for a profession or discipline.
- Location templates: templates available for a specific practice location.
- Encounter-type templates: templates matched to intake, review, discharge, parent feedback, case management or similar clinical encounters.
- Session-type templates: templates suggested from operational session/service types.

### Initial Phase 6B Scope

Phase 6B should initially support:

- system templates
- tenant templates
- practitioner-owned templates where ownership is simple and tenant-scoped
- discipline metadata on templates
- encounter-type metadata on templates

### Future Extensions

The following should remain future extensions unless a later Phase 6B step explicitly includes them:

- location-specific assignment rules
- session-type automatic assignment
- complex template availability rules
- organisation-wide template libraries across tenant groups
- approval workflows with clinical lead review
- template marketplace or imported template packs

## Template Lifecycle

Templates must be versioned. Existing clinical notes must remain tied to the exact template version used when the note was created.

### Template States

Recommended template status values:

- `draft`
- `published`
- `retired`
- `archived`

### Template Version States

Recommended version status values:

- `draft`
- `published`
- `retired`
- `archived`

Published template versions are immutable. Editing a published template creates a new draft version.

### Lifecycle Rules

- Draft templates may be edited by authorised users.
- Published template versions may be used for note creation.
- Retired template versions remain readable for historical notes but cannot be used for new notes by default.
- Archived templates remain retained for audit and historical rendering.
- Hard delete should be blocked where any note references the template or template version.
- Rollback should mean publishing a new version based on an older version, not mutating the older version.
- Reactivation should create or mark an available version according to audit rules; it must not rewrite historical note bindings.
- Effective dates should control when a published version becomes the default.
- Template duplication should create a new draft template with provenance back to the source template/version.
- Template ownership transfer should be audited and tenant-scoped.

## Template Schema

Template schema should be structured JSON plus normalized relational anchors where needed for querying, integrity and future UI builders.

### Template Metadata

Template metadata should include:

- template name
- description
- owner type
- owner profile where applicable
- discipline tags
- encounter type
- intended note type
- default visibility posture
- patient-facing eligibility
- effective date range
- version status
- provenance/source template reference
- metadata

### Sections

Sections define grouping and ordering.

Each section should support:

- stable section key
- display label
- description/help text
- order
- section type
- repeatability
- minimum and maximum repeats
- default collapsed/expanded state
- visibility class
- conditional visibility rules
- required conditions
- patient-facing eligibility

### Fields

Each field should support:

- stable field key
- label
- field type
- order
- section key
- parent field/group key if nested
- validation rules
- default value
- placeholder/help text
- options for choice fields
- unit configuration
- minimum and maximum values
- character limits
- required rules
- visibility rules
- calculation definition reference
- patient-facing eligibility
- read-only status
- metadata

Stable keys must persist across template versions where the same clinical meaning remains. This enables safe copy-forward, reporting and longitudinal views.

### Structured Output

Structured note output should store:

- template version ID
- field key
- section key
- response value
- response display value where needed
- unit where applicable
- calculated value flag
- copy-forward provenance where applicable
- validation state

Free-text content remains supported alongside structured responses.

## Note Authoring Lifecycle

### Creating a Note From a Template

Workflow:

1. Clinician selects patient and clinical context.
2. Clinician selects template or system suggests a template.
3. Note is created in draft state and tied to the exact template version.
4. Structured response state is initialized from template defaults.
5. Free-text areas are initialized if template allows them.
6. Draft is saved safely with author and tenant context.

### Creating an Untemplated Note

Untemplated notes remain supported for clinically appropriate cases. They should:

- store free-text content
- use a generic note type
- optionally include basic structured metadata
- still follow draft/finalise/sign/amend lifecycle rules

### Drafts and Autosave

Draft handling should support:

- explicit save
- safe autosave
- restoration of interrupted drafts
- draft status indicators
- stale edit detection
- no autosave over finalised/signed content

Autosave should write only draft versions and should not finalise, sign, publish or amend records.

### Editing Draft Versions

Draft versions may be edited by authorised users. Once finalised or signed, destructive editing is blocked by database lifecycle enforcement.

### Finalising and Signing

Finalisation should require:

- valid patient context
- valid practitioner context
- required field completion
- valid structured content
- no unresolved critical validation errors
- explicit practitioner action

Signing should require:

- finalised note version
- authenticated authorised practitioner
- signature metadata
- immutable signed content

### Amendments

Amendments must append to the historical record.

They should include:

- amendment reason
- amendment text
- optional structured amendment content
- author
- timestamp
- reference to original note and note version

Amendments must not overwrite signed content.

### Copy Forward and Prior Values

Copy-forward is useful but clinically risky.

AlliDesk should support:

- copying selected fields only
- source note/version provenance
- clear visual indication that a value was copied
- confirmation before finalisation
- stale-data warnings for older source records
- no automatic silent copy-forward into signed notes

### Follow-Up Notes

Follow-up notes may reference:

- previous clinical note
- treatment plan
- active goals
- prior outcome measures
- previous assessment results

They should not silently overwrite first-class treatment-plan, goal or outcome records.

### Notes Without Bookings

Clinical notes may be created without a booking or session where clinically appropriate, such as:

- case management
- document review
- multidisciplinary meeting
- report preparation
- parent/caregiver consultation

These notes still require tenant, patient, author and practitioner accountability.

## Clinical Safety Controls

The system must protect against:

- copy-forward errors
- accidental duplication of outdated findings
- signing incomplete notes
- changing published templates retrospectively
- editing finalised or signed content
- losing draft work
- stale concurrent edits
- documenting against the wrong patient
- documenting against the wrong practitioner
- documenting against the wrong encounter
- exposing restricted fields through Patient Link

Recommended controls:

- patient context banner on every note editor
- encounter/session context banner where linked
- practitioner identity display
- draft autosave with conflict detection
- required-field validation before finalisation
- copy-forward provenance and warnings
- database immutability triggers
- lifecycle RPCs for finalise/sign/amend
- explicit Patient Link publication RPCs
- restricted-content flags at note, section and field levels

## Validation Framework

Validation should be layered.

### Client-Side Usability Validation

Client-side validation improves usability. It may check:

- required fields
- input type
- character limits
- numeric ranges
- date formatting
- unit selection
- conditional field visibility
- obvious cross-field conflicts

Client-side validation must never be the only enforcement boundary for critical clinical rules.

### Database Integrity Validation

Database validation should enforce:

- tenant ownership
- foreign key integrity
- lifecycle immutability
- JSON object shape where needed
- valid status values
- safe publication boundaries
- same-template-version/note relationships
- append-only amendment behaviour

### Protected Lifecycle Validation

Finalisation, signing, amendment and publication should remain protected by RPCs or equivalent transactional server-side boundaries.

Finalisation requirements may include:

- all required fields completed
- no critical validation errors
- note version is draft
- author/practitioner is authorised
- patient belongs to active tenant
- template version is valid for historical use

### Template-Specific Rules

Template validation should support:

- required fields
- conditional required fields
- minimum/maximum values
- allowed units
- character limits
- date restrictions
- cross-field validation
- score calculations
- finalisation-only requirements

## Calculated Clinical Fields

Calculated fields must be safe and deterministic.

Do not allow arbitrary executable code inside templates.

Recommended approach:

- constrained expression model
- declarative rule syntax
- fixed list of supported operators
- fixed list of supported aggregate functions
- explicit input field references by stable key
- calculation versioning
- stored calculated output with calculation definition reference
- server-side revalidation for finalisation where clinically meaningful

Supported future calculation categories:

- outcome scores
- aggregate section scores
- derived classifications
- reference range flags
- progress indicators

Calculation definitions should be versioned with the template version that used them.

## Assessments and Outcome Measures

Outcome data should not be duplicated inside generic note content when it should exist as a first-class clinical record.

Templates may:

- reference outcome measure definitions
- display previous outcome scores read-only
- provide links to create assessment results
- include narrative interpretation of outcome results
- show longitudinal trends as read-only context

Outcome measure results should remain in `outcome_measure_results`. Assessment definitions should remain first-class reference records.

## Treatment Plans and Goals

Templates may reference:

- active treatment plans
- clinical goals
- goal progress
- goal reviews
- discharge planning items

Templates must not silently overwrite treatment plans or goals.

Recommended pattern:

- display active plans/goals as read-only context
- allow explicit creation of goal reviews through protected clinical workflows
- store narrative discussion in note content
- keep goal status/progress as first-class clinical records

## Diagnosis Integration

Clinical documentation may reference:

- active clinical diagnoses
- primary and secondary diagnoses
- diagnosis status
- diagnosis coding systems
- historical diagnoses

Clinical diagnoses remain clinical records. They must not be automatically converted into finance or medical-aid billing codes.

Templates may display diagnoses as read-only context or allow explicit clinical diagnosis references by ID.

## Attachment Integration

Templates and notes may reference:

- clinical attachments
- images
- scanned documents
- external reports
- consent forms
- supporting files

Attachment references should store identifiers and safe metadata only.

Do not embed insecure public storage URLs into structured note content.

File upload, signed URL generation, storage bucket policy and download behaviour remain separate storage/document concerns.

## Restricted Content

Restrictions may exist at multiple levels:

- field-level
- section-level
- note-level
- record-level

### Phase 6B Initial Posture

Phase 6B should not require full field-level restricted access in the first implementation step unless a later step explicitly scopes it.

Initial implementation should support:

- note-level restriction
- section/field restriction metadata in template schema
- prevention of restricted fields from Patient Link publication
- no weakening of Phase 6A RLS

### Future Fine-Grained Restriction Model

Future restricted access may require:

- `tenant.clinical.restricted.view`
- practitioner-specific access grants
- clinical lead overrides
- access reason logging
- restricted-field redaction in rendered notes
- restricted-section redaction in Patient Link summaries

Tenant admins should not automatically see all restricted content forever. The Phase 6A baseline allows admin/therapist clinical access, but future fine-grained restrictions should distinguish clinical governance from general tenant administration.

## Patient Link Boundaries

Patient Link publication must remain explicit.

Clinical documentation can produce patient-facing outputs, but publishing a clinical note must not imply exposing the entire internal note.

Distinguish:

- internal note content
- patient-facing summaries
- published clinical reports
- home programmes
- care instructions
- outcome reports
- supporting documents

Recommended Patient Link approach:

- generate or author a patient-facing summary separately from internal note content
- publish safe title and summary metadata through protected RPCs
- only include fields marked patient-facing and approved for publication
- exclude restricted fields and sections
- record publication and revocation audit events

## Discipline Neutrality

The documentation system must support:

- physiotherapy
- occupational therapy
- speech therapy
- psychology
- dietetics
- audiology
- biokinetics
- podiatry
- social work
- other allied-health disciplines

SOAP can be provided as one optional template, but the core must not be hardcoded around SOAP.

Discipline-specific behaviour should be expressed through:

- template metadata
- field schemas
- outcome measure definitions
- assessment definitions
- clinical coding references
- optional future modules

## Permissions

Recommended permission boundaries:

| Capability | Tenant Admin | Therapist/Clinician | Clinical Lead | Receptionist | Finance | Patient | Super Admin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| View templates | Yes | Yes | Yes | No by default | No | No | System templates only |
| Create tenant templates | Yes | Optional tenant setting | Yes | No | No | No | No tenant clinical content |
| Edit draft templates | Yes | Own templates where allowed | Yes | No | No | No | No |
| Publish templates | Yes or clinical lead | No by default | Yes | No | No | No | No |
| Retire templates | Yes or clinical lead | No by default | Yes | No | No | No | No |
| Use templates | Yes if clinical role | Yes | Yes | No | No | No | No |
| Create clinical notes | Yes if clinical role | Yes | Yes | No | No | No | No |
| Edit draft notes | Author/authorised | Author/authorised | Yes | No | No | No | No |
| Finalise notes | Author/authorised | Author/authorised | Yes | No | No | No | No |
| Sign notes | Practitioner only | Practitioner only | Practitioner only | No | No | No | No |
| Amend notes | Author/authorised | Author/authorised | Yes | No | No | No | No |
| View restricted content | Future granular permission | Future granular permission | Future granular permission | No | No | No | No |
| Publish patient-facing content | Admin/clinical lead/authorised clinician | Authorised clinician | Yes | No | No | No | No |

Super Admin must not receive default tenant clinical access.

## Audit Principles

Audit events should capture:

- template creation
- template version publication
- template retirement
- template duplication
- template ownership transfer
- note creation
- draft edits at meaningful intervals or explicit save boundaries
- finalisation
- signing
- amendments
- copy-forward use
- patient-facing publication
- revocation

Audit metadata should include:

- actor profile ID
- tenant ID
- patient ID where applicable
- entity/table
- record ID
- action
- timestamp
- safe metadata

Do not place unrestricted clinical note content into broad audit logs.

## AI Boundaries

Future AI may assist with:

- draft assistance
- summarisation
- structured field suggestions
- transcription
- suggested clinical coding
- outcome interpretation
- quality checks
- missing-field prompts

AI must not:

- finalise notes
- sign notes
- silently overwrite clinician content
- make autonomous diagnoses
- publish content to Patient Link
- bypass clinical permissions
- receive unrestricted clinical data without approved privacy and governance controls

AI-generated suggestions must be labelled, reviewable and accepted by an authorised clinician before becoming part of the clinical record.

## Reporting Boundaries

Structured clinical data may support:

- operational documentation-completion reporting
- clinical outcome reporting
- tenant-level aggregate reporting
- practitioner workload/documentation reporting
- patient-level longitudinal clinical views

Reporting must respect:

- tenant boundaries
- restricted-data exclusions
- de-identification requirements
- clinical access permissions
- Patient Link publication boundaries

Super Admin may receive aggregate platform-level operational metrics only, not tenant clinical content.

This phase should not design a broad analytics warehouse.

## Proposed Data Model

Phase 6A already provides:

- `clinical_note_templates`
- `clinical_note_template_versions`
- `clinical_notes`
- `clinical_note_versions`
- `clinical_note_amendments`
- `clinical_encounters`
- `treatment_plans`
- `clinical_goals`
- `clinical_goal_reviews`
- `outcome_measure_definitions`
- `clinical_assessments`
- `outcome_measure_results`
- `clinical_diagnoses`
- `clinical_attachments`
- `clinical_record_restrictions`
- `clinical_patient_link_publications`
- `clinical_workflow_events`

### Proposed Extensions or New Entities

No SQL is created in this step. Later Phase 6B database work may require:

#### Template Builder Entities

- `clinical_template_sections`
  - normalized section definitions for queryable template builder state
  - linked to template version
  - stable section key, ordering, repeatability and visibility rules

- `clinical_template_fields`
  - normalized field definitions for queryable template builder state
  - linked to template version and section
  - stable field key, field type, validation and display metadata

- `clinical_template_field_options`
  - choice/checklist option definitions where normalized options are useful

- `clinical_template_validation_rules`
  - normalized reusable validation rules for critical finalisation checks

- `clinical_template_calculation_rules`
  - constrained calculation definitions with versioned rule metadata

- `clinical_template_assignments`
  - future availability/assignment rules by discipline, encounter type, practitioner, location or session type

#### Note Response Entities

- `clinical_note_structured_responses`
  - field-level note responses linked to note version, template version and stable field key
  - supports structured reporting and safer copy-forward provenance

- `clinical_note_draft_state`
  - optional autosave/conflict state if not handled fully in `clinical_note_versions`

- `clinical_note_copy_forward_events`
  - provenance for copied prior values
  - source note/version/field references
  - explicit author action and timestamp

#### Publication and Rendering Entities

- `clinical_patient_facing_documents`
  - future safe clinical document projection for Patient Link
  - distinct from internal notes

These entities should be considered in Phase 6B Step 2. Some may be deferred if Phase 6A JSON schema fields are sufficient for the first implementation.

## Workflow Events

Workflow payloads must contain safe identifiers and metadata only. They must not include full clinical note content.

Recommended event keys:

- `clinical_template_published`
- `clinical_template_retired`
- `clinical_note_draft_created`
- `clinical_note_draft_saved`
- `clinical_note_finalised`
- `clinical_note_signed`
- `clinical_note_amended`
- `clinical_copy_forward_used`
- `clinical_patient_facing_document_published`
- `clinical_patient_facing_document_revoked`
- `clinical_documentation_overdue`

Events may drive future:

- dashboard tasks
- documentation reminders
- quality checks
- Patient Link updates
- communication prompts

## Deferred Functionality

Deferred beyond Phase 6B Step 1:

- SQL migrations
- generated type updates
- frontend template builder
- note editor implementation
- autosave runtime
- field-level restricted RLS
- storage upload/download integration
- Patient Link clinical document rendering
- AI documentation assistance
- clinical reporting dashboards
- complex location/session template assignment rules
- live Supabase concurrency validation

## Recommended Phase 6B Implementation Sequence

### Step 1: Architecture

Create the clinical documentation and template architecture blueprint.

### Step 2: Database

Add forward-only migrations for the smallest safe database extension needed for:

- template sections
- template fields
- validation/calculation definitions where needed
- structured note responses
- copy-forward provenance
- template assignment metadata where needed

Preserve Phase 6A tables and lifecycle RPC boundaries.

### Step 3: Types

Regenerate or update database types using the existing project convention.

### Step 4: Frontend Template Foundation

Add a template management UI for viewing, creating draft templates, editing draft sections/fields and publishing versions.

### Step 5: Frontend Note Authoring Foundation

Add a note authoring experience that supports:

- selecting a patient
- choosing a template
- free-text notes
- structured fields
- draft saving
- finalisation readiness

### Step 6: Integration

Connect documentation to:

- selected patient
- clinical encounter
- session where relevant
- treatment plans/goals where read-only context is needed
- Patient Link publication metadata where explicitly actioned
- Workflow Engine safe events

### Step 7: Hardening

Harden:

- required-field enforcement
- finalisation validation
- restricted-content boundaries
- copy-forward warnings
- stale draft protection
- template version immutability
- audit coverage

### Step 8: Validation

Perform:

- build validation
- TypeScript validation
- migration validation
- RLS validation
- RPC lifecycle validation
- clinical safety review
- Patient Link boundary review
- production-readiness audit before Phase 6C


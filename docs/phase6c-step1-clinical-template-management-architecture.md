# Phase 6C Step 1: Clinical Template Management Architecture

Date: 2026-07-17  
Status: Architecture blueprint only. No SQL, migrations, generated types, RPCs, frontend code, or Phase 6A/6B behaviour changes are created by this document.

## Scope

Phase 6C designs the administrative and clinical-lead experience for creating, configuring, validating, versioning, publishing, assigning, duplicating, retiring, and governing clinical documentation templates.

This phase builds on the Phase 6B Clinical Documentation System. It must reuse the existing template model:

- `clinical_note_templates`
- `clinical_note_template_versions`
- `clinical_template_sections`
- `clinical_template_fields`
- `clinical_template_field_options`
- `clinical_template_validation_rules`
- `clinical_template_calculation_rules`
- `clinical_template_assignments`
- `clinical_note_structured_responses`

Phase 6C must not introduce a competing template system. Historical clinical notes remain tied to the exact immutable template version used at authoring time.

Initial Phase 6C capabilities should cover:

- creating a template shell
- creating the initial draft version
- editing draft metadata, sections, fields, options, validation rules and assignment metadata
- previewing a draft template without creating clinical records
- validating draft completeness before publication
- publishing immutable template versions through protected database boundaries
- creating new draft versions from existing versions
- duplicating safe template definitions
- retiring versions and templates without breaking historical rendering
- assigning published templates to deterministic clinical contexts
- viewing safe usage and lifecycle history

Future advanced capabilities are explicitly deferred:

- drag-and-drop template designer as the only authoring mode
- formula editor with arbitrary expressions
- AI-generated templates
- voice-driven template authoring
- realtime collaborative editing
- public template marketplace
- full Patient Link document-composition designer
- discipline-specific advanced template modules
- broad clinical-outcome analytics

## Roles And Permissions

Phase 6C should use the existing AlliDesk permission foundation and Supabase RLS patterns. The UI may hide actions, but protected RPCs and RLS remain authoritative.

### Tenant Admin

Tenant Admin may:

- view tenant templates and system templates available to the tenant
- create tenant templates
- edit tenant draft templates
- publish, retire and assign templates where the tenant chooses an admin-governed workflow
- duplicate templates into the tenant workspace
- view safe aggregate usage metadata

Tenant Admin may not gain broad unrestricted clinical-note content access through template management.

### Clinical Lead

Clinical Lead is the preferred future role for clinical governance. Where the role is not yet explicit, Phase 6C may map this to a tenant admin or therapist with `tenant.practice.configure`/clinical management permissions.

Clinical Lead may:

- review and approve clinical templates
- publish and retire clinical template versions
- manage clinical assignment rules
- view validation and usage metadata

### Therapist Or Clinician

Therapist or clinician may:

- view published templates available to their tenant/context
- create drafts if tenant policy allows clinician-authored templates
- maintain personal/practitioner templates if enabled
- preview templates

Initial implementation should be conservative: allow clinicians to use templates and optionally draft practitioner templates, but require admin/clinical-lead approval before tenant-wide publication.

### Template Author

Template Author is a functional responsibility rather than a required new auth role. The author creates and edits draft versions. The author should not be able to mutate published versions.

### Template Reviewer

Template Reviewer reviews draft readiness and clinical safety. Separate reviewer approval is recommended for larger practices and should be designed into the architecture, but may be deferred in initial UI if the database extension is not yet present.

### Read-Only Clinical User

Read-only clinical users may view template definitions and previews where allowed, but may not edit, publish, retire, duplicate, or assign templates.

### Receptionist

Receptionists should not manage clinical template content. They may see only safe operational labels where required for bookings or sessions, never practitioner-only or restricted clinical template internals.

### Finance User

Finance users should not manage clinical templates. Finance may see safe service or documentation status metadata only where needed for billing workflows, not clinical field content.

### Super Admin

Super Admin may manage system template definitions only. Super Admin must not receive access to tenant clinical content, tenant responses, patient clinical records, or tenant-specific draft content through template administration.

System template governance must remain separate from tenant clinical records.

## Domain Boundaries

Clinical Template Management owns template administration only:

- template shells
- template versions
- section definitions
- field definitions
- field options
- validation metadata
- visibility metadata
- calculation metadata
- assignment metadata
- preview and validation results
- template lifecycle metadata

It does not own:

- patient demographics
- bookings
- sessions
- invoices
- payments
- clinical-note response content
- signed clinical records
- Patient Link sessions
- workflow execution runtime
- file storage delivery

Clinical responses remain owned by the Clinical Documentation runtime. Template management configures how notes may be authored; it does not edit historical note values.

## Ownership And Template Scope

Template scope should build on existing Phase 6B concepts.

### Supported Ownership Types

System templates:

- platform-owned
- `tenant_id` is null
- managed only by Super Admin
- may be duplicated into a tenant template
- must not expose tenant clinical content

Tenant templates:

- tenant-owned
- available only to tenant users through RLS
- initial Phase 6C primary scope

Practitioner templates:

- tenant-scoped but owned by a practitioner/profile
- useful for individual clinician preferences
- recommended as a later Phase 6C extension unless existing columns can support ownership through metadata safely

Discipline templates:

- templates tagged or assigned by discipline/profession
- recommended in initial scope as metadata and assignment filtering, not as a separate domain

Location-specific templates:

- assigned to a practice location
- recommended after basic assignment management is working

Encounter-type templates:

- assigned by clinical encounter type
- recommended in initial scope

Session-type templates:

- assigned by operational session type
- should be supported after Session Engine context is stable in template picker workflows

### Initial Scope Recommendation

Initial Phase 6C should support:

- system templates read/duplicate where safe
- tenant templates create/edit/publish/retire
- encounter-type assignment
- discipline metadata
- default tenant assignment

Defer practitioner-specific, location-specific and session-type assignment UI until the base authoring and publication workflow is validated.

## Template And Version Lifecycle

Template and template-version state must remain distinct.

### Template Lifecycle

Recommended template states:

- `draft`: template shell exists but has no published version
- `active`: at least one active published version is available
- `retired`: no longer available for new notes
- `archived`: hidden from normal administration but retained for history

### Template Version Lifecycle

Recommended version states already align with Phase 6B:

- `draft`: editable
- `active`: published and immutable
- `retired`: unavailable for new notes, still renderable for historical notes
- `archived`: retained but hidden from normal usage

### Lifecycle Flow

```text
Template created
  -> Initial draft version created
  -> Draft edited
  -> Draft validated
  -> Review requested, if enabled
  -> Published as active immutable version
  -> Older active version superseded/retired
  -> New draft version created from active/retired version
  -> Replacement published
  -> Template retired
  -> Archived only when no active use requires normal display
```

### Immutability Rules

- Published and retired versions must not be edited.
- Historical clinical notes must render against the exact version they used.
- Rollback must be modelled by creating a new draft version from an older version, then publishing it. Direct rollback that mutates history is not allowed.
- Deletion must be restricted where any version, response, note, assignment history or audit event references the record.

### Concurrent Editing

Template drafts should have optimistic locking and optional draft ownership metadata. Concurrent editor warnings are useful; realtime collaborative editing is deferred.

## Editor Architecture

The template editor should be a structured workspace, not a raw JSON editor.

Recommended workspace areas:

- template metadata panel
- version status and validation summary
- section navigator
- section editor
- field editor
- options editor
- validation-rule editor
- visibility-rule editor
- calculation-rule summary
- assignment panel
- preview panel
- version history
- usage summary
- publication actions

Recommended component architecture:

```text
ClinicalTemplateManagementPage
  -> TemplateList
  -> TemplateDetail
     -> TemplateMetadataPanel
     -> TemplateVersionHeader
     -> TemplateEditorShell
        -> SectionNavigator
        -> SectionEditor
        -> FieldEditor
        -> FieldOptionsEditor
        -> RuleEditors
        -> TemplatePreview
     -> TemplateAssignmentsPanel
     -> TemplateUsageSummary
     -> TemplateVersionHistory
     -> PublicationWorkflowPanel
```

Hooks/services should remain focused:

- `useClinicalTemplates`
- `useClinicalTemplateVersion`
- `useClinicalTemplateDraft`
- `useTemplateAssignments`
- `useTemplateValidation`
- `useTemplatePublication`

## Authoring Interaction Model

The recommended initial approach is a hybrid editor with structured forms and simple reorder controls.

### Structured Form Editor

Benefits:

- reliable
- accessible
- keyboard-friendly
- easier to validate
- easier to test
- works well on tablets

This should be the initial implementation baseline.

### Drag-And-Drop Editor

Benefits:

- fast visual reordering
- intuitive for some users

Risks:

- accessibility complexity
- touch/tablet edge cases
- reordering concurrency
- accidental structural changes
- difficult nested groups

Drag-and-drop should be optional and paired with keyboard-accessible move up/down controls. It is not required for the first implementation.

### Hybrid Recommendation

Initial Phase 6C should use:

- structured forms for editing
- explicit add section/add field controls
- move up/down controls for ordering
- collapsible section navigation
- preview mode for clinician experience

Drag-and-drop can be added later after the safe structured workflow is production-proven.

## Field And Section Management

### Field Configuration

Template authors should configure:

- field type
- label
- stable field key
- help text
- placeholder
- default value
- required state
- required-on-finalise state
- display order
- options where applicable
- allowed units
- minimum and maximum through validation metadata
- character limits through validation metadata
- visibility rules
- conditional requirement rules
- patient-visible eligibility
- practitioner-only state
- internal-use state
- read-only state
- calculation association
- clinical reference type

Stable field keys must be protected after publication or once referenced by clinical responses. A new version may add fields or retire fields, but historical keys remain intact in old versions.

### Field Types In Initial Scope

Initial UI should support editing common field types:

- short text
- long text
- number
- decimal
- date
- time
- boolean
- single choice
- multiple choice
- checklist
- scale
- measurement
- heading
- instruction
- read-only display

Specialised reference fields should be visible but editing can be conservative until dedicated reference pickers exist:

- outcome measure reference
- diagnosis reference
- treatment goal reference
- attachment reference

### Section Configuration

Template authors should configure:

- section title
- stable section key
- description
- help text
- display order
- collapsed/default display
- required completion metadata
- conditional visibility metadata
- patient-visible eligibility
- practitioner-only state

Initial implementation should support simple sections and groups. Repeating sections and nested groups can be represented in the model but should be exposed cautiously in UI.

## Validation And Visibility Rules

### Validation-Rule Builder

The validation builder must be constrained. It should not permit arbitrary SQL, JavaScript, or executable formulas.

Initial supported rules:

- required field
- required on finalisation
- minimum and maximum numeric value
- minimum and maximum character length
- allowed units
- date cannot be future
- date cannot be before a configured threshold
- option must be selected
- section completion required

Future rules:

- cross-field validation
- complex conditional validation
- outcome-measure scoring validation
- discipline-specific validation packs

Rules should store declarative metadata only. Database validation remains authoritative at publication and note finalisation boundaries.

### Visibility-Rule Builder

Initial visibility rules should be declarative and limited:

- show/hide based on another field value
- make required based on another field value
- choice-dependent fields
- simple comparisons
- AND/OR groups with limited nesting

Safeguards:

- prevent circular dependencies
- prevent missing field references
- prevent references to fields in another template version
- warn about unreachable fields
- block rules targeting incompatible field types
- block rules that make restricted/practitioner-only content patient-visible

Visibility rules are authoring metadata. Clinical safety checks must still be enforced by protected database functions.

## Calculation-Management Boundaries

Calculation management should initially be conservative.

Supported architecture:

- calculation definitions are declarative
- output fields are read-only/calculated
- referenced fields must belong to the same template version
- calculations are versioned with the template version
- calculated results are stored as structured responses only when produced by protected workflows

Initial UI may allow viewing and simple configuration for:

- sum of numeric fields
- average of numeric fields
- score total from selected options
- derived classification from score ranges

Deferred:

- arbitrary formula editor
- custom JavaScript
- custom SQL
- external calculation plugins
- complex outcome-measure engines

If simple calculation editing creates too much risk, Phase 6C should display calculation rules read-only and defer editing to a dedicated calculation-engine milestone.

## Options And Choice Fields

Choice-field option management should support:

- stable option key
- label
- value metadata
- display order
- default selection
- active/retired state through soft delete or metadata
- patient-visible eligibility where safe

Duplicate option keys must be prevented per field/version.

Published option definitions are immutable. If an option label or meaning needs to change after publication, create a new template version.

Historical note rendering must use the option label/value snapshot or the exact template version option definition used at the time.

## Preview And Publication

### Preview And Test Mode

Preview must not create clinical records.

Preview should support:

- clinician-facing layout
- desktop and tablet preview
- required-field indicators
- sample values
- conditional logic preview
- unsupported-field warnings
- patient-visible eligibility review
- restricted/practitioner-only warnings
- validation summary

Preview state is temporary and should be stored only in component state or dedicated draft-preview metadata if later required. It must not create patients, encounters, notes, responses, signatures, or workflow events.

### Publication Workflow

Publication must use protected database boundaries. Frontend validation is advisory only.

Publication should require:

- draft version
- template metadata validity
- at least one section
- field keys unique within version
- section keys unique within version
- option keys unique within each field
- required rules referencing valid fields
- visibility rules referencing valid fields
- calculation rules referencing valid fields
- patient-visible eligibility safety checks
- no unsupported field types for publication

Reviewer approval is recommended as a future extension. Initial implementation may allow tenant admin/clinical lead publication without separate reviewer, provided audit metadata records the publisher.

## Versioning And Duplication

### Version Management

Authors should be able to:

- create a new draft version from a published or retired version
- edit only the new draft
- compare draft against source version
- add release notes/change reason
- publish replacement version
- view version history
- retire versions

Older versions remain renderable for historical notes. Reverting means creating a new draft from an older version and publishing it as a new version.

### Duplication

Initial duplication should support:

- system template to tenant template
- tenant template to new tenant template in the same tenant
- published version to new draft template

Deferred or restricted:

- tenant template to another tenant
- practitioner template to tenant template
- cross-tenant import/export packs

Duplication must never copy:

- clinical notes
- clinical responses
- patient data
- signatures
- assignments unless explicitly chosen
- usage history
- audit history

Duplication should record provenance metadata such as source template/version identifiers.

## Template Assignments

Template assignments determine availability for new clinical documentation. They must not affect historical note rendering.

Supported assignment dimensions:

- tenant default
- clinical encounter type
- discipline
- practitioner
- location
- session type
- patient category, future

Initial scope should support:

- tenant default assignment
- encounter-type assignment
- discipline assignment where metadata is already available

Recommended deterministic precedence:

1. practitioner-specific assignment
2. location + encounter/session type assignment
3. discipline + encounter/session type assignment
4. encounter/session type assignment
5. tenant default assignment
6. system default fallback

If two assignments have the same precedence, priority and effective dates should resolve the conflict. The UI should warn about ambiguous assignments before publication/activation.

## Usage Metadata

Template management should display safe aggregate usage metadata only:

- number of notes using each template version
- first used date
- last used date
- active assignments
- retired versions
- draft versions
- authors
- publishers
- publication date
- retirement date

Usage views must not expose clinical-note content, structured response values, diagnoses, assessment results, attachments, or patient identifiers beyond what the current clinical workspace permissions already allow.

## Clinical Safety

Clinical safety controls must prevent:

- editing published versions
- publishing incomplete templates
- duplicate stable section or field keys
- deleting referenced historical definitions
- invalid visibility rules
- circular visibility dependencies
- invalid calculation references
- accidental patient-visible eligibility
- practitioner-only fields becoming patient-visible
- restricted fields becoming patient-visible
- retiring a required active template without warning
- selecting retired templates for new notes
- publishing unsupported field types
- silent draft loss
- stale concurrent saves

Patient-visible eligibility must remain metadata only. Publication to Patient Link remains a separate protected workflow.

## Concurrency

Phase 6C should support:

- explicit Save
- optional autosave after explicit safe draft model exists
- optimistic locking on template draft state
- stale edit errors
- concurrent editor warnings
- recovery after interruption
- idempotent section creation
- idempotent field creation
- safe reordering with lock/version checks

Realtime collaborative editing is deferred.

## Patient Link Boundaries

Template authors may mark fields as patient-visible eligible only when safety rules permit it.

They may configure:

- patient-facing label
- patient-facing description
- patient-facing display hint
- patient-visible eligibility

They may not:

- publish internal clinical notes automatically
- make restricted content patient-visible
- make practitioner-only content patient-visible
- expose a full internal template as a patient document
- bypass Patient Link publication controls

Eligibility is not publication. Patient Link publication remains explicit and protected.

## Audit And Workflow Events

Audit events should capture safe template lifecycle metadata only.

Audit required for:

- template created
- draft version created
- metadata edited
- section created, changed, reordered, retired
- field created, changed, reordered, retired
- option created, changed, reordered, retired
- validation rule changed
- visibility rule changed
- calculation rule changed
- assignment changed
- validation failed
- review requested
- review approved/rejected
- version published
- version retired
- template duplicated

Audit payloads must not include clinical response content.

Workflow events should be identifier-only and safe:

- `clinical_template_created`
- `clinical_template_version_created`
- `clinical_template_review_requested`
- `clinical_template_review_approved`
- `clinical_template_validation_failed`
- `clinical_template_version_published`
- `clinical_template_version_retired`
- `clinical_template_assignment_changed`
- `clinical_template_duplicated`

## Reporting Boundaries

Safe reporting for Phase 6C:

- template adoption
- active versus retired versions
- assignment coverage
- validation failure counts
- number of notes per template version
- documentation completion rates by safe aggregate metadata

Deferred:

- clinical outcome analytics
- response-value analytics
- diagnosis analytics
- assessment result analytics
- AI clinical insight reporting

## Accessibility And Usability

The editor must support:

- keyboard navigation
- screen-reader labels
- visible focus states
- move up/down alternatives to drag-and-drop
- error summaries
- colour-independent status communication
- tablet layouts
- long-template navigation
- section search/filtering
- unsaved-change warnings
- clear publication warnings

Large templates should be navigable without excessive scrolling.

## Proposed Database Extensions

No SQL is created in this step. Potential forward-only extensions for Phase 6C include:

### Reuse Existing Objects

Reuse:

- `clinical_note_templates`
- `clinical_note_template_versions`
- `clinical_template_sections`
- `clinical_template_fields`
- `clinical_template_field_options`
- `clinical_template_validation_rules`
- `clinical_template_calculation_rules`
- `clinical_template_assignments`
- `audit_events`
- `clinical_workflow_events`

### Extend Existing Objects

Possible extensions:

- template version release notes
- template version review status
- template version submitted-for-review timestamp
- template version approved/rejected by profile
- template assignment priority
- template assignment effective start/end dates
- draft lock version on template sections/fields/options/rules
- patient-facing label/description metadata for sections and fields
- duplication provenance metadata

### New Entities To Consider

Potential new tables:

- `clinical_template_draft_states`
- `clinical_template_review_requests`
- `clinical_template_validation_results`
- `clinical_template_usage_snapshots`
- `clinical_template_favourites`, if practitioner favourites are included
- `clinical_template_change_events`, only if audit_events is not sufficient for detailed editor history

New entities should be added only where existing audit/events/metadata cannot safely model the requirement.

## Proposed Frontend Structure

Recommended routes:

- `/clinical/templates`
- `/clinical/templates/:templateId`
- `/clinical/templates/:templateId/versions/:versionId`
- `/clinical/templates/:templateId/versions/:versionId/edit`
- `/clinical/templates/:templateId/versions/:versionId/preview`
- `/clinical/templates/:templateId/assignments`

Recommended components:

- `ClinicalTemplateManagementPage`
- `TemplateList`
- `TemplateFilters`
- `TemplateDetail`
- `TemplateVersionHeader`
- `TemplateMetadataPanel`
- `TemplateEditorShell`
- `SectionNavigator`
- `SectionEditor`
- `FieldEditor`
- `FieldOptionsEditor`
- `ValidationRuleEditor`
- `VisibilityRuleEditor`
- `CalculationRulePanel`
- `TemplatePreview`
- `VersionHistoryPanel`
- `AssignmentManagementPanel`
- `UsageSummaryPanel`
- `PublicationWorkflowPanel`

Recommended hooks/services:

- `useClinicalTemplates`
- `useClinicalTemplateVersion`
- `useClinicalTemplateDraftState`
- `useClinicalTemplateSections`
- `useClinicalTemplateFields`
- `useClinicalTemplateOptions`
- `useClinicalTemplateRules`
- `useClinicalTemplateAssignments`
- `useClinicalTemplateValidation`
- `useClinicalTemplatePublication`

The frontend should use existing AlliDesk shared UI primitives, PageHeader, state components, permission helpers, and Supabase client conventions.

## Deferred Functionality

Deferred until later milestones:

- drag-and-drop-first builder
- complex formula editor
- realtime collaboration
- cross-tenant template marketplace
- AI-authored templates
- automatic template generation from notes
- full patient-facing document designer
- discipline-specific module editors
- advanced outcome-measure scoring engines
- imported/exported template packs
- bulk assignment rules

## Recommended Implementation Sequence

### Phase 6C Step 1: Architecture

Complete this document.

### Phase 6C Step 2: Database Extensions

Create forward-only migrations only for required template-management extensions:

- draft state/concurrency metadata
- review workflow metadata, if accepted
- validation result storage
- assignment priority/effective dating, if needed
- release notes/provenance metadata

Do not duplicate Phase 6B template tables.

### Phase 6C Step 3: Database Types

Regenerate `src/lib/database.types.ts` after migrations.

### Phase 6C Step 4: Template List And Detail Frontend

Build the initial template list, detail, version history, and usage metadata surfaces.

### Phase 6C Step 5: Draft Template Editor

Implement structured editing for metadata, sections, fields, options and simple ordering.

### Phase 6C Step 6: Rule Editors And Preview

Add constrained validation/visibility rule editing and clinician-facing preview.

### Phase 6C Step 7: Publication And Assignment Workflow

Connect protected validation, publish, retire, new-version, duplicate and assignment workflows.

### Phase 6C Step 8: Hardening And Validation

Harden concurrency, idempotency, publication safety, assignment precedence, patient-visible eligibility and audit/event payloads.

### Phase 6C Step 9: Independent Production-Readiness Audit

Perform an audit-only review before moving to advanced template capabilities.

## Blockers Before Phase 6C Step 2

No architectural blockers are identified.

Phase 6C Step 2 should decide whether review workflow storage is included immediately or deferred behind a simpler admin/clinical-lead publish flow.

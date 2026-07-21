# Phase 6C Step 4 - Clinical Template Management Validation

## Objective

Phase 6C Step 4 reviewed and hardened the completed Clinical Template Management implementation from Phase 6C Steps 1-3. The goal was not to add new clinical template features, but to verify production readiness and correct genuine integrity risks before later clinical documentation integration work depends on published templates.

## Scope Reviewed

- Clinical template management architecture.
- Phase 6C template management migration.
- Clinical template frontend workspace at `/practice/clinical-templates`.
- Practice hub entry point.
- Permission-aware route and UI behaviour.
- Template lifecycle RPCs.
- Draft editing RPCs.
- Validation and publication flow.
- Assignment flow.
- Generated database type compatibility.

## Defects Found And Hardened

### Stable Key Duplication

The original implementation detected duplicate section, field and option keys during validation, but it did not prevent duplicates at the database constraint level. Step 4 adds partial unique indexes for active stable keys:

- `clinical_template_sections_version_key_unique_active`
- `clinical_template_fields_version_key_unique_active`
- `clinical_template_field_options_field_key_unique_active`
- `clinical_template_validation_rules_version_key_unique_active`

This protects template definitions even if future clients bypass the current UI.

### Field Type Mutation

Changing an existing field type can invalidate existing options, validation rules, note renderers and future clinical content mapping. Step 4 replaces `upsert_clinical_template_field(...)` so existing fields cannot change type through the safe editor. Users must create a new field instead.

The frontend now also disables the field type selector once a field already exists.

### Incompatible Option Management

The original UI allowed the option editor to point at any field. Step 4 limits option management to fields where options are valid:

- `single_choice`
- `multiple_choice`
- `checklist`
- `scale`
- `laterality`
- `body_area`

The database RPC `upsert_clinical_template_field_option(...)` now enforces the same rule.

### Validation Rule Compatibility

Step 4 replaces `upsert_clinical_template_validation_rule(...)` to reject validation rules that are incompatible with their target field type. Examples:

- Numeric ranges must target numeric, measurement or scale fields.
- Character limits must target text fields.
- Allowed options must target choice-style fields.
- Allowed units must target numeric or measurement fields.
- Date restrictions must target date or datetime fields.

### Publication Validation Coverage

Step 4 extends `run_clinical_template_validation(...)` to block publication when:

- Choice-style fields have no options.
- Options are attached to non-choice fields.
- Unsupported safe-editor field types are present.
- Validation rules are incompatible with target field types.

This keeps published versions safer for later clinical documentation rendering.

### Assignment Tenant Safety

Step 4 replaces `upsert_clinical_template_assignment(...)` to verify that optional practice location and therapist profile references belong to the same tenant as the published template version.

It also prevents duplicate default assignments for the same scope, context and priority.

## Permission Review

The implementation continues to use the existing authorization foundation:

- View: `tenant.clinical.view`, `tenant.clinical.manage`, or `tenant.practice.configure`.
- Edit: `tenant.clinical.manage` or `tenant.practice.configure`.
- Admin/assignment actions: admin role plus `tenant.practice.configure`, aligned with the existing safe configuration approach.

RLS remains the database security boundary. The frontend does not use service-role access.

## Multi-Tenant Review

The new hardening migration preserves tenant isolation:

- All replaced RPCs resolve the template version first.
- Tenant permission checks are performed through the existing clinical template permission helper.
- Cross-tenant assignment references are rejected.
- No Super Admin bypass was added.

## Deferred Functionality

The following areas remain intentionally deferred and were not implemented in Step 4:

- AI-generated template suggestions.
- Live collaboration or realtime editing.
- Advanced calculated-field authoring.
- Patient Link template rendering.
- Cross-tenant template sharing.
- Profession-specific template modules.
- Template marketplace or system library publishing workflow.

## Files Changed

- `supabase/migrations/202607170002_phase6c_clinical_template_management_hardening.sql`
- `src/pages/ClinicalTemplates.tsx`
- `docs/phase6c-step4-clinical-template-management-validation.md`

## Validation Checklist

- New database changes are forward-only.
- Previous migrations were not edited.
- Unsupported and incompatible template states fail safely.
- Stable keys are protected with active partial unique indexes.
- Field type changes are blocked after creation.
- Option management is limited to compatible fields.
- Tenant-scoped assignment references are validated.
- Frontend remains aligned with existing AlliDesk UI patterns.
- No Patient Link, AI, realtime, or clinical documentation runtime functionality was added.

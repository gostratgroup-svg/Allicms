# Phase 6D Step 4: Assessments and Outcome Measures Validation

## Objective

Phase 6D Step 4 reviewed and hardened the completed Assessments and Outcome Measures implementation without adding new product scope.

The review covered:

- Phase 6D architecture and implementation documentation
- `202607170003_phase6d_assessments_outcome_measures.sql`
- Clinical assessment RPCs and lifecycle transitions
- Clinician-facing assessment workspace
- Clinical patient workspace integration
- Existing RLS, permission, audit, workflow-event and frontend patterns

## Production Issues Found And Corrected

### Assessment availability required a database boundary

The original draft-creation RPC validated tenant, patient, related clinical records and active definition version status, but the availability checks were not strong enough at the database boundary.

Hardening added:

- `assessment_definition_version_is_available_for_tenant(...)`
- active definition and version validation
- effective date validation
- retired definition/version rejection
- tenant assignment availability validation when assignments exist
- licensed-definition state validation through `licence_metadata.license_status`

Draft assessment creation now rejects unavailable definitions even if a stale or manipulated browser payload submits a version id.

### Assessment response validation was too broad

The original response validator checked basic JSON types but did not validate:

- selected option keys against the item options
- missing option sets for choice-based fields
- numeric bounds for scored or measured items

Hardening replaced `assessment_response_value_is_valid(...)` with stricter validation for:

- single-choice, laterality and body-area option membership
- multiple-choice and checklist option membership
- numeric minimum and maximum bounds from `score_min`, `score_max` or validation config
- invalid numeric casts

### Finalisation needed to rerun readiness validation

Completion already validated required responses, but finalisation did not rerun readiness checks. A stale completed assessment could therefore be finalised after definition or response validity changed.

Hardening updates `finalise_clinical_assessment(...)` so it reruns `validate_clinical_assessment_ready_for_completion(...)` before finalising.

### Readiness validation needed invalid-response detection

The readiness check now detects saved responses that no longer validate against the current item definition before allowing completion or finalisation.

### Frontend availability and unsaved-state edge cases

The clinician assessment selector was tightened to:

- hide retired versions
- use date-only effective date checks
- hide expired or inactive assignments
- account for licensed definitions with unavailable license state

The unsaved-change indicator now correctly accounts for multiple-choice and checklist response values.

## Files Changed

- `supabase/migrations/202607170004_phase6d_assessment_hardening.sql`
- `src/components/clinical-assessments/ClinicalAssessmentWorkspace.tsx`
- `docs/phase6d-step4-assessments-outcome-measures-validation.md`

## Migration Added

`202607170004_phase6d_assessment_hardening.sql`

The migration is forward-only and uses `create or replace function` to harden existing Phase 6D RPC boundaries without rewriting previous migrations.

## Database Objects Updated

Functions added or replaced:

- `assessment_definition_version_is_available_for_tenant(uuid, uuid)`
- `assessment_response_value_is_valid(assessment_definition_items, jsonb)`
- `create_clinical_assessment_draft(...)`
- `validate_clinical_assessment_ready_for_completion(uuid)`
- `finalise_clinical_assessment(uuid)`

No new tables were added.

No existing RLS policies were weakened.

No generated TypeScript type changes were required because public RPC signatures used by the frontend were preserved.

## Security Review

The hardening preserves:

- tenant isolation through existing permission helper checks
- authenticated-only lifecycle RPC execution
- SECURITY DEFINER functions with explicit `search_path = public`
- no Super Admin default access to tenant clinical records
- non-destructive assessment lifecycle behaviour
- Patient Link publication boundaries

The internal availability helper is not granted to authenticated users directly.

## Validation Results

`npm run build` passed.

The existing Vite large-chunk warning remains:

- `dist/assets/index-*.js` is larger than 500 kB after minification.

This warning is existing technical debt and was not introduced by this step.

`git diff --check` passed.

## Items Requiring Live Supabase Validation

These items require execution against a real Supabase project or local Supabase database:

- Forward-only migration execution
- Function replacement ordering
- RLS behaviour for all assessment reads and RPC calls
- SECURITY DEFINER ownership and grants
- Option-membership validation with seeded assessment definitions
- Completion and finalisation behaviour with real required-item definitions
- Assignment availability behaviour where a tenant has configured scoped assignments

## Deferred By Design

The following remain intentionally out of scope for Step 4:

- Admin definition editor
- Patient Link assessment forms
- External integrations
- Automated scoring runtime
- AI-assisted interpretation
- Advanced reports or dashboards
- Real-time collaboration
- Discipline-specific proprietary assessment content

## Step 4 Status

Phase 6D Step 4 is complete from a code and build perspective.

The implementation is ready for live Supabase migration validation before proceeding to broader clinical assessment workflows.

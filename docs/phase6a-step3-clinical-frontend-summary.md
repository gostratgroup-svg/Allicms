# Phase 6A Step 3 Clinical Frontend Summary

## Objective

Phase 6A Step 3 implemented the first frontend foundation for the AlliDesk Clinical Engine. The work adds a patient-centred clinical workspace that uses the Phase 6A database foundation, existing Supabase client conventions, existing route guards, and the established AlliDesk UI system.

No database schema changes, migrations, generated type changes, or application-shell redesigns were introduced in this step.

## Files Changed

- `src/pages/Clinical.tsx`
- `src/pages/Patients.tsx`
- `src/routes/appRoutes.tsx`
- `src/styles.css`
- `docs/phase6a-step3-clinical-frontend-summary.md`

## Route Added

- `/patients/clinical`

The route is intentionally hidden from top-level navigation. Clinical records are accessed from the selected patient workspace, which keeps the Clinical Engine connected to patient context rather than creating a broad global clinical navigation surface.

## Components and Page Structure

`ClinicalPage` provides a patient clinical workspace with sections for:

- Overview
- Encounters
- Notes
- Treatment Plans and Goals
- Assessments and Outcomes
- Diagnoses
- Attachments
- Patient Link Publications

The page reuses existing AlliDesk primitives:

- `Card`
- `Button`
- `SearchBar`
- `StatusBadge`
- `LoadingState`
- `EmptyState`
- `ErrorState`
- Existing patient/workspace list, form, tab, and panel styling

## Data Operations Implemented

The page performs tenant-scoped reference reads for:

- `patients`
- `therapist_profiles`
- `clinical_note_templates`
- `clinical_note_template_versions`
- `outcome_measure_definitions`

The page performs selected-patient-scoped clinical reads for:

- `bookings`
- `sessions`
- `clinical_encounters`
- `clinical_notes`
- `clinical_note_versions`
- `clinical_note_amendments`
- `treatment_plans`
- `clinical_goals`
- `clinical_goal_reviews`
- `clinical_assessments`
- `outcome_measure_results`
- `clinical_diagnoses`
- `clinical_attachments`
- `clinical_record_restrictions`
- `clinical_patient_link_publications`

The page supports foundational create/update actions for:

- Clinical encounters
- Draft clinical notes
- Draft clinical note versions
- Treatment plans
- Clinical goals
- Goal reviews
- Clinical assessments
- Outcome results
- Clinical diagnoses
- Clinical attachment metadata

Attachment handling is metadata-only. No storage upload/download functionality was added.

## Clinical Note Lifecycle

The Clinical workspace supports the approved non-destructive note lifecycle:

- Create draft note
- Edit draft note version only
- Finalise draft note version through RPC
- Sign finalised note version through RPC
- Amend immutable notes through RPC
- Show amendment history

Finalised, signed, amended, and locked notes are treated as immutable in the UI. The UI does not provide direct editing for immutable note content.

## RPCs Used

The frontend uses the protected Clinical Engine RPCs created in Phase 6A Step 2:

- `finalise_clinical_note_version`
- `sign_clinical_note_version`
- `amend_clinical_note`
- `publish_clinical_record_to_patient_link`
- `revoke_clinical_patient_link_publication`

The frontend does not bypass lifecycle RPCs for protected transitions.

## Permission Handling

Clinical access uses the existing authorization foundation:

- View access: `tenant.clinical.view`
- Edit/manage access: `tenant.clinical.manage`

Super Admin users are explicitly excluded from tenant clinical access in the page-level checks, preserving the AlliDesk rule that Super Admin manages the platform and not tenant clinical content.

RLS remains the source of truth. The UI hides or disables actions where possible, but failed RLS/RPC responses are handled safely and shown as user-facing errors.

## Patient Context

The Patients page now shows a `Clinical Workspace` shortcut for selected patients when the user has clinical view permission. The shortcut passes the selected patient through the route query string:

`/patients/clinical?patient={patient_id}`

The Clinical workspace also allows switching between patients from its own patient list.

## Patient Link Publication Boundaries

The Patient Link Publications section manages only explicit publication metadata. It does not expose internal clinical content directly and does not implement Patient Link page rendering.

Records can only be selected for publication when they are patient-visible eligible according to the frontend’s safe filters. RLS and RPC checks remain authoritative.

## Validation and UI States

Implemented:

- Loading state
- Empty states
- Error state
- Permission-aware read-only state
- Duplicate submission protection through a shared saving state
- JSON validation for structured clinical content
- Required-field validation for key clinical actions
- Safe error messaging for RLS/RPC failures

## Deferred Functionality

The following remain intentionally deferred:

- Clinical file uploads and downloads
- Advanced note template authoring UI
- Advanced outcome charts
- Session-level embedded clinical workflow
- Booking/session automatic encounter creation
- Clinical task automation
- Patient Link rendering of clinical publications
- AI-assisted clinical documentation
- Duplicate/merge clinical workflows
- Full clinical reporting and analytics

## Validation Results

- `npm run build` passed.
- `git diff --check` passed.
- Existing Vite large-chunk warning remains and is unrelated to this step.

## Next Recommended Step

Phase 6A Step 4 should harden the clinical workflow integration, especially:

- Patient/session entry paths
- Encounter-to-session relationships
- Template selection depth
- Safer clinical edit flows
- Live Supabase/RLS validation of RPC lifecycle paths

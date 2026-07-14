# Phase 5A Step 5: Patient Engine Validation And Completion

## Summary

Phase 5A Step 5 reviewed and hardened the Patient Engine implementation after the Step 4 patient workspace work.

The review covered:

- Database migration
- Generated database types
- Patients page and workspace
- Patient CRUD
- Responsible parties
- Addresses
- Emergency contacts
- Medical information
- Alerts
- Consents
- Patient lifecycle status
- Archive behavior
- Patient history events
- Permission-aware editing
- Tenant-scoped Supabase access

Phase 5A is ready to be marked complete, with the limitations noted below.

## Workflows Reviewed

### Patient Creation

Reviewed the create flow for prospective and registered patients.

Confirmed:

- First name and last name are required.
- Invalid email addresses are rejected.
- Invalid phone formats are rejected.
- Future dates of birth are rejected.
- New records include the active tenant id.
- Created records store `created_by_profile_id` and `updated_by_profile_id` where available.
- A `patient_created` history event is created after a successful insert.

### Patient Editing

Reviewed demographic, contact, status, and ICD-10 editing.

Confirmed:

- Updates are tenant-scoped by `tenant_id`.
- Status changes create a `patient_status_changed` history event.
- General patient edits create a `patient_updated` history event.
- A no-op patient save now returns `No patient changes to save.` and does not create noisy history.
- Users without `tenant.patients.manage` see patient details in read-only mode.

### Related Records

Reviewed create and update flows for:

- Responsible party
- Patient address
- Emergency contact
- Medical information
- Patient alert
- Patient consent

Confirmed:

- Related records are inserted with the active tenant id.
- Related records reference the selected patient id.
- Empty states are displayed for patient lists, alerts, consents, and history.
- Save errors are surfaced in the existing message pattern.
- Switching patients resets selected alert and consent records to avoid stale child-record editing.

### Archive Workflow

Reviewed archive behavior for patients, alerts, and consents.

Confirmed:

- Patient archive requires browser confirmation.
- Patient archive updates lifecycle fields instead of hard deleting:
  - `patient_status = archived`
  - `archived_at`
  - `archive_reason`
- Alert archive sets `is_active = false` and `deleted_at`.
- Consent archive sets `consent_status = revoked`, `revoked_at`, and `deleted_at`.
- No hard-delete UI was introduced.
- Archive actions create meaningful patient history events.
- Archived patients remain historically available and visually distinguishable by status.

### Patient History

Reviewed the internal patient history timeline.

Confirmed:

- History is read-only in the UI.
- History loads in reverse chronological order by `occurred_at`.
- New history entries are prepended to local state after successful creation.
- History records are tenant-scoped.
- Event descriptions are human-readable.
- No-op patient saves no longer generate duplicate low-value history.

## Security Checks Performed

### Frontend Security

Confirmed:

- The frontend uses the public Supabase client only.
- No service-role access is used.
- Queries are scoped through `activeTenant.id`.
- Inserts and updates include the active tenant id.
- Permission helpers are used before exposing edit actions.
- No hard-delete UI was added.

### RLS And Permission Alignment

Reviewed `supabase/migrations/202607080004_phase5a_patient_engine.sql`.

Confirmed:

- RLS is enabled on all Patient Engine tables.
- Select, insert, and update policies are tenant-scoped.
- Super Admin does not receive default patient-data access through these policies.
- Medical information, alerts, and consents remain restricted to care roles in RLS.

Frontend hardening completed:

- Finance users can access patient finance/contact context without triggering failed RLS reads for restricted medical, alert, or consent rows.
- Restricted tables are loaded only for care roles that RLS allows to read them.

## Database Issues Found And Resolved

No new database migration was required.

The database migration itself was not rewritten.

### Findings

- The migration uses safe tenant-scoped foreign keys and RLS policies.
- `on delete cascade` is used for dependent patient-owned rows. Since the frontend exposes no hard delete, operational deletion remains soft/archive driven.
- Check constraints define controlled values for alert type, alert severity, consent type, consent status, and consent source.

### Frontend Schema Alignment Fixes

The frontend had option values that did not match database constraints.

Resolved:

- Alert type options now match `patient_alerts_type_check`.
- Alert severity options now include `info`.
- Consent type now uses controlled dropdown values matching `patient_consents_type_check`.
- Consent source now uses controlled dropdown values matching `patient_consents_source_check`.
- Default consent source changed from invalid `manual` to valid `internal`.
- Default consent type changed from invalid `general_consent` to valid `popia`.

## Frontend Issues Found And Resolved

### Restricted RLS Reads

Issue:

- The Patients page loaded medical information, alerts, and consents for all users who could open the Patients route.
- Finance users can view Patients but cannot read those restricted tables under RLS.
- This could make the entire Patients page fail for finance users.

Resolution:

- Added `canReadCareDetails`.
- Restricted medical, alert, and consent queries now only run for admin, receptionist, and therapist roles.
- Finance users receive empty restricted-data arrays instead of RLS errors.

### Noisy Patient History

Issue:

- Saving an unchanged patient could create a low-value `patient_updated` history event.

Resolution:

- Added no-op patient change detection before update.
- No-op saves no longer write patient history.

### Controlled Database Values

Issue:

- Alert and consent form defaults/options could violate database check constraints.

Resolution:

- Replaced invalid/free values with schema-safe dropdowns and defaults.

## Permission Checks

Current permission behavior:

- Patient create/update/archive requires `tenant.patients.manage`.
- Responsible party and address editing allow `tenant.patients.manage` or `tenant.finance.manage`.
- Medical information editing requires `tenant.clinical.manage`.
- Alert editing requires `tenant.clinical.manage`.
- Consent editing requires `tenant.patients.manage`.
- History is read-only.
- Restricted medical/alert/consent reads are skipped for finance-only users.

RLS remains the final security boundary.

## Validation Checks

Validated locally:

- TypeScript compilation
- Vite production build
- Schema-aligned frontend option values
- No-op patient save behavior by code review
- RLS-aware restricted data loading by code review
- No hard-delete UI introduced
- Existing Practice, Finance, Settings, and application-shell files were not modified in this step

Command run:

```bash
npm run build
```

Result:

- Build passed.
- Vite large chunk warning remains.

There are no configured `lint` or `test` scripts in `package.json`, so no additional automated lint/test command could be run.

## Remaining Known Limitations

- Full manual browser workflow testing against live Supabase data was not performed in this environment.
- No automated test framework is configured yet.
- Responsible party, address, emergency contact, medical information, alerts, and consents currently support a focused single/edit selection workflow rather than full advanced multi-record management.
- Patient history is operational history, not the immutable audit log.
- Consent signature capture is not implemented yet.
- Patient Link access is not implemented yet.
- Duplicate patient detection and merge are not implemented yet.

## Deferred Integrations

Deferred to later Phase 5 subsystems:

- Booking integration
- Session workflows
- Clinical notes
- Invoice generation
- Payment workflows
- Patient Link authentication
- Patient communications
- Duplicate patient merging
- AI features
- Workflow automation

## Final Readiness Assessment

Phase 5A Patient Engine is ready to be marked complete.

The Patient Engine now has:

- Production database foundation
- Tenant-scoped RLS model
- Generated TypeScript types
- Patient management frontend
- Structured patient workspace
- Related record management
- Lifecycle/archive behavior
- Permission-aware editing
- Internal patient history events
- Documented validation and known limitations

The next recommended milestone is the Booking Engine, where patient selection and partial patient creation can begin connecting operational workflows to the Patient Engine.


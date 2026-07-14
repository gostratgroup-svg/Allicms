# Phase 5A - Step 2: Patient Engine Database Summary

## Objective

Implement the Patient Engine database foundation for AlliDesk while preserving the existing multi-tenant architecture, RLS conventions, naming conventions, and operational boundaries.

This step is database-only. No frontend routes, React components, or UI were added.

## Migration File

`supabase/migrations/202607080004_phase5a_patient_engine.sql`

## Tables Created

### `patients`

Core tenant-owned patient record.

Supports:

- prospective-to-registered lifecycle
- active/inactive/archive states
- patient demographics
- active ICD-10 code
- assigned therapist relationship
- intake timestamps
- archive and merge metadata
- created/updated actor fields
- soft delete

### `responsible_parties`

Billing/account-responsible party linked to a patient.

Supports:

- parent/guardian/adult patient/employer/school/third-party payer
- primary responsible party
- billing contact flag
- medical aid member/dependant details
- created/updated actor fields
- soft delete

### `patient_addresses`

Structured addresses for patients and responsible parties.

Supports:

- residential
- billing
- postal
- other
- primary address per owner/type
- soft delete

### `patient_emergency_contacts`

Emergency contact records linked to a patient.

Supports:

- primary emergency contact
- relationship
- contact notes
- soft delete

### `patient_medical_information`

Medical and medical-aid summary information linked to a patient.

Supports:

- medical aid state
- medical aid number and dependant code
- main member details
- referral details
- medical conditions
- current medication
- medical notes
- one active medical information row per patient

### `patient_consents`

Patient consent records.

Supports:

- POPIA
- treatment
- assessment
- communication
- financial responsibility
- other consent types
- consent versioning fields
- signature reference
- accepted/revoked timestamps
- source tracking

### `patient_alerts`

Structured patient alerts and allergies.

Supports:

- allergy
- medical
- risk
- consent
- intake
- finance
- admin
- clinical
- severity
- active/resolved state
- internal vs patient-visible flag

### `patient_history_events`

Human-readable patient timeline events.

Supports:

- internal patient history
- patient-facing visibility flags
- source entity references
- occurred timestamp
- future workflow-generated events

This table is separate from `audit_events`.

### `patient_links`

Permanent Patient Link foundation.

Supports:

- unique link token
- active/revoked/expired/archived state
- intake requirement
- intake timestamps
- last accessed timestamp
- expiry/revocation timestamps

This table prepares the foundation only; Patient Link runtime access is not implemented in this step.

## Relationships

- `patients.tenant_id` -> `tenants.id`
- `patients.assigned_therapist_profile_id` -> `therapist_profiles.id`
- `patients.merged_into_patient_id` -> `patients.id`
- `responsible_parties.patient_id` -> `patients.id`
- `patient_addresses.patient_id` -> `patients.id`
- `patient_addresses.responsible_party_id` -> `responsible_parties.id`
- `patient_emergency_contacts.patient_id` -> `patients.id`
- `patient_medical_information.patient_id` -> `patients.id`
- `patient_consents.patient_id` -> `patients.id`
- `patient_consents.responsible_party_id` -> `responsible_parties.id`
- `patient_alerts.patient_id` -> `patients.id`
- `patient_history_events.patient_id` -> `patients.id`
- `patient_links.patient_id` -> `patients.id`
- created/updated/resolved actor fields reference `profiles.id`

## Constraints

### Lifecycle And Status

`patients.patient_status` supports:

- `prospective`
- `intake_sent`
- `intake_in_progress`
- `pending_review`
- `registered`
- `active`
- `inactive`
- `archived`
- `merged`

`patients.patient_type` supports:

- `adult`
- `teen`
- `child`
- `other`
- `unspecified`

Archived patients must have `archived_at`.

Merged patients cannot merge into themselves.

### Responsible Party

`responsible_parties.party_type` supports:

- `person`
- `organisation`
- `employer`
- `school`
- `medical_aid_member`
- `third_party`

One primary responsible party per patient is enforced by a partial unique index.

### Addresses

Address owner must be either:

- `patient`
- `responsible_party`

The owner relationship must match the owner type.

One primary address per owner/type is enforced by a partial unique index.

### Medical Information

One active medical information row per patient is enforced by a partial unique index.

### Consents

Consent types:

- `popia`
- `treatment`
- `assessment`
- `communication`
- `financial_responsibility`
- `other`

Consent statuses:

- `pending`
- `accepted`
- `declined`
- `revoked`
- `expired`

Accepted consents must have `accepted_at`.

### Alerts

Alert types:

- `allergy`
- `medical`
- `risk`
- `consent`
- `intake`
- `finance`
- `admin`
- `clinical`
- `other`

Severity:

- `info`
- `low`
- `medium`
- `high`
- `critical`

### Patient Links

Link statuses:

- `active`
- `revoked`
- `expired`
- `archived`

Link token must not be blank.

Only one active non-deleted Patient Link per patient is allowed.

## Indexes

Indexes were added for:

- tenant ownership
- patient status
- patient number
- patient name search
- ID number lookup
- assigned therapist
- responsible party lookup
- responsible party email
- patient/responsible party addresses
- emergency contacts
- medical information
- consent type/status
- active alerts
- patient history timeline ordering
- patient-facing history filtering
- source entity references
- patient links
- link tokens
- soft delete lookups

## RLS Policies

RLS is enabled on all Patient Engine tables.

### Tenant Isolation

All policies require either:

- active tenant membership through `public.is_tenant_member(tenant_id)`, or
- tenant role checks through `public.has_tenant_role(...)`

No Super Admin default patient access policy was added.

### Read Access

General patient records, responsible parties, addresses, emergency contacts, history events, and selected patient records are readable by tenant members or relevant tenant roles.

More sensitive tables use role-restricted access:

- `patient_medical_information`: admin, receptionist, therapist read; admin/therapist write
- `patient_consents`: admin, receptionist, therapist
- `patient_alerts`: admin, receptionist, therapist
- `patient_links`: admin, receptionist, therapist

### Write Access

Writes are restricted by current role-based RLS helpers:

- care roles: admin, receptionist, therapist
- finance-inclusive records: admin, receptionist, therapist, finance
- clinical/medical records: admin, therapist
- history events: tenant members can append; admins can update

### Delete Access

No hard delete policies were added.

Soft delete/archive must be handled through updates to `deleted_at`, `patient_status`, or archive fields.

## Audit Compatibility

The schema includes:

- `created_by_profile_id`
- `updated_by_profile_id`
- `resolved_by_profile_id` where relevant

The existing `audit_events` table remains the audit sink. No generic audit trigger pattern exists yet, so Patient Engine audit events should be appended by the application/service layer in future workflow implementation.

Important actions to audit later:

- patient creation/update
- status transitions
- consent capture
- responsible party changes
- ICD-10 changes
- alert changes
- archive/merge actions
- Patient Link access/rotation

## Architectural Notes

- Patient data is tenant-owned operational data.
- Super Admin has no default patient table access.
- Patient History is not the audit log.
- Patient Link runtime access is not implemented yet.
- Booking, session, finance, clinical, document, and workflow engines are not implemented in this migration.
- Confirmed finance documents must later snapshot patient/responsible-party data.
- Clinical notes must remain versioned in the future Clinical Engine.

## Types

Local TypeScript database types were updated manually in:

`src/lib/database.types.ts`

Added table types:

- `patients`
- `responsible_parties`
- `patient_addresses`
- `patient_emergency_contacts`
- `patient_medical_information`
- `patient_consents`
- `patient_alerts`
- `patient_history_events`
- `patient_links`

Added relationship helpers:

- `PatientRelationship`
- `ResponsiblePartyRelationship`
- `CreatedByProfileRelationship`
- `UpdatedByProfileRelationship`

## Validation

### Migration Execution

Attempted command:

`npx supabase db reset`

Result:

Could not run local migrations because Docker is not running:

`Cannot connect to the Docker daemon at unix:///var/run/docker.sock`

Supabase CLI requires Docker for local database reset.

### Type Generation

Attempted command:

`npx supabase gen types typescript --local`

Result:

Could not regenerate types through Supabase CLI because this repo does not contain:

`supabase/config.toml`

The project currently follows a manual local type-update convention, so `src/lib/database.types.ts` was updated directly.

### Build

`npm run build` passes after the migration and type updates.

## Assumptions

- Current RLS helper functions are role-based rather than granular permission-based.
- App-level permission names will continue to map to tenant roles until database-backed permission grants are introduced.
- Patient Link will receive a dedicated safe access design before anonymous/token access is implemented.
- Hard delete remains unavailable through ordinary application flows.
- Patient medical information is kept in one active row initially to avoid premature complexity.

## Next Step

Phase 5A Step 3 should review the Patient Engine migration and, once Docker/Supabase config is available, run the migrations against a local or development Supabase database before building frontend patient screens.

# Phase 5A Step 3: Patient Frontend Foundation

## Summary

Phase 5A Step 3 implements the first live-data Patient Management frontend foundation for AlliDesk.

The Patients area now reads and writes tenant-scoped Patient Engine records through the existing Supabase client, AuthContext, active tenant context, and permission framework. It does not introduce mock data and does not connect bookings, sessions, invoices, clinical notes, or Patient Link workflows yet.

## Pages And Components Created

### Updated Page

- `src/pages/Patients.tsx`

The previous placeholder Patients page was replaced with a Patient Engine foundation page containing:

- Patient database list
- Search and status filtering
- Patient status badges
- Create patient flow
- Edit patient flow
- Archive patient action
- Patient detail form
- Responsible party form
- Residential address form
- Emergency contact form
- Medical information form
- Foundation status summary for alerts, consents, and deferred Patient Link integration

### Updated Styling

- `src/styles.css`

Added patient-specific layout helpers that reuse existing Practice/Foundation screen patterns:

- `patients-engine-page`
- `patients-engine-layout`
- `patients-filter-row`
- `patients-form-grid`
- `patients-action-row`
- `patients-foundation-card`
- `patients-foundation-grid`

## Data Operations Implemented

The page uses the existing Supabase client and active tenant context.

### Read

Loads non-deleted records for the active tenant from:

- `patients`
- `responsible_parties`
- `patient_addresses`
- `patient_emergency_contacts`
- `patient_medical_information`
- `patient_alerts`
- `patient_consents`

### Create / Update

Supports create and update for:

- `patients`
- `responsible_parties`
- `patient_addresses`
- `patient_emergency_contacts`
- `patient_medical_information`

### Archive

Patient archive is implemented as a soft lifecycle action by updating:

- `patient_status = archived`
- `archived_at`
- `archive_reason`
- `updated_by_profile_id`

No hard delete is exposed.

## Patient Fields Supported

The Patient form currently supports:

- Patient number
- Status
- Patient type
- Title
- First name
- Last name
- Preferred name
- Date of birth
- ID number
- Cell number
- Email
- Active ICD-10 code
- Gender
- Language
- Referral source

## Related Fields Supported

### Responsible Party

- Full name
- Relationship
- Party type
- ID number
- Phone
- Email
- Account status
- Medical aid member number
- Dependent code
- Billing contact flag

### Address

- Street address
- Address line 2
- Suburb / area
- City
- Province
- Postal code

### Emergency Contact

- Emergency contact name
- Cell
- Relation
- Email
- Notes

### Medical Information

- Has medical aid
- Medical aid name
- Medical aid number
- Dependent code
- Main member
- Main member ID
- Referring professional
- Medical notes

## Permission Handling

The page uses the existing authorization foundation.

- Patient create/update/archive requires `tenant.patients.manage`.
- Responsible party and address editing allows `tenant.patients.manage` or `tenant.finance.manage`.
- Medical information editing requires `tenant.clinical.manage`.
- Users without edit permissions can still view the page if route access allows patient viewing.

These permissions align with the current Patient Engine RLS design and preserve tenant isolation.

## Limitations And Deferred Items

Deferred to future Patient Engine steps:

- Full nested multi-record editing for multiple responsible parties, addresses, emergency contacts, alerts, allergies, and consents
- Patient detail subroutes/tabs
- Patient Link workflow
- Intake form workflow
- Consent signing UI
- Patient history event UI
- Booking/session integration
- Finance/invoice integration
- Clinical notes integration
- Duplicate detection and merge workflow
- Advanced validation and reference-data dropdowns

## Validation Performed

- The implementation keeps all operational reads and writes tenant-scoped through `activeTenant.id`.
- No local mock data was introduced.
- No database schema changes were made.
- No operational modules outside Patient Management were connected.


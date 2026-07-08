# Phase 4B - Step 18: Patient Foundation Architecture

## Goal

Define the Patient Foundation architecture for AlliDesk before creating database migrations, UI, or operational workflows.

Patients are central to bookings, clinical records, finance, documents, feedback, history, and the Patient Link. The model must support partial intake, responsible-party billing, safe patient-facing access, and future automation.

## 1. Patient Model

### Tenant-Owned Patient Record

Every patient belongs to a tenant. Patient records must always include `tenant_id`, and Row Level Security must ensure that tenant users can only access patients for their own tenant.

Super Admin should not have default access to patient records.

### Prospective Patient vs Registered Patient

AlliDesk must support patients who are created before full intake is complete.

Typical examples:

- A receptionist creates a new booking with only patient name and guardian contact.
- A therapist creates a partial patient profile during a phone call.
- A patient starts intake from a shared Patient Link but has not completed all required fields yet.

Recommended lifecycle:

- `prospective`: partial record created, intake not complete
- `intake_sent`: Patient Link/intake request has been shared
- `intake_in_progress`: patient/responsible party has started intake
- `pending_review`: intake completed but practice has not reviewed it
- `active`: registered patient record ready for normal operations
- `inactive`: no longer active but retained
- `archived`: retained for history/compliance but not in normal workflows

### Patient Status And Lifecycle

Patient status should be controlled by a fixed status field rather than free text.

Recommended status values:

- `prospective`
- `intake_sent`
- `intake_in_progress`
- `pending_review`
- `active`
- `inactive`
- `archived`

The status can move forward automatically for low-risk events, but clinical or administrative review may be required before the patient becomes fully active.

### One Active ICD-10 Code Per Patient

The current product decision is that ICD-10 is patient-level, not price-list-item-level.

Each patient should support one active ICD-10 code for current billing and clinical context.

Future support may include:

- ICD-10 history
- effective dates
- multiple diagnoses
- discipline-specific ICD-10 rules

For Phase 4B, the foundation should start with one current/active ICD-10 code field on the patient or a simple linked structure that can later evolve.

### Assigned Therapist

A patient may have an assigned therapist where applicable.

This should be optional because:

- some practices use multiple therapists
- some practices assign therapists per booking/session
- solo practitioners may not need explicit assignment

The assigned therapist should link to `therapist_profiles`.

## 2. Responsible Party

The responsible party is the person or entity responsible for billing and account communication. This may differ from the patient.

Examples:

- parent
- guardian
- adult patient
- employer
- school
- medical aid main member
- third-party payer

### Billing Contact May Differ From Patient

Invoices and statements should be addressed to the responsible party while remaining linked to the patient and related bookings.

This is important for:

- child/teen patients
- employer-funded services
- school-funded services
- medical aid/member-dependent cases
- third-party contract work

### Responsible Party Information

Recommended fields:

- full name or organisation name
- relationship to patient
- email
- phone
- ID number or registration number where required
- address
- medical aid main member details where relevant
- account responsibility status

There should be one primary responsible party per patient, with future support for additional contacts.

## 3. Patient History

Patient history is the chronological activity timeline for a patient.

### Internal History

Internal history lives in the internal patient profile.

It should track important events such as:

- patient created
- intake sent
- intake started
- intake completed
- patient details updated
- ICD-10 updated
- responsible party updated
- booking created
- booking rescheduled
- booking cancelled
- session completed
- note added
- feedback shared
- invoice created
- invoice confirmed
- payment received
- statement generated
- document uploaded
- consent signed
- communication generated or sent

### Patient-Facing History

Patient-facing history appears on the Patient Link only if it is safe and explicitly marked visible.

Patient-facing examples:

- upcoming booking created
- booking rescheduled
- feedback available
- invoice available
- payment received
- statement available
- document available
- intake completed

Internal-only examples:

- clinical process note
- risk/admin flags
- internal finance note
- staff-only comments
- audit/debug events

## 4. Patient Link

### One Permanent Link Per Patient

Each patient should have one permanent Patient Link. This link becomes the central patient/customer-facing destination for:

- intake
- personal details
- upcoming sessions
- feedback
- finance
- documents
- safe history updates

The Patient Link should not change when the patient moves from prospective to active.

### Read-Only External View

Patient Link is primarily read-only from the patient/customer side.

The patient or responsible party may update intake/personal information where allowed, but they should not edit:

- bookings
- invoices
- payments
- clinical notes
- history events
- documents generated by the practice

### Low-Friction Access Model

Initial implementation should be simple and low-friction:

- unique secure token/link per patient
- no full patient portal account required
- token can open intake first when required
- after intake completion, the same link opens the Patient Link dashboard

### Future OTP/Security Upgrade

Future upgrades may include:

- OTP verification
- magic links
- expiry/rotation of access tokens
- device/session tracking
- guardian-specific access controls
- portal account creation

## 5. Intake Workflow

New bookings must be able to create a partial/prospective patient.

Workflow:

1. Internal user creates a new booking.
2. If the patient is new, the system creates a partial `patients` record.
3. The system creates or activates a `patient_links` record.
4. User can copy/share the intake message manually.
5. Patient or responsible party opens the Patient Link.
6. If intake is required, the intake form appears first.
7. Patient/responsible party completes required details, consent, POPIA acknowledgement, signature, medical aid and responsible party information.
8. Patient status moves to `pending_review` or `active`.
9. Internal user reviews the profile if required.

This supports capture once, reuse everywhere.

## 6. Patient Profile Sections

Internal patient profile should include:

- Overview
- Details
- Responsible Party
- ICD-10
- Sessions
- Finance
- Documents
- Notes/Feedback
- History
- Patient Link

### Overview

High-level patient context:

- name
- status
- patient number
- next booking
- outstanding balance
- key To Do's
- assigned therapist

### Details

Core patient demographics and contact details.

### Responsible Party

Billing/account contact and relationship information.

### ICD-10

Current active ICD-10 code and future diagnosis history.

### Sessions

Bookings and completed sessions linked to the patient.

### Finance

Invoices, payments, statements and outstanding balances linked to the patient.

### Documents

Practice-generated and uploaded documents.

### Notes/Feedback

Internal notes and patient-facing session feedback, separated by visibility.

### History

Chronological internal and patient-facing events.

### Patient Link

Link status, copy/share action, intake status, and patient-facing preview later.

## 7. Permissions

### Tenant Boundary

Patients are strictly tenant-scoped. A user must be a tenant member to access patient data.

### Internal Access

Internal access should be permission-driven.

Recommended mapping:

| Action | Permission |
| --- | --- |
| View patients | `tenant.patients.view` |
| Create patients | `tenant.patients.manage` |
| Edit patient details | `tenant.patients.manage` |
| View patient finance | `tenant.finance.view` or `tenant.patients.view` with limited summary |
| Manage patient finance | `tenant.finance.manage` |
| View patient notes | `tenant.clinical.view` |
| Manage patient notes | `tenant.clinical.manage` |
| View documents | `tenant.documents.view` |
| Manage documents | `tenant.documents.manage` |
| Manage Patient Link | `tenant.patients.manage` |

### Patient Link Access

Patient Link exposes only patient-facing data:

- safe profile details
- upcoming sessions
- visible feedback
- finance records intended for the patient/responsible party
- patient-facing documents
- patient-facing history

It must not expose:

- internal clinical notes
- internal process notes
- audit logs
- tenant operational data
- other patients
- therapist/private staff data beyond safe contact details

## 8. Proposed Data Model

### `patients`

Purpose:

Stores the core tenant-scoped patient record.

Suggested fields:

- `id uuid primary key default gen_random_uuid()`
- `tenant_id uuid not null references tenants(id)`
- `patient_number text`
- `status text not null default 'prospective'`
- `patient_type text`
- `title text`
- `first_name text not null`
- `last_name text not null`
- `preferred_name text`
- `date_of_birth date`
- `id_number text`
- `gender text`
- `email text`
- `phone text`
- `address_line_1 text`
- `address_line_2 text`
- `suburb text`
- `city text`
- `province text`
- `postal_code text`
- `country text default 'South Africa'`
- `active_icd10_code text`
- `assigned_therapist_profile_id uuid references therapist_profiles(id)`
- `intake_completed_at timestamptz`
- `reviewed_at timestamptz`
- `metadata jsonb not null default '{}'::jsonb`
- `deleted_at timestamptz`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `responsible_parties`

Purpose:

Stores billing/responsible party contact details linked to a patient.

Suggested fields:

- `id uuid primary key default gen_random_uuid()`
- `tenant_id uuid not null references tenants(id)`
- `patient_id uuid not null references patients(id)`
- `party_type text not null`
- `relationship_to_patient text`
- `full_name text not null`
- `organisation_name text`
- `id_number text`
- `email text`
- `phone text`
- `address_line_1 text`
- `address_line_2 text`
- `suburb text`
- `city text`
- `province text`
- `postal_code text`
- `country text default 'South Africa'`
- `is_primary boolean not null default false`
- `is_billing_contact boolean not null default true`
- `medical_aid_member_number text`
- `medical_aid_dependant_code text`
- `metadata jsonb not null default '{}'::jsonb`
- `deleted_at timestamptz`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `patient_history_events`

Purpose:

Stores internal and optionally patient-facing patient timeline events.

Suggested fields:

- `id uuid primary key default gen_random_uuid()`
- `tenant_id uuid not null references tenants(id)`
- `patient_id uuid not null references patients(id)`
- `event_type text not null`
- `event_title text not null`
- `event_body text`
- `source_table text`
- `source_id uuid`
- `is_patient_visible boolean not null default false`
- `occurred_at timestamptz not null default now()`
- `created_by_profile_id uuid references profiles(id)`
- `metadata jsonb not null default '{}'::jsonb`
- `deleted_at timestamptz`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `patient_links`

Purpose:

Stores permanent patient-facing access link records.

Suggested fields:

- `id uuid primary key default gen_random_uuid()`
- `tenant_id uuid not null references tenants(id)`
- `patient_id uuid not null references patients(id)`
- `link_token text not null`
- `status text not null default 'active'`
- `requires_intake boolean not null default true`
- `intake_started_at timestamptz`
- `intake_completed_at timestamptz`
- `last_accessed_at timestamptz`
- `expires_at timestamptz`
- `metadata jsonb not null default '{}'::jsonb`
- `deleted_at timestamptz`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

## 9. Future Scalability

### Patient Portal

The Patient Link can evolve into a full patient portal with account-based login, OTP, dependent management and secure communication.

### Digital Intake Forms

Patient intake should support configurable sections and required fields based on patient type.

Future entities may include:

- intake form templates
- intake responses
- intake signatures
- intake review states

### Consent Forms

Consent should be versioned and auditable.

Future entities may include:

- consent_templates
- patient_consents
- consent_signatures

### Medical Aid Details

Medical aid information can begin inside patient/responsible party metadata but should eventually become structured for claims.

Future entities may include:

- patient_medical_aid_details
- medical_aid_schemes
- medical_aid_claims

### Online Payments

Responsible parties should be able to access invoices and statements through Patient Link and pay online later.

Future integrations:

- PayFast
- Yoco
- Stripe
- EFT proof upload

### Automation

Patient history and Patient Link can trigger automated communication:

- intake reminders
- upcoming booking reminders
- invoice available
- payment due
- feedback available
- statement available

### AI Summaries

AI can later summarize:

- patient timeline
- recent sessions
- outstanding actions
- finance status
- intake gaps

AI should respect visibility rules and never expose internal notes through Patient Link.

## 10. Recommended Implementation Sequence

### Step 19: Migration

Create Supabase migration for:

- `patients`
- `responsible_parties`
- `patient_history_events`
- `patient_links`

Include RLS, indexes, status constraints, soft delete, updated_at triggers and tenant isolation.

### Step 20: Types

Update local Supabase database types for the new Patient Foundation tables.

### Step 21: Patient List And Detail Shell

Create route and UI foundation for:

- patient list
- patient detail shell
- patient overview
- patient details tab

### Step 22: Responsible Party

Create responsible party management inside patient profile.

### Step 23: History

Create internal patient history display and event creation helper.

### Step 24: Patient Link Foundation

Create patient link foundation and intake-first behaviour.

### Step 25: Booking Integration Later

Once booking foundation exists:

- new booking can create prospective patient
- booking links to patient
- patient link/intake can be shared
- patient history records booking events

## Final Note

Patient Foundation must protect privacy from the start. Internal patient data belongs to the tenant workspace. Patient Link should expose only safe, patient-facing information and should never become a backdoor into internal clinical or operational data.

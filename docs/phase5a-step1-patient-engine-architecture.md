# Phase 5A - Step 1: Patient Engine Architecture

## Purpose

The Patient Engine is the first operational subsystem in Phase 5 of AlliDesk. It turns the Phase 4 Patient Foundation into an enterprise-grade patient operating model that can support bookings, sessions, clinical work, finance, Patient Link, automation, and future AI without needing a redesign.

This document is architecture only. It does not create code, migrations, UI, generated types, or workflow implementation.

## Architectural Position

The Patient Engine sits inside the tenant workspace and becomes the central operational identity for a patient.

```text
Tenant
|
+-- Practice Foundation
+-- Patient Engine
    |
    +-- Patient record
    +-- Responsible party
    +-- Contact details
    +-- Medical information
    +-- ICD-10
    +-- Consent
    +-- Alerts
    +-- Patient history
    +-- Patient Link
|
+-- Future engines
    +-- Bookings
    +-- Sessions
    +-- Clinical Notes
    +-- Finance
    +-- Documents
    +-- Communication
```

The Patient Engine must follow the established AlliDesk principles:

- Capture once, reuse everywhere.
- Every tenant operational table includes `tenant_id`.
- Super Admin manages platform metadata, not tenant patient data.
- Internal history is separate from audit events.
- Patient-facing history is explicitly controlled.
- Finance documents use immutable snapshots.
- Clinical notes are versioned.
- Patient Link is the external window into the practice.

## 1. Patient Lifecycle

The Patient Engine should support a clear lifecycle from first enquiry or booking through active practice management and future archive.

```text
Prospective
  ↓
Intake Sent
  ↓
Intake In Progress
  ↓
Pending Review
  ↓
Registered
  ↓
Active
  ↓
Inactive
  ↓
Archived
```

### Prospective

A prospective patient is a partial record created before the practice has complete details.

Common sources:

- new booking for a new patient
- phone enquiry
- therapist-created first contact
- receptionist-created booking
- future Patient Link self-intake

Minimum safe fields:

- patient first name
- patient last name
- patient type where known
- parent/guardian or contact details where relevant
- source context
- tenant id

A prospective patient can already have:

- booking
- Patient Link
- intake request
- responsible party placeholder
- patient history
- draft invoice later

### Intake Sent

The practice has generated or shared an intake request through Patient Link.

This state should support:

- tracking when intake was sent
- who sent it
- what communication template was used
- whether the link has been opened
- patient history event

### Intake In Progress

The patient, guardian, or responsible party has started intake but has not submitted all required information.

This state helps the practice identify incomplete profiles before a session.

### Pending Review

The intake was submitted but the practice has not reviewed or accepted it.

This is important for:

- POPIA/consent review
- medical information review
- responsible party confirmation
- ICD-10 capture
- duplicate patient checks

### Registered

The patient has sufficient information to become a formal practice record.

Required areas should include:

- demographics
- responsible party
- contact details
- emergency contact
- intake/consent completion
- medical aid details where applicable
- active ICD-10 where required for billing

### Active

An active patient is currently managed by the practice.

Active patients can participate in:

- bookings
- sessions
- clinical notes
- feedback
- finance
- documents
- Patient Link updates
- reporting

### Inactive

Inactive patients are retained but not part of normal workflow queues.

Reasons:

- therapy completed
- long-term pause
- patient moved
- practice no longer servicing patient

Inactive patients should remain searchable to authorized users.

### Archived

Archived patients are excluded from operational screens by default and retained according to legal, clinical, and privacy requirements.

Archive should not hard-delete clinical, finance, consent, or audit history.

## 2. Prospective To Registered Workflow

The Patient Engine should allow a partial record to become a complete operational patient without duplicate capture.

Recommended workflow:

1. Internal user creates a booking for a new patient.
2. System creates a prospective patient record.
3. System creates a Patient Link record.
4. System creates a responsible party placeholder when enough contact information exists.
5. User shares intake message manually in the first implementation.
6. Patient/responsible party opens Patient Link.
7. Intake form is completed.
8. Consent and POPIA acknowledgement are captured.
9. Emergency and medical information are captured.
10. Practice reviews the record.
11. Duplicate check is performed.
12. Patient becomes registered or active.

The system should not require the practice to recreate the patient after intake. The prospective record is completed, reviewed, and promoted.

## 3. Responsible Party Architecture

Responsible Party is the billing and account-responsibility layer for a patient.

The responsible party may be:

- adult patient
- parent
- guardian
- employer
- school
- organisation
- medical aid main member
- third-party payer

### Design Rules

- A patient can have multiple related parties.
- One party should be marked as primary responsible party.
- One party should be marked as billing contact.
- Invoices and statements are addressed to the responsible party but linked to the patient.
- Responsible party details should be snapshotted into confirmed invoices and statements.
- Responsible party contact details can differ from patient contact details.

### Core Information

Responsible party records should support:

- full name
- organisation name where relevant
- relationship to patient
- ID number or registration number where required
- email
- phone
- address
- medical aid main member details where relevant
- billing responsibility flags
- consent/authority metadata where relevant

## 4. Patient Demographics

Patient demographics should be structured and reusable.

Core demographic fields:

- patient number generated by the system
- patient type: adult, teen, child, other
- title
- first name
- last name
- preferred name
- date of birth
- ID/passport number
- gender
- language
- referral source
- assigned therapist where applicable
- patient status

Patient number should be system-generated and not manually entered through Patient Link.

## 5. Contact Details

Contact details should support different patient types.

Adult patient:

- patient email
- patient phone
- alternative contact
- emergency contact
- responsible party may be the patient

Child or teen patient:

- parent/guardian contact details
- responsible party
- emergency contact
- patient contact optional depending on age/context

Future extension:

- multiple contact methods
- contact preference
- communication consent per channel
- guardian-specific communication rules

## 6. Addresses

Address data should be structured for reuse in invoices, statements, Patient Link, and reporting.

Recommended address model:

- address line 1
- address line 2
- suburb/area
- city
- province
- postal code
- country

Address ownership may be:

- patient residential address
- responsible party address
- billing address
- emergency contact address later if needed

Invoices and statements should snapshot the responsible party billing address at confirmation/generation time.

## 7. Emergency Contacts

Emergency contacts should be separate from responsible party even if they sometimes refer to the same person.

Fields:

- emergency contact name
- phone
- relationship
- notes where required

Emergency contact should not be automatically assumed from parent/guardian details. It may be the same person, but that should be explicitly selected or confirmed.

## 8. Medical Information

Medical information should start focused and expand safely.

Initial areas:

- medical aid status
- medical aid name
- medical aid number
- dependant code
- main member/responsible person
- referring professional
- diagnosis/context summary where appropriate
- medical conditions
- medication
- allergies
- alerts

Medical aid information should later become structured enough for claims, statements, and reporting.

Sensitive medical information must remain tenant-scoped and should never be visible through Patient Link unless explicitly patient-facing and safe.

## 9. ICD-10 Relationship

AlliDesk has already decided that ICD-10 is patient-level, not price-list-item-level.

Initial rule:

- one active ICD-10 code per patient

Future-ready model:

- ICD-10 history
- effective dates
- previous ICD-10 values
- discipline-specific ICD-10 context
- invoice snapshot of ICD-10 at confirmation time

Invoices should combine:

- patient active ICD-10 code
- selected procedure line items
- responsible party snapshot
- therapist/practice billing snapshot

Changing a patient ICD-10 later must not silently alter confirmed invoices.

## 10. Allergies And Alerts

Allergies and alerts should be visible in the internal patient profile and future booking/session context.

Examples:

- allergy
- risk flag
- consent missing
- intake incomplete
- payment overdue
- report due
- emergency information missing
- medical aid incomplete
- clinical caution

Design principles:

- Alerts should be structured, not only free text.
- Alerts should have severity.
- Alerts should have visibility rules.
- Patient-facing alerts should be rare and explicit.
- Internal risk/admin alerts must not appear on Patient Link by default.

## 11. Consent Management

Consent is a core Patient Engine requirement.

Consent should support:

- POPIA acknowledgement
- practice terms acknowledgement
- assessment/treatment consent
- communication consent
- financial responsibility acknowledgement
- digital signature
- date/time captured
- version of consent text/template
- source: Patient Link, internal capture, imported paper form

Consent records should be version-aware. If the consent wording changes, future submissions should record the version accepted.

Consent events should create:

- patient history event
- audit event
- Patient Link status update where relevant

## 12. Patient Status Model

Recommended `patient_status` values:

- `prospective`
- `intake_sent`
- `intake_in_progress`
- `pending_review`
- `registered`
- `active`
- `inactive`
- `archived`

Status transitions should be intentional.

Examples:

- `prospective` to `intake_sent`: intake message generated/shared
- `intake_sent` to `intake_in_progress`: Patient Link intake opened or partially saved
- `intake_in_progress` to `pending_review`: intake submitted
- `pending_review` to `registered`: practice review completed
- `registered` to `active`: first booking confirmed or admin activates
- `active` to `inactive`: practice marks inactive
- `inactive` to `archived`: retention/archive process

## 13. Archive Strategy

Archive is not deletion.

Archiving should:

- remove patient from active operational lists
- preserve clinical, finance, document, consent, and audit records
- preserve Patient Link state or disable external access depending on policy
- record archive reason
- record actor and timestamp
- create patient history event
- create audit event

Hard deletion should not be available through ordinary tenant UI.

Future retention workflows may support:

- legal hold
- retention expiry review
- anonymisation after approved period
- export before archive

## 14. Duplicate Merge Strategy

Duplicate patients are likely in real practice workflows.

Merge must be controlled and auditable.

Potential duplicate signals:

- same name and date of birth
- same ID number
- same guardian/responsible party
- same phone/email
- similar patient number entry mistakes

Merge strategy:

1. Identify potential duplicates.
2. Choose surviving patient record.
3. Map related records to surviving patient.
4. Preserve source patient as merged/archived record.
5. Record merge metadata.
6. Create history events.
7. Create audit event.

Records that may need remapping:

- bookings
- sessions
- notes
- invoices
- statements
- payments
- documents
- Patient Link
- history events
- responsible parties

Merge should never silently overwrite clinical or finance data.

## 15. Relationship With Bookings

Bookings depend on patients.

Booking may:

- select an existing patient
- create a prospective patient
- link to assigned therapist
- select procedure line items
- create draft invoice
- create patient history event
- update Patient Link

Patient Engine responsibilities:

- expose patient identity and status
- expose intake completion state
- expose alerts relevant to booking
- expose responsible party/billing readiness

Booking Engine responsibilities:

- scheduling
- booking status
- calendar placement
- attendance outcomes

## 16. Relationship With Sessions

Sessions are the clinical/operational execution of bookings.

Session records should link to:

- patient
- booking
- therapist
- procedure line items
- notes
- feedback
- invoice where applicable

Patient Engine should surface:

- sessions list
- next session
- completed sessions
- feedback status
- history events

## 17. Relationship With Finance

Finance uses patient and responsible party data but must snapshot it on confirmed documents.

Patient Engine provides:

- patient identity
- responsible party
- billing address
- active ICD-10
- medical aid/dependant details
- current outstanding balance summary later

Finance Engine creates:

- draft invoice
- confirmed invoice
- PDF
- payment state
- statement
- immutable snapshots

Patient profile should show finance summaries, but the finance records remain owned by the Finance Engine.

## 18. Relationship With Clinical Notes

Clinical notes belong to the Clinical Engine but attach to the patient.

Rules:

- clinical notes are tenant-scoped
- notes are versioned
- internal notes are not Patient Link visible
- feedback notes can be published externally
- note creation/update should create patient history where appropriate
- audit events should record note creation and versioning

Patient Engine should show note/feedback context without owning note versioning logic.

## 19. Relationship With Patient Link

Patient Link is the external patient/customer view into safe patient data.

Patient Link should be permanent per patient.

It may show:

- patient-facing profile details
- intake form
- upcoming bookings
- completed sessions where visible
- published feedback
- invoices/statements intended for the responsible party
- patient-facing documents
- safe history events

It must not show:

- internal notes
- clinical process notes
- audit events
- other patients
- tenant operational data
- staff-only alerts

## 20. Multi-Tenant Ownership

Every Patient Engine table must be tenant-scoped.

Core rule:

```text
record.tenant_id must match the user's active tenant membership.
```

Super Admin should not have default patient access.

Patient Link access should not rely on tenant user membership. It should use a separate controlled access mechanism such as secure token, with carefully scoped query paths and strict visibility checks.

## 21. RLS Considerations

RLS must protect every Patient Engine table.

Recommended internal RLS:

- tenant members with patient permissions can read patients
- users with patient manage permissions can create/update patient records
- finance users can access responsible party and finance-relevant patient data where needed
- clinical users can access clinical-relevant patient data where needed
- no hard delete policies for ordinary users

Since the current database helper functions are role-based, initial RLS may map application permissions to tenant roles conservatively:

- admin
- therapist
- receptionist
- finance

Future RLS can become more granular if permissions are stored in the database.

Patient Link RLS/design requires special care:

- no broad anonymous access to tenant tables
- token-based access should expose only safe patient-facing records
- internal-only records must remain inaccessible
- Patient Link access should be auditable

## 22. Audit Requirements

Audit events are required for meaningful patient actions.

Audit should record:

- actor profile
- actor tenant user
- tenant
- action
- entity
- record id
- timestamp
- metadata

Audit actions:

- patient created
- patient updated
- patient status changed
- intake sent
- intake submitted
- consent captured
- responsible party changed
- ICD-10 changed
- allergy/alert changed
- Patient Link created/viewed/rotated
- patient archived
- duplicate merge initiated/completed
- sensitive data exported later

Audit events are not the same as patient history events.

## 23. Patient History Requirements

Patient History is the internal timeline users see in the patient profile.

History should record operational events such as:

- patient created
- patient registered
- booking created
- booking rescheduled
- session completed
- feedback added
- invoice confirmed
- payment received
- statement generated
- consent signed
- Patient Link shared

History events should support:

- internal title/body
- patient-facing title/body where relevant
- visibility flag
- source entity reference
- occurred_at

## 24. Workflow Triggers

Patient Engine should emit or receive workflow triggers.

### Patient Created

Creates:

- patient history event
- optional Patient Link
- dashboard intake task if incomplete

Future automation:

- intake message generation
- duplicate check

### Intake Sent

Creates:

- history event
- Patient Link state update

Future automation:

- reminder schedule

### Intake Completed

Creates:

- patient status update
- consent records
- responsible party updates
- history event
- review task

Future automation:

- duplicate check
- missing-field summary

### Patient Registered

Creates:

- history event
- dashboard update

Future automation:

- welcome message
- initial session readiness check

### ICD-10 Updated

Creates:

- history event
- audit event

Future automation:

- invoice readiness validation

### Responsible Party Updated

Creates:

- history event
- audit event

Future automation:

- statement recipient validation

### Patient Archived

Creates:

- status update
- history event
- audit event

Future automation:

- Patient Link disablement
- retention checklist

## 25. Future AI Opportunities

AI should assist without breaking privacy boundaries.

Opportunities:

- intake summary
- missing information detection
- duplicate patient suggestions
- patient timeline summary
- session readiness summary
- risk/admin alert suggestions
- responsible party consistency checks
- medical aid data completeness check
- finance follow-up suggestions
- clinical context preparation from visible/internal authorized data

AI must respect:

- tenant boundary
- active user permissions
- Patient Link visibility rules
- internal vs external data separation
- clinical note versioning

## 26. Future Automation Opportunities

Automation should remove repetitive admin work.

Opportunities:

- create Patient Link when prospective patient is created
- generate intake message
- remind when intake is incomplete
- notify practice when intake is submitted
- validate responsible party before invoice confirmation
- flag missing ICD-10 before billing
- update Patient Link when booking/invoice/payment changes
- create To Do's for missing consent or incomplete information
- suggest archive/inactive candidates
- generate statements for unpaid invoices

Automation must be transparent, reversible where appropriate, and logged.

## 27. Scalability Considerations

The Patient Engine must support:

- solo practitioners
- small practices
- multi-therapist practices
- multi-location practices
- multidisciplinary practices
- enterprise healthcare groups
- high patient volumes
- long patient histories
- multiple responsible parties
- future patient portal
- future medical aid claims
- future document storage
- future AI processing

Design recommendations:

- use UUID primary keys
- tenant_id on every tenant table
- indexes on tenant_id and status fields
- soft delete where records must be retained
- structured statuses
- event tables for history
- immutable finance snapshots
- versioned clinical notes
- avoid storing operational state only in metadata
- reserve metadata for extension, not core logic

## 28. Enterprise Design Principles

The Patient Engine should be designed as enterprise SaaS infrastructure, not only as a small practice database.

Principles:

- Privacy by architecture, not policy only.
- Strict tenant isolation.
- Minimal Super Admin access to tenant operational data.
- Clear separation of internal and patient-facing data.
- Controlled lifecycle states.
- Auditability for sensitive actions.
- History for human workflow visibility.
- Immutable finance outputs.
- Versioned clinical records.
- Extensible responsible party and consent models.
- Automation-ready workflow triggers.
- AI-ready but permission-aware data access.

## 29. Phased Implementation Roadmap

The Patient Engine should follow the established AlliDesk methodology:

```text
Architecture
  ↓
Database
  ↓
Types
  ↓
Frontend
  ↓
Integration
  ↓
Testing
```

### Phase 5A.1 - Architecture

Current step.

Outputs:

- Patient Engine architecture
- lifecycle rules
- relationships
- permission principles
- workflow trigger direction

### Phase 5A.2 - Database

Create migrations for the Patient Engine foundation.

Likely tables:

- `patients`
- `responsible_parties`
- `patient_emergency_contacts`
- `patient_medical_information`
- `patient_alerts`
- `patient_consents`
- `patient_history_events`
- `patient_links`

Final table selection should be reviewed before SQL.

### Phase 5A.3 - Types

Update generated/local database types after migration.

Confirm all patient tables are present and typed.

### Phase 5A.4 - Frontend

Create Patient Engine UI shell.

Initial screens:

- patient list
- patient profile overview
- patient details
- responsible party
- alerts
- history
- Patient Link status

### Phase 5A.5 - Integration

Connect Patient Engine to future operational engines:

- bookings
- sessions
- finance
- clinical notes
- documents
- Patient Link
- communication

Integration should happen only after the patient core is stable.

### Phase 5A.6 - Testing

Test:

- tenant isolation
- patient create/update
- prospective-to-registered workflow
- responsible party behaviour
- consent capture
- archive rules
- duplicate handling
- Patient Link visibility
- role/permission behaviour
- audit and history generation

## Review Gate

Database design should not begin until this Patient Engine architecture is reviewed and accepted.

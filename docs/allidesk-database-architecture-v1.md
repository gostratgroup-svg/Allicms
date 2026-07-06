# AlliDesk Database Architecture v1

Date: 2026-07-06  
Status: Architecture blueprint only. No SQL, migrations, or tables are created by this document.

This document defines the production database architecture for AlliDesk based on the current application, the current data audit, and the planned move from prototype state to a live Supabase-backed platform.

## Architecture Refinements

These rules apply to all future SQL, migrations, generated types, application queries, and backend services.

### Naming Conventions

- Use `snake_case` for all table names, column names, enum values, functions, indexes, and policies.
- Use UUID primary keys named `id` on all application tables.
- Every tenant-scoped table must include `tenant_id`.
- Every operational table should include `created_at` and `updated_at`.
- Every table that supports soft delete should include `deleted_at`.
- Foreign keys should use the singular table/entity name plus `_id`, for example `tenant_id`, `patient_id`, `booking_id`, `invoice_id`, and `therapist_id`.
- Avoid generic names like `status`, `type`, or `name` when the meaning may be unclear across domains. Prefer explicit names such as `booking_status`, `invoice_status`, `patient_type`, or `practice_name` where needed.

### User Identity Model

AlliDesk should keep identity separate from tenant membership.

- `profiles` is the global auth-linked user profile.
- `tenant_users` is the tenant membership and role table.
- One `profile` can belong to multiple tenants.
- The same person must never be duplicated as separate users per tenant.
- Tenant-specific role, active state, and permissions live on `tenant_users`, not on `profiles`.
- Professional therapist details should live in `therapist_profiles`, linked to the relevant `tenant_user`.

Recommended identity flow:

```text
auth.users
|
+-- profiles
    |
    +-- tenant_users
        |
        +-- therapist_profiles
```

### Tenant Scope Rule

- Every operational tenant table must include `tenant_id`.
- Row Level Security must always check tenant membership through `tenant_users`.
- Tenant staff can only access rows for tenants where they have active membership.
- Super Admin must not have default access to tenant clinical, patient, document, booking, or finance records.
- Platform records can reference `tenant_id` for lifecycle, support, and subscription context, but must not expose tenant operational data unless a future audited support-access workflow explicitly allows it.

### Enum And Status Strategy

Use controlled enum-style values for production statuses. Avoid uncontrolled free-text statuses in business logic.

Recommended status fields:

- `tenant_status`: `trial`, `active`, `suspended`, `cancelled`, `archived`
- `booking_status`: `booked`, `completed`, `cancelled`, `no_show`, `rescheduled`
- `invoice_status`: `confirm_invoice`, `awaiting_payment`, `payment_due`, `payment_received`, `void`
- `payment_status`: `pending`, `received`, `allocated`, `refunded`, `failed`
- `subscription_status`: `trial`, `active`, `past_due`, `cancelled`, `suspended`
- `patient_status`: `intake_pending`, `active`, `inactive`, `archived`
- `support_ticket_status`: `new`, `open`, `waiting_for_tenant`, `waiting_for_allidesk`, `in_progress`, `resolved`, `closed`
- `system_health_status`: `operational`, `performance_degraded`, `service_unavailable`, `not_configured`

Each domain should own its own status field. Do not reuse one generic `status` concept across unrelated tables without clear domain-specific naming and constraints.

### Audit Strategy

`audit_events` is a core production requirement, not an optional reporting table.

Audit events should capture:

- `id`
- `tenant_id` where applicable
- `actor_profile_id`
- `actor_tenant_user_id` where applicable
- `action`
- `entity_table`
- `entity_id`
- `occurred_at`
- `metadata`
- request/session context where useful

Log meaningful events for:

- create, update, delete, and restore actions,
- role changes,
- user activation/deactivation,
- consent submission,
- patient portal access,
- booking creation/reschedule/cancellation/no-show,
- clinical note creation and versioning,
- invoice confirmation,
- statement generation,
- payment received/allocation,
- document upload/view/download where sensitive,
- tenant lifecycle and subscription changes.

### Clinical Note Versioning

Clinical notes must not be overwritten. Production should treat clinical note edits as versioned changes.

Recommended entities:

- `patient_notes`
- `patient_note_versions`

`patient_notes` should hold the stable note identity and latest version pointer. `patient_note_versions` should hold each saved version, including content, author, timestamp, visibility, and edit reason where available.

The app should show the latest version by default while the database retains previous versions for legal, clinical, and audit reasons.

### Immutable Finance Snapshots

Invoices and statements should store immutable snapshots of important details at the time of issue.

Invoice and statement records should snapshot:

- patient details,
- account responsible person,
- medical aid details needed for billing,
- practice details,
- therapist details,
- practice number used,
- banking details used,
- selected service/procedure descriptions,
- ICD-10 code values,
- prices and totals,
- payment terms.

Future changes to patient, practice, therapist, service, or banking records must not silently change old invoices or statements.

## 1. Platform Architecture

AlliDesk is a multi-tenant allied health practice platform. The platform owner manages tenants, subscriptions, support, system health, and global configuration. Each tenant manages its own practice operations, users, patients, bookings, clinical work, finance, communication, and reporting.

```text
Platform
|
+-- Super Admin
+-- Tenant
    |
    +-- Users
    +-- Practices
    +-- Therapists
    +-- Patients
    +-- Bookings
    +-- Clinical
    +-- Finance
    +-- Communication
    +-- Documents
    +-- Reporting
```

### Platform Layer

The platform layer contains AlliDesk-owned operational records:

- Tenant lifecycle metadata
- Subscription plans and tenant subscriptions
- Support tickets
- System health and service diagnostics
- Global platform configuration
- Audit events

The platform layer must never expose tenant patient records, clinical notes, appointment details, tenant documents, or tenant financial transactions to normal Super Admin workflows.

### Tenant Layer

Each tenant is a separate practice workspace. Every operational record created by a tenant must be scoped to a `tenant_id`, unless the record is intentionally global platform configuration.

Tenant-owned data includes:

- Tenant users
- Practice configuration
- Practice partners and locations
- Therapist profiles
- Patients
- Patient contacts
- Bookings
- Clinical notes
- Invoices
- Payments
- Statements
- Patient link records
- Communication logs
- Documents
- Reports

### Multi-Tenancy Model

All tenant operational tables must include `tenant_id`.

Core rule:

```text
Users can only access records where their active tenant membership matches the record tenant_id.
```

Recommended approach:

- Use Supabase Auth for identity.
- Store application profiles in a `profiles` table.
- Store tenant membership and tenant role in `tenant_users`.
- Use Row Level Security on all tenant-scoped tables.
- Resolve the active tenant through the authenticated user's tenant membership.
- Keep Super Admin access separate from tenant access.
- Do not give Super Admin policies broad access to tenant clinical or patient tables.

The Super Admin manages platform metadata, not tenant customer or patient data. If exceptional access is ever needed, it should be implemented later through a separate audited support access workflow with tenant approval, time limits, and full event logging.

## 2. Database Domains

### Platform

Purpose: Manages AlliDesk as a SaaS platform.

Includes:

- Tenants
- Tenant lifecycle status
- Subscription plans
- Tenant subscriptions
- Platform configuration
- Support tickets
- System health
- Platform audit events

### Identity

Purpose: Connects authenticated users to AlliDesk profiles, roles, and tenant memberships.

Includes:

- Profiles
- Tenant users
- Roles
- Permissions
- Patient portal identities
- User invitations
- Password reset metadata

### Practice

Purpose: Stores tenant practice setup and configuration.

Includes:

- Practice configuration
- Practice entities
- Practice locations
- Rooms
- Banking details
- Consent templates
- Patient configuration
- Procedure price lists
- ICD-10 code setup

### Clinical

Purpose: Stores patient care data, clinical notes, session planning, feedback, consents, intake forms, reports, and clinical history.

Includes:

- Patients
- Patient contacts
- Patient medical aid
- Patient consents
- Patient notes
- Booking plans
- Booking notes
- Patient history events
- Reports
- Outcome measures

### Scheduling

Purpose: Manages bookings, calendar views, availability, blocked time, rooms, and attendance outcomes.

Includes:

- Bookings
- Booking procedures
- Blocked calendar slots
- Availability rules
- Room allocation
- Attendance status
- Reschedules and cancellations

### Finance

Purpose: Manages procedure pricing, invoice generation, payment workflows, statements, and future claims.

Includes:

- ICD-10 codes
- Procedure price lists
- Procedure prices
- Invoices
- Invoice line items
- Statements
- Statement invoice links
- Payments
- Payment proof references
- Future medical aid claims

Finance records must preserve immutable billing snapshots once an invoice or statement is issued.

### Reference Data

Purpose: Provides controlled shared and tenant-configurable lookup data used across forms, scheduling, billing, clinical notes, communication, and reporting.

Includes:

- ICD-10 codes
- Titles
- Relationship types
- Contact types
- Note types
- Appointment types
- Countries
- Currencies
- Languages
- Referral source templates

Reference data can be global, tenant-specific, or seeded globally and overridden per tenant depending on the use case.

### Communication

Purpose: Tracks communication sent to patients, guardians, tenant users, and support staff.

Includes:

- Patient link messages
- Notices
- Email logs
- SMS logs
- WhatsApp logs
- Reminder logs
- Communication templates

### Documents

Purpose: Stores document metadata and future file references without mixing storage files directly into operational tables.

Includes:

- Patient documents
- Practice documents
- Invoice PDFs
- Statement PDFs
- Proof of payment files
- Report documents
- Consent signatures

File uploads should later use Supabase Storage or another object storage provider. Database tables should store metadata and object references, not raw files.

### Reporting

Purpose: Provides practice dashboards, operational summaries, finance summaries, clinical report metadata, and exportable views.

Includes:

- Report records
- Report templates
- Dashboard metric snapshots
- Finance summaries
- Patient To Do items
- Feedback due queues

### AI

Purpose: Supports future AI-assisted workflows without placing AI logic inside clinical records directly.

Includes:

- AI assistant sessions
- AI prompts
- AI generated drafts
- AI review status
- AI usage logs
- AI safety/audit logs

AI output should be treated as draft content until accepted by an authorised tenant user.

### System

Purpose: Tracks operational state and system behaviour.

Includes:

- Audit events
- Background jobs
- Integration connections
- Webhook events
- Error logs
- Feature flags
- Data retention policies

## 3. Entity List

The following entity list is intentionally broader than the current prototype so production tables can grow without redesigning the platform foundations.

| Entity | Purpose | Primary Key | Relationships | Tenant Scoped? | Soft Delete? | Audit Required? |
| --- | --- | --- | --- | --- | --- | --- |
| `platform_configurations` | Global AlliDesk settings | `id` | None or platform admin | No | No | Yes |
| `subscription_plans` | Public and hidden plan definitions | `id` | Tenant subscriptions | No | Yes | Yes |
| `tenants` | Tenant shell and lifecycle | `id` | Tenant users, subscriptions, practice setup | No, but root of tenant scope | Yes | Yes |
| `tenant_subscriptions` | Tenant plan, trial, billing status | `id` | Tenant, subscription plan | Platform scoped by tenant | Yes | Yes |
| `tenant_billing_events` | Platform billing history for tenant subscription | `id` | Tenant subscription, tenant | Platform scoped by tenant | No | Yes |
| `support_tickets` | Tenant/platform support tickets | `id` | Tenant, assigned profile, comments | Platform scoped by tenant | Yes | Yes |
| `support_ticket_comments` | Threaded support communication | `id` | Support ticket, profile | Platform scoped by tenant | Yes | Yes |
| `system_health_events` | Service status snapshots | `id` | Service/integration | No | No | Yes |
| `audit_events` | Immutable platform and tenant event trail | `id` | Actor profile, tenant, record reference | Mixed | No | Yes |
| `profiles` | Auth-linked person profile | `id` | Tenant users, support assignments | No | Yes | Yes |
| `tenant_users` | Tenant membership and role | `id` | Tenant, profile | Yes | Yes | Yes |
| `user_invitations` | Invite and onboarding records | `id` | Tenant, profile/email | Yes | Yes | Yes |
| `therapist_profiles` | Professional therapist details | `id` | Tenant user, bookings, notes | Yes | Yes | Yes |
| `therapist_finance_profiles` | Therapist billing overrides | `id` | Therapist profile, invoices | Yes | Yes | Yes |
| `practice_configurations` | Main tenant practice setup | `id` | Tenant, banking details, templates | Yes | No | Yes |
| `practice_entities` | Main practice and partner practices | `id` | Tenant, locations, bookings, invoices | Yes | Yes | Yes |
| `practice_locations` | Venues and location records | `id` | Practice entity, rooms, bookings | Yes | Yes | Yes |
| `practice_rooms` | Room/mode options | `id` | Practice location, bookings | Yes | Yes | Yes |
| `practice_banking_details` | Banking details for practice/entity/therapist | `id` | Practice entity or therapist | Yes | Yes | Yes |
| `consent_templates` | Tenant consent text/templates | `id` | Practice configuration, patient consents | Yes | Yes | Yes |
| `patient_configuration_fields` | Tenant-configurable intake fields | `id` | Tenant, intake submissions | Yes | Yes | Yes |
| `patient_categories` | Child, Teen, Adult, custom categories | `id` | Patients | Yes | Yes | Yes |
| `referral_sources` | Tenant referral source options | `id` | Patients | Yes | Yes | Yes |
| `patients` | Core patient profile | `id` | Tenant, therapist, bookings, contacts | Yes | Yes | Yes |
| `patient_identifiers` | Patient number and external identifiers | `id` | Patient | Yes | Yes | Yes |
| `patient_contacts` | Guardians, emergency contacts, account responsible persons | `id` | Patient | Yes | Yes | Yes |
| `patient_addresses` | Structured patient/contact addresses | `id` | Patient or contact | Yes | Yes | Yes |
| `patient_medical_aid` | Medical aid details | `id` | Patient, account responsible contact | Yes | Yes | Yes |
| `patient_consents` | POPIA and therapy consent records | `id` | Patient, consent template, signature document | Yes | No | Yes |
| `patient_portal_access` | Patient link access state | `id` | Patient, tenant | Yes | Yes | Yes |
| `patient_intake_submissions` | First-access intake form submissions | `id` | Patient, portal access | Yes | No | Yes |
| `bookings` | Appointment/booking calendar record | `id` | Patient, therapist, practice, location, room | Yes | Yes | Yes |
| `booking_procedures` | Procedures selected for a booking | `id` | Booking, procedure price | Yes | Yes | Yes |
| `booking_icd10_codes` | ICD-10 diagnoses selected for booking/invoice | `id` | Booking, ICD-10 code | Yes | Yes | Yes |
| `blocked_calendar_slots` | Unavailable calendar time | `id` | Therapist, practice location, room | Yes | Yes | Yes |
| `availability_rules` | Working hours and recurring availability | `id` | Therapist, location | Yes | Yes | Yes |
| `booking_status_events` | Reschedule, cancellation, no-show history | `id` | Booking, actor | Yes | No | Yes |
| `booking_plans` | Session planning text | `id` | Booking, therapist | Yes | Yes | Yes |
| `patient_notes` | Clinical and external notes | `id` | Patient, booking, author | Yes | Yes | Yes |
| `patient_note_versions` | Immutable note version history | `id` | Patient note, author | Yes | No | Yes |
| `patient_history_events` | Patient timeline | `id` | Patient, optional source record | Yes | No | Yes |
| `reports` | Clinical/administrative reports | `id` | Patient, therapist, document | Yes | Yes | Yes |
| `report_templates` | Tenant report templates | `id` | Reports, practice configuration | Yes | Yes | Yes |
| `outcome_measures` | Configured clinical measures | `id` | Tenant, patient outcomes | Yes | Yes | Yes |
| `patient_outcome_results` | Recorded outcome measure results | `id` | Patient, booking, outcome measure | Yes | Yes | Yes |
| `icd10_codes` | Tenant diagnosis code list | `id` | Booking ICD-10 codes, invoice line items | Yes | Yes | Yes |
| `procedure_price_lists` | Named pricing lists | `id` | Practice entities, procedure prices | Yes | Yes | Yes |
| `procedure_prices` | Procedure code, description, duration, price | `id` | Price list, booking procedures, invoice line items | Yes | Yes | Yes |
| `invoices` | Invoice header and payment state | `id` | Patient, booking, practice, therapist | Yes | Yes | Yes |
| `invoice_line_items` | Invoice procedures and prices | `id` | Invoice, procedure, ICD-10 code | Yes | Yes | Yes |
| `statements` | Patient statement records | `id` | Patient, invoices | Yes | Yes | Yes |
| `statement_invoice_links` | Many-to-many statement/invoice link | `id` | Statement, invoice | Yes | Yes | Yes |
| `payments` | Payment records | `id` | Invoice or statement, patient | Yes | Yes | Yes |
| `payment_allocations` | Split payments across invoices | `id` | Payment, invoice | Yes | Yes | Yes |
| `medical_aid_claims` | Future claim submissions | `id` | Invoice, patient, medical aid | Yes | Yes | Yes |
| `titles` | Controlled title options | `id` | Patients, contacts | Mixed | Yes | Yes |
| `relationship_types` | Controlled relationship options | `id` | Patient contacts | Mixed | Yes | Yes |
| `contact_types` | Guardian, emergency, account responsible and other contact categories | `id` | Patient contacts | Mixed | Yes | Yes |
| `note_types` | Clinical and patient-visible note categories | `id` | Patient notes | Mixed | Yes | Yes |
| `appointment_types` | Booking/session type options | `id` | Bookings | Mixed | Yes | Yes |
| `countries` | Country reference data | `id` | Tenants, addresses, profiles | No | Yes | Yes |
| `currencies` | Currency reference data | `id` | Subscription plans, invoices, payments | No | Yes | Yes |
| `languages` | Language reference data | `id` | Profiles, tenants, patient portal | No | Yes | Yes |
| `referral_source_templates` | Seeded referral source options | `id` | Tenant referral sources | No | Yes | Yes |
| `documents` | File metadata and storage references | `id` | Tenant, patient, invoice, report, payment | Yes | Yes | Yes |
| `document_signatures` | Signature metadata | `id` | Document, patient consent, therapist profile | Yes | Yes | Yes |
| `communication_templates` | Message templates | `id` | Tenant, communication logs | Yes | Yes | Yes |
| `communication_logs` | Email/SMS/WhatsApp logs | `id` | Patient, tenant user, booking, invoice | Yes | No | Yes |
| `patient_notices` | Patient portal notice board items | `id` | Patient, booking, invoice, statement | Yes | Yes | Yes |
| `tasks` | User/team to-do items | `id` | Tenant, patient, booking, invoice | Yes | Yes | Yes |
| `automation_rules` | Future workflow automations | `id` | Tenant, event triggers | Yes | Yes | Yes |
| `automation_runs` | Automation execution logs | `id` | Automation rule, source record | Yes | No | Yes |
| `integration_connections` | Provider settings for WhatsApp/SMS/email/payment gateways | `id` | Tenant or platform | Mixed | Yes | Yes |
| `webhook_events` | Integration webhook receipt logs | `id` | Integration connection, source record | Mixed | No | Yes |
| `ai_assistant_sessions` | Future AI assistant conversations | `id` | Tenant, profile, patient optional | Yes | Yes | Yes |
| `ai_generated_drafts` | AI-generated draft notes/reports/messages | `id` | AI session, source record | Yes | Yes | Yes |
| `guides` | How To / operating procedures | `id` | Tenant | Yes | Yes | Yes |
| `whats_new` | Changelog/deployment notes | `id` | Platform or tenant visible roles | Mixed | Yes | Yes |

## 4. Relationships

### Core Tenant Relationship

```text
Tenant
|
+-- Tenant Users
|   |
|   +-- Profiles
|   +-- Therapist Profiles
|
+-- Practice Configuration
|   |
|   +-- Practice Entities
|       |
|       +-- Practice Locations
|           |
|           +-- Practice Rooms
|
+-- Patients
    |
    +-- Patient Contacts
    +-- Patient Medical Aid
    +-- Patient Consents
    +-- Patient Portal Access
    +-- Bookings
    +-- Notes
    +-- Invoices
    +-- Statements
    +-- Documents
    +-- History Events
```

### Clinical And Booking Relationship

```text
Patient
|
+-- Booking
    |
    +-- Therapist
    +-- Practice Entity
    +-- Practice Location
    +-- Room
    +-- Booking Procedures
    +-- Booking ICD-10 Codes
    +-- Booking Plan
    +-- Patient Notes
    +-- Booking Status Events
    +-- Invoice
```

### Finance Relationship

```text
Patient
|
+-- Invoice
|   |
|   +-- Invoice Line Items
|   +-- Payments / Payment Allocations
|   +-- PDF Document
|
+-- Statement
    |
    +-- Statement Invoice Links
    +-- Payments / Payment Allocations
    +-- PDF Document
```

### Super Admin Relationship

```text
Platform
|
+-- Tenants
|   |
|   +-- Tenant Subscriptions
|   +-- Tenant Billing Events
|   +-- Support Tickets
|
+-- Subscription Plans
+-- Platform Configuration
+-- System Health Events
+-- Platform Audit Events
```

### Many-To-Many Relationships

Use join tables where the relationship can include extra metadata or where one record can belong to multiple parent records.

- Statements to invoices: `statement_invoice_links`
- Payments to invoices: `payment_allocations`
- Bookings to procedures: `booking_procedures`
- Bookings to ICD-10 codes: `booking_icd10_codes`
- Users to tenants: `tenant_users`
- Reports to documents: either a direct FK or a linking table if reports can have multiple attachments
- Tasks to source records: preferably polymorphic source fields or separate link tables if strict relational integrity is required
- AI drafts to source records: source type and source ID, or specific links for notes/reports/messages

### Important Relationship Rules

- A tenant can have many tenant users.
- A profile can belong to more than one tenant through `tenant_users`.
- A tenant has one main practice configuration.
- A tenant can have multiple practice entities and locations.
- A therapist profile belongs to a tenant user.
- A patient belongs to one tenant.
- A booking belongs to one tenant and one patient.
- A booking should normally have one primary therapist, but future co-therapy can be added through a `booking_therapists` join table.
- An invoice can belong to one booking or be manually created for a patient.
- A statement can include many invoices.
- A payment can pay one invoice, one statement, or be allocated across multiple invoices.
- Patient notes can be linked to a booking or exist as standalone patient notes.
- Patient notes have many note versions; the latest version is shown in normal app views.
- Internal notes must not be exposed through patient portal queries.

## 5. Security Model

### Security Principles

- Tenant data is isolated by `tenant_id`.
- Super Admin operates on platform metadata, not patient or clinical data.
- Tenant users only access records for tenants where they have active membership.
- Patient portal users only access their own portal-scoped patient data.
- Clinical internal notes are never visible to patient portal users.
- Every sensitive write action should create an audit event.
- Soft-deleted records are hidden from normal app queries.

### Roles

#### Super Admin

Can access:

- Platform dashboard metrics
- Tenant list and tenant metadata
- Tenant subscription management
- Platform subscription plans
- Support tickets
- System health
- Platform configuration
- Technical diagnostics that do not expose patient data

Cannot access by default:

- Patient records
- Patient identifiers
- Clinical notes
- Appointment details
- Tenant documents
- Tenant financial transaction details
- Patient portal content

#### Tenant Admin

Can access within their tenant:

- Practice configuration
- Users and activation/deactivation
- Therapists and receptionists
- All tenant patients
- Bookings
- Clinical overview data
- Finance
- Reports
- Patient configuration
- Billing configuration
- Guides
- What's New

Can manage:

- Tenant users
- Practice setup
- Billing setup
- Patient form configuration
- Patient records
- Bookings
- Invoices and statements

Cannot access:

- Other tenants
- Platform subscription plan configuration
- Super Admin system health internals beyond tenant-facing notices

#### Reception

Can access within their tenant:

- Patient registration
- Patient contact details needed for bookings
- Bookings calendar
- Patient link sharing
- Documents that are administrative in nature
- Payment status summaries

Can create/update:

- Patients
- Patient contacts
- Bookings
- Reminders
- Intake links

Should not access:

- Internal clinical process notes unless explicitly allowed by tenant policy
- Platform admin records
- Other tenants

#### Therapist

Can access within their tenant:

- Assigned patients
- Their bookings
- Patient clinical notes for assigned/authorised patients
- Session planning
- Session feedback
- Reports and assessments
- Patient portal feedback visibility

Can create/update:

- Booking plans
- Patient notes
- Session feedback
- Clinical reports
- Outcome measures

Should not access:

- Tenant-wide finance unless role also includes finance/admin permissions
- Other tenants
- Super Admin records

#### Finance

Can access within their tenant:

- Patients required for billing identity
- Invoices
- Statements
- Payments
- Procedure pricing
- Billing queues
- Proof of payment metadata

Can create/update:

- Invoices
- Statements
- Payments
- Payment allocations
- Billing status

Should not access:

- Internal clinical notes
- Session process notes
- Clinical reports unless needed for billing and explicitly allowed
- Other tenants

#### Patient Portal User

Can access:

- Their own patient profile link
- Editable personal details allowed by tenant
- Their own upcoming/completed sessions
- Session feedback marked as visible to patient
- Their own finance dashboard
- Their own invoices/statements/documents made visible to them
- Their own history events marked visible to patient

Cannot access:

- Internal process notes
- Other patients
- Tenant user records
- Practice finance beyond their own invoices/statements
- Super Admin or tenant admin areas

### Row Level Security Model

Recommended RLS helper concepts:

- `auth.uid()` identifies the current Supabase user.
- `profiles.id` maps to `auth.uid()`.
- `tenant_users` confirms tenant membership and role.
- Every tenant-scoped table has `tenant_id`.
- Policies check:
  - user is active,
  - user belongs to the tenant,
  - user has a role allowed for that action.

Example policy intent, without SQL:

- Tenant users can select records where `record.tenant_id` is in their active memberships.
- Tenant Admin can write configuration records for their tenant.
- Reception can write bookings and patient admin/contact fields.
- Therapist can write clinical notes for assigned or authorised patients.
- Finance can write invoice/payment records for their tenant.
- Patient portal users can select only records linked to their patient portal access token/user and only where `visible_to_patient` is true.
- Super Admin can select platform tables, tenant metadata, support tickets, subscription records, and system health records.
- Super Admin cannot select from patient, note, booking, document, or tenant finance tables through normal policies.

### Audit Requirements

Audit events should be written for:

- Tenant created, suspended, reactivated, archived
- Subscription changed, cancelled, paid, failed
- User invited, activated, deactivated, role changed
- Patient created, updated, soft-deleted
- Patient portal link created or accessed
- POPIA consent submitted
- Booking created, rescheduled, cancelled, no-show marked
- Note created, updated, deleted
- Invoice confirmed
- Payment received
- Statement generated
- Document uploaded/viewed where sensitive
- Support access requested or granted if future exceptional access exists

Audit events should include actor, tenant, action, entity/table, record ID, timestamp, and metadata. Audit metadata should be concise and useful, but should not duplicate complete clinical notes, documents, or sensitive payloads unless legally required.

## 6. Data Lifecycle

### Tenant Lifecycle

```text
Create tenant
|
+-- Create Tenant Admin
|
+-- Trial starts
|
+-- Tenant Admin completes Practice Configuration
|
+-- Tenant configures users, practices, billing, patient forms
|
+-- Subscription becomes active after trial
|
+-- Ongoing billing and support
|
+-- Suspend / reactivate / archive / cancel
```

If a tenant cancels, production deletion should not happen instantly without a retention policy. The product decision can be immediate operational wipe, but implementation should still use a controlled workflow:

- mark tenant cancelled,
- disable access,
- queue deletion,
- retain platform subscription/audit metadata,
- delete/anonymise tenant operational data according to policy,
- record audit event.

### Patient Lifecycle

```text
Create partial patient during New Booking
|
+-- Generate Patient Profile Link
|
+-- Patient/guardian completes intake
|
+-- POPIA consent and signature captured
|
+-- Profile becomes complete
|
+-- Bookings, notes, finance and history accumulate
|
+-- Patient can view allowed portal data
|
+-- Archive / discharge / reactivate as needed
```

### Booking Lifecycle

```text
Booking created
|
+-- Patient, therapist, date, time, practice, location, room selected
|
+-- ICD-10 and procedures selected
|
+-- Session planning added
|
+-- Booking completed / cancelled / no-show / rescheduled
|
+-- Session feedback or internal notes added
|
+-- Invoice confirmed
```

### Clinical Lifecycle

```text
Patient profile
|
+-- Intake and consent
|
+-- Booking plan
|
+-- Session feedback / internal process note / case management note
|
+-- Clinical note version saved
|
+-- History event
|
+-- Report or outcome measure
|
+-- Patient portal visibility where allowed
```

Clinical records should preserve version history. Editing a clinical note creates a new `patient_note_versions` record rather than replacing the previous content.

### Finance Lifecycle

```text
Booking with procedure selections
|
+-- Draft invoice / confirm_invoice queue
|
+-- Invoice confirmed
|
+-- Immutable invoice snapshot stored
|
+-- PDF invoice generated
|
+-- Status awaiting_payment
|
+-- Payment due after configured payment terms
|
+-- Payment received with optional proof
|
+-- Statement generated if needed
|
+-- Immutable statement snapshot stored
|
+-- Finance reporting
```

Current invoice status flow:

```text
confirm_invoice
|
+-- awaiting_payment
|
+-- payment_due
|
+-- payment_received
```

### Communication Lifecycle

```text
Trigger event
|
+-- Choose template
|
+-- Send via email/SMS/WhatsApp/manual copy
|
+-- Store communication log
|
+-- Surface patient notice if relevant
|
+-- Mark delivered/failed/read where provider supports it
```

### Reporting Lifecycle

```text
Operational records
|
+-- Dashboard calculations
|
+-- Patient To Do items
|
+-- Feedback due queue
|
+-- Finance summaries
|
+-- Reports/documents
|
+-- Export or tenant-level analytics
```

## 7. Future Scalability

### Patient Portal

Design now for:

- Patient/guardian login or secure link access
- Intake forms
- Editable personal details
- Upcoming and completed sessions
- Feedback visibility
- Finance and billing
- History timeline
- Documents
- Notices
- Booking change requests

Portal access should be isolated from tenant staff access and should never expose internal notes.

### AI Assistant

Design now for:

- AI draft generation for notes, reports, summaries, messages
- AI usage logs
- Human approval before saving clinical records
- Source record references
- Redaction and privacy controls
- Tenant-level AI enable/disable settings

AI should never silently update clinical or financial records without a user action.

### Medical Aid Claims

Design now for:

- Claim records linked to invoices
- Patient medical aid membership
- Dependent code
- ICD-10 diagnosis
- Procedure line items
- Claim status
- Remittance or rejection reason
- Resubmission history

### WhatsApp, SMS, And Email

Design now for:

- Communication templates
- Provider connections
- Delivery logs
- Failure handling
- Manual resend
- Opt-out and consent tracking
- Patient notice generation

### Multi-Location And Multi-Practice

Already required by current settings. Design now for:

- Multiple practice entities
- Multiple locations
- Rooms per location
- Practice-specific price lists
- Practice-specific banking details
- Therapist-specific billing overrides

### Outcome Measures

Design now for:

- Configurable measures
- Patient-specific results
- Booking-linked scores
- Trend reporting
- Therapist-authored interpretation

### Tasks

Design now for:

- Patient To Do's
- Feedback due
- Confirm invoices
- Details incomplete
- Payment due
- Internal team tasks
- Assignment to users
- Due dates and status

### Automation

Design now for:

- Trigger rules
- Reminder workflows
- Invoice overdue rules
- Patient intake follow-up
- Booking reminders
- Failed communication retries
- Audit logs for automation runs

### API Integrations

Design now for:

- Email providers
- SMS providers
- WhatsApp providers
- Payment gateways
- Medical aid claim services
- Calendar sync
- Accounting exports
- Webhook event logs

External provider identifiers should be stored in integration-specific fields or metadata, not mixed into core clinical records.

## 8. Recommended Table Order

The table creation order should follow dependency order. Foundational identity and tenant records come first, then practice configuration, then patient and booking records, then clinical and finance records.

### Phase 1: Platform And Identity Foundation

1. `platform_configurations`
2. `subscription_plans`
3. `tenants`
4. `profiles`
5. `tenant_users`
6. `tenant_subscriptions`
7. `audit_events`

### Phase 2: Practice Setup

8. `practice_configurations`
9. `practice_entities`
10. `practice_locations`
11. `practice_rooms`
12. `practice_banking_details`
13. `consent_templates`
14. `patient_configuration_fields`
15. `patient_categories`
16. `referral_sources`

### Phase 3: Reference Data

17. `titles`
18. `relationship_types`
19. `contact_types`
20. `note_types`
21. `appointment_types`
22. `countries`
23. `currencies`
24. `languages`
25. `referral_source_templates`

### Phase 4: Users And Therapists

26. `user_invitations`
27. `therapist_profiles`
28. `therapist_finance_profiles`

### Phase 5: Patient Records

29. `patients`
30. `patient_identifiers`
31. `patient_contacts`
32. `patient_addresses`
33. `patient_medical_aid`
34. `patient_consents`
35. `patient_portal_access`
36. `patient_intake_submissions`

### Phase 6: Scheduling

37. `availability_rules`
38. `blocked_calendar_slots`
39. `bookings`
40. `booking_status_events`

### Phase 7: Billing Configuration

41. `icd10_codes`
42. `procedure_price_lists`
43. `procedure_prices`
44. `booking_procedures`
45. `booking_icd10_codes`

### Phase 8: Clinical

46. `booking_plans`
47. `patient_notes`
48. `patient_note_versions`
49. `patient_history_events`
50. `report_templates`
51. `reports`
52. `outcome_measures`
53. `patient_outcome_results`

### Phase 9: Finance

54. `invoices`
55. `invoice_line_items`
56. `statements`
57. `statement_invoice_links`
58. `payments`
59. `payment_allocations`
60. `medical_aid_claims`

### Phase 10: Documents And Communication

61. `documents`
62. `document_signatures`
63. `communication_templates`
64. `communication_logs`
65. `patient_notices`

### Phase 11: Operations, Automation, And Future Modules

66. `tasks`
67. `automation_rules`
68. `automation_runs`
69. `support_tickets`
70. `support_ticket_comments`
71. `system_health_events`
72. `integration_connections`
73. `webhook_events`
74. `ai_assistant_sessions`
75. `ai_generated_drafts`
76. `guides`
77. `whats_new`

## Implementation Notes Before SQL

- Confirm naming conventions before creating migrations.
- Confirm all primary keys are UUIDs named `id`.
- Decide whether patient numbers are tenant-scoped sequential values.
- Decide whether tenant cancellation means immediate hard delete or scheduled deletion.
- Decide whether patient portal users use Supabase Auth, secure magic links, or both.
- Decide whether clinical notes require version history.
- Decide whether invoices and statements should store immutable snapshots of patient/practice details.
- Decide which fields are encrypted or masked at application level.
- Confirm exact RLS helper functions before creating tables.
- Confirm audit event format before enabling production writes.

## Final Implementation Gate

SQL migrations should only begin after this architecture document is updated, reviewed, and approved. Any major product decision that changes identity, tenant scope, finance snapshots, clinical note versioning, or security boundaries should be reflected here before database implementation starts.

This document should be treated as the master database blueprint for AlliDesk v1 planning. SQL should be generated only after this architecture is reviewed and approved.

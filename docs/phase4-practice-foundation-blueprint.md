# Phase 4: Practice Foundation Blueprint

## 1. Phase 4 Objective

Phase 4 prepares the Practice Foundation layer for AlliDesk before operational modules are connected to live production data.

The objective is to define the core practice setup that future modules will reuse:

- bookings
- patients
- finance
- invoices
- statements
- communication
- Patient Link
- therapist workflows
- reporting

Phase 4 should not start by connecting sensitive operational records. It should first establish the shared practice configuration layer that allows the rest of the platform to behave consistently.

## 2. AlliDesk Product Philosophy

AlliDesk should remain guided by four product principles.

### Capture Once, Reuse Everywhere

Information should be entered once and reused across the platform.

Examples:

- Practice details should populate invoices, statements, Patient Link and communication templates.
- Therapist details should populate bookings, session views, invoices and reports.
- Patient details should populate profiles, intake, finance, documents and Patient Link.
- Billing defaults should populate draft invoices automatically.

### Automate Repetitive Admin Work

The platform should reduce manual steps by using workflow events.

Examples:

- A booking creates a draft invoice.
- A confirmed invoice generates a PDF.
- An overdue invoice shows a payment due state automatically.
- A new patient booking prepares an intake message and Patient Link.

### Reduce Therapist Admin Time

Therapists should spend less time on admin and more time on clinical work.

The system should:

- reduce duplicate data entry
- provide quick access to session planning and notes
- automate billing handoff where possible
- surface tasks that need attention
- keep patient information easy to scan

### Patient Link As Permanent Patient-Facing Access Point

The Patient Link is not a temporary form link. It is the permanent patient-facing access point.

It should become the central destination for:

- intake details
- upcoming sessions
- session feedback
- invoices
- statements
- payment updates
- practice communication
- patient-facing history

## 3. Confirmed Main Navigation

The confirmed main navigation for the tenant application is:

1. Overview
2. Bookings
3. Patients
4. Finance
5. Practice
6. Settings

This navigation should replace earlier prototype naming where needed, such as `Appointments`, `Calendar`, `Billing`, `Team`, and separate settings subareas.

## 4. Definitions Of Each Navigation Area

### Overview

Overview is the daily command centre.

It should show:

- today's work
- upcoming sessions
- tasks that need action
- invoices needing confirmation
- patient to do items
- payment and feedback alerts

Overview must be permission-driven, not fixed-role-driven.

### Bookings

Bookings is the scheduling and session lifecycle area.

It includes:

- booking calendar
- new booking form
- booked session detail
- session planning
- session notes
- billing draft linked to booking
- cancellation and no-show workflows before invoice confirmation

### Patients

Patients is the internal patient database and patient workspace.

It includes:

- patient list
- full internal patient profile
- personal details
- notes
- sessions
- finance
- history
- Patient Link generation/access

### Finance

Finance manages billing, invoices, statements and payment capture.

It includes:

- draft invoices needing confirmation
- awaiting payment
- payment due
- payment received
- proof of payment
- statements
- patient account balances

### Practice

Practice contains tenant practice setup that is reused across the app.

It includes:

- practice profile
- locations
- rooms
- team/staff
- therapists
- branding
- banking details
- practice numbers
- professional registrations
- communication templates
- billing defaults

### Settings

Settings contains app-level configuration and user-facing operational support areas.

It may include:

- How To guides
- What's New
- user preferences
- platform/app settings that are not core practice setup
- future feature toggles
- notification preferences

## 5. Practice Foundation Concepts

### Practice Profile

The practice profile is the tenant's main business/practice identity.

It should include:

- practice name
- trading name if applicable
- registration number if applicable
- VAT/tax details if applicable
- address
- phone
- email
- website
- default country
- default time zone

### Locations

A practice may have one or more locations.

Each location may include:

- location name
- address
- phone
- email
- rooms
- active/inactive status

The main practice location comes from Practice Profile. Additional locations are managed in Practice.

### Team/Staff

Team/staff includes all tenant users:

- admins
- receptionists
- therapists
- finance users
- practice managers

One user may have practical overlap between roles depending on permissions.

### Therapists

Therapists are staff members with professional and clinical configuration.

Therapist-specific details may include:

- discipline
- qualification
- practice number override
- HPCSA or professional registration number
- professional signature
- therapist colour for bookings
- personal contact details where needed

### Branding

Practice branding should support:

- logo upload
- invoice/statement branding
- Patient Link branding
- report branding
- practice-facing communication identity

### Banking Details

Banking details may belong to:

- the practice
- a therapist using their own billing setup

Fields should include:

- account name
- bank
- account number
- branch code

### Practice Numbers

By default, users use the main practice number.

Therapists may optionally use their own practice number. If a therapist uses their own practice number, invoices and relevant documents should show the therapist-specific number instead of the default practice number.

### Professional Registrations

Professional registrations should support:

- registration body
- registration number
- discipline
- qualification
- expiry date if applicable

### Communication Templates

Practice communication templates should support reusable messaging for:

- new patient intake
- upcoming booking reminders
- invoice available
- statement available
- payment due
- session feedback available
- practice updates

Current state is manual message generation. Future state is event-triggered automation.

### Billing Defaults

Billing defaults should include:

- default payment terms
- default banking details
- default price list
- invoice numbering rules
- statement numbering rules
- default invoice notes if needed

## 6. Booking-To-Payment Workflow

### 1. Booking Created

A user creates a booking for either:

- an existing patient
- a new patient

The booking captures the appointment context:

- patient
- patient type
- date
- time
- duration
- therapist
- practice/location/room
- assessment flag if relevant
- billing setup
- selected procedures/prices

### 2. Partial Patient Profile For New Patients

If the patient is new, AlliDesk creates a partial patient profile.

The system should capture the minimum details needed to create the booking and start the intake process.

### 3. Patient Profile Link / Intake Flow

For new patients, the Patient Link starts with the intake form.

The patient or guardian completes:

- personal details
- guardian/contact details where relevant
- responsible party details
- medical aid details if applicable
- POPIA acknowledgement
- signature

After intake is complete, the Patient Link becomes the permanent patient-facing profile access point.

### 4. Draft Invoice Created

When the booking is created, AlliDesk creates a draft invoice linked to the booking.

Initial invoice status:

`confirm_invoice`

This means the invoice exists as a draft and must still be reviewed and confirmed.

### 5. Booking Appears In Calendar

The booking appears in the calendar immediately.

It should also be accessible from:

- Overview
- Bookings
- Patient profile
- Finance queue where relevant

### 6. Session Can Be Edited Before Invoice Confirmation

Before invoice confirmation, the booked session can still be edited.

Allowed actions may include:

- edit date/time
- edit therapist
- edit room/location
- edit duration
- edit billing choices
- change procedures/prices
- mark no-show
- cancel
- reschedule

Once the invoice is confirmed, cancellation/no-show actions should no longer be normal session actions because the session has entered the billing flow.

### 7. Invoice Confirmed

When the invoice is reviewed and confirmed:

- status changes from `confirm_invoice` to `awaiting_payment`
- `confirmed_at` is set
- payment due date is set to 7 days after confirmation

### 8. PDF Generated

A PDF invoice is generated when the invoice is confirmed.

The PDF should store immutable snapshots of:

- practice details
- therapist details
- patient/responsible party details
- medical aid details where relevant
- banking details
- line items
- prices
- invoice number
- invoice date
- due date

### 9. Status Awaiting Payment

After confirmation, the invoice status is:

`awaiting_payment`

The invoice remains awaiting payment until:

- payment is captured, or
- the 7-day payment window expires

### 10. Payment Due After 7 Days

From day 8 onward, unpaid invoices should display as:

`payment_due`

The system should show an overdue indicator such as:

- 8 days delayed
- 10 days delayed
- 15 days delayed

### 11. Payment Received

Payment can be captured against an invoice or statement.

When payment is received:

- status changes to `payment_received`
- payment received date is set
- amount received is stored
- patient finance history is updated

### 12. Proof Of Payment

Payment can be captured:

- with proof of payment
- without proof of payment

If proof is uploaded, it should be linked to the specific invoice or statement payment record.

### 13. Statements

Statements can group multiple invoices.

A statement should list all invoice line items that form part of the statement.

If a statement is paid, linked invoices are treated as paid.

## 7. Invoice Statuses

Invoice statuses are:

```text
confirm_invoice
awaiting_payment
payment_due
payment_received
```

### `confirm_invoice`

Draft invoice created from a booking. Not yet an official billing obligation.

### `awaiting_payment`

Confirmed invoice. PDF generated. Payment due date set.

### `payment_due`

Confirmed invoice that has passed the payment window and remains unpaid.

### `payment_received`

Payment has been captured.

## 8. Patient Model Decisions

### Patient Belongs To Tenant/Practice

Every patient belongs to a tenant/practice.

Patient records must be tenant-scoped and protected by RLS.

### Internal Patient Profile Contains Full History

The internal patient profile contains the complete practice-facing patient record:

- personal details
- guardian/responsible party details
- intake details
- bookings
- notes
- finance
- documents
- history

### One Active ICD-10 Code Per Patient

AlliDesk should treat ICD-10 as patient-level for the current workflow.

There should be one active ICD-10 code per patient, with history/versioning possible later if it changes.

### Responsible Party/Billing Contact May Differ From Patient

The person responsible for the account may be:

- the patient
- a parent/guardian
- another responsible party

The billing contact should include required identity and contact details for invoices/statements.

### Patient Link Is Permanent Per Patient

Each patient should have a permanent Patient Link.

It starts with intake for new patients and later becomes the ongoing patient-facing access point.

### Patient Link Is Read-Only From Patient Side

The patient can update relevant personal/intake details where allowed.

The patient should not edit:

- bookings
- invoices
- statements
- history
- clinical notes
- internal records

## 9. Finance Decisions

### Booking Creates Draft Invoice

Every billable booking creates a draft invoice with status:

`confirm_invoice`

### Confirmed Invoice Creates Official Billing Obligation

The billing obligation begins when the invoice is confirmed.

Before confirmation, it is a draft linked to the booking.

### Payment Can Be Captured With Or Without Proof

Payment received can be confirmed:

- with uploaded proof
- without uploaded proof

Proof should be linked to the specific payment record when provided.

### Statements Can Group Multiple Invoices

Statements can include multiple invoices and their line items.

Statements should have their own number, status and PDF.

### Paying A Statement Treats Linked Invoices As Paid

If a statement is paid, all invoices linked to the statement should be treated as paid.

## 10. Price List Model

### Multiple Price Lists

A practice can create multiple price lists.

Examples:

- Procedure and prices A
- Procedure and prices B
- Private rates
- Medical aid rates
- Assessment rates

### Procedure Line Items

Each price list contains procedure line items.

Each line item contains:

- procedure name
- procedure code
- description
- price

### ICD-10 Is Patient-Level

ICD-10 is patient-level, not line-item level, for the current model.

Invoice line items should show the active patient ICD-10 code for billing context, but the ICD-10 should not be configured as a price-list line item.

## 11. History

### Internal History

Internal history lives in the patient profile.

It should track meaningful events:

- profile updated
- intake completed
- booking created
- booking changed
- session completed
- note added
- invoice confirmed
- payment received
- statement generated
- feedback available

### Patient-Facing History

Patient-facing history lives in Patient Link.

Only patient-facing events should appear externally.

Internal-only notes, clinical reasoning, process notes and confidential admin events must not appear on Patient Link.

## 12. Permissions

Overview and workflows should be permission-driven, not fixed-role-driven.

Examples:

- A solo practitioner may perform all roles.
- A therapist may manage finance if permissions allow.
- A receptionist may manage bookings and some patient admin.
- A finance user may manage finance without clinical access.

Roles provide defaults, but permissions should control access to actual actions.

## 13. Patient Link Communication

### Current State

The current prototype uses a chat icon/manual workflow.

The system generates ready-to-send WhatsApp/email messages that the user can copy and send manually.

### Future State

In future, workflow events should trigger communication automatically.

Examples:

- booking created
- intake required
- invoice available
- statement available
- payment due
- session feedback available
- session reminder
- booking changed

### Patient Link As Central Destination

Messages should point patients back to Patient Link where possible.

Patient Link should be the destination for:

- invoices
- statements
- upcoming sessions
- feedback
- intake
- profile updates
- payment status
- practice updates

## 14. Future Automation Direction

Future automation should focus on reducing repeated admin tasks.

Potential automation areas:

- automatic intake reminders
- automatic booking reminders
- automatic invoice available messages
- automatic overdue payment reminders
- automatic statement notifications
- automatic session feedback notifications
- automatic task creation from workflow events
- automatic patient history entries
- automatic finance status changes
- automatic report/feedback due tracking

Automation must respect permissions, tenant boundaries and patient privacy.

## 15. Recommended Phase 4 Implementation Sequence

After this blueprint, the recommended Phase 4 sequence is:

### Step 1: Practice Foundation Database Design

Design SQL migrations for:

- practice profile
- locations
- rooms
- team/staff metadata where needed
- therapist profiles
- therapist professional details
- practice branding metadata
- banking details
- billing defaults
- communication templates
- price lists
- procedure line items

Do not create patient, booking, invoice or clinical tables yet unless the practice foundation requires references.

### Step 2: RLS And Tenant Scope Review

Ensure all practice foundation tables are tenant-scoped and protected by membership policies.

Super Admin should not receive default access to tenant operational configuration unless explicitly designed for platform support.

### Step 3: Type Generation

Generate Supabase TypeScript types after migrations are applied.

### Step 4: Practice Data Access Layer

Create a typed data access layer for practice foundation records only.

### Step 5: Practice Route UI

Create the `Practice` route and connect:

- practice profile
- locations
- banking details
- therapist setup
- price lists
- communication templates

### Step 6: Settings Cleanup

Move practice-specific configuration from Settings into Practice.

Keep Settings for app/support/user preference areas.

### Step 7: Booking Foundation Preparation

Once Practice Foundation is stable, begin the booking module using:

- practice locations
- therapists
- price lists
- procedures
- billing defaults

### Step 8: Patient Foundation Preparation

After bookings have stable practice dependencies, design patient tables and Patient Link foundations.

### Step 9: Finance Foundation Preparation

After bookings and patients are defined, design invoice, statement and payment tables using immutable snapshots.

## Implementation Gate

Do not begin operational module coding until:

- this blueprint is reviewed
- Practice Foundation table design is approved
- RLS strategy is confirmed
- data access pattern is agreed
- the migration sequence is clear

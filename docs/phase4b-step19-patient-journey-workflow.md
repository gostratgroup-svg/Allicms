# Phase 4B - Step 19: Patient Journey & Workflow Blueprint

## Goal

Describe the complete patient lifecycle inside AlliDesk and show how bookings, finance, history, Patient Link, future automation, and AI should work together.

This document is architecture only. It does not introduce code, migrations, UI, or workflow implementation.

## Principles

AlliDesk workflow design follows these product principles:

- Capture once.
- Reuse everywhere.
- Everything starts from the booking.
- Automation should reduce administration.
- Patient Link is the external window into the practice.
- History is the internal patient timeline.
- Finance should be generated from operational activity, not manually recreated.
- Internal notes and patient-facing information must remain clearly separated.

## 1. Patient Lifecycle

```text
Prospective Patient
  ↓
Registered Patient
  ↓
Active Patient
  ↓
Inactive Patient (future)
  ↓
Archived Patient (future)
```

### Prospective Patient

A partial patient record created before full intake is complete.

Typical entry points:

- new booking for a new patient
- phone enquiry
- receptionist-created booking
- therapist-created first appointment

Minimum information may include:

- patient name
- patient type
- parent/guardian or contact details
- therapist or booking context

Prospective patients can already have:

- Patient Link
- intake request
- booking
- draft invoice
- patient history events

### Registered Patient

A patient whose intake information has been completed and reviewed enough for normal practice use.

This stage should include:

- demographic details
- responsible party
- consent/POPIA acknowledgement
- medical aid details where relevant
- emergency contact
- active ICD-10 code where relevant

### Active Patient

A patient currently receiving services or actively managed by the practice.

Active patients can have:

- bookings
- sessions
- notes
- feedback
- invoices
- payments
- documents
- statements
- history

### Inactive Patient (Future)

A patient who is not currently receiving services but may return later.

Inactive patients should remain searchable and retained, but not appear in active workflow queues unless needed.

### Archived Patient (Future)

A retained patient record no longer part of normal operations.

Archived patients should be excluded from day-to-day lists and operational workflows. Archive behaviour must respect legal, clinical, and privacy retention requirements.

## 2. Booking Lifecycle

```text
Booking Created
  ↓
Booking Confirmed
  ↓
Session Ready
  ↓
Session Completed

Alternative outcomes:
  → Cancelled
  → No Show
```

### Booking Created

The booking exists in the system and appears in scheduling context.

Created by:

- therapist
- receptionist
- admin
- future Patient Link booking request

Booking creation should later create:

- calendar event
- patient history event
- draft invoice
- dashboard updates
- Patient Link update

### Booking Confirmed

The practice has confirmed that the booking should proceed.

This may happen immediately for internal bookings or later when patient/customer confirmation is received.

### Session Ready

The booking is ready for clinical work.

This means:

- patient exists
- therapist assigned
- date/time selected
- procedure line items selected
- intake status is known
- session planning can begin

### Session Completed

The service has taken place.

Completion may trigger:

- notes due
- feedback due
- invoice confirmation
- patient history
- Patient Link updates
- reporting

### Cancelled

The booking did not proceed and was cancelled before completion.

Cancellation should record:

- cancellation reason
- cancellation timestamp
- actor
- reschedule option where applicable
- patient history event

### No Show

The patient did not attend.

No show should record:

- no-show timestamp
- actor
- optional notes
- patient history event
- future billing/no-show fee decision

## 3. Financial Lifecycle

```text
Booking
  ↓
Draft Invoice
  ↓
Confirm Invoice
  ↓
Awaiting Payment
  ↓
Payment Due
  ↓
Payment Received
  ↓
Statement (optional)
```

### Booking

The booking is the source event for future billing.

The booking will later select:

- patient
- therapist
- price list
- procedure line items
- location/room
- date/time

### Draft Invoice

A draft invoice is created from the booking and selected procedure line items.

Draft invoice status:

- `confirm_invoice`

The draft invoice can still be adjusted before confirmation.

### Confirm Invoice

The user confirms the invoice.

Confirmation should:

- create official invoice number
- create immutable invoice snapshot
- generate PDF
- set `confirmed_at`
- set due date
- move status to `awaiting_payment`

### Awaiting Payment

The confirmed invoice is waiting for payment.

Patient Link should show invoice availability where appropriate.

### Payment Due

If payment is not received by the due date, invoice status should become `payment_due`.

The system should calculate overdue days rather than relying only on manually edited status.

### Payment Received

Payment has been captured.

This should update:

- invoice status
- patient balance
- patient history
- Patient Link finance view

Proof of payment may be attached in future file storage workflows.

### Statement Optional

A statement can group one or more invoices.

If the statement is paid, linked invoices may be marked as paid according to the finance rules approved in the Finance Foundation.

## 4. History Lifecycle

Patient History is the internal timeline for patient activity.

Every meaningful patient-related event should produce a history event.

### Patient Events

- patient created
- patient status changed
- intake sent
- intake started
- intake completed
- patient reviewed
- patient details updated
- responsible party created
- responsible party updated
- ICD-10 updated
- assigned therapist changed

### Booking Events

- booking created
- booking confirmed
- booking rescheduled
- booking cancelled
- booking marked no-show
- session marked ready
- session completed
- session planning added or updated

### Clinical/Feedback Events

- session note added
- session note updated
- internal note added
- feedback added
- feedback published to Patient Link
- case management note added

### Finance Events

- draft invoice created
- invoice confirmed
- invoice PDF generated
- invoice marked awaiting payment
- invoice became payment due
- payment received
- proof of payment added
- statement generated
- statement paid

### Document Events

- document uploaded
- document generated
- report generated
- document shared to Patient Link

### Communication Events

- intake message generated
- reminder generated
- invoice message generated
- statement message generated
- feedback message generated
- future WhatsApp/email/SMS sent

### Patient Link Events

- Patient Link created
- Patient Link shared
- Patient Link viewed (future)
- intake form opened
- intake form submitted
- Patient Link access token rotated (future)

## 5. Patient Link Lifecycle

Patient Link is the patient/customer-facing destination for safe external access.

### When Patient Link Should Update

Patient Link should reflect relevant external changes when:

- booking is created
- booking is rescheduled
- booking is cancelled
- new appointment is added
- intake is required
- intake is completed
- invoice is confirmed
- statement is generated
- payment is received
- feedback is published
- document is shared

### Patient Link Should Show

- practice and therapist contact information
- intake form when required
- upcoming bookings
- completed sessions where visible
- published feedback
- patient-facing finance records
- patient-facing documents
- safe history events

### Patient Link Should Not Show

- internal clinical notes
- process notes
- internal case management notes
- audit logs
- other patients
- tenant internal operations
- staff-only admin notes

### Messaging Direction

Current scope:

- no patient messaging back into the system

Future:

- patient requests booking changes
- patient sends documents
- patient replies to practice messages
- secure portal communication

## 6. Workflow Trigger Map

### Booking Created

Creates now/future:

- calendar event
- draft invoice
- patient history event
- dashboard update
- Patient Link booking update

Future:

- WhatsApp booking message
- email booking message
- intake reminder schedule
- therapist task

### Booking Rescheduled

Creates:

- updated calendar event
- patient history event
- Patient Link update

Future:

- WhatsApp reschedule notice
- email reschedule notice
- therapist notification

### Booking Cancelled

Creates:

- calendar status update
- patient history event
- Patient Link update

Future:

- cancellation message
- reschedule prompt
- cancellation fee workflow

### No Show

Creates:

- booking status update
- patient history event
- dashboard update

Future:

- no-show fee decision
- automated follow-up task
- patient notification

### Session Completed

Creates:

- patient history event
- notes due task
- feedback due task
- invoice confirmation task if draft invoice exists

Future:

- AI session summary suggestion
- feedback reminder
- next-session planning suggestion

### Feedback Published

Creates:

- patient-facing feedback entry
- Patient Link update
- patient history event

Future:

- WhatsApp feedback available message
- email feedback available message

### Invoice Confirmed

Creates:

- invoice number
- PDF invoice
- due date
- patient history event
- Patient Link finance update

Future:

- WhatsApp invoice available message
- email invoice available message
- reminder schedule

### Payment Due

Creates:

- overdue/due state
- dashboard update
- patient finance status update

Future:

- payment reminder
- practice task
- automated statement suggestion

### Payment Received

Creates:

- patient balance update
- patient history event
- Patient Link finance update

Future:

- receipt notification
- thank-you message
- automated reconciliation suggestions

### Statement Generated

Creates:

- statement record
- patient history event
- Patient Link finance update

Future:

- statement available message
- payment link
- recurring statement schedule

## 7. Automation Opportunities

### Patient Creation

Current manual work:

- capture partial patient details
- copy Patient Link message
- track intake completion

Future automation:

- auto-create Patient Link
- auto-generate intake message
- auto-remind if intake incomplete
- dashboard task if intake missing before booking

### Booking

Current manual work:

- select patient
- select time
- select therapist
- select procedures
- notify patient manually

Future automation:

- default price list selection
- default duration from procedure items
- automatic Patient Link update
- WhatsApp/email booking confirmation
- calendar conflict detection

### Session Preparation

Current manual work:

- therapist checks day manually
- therapist adds planning manually
- therapist identifies missing intake/notes manually

Future automation:

- session readiness checklist
- missing intake alert
- previous session summary
- suggested plan focus

### Session Completion

Current manual work:

- add notes
- add feedback
- confirm invoice manually

Future automation:

- AI draft feedback
- AI internal summary
- invoice confirmation prompt
- next-session task

### Finance

Current manual work:

- confirm invoice
- send invoice manually
- capture payment
- create statement

Future automation:

- invoice PDF generation
- payment reminders
- overdue alerts
- receipt messages
- statement suggestions

### Patient Link

Current manual work:

- share link manually
- communicate updates manually

Future automation:

- auto-update external view
- auto-send event messages
- payment link integration
- secure access upgrade

## 8. AI Opportunities

### Session Summaries

AI can summarize session notes into:

- internal summaries
- patient-facing feedback drafts
- carry-over tasks
- next-session planning points

### Outstanding Work Suggestions

AI can identify:

- missing notes
- feedback not published
- intake incomplete
- overdue invoices
- upcoming sessions without planning

### Patient Insights

AI can summarize:

- patient timeline
- recent bookings
- recent feedback
- outstanding finance
- intake gaps
- documents still needed

### Administrative Recommendations

AI can suggest:

- invoice confirmation tasks
- statement creation
- payment follow-up
- booking reminders
- patient profile cleanup
- report readiness

### Safety Principle

AI must respect:

- tenant boundaries
- role permissions
- Patient Link visibility rules
- internal vs external note separation

## 9. Implementation Guardrails

- Do not duplicate patient details across modules when a reference and snapshot pattern is more appropriate.
- Use immutable snapshots for confirmed finance documents.
- Use history events for timeline visibility, not audit logs.
- Keep audit events separate from patient history.
- Keep patient-facing history separate from internal history through visibility flags.
- Keep Patient Link low-friction first, then upgrade security as the product matures.

## 10. Recommended Next Steps

Recommended implementation sequence after this blueprint:

1. Patient Foundation migration.
2. Database types update.
3. Patient list/detail shell.
4. Responsible party management.
5. Patient history foundation.
6. Patient Link foundation.
7. Booking Foundation.
8. Draft invoice generation from bookings.
9. Patient Link finance and feedback visibility.

This keeps the platform moving from configuration into operational workflows without losing the clean architecture established in Phases 1-4A.

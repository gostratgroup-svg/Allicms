# Phase 5B Step 1: Booking Engine Architecture

## Purpose

The Booking Engine is the next operational subsystem after the Patient Engine. It becomes the starting point for daily practice activity and must connect patients, therapists, locations, sessions, finance, Patient Link, communication, workflow events, and history without duplicating data entry.

This document is architecture only. It does not create database migrations, generated types, React components, routes, or UI.

## Core Principles

### Booking Starts The Workflow

In AlliDesk, a booking is the operational starting point:

```text
Booking
  -> Patient Journey
  -> Session
  -> Finance
  -> Patient Link
  -> History
  -> Workflow Engine
```

The booking should capture the operational facts once and reuse them everywhere else.

### Capture Once, Reuse Everywhere

A booking should capture:

- patient
- therapist
- location
- date and time
- duration
- procedures
- price list context
- booking status
- source
- patient-facing appointment information

Those facts should later feed:

- calendar views
- session readiness
- draft invoice generation
- patient history
- Patient Link updates
- communication triggers
- reporting
- workflow automation

### Tenant Isolation Remains Non-Negotiable

Every Booking Engine operational table must include `tenant_id`.

RLS must remain the source of truth. Frontend permission checks improve UX, but they must never replace tenant-scoped RLS policies.

### Historical Accuracy

Bookings should reference current setup records where appropriate, but must snapshot values that affect historical accuracy.

Examples:

- selected procedure item names, codes, descriptions, prices and duration should be snapshotted at booking time
- therapist display/billing context should be snapshotted where it affects finance/session records
- location and room labels should be snapshotted enough to preserve the historical appointment view

Future changes to a price list, therapist profile, or location must not silently rewrite old booking, session, or invoice meaning.

## Architecture Position

```text
Tenant
|
+-- Practice Foundation
|   +-- Practice profile
|   +-- Locations
|   +-- Therapists
|   +-- Price lists
|
+-- Patient Engine
|   +-- Patients
|   +-- Responsible parties
|   +-- Patient history
|
+-- Booking Engine
    +-- Bookings
    +-- Booking procedures
    +-- Booking notes
    +-- Booking status history
    +-- Recurrence rules
    +-- Workflow events
|
+-- Future Engines
    +-- Sessions
    +-- Clinical notes
    +-- Finance
    +-- Documents
    +-- Communication
```

## Entity Relationships

### Primary Relationship Flow

```text
Tenant
  -> Practice Location
  -> Therapist Profile
  -> Patient
  -> Booking
  -> Booking Procedures
  -> Session (future)
  -> Draft Invoice (future)
  -> Payment/Statement (future)
```

### Booking Relationships

A booking belongs to:

- one tenant
- one patient
- one therapist where applicable
- one location where applicable
- one price list where pricing is selected

A booking may have:

- multiple procedure line items
- multiple notes
- multiple status history entries
- multiple workflow events
- one recurrence rule if it is a recurring series master
- occurrence records or exception metadata for recurring bookings

### Patient Requirement

A booking should always require a patient record.

For new patients, the booking flow should create or select a prospective patient first, then attach the booking to that patient. This preserves the Phase 5A Patient Engine rule that the prospective record becomes the long-term patient record instead of creating duplicate identities.

## Booking Lifecycle

Recommended booking states:

```text
draft
  -> scheduled
  -> confirmed
  -> checked_in
  -> in_progress
  -> completed

Alternative outcomes:
scheduled/confirmed -> cancelled
scheduled/confirmed -> no_show
scheduled/confirmed -> rescheduled
```

### `draft`

A booking being assembled but not yet committed to the calendar.

Use cases:

- user has selected patient but not time
- procedures are incomplete
- conflict validation has not passed

Draft bookings should not create official session records or invoices.

### `scheduled`

The booking is placed on the calendar.

This state should create:

- calendar event visibility
- patient history event
- Patient Link appointment update, when Patient Link exists
- draft invoice readiness event, if procedure/pricing data is complete

### `confirmed`

The practice has confirmed the appointment with the patient/responsible party or internally accepted it as confirmed.

This state may trigger:

- confirmation communication
- Patient Link update
- session readiness

### `checked_in`

The patient has arrived or connected for the appointment.

This state may trigger:

- arrival history event
- dashboard status update
- session preparation state

### `in_progress`

The session/service is actively underway.

This state should be future-ready for:

- session timer
- session note shell
- attendance tracking

### `completed`

The appointment has taken place.

This state should trigger readiness for:

- session completion
- feedback due
- notes due
- invoice confirmation
- patient history
- reporting

Completed is terminal except for tightly controlled administrative correction workflows.

### `cancelled`

The booking will not happen.

Cancellation should record:

- cancellation reason
- cancellation timestamp
- actor
- whether reschedule was offered
- patient-facing visibility flag

Cancelled is terminal for that occurrence.

### `no_show`

The patient did not attend.

No-show should record:

- no-show timestamp
- actor
- optional note
- billing/no-show-fee readiness for future finance rules

No-show is terminal for that occurrence.

### `rescheduled`

Rescheduled should preserve the original booking history.

Recommended model:

- keep the original booking record and update its date/time when the booking is rescheduled before completion
- create a `booking_status_history` event with old and new time details
- optionally keep `previous_start_at` and `previous_end_at` in status history metadata
- do not erase the original appointment trail

For recurring bookings, rescheduling one occurrence should create an occurrence exception rather than rewriting the whole series.

## State Transitions

| From | To | Reversible? | Actor |
| --- | --- | --- | --- |
| `draft` | `scheduled` | Yes | Admin, receptionist, therapist |
| `scheduled` | `confirmed` | Yes | Admin, receptionist, therapist |
| `scheduled` | `cancelled` | No | Admin, receptionist, therapist |
| `scheduled` | `no_show` | No | Admin, receptionist, therapist |
| `confirmed` | `checked_in` | Limited | Admin, receptionist, therapist |
| `checked_in` | `in_progress` | Limited | Therapist, admin |
| `in_progress` | `completed` | Limited correction only | Therapist, admin |
| `scheduled/confirmed` | `rescheduled` | Original event retained | Admin, receptionist, therapist |
| `completed` | correction state | Exceptional only | Admin |

Finance-only users should not alter booking status except where future finance workflows need to view billing readiness.

## Scheduling And Conflict Rules

### Time Zone Handling

Bookings should store times as `timestamptz`.

Display should use:

- active tenant default time zone
- practice/location time zone override later if needed
- user display preferences later

### Required Scheduling Fields

A scheduled booking requires:

- `tenant_id`
- `patient_id`
- `therapist_profile_id` where therapist-led service
- `location_id` or appointment mode
- `start_at`
- `end_at`
- `duration_minutes`
- `booking_status`

### Duration Rules

Duration can come from:

- selected procedure item duration
- assessment duration choice
- manual override where permitted
- therapist default appointment duration

If multiple procedure items have duration values, duration should be calculated from the maximum or sum according to booking configuration. The initial recommendation is sum of selected timed procedures, with manual override allowed for admin/therapist.

### Overlap Rules

Conflict detection should prevent overlapping active bookings for the same:

- therapist
- location room/resource where used

Statuses that should block overlap:

- `scheduled`
- `confirmed`
- `checked_in`
- `in_progress`

Statuses that should not block overlap:

- `cancelled`
- `no_show`
- completed historical bookings
- draft bookings unless explicitly held

### Buffer Time

Architecture should support future buffer fields:

- `pre_buffer_minutes`
- `post_buffer_minutes`

Conflict detection should include buffers where configured.

### Backdated Bookings

Backdated bookings should be allowed only for admin or therapist correction workflows.

Rules:

- require reason
- create audit event
- create patient history event only if meaningful
- preserve downstream finance/session impact

### Future Booking Limits

Future booking limits should be configurable later by tenant.

Initial architecture should support:

- no hard-coded future limit at database level
- application-level validation later
- optional tenant setting later

### Concurrent Booking Prevention

Database-level exclusion constraints may be considered later for PostgreSQL overlap prevention, but initial architecture can combine:

- indexed conflict queries
- transaction-safe insert/update path
- workflow idempotency

If high concurrency becomes a concern, add database constraints or RPC functions for atomic booking creation.

## Recurring Bookings

Recurring bookings should be future-ready but not overbuilt in the first implementation.

### Series And Occurrence Model

Recommended model:

- `booking_recurrence_rules` owns recurrence pattern
- a series master booking represents the recurring booking definition
- individual occurrences are generated virtually for calendar display or materialized as needed
- exceptions are stored when one occurrence differs

### Editing Recurrence

Support future operations:

- edit one occurrence
- edit this and future occurrences
- edit entire series
- cancel one occurrence
- cancel remaining series
- cancel entire series

### Snapshots

Price, duration, therapist, and location snapshots should be captured when occurrences become operational bookings. A recurring template should not silently change historical occurrence data.

### History And Audit

Recurring actions should create:

- booking status history
- patient history where patient-facing or operationally meaningful
- audit event for bulk/series changes

## Price And Finance Relationship

### Price List Reference

Bookings should reference:

- selected `price_list_id`
- selected `price_list_items`

### Booking Procedure Snapshots

Each selected procedure should become a booking procedure line with:

- source `price_list_item_id`
- procedure name snapshot
- procedure code snapshot
- description snapshot
- unit price snapshot
- quantity
- duration minutes snapshot
- currency

This allows the booking to later create a draft invoice without re-entering procedure data.

### ICD-10

ICD-10 remains patient-level, not procedure-level.

Invoices later combine:

- patient active ICD-10
- booking procedure snapshots
- responsible party snapshot
- practice/therapist billing snapshot

### Draft Invoice Trigger Readiness

When a booking becomes `scheduled` or `confirmed` and has billable procedure items, the Booking Engine should emit a workflow event indicating draft invoice readiness.

The Finance Engine will later consume that event to create a draft invoice with status `confirm_invoice`.

The Booking Engine should not implement confirmed invoice logic.

## Patient Relationship

### Prospective Patient Bookings

New bookings for new patients should create a prospective patient record first.

Minimum information:

- first name
- last name
- patient type where known
- responsible party or contact details where available
- booking context metadata

The booking then references that patient.

### Registered Patient Bookings

For existing patients, booking creation reuses the existing patient profile, responsible party, active ICD-10, alerts, and medical context.

### Archived Or Inactive Patients

Validation rules:

- archived patients cannot receive new bookings without explicit admin override
- inactive patients may require a confirmation step before booking
- merged patients should redirect to the active patient record

### Patient History

Booking events should create meaningful patient history:

- booking created
- booking confirmed
- booking rescheduled
- booking cancelled
- patient checked in
- no-show recorded
- booking completed

History should avoid field-level noise.

## Session Relationship

The Booking Engine prepares sessions but does not implement the Session Engine in this step.

Future session relationship:

- one booking may create one session record
- session planning can begin once booking is scheduled/confirmed
- session notes and feedback belong to the Session/Clinical engines
- session completion should update booking status
- booking completion should signal finance and patient history

Recommended future model:

```text
booking
  -> session
  -> session_notes
  -> feedback
  -> invoice confirmation readiness
```

## Calendar Architecture

### Calendar Views

The Booking Engine should support:

- day view
- week view
- month view
- therapist-filtered calendar
- location-filtered calendar
- status-filtered calendar

### Loading Strategy

Calendar queries should load by:

- tenant id
- date range
- optional therapist id
- optional location id
- optional status list

Avoid loading all future bookings at once.

### Time Grid

The calendar should support 15-minute increments.

Stored bookings should not be limited to 15-minute increments at the database level unless the product decides to enforce that globally. UI can guide users into 15-minute intervals.

### Drag-And-Drop Readiness

Drag-and-drop rescheduling should:

- run conflict validation
- preserve status history
- ask confirmation for completed/confirmed bookings
- update Patient Link
- trigger communication readiness

### Mobile

Mobile calendar should prioritize:

- day agenda
- therapist’s own bookings
- quick booking detail access
- check-in/no-show/cancel actions where permitted

## Security And RLS Considerations

### Tenant Ownership

Every Booking Engine table must include `tenant_id`.

RLS policies should always check tenant membership through the existing tenant user model.

### Role Visibility

Recommended access:

| Role | Booking Access |
| --- | --- |
| Admin | Full tenant booking access |
| Receptionist | Create, update, reschedule, cancel, check-in |
| Therapist | View assigned bookings, manage own session-related status, create bookings where allowed |
| Finance | View booking billing context only, not clinical/internal notes |
| Super Admin | No default tenant booking access |
| Patient Link User | Read limited patient-facing appointment data only |

### Sensitive Note Separation

Booking notes should separate:

- internal administrative notes
- patient-facing appointment notes
- future clinical/session notes

Clinical notes must not be stored as booking notes.

### Finance-Only Access

Finance users may need booking procedure and billing readiness data, but not medical information, clinical notes, or internal therapist notes.

RLS should support this separation through table design and policies.

## Audit And History Requirements

### Audit Events

Use `audit_events` for security/compliance-relevant changes:

- booking created
- booking updated
- status changed
- therapist changed
- location changed
- backdated booking created
- booking cancelled
- no-show recorded
- recurring series changed

### Patient History Events

Use `patient_history_events` for patient-level operational timeline:

- booking created
- booking confirmed
- booking rescheduled
- booking cancelled
- patient checked in
- no-show recorded
- booking completed

Patient history is not a replacement for audit logs.

## Workflow Events

Recommended meaningful workflow events:

- `booking_created`
- `booking_confirmed`
- `booking_rescheduled`
- `booking_cancelled`
- `patient_checked_in`
- `session_started`
- `booking_completed`
- `no_show_recorded`

### Event Effects

| Event | Patient History | Communication | Session | Finance | Patient Link |
| --- | --- | --- | --- | --- | --- |
| Booking Created | Yes | Future intake/confirmation | Prepare | Draft invoice readiness | Upcoming appointment |
| Booking Confirmed | Yes | Confirmation | Session ready | No direct invoice action | Confirmed appointment |
| Booking Rescheduled | Yes | Reschedule notice | Update | Update draft only | Updated appointment |
| Booking Cancelled | Yes | Cancellation notice | Cancel pending session | Cancel draft if allowed | Removed/cancelled appointment |
| Patient Checked In | Yes | Optional | Session ready | None | Status update optional |
| Session Started | Optional | None | Create/start | None | None |
| Booking Completed | Yes | Feedback readiness | Complete | Invoice confirmation readiness | Completed session |
| No Show Recorded | Yes | No-show notice optional | None | No-show fee readiness later | No-show status optional |

Workflow events should be idempotent. Re-running a trigger must not create duplicate invoices, duplicate messages, or duplicate sessions.

## Recommended Data Model

Only justified tables are recommended for the first Booking Engine database step.

### `bookings`

Purpose:

Stores the main tenant-scoped appointment record.

Key fields:

- `id`
- `tenant_id`
- `patient_id`
- `therapist_profile_id`
- `practice_location_id`
- `price_list_id`
- `booking_status`
- `booking_type`
- `booking_source`
- `start_at`
- `end_at`
- `duration_minutes`
- `timezone`
- `appointment_mode`
- `room_label`
- `patient_facing_title`
- `patient_facing_notes`
- `internal_admin_notes`
- `cancellation_reason`
- `cancelled_at`
- `no_show_at`
- `checked_in_at`
- `completed_at`
- snapshot metadata
- audit/profile fields
- soft delete fields

### `booking_procedures`

Purpose:

Stores selected procedure line items and snapshots pricing for the booking.

Key fields:

- `booking_id`
- `price_list_item_id`
- `procedure_name`
- `procedure_code`
- `description`
- `unit_price`
- `quantity`
- `line_total`
- `duration_minutes`
- `currency`
- `is_billable`

### `booking_status_history`

Purpose:

Tracks meaningful status and scheduling changes.

Key fields:

- `booking_id`
- `from_status`
- `to_status`
- `event_type`
- `event_reason`
- `old_start_at`
- `old_end_at`
- `new_start_at`
- `new_end_at`
- `created_by_profile_id`
- `metadata`

### `booking_recurrence_rules`

Purpose:

Stores recurrence rules for future recurring bookings.

This can be introduced after the base booking table unless recurring bookings are required immediately.

Key fields:

- `series_booking_id`
- `rrule`
- `start_date`
- `end_date`
- `timezone`
- `is_active`
- `metadata`

### `booking_occurrence_exceptions`

Purpose:

Stores occurrence-level changes for recurring series.

This should be future-ready and can be deferred until recurrence is implemented.

### `booking_notes`

Purpose:

Stores separated notes if inline note fields become too limiting.

Initial implementation may use fields on `bookings`; add this table when multiple notes, visibility controls, or note history become necessary.

### `booking_workflow_events`

Purpose:

Stores idempotent booking workflow events for future automation.

This table is justified if automation/event processing starts with the Booking Engine. If not, status history and patient history can carry the first implementation.

## Validation Rules

### Required Relationships

- A non-draft booking requires a patient.
- A therapist-led booking requires an active therapist.
- A location booking requires an active location or valid appointment mode.
- Billable booking requires at least one active/snapshotted procedure item.

### Time Validation

- `start_at` must be before `end_at`.
- `duration_minutes` must match or explain the time range.
- Date/time must use tenant display timezone but store as `timestamptz`.

### Status Validation

- Terminal statuses cannot be edited without admin correction workflow.
- Cancelled and no-show bookings cannot be checked in or completed.
- Completed bookings should not be rescheduled.

### Conflict Validation

- Prevent overlapping active bookings for the same therapist.
- Prevent overlapping active bookings for the same room/resource when resource tracking is enabled.
- Ignore cancelled/no-show terminal bookings for conflict checks.

### Patient Validation

- Archived patients require override.
- Merged patients should redirect to target patient.
- Prospective patients are allowed.
- Missing intake/consent should produce warnings, not necessarily block booking.

### Pricing Validation

- Missing price list should warn if booking is billable.
- Inactive price list items should not be selectable for new bookings.
- Existing bookings keep pricing snapshots even if price list items change later.

## Scalability And Reliability

### Calendar Query Performance

Indexes should support:

- `tenant_id, start_at, end_at`
- `tenant_id, therapist_profile_id, start_at`
- `tenant_id, practice_location_id, start_at`
- `tenant_id, booking_status, start_at`
- recurrence rule lookup by series booking

### Concurrency

Initial implementation can use conflict queries before insert/update.

Later high-concurrency hardening may use:

- transaction-safe RPC booking creation
- PostgreSQL exclusion constraints
- advisory locks for therapist/time windows

### Idempotent Triggers

Workflow events should include an idempotency key such as:

- `booking_id + event_type + version`
- `booking_id + status_transition_id`

This prevents duplicate downstream records.

### Duplicate Booking Prevention

Use conflict detection and workflow review for:

- same patient, same therapist, same time
- accidental double-click submissions
- repeated recurring occurrence generation

### Historical Accuracy

Booking procedure snapshots protect history from changes in price lists.

Booking status history protects reschedule/cancellation/no-show meaning.

Finance documents later create their own immutable snapshots and should not rely only on mutable booking rows.

## Future Extensibility

The Booking Engine should support later:

- online booking requests
- external calendar sync
- WhatsApp/SMS/email automation
- waitlists
- resource/room management
- group bookings
- packages
- recurring bookings
- AI scheduling suggestions
- AI admin reminders
- medical aid pre-authorization checks
- outcome-measure scheduling

## Explicit Assumptions

- A booking always links to a patient record, including prospective patients.
- ICD-10 remains patient-level.
- Price list items are selected at booking time and snapshotted.
- Draft invoice creation is triggered by booking workflow readiness but implemented by the future Finance Engine.
- Session records are prepared by booking state but implemented by the future Session/Clinical Engine.
- Calendar UI will reuse the existing AlliDesk design system.
- RLS remains stricter than frontend permission checks.
- Super Admin has no default access to tenant booking data.

## Deferred Functionality

Not included in the first Booking Engine implementation:

- invoice engine
- payment workflows
- clinical notes
- Patient Link authentication
- live communication sending
- workflow automation execution
- external calendar sync
- online booking
- duplicate patient merging
- AI features
- group booking UI
- full recurrence UI

## Recommended Implementation Roadmap

### 1. Architecture

Complete and review this blueprint.

Confirm:

- lifecycle
- table scope
- scheduling rules
- finance trigger boundaries
- recurrence deferral strategy

### 2. Database

Create the first Booking Engine migration.

Recommended first tables:

- `bookings`
- `booking_procedures`
- `booking_status_history`

Add recurrence tables only if needed immediately.

### 3. Types

Regenerate Supabase TypeScript types.

Confirm generated types include Booking Engine tables and relationships.

### 4. Frontend

Build the Bookings foundation:

- booking list/calendar shell
- create booking form
- patient selector
- therapist selector
- location selector
- procedure selector
- conflict warnings

### 5. Integration

Connect booking events to:

- patient history
- draft invoice readiness
- Patient Link appointment updates
- future workflow events

Do not implement invoice confirmation in the Booking Engine.

### 6. Testing

Validate:

- tenant isolation
- permission behavior
- booking creation
- rescheduling
- cancellation
- no-show
- conflict detection
- patient history
- pricing snapshots
- build and regression safety


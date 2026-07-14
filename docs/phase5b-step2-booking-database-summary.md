# Phase 5B Step 2: Booking Database Foundation

## Summary

Phase 5B Step 2 implements the Booking Engine database foundation as a forward-only Supabase migration.

The migration follows the approved Phase 5B Step 1 architecture and preserves the established AlliDesk conventions:

- UUID primary keys
- tenant-scoped operational tables
- `created_at` / `updated_at`
- optional `created_by_profile_id` / `updated_by_profile_id`
- `deleted_at` soft-delete fields
- `set_updated_at()` triggers
- conservative RLS policies
- no frontend service-role access
- no normal hard-delete policies

No React pages, routes, calendar UI, booking forms, or application workflows were implemented in this step.

## Migration Created

`supabase/migrations/202607130001_phase5b_booking_engine.sql`

## Tables Created

### `bookings`

Main tenant-scoped booking record.

Supports:

- patient assignment
- therapist assignment
- location assignment
- price list context
- lifecycle status
- booking type and source
- appointment mode
- start and end time
- duration
- timezone
- room label
- patient-facing title and notes
- cancellation metadata
- no-show metadata
- check-in, in-progress, and completion timestamps
- session readiness
- draft invoice readiness
- Patient Link visibility readiness
- recurrence linkage
- metadata and soft delete

### `booking_procedures`

Stores selected procedure line items and immutable booking-level pricing snapshots.

Snapshots:

- source price list
- source price list item
- procedure name
- procedure code
- description
- unit price
- quantity
- discount amount
- adjustment amount
- line total
- duration minutes
- currency
- billable flag

This protects historical booking prices when Practice Price Lists change later.

### `booking_status_history`

Stores meaningful lifecycle and scheduling events.

Supports:

- status transitions
- reschedule trail
- old/new start and end time
- event reason
- patient-visible flag
- metadata

This is operational history for booking state, not a replacement for `audit_events`.

### `booking_recurrence_rules`

Stores future-ready recurrence series rules.

Supports:

- series booking ownership
- recurrence status
- RRULE string
- start/end dates
- timezone
- edit scope metadata

### `booking_occurrence_exceptions`

Stores recurrence occurrence-level changes.

Supports:

- cancelled occurrence
- rescheduled occurrence
- modified occurrence
- skipped occurrence
- original occurrence time
- replacement time
- optional linked materialized booking

### `booking_notes`

Stores separated booking notes.

This table exists so internal administrative notes do not need to live on the main `bookings` row where finance users may need booking visibility.

Supports:

- internal admin notes
- patient-facing notes
- reschedule notes
- cancellation notes
- no-show notes

### `booking_workflow_events`

Stores idempotent booking workflow readiness events.

Supports:

- booking created
- booking confirmed
- booking rescheduled
- booking cancelled
- patient checked in
- session started
- booking completed
- no-show recorded
- draft invoice ready
- Patient Link update ready
- communication ready

Each event has an `idempotency_key` to support future automation without duplicate downstream work.

## Relationships

Primary relationships:

- `bookings.tenant_id -> tenants.id`
- `bookings.patient_id -> patients.id`
- `bookings.therapist_profile_id -> therapist_profiles.id`
- `bookings.practice_location_id -> practice_locations.id`
- `bookings.price_list_id -> price_lists.id`
- `booking_procedures.booking_id -> bookings.id`
- `booking_procedures.price_list_id -> price_lists.id`
- `booking_procedures.price_list_item_id -> price_list_items.id`
- `booking_status_history.booking_id -> bookings.id`
- `booking_recurrence_rules.series_booking_id -> bookings.id`
- `bookings.recurrence_rule_id -> booking_recurrence_rules.id`
- `booking_occurrence_exceptions.recurrence_rule_id -> booking_recurrence_rules.id`
- `booking_notes.booking_id -> bookings.id`
- `booking_workflow_events.booking_id -> bookings.id`

## Lifecycle Fields

`bookings.booking_status` supports:

- `draft`
- `scheduled`
- `confirmed`
- `checked_in`
- `in_progress`
- `completed`
- `cancelled`
- `no_show`
- `rescheduled`

Lifecycle timestamp fields:

- `cancelled_at`
- `no_show_at`
- `checked_in_at`
- `in_progress_at`
- `completed_at`

The migration enforces basic lifecycle integrity:

- scheduled/non-draft records require start, end, and duration
- cancelled bookings require cancellation timestamp and reason
- no-show bookings require no-show timestamp
- checked-in/in-progress/completed states require appropriate timestamps
- completed bookings require completion timestamp

Complex transition rules remain an application or future RPC responsibility.

## Procedure Snapshot Strategy

`booking_procedures` snapshots selected price-list item values at booking time.

This ensures:

- old bookings do not change when price lists are edited
- future draft invoices can be generated from booking procedure snapshots
- reporting can rely on booking-time values
- invoice snapshots can later copy booking snapshots into immutable finance records

ICD-10 remains patient-level and is not stored on booking procedures.

## Recurrence Model

The migration implements a future-ready series and exception model:

- `booking_recurrence_rules` owns the recurrence rule.
- `bookings.recurrence_rule_id` can link materialized bookings to the rule.
- `booking_occurrence_exceptions` stores occurrence-level cancellations, modifications, and reschedules.

The migration does not generate recurring occurrences automatically. Occurrence generation remains a future application/RPC responsibility.

## Conflict-Prevention Strategy

The migration adds indexes to support efficient conflict checks:

- tenant/date range
- therapist/date range
- location/date range
- patient/date range
- active therapist overlap

No database-level exclusion constraint was added in this step.

Reason:

- the approved architecture allows conflict checking to begin in application logic
- Supabase/PostgreSQL exclusion constraints require careful range modelling and extension choices
- future high-concurrency hardening can introduce transaction-safe RPC functions or exclusion constraints once the frontend workflow exists

## Constraints

Key constraints include:

- valid booking status
- valid booking type
- valid booking source
- valid appointment mode
- start before end
- positive duration
- non-draft bookings require time fields
- cancelled bookings require reason and timestamp
- no-show bookings require timestamp
- procedure name is not blank
- procedure price and line totals are non-negative
- procedure quantity is positive
- recurrence RRULE is not blank
- recurrence date range is valid
- occurrence exception type is valid
- workflow event idempotency key is not blank

## Indexes

Indexes added for:

- booking tenant lookup
- calendar date range lookup
- therapist calendar lookup
- location calendar lookup
- patient calendar lookup
- status calendar lookup
- active therapist overlap lookup
- recurrence rule lookup
- booking procedure lookup
- status history lookup
- occurrence exception lookup
- booking note lookup
- workflow event status lookup
- workflow event idempotency uniqueness

## Functions And Triggers

No new database functions were created.

Reason:

- the architecture recommends transactional functions only where they materially improve integrity
- booking creation, conflict-aware scheduling, and recurrence generation need frontend/RPC workflow design before safe function boundaries are finalized

Triggers added:

- `bookings_set_updated_at`
- `booking_procedures_set_updated_at`
- `booking_status_history_set_updated_at`
- `booking_recurrence_rules_set_updated_at`
- `booking_occurrence_exceptions_set_updated_at`
- `booking_notes_set_updated_at`
- `booking_workflow_events_set_updated_at`

All use the existing `public.set_updated_at()` convention.

## RLS Policies

RLS is enabled on every new table.

### Booking Rows

- tenant members can read bookings
- admin, receptionist, and therapist users can create/update bookings
- no delete policy added

### Booking Procedures

- tenant members can read booking procedure snapshots
- admin, receptionist, and therapist users can create/update booking procedures
- no delete policy added

### Status History

- tenant members can read
- admin, receptionist, and therapist users can create
- admin users can update for correction/soft maintenance
- no delete policy added

### Recurrence Rules And Exceptions

- tenant members can read
- admin, receptionist, and therapist users can create/update
- no delete policy added

### Booking Notes

- tenant members can read patient-visible notes
- admin, receptionist, and therapist users can read internal booking notes
- admin, receptionist, and therapist users can create/update notes
- finance-only users do not receive internal booking-note visibility

### Workflow Events

- tenant members can read workflow event readiness
- admin, receptionist, and therapist users can create events
- admin users can update event processing status
- no delete policy added

## Audit And History Integration

The Booking Engine migration prepares audit/history integration but does not automate it yet.

Prepared surfaces:

- `booking_status_history`
- `booking_workflow_events`
- `created_by_profile_id`
- `updated_by_profile_id`
- metadata fields

Future integration should write:

- `audit_events` for compliance-relevant changes
- `patient_history_events` for meaningful patient timeline updates
- `booking_workflow_events` for idempotent automation triggers

## Application-Layer Responsibilities

The application or future RPC functions must handle:

- conflict detection before save
- status transition validation beyond basic database checks
- recurrence occurrence generation
- editing one occurrence vs future occurrences vs entire series
- creating patient history events
- creating audit events
- creating draft invoices
- creating sessions
- updating Patient Link
- communication triggers
- preventing duplicate submissions
- calculating line totals when procedure quantities/discounts change

## Generated Types

Updated:

- `src/lib/database.types.ts`

Added generated-style entries for:

- `bookings`
- `booking_procedures`
- `booking_status_history`
- `booking_recurrence_rules`
- `booking_occurrence_exceptions`
- `booking_notes`
- `booking_workflow_events`

Also added relationship helper types for:

- bookings
- recurrence rules
- practice locations
- price list items

## Local Validation

### Build

Command:

```bash
npm run build
```

Result:

- passed
- existing Vite large chunk warning remains

### Supabase Migration Execution

Could not run local Supabase migration validation in this checkout.

Observed limitations:

- `npx supabase gen types typescript --local` failed because `supabase/config.toml` is not present.
- `npx supabase migration list` failed because the CLI requires a Supabase access token/login in this environment.

No risky workaround was attempted.

## Assumptions

- A booking always belongs to a patient, including prospective patients.
- Admin, receptionist, and therapist roles are booking-operational roles.
- Finance users need booking and procedure visibility for billing readiness, but not internal booking notes.
- Draft invoice creation is prepared through fields/events but remains a Finance Engine responsibility.
- Session creation is prepared through fields/events but remains a Session Engine responsibility.
- Recurrence is implemented as a foundation only; generation and editing logic comes later.

## Deferred Items

Deferred to later phases:

- booking UI
- calendar UI
- conflict-aware RPC functions
- recurrence generation
- session creation
- clinical notes
- draft invoice creation
- invoice confirmation
- payments
- Patient Link appointment rendering
- external calendar sync
- communication sending
- workflow automation execution
- AI scheduling suggestions


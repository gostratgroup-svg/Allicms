# Phase 5B Step 4: Booking Engine Integration and Workflow Hardening

## Summary

Phase 5B Step 4 hardens the Booking Engine frontend foundation without adding the Session Engine or Finance Engine. The work improves lifecycle correctness, status/workflow event integrity, patient-history integration, booking detail visibility, procedure snapshot stability, and calendar selection behaviour.

## Files Changed

- `src/pages/Bookings.tsx`
- `src/styles.css`
- `docs/phase5b-step4-booking-integration-hardening-summary.md`

## Booking Detail Experience

The booking workspace now shows a richer selected booking record, including:

- Patient
- Responsible party summary
- Therapist
- Location
- Start and end time
- Duration
- Booking type, source, and mode
- Current lifecycle status
- Stored procedure/pricing snapshot
- Stored booking total
- Patient-facing appointment information
- Restricted internal administrative notes for authorized roles only
- Created and updated metadata
- Status history
- Workflow event history

Finance-only users still do not query or receive restricted internal booking notes.

## Lifecycle Rules Hardened

Supported transitions are intentionally narrow:

- `draft -> scheduled`
- `scheduled -> confirmed`
- `confirmed -> checked_in`
- `scheduled -> cancelled`
- `confirmed -> cancelled`
- `scheduled -> no_show`
- `confirmed -> no_show`

The UI now blocks unsupported transitions, duplicate same-status submissions, and edits to terminal bookings.

Terminal booking statuses remain read-only in this foundation:

- `cancelled`
- `no_show`
- `completed`

Checked-in and in-progress bookings are not cancelled or rescheduled from the booking workspace yet. They require the future Session Engine workflow.

## Rescheduling Behaviour

Rescheduling is detected only when `start_at` or `end_at` changes. A simple note, mode, source, title, or metadata edit is no longer treated as a reschedule.

When a reschedule occurs:

- conflict detection is re-run
- old start/end time is recorded
- new start/end time is recorded
- `booking_status_history` receives a `booking_rescheduled` record
- `booking_workflow_events` receives a `booking_rescheduled` event
- `patient_history_events` receives a patient-facing booking rescheduled event
- existing procedure snapshots are preserved unless the user intentionally changes procedures

## Patient History Integration

The Booking Engine now writes meaningful events to `patient_history_events` for:

- `booking_created`
- `booking_confirmed`
- `booking_rescheduled`
- `booking_cancelled`
- `patient_checked_in`
- `no_show_recorded`

Patient history records are tenant-scoped, linked to the correct patient, reference the booking/status-history source, and include concise human-readable descriptions. Internal administrative notes are not copied into patient history.

## Workflow Event Names

Canonical booking workflow event names used by the frontend are:

- `booking_created`
- `booking_confirmed`
- `booking_rescheduled`
- `booking_cancelled`
- `patient_checked_in`
- `no_show_recorded`

Events are inserted with deterministic idempotency keys so repeated action submissions do not create duplicate workflow events.

## Procedure Snapshot Hardening

Procedure selections now preserve stored booking snapshots for existing line items:

- procedure name
- procedure code
- description
- unit price
- quantity
- duration
- currency
- line total

If the user changes the selected procedure, the selection intentionally becomes a new current price-list snapshot. Duplicate procedure line items are blocked; users should increase quantity instead.

## Conflict Detection

Frontend overlap detection remains active for therapist conflicts. It:

- excludes the current booking during edits
- treats exact end/start boundaries as non-overlapping
- ignores non-blocking terminal statuses
- blocks overlaps for active statuses

Blocking statuses are:

- `scheduled`
- `confirmed`
- `checked_in`
- `in_progress`

The database currently provides indexes but not an exclusion constraint or RPC for full concurrency safety. Concurrent booking conflicts may still need database-side hardening in a future step.

## Calendar UX Improvements

The selected booking now clears or moves to the first visible booking if the active filters/date range no longer include it. The selected booking record is easier to scan, and history sections are visible from the same workspace.

## Permissions

- Booking create/update/status actions require `tenant.bookings.manage`.
- Price list access uses `tenant.finance.view` or `tenant.practice.configure`.
- Internal booking notes are queried only for admin, receptionist, and therapist roles.
- Finance-only users can view permitted booking data without receiving restricted internal notes.
- RLS remains the security source of truth.

## Known Limitations

- Booking save remains a multi-step frontend workflow, not one database transaction.
- Database-level therapist conflict enforcement is not implemented yet.
- Location conflict checking is not enforced because location exclusivity is not yet modeled.
- Session, draft invoice, Patient Link automation, communication sending, and clinical workflows remain future modules.
- No drag-and-drop, recurrence UI, or month calendar was added.

## Validation

`npm run build` passed.

Vite still reports the known large chunk warning:

> Some chunks are larger than 500 kB after minification.

This warning does not block the build.

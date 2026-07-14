# Phase 5B Step 3: Booking Engine Frontend Foundation

## Summary

Phase 5B Step 3 replaced the Bookings placeholder with the first live Supabase-backed Booking Engine workspace. The implementation stays inside the existing authenticated app shell, uses the current tenant context, respects the existing permission foundation, and does not connect invoices, sessions, clinical notes, Patient Link authentication, communication automation, or localStorage prototype workflows.

## Files Changed

- `src/pages/Bookings.tsx`
- `src/styles.css`
- `docs/phase5b-step3-booking-frontend-summary.md`

## Route

The existing `/bookings` route now renders the live `BookingsPage` workspace.

## Data Sources Integrated

The page reads tenant-scoped data from:

- `patients`
- `therapist_profiles`
- `practice_locations`
- `price_lists`
- `price_list_items`
- `bookings`
- `booking_procedures`
- `booking_notes`

The page writes to:

- `bookings`
- `booking_procedures`
- `booking_notes`
- `booking_status_history`
- `booking_workflow_events`

All queries use the active tenant id and remain subject to Supabase RLS.

## UI Implemented

The Bookings area now includes:

- Tenant booking summary
- Day and week calendar foundation
- Date navigation
- Therapist, location, and status filters
- Booking list/detail selection
- New Booking flow for existing patients
- Edit Booking flow
- Patient selection
- Therapist selection
- Location selection
- Date, time, duration, type, source, and mode fields
- Patient-facing title and notes
- Internal administrative note field for permitted non-finance users
- Procedure and price list selection where pricing access is allowed
- Booking status action panel
- Setup-needed states when patients, therapists, or locations are missing
- Loading, error, empty, success, and read-only states

## Booking Data Operations

The frontend supports:

- Creating bookings
- Updating bookings before terminal status
- Creating procedure snapshots in `booking_procedures`
- Soft-archiving previous procedure snapshots when a booking is updated
- Creating or updating an internal admin note in `booking_notes`
- Recording booking status history
- Creating workflow event placeholders for future automation

## Status Handling

The form allows safe editable statuses:

- `draft`
- `scheduled`
- `confirmed`

Action buttons handle workflow status changes:

- `scheduled` to `confirmed`
- `confirmed` to `checked_in`
- `scheduled` or `confirmed` to `cancelled`
- `scheduled` or `confirmed` to `no_show`

Cancellation requires a cancellation reason. Terminal bookings are read-only in this foundation.

## Conflict Detection

The form checks for overlapping active bookings for the same therapist before saving. Blocking statuses are:

- `scheduled`
- `confirmed`
- `checked_in`
- `in_progress`

The conflict check is frontend-side only in this step. A future database constraint or RPC should harden this for concurrent users.

## Procedure Snapshots

When a procedure is selected from a price list, the booking stores a snapshot of:

- price list
- price list item
- procedure name
- procedure code
- description
- unit price
- quantity
- line total
- duration
- currency

This prepares the booking for future invoice generation without connecting the Finance Engine yet.

## Permission Handling

- Booking create/update/status actions require `tenant.bookings.manage`.
- Price list access uses `tenant.finance.view` or `tenant.practice.configure`.
- Internal booking notes are shown only for admin, receptionist, and therapist roles.
- Finance-only users do not see internal booking notes.
- Users without booking manage access can view permitted booking data in read-only mode.

## Important Limitations

- Saves are currently multi-step frontend operations, not a single transaction.
- If a later insert fails after the booking row is saved, partial data may exist and should be reconciled manually.
- No invoice, statement, payment, or session workflow is created yet.
- No booking drag/drop or advanced calendar layout is implemented yet.
- No recurring booking UI is implemented yet.
- No patient creation is included in this step; patients must already exist through the Patient Engine.
- Workflow events are created as placeholders only. No automation worker consumes them yet.

## Validation

`npm run build` passed.

Vite still reports the existing chunk-size warning:

> Some chunks are larger than 500 kB after minification.

This warning does not block the build and should be addressed later with route-level code splitting.

## Next Recommended Step

Proceed to Booking Engine hardening or the next approved integration step:

1. Add database/RPC-level conflict protection.
2. Introduce booking detail tabs if the workspace grows.
3. Connect booking completion/session workflows.
4. Connect draft invoice creation from booking procedure snapshots.
5. Add Patient History event integration once Booking-to-Patient timeline rules are approved.

# Phase 5C Step 3: Session Engine Frontend Summary

## Executive Summary

Phase 5C Step 3 implements the first live Supabase-backed frontend foundation for the AlliDesk Session Engine.

The new workspace allows authorized tenant users to create sessions from eligible bookings, view existing sessions, start/pause/resume/cancel/no-show/complete/reopen sessions, manage delivered procedure snapshots, view lifecycle and workflow history, and manage non-clinical operational notes.

No Clinical Notes Engine, Draft Invoice Engine, invoice screens, payments, Patient Link authentication, communication sending, or automation execution was implemented.

## Files Changed

- `src/pages/Sessions.tsx`
- `src/routes/appRoutes.tsx`
- `src/pages/Bookings.tsx`
- `docs/phase5c-step3-session-frontend-summary.md`

## Route Added

Added a hidden Bookings child route:

`/bookings/sessions`

The route is intentionally not added to the main navigation. It is accessed from the Bookings workspace through a `Session Workspace` link for confirmed, checked-in, and in-progress bookings.

## Page Created

### `SessionsPage`

The page includes:

- session queue
- eligible booking queue
- search and status filter
- session overview
- patient and booking context
- lifecycle actions
- delivered procedure management
- completion form
- reopen workflow
- operational note editor
- status history
- workflow events
- links back to Bookings, Patients, and Finance

## Booking-To-Session Creation Flow

Eligible bookings appear in the session queue when:

- the booking belongs to the active tenant
- the booking has a patient
- the booking has an active therapist
- the location is valid when present
- the booking is not draft, rescheduled, completed, cancelled, or no-show
- the booking does not already have a session
- the patient is not archived

Session creation uses:

`create_session_from_booking()`

The UI safely handles idempotent responses:

- if a new session is created, it opens that session
- if the session already exists, it opens the existing session
- duplicate session creation is not attempted from the frontend

## Lifecycle Actions Implemented

Implemented:

- not started / ready / reopened -> in progress
- in progress -> paused
- paused -> in progress
- eligible active session -> cancelled
- eligible active session -> no-show
- in progress / reopened session -> completed through RPC
- completed -> reopened through RPC

RPCs used:

- `create_session_from_booking()`
- `complete_session()`
- `reopen_completed_session()`

Start, pause, resume, cancel, and no-show are implemented with direct table updates plus status history, workflow events, patient history, and booking synchronization where appropriate. These should become RPC-backed in the next integration-hardening step.

## Completion Workflow

The completion form captures:

- actual start
- actual end
- attendance outcome
- session outcome
- operational summary

Validation includes:

- selected session required
- actual start required
- actual end required
- actual end must be after actual start
- attendance outcome required
- session outcome required
- at least one active billable delivered procedure required
- cancelled/no-show sessions cannot be completed

Completion uses `complete_session()` and refreshes:

- session row
- linked booking row
- delivered procedures
- status history
- workflow events
- operational notes

The UI clearly states that completion records draft-invoice readiness only. Invoice creation remains deferred to the Finance Engine.

## Delivered Procedure Behaviour

The session workspace loads `session_procedures`.

Authorized users can:

- view delivered procedure snapshots
- edit procedure name/code/description indirectly through fields
- change quantity
- change price where pricing access is available
- add delivered procedures from active price-list items where pricing access is available
- remove undelivered procedures through soft archive
- record a change reason when procedure data differs from booking
- view final session total

Procedure values are not refreshed from current price lists after creation. Existing session snapshots remain stable.

## Operational Notes

Operational notes use `session_notes`.

Implemented behaviour:

- non-clinical internal operational note editing
- note creation and update
- clearing an existing note soft-archives it using `deleted_at`
- finance-only users do not query internal notes
- internal notes are not copied to patient history

Clinical process notes remain explicitly out of scope.

## Booking Synchronization

The workspace keeps booking and session state aligned without making the booking row authoritative for actual treatment facts.

Implemented synchronization:

- starting a session may move the linked booking to `in_progress`
- cancelling a session may move the linked booking to `cancelled`
- no-show may move the linked booking to `no_show`
- completing a session is handled by the `complete_session()` RPC, which updates the booking to `completed` where safe

The Booking Engine remains authoritative for scheduled time. The Session Engine is authoritative for actual care-delivery time.

## Patient-History Events

The frontend creates patient-history entries for:

- session started
- session cancelled
- session no-show recorded
- session procedure set changed

The database RPCs create history for:

- session created
- session completed
- session reopened

History copy is concise and excludes:

- internal operational notes
- clinical content
- raw workflow metadata

## Status History And Workflow Events

The workspace displays:

- `session_status_history`
- `session_workflow_events`

Events are shown in readable form with event type, status, date, reason, and error message where present. Raw payload JSON is not displayed in the UI.

## Permission And Restricted-Data Behaviour

Permission behaviour follows the current authorization framework.

View access:

- bookings view
- clinical view
- finance view

Action access:

- booking manage or clinical manage for session operations
- admin/therapist for completion and reopen actions, matching the database RPC role checks

Restricted data handling:

- finance users can view financially relevant session and procedure facts
- finance-only users do not query `session_notes`
- internal notes are available only to admin, receptionist, and therapist roles
- clinical documentation is not loaded or implemented
- no service-role keys are used
- RLS remains the source of truth

## Loading, Validation, And Error Handling

The page includes:

- loading state
- no active tenant state
- Supabase not configured state
- permission/load errors
- no sessions / no eligible bookings empty state
- session creation error handling
- lifecycle action error handling
- completion validation errors
- procedure validation errors
- note save errors
- reopen validation errors
- success messages

RPC failures are surfaced as action errors.

## Known Limitations

- Start, pause, resume, cancel, and no-show are not yet backed by dedicated RPCs.
- Procedure updates are not transactional with history/workflow/patient-history creation.
- No direct route parameter opens a specific session yet.
- No full therapist-only assignment filtering is enforced in the frontend beyond permissions and RLS.
- Patient Link updates are represented as readiness flags/events only.
- Workflow events are recorded but not processed.
- Draft invoices are not created.
- Local Supabase migration execution was not verified in this environment because Docker was unavailable in the prior database step.

## Deferred Clinical Notes And Finance Integration

Deferred:

- Clinical Notes Engine
- clinical note templates
- AI note drafting
- draft invoice creation
- invoice confirmation
- payments
- statements
- medical aid claims
- Patient Link authentication
- patient communication sending
- automated reminders
- external integrations

## Validation

Completed:

- `npm run build` passed.

The existing Vite large chunk warning remains:

`Some chunks are larger than 500 kB after minification.`

No lint or test script is configured in `package.json`; no additional test framework was added.


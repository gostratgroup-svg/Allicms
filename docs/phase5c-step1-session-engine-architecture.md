# Phase 5C Step 1: Session Engine Architecture

## 1. Objective

The Session Engine defines how an AlliDesk booking becomes an operational and clinical encounter.

It sits between the completed Booking Engine and the future Clinical Notes and Finance engines. Its purpose is to record what actually happened during care delivery, without becoming a replacement for versioned clinical documentation or official finance records.

This document is architecture only. It does not create database tables, migrations, generated types, React components, routes, or UI.

## 2. Core Principles

### Booking Creates Intent, Session Records Delivery

A booking is the scheduled plan. A session is the record of care delivery.

The intended flow is:

```text
Booking
  -> Check-in
  -> Session ready
  -> Session started
  -> Clinical work
  -> Session completed
  -> Draft invoice readiness
  -> Patient history
  -> Patient Link update
  -> Workflow events
```

### Capture Once, Reuse Everywhere

Session data should be captured once and reused by:

- patient history
- Patient Link
- finance readiness
- dashboard tasks
- reporting
- workflow automation
- future AI summaries

### Clear Boundaries

The Session Engine owns operational delivery facts.

It does not own:

- appointment scheduling intent, which belongs to the Booking Engine
- versioned clinical notes, which belong to the future Clinical Notes Engine
- immutable invoices, which belong to the future Finance Engine
- patient demographics, which belong to the Patient Engine

### Privacy By Architecture

Finance users may need billing-relevant session facts, but must not receive clinical notes or restricted internal therapist content.

Super Admin users must not have default access to tenant session data.

## 3. Entity Relationships

The primary relationship should remain one booking to one session.

```text
tenant
  -> patient
    -> booking
      -> booking_procedures
      -> session
        -> session_procedures
        -> session_status_history
        -> session_notes
        -> session_workflow_events
        -> future clinical_notes
        -> future invoice
```

### Core Relationships

| Entity | Relationship |
| --- | --- |
| `sessions` | Tenant-scoped record of care delivery. |
| `bookings` | One booking should map to zero or one session until created, then one session. |
| `patients` | Every session belongs to one patient. |
| `therapist_profiles` | A session has a responsible therapist and may later support supervising or substitute therapists. |
| `practice_locations` | A session may happen at a location, room, venue, or virtually. |
| `booking_procedures` | Session procedures inherit from booking procedure snapshots. |
| `patient_history_events` | Meaningful session lifecycle events create patient timeline records. |
| `audit_events` | Security and compliance changes create audit records. |

## 4. Recommended Data Model

The first Session Engine database step should create only tables required to support session lifecycle and completion readiness.

### `sessions`

Purpose:

Stores the main tenant-scoped session record.

Recommended fields:

- `id`
- `tenant_id`
- `booking_id`
- `patient_id`
- `therapist_profile_id`
- `practice_location_id`
- `session_status`
- `attendance_outcome`
- `session_type`
- `session_modality`
- `session_outcome`
- `scheduled_start_at`
- `scheduled_end_at`
- `actual_start_at`
- `actual_end_at`
- `actual_duration_minutes`
- `timezone`
- `room_label`
- `summary`
- `internal_operational_notes`
- `completed_at`
- `completed_by`
- `cancelled_at`
- `cancelled_by`
- `no_show_at`
- `reopened_at`
- `reopened_by`
- `reopen_reason`
- `draft_invoice_requested_at`
- `draft_invoice_request_status`
- `metadata`
- `created_at`
- `updated_at`
- `deleted_at`

Design notes:

- `booking_id` should be unique where `deleted_at is null` to preserve one active session per booking.
- `patient_id`, `therapist_profile_id`, and `practice_location_id` should be copied from the booking at creation for query efficiency and historical clarity.
- `scheduled_start_at` and `scheduled_end_at` should snapshot booking times at session creation.
- Actual start and end times belong to the session and should not overwrite booking schedule fields.

### `session_procedures`

Purpose:

Stores the final delivered procedure set used for completion and future draft invoice readiness.

Recommended fields:

- `id`
- `tenant_id`
- `session_id`
- `booking_procedure_id`
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
- `change_reason`
- `metadata`
- `created_at`
- `updated_at`
- `deleted_at`

Design notes:

- Session procedures should initially copy booking procedure snapshots.
- Final delivered procedures may differ from booked procedures, but changes must be recorded.
- Historical pricing accuracy is protected by storing snapshot fields on session procedures.

### `session_status_history`

Purpose:

Tracks meaningful lifecycle transitions without relying only on the current `sessions.session_status`.

Recommended fields:

- `id`
- `tenant_id`
- `session_id`
- `booking_id`
- `patient_id`
- `from_status`
- `to_status`
- `transition_reason`
- `transitioned_by`
- `transitioned_at`
- `metadata`
- `created_at`

Design notes:

- Append-only by design.
- Should not soft-delete under normal workflow.
- Used for auditability, timeline reconstruction, and workflow idempotency.

### `session_notes`

Purpose:

Stores non-clinical session notes only when a separate table is justified by visibility and note-type needs.

Recommended fields:

- `id`
- `tenant_id`
- `session_id`
- `note_type`
- `body`
- `visibility`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`
- `deleted_at`

Design notes:

- This table should not store formal clinical process notes.
- Suggested note types:
  - `operational`
  - `planning`
  - `patient_facing_feedback`
- Patient-facing feedback must be explicitly marked and should later integrate with the Clinical Notes or Communication engine.
- Internal process notes remain restricted to clinical/admin roles.

### `session_workflow_events`

Purpose:

Stores idempotent workflow event records for automation readiness.

Recommended fields:

- `id`
- `tenant_id`
- `session_id`
- `booking_id`
- `patient_id`
- `event_type`
- `event_key`
- `status`
- `occurred_at`
- `processed_at`
- `error_message`
- `metadata`
- `created_at`
- `updated_at`

Design notes:

- `event_key` should support idempotency, for example `session_id:event_type:version`.
- Workflow execution can be added later without changing the Session Engine event language.

### `session_corrections`

Purpose:

Optional future table for corrections after completion.

This table is justified if completed sessions can be reopened and materially changed.

Recommended fields:

- `id`
- `tenant_id`
- `session_id`
- `correction_type`
- `reason`
- `before_snapshot`
- `after_snapshot`
- `created_by`
- `created_at`

Initial recommendation:

Defer this table unless Step 2 chooses to support structured corrections immediately. Reopen events can initially be captured in `session_status_history`, `audit_events`, and `metadata`.

## 5. Session Lifecycle

### Statuses

Recommended controlled `session_status` values:

- `not_started`
- `ready`
- `in_progress`
- `paused`
- `completed`
- `cancelled`
- `no_show`
- `reopened`

### Attendance Outcomes

Recommended `attendance_outcome` values:

- `attended`
- `partial_attendance`
- `cancelled`
- `no_show`
- `rescheduled_before_start`
- `not_recorded`

### Session Outcomes

Recommended `session_outcome` values:

- `completed_as_planned`
- `completed_with_changes`
- `follow_up_required`
- `report_required`
- `feedback_required`
- `referred_on`
- `cancelled`
- `no_show`

## 6. State Transitions

| From | To | Who May Transition | Notes |
| --- | --- | --- | --- |
| none | `not_started` | System or booking manager | Created from booking. |
| `not_started` | `ready` | Receptionist, therapist, admin | Usually after check-in or session preparation. |
| `ready` | `in_progress` | Therapist, admin | Actual start time should be set. |
| `in_progress` | `paused` | Therapist, admin | Optional for interruptions. |
| `paused` | `in_progress` | Therapist, admin | Resume session. |
| `in_progress` | `completed` | Therapist, admin | Requires completion rules. |
| `ready` | `no_show` | Receptionist, therapist, admin | Records no-show outcome. |
| `not_started` | `cancelled` | Receptionist, admin, therapist where allowed | Used when session will not happen. |
| `ready` | `cancelled` | Receptionist, admin, therapist where allowed | Used before clinical work starts. |
| `completed` | `reopened` | Admin or therapist with elevated permission | Requires reason and correction trail. |
| `reopened` | `completed` | Therapist, admin | Creates correction/completion event. |

### Terminal States

Terminal by default:

- `completed`
- `cancelled`
- `no_show`

`completed` may be reopened only through an explicit correction workflow.

`cancelled` and `no_show` should not normally reopen into an active session. If care later occurs, create or reschedule a booking rather than mutating the terminal event.

### Reversible Transitions

Reversible with history:

- `in_progress` to `paused`
- `paused` to `in_progress`
- `completed` to `reopened`
- `reopened` to `completed`

Not normally reversible:

- `cancelled`
- `no_show`

## 7. Booking Integration

### Session Creation Timing

Recommended initial approach:

- Create the session at check-in or first session action, not at booking creation.
- Allow the Booking Engine to remain lightweight for future bookings.
- Prevent duplicate session creation with a unique active `booking_id` constraint.

Future option:

- Pre-create sessions for confirmed bookings if operational workflows need preparation, planning, or resource pre-allocation.

### One Booking To One Session

One booking should map to one active session.

Rules:

- A booking may have no session before check-in/start.
- A booking may have one active session after check-in/start.
- A booking should not have multiple active sessions.
- Group or recurring bookings should be handled as future extensions.

### Cancelled And No-Show Bookings

If a booking is cancelled before session creation:

- No session is required.
- Booking status history and patient history are sufficient.

If a session already exists:

- The session should transition to `cancelled` or `no_show`.
- The booking should reflect the compatible terminal status.

### Rescheduled Bookings

Before session creation:

- Rescheduling updates booking schedule only.

After session creation but before start:

- Session `scheduled_start_at` and `scheduled_end_at` may sync from the booking.
- Status history should record schedule sync.

After session start:

- Booking schedule should not be freely changed from the booking workspace.
- Actual treatment time is authoritative in the session.

### Authority Boundaries

| Concern | Authoritative Engine |
| --- | --- |
| Scheduled date/time | Booking Engine |
| Calendar visibility | Booking Engine, enriched by session status |
| Check-in readiness | Booking Engine and Session Engine together |
| Actual start/end/duration | Session Engine |
| Attendance outcome | Session Engine once session exists |
| Final delivered procedures | Session Engine |
| Official invoice status | Future Finance Engine |

## 8. Patient Integration

Sessions must link to the tenant-owned patient record.

During session work, authorized users may need:

- patient name and number
- date of birth or age
- patient status
- active alerts
- allergies
- relevant consents
- medical summary where permitted
- responsible party summary for billing readiness
- active ICD-10 code for finance readiness
- recent booking/session history

Restricted information rules:

- Finance-only users should not receive clinical notes, allergies, internal process notes, or restricted medical information unless explicitly permitted.
- Reception users may see operational safety alerts and attendance status, but not full clinical content by default.
- Patient Link must show only patient-facing session summaries, published feedback, and safe history events.

## 9. Therapist And Location Rules

### Therapist Assignment

The session should inherit the booking therapist.

If the therapist changes before the session starts:

- update the booking where appropriate
- update the session assignment if the session exists
- record status history/audit event

If a substitute therapist delivers the session:

- `therapist_profile_id` should represent the responsible delivering therapist
- future support may add `original_therapist_profile_id`, `substitute_reason`, or a session participants table

### Supervising Therapist

Future-ready support:

- supervision can be represented later by `session_participants`
- supervising therapists should not require redesigning `sessions`

### Location Assignment

The session should inherit:

- `practice_location_id`
- room or venue label
- appointment modality

Virtual sessions:

- may have `practice_location_id` null if the schema permits
- should store modality as `virtual` or `telehealth`
- should not expose meeting links broadly without a future secure communication model

### Cross-Location Access

Tenant isolation remains the main boundary.

If future enterprise tenants restrict staff by location, RLS or application permissions can add location membership rules without changing session ownership.

## 10. Clinical Documentation Boundary

The Session Engine should store:

- operational session status
- attendance outcome
- actual times and duration
- session summary
- non-clinical planning or operational notes
- patient-facing feedback readiness
- completion state
- procedure confirmation

The future Clinical Notes Engine should store:

- formal clinical notes
- versioned process notes
- assessment content
- therapy observations
- treatment plan details
- outcome measures
- AI-generated draft documentation
- signed clinical records

Boundary rule:

The session may point to clinical notes later, but should not become the clinical note store.

## 11. Procedure And Pricing Model

### Inherited From Booking

At session creation, copy booking procedure snapshots into session procedures.

Inherited fields:

- procedure name
- procedure code
- description
- unit price
- quantity
- line total
- duration minutes
- currency
- billable flag
- source price list item

### Changed During Session

Users with permission may adjust:

- delivered procedure set
- quantity
- billable state
- duration-related selection
- change reason

Rules:

- Never mutate historical booking procedure snapshots directly from the session.
- Session procedures become the final delivered procedure set.
- Procedure changes after completion require a correction trail.
- Finance later uses session procedures for draft invoice line generation.

### Historical Pricing Accuracy

Session procedures must keep their own snapshots. This protects completed sessions from later changes to price lists or booking procedure records.

## 12. Completion Rules

A session can be completed when required operational information is present.

Recommended blocking requirements:

- valid tenant
- active patient that is not archived
- linked booking unless explicitly marked as future walk-in support
- responsible therapist
- actual start time
- actual end time
- positive actual duration
- attendance outcome
- final procedure confirmation for billable sessions
- session outcome

Recommended warnings:

- missing or incomplete intake
- missing consent
- missing responsible party
- missing active ICD-10 code
- missing medical aid/dependant details where relevant
- missing patient-facing feedback
- missing future clinical note

Warnings should not always block completion. Different practices may complete sessions before documentation is finalized.

### Reopening Completed Sessions

Completed sessions may be reopened only by users with appropriate permission.

Reopening requires:

- reason
- timestamp
- actor
- status history event
- audit event
- clear downstream finance handling

If an invoice has already been confirmed, later session corrections must not silently alter the invoice. Finance corrections should happen through credit note, adjustment, or replacement invoice workflow later.

## 13. Finance Trigger Readiness

On completion, the Session Engine should prepare the platform for draft invoice creation.

Recommended behaviour:

- Create a workflow event such as `draft_invoice_requested`.
- Set `draft_invoice_request_status` on `sessions` to a controlled value.
- Do not create official invoice records in the Session Engine.
- Let the future Finance Engine process idempotent draft invoice requests.

### Synchronous Or Asynchronous

Recommended:

- Initial implementation may create a synchronous readiness event.
- Future production implementation should use an asynchronous workflow/RPC/edge function for invoice generation.

### Idempotency

Draft invoice readiness must be idempotent.

Suggested key:

```text
session:{session_id}:draft_invoice_requested:v1
```

If the action runs twice, it should not create duplicate draft invoices later.

### Failure Handling

If draft invoice creation later fails:

- session remains completed
- workflow event records error state
- dashboard task appears for finance/admin
- patient history should not claim an invoice exists until Finance confirms creation

### Reopened Sessions

If a completed session is reopened before invoice confirmation:

- mark draft invoice readiness as stale or needs review
- Finance Engine can update the draft

If reopened after invoice confirmation:

- do not mutate confirmed invoice snapshots
- create financial correction workflow later

## 14. Patient History Integration

Patient history should receive meaningful, patient-safe operational events.

Recommended events:

- `session_created`
- `session_ready`
- `session_started`
- `session_paused`
- `session_resumed`
- `session_completed`
- `session_reopened`
- `session_cancelled`
- `session_no_show`
- `attendance_outcome_recorded`
- `session_procedures_changed`
- `draft_invoice_requested`

Avoid noisy field-level events.

Patient history descriptions should be concise and safe, for example:

- "Session completed with Nadia Botha."
- "Session marked no-show."
- "Session reopened for correction."

Internal clinical detail should not be copied into patient history.

## 15. Patient Link Integration

Patient Link should update from session events only when the information is safe and patient-facing.

Patient Link may show:

- completed session date
- therapist
- session type/modality
- published feedback
- invoice availability when Finance confirms it
- safe history events

Patient Link must not show:

- internal operational notes
- clinical process notes
- draft documentation
- restricted patient alerts
- audit events
- staff-only correction reasons

## 16. Workflow Events

Recommended session workflow events:

| Event | Patient History | Patient Link | Finance | Communication | Future Automation |
| --- | --- | --- | --- | --- | --- |
| `session_created` | Optional | No | No | No | Prepare workspace |
| `session_ready` | Optional | No | No | No | Notify therapist |
| `session_started` | Optional | No | No | No | Start timer/context |
| `session_paused` | No | No | No | No | Track interruption |
| `session_resumed` | No | No | No | No | Resume timer/context |
| `session_completed` | Yes | Yes if safe | Draft invoice readiness | Feedback reminder later | Documentation task |
| `session_reopened` | Yes | No | Mark invoice readiness stale | No | Correction workflow |
| `session_cancelled` | Yes | Yes if relevant | Cancel draft readiness | Cancellation notice later | Calendar cleanup |
| `session_no_show` | Yes | Optional | No-show fee readiness later | No-show notice later | Follow-up task |
| `session_procedures_changed` | Optional | No | Recalculate draft readiness | No | Finance review |
| `draft_invoice_requested` | Optional | No until invoice exists | Yes | No | Finance queue |

## 17. Security And RLS Considerations

### Tenant Ownership

Every Session Engine table must include `tenant_id`.

RLS policies must check tenant membership through the existing `tenant_users` model.

### Recommended Role Access

| Role | Session Access |
| --- | --- |
| Admin | Full tenant session access, excluding future sealed clinical-note rules where applicable. |
| Therapist | View and manage assigned sessions; view permitted patient context; complete own sessions. |
| Receptionist | View operational session state; check-in, no-show, cancel where permitted; no clinical notes. |
| Finance | View billing-relevant completed session facts and procedures; no clinical/internal notes. |
| Super Admin | No default access to tenant sessions. |
| Patient Link User | Read only explicitly patient-facing session output through a separate access model later. |

### Internal Note Visibility

Internal operational notes should be restricted to admin, therapist, and appropriate reception roles.

Clinical note content must be handled by the future Clinical Notes Engine with stricter rules.

### Finance-Only Access

Finance users may read:

- session id
- patient billing display reference where permitted
- session date
- responsible therapist
- final delivered procedure snapshots
- billable totals
- invoice readiness state

Finance users must not read:

- clinical notes
- internal therapist notes
- restricted alerts or allergies
- medical summaries not needed for billing

## 18. Audit Requirements

Use `audit_events` for compliance and security-relevant events:

- session created
- session started
- session completed
- session reopened
- session cancelled
- no-show recorded
- therapist changed
- location changed
- procedure set changed after session start
- completed session corrected
- draft invoice requested
- patient-facing feedback published later

Audit events should capture:

- actor
- tenant
- action
- table/entity
- record id
- timestamp
- metadata

Audit events are not patient history. Patient history is a human-readable patient timeline. Audit is a compliance trail.

## 19. Validation Rules

### Required Relationships

- `tenant_id` is required.
- `patient_id` is required.
- `booking_id` is required for initial implementation.
- `therapist_profile_id` is required for therapist-led sessions.
- `practice_location_id` is required for in-person sessions unless location rules allow virtual sessions without a location.

### Tenant Consistency

The session, booking, patient, therapist, location, and procedures must all belong to the same tenant.

### Time Rules

- `actual_end_at` must be after `actual_start_at`.
- `actual_duration_minutes` must be positive when supplied.
- Completion requires actual duration.
- Paused time support can be deferred unless timer accuracy is required immediately.

### Booking Status Rules

- Cancelled bookings cannot start sessions.
- No-show bookings cannot start sessions.
- Completed bookings should not be rescheduled from the booking workspace.
- Checked-in bookings can create or ready a session.

### Patient Rules

- Archived patients cannot start new sessions.
- Prospective patients can have sessions only if the practice allows it and intake warnings are acknowledged.
- Missing consents should warn or block based on future tenant configuration.

### Therapist Rules

- Inactive therapists cannot be assigned to new sessions.
- Existing historical sessions must preserve inactive therapist references.

### Procedure Rules

- Session procedure price cannot be negative.
- Quantity must be positive.
- Billable sessions should have at least one billable procedure.
- Missing price snapshots should block finance readiness but not necessarily block non-billable session completion.

### Duplicate And Concurrent Actions

- Only one active session per booking.
- Starting a session twice should be idempotent or rejected clearly.
- Completing a session twice should be idempotent.
- Concurrent procedure changes should use updated timestamps or future RPC transactions.

## 20. Scalability And Reliability

### Query Patterns

Efficient indexes should support:

- tenant session date ranges
- therapist session lists
- patient session history
- booking to session lookup
- status and completion queues
- draft invoice readiness queues

### Calendar Synchronization

Calendar remains booking-led.

Session state may enrich calendar cards:

- ready
- in progress
- completed
- no-show
- invoice readiness

The calendar should not become the source of actual session facts.

### Concurrency

Future high-volume production should move session transitions into database RPC functions to make:

- status transition validation atomic
- procedure snapshot creation atomic
- workflow event creation idempotent
- patient history creation consistent

### Offline And Mobile Readiness

The Session Engine should later support mobile-first therapist usage:

- quick start/complete actions
- offline draft notes or summaries
- delayed sync
- conflict resolution

Offline support must never bypass RLS or audit requirements when syncing.

### Analytics

Future reporting can use session data for:

- delivered session counts
- therapist utilization
- no-show rates
- cancellation rates
- actual versus scheduled duration
- procedure delivery trends
- documentation completion lag

## 21. Future Extensibility

The architecture should support:

- group sessions
- recurring therapy programmes
- co-therapists
- supervising therapists
- outcome measures
- AI session summaries
- AI documentation drafting
- voice-to-note workflows
- medical aid claim readiness
- Patient Link feedback publishing
- automated reminders
- task generation
- clinical note versioning
- mobile therapist workflow

These should be added through related tables and workflow events, not by overloading the base `sessions` table.

## 22. Explicit Assumptions

- Phase 5B Booking Engine remains the scheduling source of truth.
- The initial Session Engine will require a booking relationship.
- Walk-in or unscheduled sessions are future-ready but deferred.
- Draft invoice creation is not implemented in Phase 5C Step 1.
- Formal clinical notes are future Clinical Notes Engine work.
- Patient Link access uses a separate future access model and is not tenant-user based.
- Finance-only access requires table-level and policy-level separation from clinical content.
- Super Admin has no default tenant session access.

## 23. Deferred Functionality

Deferred from initial Session Engine implementation:

- standalone walk-in sessions
- group sessions
- recurring session series
- timer pause accounting
- therapist supervision workflow
- clinical note versioning
- AI-generated notes
- invoice generation
- payment collection
- Patient Link authentication
- automatic WhatsApp/email sending
- offline mobile sync
- medical aid claim submission
- formal correction invoices or credit notes

## 24. Recommended Implementation Roadmap

### Architecture

Completed by this document.

### Database

Create the foundational Session Engine migration:

- `sessions`
- `session_procedures`
- `session_status_history`
- `session_workflow_events`
- `session_notes` if justified for non-clinical notes and visibility separation

Add:

- tenant-scoped RLS
- conservative role policies
- indexes
- status constraints
- uniqueness for one active session per booking
- updated_at triggers

### Types

Regenerate Supabase database types and confirm:

- all Session Engine tables appear
- relationships are typed
- build passes

### Frontend

Implement a focused session workspace:

- open session from booking
- create/start session from checked-in booking
- display session status
- edit actual times
- confirm procedures
- complete session
- view status history

### Integration

Connect session events to:

- booking status synchronization
- patient history
- dashboard queues
- future finance readiness event
- safe Patient Link updates

Do not implement invoice generation inside the Session Engine.

### Testing

Validate:

- one session per booking
- no cross-tenant reads
- role visibility
- finance-only restrictions
- status transitions
- no-show and cancellation behaviour
- procedure snapshot integrity
- completion idempotency
- patient history creation
- workflow event idempotency

## 25. Completion Criteria For Phase 5C Step 1

Phase 5C Step 1 is complete when:

- the Session Engine architecture is documented
- boundaries with Booking, Patient, Clinical, Finance, and Patient Link are clear
- recommended entities are defined
- lifecycle and state transitions are explicit
- RLS and privacy requirements are documented
- implementation roadmap is ready for the database step


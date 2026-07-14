# Phase 5C Step 2: Session Engine Database Summary

## Executive Summary

Phase 5C Step 2 adds the Supabase database foundation for the AlliDesk Session Engine.

The migration creates the tables and integrity functions needed for a booking to become a session, for actual care-delivery facts to be recorded, and for completion to prepare downstream patient-history, Patient Link, workflow, and future Finance Engine events.

No React UI, routes, clinical notes, invoices, payments, statements, documents, or communication sending were implemented.

## Migration

Migration file:

`supabase/migrations/202607130002_phase5c_session_engine.sql`

## Tables Created

### `sessions`

Main tenant-scoped care-delivery record.

Stores:

- tenant ownership
- one booking relationship
- patient relationship
- therapist relationship
- location relationship
- scheduled context copied from the booking
- actual start/end/duration
- lifecycle status
- attendance outcome
- session type/modality/outcome
- completion metadata
- cancellation metadata
- reopen metadata
- draft invoice request readiness
- patient history readiness
- Patient Link update readiness

### `session_procedures`

Final delivered procedure set for the session.

Stores immutable session-level snapshots copied from booking procedure snapshots, including:

- source booking procedure reference
- price list references
- procedure name/code/description
- unit price
- quantity
- discounts/adjustments
- line total
- duration
- currency
- billable flag
- whether the line differs from the booking
- change reason

### `session_status_history`

Append-style lifecycle timeline for meaningful session transitions.

Tracks:

- session created
- ready
- started
- paused/resumed
- completed
- reopened
- cancelled
- no-show
- procedure-set changes
- draft invoice requests
- admin corrections

### `session_notes`

Non-clinical operational notes for sessions.

This table exists to keep note visibility separate from the main `sessions` row. Finance users can read session and procedure billing facts without receiving internal therapist notes.

Supported note types:

- operational
- planning
- patient-facing feedback
- other

Formal clinical notes remain deferred to the future Clinical Notes Engine.

### `session_workflow_events`

Idempotent workflow event table for future automation consumers.

Supports:

- patient history readiness
- Patient Link readiness
- draft invoice request readiness
- future communication readiness
- future workflow processing status

## Relationships

Core relationships:

- `sessions.tenant_id -> tenants.id`
- `sessions.booking_id -> bookings.id`
- `sessions.patient_id -> patients.id`
- `sessions.therapist_profile_id -> therapist_profiles.id`
- `sessions.practice_location_id -> practice_locations.id`
- `session_procedures.session_id -> sessions.id`
- `session_procedures.booking_procedure_id -> booking_procedures.id`
- `session_procedures.price_list_id -> price_lists.id`
- `session_procedures.price_list_item_id -> price_list_items.id`
- `session_status_history.session_id -> sessions.id`
- `session_status_history.booking_id -> bookings.id`
- `session_status_history.patient_id -> patients.id`
- `session_notes.session_id -> sessions.id`
- `session_workflow_events.session_id -> sessions.id`
- `session_workflow_events.booking_id -> bookings.id`
- `session_workflow_events.patient_id -> patients.id`

## One Booking To One Session Enforcement

The migration adds:

`sessions_one_active_per_booking_idx`

This partial unique index enforces one active, non-deleted session per booking.

The database allows a booking to have no session until check-in/start/session creation. Once a session exists, duplicate active session creation is blocked.

## Lifecycle Fields And Rules

`sessions.session_status` supports:

- `not_started`
- `ready`
- `in_progress`
- `paused`
- `completed`
- `cancelled`
- `no_show`
- `reopened`

Lifecycle integrity is enforced with check constraints for:

- valid session status
- valid attendance outcome
- valid session type
- valid modality
- valid outcome
- scheduled time ordering
- actual time ordering
- positive actual duration
- completed sessions requiring actual times, duration, attendance, completion timestamp, and outcome
- cancelled sessions requiring cancellation timestamp, reason, and cancellation attendance outcome
- no-show sessions requiring no-show timestamp and no-show attendance outcome
- reopened sessions requiring reopen timestamp and reason

Complex transition sequences remain RPC/application workflow responsibility. This avoids fragile database-only state machines while preserving strong terminal-state integrity.

## Procedure Snapshot Strategy

`session_procedures` is the session-level delivered procedure snapshot.

At session creation, `create_session_from_booking()` copies active `booking_procedures` rows into `session_procedures`.

This protects:

- historical procedure name/code/description
- price at the time of delivery
- quantity
- line total
- duration
- currency
- future invoice line generation

Future UI may add, remove, or adjust delivered procedures before completion. Material deviations should set `differs_from_booking = true` and require `change_reason`.

## Completion Strategy

The migration adds:

`public.complete_session(...)`

This RPC:

- verifies authenticated tenant role access
- locks the session row
- prevents duplicate completion
- rejects cancelled/no-show sessions
- validates actual start and end times
- validates completion outcome
- requires attended or partial attendance
- requires at least one active billable session procedure
- calculates actual duration
- marks the session completed
- records status history
- creates idempotent workflow events
- creates a patient history event
- marks the linked booking completed where safe
- marks draft invoice readiness without creating an invoice

The RPC returns:

- `session_id`
- `completed_session`
- `draft_invoice_requested`
- `session_status`

## Reopen And Correction Strategy

The migration adds:

`public.reopen_completed_session(...)`

This RPC:

- verifies role access
- requires a reopen reason
- only allows completed sessions to reopen
- records reopen timestamp and actor
- records status history
- creates workflow event
- creates patient history event
- marks draft invoice readiness as stale when a draft or processed invoice request exists

The function does not delete previous completion facts. Corrections remain auditable.

If a future confirmed invoice exists, finance corrections must happen through the future Finance Engine. The Session Engine must not silently mutate immutable finance snapshots.

## Session Creation Function

The migration adds:

`public.create_session_from_booking(...)`

This RPC:

- locks the booking row
- verifies tenant role access
- rejects cancelled/no-show bookings
- returns the existing session if one already exists
- creates a session from booking context
- copies active booking procedures into session procedure snapshots
- records session status history
- creates a workflow event
- creates a patient history event

The function is idempotent for repeated create-from-booking attempts.

## Functions And Triggers

### Timestamp Triggers

Added `set_updated_at` triggers for:

- `sessions`
- `session_procedures`
- `session_status_history`
- `session_notes`
- `session_workflow_events`

### Tenant Integrity Triggers

Added:

- `validate_session_tenant_integrity()`
- `validate_session_procedure_tenant_integrity()`

These validate that:

- session booking belongs to the same tenant
- session patient belongs to the same tenant
- session therapist belongs to the same tenant
- session location belongs to the same tenant
- session procedure belongs to the same tenant as its session
- source booking procedure belongs to the same tenant

## Canonical Workflow Event Names

Session workflow events support:

- `session_created`
- `session_ready`
- `session_started`
- `session_paused`
- `session_resumed`
- `session_completed`
- `session_reopened`
- `session_cancelled`
- `session_no_show_recorded`
- `session_procedures_changed`
- `draft_invoice_requested`
- `patient_history_ready`
- `patient_link_update_ready`
- `communication_ready`

Workflow event idempotency is enforced through a unique partial index on:

`tenant_id, idempotency_key`

## Patient-History Integration

The session RPCs create patient history events for:

- session created
- session completed
- session reopened

Future session UI/status actions should add patient history for:

- session started
- session cancelled
- no-show recorded
- material procedure changes

Internal note content and clinical detail must not be copied into patient history.

## Draft-Invoice Request Readiness

The Session Engine does not create invoices.

On completion, `complete_session()`:

- sets `draft_invoice_requested_at`
- sets `draft_invoice_request_status = requested`
- creates an idempotent `draft_invoice_requested` workflow event
- marks the linked booking `draft_invoice_ready = true`

The future Finance Engine will consume this state and create draft invoice records.

## Constraints

Important constraints include:

- one active session per booking
- valid session statuses
- valid attendance outcomes
- valid session types and modalities
- valid session outcomes
- valid draft invoice request statuses
- actual and scheduled time order
- positive actual duration
- terminal-state timestamp requirements
- nonblank cancellation/reopen reasons
- nonnegative procedure price/discount/line totals
- positive procedure quantity
- three-character currency codes
- change reason required when procedure differs from booking
- nonblank session note bodies

## Indexes

Indexes support:

- tenant/status/date session queues
- therapist session queues
- patient session timeline queries
- booking-to-session lookup
- location/date queries
- actual start queries
- completion date queries
- draft invoice readiness queues
- session procedure lookup
- source booking procedure lookup
- status-history review
- session note lookup
- workflow-event consumption
- workflow idempotency

## RLS Policies

RLS is enabled on every new table.

### Sessions

- tenant members can read sessions
- admin/receptionist/therapist can create sessions
- admin/receptionist/therapist can update sessions

The main `sessions` row intentionally contains operational and finance-relevant facts only. Clinical content is not stored here.

### Session Procedures

- tenant members can read session procedure snapshots
- admin/receptionist/therapist can create/update session procedures

Finance users can read these records through tenant membership because they are billing-relevant.

### Session Status History

- tenant members can read status history
- admin/receptionist/therapist can create status history
- admin can update status history

### Session Notes

- tenant members can read only patient-facing notes
- admin/receptionist/therapist can read internal notes
- admin/receptionist/therapist can create/update notes

Finance-only users do not receive internal session-note visibility.

### Session Workflow Events

- tenant members can read workflow events
- admin/receptionist/therapist can create workflow events
- admin can update workflow events

## Security Boundaries

The migration preserves these boundaries:

- Super Admin has no default access to tenant session data.
- Finance users can access billing-relevant session and procedure facts.
- Finance users cannot read internal session notes.
- Reception users can participate in operational session workflows but should not receive future clinical-note content.
- Clinical notes are not stored in the Session Engine.
- RLS remains the source of truth.
- No frontend service-role access is required.
- No normal hard-delete policy is added.

## Application-Layer Responsibilities

The database foundation intentionally leaves these responsibilities for future application or RPC work:

- full transition graph enforcement for every status move
- start/pause/resume/cancel/no-show RPCs
- session UI workflows
- detailed completion warnings for missing intake/consent/ICD-10
- visible therapist-only assignment rules
- location-based enterprise restrictions
- patient-facing visibility decisions for future Patient Link
- draft invoice creation and finance corrections
- clinical note versioning
- communication sending

## Generated Types

`src/lib/database.types.ts` was updated to include:

- `sessions`
- `session_procedures`
- `session_status_history`
- `session_notes`
- `session_workflow_events`
- `create_session_from_booking`
- `complete_session`
- `reopen_completed_session`

The repository currently maintains this generated-style file locally. Live Supabase type generation could not be verified without a Supabase access token in this environment.

## Local Validation

Supabase CLI linked-project verification could not run in this environment because the CLI requires an access token:

`LegacyPlatformAuthRequiredError: Access token not provided. Supply an access token by running supabase login or setting the SUPABASE_ACCESS_TOKEN environment variable.`

Local migration execution could not run because Docker is unavailable:

`Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?`

The migration was reviewed locally for:

- referential integrity
- tenant isolation
- RLS coverage
- soft-delete behaviour
- type surface alignment
- workflow idempotency
- finance/clinical separation

`npm run build` passed.

The existing Vite large chunk warning remains:

`Some chunks are larger than 500 kB after minification.`

## Assumptions

- The first Session Engine implementation requires a booking.
- Walk-in sessions are deferred.
- Admin, receptionist, and therapist roles may create/update sessions.
- Admin and therapist roles may complete/reopen sessions through RPCs.
- Finance can read session and procedure billing facts, but not internal notes.
- Future Clinical Notes Engine will own formal clinical documentation.
- Future Finance Engine will consume draft-invoice readiness events.

## Deferred Functionality

Deferred from this database foundation:

- Clinical Notes Engine
- invoice creation
- statement creation
- payment workflows
- Patient Link authentication
- session UI
- start/pause/resume/cancel/no-show RPCs
- therapist supervision tables
- group sessions
- walk-in sessions
- offline mobile sync
- AI documentation
- communication sending

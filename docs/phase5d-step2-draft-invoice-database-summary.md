# AlliDesk Phase 5D Step 2: Draft Invoice Database Summary

## Summary

Phase 5D Step 2 adds the Draft Invoice Engine database foundation. It converts the Session Engine's `draft_invoice_requested` workflow event into a tenant-scoped draft invoice record, stores immutable billing snapshots, supports draft review/editing, and confirms invoices with a final invoice number only when the user explicitly confirms the invoice.

This step is database-only. No frontend workflows, PDF generation, payments, statements, Patient Link rendering, claims, or communication delivery were implemented.

## Migration

Migration file:

`supabase/migrations/202607130004_phase5d_draft_invoice_engine.sql`

## Tables Created

### `invoice_number_sequences`

Stores tenant-scoped invoice numbering sequences.

Key behaviour:
- Draft invoices do not consume invoice numbers.
- Final invoice numbers are allocated transactionally during `confirm_invoice`.
- A tenant can later support additional sequence keys if needed.

### `invoices`

Stores invoice headers and invoice workflow state.

Important fields:
- `patient_id`
- `responsible_party_id`
- `booking_id`
- `session_id`
- `therapist_profile_id`
- `practice_location_id`
- `invoice_status`
- `draft_reference`
- `invoice_number`
- invoice dates and due date
- totals and balance fields
- review and reconciliation flags
- Patient Link readiness flags

Supported status values include:
- `draft`
- `review_required`
- `ready_to_confirm`
- `confirmed`
- `issued`
- `awaiting_payment`
- `partially_paid`
- `paid`
- `overdue`
- `cancelled`
- `voided`
- `written_off`

### `invoice_lines`

Stores invoice line items copied from billable `session_procedures`.

Each line stores:
- procedure name
- procedure code
- description
- patient ICD-10 snapshot
- quantity
- unit price
- discounts
- adjustments
- tax
- calculated totals
- source references for reconciliation

### `invoice_party_snapshots`

Stores the patient and responsible-party billing snapshot at invoice creation.

This protects historical invoice accuracy if the patient, responsible party, medical aid context, or contact details are later changed.

### `invoice_issuer_snapshots`

Stores the issuer snapshot at invoice creation.

This includes practice, therapist, location, bank, registration, branding, currency, and payment-term details.

### `invoice_status_history`

Stores status transitions and meaningful invoice lifecycle events.

This is intentionally append-friendly and supports future reporting, audit review, and Patient Link timelines.

### `invoice_workflow_events`

Stores idempotent invoice workflow events.

Examples:
- `draft_invoice_created`
- `invoice_number_allocated`
- `invoice_confirmed`
- `patient_link_update_ready`
- `communication_ready`
- `pdf_generation_ready`

## Relationships

The Draft Invoice Engine links to existing Phase 4 and Phase 5 foundations:

- `invoices.tenant_id` -> `tenants.id`
- `invoices.patient_id` -> `patients.id`
- `invoices.responsible_party_id` -> `responsible_parties.id`
- `invoices.booking_id` -> `bookings.id`
- `invoices.session_id` -> `sessions.id`
- `invoices.therapist_profile_id` -> `therapist_profiles.id`
- `invoices.practice_location_id` -> `practice_locations.id`
- `invoice_lines.invoice_id` -> `invoices.id`
- `invoice_lines.source_session_procedure_id` -> `session_procedures.id`
- `invoice_lines.source_booking_procedure_id` -> `booking_procedures.id`
- `invoice_lines.source_price_list_item_id` -> `price_list_items.id`

No patient, booking, session, or practice records are duplicated as live records. Only immutable invoice snapshots are copied.

## Session Event Contract

The Draft Invoice Engine preserves the Session Engine contract:

1. A session is completed.
2. The Session Engine writes a `draft_invoice_requested` event to `session_workflow_events`.
3. `create_draft_invoice_from_session(session_id)` consumes that event.
4. A draft invoice is created once for that session.

If a draft or active invoice already exists for the session, the RPC returns the existing invoice instead of creating a duplicate.

## RPCs Added

### `create_draft_invoice_from_session(target_session_id uuid)`

Creates or returns the draft invoice for a completed session.

Behaviour:
- Requires tenant `admin` or `finance` role.
- Requires the session to be completed.
- Requires a `draft_invoice_requested` session workflow event.
- Requires at least one billable `session_procedure`.
- Copies billable procedures into invoice lines.
- Snapshots patient/responsible-party details.
- Snapshots practice/therapist/location/bank/branding details.
- Writes invoice status history.
- Writes invoice workflow events.
- Writes a patient history event.

If required billing context is missing, the invoice is created with `review_required` instead of `draft`.

### `confirm_invoice(target_invoice_id uuid)`

Confirms a draft invoice and allocates its official invoice number.

Behaviour:
- Requires tenant `admin` or `finance` role.
- Is idempotent for already-confirmed invoices.
- Blocks invoices with `reconciliation_required = true`.
- Requires at least one invoice line.
- Requires a due date.
- Recalculates totals before confirmation.
- Locks and increments the tenant invoice sequence transactionally.
- Sets `confirmed_at`.
- Writes status history and workflow events.
- Marks the invoice as ready for Patient Link update.
- Writes a patient-visible history event.

## Totals and Financial Precision

Invoice line totals are calculated by database trigger:

`line_total = quantity * unit_price - discount_amount + adjustment_amount + tax_amount`

Invoice totals are recalculated from invoice lines through:

`recalculate_invoice_totals(invoice_id)`

The design keeps totals deterministic and avoids relying on frontend calculations for financial state.

## Draft Editing and Reconciliation

The schema supports:
- draft edits before confirmation
- `differs_from_source`
- `manually_edited`
- `manual_edit_reason`
- `reconciliation_required`
- `reconciliation_reason`
- `session_reopened_at`

If a completed session is reopened in a later workflow, application logic can mark related draft invoices as requiring reconciliation before confirmation.

## Constraints and Indexes

Important constraints:
- UUID primary keys on all tables.
- Tenant foreign keys on all tenant-scoped records.
- Non-negative financial values.
- Valid currency code length.
- Valid invoice status values.
- Confirmed invoices must have `confirmed_at`, `invoice_number`, and `invoice_sequence_number`.
- Cancelled and voided invoices require reasons.
- No duplicate active primary session invoice per tenant/session.
- No duplicate invoice number per tenant.
- No duplicate workflow idempotency key per tenant.
- One party snapshot per invoice.
- One issuer snapshot per invoice.

Important indexes:
- tenant/status/date invoice queries
- patient invoice history queries
- responsible party invoice history queries
- session invoice lookup
- invoice due-date queries
- reconciliation queue
- invoice lines by invoice
- workflow queue/status queries

## RLS and Security

Row Level Security is enabled on all new tables.

Access is conservative:
- Tenant `admin` and `finance` users can read, create, and update invoice records.
- No hard delete policies are provided.
- Super Admin does not receive default tenant invoice access through these policies.
- The RPCs still validate tenant role access before doing work.

This preserves AlliDesk's POPIA foundation: Super Admin manages the platform, not tenant patient or billing data.

## Patient History

The RPCs write meaningful patient history events:
- `draft_invoice_created`
- `invoice_confirmed`

Confirmed invoice history is marked patient-visible for future Patient Link rendering. Draft invoice creation remains internal.

## TypeScript Types

`src/lib/database.types.ts` was updated to include:
- `invoice_number_sequences`
- `invoices`
- `invoice_lines`
- `invoice_party_snapshots`
- `invoice_issuer_snapshots`
- `invoice_status_history`
- `invoice_workflow_events`
- `create_draft_invoice_from_session`
- `confirm_invoice`
- `recalculate_invoice_totals`

These types are available for future frontend and service-layer integration, but no application workflows were connected in this step.

## Deferred Work

The following remain intentionally out of scope:
- payment capture
- payment allocation
- statements
- credit notes
- refunds
- medical aid claim files
- PDF invoice rendering
- WhatsApp/email/SMS delivery
- Patient Link invoice display
- invoice reminders
- finance dashboard integration
- frontend invoice editor

## Assumptions

- Session completion remains the source event for draft invoice creation.
- Billable session procedures are the source for initial draft invoice lines.
- ICD-10 remains patient-level and is snapshotted onto invoice lines at draft creation.
- Tenant finance users currently map to `admin` and `finance` roles through `has_tenant_role`.
- Future permission granularity can be layered above the database role checks without weakening RLS.

## Validation Notes

Validation performed for this step:
- SQL migration reviewed against existing Phase 4 and Phase 5 schemas.
- TypeScript database types updated in the existing local style.
- `npm run build` passed.
- `git diff --check` passed.

Local Supabase migration execution was attempted with `npx supabase db reset --local`, but the local Docker daemon was unavailable:

`Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?`

Apply the migration in a local Supabase stack after Docker Desktop is running, or through the linked Supabase development project using the normal reviewed migration workflow before connecting frontend invoice functionality.

# AlliDesk Phase 5D Step 4: Draft Invoice Integration and Workflow Hardening

## Summary

Phase 5D Step 4 hardens the Draft Invoice Engine frontend foundation created in Step 3.

The work focused on finance integrity, draft lifecycle safety, source traceability, validation before predictable backend failures, stale-state detection, confirmation verification, and clearer finance user experience.

No payments, statements, PDF generation, communication delivery, Patient Link invoice rendering, medical aid claims, credit notes, write-offs, accounting integrations, workflow automation execution, or AI finance review were implemented.

## Files Changed

- `src/pages/Finance.tsx`
- `src/styles.css`
- `docs/phase5d-step4-draft-invoice-integration-hardening-summary.md`

## Draft Creation Queue Hardening

The completed-session queue now:

- remains tenant-scoped
- only considers completed sessions with `draft_invoice_requested`
- opens an existing invoice instead of retrying creation when an invoice already exists
- keeps backend duplicate prevention as the source of truth
- surfaces missing context warnings directly in the queue

Queue warnings include:

- missing patient
- responsible-party review
- missing therapist
- location review
- no billable procedures
- missing draft request event
- previous draft creation failed
- session reopened

Repeated creation attempts still use `create_draft_invoice_from_session(...)`, preserving the database RPC as the authority.

## Session and Invoice Traceability

The invoice overview now displays clearer traceability:

- draft reference
- final invoice number
- source session link
- booking reference
- source workflow event reference
- patient link to the current Patients route
- therapist
- location
- created, updated, confirmed and due dates
- manual-edit state
- reconciliation state

A traceability boundary note was added to make clear that invoice edits update invoice snapshots only and never rewrite source session procedures.

## Lifecycle Rules Enforced

The frontend now uses stricter lifecycle checks for:

- `draft`
- `review_required`
- `ready_to_confirm`
- immutable states such as `confirmed`, `issued`, `awaiting_payment`, `paid`, `cancelled`, `voided`, and `written_off`

Hardening added:

- confirmed and cancelled invoices cannot be edited
- confirmed invoices cannot return to draft
- cancelled or voided invoices cannot be confirmed
- only `draft` and `review_required` invoices can be marked ready
- only `draft` and `ready_to_confirm` invoices can be sent to `confirm_invoice(...)`
- stale invoice status or timestamp changes trigger a refresh before writing

## Draft Editing Behaviour

Draft detail saves now:

- check for stale invoice state before writing
- block immutable invoices
- avoid unnecessary updates when there are no meaningful changes
- update manual-edit indicators only for actual changes
- write invoice status history only after a meaningful draft save
- verify history insert errors instead of reporting false success

Edited fields remain limited to approved invoice snapshot and draft fields:

- recipient snapshot
- issuer snapshot
- due date
- payment terms
- invoice notes stored in metadata
- manual edit reason

Patient Engine and Responsible Party source records are not updated by invoice snapshot edits.

## Invoice-Line Integrity

Invoice line hardening added:

- no-op line saves exit without database writes
- positive quantities are enforced
- unit price cannot be negative
- discount cannot be negative
- adjustment cannot be negative
- tax rate must be between 0 and 100
- line order must be positive
- discount cannot exceed the line amount
- edit reason is required when an existing line is meaningfully changed
- confirmed or cancelled invoice lines cannot be edited
- stale invoice state is checked before line update or removal
- soft removal uses `deleted_at`

Line edits still do not rewrite Session Engine procedures or Price List records.

## Authoritative Total Handling

The UI continues to display database-authoritative invoice totals from `invoices`:

- subtotal
- discount total
- adjustment total
- taxable amount
- tax total
- rounding adjustment
- invoice total
- amount paid
- balance due

After line saves or removals, the selected invoice is refreshed so the displayed totals come from the database recalculation trigger/function.

Frontend line preview totals are used only as temporary unsaved visual hints.

## Recipient Snapshot Behaviour

Recipient snapshot validation now blocks ready/confirm actions when required context is missing.

Checked fields include:

- patient snapshot name
- responsible party or billing email
- billing phone/address where present
- organisation where present

Confirmed recipient snapshots remain read-only.

Patient history is not polluted with private billing-contact values from draft edits.

## Issuer and Banking Boundaries

Issuer validation now blocks ready/confirm actions when required context is missing.

Checked fields include:

- issuer practice or therapist name
- issuer contact details
- banking snapshot name/account information
- currency
- payment terms

The Finance workspace does not query internal banking configuration tables for unauthorized users beyond the already-created invoice issuer snapshot. It does not expose secrets or credentials.

Confirmed issuer snapshots remain read-only.

## Ready-to-Confirm Validation

Before marking an invoice ready, the frontend validates:

- valid draft lifecycle state
- recipient completeness
- issuer completeness
- banking snapshot availability
- currency
- due date
- payment terms
- active invoice lines
- line validity
- non-negative totals
- reconciliation state
- user permission

The ready workflow uses an idempotent workflow-event key:

`invoice:{invoice_id}:invoice_ready_to_confirm:v1`

Duplicate workflow events are prevented or ignored safely.

## Confirmation Hardening

Before confirmation, the UI now:

- validates the same ready-to-confirm requirements
- checks stale state
- blocks reconciliation-required invoices
- blocks unsupported statuses
- requires explicit user confirmation in the modal

Confirmation still uses:

`confirm_invoice(invoice_id)`

After the RPC returns, the UI reloads the invoice and verifies:

- `invoice_status = confirmed`
- `invoice_number` exists

The UI no longer reports success merely because the RPC returned without a transport error.

## Invoice Number Behaviour

The frontend:

- shows draft references before confirmation
- shows final invoice numbers only after confirmed state is verified
- never predicts the next invoice number
- never allocates invoice numbers in the browser
- treats database/RPC confirmation as the numbering authority

Repeated confirmation remains protected by the backend RPC and frontend duplicate-submit disabling.

## Reconciliation-Required Handling

Reconciliation warnings are visible in:

- invoice filters
- invoice list
- invoice overview
- confirmation modal

Confirmation is blocked while `reconciliation_required = true`.

The UI does not regenerate unconfirmed drafts from reopened sessions. Existing invoice lines and manual edits are preserved until a user intentionally edits them.

Confirmed invoices remain immutable. Future credit-note or adjustment workflows remain deferred.

## Patient-History Behaviour

Patient history continues to rely on the backend RPC contract:

- draft invoice creation writes the internal draft-created history event
- invoice confirmation writes the patient-visible invoice-confirmed history event

The frontend does not create duplicate patient history events for line edits or snapshot edits.

## Canonical Status and Workflow Events

The read-only status and workflow panels continue to display canonical events with human-readable labels, including:

- `draft_invoice_created`
- `draft_invoice_updated`
- `draft_invoice_review_required`
- `invoice_ready_to_confirm`
- `invoice_number_allocated`
- `invoice_confirmed`
- `draft_invoice_cancelled`
- `invoice_reconciliation_required`

Raw payloads are not the primary UI.

## Permission and Restricted-Data Behaviour

The Finance workspace continues to use the existing authorization framework.

View access:

- `tenant.finance.view`
- `tenant.practice.configure`

Edit/confirm access:

- `tenant.finance.manage`

Restricted-data boundary maintained:

- no clinical notes queried
- no patient alerts queried
- no booking internal notes queried
- no session operational notes queried
- no service-role key used
- RLS remains authoritative

## Finance Workspace UX Improvements

Step 4 improved:

- queue context warnings
- selected invoice consistency after filter changes
- traceability labels
- readiness warnings before confirmation
- confirmation modal disabling when prerequisites are missing
- clearer source-session boundary copy
- scoped styling for queue warnings and trace notes

The Finance page was not redesigned.

## Validation and Error Handling

Additional validation added for:

- eligible completed session
- existing invoice recovery
- stale invoice state
- immutable invoice state
- recipient completeness
- issuer completeness
- banking snapshot
- due date
- currency
- payment terms
- positive quantities
- non-negative prices, discounts, adjustments and tax
- tax range
- discount limits
- active invoice lines
- lifecycle transitions
- reconciliation state
- confirmation result verification

Known errors are translated into user-facing messages rather than raw database details where possible.

## Code-Quality Changes

Added focused helpers for:

- money-safe parsing
- line preview totals
- meaningful invoice change detection
- meaningful line change detection
- draft queue context warnings
- line validation
- ready-to-confirm validation
- fresh invoice stale-state loading

No broad Finance architecture rewrite was performed.

## Database Corrections

No new database corrections were required in this step.

The existing Phase 5D Step 2 migration remains unchanged.

## Known Limitations

The Phase 5D migration must be applied to the active Supabase project before shared/live testing:

`supabase/migrations/202607130004_phase5d_draft_invoice_engine.sql`

The following could not be fully verified locally in this environment:

- live RPC execution
- RLS role behaviour
- invoice number sequence locking
- concurrent draft creation
- concurrent confirmation
- patient history creation from RPCs
- database recalculation triggers against live rows

Local Supabase migration execution previously required Docker Desktop, and the Docker daemon was unavailable.

## Deferred Functionality

Deferred:

- payment recording
- partial payments
- payment links
- statements
- PDF generation
- invoice email delivery
- WhatsApp delivery
- Patient Link invoice rendering
- medical aid claims
- credit notes
- write-offs
- accounting integrations
- workflow automation execution
- AI finance review

## Validation

Commands run:

- `npm run build`
- `git diff --check`

Result:

- Build passed.
- Diff whitespace check passed.
- Existing Vite large chunk warning remains.

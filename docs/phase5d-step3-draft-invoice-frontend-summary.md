# AlliDesk Phase 5D Step 3: Draft Invoice Frontend Summary

## Summary

Phase 5D Step 3 replaces the routed Finance placeholder with the first Supabase-backed Draft Invoice Engine workspace.

This step supports draft invoice creation from completed sessions, invoice review, draft-only editing, database-authoritative totals, ready-to-confirm state, invoice confirmation through the approved RPC, and read-only invoice lifecycle visibility.

Payments, statements, PDF generation, communication delivery, medical aid claims, Patient Link invoice rendering, credit notes, write-offs, refunds, and accounting integrations remain deferred.

## Files Changed

- `src/pages/Finance.tsx`
- `src/styles.css`
- `docs/phase5d-step3-draft-invoice-frontend-summary.md`

## Route

The existing `/finance` route now renders the live Draft Invoice workspace.

No new navigation items were added, and the existing app shell, route guard, tenant context, and permission-aware navigation remain unchanged.

## Draft Creation Queue

The Finance workspace now loads completed sessions that:

- belong to the active tenant
- have `session_status = completed`
- have a draft invoice request status of `requested`, `failed`, or `stale_after_reopen`
- have a `draft_invoice_requested` session workflow event

Each queue row shows:

- patient
- responsible party where available
- session date/time
- therapist
- location or room
- delivered billable procedure count
- session total
- draft request status

The queue uses:

`create_draft_invoice_from_session(session_id)`

Repeated actions open or return the existing invoice because the backend RPC and unique session invoice constraint remain the duplicate-prevention authority.

## RPCs Used

### `create_draft_invoice_from_session`

Used to create or recover draft invoices from completed sessions.

The UI translates known backend errors into user-friendly messages such as:

- session not ready
- missing billable procedures
- missing responsible party
- missing billing settings
- missing banking details
- duplicate action already recorded

### `confirm_invoice`

Used to confirm invoices and allocate the official invoice number.

The frontend does not allocate invoice numbers.

## Invoice List and Filters

The Finance workspace now loads tenant-scoped invoice records from `invoices`.

The list shows:

- invoice number or draft reference
- patient
- responsible party
- service date
- created date
- invoice status
- total
- balance due
- reconciliation-required indicator

Filters include:

- search
- status
- date range
- therapist
- location
- reconciliation required

## Invoice Detail Sections

The invoice detail workspace includes:

- Invoice Overview
- Recipient and Issuer Snapshot Review
- Invoice Lines
- Authoritative Totals
- Status History
- Workflow Events
- Confirmation Review Modal

The UI distinguishes:

- live links to patient/session context
- invoice snapshots
- draft-editable fields
- confirmed read-only state

## Recipient Snapshot Behaviour

Draft invoices allow editing approved invoice snapshot fields:

- patient name
- responsible party name
- relationship
- billing email
- billing phone
- billing address
- organisation name

These edits update `invoice_party_snapshots` only.

They do not rewrite Patient Engine or Responsible Party records.

Confirmed invoices are read-only.

## Issuer Snapshot Behaviour

Draft invoices allow editing approved issuer snapshot fields:

- practice display name
- practice email
- practice phone
- therapist name
- therapist practice number
- payment instructions
- invoice footer

These edits update `invoice_issuer_snapshots` only.

Confirmed invoices are read-only.

## Invoice Line Editing

Draft invoices support:

- editing procedure name
- editing procedure code
- editing description
- editing service date
- editing ICD-10 snapshot
- editing quantity
- editing unit price
- editing discount
- editing adjustment
- editing tax rate
- editing line order
- adding invoice-only manual lines
- soft-removing draft lines
- storing a draft change reason

Invoice line edits do not rewrite Session Engine procedures or Price List records.

The database remains responsible for saved line totals.

## Database-Authoritative Totals

The UI displays totals from `invoices` after every save:

- subtotal
- discount total
- adjustment total
- taxable amount
- tax total
- rounding adjustment
- total
- amount paid
- balance due

Frontend calculations are used only for temporary visual hints on unsaved line drafts.

Saved invoice totals are refreshed from Supabase after edits.

## Draft Lifecycle Actions

Supported lifecycle actions:

- save draft snapshot/details
- save invoice lines
- add manual line
- soft-remove draft line
- mark `draft` or `review_required` invoice as `ready_to_confirm`
- confirm eligible invoice via RPC

The UI blocks draft editing for:

- confirmed invoices
- issued/awaiting-payment/paid invoices
- cancelled invoices
- voided invoices

## Confirmation Flow

Before confirmation, the UI opens a review modal showing:

- recipient
- issuer
- line count
- total
- due date
- current status
- reconciliation warnings

Confirmation:

- calls `confirm_invoice`
- prevents duplicate submissions while saving
- refreshes invoice details afterwards
- displays the allocated final invoice number
- makes confirmed invoices read-only

PDF delivery, Patient Link invoice rendering, payment capture, and statements remain deferred.

## Reconciliation-Required Handling

Invoices with `reconciliation_required = true` show a visible warning in:

- invoice list
- invoice overview
- confirmation modal

The confirmation modal disables confirmation while reconciliation is required.

The UI does not silently regenerate invoice lines from the source session.

## Patient History Behaviour

The frontend relies on the Phase 5D Step 2 RPC contract:

- `create_draft_invoice_from_session` records the internal patient history event for draft invoice creation.
- `confirm_invoice` records the patient-visible invoice-confirmed history event.

The frontend does not directly write patient history for these RPC-backed actions to avoid duplicate history events.

Manual draft edits currently write invoice status history, not patient history.

## Permission and Restricted Data Behaviour

The workspace uses the existing authorization foundation.

View access:

- `tenant.finance.view`
- `tenant.practice.configure`

Edit/confirm access:

- `tenant.finance.manage`

The Finance screen does not query:

- clinical notes
- medical alerts
- booking notes
- session notes
- internal operational session notes
- service-role credentials

RLS remains the security authority.

## Loading, Validation, and Error Handling

Implemented states:

- finance workspace loading
- invoice detail loading
- no invoices
- no draft queue sessions
- draft creation failure
- draft save failure
- line save failure
- line removal failure
- confirmation failure
- permission failure
- reconciliation-required state

Implemented validation:

- due date required before saving draft details
- patient snapshot name required
- procedure name required
- quantity must be positive
- prices, discounts and tax cannot be negative
- at least one line required before ready/confirm actions
- confirmation blocked when reconciliation is required

Known database and RPC errors are translated into safer user-facing messages.

## Known Limitations

- Supabase RPC and RLS behaviour could not be fully exercised locally because local Supabase migration execution previously required Docker Desktop and the Docker daemon was unavailable.
- The workspace assumes the Phase 5D Step 2 migration has been applied to the active Supabase project before live use.
- Invoice metadata is used for `invoice_notes` because the Phase 5D database schema does not yet include a dedicated notes column.
- Payment, statement and PDF sections are intentionally not built in this step.
- Manual draft edits write invoice lifecycle history but do not yet create workflow automation events for every field-level change.
- Confirmed invoice delivery and Patient Link rendering are deferred.

## Deferred Functionality

Deferred to later phases:

- PDF invoice generation
- invoice email delivery
- WhatsApp invoice delivery
- Patient Link invoice rendering
- payment capture
- payment allocation
- partial payments
- statements
- credit notes
- write-offs
- medical aid claims
- accounting integrations
- AI finance review
- automated reminder schedules

## Validation

Commands run:

- `npm run build`

Result:

- Build passed.
- Existing Vite large chunk warning remains.

Additional validation still required in a Supabase environment:

- RPC execution against migrated database
- RLS behaviour per role
- concurrent draft creation
- concurrent confirmation
- invoice number sequence locking
- patient history event creation from RPCs
- tenant-isolation checks

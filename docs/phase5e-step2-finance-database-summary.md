# Phase 5E Step 2: Finance Workflow Database Summary

## Summary

Phase 5E Step 2 adds the database foundation for the finance workflow that begins after invoice confirmation.

This step extends the Phase 5D Draft Invoice Engine with invoice issuance, payment recording, payment allocation, partial-payment support, account-credit readiness, receipt readiness, payment history, payment workflow events, and database-authoritative balance maintenance.

No frontend UI, statements, Patient Link rendering, communication delivery, PDF generation, payment gateway integration, medical aid claim workflow, refunds, write-offs, or credit notes were implemented.

## Migration

Migration file:

`supabase/migrations/202607130006_phase5e_finance_workflow.sql`

This is a forward-only migration. Previous Phase 5D migrations were not modified.

## Tables Created

### `financial_accounts`

Tenant-scoped account grouping for patient, responsible-party, future organisation, and future medical aid accounts.

Supports:

- patient account
- responsible-party account
- future organisation account
- future medical aid account
- derived account balances
- statement grouping readiness

### `payments`

Stores historically auditable payment records.

Important fields include:

- tenant
- financial account
- patient
- responsible party
- optional primary invoice reference
- payer snapshot fields
- payment date
- amount
- allocated amount
- unallocated amount
- currency
- payment method
- payment reference
- external transaction reference
- practice bank, therapist and location context
- reconciliation status
- reversal metadata
- audit fields

Payments are soft-delete only and are corrected through reversal workflows rather than hard deletion.

### `payment_allocations`

Many-to-many allocation table between payments and invoices.

Supports:

- one payment allocated across many invoices
- many payments allocated to one invoice
- partial payments
- unallocated balances
- future overpayment and credit workflows

Allocations store amount, currency, allocation order, allocation timestamp, reversal metadata, idempotency key and tenant context.

### `account_credits`

Future-ready account-credit ledger.

Current use:

- records unallocated payment balances as available credit

Future use:

- overpayments
- manual credits
- credit notes
- refunds
- credit transfers, if explicitly authorized later

### `receipt_number_sequences`

Tenant-scoped receipt numbering sequence.

Receipts use their own sequence because receipts are distinct financial documents from invoices.

### `receipts`

Receipt readiness records generated from payments.

Stores:

- receipt number
- payment reference
- payer snapshot
- issuer snapshot
- allocation snapshot placeholder
- payment amount
- payment method
- receipt issue timestamp
- Patient Link, PDF, and communication readiness flags
- reversal metadata

Receipt PDF rendering and delivery are deferred.

### `payment_status_history`

Append-style payment status history.

Tracks:

- payment recorded
- payment allocated
- payment partially allocated
- payment unallocated
- payment reversed
- allocation reversed
- receipt created
- account credit created

### `payment_workflow_events`

Idempotent finance workflow events for future automation.

Canonical events include:

- `payment_recorded`
- `payment_allocated`
- `payment_partially_allocated`
- `payment_unallocated`
- `payment_reversed`
- `allocation_reversed`
- `account_credit_created`
- `receipt_created`
- `receipt_ready`
- `statement_ready`
- `medical_aid_remittance_ready`
- `payment_gateway_callback_ready`

## Invoice Extensions

The migration extends `invoices` with:

- `issued_at`
- `issued_by_profile_id`
- `payment_status`
- `collection_status`
- `payment_reconciliation_status`
- `last_payment_at`
- `overdue_since`

It also extends the invoice and invoice-event constraints to support post-confirmation workflow values.

Confirmed invoice snapshots remain immutable. Payments and allocations update payment/balance fields and statuses only.

## Relationships

Primary relationships:

- `financial_accounts.tenant_id` -> `tenants.id`
- `financial_accounts.patient_id` -> `patients.id`
- `financial_accounts.responsible_party_id` -> `responsible_parties.id`
- `payments.financial_account_id` -> `financial_accounts.id`
- `payments.patient_id` -> `patients.id`
- `payments.responsible_party_id` -> `responsible_parties.id`
- `payments.primary_invoice_id` -> `invoices.id`
- `payment_allocations.payment_id` -> `payments.id`
- `payment_allocations.invoice_id` -> `invoices.id`
- `account_credits.source_payment_id` -> `payments.id`
- `receipts.payment_id` -> `payments.id`

Tenant-integrity triggers validate that account, payment and allocation context belongs to the same tenant.

## RPCs

### `issue_invoice(target_invoice_id)`

Issues a confirmed invoice.

Behaviour:

- requires tenant `admin` or `finance`
- requires `invoice_status = confirmed`
- idempotently returns existing issued/awaiting-payment invoices
- sets issue timestamp and issuing actor
- sets invoice to `awaiting_payment`
- marks Patient Link update readiness
- writes invoice status history
- writes invoice workflow event
- writes patient history

### `record_payment(...)`

Records a payment and optionally applies invoice allocations.

Behaviour:

- requires tenant `admin` or `finance`
- validates payer, amount, currency and method
- creates payment
- records payment status history
- creates payment workflow event
- applies supplied allocations transactionally
- recalculates invoice balances
- recalculates payment allocated/unallocated totals
- creates receipt record and receipt number
- creates account credit for any remaining unallocated balance
- writes safe patient history
- returns payment id, receipt id, allocated amount, unallocated amount and status

### `allocate_payment(target_payment_id, allocations)`

Allocates an existing payment to one or more invoices.

Behaviour:

- requires tenant `admin` or `finance`
- locks the payment
- applies allocation JSON array
- validates invoice eligibility
- validates currency consistency
- prevents over-allocation beyond payment availability
- prevents allocation beyond invoice balance
- recalculates affected payment and invoice balances
- records workflow events and patient history

Expected allocation JSON shape:

```json
[
  {
    "invoice_id": "uuid",
    "amount": 780,
    "allocation_order": 1,
    "idempotency_key": "optional-key"
  }
]
```

### `reverse_payment(target_payment_id, reversal_reason_input)`

Reverses a payment and its active allocations.

Behaviour:

- requires tenant `admin` or `finance`
- requires reversal reason
- idempotently returns already-reversed payments
- reverses active allocations
- recalculates affected invoice balances
- marks related receipts reversed
- records payment status history
- records workflow events
- records safe patient history

### Internal Helpers

Internal helpers are revoked from direct authenticated execution:

- `recalculate_invoice_payment_balance`
- `recalculate_payment_allocation_totals`
- `create_receipt_for_payment`
- `apply_payment_allocations`
- tenant-integrity trigger functions

These helpers are used by approved RPCs and triggers only.

## Financial Calculations

Database-authoritative values:

- invoice `amount_paid`
- invoice `balance_due`
- payment `allocated_amount`
- payment `unallocated_amount`
- account-credit `remaining_amount`

All persisted money values use PostgreSQL `numeric`.

Frontend floating-point calculations remain non-authoritative.

## Receipt Numbering

Receipt numbers use `receipt_number_sequences`.

Default format:

`RCT-0001`

Allocation is transactional through row locking on the sequence row.

Receipts are generated once per payment through a unique active `payment_id` index.

## Payment Allocation Model

Allocations are the authoritative link between payments and invoices.

Rules enforced:

- allocation amount must be positive
- currency must match payment and invoice
- invoice must be confirmed/issued/awaiting/partially paid/paid/overdue/disputed eligible
- allocation cannot exceed payment availability
- allocation cannot exceed invoice balance
- active allocations recalculate invoice payment status
- allocation reversal restores invoice balances

## Credits

If a recorded payment has unallocated balance, an `account_credits` row is created.

This supports:

- overpayment readiness
- future allocation to new invoices
- future refunds
- future account-credit workflows

Credit application and refund execution remain deferred.

## RLS

RLS is enabled on:

- `financial_accounts`
- `payments`
- `payment_allocations`
- `account_credits`
- `receipt_number_sequences`
- `receipts`
- `payment_status_history`
- `payment_workflow_events`

Policies are conservative:

- tenant `admin` and `finance` users can read/create/update finance workflow records
- no anonymous access
- no hard-delete policies
- Super Admin does not receive default tenant finance access

RLS remains the source of truth.

## Workflow Events

Workflow events are tenant-scoped and idempotent where repeat actions can occur.

Events prepare later:

- Patient Link updates
- receipt PDF generation
- statements
- payment gateway callbacks
- medical aid remittance workflows
- communication delivery

## Status History

Payment status history is append-style.

Invoice status history is extended with post-confirmation finance events such as:

- `invoice_issued`
- `invoice_awaiting_payment`
- `invoice_partially_paid`
- `invoice_paid`
- `payment_allocated`
- `allocation_reversed`

## Indexes

Indexes support:

- tenant account lookup
- tenant payment date/status lookup
- patient and responsible-party payment history
- invoice allocation lookup
- payment allocation lookup
- external transaction duplicate protection
- receipt number uniqueness
- receipt lookup
- outstanding/overdue invoice lookup
- workflow event processing

## Assumptions

- `admin` and `finance` tenant roles are the only roles allowed to mutate finance workflow records in this milestone.
- Receipt records are created for payments immediately, but receipt PDF rendering is deferred.
- Account credits are created for unallocated payment balances, but credit application and refund workflows are deferred.
- `record_payment` is the preferred first workflow for payment capture; direct table mutation should remain secondary to RPC usage.
- Payment gateway callback idempotency will be layered onto this model later.

## Deferred Functionality

Deferred:

- frontend payment UI
- statement tables and statement generation
- Patient Link finance rendering
- PDF generation
- payment proof file uploads
- payment gateway integrations
- medical aid claims and remittances
- credit notes
- refunds
- write-offs
- accounting exports
- bank-feed imports
- AI reconciliation

## Validation Notes

Commands run:

- `npm run build` - passed.
- `git diff --check` - passed.
- `npx supabase db reset --local` - failed because Docker is not running/available in this environment.

Supabase CLI error:

```text
failed to inspect service: Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?
Docker Desktop is a prerequisite for local development.
```

The migration was therefore not executed against a local Supabase database in this environment. The SQL was authored to follow existing migration conventions and should be applied and verified in the Supabase development project before live workflow testing.

The existing Vite warning remains:

- the built JavaScript chunk is larger than 500 kB after minification.

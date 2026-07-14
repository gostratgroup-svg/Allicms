# Phase 5E Step 4: Finance Integration And Hardening Summary

## Summary

Phase 5E Step 4 hardens the Finance Workflow introduced in Step 3.

The work focused on invoice issuance integrity, payment recording, allocation correctness, reversal safety, account-credit consistency, receipt traceability, patient-history visibility, stale-state handling, permissions, and finance workspace usability.

This step did not implement statements, PDFs, Patient Link rendering, communication delivery, payment gateways, medical aid, refunds, credit notes, write-offs, disputes, accounting integrations, workflow automation, or AI finance review.

## Invoice Issuance Hardening

Invoice issuing remains limited to confirmed invoices.

Additional safeguards:

- reconciliation-blocked invoices cannot be issued from the UI
- invoice state is reloaded before issuing
- stale invoice status or timestamp blocks the action
- `issue_invoice(...)` is called as the only write path
- the invoice is reloaded after the RPC
- success is shown only after `issued_at` and a valid issued/payment-tracking status are verified
- invoice status history, workflow events, and patient-history verification are refreshed after issuing

Confirmed invoice snapshots and invoice lines remain read-only.

## Payment Recording Behaviour

Payment recording now validates:

- payer name
- positive payment amount
- valid payment date
- supported payment method
- three-letter currency code
- payment reference or external reference for EFT, card, online, and medical-aid methods
- financial account context against selected patient and responsible party
- duplicate active external transaction references in the currently loaded tenant workspace
- allocation eligibility before submission

Payments are still created only through:

- `record_payment(...)`

The UI does not split the transactional payment workflow into direct frontend table writes.

## Allocation Rules

Allocation validation now checks:

- positive allocation amount
- invoice exists in the active tenant
- invoice status is payment-eligible
- invoice has an outstanding balance
- invoice currency matches payment currency
- allocation does not exceed current invoice balance
- allocation total does not exceed available payment amount
- existing payment allocation to the same invoice is not duplicated

Supported flows:

- partial allocation
- full allocation
- one payment across multiple invoices
- multiple payments against one invoice
- allocation of existing unallocated payment balance

Existing payment allocations are still performed only through:

- `allocate_payment(...)`

## Balance And Status Verification

The UI continues to treat Supabase as the financial authority.

After payment recording and allocation, the frontend reloads and verifies:

- payment amount
- payment status
- allocated amount
- unallocated amount
- invoice amount paid
- invoice balance due
- receipt records
- account credits
- histories and workflow events

Frontend arithmetic is used only for validation and display previews.

## Reversal Workflow

Payment reversal now requires:

- finance manage permission
- selected payment not already reversed
- mandatory reversal reason
- browser confirmation
- fresh payment reload before calling the RPC
- stale-state check against payment status and `updated_at`

Payment reversals are performed only through:

- `reverse_payment(...)`

After reversal, the payment is reloaded and verified as:

- `payment_status = reversed`
- `reversed_at` present

Affected invoices, payment balances, allocations, receipts, workflow events, patient-history verification, and credits are refreshed.

Refunds are not implemented.

## Account Credits And Unallocated Payments

Unallocated payment balances and formal `account_credits` are visible to finance users.

Step 4 adds a forward-only migration:

- `supabase/migrations/202607130007_phase5e_reverse_account_credits.sql`

This corrects reversal behaviour so credits created from a reversed payment are marked `reversed` and their `remaining_amount` becomes `0`.

This prevents reversed payments from leaving usable account credits.

Transfers, refunds, credit expiry, and manual credit movement remain deferred.

## Financial Account Handling

The Accounts tab continues to show:

- account name
- account type and status
- linked patient
- linked responsible party
- outstanding balance from loaded invoice balances
- active credit balance from `account_credits`
- covered patient count

The frontend validates selected account context against selected patient and responsible party before recording a payment.

Clinical notes, booking notes, session notes, patient alerts, and operational notes are not loaded by the Finance workspace.

## Receipt Traceability

Receipts remain readiness records.

Receipt display includes:

- database-generated receipt number
- linked payment
- payer
- payment method
- issue date
- payment amount
- allocation count
- Patient Link readiness flag
- PDF readiness flag

The frontend never predicts a receipt number.

Receipt PDFs and delivery remain deferred.

## Patient History Behaviour

Finance-related patient history is displayed as read-only verification for:

- invoices
- payments
- payment allocations
- receipts

The Finance workspace only reads finance-related `patient_history_events` source tables and does not load clinical or operational history.

No bank-account details, external transaction secrets, internal finance notes, clinical notes, booking notes, or session notes are rendered from patient history.

## Canonical Workflow Events

The UI labels canonical events such as:

- `invoice_issued`
- `invoice_awaiting_payment`
- `invoice_partially_paid`
- `invoice_paid`
- `payment_recorded`
- `payment_allocated`
- `payment_partially_allocated`
- `payment_unallocated`
- `payment_reversed`
- `allocation_reversed`
- `account_credit_created`
- `receipt_created`
- `receipt_ready`

Events are displayed as human-readable audit/workflow records. Raw payloads are not the primary UI.

Workflow automation execution remains deferred.

## Overdue Handling

Overdue presentation remains derived from:

- `due_date`
- `balance_due`
- invoice status

Paid, cancelled, voided, and written-off invoices are not shown as overdue.

Confirmed but unissued invoices are not treated as normal payment-ready invoices. Payment actions are available only for payment-eligible invoice states.

## Permissions And Restricted Data

Read access remains:

- `tenant.finance.view`
- or `tenant.practice.configure`

Mutation access remains:

- `tenant.finance.manage`

The frontend blocks restricted mutation actions, while Supabase RLS and RPC role checks remain authoritative.

No service-role key is used.

## Stale-State And Concurrency Handling

Stale-state handling was hardened for:

- invoice issuing
- payment allocation
- payment reversal

Payment recording validates current visible invoice balances before submission and verifies the created payment after the RPC.

Known limitation:

- local testing cannot fully simulate concurrent multi-user Supabase writes without a live shared test session. The RPCs remain responsible for transactional locking and final authority.

## Finance Workspace UX Improvements

The workspace keeps the Step 3 tab structure:

- Invoices
- Payments
- Accounts
- Receipts

Hardening improvements include:

- clearer validation errors
- disabled duplicate-submit actions through the existing saving state
- payment reference requirements by method
- safer allocation messages
- clearer reversal warnings
- receipt reversal readiness via refreshed receipt records
- better distinction between unallocated payment balances and account credits

## Validation And Error Handling

Additional user-facing error translations were added for:

- invoice issuance eligibility
- invalid payment amount
- missing payer
- invalid currency
- invalid allocation amount
- allocation-ineligible invoice
- currency mismatch
- allocation exceeding payment balance
- allocation exceeding invoice balance
- reversed payment allocation
- missing reversal reason
- duplicate external transaction reference

## Code Quality Changes

The Finance page now includes shared helper logic for:

- fresh payment loads
- fresh invoice loads
- account-context validation
- allocation validation
- payment-date validation
- duplicate active payment allocation checks

No broad Finance rewrite was performed.

## Database Correction

A genuine database correction was added as a forward-only migration:

- `202607130007_phase5e_reverse_account_credits.sql`

Correction:

- `reverse_payment(...)` now reverses account credits created from the reversed payment.
- `reverse_payment(...)` now records the actual previous payment status in payment status history instead of always using `recorded`.

The public function signature did not change, so generated TypeScript types did not require updates.

## Deployment And Runtime Limitations

Deployment dependency:

- `202607130006_phase5e_finance_workflow.sql`
- `202607130007_phase5e_reverse_account_credits.sql`

Local limitations:

- Supabase RPC execution, RLS policies, receipt-numbering, allocation locking, patient-history inserts, and multi-user concurrency could not be fully exercised from the local frontend build alone.
- These behaviours require the migrations to be applied to the active Supabase development project and tested against real authenticated tenant users.

## Deferred Functionality

Still deferred:

- statements
- statement snapshots
- PDF invoice or receipt generation
- email or WhatsApp delivery
- Patient Link finance rendering
- payment gateways
- bank-feed imports
- medical aid remittances
- refunds
- credit notes
- write-offs
- disputes
- therapist settlements
- accounting integrations
- workflow automation execution
- AI finance review

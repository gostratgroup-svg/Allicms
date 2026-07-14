# Phase 5E Step 5: Finance Workflow Validation

## Summary

Phase 5E Step 5 reviewed the completed Finance Workflow across invoice issuance, payment recording, allocations, partial and full payments, unallocated balances, account credits, receipts, reversals, financial accounts, patient history, workflow events, permissions, RLS, database RPCs, frontend UX, and code quality.

The milestone is ready to be marked complete for the current local/code milestone, with live Supabase validation still required after applying the Phase 5E migrations to the active development project.

## Deployment Dependencies

The following migrations must be applied before shared or live testing:

- `202607130006_phase5e_finance_workflow.sql`
- `202607130007_phase5e_reverse_account_credits.sql`
- `202607130008_phase5e_payment_reference_uniqueness.sql`

## Invoice Issuance Validation

Reviewed:

- `issue_invoice(...)`
- invoice status constraints
- invoice status history
- invoice workflow events
- frontend `issueSelectedInvoice`

Validated by code review:

- only confirmed invoices are eligible
- reconciliation-required invoices are blocked in the frontend before issuing
- already-issued/payment-tracking invoices are idempotently returned by the RPC
- draft, review, ready-to-confirm, cancelled, voided, and written-off states are not eligible
- stale invoice state is checked before action
- invoice reload happens after RPC
- frontend success is shown only after `issued_at` and a valid issued/payment status are verified
- status history and workflow events reload after issuing
- invoice snapshots and lines remain immutable after confirmation

Requires live verification:

- actual `issued_by_profile_id`
- tenant RLS behaviour with real tenant users
- patient-history insert visibility after RPC execution

## Payment Recording Validation

Reviewed:

- `record_payment(...)`
- payment constraints
- payment tenant-integrity trigger
- frontend `savePayment`

Validated by code review:

- payer name required
- positive amount required
- date validated
- currency must be three letters
- method must match supported method values
- EFT, card, online, and medical-aid methods require a payment reference or external transaction reference
- patient, responsible-party, and financial-account context is validated in frontend and protected by database triggers
- initial allocations are validated before submission
- frontend verifies the reloaded payment after RPC before success
- RPC creates payment, allocations, receipt readiness, account credit where needed, status history, workflow events, and patient history

Correction added:

- `202607130008_phase5e_payment_reference_uniqueness.sql` adds a tenant-scoped unique index for active `external_transaction_reference` values.

Requires live verification:

- all payment methods against real RLS policies
- partial transaction rollback behaviour under RPC failure
- duplicate external reference behaviour under concurrent submissions

## Allocation Validation

Reviewed:

- `apply_payment_allocations(...)`
- `allocate_payment(...)`
- frontend allocation validators

Validated by code review:

- allocation amount must be positive
- payment cannot be reversed
- invoice must exist in same tenant
- invoice must be payment-eligible
- invoice currency must match payment currency
- allocation cannot exceed payment available balance
- allocation cannot exceed invoice balance
- duplicate active allocation from the same payment to the same invoice is blocked in the frontend
- affected invoices and payment reload after allocation
- frontend verifies reloaded payment status and balance against RPC result

Requires live verification:

- database lock behaviour under concurrent allocations
- exact final-balance allocation
- multiple payments against one invoice under real data

## Partial And Full Payment Results

Reviewed:

- invoice payment recalculation
- payment allocation totals
- invoice status history
- payment status history

Validated by code review:

- active allocations are summed by the database
- reversed allocations are excluded
- partial allocation changes invoice status to `partially_paid`
- full allocation changes invoice status to `paid`
- payment statuses update to `unallocated`, `partially_allocated`, or `allocated`
- paid invoices are excluded from new payment allocations by frontend payable filters and RPC eligibility checks

Requires live verification:

- exact numeric edge cases and rounding using real PostgreSQL numeric values

## Unallocated Payments And Account Credits

Reviewed:

- `account_credits`
- unallocated payment balances
- account-credit workflow event

Validated by code review:

- unallocated payment balances remain linked to source payment
- account credits store original and remaining amount
- account credits are tenant scoped
- account credits are visible only to finance-authorized users through RLS
- reversed or used credits are excluded from active credit totals in the UI

Correction carried forward from Step 4:

- `202607130007_phase5e_reverse_account_credits.sql` reverses credits created from reversed payments and sets remaining amount to `0`.

Requires live verification:

- overpayment credit creation
- later allocation from unallocated payment balance
- account-credit reversal after applying the correction migration

## Reversal Validation

Reviewed:

- `reverse_payment(...)`
- payment status history
- allocation reversal
- receipt reversal
- account-credit reversal correction
- frontend `reverseSelectedPayment`

Validated by code review:

- finance permission required by RPC
- reversal reason required
- frontend confirmation required
- already-reversed payments are blocked
- stale payment state is checked before action
- original payment record is preserved
- active allocations are marked reversed
- affected invoice balances are recalculated
- payment status becomes `reversed`
- receipt status becomes `reversed`
- account credits from the source payment are reversed by the correction migration
- frontend verifies reloaded reversed state before success

Requires live verification:

- invoice status restoration after payment reversal
- receipt reversal row updates
- patient-history insert after reversal
- concurrent reversal attempts

## Receipt Validation

Reviewed:

- `receipt_number_sequences`
- `receipts`
- `create_receipt_for_payment(...)`
- receipt display in Finance

Validated by code review:

- receipt number is database-generated
- one receipt per payment is enforced by `receipts_payment_id_idx`
- receipt number is unique per tenant
- receipt sequence row is locked with `for update`
- frontend never predicts next receipt number
- receipt displays linked payment, payer, method, date, amount, status, allocation count and readiness flags

Requires live verification:

- receipt sequence concurrency
- payer and issuer snapshots from real payment data

## Financial Account Validation

Reviewed:

- `financial_accounts`
- account relationship triggers
- account display in Finance

Validated by code review:

- patient and responsible-party accounts are tenant scoped
- one responsible party covering multiple patients is supported by the model
- frontend validates selected financial account against selected patient/responsible party
- account credits and outstanding invoice balances display separately
- clinical notes, patient alerts, booking notes and session notes are not loaded

Known limitation:

- outstanding account balance display uses loaded invoice balances as a UI aggregate. The underlying invoice balances remain database-authoritative.

Requires live verification:

- cross-account allocation rejection under tenant-integrity triggers
- archived patient historical access

## Invoice And Payment Status Validation

Reviewed supported statuses:

- `confirmed`
- `issued`
- `awaiting_payment`
- `partially_paid`
- `paid`
- `overdue`
- `reversed` payment state

Validated by code review:

- frontend labels match stored values
- unsupported transitions are not exposed as UI actions
- paid, cancelled, voided and written-off invoices are not shown overdue
- confirmed but unissued invoices are not payment-ready
- partially paid overdue invoices remain distinguishable through status and overdue-day display

## Financial Calculation Review

Validated by code review:

- PostgreSQL numeric fields remain database source of truth
- frontend arithmetic is limited to validation and display aggregation
- RPCs recalculate payment allocated/unallocated amounts
- RPCs recalculate invoice amount paid and balance due
- reversed allocations are excluded in recalculation
- reversed credits are excluded from active credit totals in the UI
- every financial mutation reloads affected records before success

Requires live verification:

- exact decimal rounding under Supabase/PostgreSQL execution

## Patient History Validation

Reviewed:

- finance-related `patient_history_events`
- Finance UI patient-history verification panels

Validated by code review:

- finance reads only patient-history rows from finance source tables
- no clinical notes, booking notes, session notes, patient alerts, bank-account details or external transaction secrets are displayed
- invoice and payment patient-history verification is read-only

Requires live verification:

- patient-history inserts created by RPCs appear correctly in both Finance and Patient workspace.

## Workflow Event Validation

Reviewed canonical events:

- `invoice_issued`
- `payment_recorded`
- `payment_allocated`
- `invoice_partially_paid`
- `invoice_paid`
- `receipt_created`
- `payment_reversed`
- `allocation_reversed`
- `account_credit_created`

Validated by code review:

- workflow events are tenant scoped
- idempotency keys are used for canonical workflow events
- human-readable labels are displayed
- raw payloads are not primary UI
- no workflow automation is executed

Requires live verification:

- duplicate event prevention under retry/concurrent conditions

## Permission And RLS Review

Reviewed:

- `financial_accounts`
- `payments`
- `payment_allocations`
- `account_credits`
- `receipt_number_sequences`
- `receipts`
- `payment_status_history`
- `payment_workflow_events`
- finance RPC grants
- frontend authorization checks

Validated by code review:

- RLS is enabled on Phase 5E tables
- policies require tenant roles through existing role helpers
- RPCs verify tenant finance/admin roles
- frontend read access requires finance view or practice configuration access
- frontend mutation access requires finance manage permission
- no service-role credentials are used
- no hard-delete finance actions are present in frontend code
- security-definer functions use `set search_path = public`

Requires live verification:

- real role matrix testing for admin, finance, receptionist, therapist and read-only users

## Database Issues Found And Corrected

Corrections:

1. `202607130007_phase5e_reverse_account_credits.sql`
   - reverses account credits from reversed payments
   - records actual previous payment status in status history

2. `202607130008_phase5e_payment_reference_uniqueness.sql`
   - adds active tenant-scoped uniqueness for external transaction references
   - protects against duplicate payment capture under concurrency

No generated TypeScript type update was needed because both corrections preserve existing table/function signatures.

## Frontend Issues Found And Corrected

Corrections:

- stronger payment date validation
- reference requirement by payment method
- duplicate active external transaction reference handling
- account-context validation
- allocation eligibility validation before RPC
- duplicate active payment-to-invoice allocation guard
- stale payment checks before allocation and reversal
- post-RPC payment verification before success messages
- clearer finance error messages

## Code Quality Changes

The Step 5 review did not perform a broad rewrite.

Targeted helper coverage now includes:

- `loadFreshPayment`
- `loadFreshInvoices`
- `validateAccountContext`
- `validateAllocationSet`
- `isValidIsoDate`
- duplicate allocation key helper

`Finance.tsx` is large and should eventually be split into focused components, but no broad refactor was done during this validation step to avoid destabilizing the milestone.

## Automated Commands Run

- `npm run build`
- `git diff --check`

No lint or test scripts are configured in `package.json`.

## Could Not Be Fully Verified Locally

The following require the active Supabase development project:

- migration execution
- RLS behaviour across real users and roles
- RPC execution
- allocation locking
- balance recalculation under concurrency
- receipt sequence concurrency
- account-credit creation and reversal
- patient-history insertion from RPCs
- workflow-event idempotency under retries
- duplicate external reference enforcement under concurrent submissions

## Unaffected Areas

No changes were made to:

- Draft Invoice Engine architecture
- Session Engine
- Booking Engine
- Patient Engine schema
- Practice Foundation
- Settings
- App shell
- authorization framework

The Finance page still uses the established app shell, route, UI components and styling system.

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

## Final Readiness Assessment

Phase 5E Finance Workflow is ready to be marked complete for the current implementation milestone, subject to applying the Phase 5E migrations and completing live Supabase verification.

The local codebase builds successfully, finance actions are guarded by frontend validation and Supabase RPCs, and the database now includes the two forward-only hardening corrections found during validation.

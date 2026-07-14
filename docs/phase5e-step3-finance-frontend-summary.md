# Phase 5E Step 3: Finance Workflow Frontend Summary

## Summary

Phase 5E Step 3 extends the Finance workspace from draft-invoice management into the first post-confirmation finance operations layer.

The implementation keeps the database authoritative for invoice balances, payment totals, allocations, credits and receipts. Frontend calculations are used only for validation and display previews before calling Supabase RPCs.

No statements, Patient Link rendering, PDF generation, email or WhatsApp delivery, payment gateways, medical aid workflows, credit notes, write-offs, refunds, accounting integrations or workflow automation were implemented.

## Pages And Components

Updated page:

- `src/pages/Finance.tsx`

Updated styling:

- `src/styles.css`

The Finance page now has four workspace tabs:

- Invoices
- Payments
- Accounts
- Receipts

The existing draft invoice queue and invoice detail workspace remain inside the Invoices tab.

## Invoice Issuing

Confirmed invoices can now be issued from the invoice detail panel.

The action calls:

- `issue_invoice(target_invoice_id)`

Implementation behaviour:

- checks that the selected invoice is still in `confirmed`
- reloads the invoice before issuing to avoid stale-record actions
- calls the RPC
- reloads the invoice after issuing
- verifies that `issued_at` exists and that the invoice is in an issued/payment-tracking state
- refreshes invoice status history and workflow events

## Invoice Payment Information

Invoice detail now displays:

- amount paid
- balance due
- payment status
- due date
- issued timestamp
- overdue days indicator
- active payment allocation count

Overdue display is derived from `due_date` and database-owned `balance_due`.

## Payment Recording

The Payments workspace supports recording payments with:

- payment amount
- payment date
- payment method
- payment reference
- external transaction reference
- payer name
- patient
- responsible party
- financial account
- primary invoice
- notes
- optional invoice allocations

The action calls:

- `record_payment(...)`

After success, the workspace reloads invoices, payments, allocations, credits, receipts, workflow events and histories.

## Payment Allocation Flow

The UI supports:

- one payment allocated to multiple invoices
- partial allocation
- unallocated payment balance

New payment capture can include allocations immediately.

Existing payments with unallocated balance can receive additional allocations through:

- `allocate_payment(target_payment_id, allocations)`

After allocation, all affected finance data is reloaded from Supabase.

## Payments Workspace

The Payments tab includes:

- payment list
- search and status filter
- payment detail
- payment history
- allocation history
- workflow events
- patient-history verification for finance events
- payment reversal action

## Payment Reversal

Payments can be reversed through:

- `reverse_payment(target_payment_id, reversal_reason_input)`

The UI requires:

- reversal reason
- browser confirmation

After reversal, the workspace reloads affected invoice balances, payment status, allocation history, workflow events and patient-history verification.

## Accounts And Credits

The Accounts tab displays:

- financial accounts
- outstanding invoice balances
- active account credits
- covered patient count
- unallocated balances from `account_credits`

Outstanding account balances are displayed from the currently loaded invoice rows. The database remains the authoritative owner of invoice balances and account-credit amounts.

## Receipts

The Receipts tab displays receipt readiness records created by payment workflows.

Displayed fields include:

- receipt number
- linked payment
- payer
- allocations count
- payment method
- issue date
- payment amount
- Patient Link readiness flag
- PDF readiness flag

Receipt PDF generation is deferred.

## Workflow Events

The Finance page now reads and displays:

- `invoice_status_history`
- `invoice_workflow_events`
- `payment_status_history`
- `payment_workflow_events`
- finance-related `patient_history_events`

This provides visible verification that invoice and payment workflow events are being recorded.

## Permissions

Finance read access continues to require:

- `tenant.finance.view`
- or `tenant.practice.configure`

Finance actions require:

- `tenant.finance.manage`

The frontend does not bypass RLS. Restricted users are stopped at the UI level before predictable restricted reads/actions, while Supabase RLS and RPC role checks remain the security source of truth.

## Validation And State Handling

Implemented validation includes:

- payer name required
- positive payment amount
- payment date required
- valid payment method
- allocation total cannot exceed payment amount
- allocation total cannot exceed selected payment unallocated balance
- invoice issuing requires a confirmed invoice
- payment reversal requires a reason

Implemented state handling includes:

- loading state
- empty states
- error and success messages
- duplicate submission prevention through the existing `saving` flag
- stale invoice check before issuing
- authoritative reload after every RPC mutation

## Deferred Functionality

Deferred by design:

- statements
- Patient Link finance rendering
- invoice and receipt PDF generation
- email and WhatsApp delivery
- payment gateways
- medical aid workflows
- credit notes
- write-offs
- refunds
- accounting integrations
- workflow automation

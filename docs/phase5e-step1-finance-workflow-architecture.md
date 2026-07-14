# Phase 5E Step 1: Finance Workflow Architecture

## 1. Objective

Phase 5E designs the finance workflow that begins after a draft invoice has been confirmed.

Phase 5D made the confirmed invoice the authoritative financial obligation. Phase 5E defines how that obligation is issued, tracked, paid, allocated, aged, reported, corrected, and prepared for future receipts, statements, Patient Link visibility, communication, payment gateways, medical aid workflows, and accounting integrations.

This document is architecture only. It does not create migrations, generated types, React components, routes, UI, or workflow execution code.

Deployment dependency before implementation:

- `supabase/migrations/202607130004_phase5d_draft_invoice_engine.sql`
- `supabase/migrations/202607130005_phase5d_restrict_invoice_total_recalculation.sql`

## 2. Core Principles

### Confirmed Invoice Is The Financial Obligation

The draft invoice can be edited. The confirmed invoice cannot be edited like a draft.

After confirmation, corrections must be handled through controlled financial workflows such as allocations, reversals, credit notes, write-offs, refunds, disputes, or future adjustment documents.

### Capture Once, Reuse Everywhere

Payment and statement workflows must reuse:

- invoice totals and balances
- invoice party snapshots
- invoice issuer snapshots
- patient and responsible-party relationships
- practice, therapist, location, banking and currency context
- invoice lines and service dates
- patient history and workflow-event conventions

### Database Is Financial Authority

The database must remain authoritative for:

- invoice total
- amount paid
- balance due
- payment amount
- allocated amount
- unallocated amount
- account credit
- outstanding balance
- age analysis

Frontend calculations may be used for previews only.

### Privacy By Architecture

Finance records must not copy clinical notes, patient alerts, session process notes, or internal clinical details.

Patient-facing finance history should include only safe commercial events such as invoice issued, payment received, receipt available, statement available, or payment overdue.

### No Silent Financial Mutation

Confirmed financial history must never disappear silently.

Mistakes are corrected with explicit, auditable records rather than hard deletion or hidden overwrites.

## 3. Workflow Overview

The intended financial workflow is:

```text
Session completed
  -> Draft invoice created
  -> Invoice confirmed
  -> Invoice issued
  -> Awaiting payment
  -> Payment recorded
  -> Payment allocated
  -> Partially paid or paid
  -> Receipt ready
  -> Statement, if required
```

Phase 5E starts at:

```text
invoice_status = confirmed
```

and defines the architecture for everything after that point.

## 4. Invoice Lifecycle After Confirmation

### Recommended Stored Statuses

The `invoices.invoice_status` field already supports later finance values. Phase 5E should use these status values deliberately:

- `confirmed`
- `issued`
- `awaiting_payment`
- `partially_paid`
- `paid`
- `cancelled`, only for pre-official or controlled administrative cases where legally valid
- `voided`, future controlled reversal of an official document
- `written_off`, future bad-debt/write-off workflow
- `overdue`, optional stored status only if the product chooses persisted overdue state
- `disputed`, recommended future status if dispute handling is added

If `disputed` is not already in the Phase 5D check constraint, it should be introduced only through a future forward migration when implemented.

### Recommended Derived Statuses

Some statuses are better derived dynamically:

- `overdue`: derived from due date, balance due, current date, and dispute/collection state
- age bucket: derived from due date and balance due
- collection priority: derived from age, balance, responsible party and tenant rules

Avoid daily database updates just to mark invoices overdue. Derived queries are safer and more accurate.

### Manual Transitions

Manual or user-confirmed transitions:

- `confirmed -> issued`, if the practice requires explicit issue
- `issued -> awaiting_payment`, if issuance and payment waiting are separate
- `awaiting_payment/partially_paid -> disputed`, future
- `awaiting_payment/partially_paid -> written_off`, future
- `confirmed/issued -> voided`, future, with strict rules and reason

### Automated Transitions

Automated transitions:

- payment allocation recalculates `amount_paid` and `balance_due`
- invoice becomes `partially_paid` when allocated amount is greater than zero but less than total
- invoice becomes `paid` when balance is zero
- overdue display is derived once due date has passed and balance remains outstanding
- future reminder workflows can be created when invoices become overdue

### Terminal States

Terminal or near-terminal states:

- `paid`
- `voided`
- `written_off`

Even terminal records remain visible for reporting, audit, statements, and Patient Link history where appropriate.

### Confirmation And Issuance

Confirmation and issuance should remain separate concepts.

Confirmation:

- allocates official invoice number
- locks financial facts
- creates official obligation inside AlliDesk

Issuance:

- makes the invoice ready for external visibility
- prepares Patient Link visibility
- prepares PDF and communication workflows
- starts payment tracking from the issue/due-date rules

For simple practices, issuance may occur immediately after confirmation through an `issue_invoice(...)` RPC. For stricter practices, a finance user may explicitly issue after review.

## 5. Invoice Issuance Model

### Meaning Of Issuance

Issuance means the confirmed invoice is ready to be shared with the responsible party/patient and tracked as accounts receivable.

Issuance should:

- set `issued_at`
- set `issued_by_profile_id`
- set or confirm `invoice_status = issued` or `awaiting_payment`
- set `patient_link_visible = true` when the product enables Patient Link invoice display
- create invoice status history
- create invoice workflow events for PDF, communication, Patient Link, and reporting readiness
- create patient-history entries without sensitive banking/internal finance notes

### Immediate Versus Explicit Issuance

Recommended initial milestone:

- explicit issue action after confirmation
- optional tenant setting later: auto-issue after confirmation

Reason:

- this keeps payment visibility controlled while PDF, Patient Link, and communication workflows are still maturing
- it gives finance users a clear review checkpoint after official numbering

### Issue Date And Due Date

Recommended:

- `confirmed_at` records the official confirmation timestamp
- `issued_at` records when the invoice became externally payable/visible
- due date should normally be calculated from `issued_at` using `payment_terms_days`
- if auto-issue is enabled, due date may equal confirmation date plus payment terms

The due-date rule must be deterministic and tenant-configurable.

### Idempotency

`issue_invoice(invoice_id)` should be idempotent.

Repeated calls should:

- return the existing issued invoice when already issued
- not duplicate status history or workflow events
- not regenerate invoice numbers
- not mutate immutable snapshots

## 6. Financial Account Model

### Need For Explicit Accounts

Phase 5E should introduce an explicit account layer because one responsible party can cover multiple patients, and future organisation, employer, and medical aid accounts must be possible.

Recommended entity:

`financial_accounts`

Purpose:

- group financial obligations and payments
- support patient account, responsible-party account, organisation account and future medical aid account
- support statements and balances without duplicating Patient Engine identity records

### Account Types

Suggested account types:

- `patient`
- `responsible_party`
- `organisation`
- `medical_aid`

Initial milestone should support:

- patient account
- responsible-party account

Future:

- organisation/employer accounts
- medical aid accounts

### Account Ownership

An account should be tenant-scoped and linked to one or more context records:

- `patient_id` nullable
- `responsible_party_id` nullable
- `organisation_name` or future organisation id nullable
- `medical_aid_context` future

The responsible-party account is the best default for parent/guardian billing because the same payer may be responsible for siblings.

### Stored Versus Derived Balances

Recommended:

- invoice-level `amount_paid` and `balance_due` may remain stored and maintained transactionally
- account balance should be derived from invoices, payments, allocations, credits and reversals
- optional stored account balance cache can be introduced later for performance, maintained only by server-side functions

### Account Notes

Account-level notes must be administrative/finance-only and must not be mixed with clinical notes.

## 7. Payment Model

Recommended entity:

`payments`

Purpose:

Stores historically auditable payment records received by the practice, therapist, location, bank account, or future payment integration.

Core fields:

- `id`
- `tenant_id`
- `financial_account_id`
- `patient_id` nullable context
- `responsible_party_id` nullable context
- `payer_name`
- `payer_email`
- `payer_phone`
- `payment_date`
- `amount`
- `currency_code`
- `payment_method`
- `reference`
- `external_transaction_reference`
- `bank_account_id`
- `therapist_profile_id` nullable
- `practice_location_id` nullable
- `payment_status`
- `reconciliation_status`
- `notes`
- `proof_document_id` future
- `recorded_by_profile_id`
- `reversed_at`
- `reversed_by_profile_id`
- `reversal_reason`
- `metadata`
- `deleted_at`
- `created_at`
- `updated_at`

### Payment Statuses

Recommended:

- `recorded`
- `partially_allocated`
- `allocated`
- `unallocated`
- `reversed`
- `failed`, future external payment callbacks
- `refunded`, future

### Reconciliation Statuses

Recommended:

- `unreconciled`
- `matched`
- `manual_review`
- `reconciled`
- `reversed`

Payments must never store sensitive card data.

## 8. Payment Methods

Recommended payment method values:

- `cash`
- `eft`
- `card`
- `online_payment`
- `medical_aid_remittance`
- `cheque`
- `account_credit`
- `other`

Initial active methods:

- `cash`
- `eft`
- `card`
- `online_payment`
- `medical_aid_remittance`
- `account_credit`
- `other`

Cheque can be included only if the product wants legacy support.

### Method Rules

Suggested validation:

- EFT/bank transfer should support bank account context and reference
- online payment should support external transaction reference
- medical aid remittance should support claim/remittance reference in future
- account credit should reference a credit source
- card must not store card number, CVV, expiry, or full PAN

Custom tenant-defined payment methods can be deferred. If needed later, introduce `payment_methods` reference/configuration table.

## 9. Payment Allocation Model

Recommended entity:

`payment_allocations`

Purpose:

Allocates payment amounts to one or more invoices.

Supported patterns:

- full payment to one invoice
- partial payment to one invoice
- one payment allocated across multiple invoices
- multiple payments against one invoice
- unallocated payment balance
- overpayment becoming account credit
- allocation removal/correction
- allocation reversal

Core fields:

- `id`
- `tenant_id`
- `payment_id`
- `invoice_id`
- `financial_account_id`
- `patient_id`
- `responsible_party_id`
- `allocated_amount`
- `currency_code`
- `allocation_status`
- `allocation_date`
- `allocated_by_profile_id`
- `reversed_at`
- `reversed_by_profile_id`
- `reversal_reason`
- `metadata`
- `deleted_at`
- `created_at`
- `updated_at`

### Allocation Statuses

Suggested:

- `active`
- `reversed`
- `removed`

### Allocation Rules

Rules:

- allocation currency must match payment and invoice currency
- allocated amount must be greater than zero
- total active allocations for a payment cannot exceed the payment amount unless explicit overpayment-to-credit flow exists
- total active allocations for an invoice cannot exceed invoice total unless explicit credit/overpayment logic supports it
- invoice status and balance must update transactionally
- allocation corrections must preserve history
- no hard delete

### Allocation Ordering

Initial UX may suggest oldest outstanding invoices first.

The database should not force FIFO as a hard rule unless tenant policy requires it. Users should be able to allocate manually.

### Concurrency

Allocation must be transactional.

Recommended:

- lock payment row
- lock invoice rows in deterministic order
- validate available unallocated amount
- validate invoice remaining balance
- insert allocations
- recalculate invoice totals and statuses
- create history/events
- return typed result

## 10. Financial Authority And Calculations

### Authoritative Sources

| Value | Authority |
| --- | --- |
| Invoice total | `invoices.total_amount`, maintained from invoice lines before/at confirmation |
| Amount paid | Sum of active payment allocations or stored invoice cache maintained by RPC |
| Balance due | Invoice total minus active allocations, adjusted for credits/write-offs later |
| Payment amount | `payments.amount` |
| Allocated amount | Sum of active `payment_allocations.allocated_amount` |
| Unallocated payment amount | Payment amount minus active allocations |
| Account credit | `account_credits` or derived unallocated positive payment balance |
| Outstanding account balance | Sum of open invoice balances minus available credits |
| Age bucket | Derived from due date, balance due and current date |

### Stored Versus Derived Recommendation

For invoice performance, keep `invoices.amount_paid` and `invoices.balance_due` as stored values maintained only by transactional finance functions.

For account-level balances, start derived. Add cached balances later only if reporting performance requires it.

### Precision

Use PostgreSQL `numeric(12, 2)` or equivalent for ordinary currency amounts.

Use deterministic database calculations. Never rely on frontend floating-point arithmetic for persisted finance state.

## 11. Payment Recording Workflow

Recommended server-side operation:

`record_payment(...)`

Workflow:

1. Verify authenticated tenant access.
2. Verify finance permission through tenant membership/RLS-safe helper.
3. Validate payer/account context.
4. Validate amount is positive.
5. Validate currency.
6. Validate payment method.
7. Validate duplicate external transaction reference where provided.
8. Create payment record.
9. Allocate to selected invoices if allocation instructions were supplied.
10. Lock and recalculate affected invoice balances.
11. Update invoice statuses to `partially_paid` or `paid` when applicable.
12. Update payment status to `unallocated`, `partially_allocated`, or `allocated`.
13. Record payment status history.
14. Record invoice status history where invoices changed.
15. Create payment workflow events.
16. Create patient history entries where appropriate.
17. Prepare receipt generation readiness.
18. Return typed result with payment id, allocation ids, affected invoice ids and balance summaries.

If allocation fails after payment validation, the preferred approach is a single transaction that rolls back the payment creation and returns a clear error.

Alternative recoverable mode:

- create payment as `unallocated`
- record allocation failure event
- show payment in allocation queue

The initial milestone should prefer a transaction for user-selected allocations and allow explicit unallocated payment creation as its own path.

## 12. Payment Corrections And Reversals

### Correction Philosophy

Payments are historical financial records. They should not be silently overwritten.

Before reconciliation, limited correction may be allowed with audit:

- payment date
- method
- reference
- payer display details
- notes

Amount changes should usually require reversal and re-entry unless the payment is unreconciled and unallocated. This keeps financial integrity clearer.

### Reversal Model

Recommended entity:

`payment_reversals`

Purpose:

- preserve original payment
- record reversal reason
- reverse allocations
- restore invoice balances
- update payment status
- create audit and patient history

Reversal reasons should be mandatory.

Examples:

- duplicate payment
- bank transaction reversed
- incorrect payer
- incorrect amount
- returned payment
- captured in wrong tenant/account

### Allocation Corrections

Allocation mistakes should use:

- `remove_payment_allocation(...)`, for pre-reconciliation corrections
- `reverse_payment_allocation(...)`, for auditable reversal after reconciliation or receipt issue

The original allocation should remain visible as reversed/removed.

## 13. Receipt Readiness

Recommended entities:

- `receipt_number_sequences`
- `receipts`

Receipts should be generated from payments and allocations, not from invoice status alone.

Receipt snapshot should include:

- receipt number
- payment reference
- payer
- patient/account context
- payment amount
- allocated invoices
- payment method
- payment date
- practice/therapist issuing context
- banking context where appropriate
- receipt issue date
- reversal state
- PDF readiness
- Patient Link readiness
- communication readiness

Receipt numbers should have their own tenant sequence because a payment receipt is a different financial document from an invoice.

Initial Phase 5E database may mark receipt readiness through workflow events before implementing full receipt PDFs.

## 14. Statement Architecture

Statements summarize account activity over a period.

Supported statement recipients:

- patient
- responsible party
- future organisation account
- future medical aid account

Recommended entities:

- `statement_snapshots`
- `statement_lines`

### Stored Snapshot Versus Generated View

Recommended:

- use live generated views for on-screen current account balance previews
- persist statement snapshots when a user generates/sends an official statement

Reason:

- historical statements must be reproducible
- later payments, reversals or corrections must not rewrite old statement documents silently

### Statement Contents

A statement may include:

- opening balance
- invoices
- invoice lines summary or invoice totals
- payments
- allocations
- account credits
- reversals
- adjustments
- closing balance
- aging buckets

### Responsible Party With Multiple Patients

Responsible-party statements should support multiple patients under the same account.

Statement lines should include patient context for every invoice/payment line where applicable.

## 15. Overdue And Age Analysis

### Due-Date Calculation

Recommended:

- invoice due date is set from issue date plus payment terms
- payment terms default comes from billing settings
- tenant may later configure grace period and reminder schedule

### Age Buckets

Recommended buckets:

- current
- 1-30 days
- 31-60 days
- 61-90 days
- 90+ days

Age should be derived from:

- due date
- current date
- balance due
- dispute/suspended collection state

### Overdue State

Avoid daily writes solely to mark overdue.

Use derived query/view:

```text
balance_due > 0 and due_date < current_date
```

Future workflow workers may create reminder events when an invoice enters overdue state, but the invoice does not need daily mutation.

## 16. Account Credits And Overpayments

Recommended entity:

`account_credits`

Credits may be created by:

- overpayment
- unallocated payment
- credit note
- refund cancellation
- manual account adjustment, future controlled workflow

Credit fields:

- account
- patient/responsible-party context
- source payment/allocation/credit note
- original amount
- remaining amount
- currency
- status
- reason
- created by
- metadata

Credit statuses:

- `available`
- `partially_used`
- `used`
- `refunded`
- `expired`, only if legally appropriate
- `reversed`

Credits must never disappear silently. Transfers between patients/accounts should require explicit authorization and audit.

## 17. Credit Notes, Write-Offs, And Refund Readiness

### Credit Notes

Credit notes offset confirmed invoices without editing the original invoice.

Future credit note should:

- reference the original invoice
- include reason
- include line or amount details
- reduce outstanding balance through allocation/credit mechanism
- have its own numbering sequence if legally required

### Write-Offs

A write-off is not a payment.

It records a decision that an outstanding balance will not be collected. It should:

- require permission
- require reason
- preserve invoice history
- impact reporting separately from payment income

### Refunds

A refund relates to a payment or account credit.

Future refunds should:

- reference source payment/credit
- reduce available credit or payment allocation state
- preserve original payment record
- create patient/account history

These workflows are deferred beyond the first Phase 5E implementation.

## 18. Medical Aid Readiness

Future Medical Aid Engine support should allow:

- claim reference
- medical aid payer account
- expected benefit
- remittance advice
- partial medical aid payment
- patient co-payment
- rejected claims
- resubmissions
- split allocation between medical aid and patient responsibility

Medical aid payments should use the same payment and allocation architecture, with method `medical_aid_remittance` and future claim/remittance references.

Do not build claim submission in Phase 5E.

## 19. Practice, Therapist, And Location Context

Payments and receipts should preserve:

- tenant
- receiving bank account
- therapist profile where therapist-specific invoicing is active
- location where relevant
- currency
- billing settings used at the time of payment/receipt

### Bank Account Context

Payment recording should identify the receiving bank account when method requires it or when the practice wants bank reconciliation.

### Therapist-Specific Billing

If therapist-specific banking or practice number override is active, invoices already snapshot that context. Payments should reference the receiving bank account and therapist context when available.

Future therapist settlement/commission reports can use:

- invoice therapist context
- payment allocation date
- received bank account
- location
- procedure/invoice line details

No therapist payout or commission calculations are implemented in this phase.

## 20. Patient History Integration

Meaningful finance events for Patient History:

- invoice issued
- payment recorded
- payment allocated
- invoice partially paid
- invoice paid
- payment reversed
- allocation reversed
- account credit created
- receipt issued
- statement generated
- invoice overdue, if reminder/communication is generated

Patient History should not include:

- internal finance notes
- sensitive bank reconciliation details
- full bank account numbers beyond safe display rules
- clinical notes
- session process notes

Patient-visible history should use concise, plain-language titles and bodies.

## 21. Workflow Events

Recommended event categories:

### Invoice Workflow Events

- `invoice_issued`
- `invoice_awaiting_payment`
- `invoice_partially_paid`
- `invoice_paid`
- `invoice_overdue`
- `invoice_disputed`
- `invoice_written_off`

### Payment Workflow Events

- `payment_recorded`
- `payment_allocated`
- `payment_partially_allocated`
- `payment_unallocated`
- `payment_reversed`
- `payment_reconciliation_required`
- `receipt_ready`

### Statement Workflow Events

- `statement_generated`
- `statement_ready_for_patient_link`
- `statement_communication_ready`

Events should be tenant-scoped and idempotent where repeated actions are possible.

## 22. Security And RLS Considerations

### Role Access

Recommended access:

| Role | Access |
| --- | --- |
| Tenant admin | Full tenant finance workflow access |
| Finance user | Record payments, allocate payments, issue invoices, view finance records |
| Therapist | Finance visibility only if practice policy grants it |
| Receptionist | Limited visibility or payment capture only if explicit tenant policy allows |
| Read-only user | View-only where permitted; no mutations |
| Super Admin | No tenant patient/finance browsing by default |
| Patient Link user | Controlled patient-facing invoice, statement and payment status only |

### RLS Principles

RLS must:

- enforce tenant isolation on every finance table
- check tenant membership through existing helper patterns
- restrict payment mutation to admin/finance or explicit future permissions
- prevent Super Admin from browsing tenant finance data by default
- prevent cross-tenant account/payment/allocation references
- prevent hard deletes
- keep sensitive bank/reconciliation fields away from unauthorized users

The frontend must never use service-role credentials.

## 23. Audit And Compliance

Financial actions must preserve:

- actor
- timestamp
- tenant
- patient/account context
- source record
- original values
- new values
- reason
- metadata

Audit required for:

- payment creation
- payment edit
- payment allocation
- allocation removal/reversal
- payment reversal
- invoice status changes
- receipt creation
- statement generation
- write-off readiness
- account-credit use
- dispute state changes

Avoid noisy field-level audit for every display-only edit, but preserve all financial decisions and balance-changing actions.

## 24. Data Model Guidance

### Required For Initial Finance Workflow

Recommended first database entities:

- `financial_accounts`
- `payments`
- `payment_allocations`
- `payment_status_history`
- `payment_workflow_events`

### Strongly Recommended Soon After

- `receipt_number_sequences`
- `receipts`
- `account_credits`

### Future-Ready

- `statement_snapshots`
- `statement_lines`
- `payment_reversals`
- `credit_notes`
- `write_offs`
- `refunds`
- `medical_aid_remittances`
- `bank_feed_imports`

### Entity Relationship Sketch

```text
tenant
  -> financial_accounts
    -> patients / responsible_parties
    -> invoices
      -> payment_allocations
    -> payments
      -> payment_allocations
      -> receipts
    -> account_credits
    -> statement_snapshots
      -> statement_lines
```

## 25. Transactional Function Guidance

Recommended functions:

### `issue_invoice(invoice_id)`

Responsibilities:

- validate confirmed invoice
- set issue status/date
- set Patient Link readiness
- create status history
- create workflow events
- return typed result

### `record_payment(...)`

Responsibilities:

- create payment
- optionally allocate payment to invoices
- recalculate invoice balances
- update invoice and payment statuses
- create history/events
- return typed result

### `allocate_payment(...)`

Responsibilities:

- allocate an existing payment
- lock payment and invoice rows
- validate available/unallocated amount
- validate invoice balance
- update balances/statuses
- create history/events

### `remove_payment_allocation(...)`

Responsibilities:

- reverse/remove allocation safely
- restore invoice balance
- update payment status
- preserve audit trail

### `reverse_payment(...)`

Responsibilities:

- reverse payment and all active allocations
- restore affected invoice balances
- require reason
- create payment reversal/history/events

All functions should be:

- tenant-aware
- authenticated
- transactional
- concurrency-safe
- idempotent where appropriate
- deterministic with `numeric`
- RLS-compatible
- explicit about `security definer` and `search_path`
- not directly exposing unrestricted internal recalculation helpers

## 26. Validation Rules

Validate:

- invoice is confirmed or issued before payment allocation
- invoice is not voided, cancelled or written off
- patient/account belongs to tenant
- responsible party belongs to tenant
- payment amount is positive
- currency code is valid
- payment method is active
- payment date is valid
- duplicate external transaction reference is blocked per tenant/method/provider
- allocation amount is positive
- allocation currency matches payment and invoice
- allocation total does not exceed payment available amount
- allocation total does not exceed invoice balance unless explicit credit flow applies
- overpayments become unallocated amount or account credit
- reversal reason is required
- already reversed payments cannot be reversed again
- archived patients require explicit policy decision before payment capture
- cross-bank/cross-therapist allocation is blocked or flagged according to tenant policy
- concurrent allocation cannot overpay an invoice
- missing payer context blocks payment recording

## 27. Scalability And Reliability

Design for:

- high-volume payment recording
- concurrent allocations
- deterministic financial precision
- idempotent external payment callbacks
- duplicate webhook protection
- bank reconciliation
- account balance queries
- aging queries
- patient and responsible-party statements
- finance dashboard performance
- auditability
- historical reproducibility
- retry and failure recovery
- payment gateway integrations
- accounting integrations
- bank-feed imports
- medical aid remittances
- automated reminders
- AI-assisted reconciliation

Recommended reliability patterns:

- unique idempotency keys for gateway callbacks
- transaction-level row locking for allocation
- indexes on tenant/status/date/account/invoice/payment references
- append-style history tables
- soft-delete or reversal rather than hard delete
- clear workflow-event statuses for retries

## 28. Explicit Assumptions

- Phase 5D invoice confirmation and numbering remain the official invoice boundary.
- Confirmed invoices are immutable and corrected through future finance documents.
- Payment workflows will be implemented through database RPCs rather than direct multi-step frontend writes.
- Initial payment handling can support manual payment capture before payment gateway automation.
- Account balances are derived initially; invoice balances may remain stored and maintained transactionally.
- Patient Link display is prepared through workflow events but not delivered in this architecture step.
- Super Admin continues to manage the platform, not tenant finance data.
- Medical aid claims, credit notes, refunds, write-offs and accounting exports are future phases.

## 29. Deferred Functionality

Deferred beyond this architecture step:

- migrations
- generated types
- frontend screens
- payment gateway integrations
- file/proof uploads
- receipt PDF generation
- statement PDF generation
- Patient Link payment UI
- communication delivery
- medical aid claim submission
- credit notes
- write-offs
- refunds
- bank-feed imports
- accounting exports
- AI reconciliation

## 30. Recommended Implementation Roadmap

### Architecture

Completed by this document.

Next architecture refinements before migration:

- decide whether issuance is explicit or auto-issued by tenant setting
- decide initial account balance cache strategy
- decide first active payment methods
- decide whether receipt numbers are required in the first payment milestone

### Database

Create Phase 5E migration for the required initial entities:

1. `financial_accounts`
2. `payments`
3. `payment_allocations`
4. `payment_status_history`
5. `payment_workflow_events`

Add transactional RPCs:

1. `issue_invoice`
2. `record_payment`
3. `allocate_payment`
4. `remove_payment_allocation`
5. `reverse_payment`, if included in the first milestone

### Types

Regenerate Supabase types after migrations.

Confirm new tables, RPCs, constraints and function return types are available to the frontend.

### Frontend

Implement in small increments:

1. invoice issue action
2. awaiting payment list
3. payment recording form
4. allocation UI
5. payment history panel
6. invoice balance and status display
7. account payment overview

### Integration

Integrate:

- invoice status updates
- patient history
- workflow events
- Patient Link readiness
- receipt readiness
- statement readiness

Keep PDF, payment gateway and communication execution deferred until the workflow is stable.

### Testing

Validate:

- tenant isolation
- permissions
- payment creation
- allocation combinations
- partial payments
- overpayments
- reversals
- concurrent allocation
- invoice status transitions
- age analysis
- patient history safety
- audit trail completeness

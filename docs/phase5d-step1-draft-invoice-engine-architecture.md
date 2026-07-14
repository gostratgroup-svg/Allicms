# Phase 5D Step 1: Draft Invoice Engine Architecture

## 1. Objective

The Draft Invoice Engine defines how a completed session becomes a financially accurate draft invoice without re-entering patient, practice, therapist, procedure, or billing information.

This document is architecture only. It does not create migrations, generated types, React components, routes, UI, or workflow execution code.

Phase 5D starts after Phase 5C Session Engine completion. The Phase 5C deployment dependency remains:

`supabase/migrations/202607130003_phase5c_session_rpc_hardening.sql`

must be applied before shared or live testing.

## 2. Core Principles

### Capture Once, Reuse Everywhere

The completed session already knows what happened. Draft invoice creation must reuse:

- patient identity and active ICD-10 context
- responsible party / billing contact
- booking schedule and session service date
- final delivered `session_procedures`
- therapist details
- location context
- practice profile
- billing settings
- branding
- banking details
- price and procedure snapshots

### Session Completion Creates Finance Readiness

The Session Engine contract is preserved:

```text
session completed
  -> session_workflow_events.event_type = draft_invoice_requested
  -> Draft Invoice Engine consumes or acts on that event
  -> draft invoice is created idempotently
```

The Session Engine remains authoritative for delivered-care facts. The invoice becomes authoritative for the financial record only after confirmation.

### Drafts Are Editable, Confirmed Invoices Are Immutable

Draft invoices may be reviewed and corrected. Confirmed invoices must not be silently edited. Any correction after confirmation must use a controlled future correction, reversal, credit note, or adjustment workflow.

### Historical Accuracy

Invoices must snapshot financially relevant facts. Later changes to patient, responsible party, therapist, practice, banking, branding, or price-list records must not rewrite historical invoices.

### Privacy By Architecture

Invoices must not include clinical notes, internal operational notes, medical alerts, or unrestricted session narratives. They may include billing-relevant patient, responsible-party, procedure, ICD-10, therapist, practice, and payment information.

## 3. Entity Relationships

Recommended relationship flow:

```text
tenant
  -> patient
    -> responsible_parties
    -> bookings
      -> sessions
        -> session_procedures
        -> session_workflow_events(draft_invoice_requested)
        -> invoices
          -> invoice_lines
          -> invoice_status_history
          -> invoice_workflow_events
          -> invoice_party_snapshots
          -> invoice_issuer_snapshots
```

Primary relationships:

| Entity | Relationship |
| --- | --- |
| `invoices` | Tenant-scoped finance document shell. One completed session creates one primary draft invoice in Phase 5D. |
| `invoice_lines` | Snapshot line items generated from active billable `session_procedures`. |
| `invoice_status_history` | Append-style invoice lifecycle trail. |
| `invoice_workflow_events` | Idempotent events for future PDF, communication, Patient Link, payment, and accounting workflows. |
| `invoice_number_sequences` | Transactional final invoice-number allocation support. |
| `invoice_party_snapshots` | Historical recipient/responsible-party and patient snapshot data. |
| `invoice_issuer_snapshots` | Historical practice/therapist/location/banking/tax/branding snapshot data. |

Future relationships:

- `invoice_payments` for payment allocation.
- `statements` / `statement_invoices` for grouped patient account statements.
- `credit_notes` for confirmed invoice reversals.
- `medical_aid_claims` for claims integration.

## 4. Session Completion Trigger

The creation trigger is the Session Engine workflow event:

`session_workflow_events.event_type = 'draft_invoice_requested'`

Recommended implementation model:

1. `complete_session()` marks the session completed.
2. `complete_session()` creates `draft_invoice_requested`.
3. Draft Invoice Engine identifies pending draft requests.
4. A dedicated database RPC creates the draft invoice.
5. The event is marked or mirrored as processed through invoice workflow state.

### Synchronous Or Asynchronous

Recommended first implementation:

- Use an explicit RPC action from the Finance UI or Overview task list: `create_draft_invoice_from_session(session_id)`.
- This keeps Phase 5D observable and recoverable while backend automation is not yet implemented.

Future implementation:

- A workflow consumer or scheduled worker can process pending `draft_invoice_requested` events asynchronously.
- The same RPC should be reused by the worker to preserve one source of truth.

### Idempotency

Draft creation must be idempotent.

Rules:

- One active primary invoice per session for Phase 5D.
- A unique partial index should prevent duplicate active invoices for the same `session_id`.
- Repeated RPC calls return the existing draft invoice when appropriate.
- Repeated `draft_invoice_requested` events must not create duplicates.

### Failure Handling

If draft creation fails:

- The session remains completed.
- The `draft_invoice_requested` event remains visible for retry.
- A failure event should be recorded in `invoice_workflow_events` or the session workflow event metadata/status where appropriate.
- Overview/Finance should show a task such as `Draft invoice creation failed`.
- Manual recovery should allow an authorized finance/admin user to retry draft creation.

## 5. Draft Invoice Lifecycle

Recommended invoice statuses:

```text
draft
  -> review_required
  -> ready_to_confirm
  -> confirmed
  -> issued
  -> awaiting_payment
  -> partially_paid
  -> paid

Alternative states:
draft/review_required/ready_to_confirm -> cancelled
confirmed/issued/awaiting_payment/partially_paid -> voided or written_off
awaiting_payment/partially_paid -> overdue
```

### Draft Invoice Engine Statuses

Phase 5D should own:

- `draft`
- `review_required`
- `ready_to_confirm`
- `cancelled`
- `confirmed`

Later Finance/Payment workflows should own:

- `issued`
- `awaiting_payment`
- `partially_paid`
- `paid`
- `overdue`
- `voided`
- `written_off`

### Valid Transitions

| From | To | Rule |
| --- | --- | --- |
| draft | review_required | Missing/changed required billing context. |
| draft | ready_to_confirm | Draft passes validation. |
| review_required | ready_to_confirm | User resolves required review items. |
| ready_to_confirm | confirmed | Confirmation RPC allocates final number and locks financial facts. |
| draft/review_required/ready_to_confirm | cancelled | Draft cancelled before official invoice. |
| confirmed | issued/awaiting_payment | Later Finance workflow. |
| confirmed+ | voided/written_off | Future correction workflow only. |

Confirmed invoices must not move back to draft.

## 6. Session Relationship

### Phase 5D

One completed session creates one primary draft invoice.

Required:

- `invoices.session_id`
- `invoices.booking_id`
- `invoices.patient_id`
- `invoices.tenant_id`

Future:

- Multiple sessions on one invoice can be supported through an `invoice_sessions` join table.
- This should be deferred until statement/monthly invoicing requirements need it.

### Reopened Session Handling

If a session is reopened before the draft is confirmed:

- Draft should be marked `review_required` or `stale_after_reopen`.
- User can either regenerate from session, manually reconcile, or cancel and recreate the draft.
- If the draft was manually edited, regeneration must require explicit confirmation and preserve an audit trail.

If a session is reopened after invoice confirmation:

- Confirmed invoice must not be silently mutated.
- The UI should show finance reconciliation required.
- Future correction may use credit notes, adjustment invoices, or manual finance review.

### Completed Session Without Billable Procedures

Current Session Engine requires at least one billable delivered procedure for completion. Phase 5D can assume at least one billable line exists.

Future zero-value drafts may be allowed only for explicit pro bono, bundled, or contract workflows and should require a reason.

## 7. Patient And Responsible Party Model

Invoices are linked to the patient but addressed to the responsible party when one exists.

Supported models:

- adult patient financially responsible
- parent or guardian responsible
- organisation/employer responsible, future-ready
- medical aid main member readiness
- split responsibility, future only

### Snapshot Rule

The invoice must snapshot:

- responsible party name
- responsible party type
- relationship to patient
- ID number where required
- billing email
- billing phone
- billing address
- organisation name where applicable
- medical aid member/dependant context where applicable
- patient name
- patient number
- patient date of birth
- patient active ICD-10 code

If responsible-party details later change, historical invoices remain unchanged.

## 8. Practice, Therapist, And Location Issuing Context

Draft invoice creation should gather current issuing context from:

- `practice_profiles`
- `practice_branding`
- `billing_settings`
- `bank_accounts`
- `therapist_profiles`
- `professional_registrations`
- `practice_locations`

### Practice Context

Snapshot:

- legal name
- trading name
- registration number
- VAT/tax number
- address
- main email
- main phone
- website
- country
- currency
- branding display name
- logo path / display preference

### Therapist Context

Snapshot:

- therapist display name
- profession
- qualification if needed
- professional registration body/number
- practice number
- billing name/email/phone if configured

### Banking Context

Selection rules:

1. Use default tenant-owned bank account from `billing_settings.default_bank_account_id`.
2. If `billing_settings.allow_therapist_bank_accounts = true` and therapist-owned bank account exists, allow policy-driven therapist bank selection.
3. If no valid bank account exists, draft can be created as `review_required` but cannot be confirmed.

### Practice Number Context

Selection rules:

1. Use main practice number by default.
2. If `billing_settings.metadata.allow_therapist_practice_number_overrides = true`, allow therapist practice number snapshot.
3. If required practice number is missing, mark draft `review_required`.

### Location Context

Snapshot:

- location name
- address
- contact details
- room label where relevant

Location-specific banking or numbering is future-ready only unless a later requirement justifies it.

## 9. Invoice Line And Pricing Model

Invoice lines are generated from active billable `session_procedures`.

Each line should support:

- `source_session_procedure_id`
- `session_id`
- `service_date`
- `therapist_profile_id`
- `practice_location_id`
- `procedure_name`
- `procedure_code`
- `description`
- `quantity`
- `unit_price`
- `discount_amount`
- `adjustment_amount`
- `tax_rate`
- `tax_amount`
- `line_subtotal`
- `line_total`
- `currency_code`
- `icd10_code`
- `metadata`

### Inherited From Session

- procedure name
- procedure code
- description
- unit price
- quantity
- discounts/adjustments already captured
- currency
- duration if useful for display
- service date
- therapist/location context

### Editable While Draft

Allowed:

- line description
- quantity
- unit price if user has finance/manage permission or price override setting allows it
- discount
- adjustment
- tax classification
- invoice-only note

Changes requiring a reason:

- quantity change
- unit price change
- discount/adjustment
- removing a session-derived line
- adding invoice-only line

Invoice edits must not update the underlying session or `session_procedures`.

### Non-Billable Procedures

Non-billable session procedures should not become normal invoice lines.

Options:

- Exclude them by default.
- Optionally include them as zero-value informational lines if a tenant setting later allows it.

### Rounding

Use PostgreSQL `numeric(12,2)` or similar deterministic decimal calculations.

Do not use JavaScript floating-point arithmetic as the authoritative financial calculation engine.

## 10. Financial Calculations

Recommended stored totals on `invoices`:

- `subtotal_amount`
- `discount_total`
- `adjustment_total`
- `taxable_amount`
- `tax_total`
- `rounding_adjustment`
- `total_amount`
- `amount_paid`
- `balance_due`
- `currency_code`

Recommended line calculations:

```text
line_subtotal = quantity * unit_price
line_total = line_subtotal - discount_amount + adjustment_amount + tax_amount
```

Recommended invoice calculations:

```text
subtotal = sum(line_subtotal)
discount_total = sum(discount_amount)
adjustment_total = sum(adjustment_amount)
tax_total = sum(tax_amount)
total = subtotal - discount_total + adjustment_total + tax_total + rounding_adjustment
balance_due = total - amount_paid
```

Authoritative totals should be calculated in database functions/RPCs and validated before confirmation.

## 11. Invoice Numbering

Drafts should not consume final invoice numbers.

Recommended fields:

- `id` UUID as primary key
- `draft_reference` human-readable but non-financial reference
- `invoice_number` nullable until confirmation
- `invoice_prefix`
- `invoice_sequence_number`
- `invoice_number_allocated_at`

### Final Number Allocation

Final invoice numbers should be allocated transactionally during confirmation.

Recommended sequence model:

- `invoice_number_sequences`
- tenant-scoped
- optionally keyed by financial year
- stores prefix, next number, optional suffix/pattern
- locked with `for update` inside confirmation RPC

### Gaps

Draft cancellation should not create final invoice-number gaps.

Confirmed invoice numbers should never be reused, even if later voided.

## 12. Draft Editing And Review

Draft-edit permissions:

- Admin: view/edit/confirm.
- Finance: view/edit/confirm where `tenant.finance.manage`.
- Therapist: view own/session-linked drafts if practice policy allows; edit limited to clinical/service context only if approved.
- Receptionist: view operational billing status; no confirmation unless explicitly granted later.

Editable draft fields:

- responsible party
- billing address/contact snapshot
- invoice lines
- discounts/adjustments
- tax flags
- due date
- payment terms
- notes/payment instructions
- banking context
- issuing context, where settings allow

Draft edits should:

- create `invoice_status_history` or audit-worthy update events
- require reason for financially material changes
- not update the session
- preserve source session references
- mark the draft as manually edited

## 13. Confirmation Workflow

Confirmation should be a single transactional RPC.

It must:

1. Lock the invoice row.
2. Verify invoice is `ready_to_confirm`.
3. Validate tenant ownership.
4. Validate patient and responsible-party snapshot.
5. Validate issuer and banking context.
6. Validate invoice lines.
7. Recalculate totals.
8. Allocate final invoice number.
9. Snapshot final issuer and recipient details.
10. Set `confirmed_at` and `confirmed_by_profile_id`.
11. Move status to `confirmed` or directly to `awaiting_payment` if confirmation and issuance are one action.
12. Create status history.
13. Create workflow events.
14. Create patient-history entry.
15. Mark Patient Link / communication readiness.

Recommended product behaviour:

- Confirmation and issuance may be one action in early AlliDesk.
- If PDF/document delivery becomes more complex, split `confirmed` and `issued` later.

## 14. Reopened Session And Correction Handling

### Draft Exists, Not Confirmed

When session is reopened:

- draft should become `review_required`
- link remains intact
- finance review explains session was reopened
- user may refresh draft from session after session is completed again

### Draft Manually Edited

If draft was manually edited:

- do not auto-overwrite lines
- require explicit user confirmation to regenerate
- preserve audit trail of overwritten draft content or cancelled draft

### Invoice Confirmed

If invoice is already confirmed:

- never mutate confirmed invoice lines
- mark invoice/session relationship as `reconciliation_required`
- future credit note or adjustment workflow handles correction

### Duplicate Requests

Repeated `draft_invoice_requested` events after reopen or recompletion must not create duplicates unless the existing draft was cancelled/voided and policy explicitly allows a new draft.

## 15. Security And RLS Considerations

Every invoice table must include `tenant_id`.

RLS must enforce:

- authenticated access only
- tenant isolation through `tenant_users`
- Super Admin has no default access to tenant invoice records
- finance/admin users can manage invoices
- therapists can only access invoices allowed by tenant policy
- receptionists have limited operational visibility
- Patient Link access is through future patient-facing security model, not tenant-user RLS

Restricted data exclusions:

- no clinical notes
- no internal session notes
- no internal booking notes
- no medical alerts unless explicitly needed for billing and approved
- no unrestricted operational summaries in patient-facing invoice content

Frontend must not use service-role keys.

## 16. Audit And History Requirements

### Invoice Status History

Meaningful invoice events:

- `draft_invoice_requested`
- `draft_invoice_created`
- `draft_invoice_updated`
- `draft_invoice_review_required`
- `draft_invoice_ready_to_confirm`
- `draft_invoice_cancelled`
- `invoice_confirmed`
- `invoice_number_allocated`
- `invoice_issued`
- `invoice_voided`
- `invoice_written_off`
- `invoice_reconciliation_required`

### Patient History

Patient history should include concise, non-sensitive finance events:

- invoice created/available
- invoice confirmed/issued
- invoice cancelled
- payment due/overdue in future payment workflow
- payment received in future payment workflow

### Audit Events

General `audit_events` should capture:

- confirmation
- number allocation
- material draft edits
- void/write-off
- role-sensitive financial actions
- responsible-party snapshot changes

Avoid noisy field-level history unless required for financial audit.

## 17. Patient Link And Communication Readiness

Phase 5D should prepare future readiness only.

Future Patient Link content:

- read-only invoice summary
- invoice PDF download
- status
- due date
- amount due
- payment instructions
- statement inclusion

Future communication triggers:

- invoice available
- payment due
- overdue reminder
- payment received
- statement available

Do not implement delivery, PDF rendering, payment links, or Patient Link authentication in this architecture step.

## 18. Recommended Data Model

### `invoices`

Purpose: Main invoice/draft shell.

Suggested fields:

- `id`
- `tenant_id`
- `patient_id`
- `responsible_party_id`
- `booking_id`
- `session_id`
- `invoice_status`
- `draft_reference`
- `invoice_number`
- `invoice_prefix`
- `invoice_sequence_number`
- `invoice_date`
- `service_date`
- `due_date`
- `payment_terms_days`
- `currency_code`
- financial totals
- `amount_paid`
- `balance_due`
- `source_type`
- `source_workflow_event_id`
- `manual_edit_reason`
- `confirmed_at`
- `confirmed_by_profile_id`
- `cancelled_at`
- `cancelled_by_profile_id`
- `voided_at`
- `voided_by_profile_id`
- `metadata`
- timestamps and soft delete

### `invoice_lines`

Purpose: Financial line snapshots.

Suggested fields:

- `id`
- `tenant_id`
- `invoice_id`
- `source_session_procedure_id`
- `line_type`
- `service_date`
- `procedure_name`
- `procedure_code`
- `description`
- `icd10_code`
- `quantity`
- `unit_price`
- `discount_amount`
- `adjustment_amount`
- `tax_rate`
- `tax_amount`
- `line_subtotal`
- `line_total`
- `currency_code`
- `change_reason`
- timestamps and soft delete

### `invoice_status_history`

Purpose: Append-style invoice lifecycle trail.

Fields should include:

- tenant
- invoice
- from status
- to status
- event type
- reason
- actor
- metadata

### `invoice_workflow_events`

Purpose: Idempotent future automation events.

Fields should include:

- tenant
- invoice
- session
- booking
- patient
- event type
- idempotency key
- status
- payload
- processed/failed details

### `invoice_number_sequences`

Purpose: Transactional tenant invoice number allocation.

Fields should include:

- tenant
- sequence key / financial year
- prefix
- suffix or pattern
- next number
- padding length
- active flag

### `invoice_party_snapshots`

Purpose: Historical recipient/patient/responsible-party snapshot.

Could be one row per invoice, with structured JSON sections for:

- patient
- responsible party
- medical aid readiness
- billing address

### `invoice_issuer_snapshots`

Purpose: Historical practice/therapist/location/banking/tax snapshot.

Could be one row per invoice, with structured JSON sections for:

- practice
- therapist
- location
- bank account
- branding
- tax/VAT

### Future Tables

- `invoice_payments`
- `credit_notes`
- `statements`
- `statement_invoices`
- `medical_aid_claims`

These are not Phase 5D Step 2 unless explicitly scoped later.

## 19. Validation Rules

Draft creation validation:

- session exists and belongs to tenant
- session is completed
- session has not been soft-deleted
- session has active billable procedure lines
- no active primary invoice already exists for session
- patient belongs to same tenant
- patient is not archived/merged unless policy explicitly allows historical billing
- responsible-party context exists or draft becomes `review_required`
- billing settings exist or draft becomes `review_required`
- issuer context can be resolved
- bank account exists or draft becomes `review_required`

Invoice line validation:

- quantity > 0
- unit price >= 0
- discounts >= 0
- adjustments controlled
- tax rate >= 0
- line total cannot be negative unless future credit-note model
- currency code is valid
- ICD-10 source is patient-level

Confirmation validation:

- invoice is draft/review-ready and not cancelled
- totals recalculated and match stored totals
- final invoice number allocated in same transaction
- due date exists
- issuer and party snapshots exist
- at least one invoice line exists
- no stale reopened-session flag unless explicitly confirmed by finance user
- concurrent confirmation attempts are blocked

## 20. Scalability And Reliability

Design for:

- high-volume invoice creation from completed sessions
- idempotent event consumption
- transactional invoice confirmation
- row locks for invoice number allocation
- indexed tenant/status/date queries
- patient account queries
- session-to-invoice lookup
- finance dashboard counts
- reliable retry of failed draft creation
- immutable historical snapshots
- future accounting exports
- future payment gateway callbacks
- future medical aid claims
- future AI-assisted finance review

Recommended indexes:

- `invoices(tenant_id, invoice_status, invoice_date)`
- `invoices(tenant_id, patient_id, invoice_date desc)`
- `invoices(tenant_id, responsible_party_id, invoice_date desc)`
- `invoices(session_id)` unique where active and source is primary session invoice
- `invoice_lines(invoice_id)`
- `invoice_workflow_events(tenant_id, event_status, created_at)`
- unique `invoice_workflow_events(tenant_id, idempotency_key)` where not deleted
- `invoice_number_sequences(tenant_id, sequence_key)`

## 21. Explicit Assumptions

- Phase 5D starts with one completed session to one primary draft invoice.
- Session procedures are the source of billable service lines.
- ICD-10 remains patient-level.
- Final invoice numbers are allocated only at confirmation.
- Confirmation and issuance may be one action initially.
- Payment capture remains a later workflow.
- Statements remain a later workflow.
- PDF generation remains later unless explicitly brought into the Draft Invoice Engine implementation.
- Therapist-specific banking is only used when enabled by billing settings and available in bank account ownership data.

## 22. Deferred Functionality

Not part of this architecture step:

- migrations
- generated types
- React pages/components
- invoice PDF rendering
- payment processing
- proof of payment
- statements
- credit notes
- medical aid submission
- accounting integrations
- Patient Link authentication
- email/WhatsApp sending
- automated reminders
- workflow worker execution

## 23. Recommended Implementation Roadmap

### Architecture

Complete this blueprint and review it against Phase 4/5A/5B/5C documents.

### Database

Create Phase 5D migration for:

- `invoices`
- `invoice_lines`
- `invoice_status_history`
- `invoice_workflow_events`
- `invoice_number_sequences`
- invoice snapshot tables
- draft creation RPC
- confirmation RPC
- RLS and indexes

### Types

Regenerate Supabase TypeScript types after migration.

### Frontend

Add Finance/Draft Invoice UI:

- sessions awaiting draft invoice
- draft invoice list
- draft detail/review
- line review/edit
- confirm invoice action
- session impact warnings

### Integration

Connect:

- Session Engine `draft_invoice_requested`
- Finance queue
- Patient history
- Patient account summary readiness
- future Patient Link flags

### Testing

Validate:

- idempotent draft creation
- duplicate prevention
- totals
- invoice numbering concurrency
- confirmation locking
- permission/RLS behaviour
- reopened-session impact
- draft cancellation
- build and migration safety

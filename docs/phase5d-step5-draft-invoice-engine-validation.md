# Phase 5D Step 5: Draft Invoice Engine Validation

## Executive Summary

Phase 5D was reviewed against the approved Draft Invoice Engine architecture, database migration, frontend workspace, Session Engine handoff, Patient History conventions, and permission model.

The Draft Invoice Engine is ready to be marked complete for the current milestone after one forward-only security hardening migration:

`supabase/migrations/202607130005_phase5d_restrict_invoice_total_recalculation.sql`

The hardening migration revokes direct client execution of `recalculate_invoice_totals(uuid)`. Total recalculation remains available through invoice-line triggers and approved invoice RPCs.

Payments, statements, PDFs, communication delivery, Patient Link invoice rendering, medical aid claims, credit notes, write-offs, accounting exports, and workflow-execution workers remain intentionally deferred.

## Files Reviewed

- `docs/phase5d-step1-draft-invoice-engine-architecture.md`
- `docs/phase5d-step2-draft-invoice-database-summary.md`
- `docs/phase5d-step3-draft-invoice-frontend-summary.md`
- `docs/phase5d-step4-draft-invoice-integration-hardening-summary.md`
- `supabase/migrations/202607130004_phase5d_draft_invoice_engine.sql`
- `src/pages/Finance.tsx`
- `src/pages/Sessions.tsx`
- `src/auth/permissions.ts`
- `src/lib/database.types.ts`
- relevant finance styles in `src/styles.css`

## Draft Queue Validation

The Finance workspace lists completed sessions only when:

- the session belongs to the active tenant
- `session_status = completed`
- `draft_invoice_request_status` is `requested`, `failed`, or `stale_after_reopen`
- a tenant-scoped `draft_invoice_requested` session workflow event exists

The queue shows missing context warnings for patient, responsible party, therapist, location, billable procedures, missing draft request event, prior failure, and reopened-session states.

Sessions with an existing active primary invoice do not create duplicate drafts. The UI opens the existing invoice, and the database still enforces one active primary session invoice through a unique partial index.

## Draft Creation Results

`create_draft_invoice_from_session(target_session_id)` was statically validated.

Confirmed behaviour:

- requires an authenticated tenant `admin` or `finance` membership through `has_tenant_role`
- locks the source session with `for update`
- requires completed session status
- requires a `draft_invoice_requested` workflow event
- returns the existing active primary invoice idempotently
- blocks archived or merged patients
- requires at least one billable session procedure
- snapshots patient, responsible party, issuer, banking, branding, therapist, location, procedure, and ICD-10 context
- creates invoice lines from billable session procedures
- recalculates totals in the database
- records invoice status history
- records idempotent invoice workflow events
- records patient history for draft creation
- does not allocate a final invoice number during draft creation

Missing billing context creates a `review_required` draft rather than failing the entire flow.

## Snapshot Validation

Patient and responsible-party snapshots are stored in `invoice_party_snapshots`. Issuer and banking snapshots are stored in `invoice_issuer_snapshots`.

Validated boundaries:

- draft snapshot edits update invoice snapshot tables only
- patient and responsible-party source records are not rewritten by invoice edits
- session procedures and price-list source records are not rewritten by invoice line edits
- confirmed invoices are rendered read-only in the Finance UI
- Patient History entries avoid banking-sensitive details and internal finance notes

Confirmed snapshots remain immutable by frontend lifecycle rules and should also be treated as immutable by future server-side mutation APIs.

## Draft Editing Results

The Finance workspace supports approved draft-only edits for:

- recipient snapshot
- issuer snapshot
- billing address
- due date
- payment terms
- invoice notes
- invoice line details
- quantity
- unit price
- discount
- adjustment
- tax
- line order
- invoice-only manual lines
- edit reasons

Step 4 hardening added:

- stale invoice checks before writes
- no-op detection
- immutable-state checks
- duplicate-submit disabling through `saving`
- friendly user-facing error messages
- invoice status history after meaningful draft detail saves

No broad rewrite was required in Step 5.

## Invoice Line Validation

Frontend validation and database constraints align for the current milestone:

- quantity must be greater than zero
- unit price cannot be negative
- discount cannot be negative
- adjustment cannot be negative
- tax rate must be between 0 and 100 in the UI
- line order must be greater than zero
- discount cannot exceed the line amount
- existing line edits require a change reason

Database triggers calculate:

- line subtotal
- tax amount
- line total

Soft-removal is implemented with `deleted_at`; removed lines are excluded from invoice total recalculation.

## Financial Calculation Validation

Financial totals are database-authoritative.

Validated database-calculated fields:

- subtotal
- discount total
- adjustment total
- taxable amount
- tax total
- rounding adjustment
- invoice total
- amount paid
- balance due

The frontend only uses temporary preview calculations for unsaved line display. After line changes, it reloads the selected invoice and displays totals from Supabase.

PostgreSQL `numeric` fields are used for financial values. Negative invoice totals are blocked by line and invoice constraints unless future workflows explicitly support credit notes or write-offs.

## Lifecycle Validation

Current supported lifecycle states:

- `draft`
- `review_required`
- `ready_to_confirm`
- `confirmed`
- `cancelled`

Future states are present in the database for later finance phases but are not exposed as active payment workflows in Phase 5D.

Validated lifecycle rules:

- only `draft` and `review_required` can be marked ready in the UI
- only `draft` and `ready_to_confirm` can be confirmed by RPC
- confirmed invoices cannot return to draft
- cancelled, voided, issued, paid, or written-off invoices are not editable
- reconciliation-required invoices cannot be confirmed
- status history is written for meaningful status transitions

## Ready-to-Confirm Validation

Before ready/confirm actions, the UI validates:

- loaded invoice detail
- editable invoice status
- no reconciliation blocker
- due date
- payment terms
- three-character currency code
- patient snapshot name
- responsible-party name or billing email
- issuer practice or therapist name
- issuer contact detail
- banking snapshot
- at least one invoice line
- valid line values
- non-negative totals
- current user finance permission

The ready workflow writes an idempotent workflow event key:

`invoice:{invoice_id}:invoice_ready_to_confirm:v1`

## Confirmation Validation

`confirm_invoice(target_invoice_id)` was statically validated.

Confirmed behaviour:

- locks the target invoice with `for update`
- requires tenant `admin` or `finance` role
- returns safely for already confirmed or later payment states
- blocks unsupported statuses
- blocks reconciliation-required invoices
- requires at least one invoice line
- requires due date
- recalculates totals before confirmation
- locks the tenant sequence row with `for update`
- allocates the official invoice number transactionally
- increments the tenant sequence
- sets `confirmed_at`, `confirmed_by_profile_id`, final invoice number, and sequence metadata
- creates status history
- creates idempotent workflow events
- creates patient-visible history for invoice availability
- does not trigger PDF, payment, statement, delivery, or Patient Link rendering actions

The UI reloads the invoice after RPC completion and verifies `invoice_status = confirmed` and `invoice_number` before reporting success.

## Invoice Numbering Review

Invoice numbering remains database-owned.

Validated:

- drafts use `draft_reference`
- the frontend never predicts final numbers
- final numbers are allocated only by `confirm_invoice`
- allocation is protected by row locking on `invoice_number_sequences`
- tenant-level uniqueness is enforced on `invoices(tenant_id, invoice_number)`
- repeated confirmation does not allocate a second number
- failed or cancelled drafts do not consume final invoice numbers
- no `max(...) + 1` allocation pattern is used

The current sequence key is `default`. Future financial-year or calendar-year reset strategies are represented in the schema but not implemented as active behaviour yet.

## Reconciliation Validation

Session reopen behaviour exists in the Session Engine. Reopened sessions set session draft-invoice request state to `stale_after_reopen` where appropriate.

Finance validation confirmed:

- reopened/stale sessions appear with warnings
- invoice records carry `reconciliation_required` and `reconciliation_reason`
- reconciliation warnings appear in list/detail contexts
- confirmation is blocked when `reconciliation_required = true`
- invoice edits do not silently mutate source session procedures

Deferred:

- a server-side automation that marks existing unconfirmed invoices as reconciliation-required when a source session is reopened
- credit-note or adjustment handling for confirmed invoices affected by later source corrections

## Patient History Validation

Patient History entries are created for:

- draft invoice created
- invoice confirmed

The design supports draft-cancelled and reconciliation-required entries, but those workflows are not yet exposed as full user actions in Phase 5D.

Validated boundaries:

- entries are tenant-scoped
- entries reference the invoice as source
- patient-visible confirmation copy is concise
- banking details, internal finance notes, clinical notes, and session operational notes are not copied into Patient History

## Workflow Event Validation

Validated event names include:

- `draft_invoice_created`
- `draft_invoice_review_required`
- `draft_invoice_updated`
- `invoice_ready_to_confirm`
- `invoice_number_allocated`
- `invoice_confirmed`
- `patient_link_update_ready`

Workflow events are tenant-scoped and use tenant/idempotency unique indexes. The UI presents friendly labels rather than raw payloads as the primary display.

## Permission Review

Frontend permissions:

- view: `tenant.finance.view` or `tenant.practice.configure`
- manage: `tenant.finance.manage`

Database policies are more conservative:

- invoice reads/writes require tenant `admin` or `finance`
- no policies allow anonymous access
- no hard delete grants are present

This is acceptable for Phase 5D because RLS remains the source of truth. Therapist and receptionist finance access can be expanded later through explicit policy and permission design if the product requires it.

## RLS and Security Review

All Phase 5D finance tables have RLS enabled.

Reviewed tables:

- `invoice_number_sequences`
- `invoices`
- `invoice_lines`
- `invoice_party_snapshots`
- `invoice_issuer_snapshots`
- `invoice_status_history`
- `invoice_workflow_events`

Security strengths:

- tenant membership is checked through `has_tenant_role`
- functions use explicit `search_path = public`
- anonymous execution is revoked from invoice RPCs
- operational records are tenant-scoped
- financial records are not hard-deletable by normal client grants
- clinical notes, patient alerts, session operational notes, and internal clinical content are not loaded in Finance

Security issue found and corrected:

- Direct authenticated execution of `recalculate_invoice_totals(uuid)` was revoked in `202607130005_phase5d_restrict_invoice_total_recalculation.sql`.
- The function remains available internally through triggers and approved invoice RPC execution paths.

## Database Issues Found and Corrected

Corrected:

- Restricted direct client execution of the security-definer total recalculation helper.

No rewrite of `202607130004_phase5d_draft_invoice_engine.sql` was made.

No new tables were added.

## Frontend Issues Found and Corrected

No frontend defects requiring code changes were found in Step 5.

The known maintainability risk is that `src/pages/Finance.tsx` is large. A future refactor can extract:

- invoice data access helpers
- invoice validation helpers
- invoice list and detail components
- line editor components
- formatting utilities

This was not changed in Step 5 because broad refactoring would increase risk without fixing a current correctness defect.

## Code Quality Review

Observed strengths:

- central permission helper is used
- user-facing errors are friendly
- duplicate submissions are guarded through `saving`
- selected invoice state refreshes after list/filter changes
- stale update checks protect against overwriting newer invoice state
- source traceability is visible in the UI
- database totals remain authoritative
- status history and workflow events are visible

Known limitations:

- no dedicated automated test suite exists yet
- local Supabase RPC/RLS/concurrency tests could not be executed in this environment
- Finance workspace should be split into smaller components before the next large finance feature set

## Automated Commands Run

Commands required by the milestone:

- `npm run build`
- `git diff --check`

No lint or test script exists in `package.json`.

Local Supabase migration execution was not run in this validation pass because the available environment previously lacked a running Docker daemon. The deployment dependency remains explicit.

## Deployment Dependencies

Before shared/live functional testing, apply:

1. `supabase/migrations/202607130004_phase5d_draft_invoice_engine.sql`
2. `supabase/migrations/202607130005_phase5d_restrict_invoice_total_recalculation.sql`

Then verify in Supabase:

- all invoice tables exist
- RLS is enabled
- policies are present
- RPCs execute only for allowed tenant users
- `recalculate_invoice_totals(uuid)` is not directly executable by authenticated client sessions
- draft creation is idempotent
- confirmation allocates unique tenant invoice numbers under concurrent attempts

## Not Fully Verifiable Locally

The following require a live or local Supabase database runtime with seeded tenant, patient, session, procedure, billing, and bank-account data:

- full migration execution
- actual RPC behaviour
- RLS behaviour by role
- tenant isolation under multiple authenticated users
- invoice numbering under concurrent confirmation
- trigger execution with live rows
- financial recalculation using persisted database data
- patient history display from live records

## Deferred Functionality

Deferred beyond Phase 5D:

- payment capture
- payment allocation
- statements
- PDF invoice generation
- WhatsApp/email/SMS communication delivery
- Patient Link invoice rendering
- medical aid claims
- credit notes
- write-offs
- refunds
- accounting exports
- workflow workers/executors
- AI finance review
- real automated test harness

## Final Readiness Assessment

Phase 5D - Draft Invoice Engine is ready to be marked complete for the current milestone.

Completion is conditional on applying both Phase 5D migrations to the target Supabase environment and running live data validation for RPC, RLS, financial calculation, numbering, and concurrency behaviour.

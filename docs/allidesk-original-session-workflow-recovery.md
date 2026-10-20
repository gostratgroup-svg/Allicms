# AlliDesk Original Session Workflow Recovery

## 1. Purpose and Evidence Method

This document recovers the session-centred AlliDesk product methodology from repository evidence. It does not introduce requirements or change the approved backend architecture.

Evidence reviewed:

- Current architecture and implementation documents, especially [Phase 5C Session Engine Architecture](./phase5c-step1-session-engine-architecture.md), [Phase 5D Draft Invoice Engine Architecture](./phase5d-step1-draft-invoice-engine-architecture.md), [Phase 5E Finance Workflow Architecture](./phase5e-step1-finance-workflow-architecture.md), and [Phase 6A Clinical Engine Architecture](./phase6a-step1-clinical-engine-architecture.md).
- Current forward-only migrations in `supabase/migrations`, generated database types, and the current Bookings, Sessions, Clinical, Finance, and Patient frontends.
- Git history on `main`, including the early integrated prototype at commit `e0c1e95` and later production-engine commits.
- Available branches and tags. Only `main`, `origin/main`, `v0.4.0-phase4a`, and `v0.5.0-phase4-complete` were present. No separate archived design branch was found.

Evidence labels used below:

- **Original prototype evidence**: behaviour visible in early committed product UI.
- **Explicit documented requirement**: a requirement stated in an approved architecture or workflow document.
- **Implemented capability**: supported by current schema, RPC, or live frontend code.
- **Uncertain**: not answerable from repository evidence.
- **Proposal**: a new arrangement inferred from the recovered methodology, not an original requirement.

## A. Recovered Original Session Workflow

### A.1 Product principle

The strongest recovered principle is:

> **Booking creates intent; session records delivery.**

The explicit workflow is:

```text
Booking
  -> Check-in
  -> Session ready
  -> Session started
  -> Clinical work
  -> Session completed
  -> Draft invoice readiness
  -> Patient history
  -> Patient Link update
  -> Workflow events
```

This is explicitly documented in [Phase 5C](./phase5c-step1-session-engine-architecture.md#2-core-principles). It formalises the earlier prototype, where selecting an appointment opened a single session workspace containing patient context, planning, notes, delivered-service billing, account status, and invoice actions (`e0c1e95:src/App.tsx`, `SessionDetailView`, historical lines 2081-2407).

### A.2 Recovered therapist journey

The following stages are supported by repository evidence:

1. **Open the scheduled booking**
   - The original calendar opened a saved-session modal directly from a calendar event.
   - The modal showed patient, session type, date, time, therapist, and room.
   - Source: `e0c1e95:src/App.tsx`, historical `Sessions` and `SessionDetailModal`, lines 1807-2078.

2. **Review patient and session context**
   - The session header linked directly to the patient profile.
   - The patient workspace separately exposed notes, prior sessions, finance, documents/reports, and history.
   - Source: `e0c1e95:src/App.tsx`, historical lines 2160-2215 and 2580-2824.

3. **Plan the session**
   - A dedicated planning area captured goals, preparation items, and therapist plan.
   - This was prototype state, not a durable clinical record.
   - Source: `e0c1e95:src/App.tsx`, historical lines 2230-2273.

4. **Conduct and document clinical work**
   - The original session workspace allowed `Session Feedback`, `Session Process Note`, and `Case Management` entries.
   - Session Feedback was marked patient-facing; process and case-management notes were internal.
   - Source: `e0c1e95:src/App.tsx`, historical `noteTypeOptions`, lines 403-407, and note editor lines 2274-2303.
   - The production Clinical Engine later separated formal clinical documentation from operational session notes. Current clinical notes are versioned and may link to a clinical encounter, booking, and session.

5. **Confirm what was delivered**
   - The documented production methodology copies booked procedures into the session, then allows the therapist to confirm or adjust the final delivered procedures with a reason.
   - Session procedures preserve service, code, price, quantity, duration, and billing snapshots.
   - Source: [Phase 5C](./phase5c-step1-session-engine-architecture.md) and `supabase/migrations/202607130002_phase5c_session_engine.sql`.

6. **Complete and review the session**
   - The formal session lifecycle defines `not_started`, `ready`, `in_progress`, `paused`, `completed`, `cancelled`, `no_show`, and `reopened` states.
   - Completion requires responsible therapist, actual timing, attendance, outcome, and at least one active billable delivered procedure.
   - The completion operation records status history, workflow events, patient history, and draft-invoice readiness.
   - Source: [Phase 5C](./phase5c-step1-session-engine-architecture.md) and `complete_session(...)` in `supabase/migrations/202607130002_phase5c_session_engine.sql`.
   - Current production UI exposes only backend-supported transitions. Start, pause, resume, cancel, and no-show are not currently exposed because no approved protected RPC implements them.

7. **Carry progress forward**
   - The original patient workspace showed chronological sessions, notes, patient history, assessments, and reports.
   - The current backend supports longitudinal progress through clinical note versions, treatment plans, goals, goal reviews, assessments, outcome measures, encounters, session history, and patient history events.
   - Source: historical `e0c1e95:src/App.tsx`, lines 2664-2824; [Phase 6A](./phase6a-step1-clinical-engine-architecture.md); `supabase/migrations/202607150001_phase6a_clinical_engine.sql`; and Phase 6C/6D migrations.

8. **Create billing readiness from delivered care**
   - Session completion requests a draft invoice but does not itself own the invoice.
   - The Finance Engine creates one active session-derived draft invoice from final billable `session_procedures`.
   - Source: [Phase 5D](./phase5d-step1-draft-invoice-engine-architecture.md) and `create_draft_invoice_from_session(...)` in `supabase/migrations/202607130004_phase5d_draft_invoice_engine.sql`.

9. **Confirm, issue, and pay the invoice**
   - Invoice lines retain `source_session_procedure_id`; the invoice retains `session_id`, `booking_id`, and `patient_id`.
   - Payments are recorded independently and allocated to invoices through `payment_allocations`. The payment therefore relates back to a session through the allocated invoice.
   - Source: Phase 5D and Phase 5E migrations and architecture documents.

### A.3 What was not recovered as an exact original requirement

No source defines a mandatory, named therapist wizard such as “Preparation -> Treatment -> Assessment -> Note -> Billing -> Sign-off.” The repository supports those concepts, but their exact order and whether they must be enforced were not documented.

No source defines an automatic clinical report-generation algorithm from session history. The prototype displayed report/assessment availability, while the production Clinical Engine stores the longitudinal source material. Report generation itself remains unimplemented and underspecified.

The prototype placed ICD codes in the billing area of the session. Later approved architecture explicitly moved ICD-10 to the patient/diagnosis context and treats invoice coding as a snapshot. The later architecture is authoritative; the prototype arrangement should not be restored literally.

## B. Existing Session Database and RPC Contracts

### B.1 Session-owned records

| Contract | Current responsibility |
| --- | --- |
| `sessions` | Operational delivery record linked to tenant, booking, patient, therapist, and location. Stores schedule snapshots, actual timing, attendance, outcome, completion, reopen data, and finance-readiness flags. |
| `session_procedures` | Final delivered service snapshots used for completion and invoice generation. |
| `session_status_history` | Append-oriented lifecycle history. |
| `session_notes` | Non-clinical operational notes only; not a substitute for formal clinical documentation. |
| `session_workflow_events` | Idempotent integration events such as session creation, procedure changes, completion, and draft-invoice requests. |

Primary source: `supabase/migrations/202607130002_phase5c_session_engine.sql` and hardening migration `202607130003_phase5c_session_rpc_hardening.sql`.

### B.2 Protected session operations

| RPC | Capability | Current state |
| --- | --- | --- |
| `create_session_from_booking(target_booking_id)` | Idempotently creates one session from an eligible booking and copies booked procedures. | Implemented and used by current Sessions UI. |
| `complete_session(...)` | Validates delivered care, completes session and booking, and emits history/workflow/invoice-readiness records. | Implemented and used by current Sessions UI. |
| `reopen_completed_session(target_session_id, reason)` | Reopens a completed session with reason and marks invoice readiness stale for reconciliation. | Implemented and used by current Sessions UI. |
| Start/pause/resume/cancel/no-show RPCs | Protected transitions described by the architecture. | Not found. Current UI correctly does not bypass lifecycle protection. |

### B.3 Clinical contracts linked to sessions

Current clinical foundations include:

- `clinical_encounters`, optionally linked to booking and session.
- `clinical_notes` and immutable/versioned `clinical_note_versions`.
- structured template definitions, versions, fields, responses, validation, and copy-forward audit.
- `treatment_plans`, `clinical_goals`, and `clinical_goal_reviews`.
- assessment definitions, outcome-measure definitions, assessments, results, and scoring records.
- diagnoses/coding references and clinical attachments.
- explicit clinical publication records for controlled Patient Link exposure.

Primary sources: `202607150001_phase6a_clinical_engine.sql`, Phase 6A hardening migrations, Phase 6B documentation migrations, Phase 6C template migrations, and Phase 6D assessment migrations.

### B.4 Finance contracts linked to sessions

| RPC/record | Relationship |
| --- | --- |
| `create_draft_invoice_from_session(session_id)` | Creates the finance-owned draft from final delivered procedures. |
| `invoices.session_id` | Preserves the source session relationship. |
| `invoice_lines.source_session_procedure_id` | Traces each derived line to delivered service. |
| `confirm_invoice(invoice_id)` | Freezes the reviewed financial obligation and snapshots. |
| `issue_invoice(invoice_id)` | Issues the confirmed invoice. |
| `record_payment(...)` | Records a payment and optional allocations. |
| `allocate_payment(payment_id, allocations)` | Supports partial and many-invoice allocation. |
| `payment_allocations.invoice_id` | Connects payment to invoice, and indirectly to booking/session. |
| `reverse_payment(...)` | Reverses payment effects without destructive deletion. |

Primary sources: `202607130004_phase5d_draft_invoice_engine.sql`, `202607170005_operational_readiness_confirm_invoice_repair.sql`, `202607130006_phase5e_finance_workflow.sql`, and `202607130007_phase5e_reverse_account_credits.sql`.

## C. Existing Relationships Across Domains

### C.1 Authoritative relationship chain

```text
Patient
  -> Booking (scheduled intent)
    -> Booking Procedures (planned services)
      -> Session (delivered care)
        -> Session Procedures (delivered services)
        -> Clinical Encounter (clinical context)
          -> Clinical Notes / Versions
          -> Treatment Plans / Goals / Goal Reviews
          -> Assessments / Outcome Results
        -> Draft Invoice Request
          -> Invoice
            -> Invoice Lines (snapshots of session procedures)
            -> Payment Allocations
              -> Payment
              -> Receipt
```

Patient history, audit events, and workflow events observe meaningful transitions across this chain without taking ownership of source records.

### C.2 Progress between sessions

**Implemented capability:** progress can be reconstructed from dated sessions, clinical encounters, signed/versioned notes, treatment-plan goals, goal reviews, repeated assessments/outcome measures, and patient history events.

**Previously implemented UI:** the early patient workspace grouped Notes, Sessions, Documents & Reports, and History. The current Clinical page provides clinical timelines, templates, structured responses, goals, assessments, publications, and encounter/session linking.

**Missing:** there is no single consolidated “progress between sessions” presentation in the current Practice frontend and no confirmed rule describing which measures should be compared automatically.

### C.3 Clinical reports

**Original prototype evidence:** the patient workspace and Patient Link displayed report/assessment availability and uploaded report context.

**Existing backend capability:** clinical notes, report-type encounters/notes, assessments, goals, attachments, and longitudinal structured outcomes provide report source data.

**Not implemented:** no dedicated clinical-report generator, report compilation RPC, or session-history-to-report workflow was found. Financial PDF generation must not be mistaken for clinical reporting.

### C.4 Billing and payments

The production design deliberately avoids coupling clinical content to finance:

- Session procedures are the billing handoff.
- Invoice lines are immutable financial snapshots after confirmation.
- Editing an invoice does not rewrite the session.
- Editing or reopening a session does not silently rewrite an issued invoice; reconciliation is explicit.
- Payments allocate to invoices, not directly to sessions.
- The relationship to the session remains traceable through invoice and line source keys.

This preserves clinical/financial separation while still allowing the full care-to-payment chain to be audited.

## D. Original Intent Compared With the Current Frontend

| Area | Recovered intent | Current frontend | Difference |
| --- | --- | --- | --- |
| Entry point | Open a calendar item into a patient-centred session workspace. | Bookings and Sessions are separate routed pages; a booking can be converted/opened as a session. | The operational path exists but feels module-centred rather than session-centred. |
| Session context | Patient, schedule, therapist, room, planning, notes, billing, account status together. | Sessions shows operational facts, delivered procedures, completion/reopen, non-clinical notes, status and workflow history. Clinical and Finance are separate pages. | Safer domain ownership, but more navigation and less continuity. |
| Clinical capture | Session Feedback, Process Note, Case Management within the session. | Formal clinical capture lives in Clinical, with versioning/templates/signing and encounter/session links. | Production capability is stronger, but the session page is not the primary launch point into it. |
| Progress | Patient notes, prior sessions, history, assessments, reports. | Data exists across Patients and Clinical; current Clinical timeline supports longitudinal evidence. | No unified session-to-prior-progress review panel. |
| Delivered service | Edit billing item and price in session context. | Delivered procedures are confirmed in Sessions and feed Finance. | Production model correctly separates delivered-service truth from invoice truth. |
| Completion | Original prototype had cancel/no-show and invoice status controls; no durable completion methodology. | Protected complete/reopen RPCs and eligibility validation exist. | Production lifecycle is more rigorous; several documented lifecycle transitions lack RPC/UI support. |
| Invoice | Invoice status and patient account visible inside session modal. | Draft generation, review, confirmation, issue, payments, receipts, statements, and PDFs live in Finance. | Traceability exists, but session workspace does not provide a concise linked finance summary/action path. |
| Reporting | Prototype showed report availability. | Clinical source records exist; no generated clinical report flow. | Original aspiration remains incomplete and underspecified. |

The current separation is not an architectural mistake. The gap is primarily orchestration and navigation: users must move between domain pages even though the session is the natural work context.

## E. Backend Foundations to Preserve

The following should remain unchanged in any frontend reconsideration:

1. **Booking and session separation:** booking is planned intent; session is delivered care.
2. **One active session per booking:** enforced through the session creation contract.
3. **Delivered procedure snapshots:** booked services can change during delivery with recorded reasons.
4. **Protected lifecycle RPCs:** frontend controls must never bypass transition rules through direct updates.
5. **Clinical domain ownership:** formal notes, versions, templates, treatment plans, goals, assessments, diagnoses, and clinical attachments stay in the Clinical Engine.
6. **Clinical immutability:** finalised/signed clinical records are amended through append-only versions, not overwritten.
7. **Finance domain ownership:** invoice and payment records remain finance-owned snapshots and obligations.
8. **Session-to-invoice traceability:** preserve `session_id` and `source_session_procedure_id` links.
9. **Payment allocation model:** payments continue to allocate to invoices, allowing partial and multi-invoice payments.
10. **Tenant isolation and permission boundaries:** finance users do not gain clinical content; reception does not gain restricted clinical access; Super Admin has no default tenant clinical access.
11. **Patient-facing publication boundary:** only explicitly published content is exposed; internal clinical records are never made patient-visible by implication.
12. **History, audit, and workflow records:** meaningful events remain append-oriented and idempotent where required.

## F. Proposed Session-Centred Practice Frontend

> **Proposal only:** This section is not a recovered original requirement. It is the smallest frontend interpretation of the recovered session methodology that reuses current components and contracts.

### F.1 Primary experience

Make the practitioner’s daily list/calendar the main operational entry point. Opening an appointment should open a full session workspace that orchestrates existing domain components rather than duplicating their logic.

```text
Today / Calendar
  -> Open patient session
     1. Context
     2. Prepare
     3. Deliver and document
     4. Review progress
     5. Confirm delivered services
     6. Complete
     7. Billing follow-through
```

These labels are proposed interface groupings, not mandatory new lifecycle states.

### F.2 Suggested workspace composition

- **Sticky context header:** patient, alerts, therapist, location, scheduled/actual time, lifecycle status.
- **Patient context:** concise demographics, responsible party, alerts, consent state, current diagnosis/codes.
- **Previous progress:** last session summary, active goals, latest goal reviews, relevant assessment trend.
- **Clinical work:** embed or deep-link the existing `ClinicalDocumentationWorkspace` preselected to patient, encounter, booking, and session.
- **Delivered services:** reuse the existing Sessions procedure editor and completion eligibility checks.
- **Completion:** reuse `complete_session(...)`; show missing requirements and supported actions only.
- **Finance handoff:** show draft-invoice readiness and linked invoice/payment summary; deep-link to the existing Finance workspace for financial editing and payment operations.
- **Timeline:** combine existing session status, patient history, clinical timeline, and finance status references without merging their source tables.

### F.3 Reusable current frontend assets

| Existing asset | Reuse opportunity |
| --- | --- |
| `src/pages/Bookings.tsx` | Daily/calendar selection and booking context. |
| `src/pages/Sessions.tsx` | Session creation, delivered procedures, completion/reopen, eligibility, history, and workflow events. |
| `src/components/clinical/ClinicalDocumentationWorkspace.tsx` | Structured/free-text note creation, templates, versioning, copy-forward, and clinical timeline. |
| `src/pages/Clinical.tsx` | Encounter, treatment-plan, goal, assessment, attachment, diagnosis, and publication data orchestration. |
| `src/pages/Finance.tsx` | Draft generation, invoice lifecycle, payment allocation, receipts/statements, and financial documents. |
| `src/pages/Patients.tsx` | Patient identity and related-record context. |
| Shared `PageHeader`, `Card`, `Button`, `StatusBadge`, loading/empty/error states | Consistent shell and state handling. |

### F.4 Design constraint

The session workspace should be a composition layer. It should pass IDs and context to existing domain operations, not create a parallel session note, invoice, report, or payment implementation.

## G. Questions Not Answerable From Existing Evidence

1. Is the intended therapist flow a strict ordered checklist, or a flexible workspace with completion requirements?
2. Must therapists explicitly start and pause a session, or are actual start/end times sufficient for the first product experience?
3. Should check-in be performed by reception, the therapist, or either role?
4. Which information must be visible before the therapist begins: alerts, consent, intake completeness, diagnosis, previous note, active goals, latest assessment, outstanding balance, or some subset?
5. Is “session planning” formal clinical content that must be versioned, or a temporary operational preparation field?
6. Which note types are compulsory per completed session, if any?
7. Should patient-facing feedback be part of the signed clinical note, a separate publication, or a distinct session outcome?
8. What exact progress view should compare sessions: narrative notes, goals, outcome measures, attendance, delivered procedures, or all of these?
9. What constitutes a clinical report, who initiates it, which session records it includes, and whether it is generated, compiled, or manually authored?
10. Should report preparation be tied to a session, a clinical encounter, a date range, a treatment plan, or an assessment series?
11. At what point should a draft invoice be created: automatically on completion or only after explicit finance review? The backend supports request/readiness plus explicit draft creation.
12. May a therapist adjust price during session delivery, or only confirm service/code/quantity while finance controls price overrides?
13. What should happen when a completed session is reopened after its invoice has been confirmed or issued?
14. Which finance summary belongs in the session workspace without exposing unnecessary account information to therapist-only users?
15. Are cancellation and no-show required session actions for the initial session-centred frontend, given that protected RPCs for those transitions were not found?

## Conclusion

The original AlliDesk direction was not simply a set of conventional modules. The recovered product idea was a **session-centred workspace** where the practitioner moved from scheduled intent through care delivery, clinical capture, progress, delivered services, and billing follow-through.

The current backend has preserved and strengthened almost all of the required relationships. The principal disconnect is the frontend orchestration: operational sessions, formal clinical documentation, longitudinal progress, and finance are implemented as separate workspaces rather than presented as one coherent session journey. Clinical report generation and several exact workflow decisions remain unconfirmed and should be resolved by the Product Owner before implementation.

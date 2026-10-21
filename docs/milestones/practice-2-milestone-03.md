# Practice 2.0 - Milestone 3

## Patients & Patient Link UX

## Milestone Baseline

- Status: **CLOSED FOR PRODUCT TECHNICAL LEAD REVIEW**
- Start date: 2026-10-20
- Branch: `practice-2-frontend`
- Baseline commit: `e9b813d17f268e45575b0c63c952939fd3abe02d`
- Baseline commit message: `Exclude local deployment artifacts`
- Baseline Git tree: `627ea8a7ec0d8d0410013c7daf269732966cea72`
- Working tree: no tracked changes; one generated untracked Supabase branch directory
- Development Supabase: `allidesk-dev` (`wdhfhdpcrcuyxqjehiyy`)
- Migration state: 43 local migrations; local and remote match through `202607180010`
- Latest migration: `202607180010_invoice_total_recalculation_guard_repair.sql`

### Existing Dirty File

| Status | File | SHA-256 | Bytes | Notes |
| --- | --- | --- | ---: | --- |
| Untracked | `supabase/.branches/_current_branch` | `0d6e4079e36703ebd37c00722f5891d28b0e2811dc114b129215123adcce3605` | 4 | Generated Supabase CLI branch marker. Excluded from commits and deployments by `.vercelignore`. |

The baseline contains no staged changes. The generated branch marker must not be attributed to Milestone 3, removed, committed, or altered without a specific need.

## Product Direction

- The Calendar is the therapist's daily desk.
- The Patient Profile is the filing cabinet.
- The Session is the centre of clinical work.
- One patient record supports multiple convenient entry points.
- The first intended practitioner is an occupational therapist operating a small practice.
- Customer-facing Practice UX takes priority over additional Super Admin work.

## Existing Patient Experience Review

### Patient Records

The active `/patients` route uses `PatientsPage` and live tenant-scoped Supabase records. It currently supports:

- Patient list, search and lifecycle-status filtering.
- Patient creation and editing with basic demographic and contact fields.
- Prospective, intake, registered, active, inactive, archived and merged lifecycle values.
- Patient archive through soft lifecycle fields rather than hard deletion.
- One active ICD-10 code and assigned therapist reference on the patient record.
- Permission-aware read and edit states using the existing authorisation framework.
- Loading, empty, validation, success and error states.

### Patient Folder Data

The current patient workspace reads and writes the existing Patient Engine tables for:

- Responsible parties and billing contacts.
- Patient residential address.
- Emergency contacts.
- Medical information and medical-aid details.
- Internal alerts and allergies, including patient-visible eligibility metadata.
- Consent records and consent lifecycle states.
- Internal patient history events.

Meaningful patient, responsible-party, alert, consent and archive actions add patient history events. Related records remain tenant-scoped and use soft archive/revocation behavior where supported.

### Calendar And Session Entry Points

- Calendar booking creation uses the live patient table and can create a basic patient and optional guardian without leaving the booking panel.
- Bookings, sessions, invoices and clinical records carry patient references in their existing domain tables.
- Session lifecycle operations create operational patient history events through approved database operations.
- The current Patient Profile does not yet assemble bookings, completed sessions, finance, documents and clinical summaries into one folder view.

### Clinical Documentation

The internal Clinical Workspace is reachable at `/patients/clinical?patient=<id>` when the user has clinical access. It loads patient-scoped:

- Bookings and sessions.
- Clinical encounters.
- Clinical notes, versions, structured responses and amendments.
- Treatment plans and goals.
- Assessments and outcome measures.
- Diagnoses.
- Clinical attachments.
- Record restrictions.
- Explicit Patient Link publications.

Protected RPCs remain responsible for clinical draft creation, finalisation, signing, amendment and Patient Link publication. Finalised and signed content is not edited destructively.

### Patient Link

The external `/p/:publicIdentifier/*` route is separate from staff authentication and currently provides:

- Public identifier lookup without exposing patient IDs.
- Verification challenges with hashed codes.
- External session tokens, expiry, logout and revocation.
- Active access-grant checks and responsible-party dependent switching.
- Suspended, revoked, expired, archived, replaced and unavailable states.
- Tenant/practice branding and contact details.
- Read-only patient identity summary.
- Patient-visible appointments.
- Issued patient-visible invoices and balances.
- Issued receipts.
- Patient-facing consent status.
- Access logging for approved events.

The hardened portal projection applies access-grant visibility settings and responsible-party finance boundaries. Private clinical tables are not queried directly by the browser.

### Documents

- Secure `document_files` metadata, tenant-scoped Storage paths, signed access and explicit `patient_link_visible` controls exist.
- Clinical attachments have separate metadata and publication controls.
- Internal staff upload and access foundations exist.
- The current Patient Profile does not yet present a unified patient document folder.
- The current Patient Link projection and UI do not yet expose explicitly shared document files.

## Genuine Backend Or Contract Gaps

No backend redesign is required for the first Patient Profile UX refinements. The following requested Patient Link outcomes are not currently available through its portal projection and would require a separately approved, forward-only database change before the UI can represent them honestly:

1. Finalised Session Feedback history is not included in `get_patient_link_portal_data(...)`, even though explicit clinical publication records exist.
2. Patient statements are not included in the Patient Link portal projection.
3. Explicitly shared `document_files` are not included in the Patient Link portal projection.
4. The internal Patient Profile has no integrated staff control surface for creating, resetting, suspending or revoking the patient's existing Patient Link contracts.
5. Email notification after Session Feedback publication has no approved delivery implementation and remains outside this milestone unless separately approved.

These are integration gaps, not reasons to replace the existing Patient, Clinical, Storage or Patient Link architecture. No migration is approved or created by this baseline review.

## UX Findings Ready For Product Owner Refinement

### Patients Page

- The page begins with a large explanatory Patient Engine card that describes integrations as disconnected, even though several are now implemented.
- Patient identity editing and the sectioned patient workspace compete for attention instead of presenting one coherent filing-cabinet view.
- The section structure is functional but operational relationships are split across Patients, Clinical, Sessions and Finance routes.
- Saved patient details do not yet consistently follow the clean locked/read-only presentation established during Milestone 1.

### Patient Folder

- Existing detail, guardian, address, emergency, medical, alert, consent and history forms can be retained.
- Session history, clinical-document navigation, financial history and patient documents need clearer entry points from the same patient context.
- Navigation should preserve the selected patient when moving between Patient, Calendar, Session and Clinical views.

### Patient Link UX

- The secure verification and access-state handling are already implemented and should be preserved.
- The current portal is a practical read-only foundation, not a complete patient-facing profile.
- Appointment, invoice, receipt, consent and dependent-access screens are ready for visual refinement.
- Session Feedback, statements and explicitly shared documents must remain absent until their secure projections are approved and implemented.
- Internal Process Notes and Session Plans must never be exposed through Patient Link.

## Implementation Boundaries

- Preserve existing tenant isolation, RLS, protected RPCs, clinical immutability and audit history.
- Preserve separate internal and patient-facing publication boundaries.
- Do not add Super Admin work, new clinical modules, AI, payment gateways, claims, enterprise features or new backend architecture.
- Do not create a migration without Product Owner approval.
- Record each Product Owner request and its validation in the running log below.

## Running Change Log

| Date | Requested change | Status | Files changed | Validation |
| --- | --- | --- | --- | --- |
| 2026-10-20 | Start Milestone 3, capture the exact baseline and review the existing Patient and Patient Link experience. | Complete | `docs/milestones/practice-2-milestone-03.md` | Git branch, HEAD, tree, dirty-file fingerprint, linked Supabase project and migration parity recorded. Static implementation review completed; no application, database or remote configuration changes. |
| 2026-10-20 | Refine Calendar visibility with a centred today underline, faded elapsed/completed appointments and a top-right orange task dot. | Complete | `src/pages/Bookings.tsx`, `src/styles.css`, `docs/milestones/practice-2-milestone-03.md` | Today is derived from the active practice timezone. The dot appears only after an appointment has elapsed or its session is complete and authoritative records show an outstanding Process Note, Session Feedback or invoice confirmation; drafts do not clear note tasks. Past appointments without a linked session remain actionable. Explicit per-note skipped status is not persisted, so only completed clinical lifecycle states clear documentation tasks. |
| 2026-10-20 | Open Calendar sessions in the same compact right-side panel presentation as Add Booking. | Complete | `src/styles.css`, `docs/milestones/practice-2-milestone-03.md` | Removed the Session panel's 1040px desktop override. The existing embedded Session Workspace, close behavior and Calendar context are preserved; narrow screens continue using the established full-screen responsive panel. |
| 2026-10-20 | Refine the embedded Session Workspace around Session Details and Notes. | Partially complete | `src/pages/Sessions.tsx`, `src/styles.css`, `docs/milestones/practice-2-milestone-03.md` | Calendar appointments now create or open their session automatically through the existing idempotent `create_session_from_booking(...)` RPC, removing the misleading intermediate Create Session state. Completed sessions remain selectable in the embedded panel. `Patient Profile` is renamed `Patient File`; the broad Clinical Workspace shortcut is removed; Session Details and Notes tabs organise the workspace; saved details use a borderless presentation and the pencil reveals completion fields; Notes separates internal Session Planning, patient-shared Session Feedback and internal Process Notes. Completion continues through `complete_session(...)`. Cancelled and No Show remain visibly unavailable because no approved protected lifecycle RPC exists for either transition; no direct update bypass was introduced. |
| 2026-10-20 | Refine Session panel chrome and prioritise documentation. | Complete except protected terminal transitions | `src/pages/Sessions.tsx`, `src/styles.css`, `docs/milestones/practice-2-milestone-03.md` | The global notification and account controls are hidden while the Session side panel is open; Patient File is centred without link underlining; session status is a compact pill beneath the patient name; Notes is the default tab; the Session Details pencil reveals editable completion fields. Cancelled and No Show require separately approved protected lifecycle RPCs before their controls can be enabled. |
| 2026-10-20 | Add a Finance tab to the embedded Session Workspace. | Complete | `src/pages/Sessions.tsx`, `docs/milestones/practice-2-milestone-03.md` | Reused the existing live session billing summary, invoice status and Finance links in a dedicated third tab. No finance contracts or backend behavior changed. |
| 2026-10-20 | Remove status history and workflow events from the Session Workspace. | Complete | `src/pages/Sessions.tsx`, `docs/milestones/practice-2-milestone-03.md` | Removed the technical audit timeline from the practitioner-facing workspace. Underlying status-history and workflow-event records and writes remain unchanged. |
| 2026-10-20 | Move Booked Services and Delivered Procedures permanently into the Finance tab. | Complete | `src/pages/Sessions.tsx`, `docs/milestones/practice-2-milestone-03.md` | Finance now groups planned service charges, delivered procedure editing and billing follow-through. Session Details remains focused on operational session information. No finance data contracts changed. |
| 2026-10-20 | Simplify Session Details and make its core creation context editable. | Complete | `src/pages/Sessions.tsx`, `src/pages/Bookings.tsx`, `docs/milestones/practice-2-milestone-03.md` | Removed booking status, scheduled end, actual timing, diagnosis, charges, attendance, outcome, draft/linked invoice and reopened fields from Session Details. The pencil now edits therapist, location, scheduled start, duration, session type and modality, then tenant-scoped saves both linked booking and session records without changing lifecycle fields. Patient and responsible party remain fixed to protect clinical and financial traceability. |
| 2026-10-20 | Replace the Notes overview with compact add-note composers. | Complete | `src/components/RichTextComposer.tsx`, `src/pages/Sessions.tsx`, `src/pages/Bookings.tsx`, `src/styles.css`, `docs/milestones/practice-2-milestone-03.md` | Notes now presents Add Session Planning, Add Session Feedback and Add Process Note actions. All use one compact editor with bold, bullet and numbered-list formatting plus safe URL rendering. Planning remains an internal session note; feedback and process notes use the existing clinical draft/finalisation RPCs with patient-facing eligibility and internal visibility respectively. |
| 2026-10-20 | Repair the Session Workspace X close action. | Complete | `src/pages/Bookings.tsx`, `docs/milestones/practice-2-milestone-03.md` | Removed the unconditional browser confirmation that intercepted every close attempt. The X now closes the side panel directly without changing the current Calendar date or view. |
| 2026-10-20 | Refine Session Notes formatting and saved-state controls. | Complete | `src/components/RichTextComposer.tsx`, `src/pages/Sessions.tsx`, `src/styles.css`, `docs/milestones/practice-2-milestone-03.md` | Removed italic formatting; retained bold, bullet and numbered-list tools; added clickable URL rendering in saved notes; moved Save into the toolbar; and added the standard pencil edit action after an editable note is saved. Finalised clinical notes remain immutable. |
| 2026-10-20 | Repair the Session panel X after the first event-handler change did not resolve the rendered issue. | Complete, not browser-reverified | `src/pages/Bookings.tsx`, `src/styles.css`, `docs/milestones/practice-2-milestone-03.md` | The hidden global top-bar action container had a higher stacking context and intercepted the X. Pointer handling is disabled for that hidden layer while the Session panel is open; visible notices retain pointer access. |
| 2026-10-20 | Rename the Session Feedback save action to Save & Share. | UI complete; sharing not implemented | `src/pages/Sessions.tsx`, `docs/milestones/practice-2-milestone-03.md` | The action label changed. The implementation saves a clinical draft marked patient-visible eligible; it does not finalise or publish the note to Patient Link. This is a known misleading-label defect. |
| 2026-10-20 | Simplify the Finance tab and procedure editing. | Partially complete | `src/components/icons.tsx`, `src/pages/Sessions.tsx`, `src/styles.css`, `docs/milestones/practice-2-milestone-03.md` | Removed the Billing follow-through heading, reduced Expected Charges to a compact total, changed delivered procedures to a table, added a price-list-backed procedure selector, limited direct editing to quantity, and replaced Remove with a trash icon. Saving persists session procedure snapshots through existing tenant-scoped writes. Expected Charges still reads booking snapshots rather than saved delivered procedures. |
| 2026-10-20 | Add Confirm Invoice beside Expected Charges and establish Session Workspace as the intended invoice entry point. | Partially complete | `src/pages/Sessions.tsx`, `docs/milestones/practice-2-milestone-03.md` | Confirm Invoice appears only when a linked invoice already exists in `draft` or `ready_to_confirm`, and navigates to the existing Finance review workflow. The Session Workspace does not create the draft, confirm it in place, issue it, generate/upload its PDF or send email. |
| 2026-10-20 | Make Process Note and invoice completion drive an orange outstanding indicator and Administration Complete state, with an option to skip Process Note. | Deferred; backend approval required | `docs/milestones/practice-2-milestone-03.md` | Calendar task dots use final clinical note states and confirmed invoice records, but there is no persistent skipped-note contract and no Administration Complete state. Existing clinical completion must precede invoice creation, so financial follow-through cannot replace the protected clinical completion lifecycle. |
| 2026-10-20 | Enable Cancelled and No Show below Completed. | Deferred; protected RPC missing | `docs/milestones/practice-2-milestone-03.md` | Controls remain disabled. Direct lifecycle updates are correctly rejected by the deployed guard; no migration was approved to add protected terminal-transition RPCs. |
| 2026-10-20 | Confirm invoices in Session Workspace, retain them in Finance for statements, and automatically email the billing contact. | Product direction recorded; not implemented | `docs/milestones/practice-2-milestone-03.md` | Existing session, draft invoice, confirmation, issue, PDF and statement foundations remain separate and reusable. No in-panel orchestration or email provider/delivery implementation was added. |

## Validation Status

- Static implementation review: completed.
- Supabase project and migration parity: verified against `allidesk-dev`.
- Authenticated browser validation: not performed during this baseline review.
- Application behavior changes: none.
- Database changes: none.
- Deployment, commit and push: none.

## Milestone Closure Summary

Milestone 3 began as **Patients & Patient Link UX**, but Product Owner activity concentrated on the Calendar and embedded Session Workspace. No Patient Profile or Patient Link source file changed after the baseline. The resulting local increment makes sessions easier to open, review, document and prepare for billing, but it does not complete the approved session-centred invoice workflow or the originally named Patient/Patient Link UX objective.

### Baseline Comparison

- Baseline commit and current HEAD: `e9b813d17f268e45575b0c63c952939fd3abe02d`.
- Baseline Git tree: `627ea8a7ec0d8d0410013c7daf269732966cea72`.
- `origin/practice-2-frontend` also points to `e9b813d`; Milestone 3 application changes are uncommitted and unpushed.
- The baseline had no tracked changes. Therefore all current tracked diffs in the files below are attributable to Milestone 3.
- `supabase/.branches/_current_branch` predates the milestone and remains an excluded generated file.
- The milestone document and `RichTextComposer.tsx` are new untracked files. This is intentional local work, not a deployed artifact.

## Full Change Inventory

### Calendar / Bookings

Changed `src/pages/Bookings.tsx` and shared Calendar styles in `src/styles.css`:

- Reworked the Week header so the practice-timezone current day has one centred orange underline beneath its combined weekday/date label.
- Faded elapsed and completed appointments while keeping them clickable.
- Removed appointment-card Edit text to reduce crowding.
- Added a top-right orange action dot for elapsed/completed work with authoritative outstanding tasks.
- Clinical task checks read finalised/signed/amended/locked Process Notes and Session Feedback only; drafts do not clear the dot.
- Invoice-confirmation checks follow linked session procedures and confirmed, non-cancelled/non-voided invoices.
- Preserved the separate issued-invoice finance icon behavior.
- Kept all statuses visible under the existing all-status Calendar default.
- Opened sessions in the right-side panel and propagated booking, session and note changes back into Calendar state.
- Removed the unconditional close confirmation and repaired the top-bar stacking layer that intercepted the Session panel X.

### Session Workspace

Changed `src/pages/Sessions.tsx`, `src/styles.css`, `src/components/icons.tsx`, and added `src/components/RichTextComposer.tsx`:

- Eligible Calendar bookings create or retrieve their session through the existing idempotent `create_session_from_booking(...)` RPC when opened.
- Replaced the broad workspace with Session Details, Notes and Finance tabs; Notes is the default.
- Renamed Patient Profile to Patient File and removed the broad Clinical Workspace shortcut from the embedded header.
- Moved the session status into a compact pill beneath the patient name.
- Removed technical status/workflow event timelines from the practitioner UI without removing underlying records.
- Simplified Session Details to patient, responsible party, therapist, location, start, duration, type and modality.
- Added pencil/save editing for therapist, location, scheduled start, duration, type and modality. Patient and responsible party are not reassignable from the session.
- Retained protected `complete_session(...)` and `reopen_completed_session(...)` lifecycle calls.
- Left Cancelled and No Show disabled because protected RPCs do not exist.

### Clinical Notes

- Added compact Session Planning, Session Feedback and Process Note composers.
- Session Planning uses internal `session_notes` records.
- Feedback and Process Notes use existing clinical encounter, draft-save and finalisation RPCs.
- Session Feedback is marked `patient_facing` and patient-visible eligible; Process Notes remain internal.
- Formatting is intentionally limited to bold, bullets and numbered lists. URLs render as safe external links in saved view.
- Save sits in the formatting toolbar; editable saved notes expose a pencil; finalised notes remain immutable.
- The visible Save & Share label does not publish to Patient Link and is therefore not evidence of patient delivery.
- No skipped Process Note state was added.

### Session Finance

- Moved booked/delivered service context into the Finance tab.
- Renamed the total summary to Expected Charges.
- Replaced procedure cards with a compact table.
- `+ Add Procedure` adds a row whose procedure is selected from the booking's configured price list.
- Procedure selection populates its snapshot name, code, description, unit price and duration; the user changes quantity only.
- Added a reusable trash icon for line removal.
- Existing session-procedure persistence, change history and workflow records remain in place.
- A Confirm Invoice link appears only for an already-linked draft or ready-to-confirm invoice and opens its existing Finance workflow.

### Patient Management

No Milestone 3 Patient screen/component changes were made. Existing functionality remains as reviewed at baseline:

- Tenant-scoped list/search/filter and patient CRUD.
- Demographics, contacts, responsible parties, addresses, emergency contacts, medical information, alerts, consents and history.
- Soft archive behavior and permission-aware editing.
- Clinical Workspace navigation from Patient context.
- No unified session/finance/document filing-cabinet view was added.

### Patient Link

No Milestone 3 Patient Link code or database contract changed. The existing secure external portal remains responsible for verification, external sessions, grants, appointment context, issued invoices/receipts, consent status, expiry/revocation and access logs. Session Feedback history, statements and explicitly shared document files remain absent from the portal projection. Internal Session Planning and Process Notes remain unexposed.

### Communications

No email, SMS, WhatsApp or other delivery implementation was added. Session Feedback is not emailed. Invoice confirmation does not send an email. Reply-To behavior was not implemented or tested.

## Product Owner Decisions And Delivery Status

| Product decision | Requested outcome | Delivered | Deferred / deviation | Further approval |
| --- | --- | --- | --- | --- |
| Calendar is the daily desk | Historical work stays visible and actionable | Fading, status labels, task dot and embedded session entry implemented | Browser acceptance still required | No architecture approval needed |
| Session is the centre of work | Details, notes and finance in one side panel | Tabs and core editing implemented | Full invoice lifecycle remains outside the panel | Yes, for workflow completion scope |
| Notes are compact | Planning, feedback and process notes with light formatting | Implemented using existing note contracts | No skipped Process Note state | Migration approval required for persistent skip |
| Feedback is shared with patient | Save & Share action | Label and patient-visible eligibility added | No finalisation/publication/email delivery occurs on Save & Share | Product confirmation and integration work required |
| Outstanding work uses orange dots | Process Note, feedback and invoice tasks visible on Calendar | Implemented for final clinical states and confirmed invoices | No skip state; no Administration Complete state | Migration approval required for skip/status contract |
| Cancel / No Show from session | Controls update session and booking | Controls visible but disabled | Protected transition RPC absent | Migration approval required |
| Session-centred billing | Review delivered procedures and confirm from Session | Price-list procedure table implemented; existing draft can be opened in Finance | Draft creation, confirmation, issuing and PDF/email are not orchestrated in Session | Product/technical approval required |
| Confirm sends invoice | Confirmation stores invoice and emails billing contact | Existing Finance tracking/statement foundations preserved | Automatic issuing, PDF delivery and email do not exist | Email-provider and delivery approval required |
| Practice price list is authoritative | Add Procedure selects configured item rather than typing codes/names/prices | Implemented against booking-selected price list | No fallback procedure creation in Session | No further approval |
| Patient Profile is filing cabinet | Consolidated patient record and navigation | Existing Patient Engine retained | No Patient Profile UX implementation occurred | Product Owner refinement remains |
| Ongoing secure Patient Link | Feedback, appointments, documents and finance | Existing appointments/invoices/receipts foundation retained | Feedback, statements and shared documents not projected | Forward-only migration approval required |

## Backend And Database Impact

- New migrations: none.
- Applied migrations during Milestone 3: none.
- Pending local migrations: none.
- New or modified RPCs: none.
- New tables or columns: none.
- RLS, grants, authentication or role changes: none.
- Storage changes: none.
- Patient Link security/projection changes: none.
- Existing RPCs reused: `create_session_from_booking(...)`, `complete_session(...)`, `reopen_completed_session(...)`, `create_clinical_note_draft(...)`, `save_clinical_note_free_text_draft(...)`, and `finalise_clinical_note_version(...)`.
- Existing tenant-scoped table writes reused for non-lifecycle booking/session details, session procedures, session notes, history and workflow records.
- On 2026-10-20, the Supabase CLI independently confirmed the linked project as `allidesk-dev` (`wdhfhdpcrcuyxqjehiyy`) and local/remote migration parity through `202607180010` (43 migrations).

## Functional Status Matrix

| Workflow | Status | UI | Persistence / refresh | Permissions / isolation | Evidence / limitation |
| --- | --- | --- | --- | --- | --- |
| Calendar today underline | Implemented but not fully verified | Implemented | Not data-dependent | Tenant timezone used | Build/static review only after final changes |
| Past/completed appointment fading | Implemented but not fully verified | Implemented | Derived from live booking/session timestamps | Existing scoped reads | No final authenticated visual pass |
| Calendar orange task dot | Partially implemented | Implemented | Live clinical/invoice reads | Clinical detail hidden without clinical permission; finance detail hidden without finance role | No persistent skip state; task definition changed during milestone |
| Open Session side panel | Implemented but not fully verified | Implemented | Existing session or idempotent create RPC | Existing role checks and RLS | Final X fix not authenticated-browser-reverified |
| Session Details view/edit | Implemented but not fully verified | Implemented | Tenant-scoped booking/session updates | Existing RLS; lifecycle fields excluded | No final browser persistence test |
| Complete session | Existing database-verified foundation; UI changed | Implemented | Protected RPC | Admin/therapist RPC authorization | Not rerun in browser this milestone |
| Cancel / No Show | Deferred / not implemented | Disabled controls | No RPC | Direct updates remain blocked | P1 gap for normal exceptions |
| Session Planning | Implemented but not fully verified | Implemented | Internal `session_notes` write/update | Staff-role checks and RLS | Browser save/reopen not evidenced this milestone |
| Session Feedback draft | Partially implemented | Implemented | Clinical draft/save/finalise RPCs | Clinical permission; patient-facing eligibility metadata | Save & Share does not publish or deliver |
| Process Note | Implemented but not fully verified | Implemented | Clinical draft/save/finalise RPCs | Internal clinical visibility | Skip not implemented |
| Rich-note formatting | Implemented but not fully verified | Bold/lists/URLs | Markdown-like text stored in existing note body | No HTML injection path introduced | Visual and persistence acceptance pending |
| Price-list procedure selection | Implemented but not fully verified | Table/dropdown/quantity/trash | Existing session-procedure snapshots | Existing finance/practice visibility and session edit permission | Browser save and refresh not evidenced |
| Expected Charges | Confirmed broken against requested behavior | Displays booking planned total | Does not recalculate from saved delivered procedures | Read-only scoped data | P1 session-centred billing defect |
| Confirm Invoice in Session | Partially implemented | Link appears only for existing draft/ready invoice | No draft creation or in-panel confirmation | Finance route enforces existing permissions | Missing when no linked draft; reported by Product Owner |
| Invoice email delivery | Deferred / not implemented | None | None | No delivery credentials/provider | Must not be represented as sent |
| Patient Profile UX | Deferred / not implemented in milestone | Existing UI only | Existing Patient Engine | Existing RLS/permissions | No Milestone 3 source change |
| Patient Link UX | Deferred / not implemented in milestone | Existing portal only | Existing secure projection | Existing grants/session-token model | Feedback/statements/shared docs absent |
| Guardian access | Existing, not revalidated | Existing dependent switching | Existing grants | Existing projection restrictions | No Milestone 3 browser test |
| Patient documents | Existing internal foundation; portal gap | No unified folder added | Existing Storage/document metadata | Existing signed access and RLS | Shared documents absent from Patient Link projection |

## Validation And Security Evidence

### Performed At Closure

- `npx supabase projects list`: passed; `allidesk-dev` is active and linked.
- `npx supabase migration list --linked`: passed; local and remote match through `202607180010`.
- `npx supabase db lint --linked --level error`: command completed and reported existing database errors listed below.
- `npm run build`: passed during milestone closure; result recorded in the closure validation section below.
- `git diff --check`: passed during milestone closure; result recorded below.

### Existing Evidence Reused

Milestone 2 and Operational Readiness documentation records authenticated RLS, tenant isolation, Finance lifecycle and Storage security validation against the same linked development project through `202607180010`. Milestone 3 introduced no migration, policy, grant or Storage change, so those backend results remain relevant. They do not prove the new UI flows.

### Not Performed

- No authenticated browser journey was completed after the final Milestone 3 changes.
- No Patient Link external-user browser validation was performed.
- No real email delivery was possible or attempted.
- No session Cancel/No Show test was possible because the protected RPCs do not exist.
- Rollback-only SQL harnesses were not rerun because Milestone 3 changed no database object; existing evidence is cited rather than misrepresented as a fresh run.

### Database Lint Findings

The live linked-schema lint reports pre-existing runtime defects not introduced by Milestone 3:

- Ambiguous identifiers in `create_assessment_definition_version_from(...)`, `create_clinical_template_version_from(...)`, `duplicate_clinical_template(...)`, `validate_clinical_structured_response_payload(...)`, `create_or_get_patient_link(...)`, `reset_patient_link_credentials(...)`, and `verify_patient_link(...)`.
- `assessment_response_value_is_valid(...)` references missing `score_min` on its record.
- `archive_document_file(...)` and `finalise_document_upload(...)` reference nonexistent clinical-attachment authorship columns.

These need separate forward-only repairs and runtime regression tests; this closure task did not alter them.

## Deployment Status

- Branch: `practice-2-frontend`.
- HEAD: `e9b813d17f268e45575b0c63c952939fd3abe02d` (`Exclude local deployment artifacts`).
- Remote branch: `origin/practice-2-frontend` at the same commit.
- Current Vercel Production deployment: `dpl_Fvgz3k5LVzmSerVSU5WHSoY8EJ5E`, created 2026-10-20 at 19:43 SAST and aliased to `https://allidesk.co.za`.
- The deployment timestamp immediately follows commit `e9b813d` (19:43:01 SAST) and predates the Milestone 3 baseline/revisions. Milestone 3 changes are therefore local only and not published.
- Live and local differ in all application files listed below plus the new composer component.
- No deployment, commit or push occurred during closure.

## Files Changed During Milestone 3

| File | Status | Milestone responsibility |
| --- | --- | --- |
| `src/pages/Bookings.tsx` | Modified | Calendar status, task indicators, Session panel synchronization and close behavior |
| `src/pages/Sessions.tsx` | Modified | Session tabs, details, notes, finance and price-list procedure workflow |
| `src/styles.css` | Modified | Calendar, panel, notes, tab and procedure-table presentation |
| `src/components/icons.tsx` | Modified | Reusable trash icon |
| `src/components/RichTextComposer.tsx` | New, untracked | Compact note formatting, saved preview and edit controls |
| `docs/milestones/practice-2-milestone-03.md` | New, untracked | Baseline, running log and final handover |
| `supabase/.branches/_current_branch` | Inherited untracked generated file | Not Milestone 3 work; do not commit |

## Outstanding Issues

### P0

- No confirmed Milestone 3-created security or cross-tenant defect.

### P1

- Cancelled and No Show cannot be recorded from the Session Workspace because protected lifecycle RPCs are missing.
- Session-centred invoicing is incomplete: Expected Charges does not update from saved delivered procedures, no draft is created from the Session tab, and Confirm Invoice is absent until a draft already exists.
- Save & Share is misleading: it saves a patient-visible-eligible clinical draft but does not publish to Patient Link or deliver it.
- Patient Link creation/verification/reset RPC lint errors may break first-use or credential-management paths and require runtime confirmation/repair.
- Clinical attachment finalisation/archive functions reference nonexistent columns and may break patient/clinical document workflows.

### P2

- No persistent Process Note skipped state or green Administration Complete state.
- Calendar dot currently considers Session Feedback outstanding as well as Process Note and invoice confirmation; the final Product Owner definition needs consolidation.
- Final Session panel close, note save/reopen, price-list procedure save and responsive table rendering lack authenticated browser acceptance.
- Patient Profile remains split across operational routes rather than the requested filing-cabinet experience.
- Patient Link does not expose feedback history, statements or explicitly shared documents.

### Post-MVP / Explicitly Deferred

- Automatic invoice and Session Feedback email delivery.
- Reply-To routing and communication delivery monitoring.
- Expanded Patient Link content projections pending approved database work.
- New clinical modules, AI, payment gateways, claims, enterprise features and Super Admin expansion.

## Pilot Assessment

The local UI is suitable for continued **fictional Product Owner testing**, but Milestone 3 is not production-ready and is not yet a complete Patient/Patient Link milestone. One OT practitioner can safely begin fictional workflow testing using the existing Finance screen as the invoice workaround, provided no real patient data is entered and the tester understands that Cancel/No Show, Save & Share delivery, in-session invoice confirmation and Process Note skipping are incomplete.

## Recommended Next Milestone

Do not broaden Patient Link or add new modules. The next milestone should be a narrow **Session Workflow Completion and Acceptance** increment:

1. Repair and browser-test session-centred expected charges and draft/confirm invoice orchestration while preserving the existing Finance lifecycle.
2. Add approved protected Cancel/No Show RPCs and a persistent Process Note skipped/completion contract through forward-only migrations.
3. Repair the confirmed Patient Link and clinical-document RPC lint failures, then run one authenticated Calendar -> Session -> Notes -> Finance acceptance journey.

## Closure Validation

Results are populated after the final documentation update:

- `npm run build`: passed (`tsc -b && vite build`; 128 modules transformed). The existing Vite warning remains because the main minified JavaScript chunk is larger than 500 kB.
- `git diff --check`: passed with no whitespace errors.
- Configured lint/test scripts: no application lint, unit-test or typecheck script exists beyond the TypeScript compilation included in `npm run build`.

**Milestone status: CLOSED FOR PRODUCT TECHNICAL LEAD REVIEW.**

## Release Preparation Addendum - 2026-10-21

The Product Owner approved three narrow release-blocker corrections after the closure review. This addendum supersedes the related Session Feedback and session-centred invoicing statements above; the historical running log remains unchanged.

### Corrections Implemented

- Session Feedback now uses **Save Feedback**. Saving produces the explicit confirmation `Session feedback saved privately as a draft.` The UI no longer claims the draft was shared; finalisation, Patient Link publication and email delivery remain separate and unimplemented.
- Session Finance now distinguishes **Planned Charges** from **Delivered Services**. Planned Charges uses the original booking procedure snapshots. Delivered Services totals only authoritative saved billable `session_procedures`, including persisted discount and adjustment amounts. Unsaved edits do not alter the displayed delivered total.
- Completed sessions expose **Prepare Draft Invoice** only to authenticated Admin or Finance roles, only when saved billable delivered services exist and no active invoice is loaded. The action calls the existing protected `create_draft_invoice_from_session(...)` RPC, verifies the returned tenant-scoped invoice, refreshes authoritative Session and invoice state, and does not confirm, issue or create debt.
- Existing draft, review-required and ready-to-confirm invoices expose **Review Draft Invoice**, which opens the established Finance lifecycle rather than claiming confirmation occurred in the Session Workspace.

### Security And Validation

- No database migration, RLS policy, grant or generated type changed.
- Linked development project: `allidesk-dev` (`wdhfhdpcrcuyxqjehiyy`). Local and remote migrations remain aligned through `202607180010`.
- `npm run build`: passed; the existing Vite large-chunk warning remains.
- `git diff --check`: passed.
- `practice_2_milestone_02_blocker_repairs.sql`: passed in its rollback-only transaction, covering draft creation, duplicate prevention, confirmation, issue, payments, reversal and immutability.
- `operational_readiness_authenticated_rls.sql`: passed for tenant isolation, Admin/Therapist/Reception/Finance boundaries, and direct Session/Invoice lifecycle-update rejection.
- Authenticated browser validation was unavailable and is not claimed.

### Remaining Release Risks

- Cancel and No Show still require protected backend operations.
- Process Note skipping has no persistent backend state.
- Session Feedback publication and delivery remain unimplemented.
- The pre-existing Patient Link and clinical attachment database-lint defects remain outstanding.

# AlliDesk Practice 2.0 - Official Milestone 3

## Milestone Identity

- **Name:** Official Milestone 3 - Patient Experience & Cross-Platform Refinements
- **Start date:** 2026-10-21 (Africa/Johannesburg)
- **Repository:** `/Users/gerhardolivier/Go Difference Coding /Allidesk`
- **Branch:** `practice-2-frontend`
- **Baseline commit:** `5ce8e40eb8b4c7137cc4c5d1e02fa6da890b4740`
- **Baseline tree:** `6921ce05f446273346b45d3afc759052a999fdd9`
- **Remote branch:** `origin/practice-2-frontend` at the same baseline commit
- **Published release:** `5ce8e40eb8b4c7137cc4c5d1e02fa6da890b4740`

This document is separate from `docs/milestones/practice-2-milestone-03.md`, which records the earlier Calendar and Session Workspace increment.

## Baseline Working Tree

At milestone start:

- Modified tracked files: none.
- Staged files: none.
- Untracked files: `supabase/.branches/_current_branch` only.
- The untracked Supabase CLI branch marker predates this milestone and is excluded from milestone application work, commits and deployments.
- Working-tree status fingerprint: `19d7a915b37e26a41ebd9c34a2e6263e601e237d3ff711a364cc313b6ad0e441`.

No existing changes were discarded, stashed, reset or overwritten.

## Baseline Fingerprints

| File | SHA-256 |
| --- | --- |
| `src/pages/Patients.tsx` | `f7da7dfb6848769b23bb17cc1d73eba92fb80c031386c98ea9422efb6653d397` |
| `src/pages/PatientLinkPortal.tsx` | `1638799ea6adc91856b8d2b9c17d929a09ad2fe8d3dd7cd3a83b3fc41daa6f84` |
| `src/routes/RootRoutes.tsx` | `bddbef13cbe36e01c6ea83d4ecb829774fda56f09cd3661513d11b17c0f1dcf3` |
| `src/routes/appRoutes.tsx` | `bcbe395cdf55f0cbd4cf12604cf00aab31e87951d73eb92a8f9a03a9ad90a42f` |
| `src/styles.css` | `abe977dba93925316c3876a44acf277cafc346f8f8bf5d6f8e5d93955ebc8ded` |
| `src/lib/database.types.ts` | `b4187f7778b4914d69cf35bcab65a5793981c33f1778c9ab3bbfc714ce4ca95d` |
| Inherited `supabase/.branches/_current_branch` | `0d6e4079e36703ebd37c00722f5891d28b0e2811dc114b129215123adcce3605` |

## Environment Baseline

### Supabase

- Linked project: `allidesk-dev`
- Project reference: `wdhfhdpcrcuyxqjehiyy`
- Status at milestone start: `ACTIVE_HEALTHY`
- Local and remote migration histories match through `202607180010`.
- Pending migrations: none.
- No schema, RLS or remote-data changes were made while starting this milestone.

### Published Vercel Release

- Team/project: `gosgroup/allicms`
- Production deployment: `dpl_6NojVcWe6bCLuA353YFhsVUQU7ja`
- Deployment URL: `https://allicms-8mekt9ua2-gosgroup.vercel.app`
- Alias: `https://allidesk.co.za`
- Status at milestone start: `Ready`
- Published source: baseline commit `5ce8e40eb8b4c7137cc4c5d1e02fa6da890b4740`
- The website is a protected development/testing release connected to `allidesk-dev`; fictional data only.

## Existing Patient Experience

### Staff Patient Workspace

The authenticated `/patients` route renders `PatientsPage` and is protected by the existing `patients` access area. It currently provides:

- Tenant-scoped patient loading, search and lifecycle-status filtering.
- Patient creation, editing and archival.
- Core identity, contact and demographic fields.
- Primary responsible-party and billing-contact details.
- Residential address and emergency contact details.
- Medical information, medical-aid context and referral details.
- Patient alerts and allergies with visibility metadata.
- Patient consent records.
- A chronological patient history sourced from `patient_history_events`.
- A permission-aware link to `/patients/clinical?patient={patientId}`.
- Return-to-booking support when a patient is created from the booking workflow.

The current page is a dense list-and-form administration surface. It does not yet present the intended cohesive digital filing-cabinet experience.

### Clinical Entry Point

`/patients/clinical?patient={patientId}` opens the existing Clinical Workspace using the selected patient context. Clinical permissions remain separate from general patient permissions. Session Workspace links back to `/patients?patient={patientId}` through **Patient File**.

### Patient Link

The external `/p/:publicIdentifier/*` route is isolated from staff `AuthContext` and uses the existing secure Patient Link RPC boundary. The frontend currently supports:

- Public-link context lookup without exposing patient or tenant IDs.
- Verification challenges and separate external session tokens.
- Session expiry, logout, revocation and invalid-access states.
- Responsible-party/dependent switching where active grants permit it.
- Practice branding and practice contact context.
- Read-only overview, visible appointments, issued invoices, issued receipts, consent status and privacy information.
- Patient Link access logging for approved events.

The portal does not query internal patient, clinical or finance tables directly.

## Existing Navigation Entry Points

| Entry point | Destination | Current behavior |
| --- | --- | --- |
| Main sidebar **Patients** | `/patients` | Opens the tenant patient list and selected-patient workspace. |
| Session Workspace **Patient File** | `/patients?patient={patientId}` | Opens the same patient record from session context. |
| Patient Workspace **Clinical Workspace** | `/patients/clinical?patient={patientId}` | Opens existing clinical records for the selected patient when authorised. |
| New-patient booking return | `/bookings?...&patient={patientId}` | Returns the newly created patient to the live booking flow. |
| External Patient Link | `/p/:publicIdentifier/*` | Opens the separate verification and patient-facing portal flow. |
| Legacy `/clinical-notes` and `/documents` | `/patients` | Redirects older entry points into the current Patient area. |

## Confirmed Functional Gaps

These are baseline findings only. No implementation is approved by this review.

1. The Patient page still displays outdated copy stating that bookings, finance, clinical notes and Patient Link are not connected, although several integrations now exist.
2. Patient identity fields are permanently presented as editable form controls instead of the established saved/read-only view with an explicit edit action.
3. Session, appointment, clinical-document, finance and document history are not consolidated into the Patient Profile filing-cabinet view.
4. Patient documents are not presented in the internal Patient Profile despite the existing tenant-scoped `document_files` and Storage foundations.
5. Staff cannot manage the patient's Patient Link lifecycle, access grants, reset, suspension or revocation from the current Patient Profile UI.
6. Finalised and explicitly published Session Feedback is not projected by `get_patient_link_portal_data(...)` or rendered in Patient Link.
7. Patient statements and explicitly shared `document_files` are not projected or rendered in Patient Link.
8. Verification-code delivery remains dependent on a communication service; the portal correctly does not claim that delivery is operational.
9. Save Feedback in Session Workspace remains a private draft action. Finalisation, authorised Patient Link publication and email notification are not connected.
10. The portal supports responsible-party/dependent grants, but the staff Patient UI does not provide a complete grant-management experience.
11. Internal Session Planning and Process Notes must remain excluded from Patient Link; no evidence was found that the current portal exposes them.

Items 4-10 may require existing-contract integration or a separately approved forward-only migration. No migration or infrastructure change may be made without Product Owner approval.

## Product Rules

- Calendar remains the therapist's daily desk.
- Session remains the centre of clinical work.
- Patient Profile becomes the digital filing cabinet.
- One patient record must support multiple contextual entry points.
- Session Planning and Process Notes remain internal.
- Session Feedback becomes patient-facing only after finalisation and explicit authorised publication.
- Planned charges remain distinct from delivered services.
- Draft invoices do not create debt; issued invoices do.
- Patient Link remains a separate, revocable, read-only external access boundary.

## Running Change Log

| Change ID | Date | Classification | Screen/module | Requested behavior | Implementation | Files changed | Functional change | Backend change | Validation | Remaining limitation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M3-001 | 2026-10-21 | A. Patient Experience | Milestone baseline and Patient review | Start Official Milestone 3, capture the exact baseline and review existing Patient and Patient Link surfaces without redesigning them. | Captured Git, source fingerprints, Supabase migration parity, published Vercel deployment, existing routes, capabilities and evidence-backed gaps. | `docs/milestones/practice-2-official-milestone-03.md` | No application behavior changed. | None. | Static source review; Git baseline; live Supabase migration comparison; Vercel deployment inspection. | Authenticated visual review is still required before individual Patient UX changes are accepted. |
| M3-002 | 2026-10-21 | B. Calendar & Bookings / C. Sessions & Clinical | Post-session action dot and Process Note skip | Make the orange dot represent unfinished post-session administration only: a Process Note must be finalised or explicitly skipped, and the invoice must be confirmed. Add an orange Skip action beside Add Process Note. | The Calendar dot now appears only for a completed session and tracks finalised Process Note plus confirmed invoice; Session Feedback and merely elapsed appointments no longer create the dot. Skip writes one tenant-scoped internal `session_notes` disposition with Process Note task metadata, author profile and database timestamp. It is idempotently checked before insert, remains internal and clears the Calendar dot immediately and after refresh. | `src/pages/Bookings.tsx`; `src/pages/Sessions.tsx`; `src/styles.css`; `docs/milestones/practice-2-official-milestone-03.md` | Yes, Calendar task eligibility and Session Workspace behavior changed. | Reused the existing `session_notes` table and its tenant-integrity/RLS policies; no contract or migration changed. | `npm run build` passed; `git diff --check` passed; static RLS review confirmed tenant-scoped authenticated insert/select policies. | Authenticated browser execution and persisted refresh behavior have not yet been verified in this turn. |
| M3-003 | 2026-10-21 | C. Sessions & Clinical / D. Finance | Independent Process Note skip and task indicators | Allow Process Note skipping before session completion, record the decision in the internal Patient File history, and show orange task dots on the Notes and Finance tabs. | Removed the completion dependency from Skip. A skip now creates an idempotent, staff-only Patient File history event and immediately clears the Notes and Calendar Process Note indicators. Notes derives its task dot from finalised clinical-note or persisted skip state; Finance shows its dot for completed billable sessions until the linked invoice is issued through Confirm Invoice. | `src/pages/Sessions.tsx`; `src/styles.css`; `docs/milestones/practice-2-official-milestone-03.md` | Yes, Process Note disposition and Session Workspace task visibility changed. | Reused existing `session_notes`, `clinical_notes`, `patient_history_events` and `invoices` contracts and RLS; no migration or permission change. | `npm run build` passed; `git diff --check` passed. | Authenticated browser verification remains required. Patient File presentation of the history event will be refined later, but the event is already persisted internally. |
| M3-004 | 2026-10-21 | C. Sessions & Clinical / D. Finance | One-click Session invoice confirmation | Remove the practitioner-facing Prepare Draft Invoice step. Booking procedures remain the starting billing lines; after completion the practitioner may adjust saved delivered services and use one Confirm Invoice action. | Confirm Invoice now creates the protected draft internally when needed, confirms it, issues it, refreshes Session Finance and records the existing Finance/Patient history and Patient Link visibility generated by the approved RPCs. Delivered services remain editable after completion until an invoice exists, and unsaved procedure edits block confirmation to prevent stale billing. Calendar and Finance task dots remain until the invoice is issued. | `src/pages/Bookings.tsx`; `src/pages/Sessions.tsx`; `docs/milestones/practice-2-official-milestone-03.md` | Yes, the visible draft-preparation click was removed and approved invoice operations are orchestrated from Session Workspace. | No schema or permission change. Reused `create_draft_invoice_from_session`, `confirm_invoice` and `issue_invoice`. | `npm run build` passed; `git diff --check` passed. | Transactional email delivery is not implemented; the success notice explicitly states this and does not claim an email was sent. Authenticated browser execution remains unverified. |
| M3-005 | 2026-10-21 | A. Patient Experience / B. Calendar & Bookings / C. Sessions & Clinical | New-patient contact details and initial note visibility | Capture patient email and cellphone during inline New Patient creation and surface the optional initial internal note during the first session. | Added validated optional patient email and cellphone fields to the existing inline creation flow. The existing internal Patient History note is now shown read-only at the top of the first Session Workspace Notes view, with its persisted timestamp. | `src/pages/Bookings.tsx`; `src/pages/Sessions.tsx`; `src/styles.css`; `docs/milestones/practice-2-official-milestone-03.md` | Yes, additional patient contact data is saved and the existing internal note becomes visible in first-session context. | Reused existing `patients` and `patient_history_events` contracts and RLS; no migration or permission change. | `npm run build` passed; `git diff --check` passed. | Authenticated create-and-reopen browser validation remains required. |
| M3-006 | 2026-10-21 | B. Calendar & Bookings / C. Sessions & Clinical / D. Finance | Post-session task timing | Do not show task dots for upcoming sessions. Once the scheduled end time passes, show Notes and Finance task dots until the Process Note is finalised/skipped and the invoice is issued. Official session completion should eventually occur automatically when both tasks are complete. | Calendar and Session Workspace indicators now use the persisted scheduled end time and remain hidden for upcoming sessions. Cancelled and no-show sessions remain excluded. | `src/pages/Bookings.tsx`; `src/pages/Sessions.tsx`; `docs/milestones/practice-2-official-milestone-03.md` | Yes, task-indicator timing changed. | None. | `npm run build` passed; `git diff --check` passed. | Automatic completion and pre-completion invoicing require an approved forward-only backend lifecycle change because the current protected draft-invoice RPC accepts completed sessions only and depends on the completion-created invoice request event. |
| M3-007 | 2026-10-22 | B. Calendar & Bookings / C. Sessions & Clinical / D. Finance | Unified post-session reminders | Make the Calendar dot and the Notes and Finance tab dots represent the same two persisted tasks after the allocated session time: Process Note saved or explicitly skipped, and invoice confirmed. Remove the Process Note Skip action once a note has been saved; invoice confirmation cannot be skipped. | A non-empty saved Process Note now resolves the Notes reminder without forcing clinical finalisation, while the existing persisted Skip disposition remains the alternative. The Skip action is replaced by a Saved or Skipped status. Finance reminders now resolve at authoritative invoice confirmation rather than waiting for issue. The embedded Session Workspace reports invoice state back to the Calendar immediately, and all reminders remain hidden before the scheduled end and for cancelled/no-show sessions. | `src/pages/Bookings.tsx`; `src/pages/Sessions.tsx`; `docs/milestones/practice-2-official-milestone-03.md` | Yes, reminder completion semantics and immediate Calendar synchronisation changed. | None. Existing tenant-scoped clinical-note, session-note and invoice records remain authoritative. | `npm run build` passed; `git diff --check` passed. Authenticated Calendar inspection confirmed visible orange dots with task-specific accessible labels on elapsed fixtures. No clinical or finance records were mutated during review; saved/skipped/confirmed transitions remain pending interactive acceptance. | The existing Confirm Invoice action still confirms and issues in one protected workflow; transactional email delivery remains outside this increment. |
| M3-008 | 2026-10-22 | B. Calendar & Bookings | Remove the Completed card label | Remove the green Completed label so post-session standing is communicated by the faded historical card and the presence or absence of the orange outstanding-work dot. | Completed sessions retain their authoritative lifecycle state and accessible appointment label, but no longer render a visible Completed badge. Cancelled and No-show labels remain visible. | `src/pages/Bookings.tsx`; `docs/milestones/practice-2-official-milestone-03.md` | Presentation only. | None. | `npm run build` passed; `git diff --check` passed. | None. |
| M3-009 | 2026-10-22 | D. Finance / Practice configuration | Billing-cycle notification preference | Allow a practice to choose finance notifications per invoice or per statement, with statement schedules of Monthly on the 27th or Custom/manual. | Added persisted Billing cycle and Statement schedule controls to the existing Billing Configuration edit flow. Preferences are stored tenant-scoped in existing billing-settings metadata; saved mode displays one concise summary. | `src/pages/PracticeBilling.tsx`; `docs/milestones/practice-2-official-milestone-03.md` | Billing-cycle preference can now be configured and retained. | No migration. Reused existing `billing_settings.metadata` and RLS-protected save flow. | `npm run build` passed; `git diff --check` passed. Authenticated browser inspection after a full reload confirmed the saved Billing cycle value renders in the approved locked-value layout. No setting was changed during validation. | This increment stores configuration only; it does not introduce notification delivery or scheduled statement generation. |
| M3-010 | 2026-10-22 | B. Calendar & Bookings / D. Finance | Monthly statement finance flags | Turn the Calendar money icon into an internal patient-account warning driven by monthly statement cycles and actual remaining invoice balances. Let practices configure the orange, red and black cycle thresholds, defaulting to 1, 2 and 3. | Monthly statement mode assigns each issued invoice to the first 27th on or after issue. The next reached 27th is cycle one. The oldest issued invoice with a remaining balance determines the patient's orange, red or black Calendar Finance icon. Full payment clears the icon; partial payment retains its age. Per-invoice and Custom modes do not apply these first-phase monthly flags. | `src/pages/PracticeBilling.tsx`; `src/pages/Bookings.tsx`; `src/pages/Sessions.tsx`; `src/styles.css`; `docs/milestones/practice-2-official-milestone-03.md` | Yes, Finance icons now describe patient account ageing rather than whether one session invoice was issued. | No migration. Reused RLS-protected billing metadata and authoritative issued-invoice `balance_due` values maintained by approved payment operations. | `npm run build` passed; `git diff --check` passed. Authenticated browser inspection confirmed the conditional Monthly threshold controls. No setting, invoice or payment record was changed during validation. | Formal immutable statement records do not yet exist; first-phase monthly flags derive the virtual monthly statement position from issued invoices and authoritative balances. Custom and per-invoice flag rules remain deferred. |
| M3-011 | 2026-10-22 | D. Finance / Practice configuration | Sentence-style Finance Flag settings | Present each monthly threshold as a readable sentence with its corresponding Finance icon and a compact month selector. | Replaced the three standalone number fields with Orange, Red and Black sentence rows: `Flag [icon] after [selector] Month(s)`. Saved mode retains the same sentence layout with locked values, and narrow screens wrap safely. | `src/pages/PracticeBilling.tsx`; `src/styles.css`; `docs/milestones/practice-2-official-milestone-03.md` | Presentation and input control only; persisted values and flag calculations are unchanged. | None. | `npm run build` passed; `git diff --check` passed. Authenticated browser inspection confirmed the saved sentence layout, icon colours, spacing and plural month labels. | None. |
| M3-012 | 2026-10-22 | B. Calendar & Bookings / C. Sessions & Clinical / D. Finance | Patient payment flags in clinical context | Show the patient account Finance flag on booking/session cards and at the top of Session Workspace so the therapist can see that payments are behind. | Extracted the monthly flag calculation into one shared utility used by Calendar and Session Workspace. Booking cards now show the applicable orange, red or black Finance icon at every card density, with compact collision-safe placement on short cards. Session Workspace shows the same icon beside the session status. Tooltips explain that the flag represents an unpaid monthly statement balance. | `src/lib/financeFlags.ts`; `src/pages/Bookings.tsx`; `src/pages/Sessions.tsx`; `src/styles.css`; `docs/milestones/practice-2-official-milestone-03.md` | Finance flags are now visible in both daily scheduling and session context. They remain informational and do not block treatment or alter lifecycle state. | No migration or permission change. Tenant-scoped billing settings and invoice balances remain authoritative. | `npm run build` passed; `git diff --check` passed. Authenticated visual verification was not performed because an unrelated unsaved Services & Pricing form was open in the shared browser. | Fixtures must have a qualifying unpaid balance and reached cycle to display a flag; no financial data will be altered merely to force a visual test. |
| M3-013 | 2026-10-22 | D. Finance / Practice configuration | Procedure ICD-10 code and duration removal | Remove Duration from Services & Pricing and add an ICD-10 code to each procedure option. | Removed Duration from procedure creation, editing and saved summaries. Added an optional ICD-10 code persisted in the existing procedure metadata and shown with the procedure code. Existing stored duration values are preserved but are no longer presented or changed by this screen. | `src/pages/FinancePriceLists.tsx`; `docs/milestones/practice-2-official-milestone-03.md` | Procedure options can now carry a reusable ICD-10 code without coupling billing procedures to appointment duration. | No migration. Reused tenant-scoped `price_list_items.metadata`; existing RLS and Finance permissions are unchanged. | `npm run build` passed; `git diff --check` passed. Authenticated browser inspection confirmed ICD-10 is rendered and Duration is absent from both procedure rows and the creation form. No fixture was saved or changed. | A procedure currently supports one optional ICD-10 code; no clinical diagnosis or coding workflow was introduced. |
| M3-014 | 2026-10-22 | C. Sessions & Clinical / D. Finance | Session procedure line simplification | Remove Quantity from Services & Expected Charges and show each selected procedure as one clear line containing Procedure Code, Name, ICD-10 Code and Price. | Reworked the Session Finance procedure table into the approved four-column line. Newly selected procedures use one unit internally, while older persisted quantities remain intact for historical accuracy. The selected price-list ICD-10 code is copied into the delivered-procedure snapshot metadata. | `src/pages/Sessions.tsx`; `src/styles.css`; `docs/milestones/practice-2-official-milestone-03.md` | Practitioners choose one configured procedure without entering billing codes, names, quantities or prices manually. | No migration. Existing session-procedure snapshots, invoice contracts, permissions and RLS remain unchanged. | `npm run build` passed; `git diff --check` passed. Authenticated browser inspection confirmed the four-column table, absent Quantity control and readable row alignment. No session or finance record was saved or changed. | Older procedure snapshots without ICD-10 metadata display a dash until replaced or resaved from a configured price-list procedure. |
| M3-015 | 2026-10-22 | B. Calendar & Bookings / D. Finance | Booking service-line consistency | Apply the Session Finance procedure table to Add Booking, remove Quantity and replace the Remove text action with a dustbin. | Booking services now render as Procedure Code, Name, ICD-10 Code and Price with a compact orange dustbin action. New and changed selections use one unit internally, and the configured ICD-10 metadata is included in the booking-procedure snapshot. | `src/pages/Bookings.tsx`; `src/styles.css`; `docs/milestones/practice-2-official-milestone-03.md` | Booking and Session procedure selection now use the same concise practitioner-facing pattern. | No migration. Existing booking procedure snapshots, permissions and RLS remain unchanged. | `npm run build` passed; `git diff --check` passed. Authenticated browser inspection confirmed Quantity is absent and the selected row displays procedure code, name, configured ICD-10 code, price and its remove action. No booking was saved. | Historical booking procedures retain their stored quantity and display their total line price; older snapshots without ICD-10 metadata display a dash. |
| M3-016 | 2026-10-22 | B. Calendar & Bookings / D. Finance | Stable booking procedure table | Remove the jumping Intended Service empty state and keep an empty procedure table visible after price-list selection. Add procedures through inline plus rows. | Removed the separate Intended Service selector and explanatory empty state. The procedure table now remains mounted with an `R 0.00` starting total, starts with an inline Add Procedure row, reveals an empty dropdown row on click, and restores another Add Procedure row after a selection so further procedures can be added without layout shifts. | `src/pages/Bookings.tsx`; `src/styles.css`; `docs/milestones/practice-2-official-milestone-03.md` | Procedure selection now happens entirely inside one stable table. No booking is created until Create Booking is used. | No migration or backend-contract change. | `npm run build` passed; `git diff --check` passed. Authenticated browser inspection confirmed the empty table, zero total, inline dropdown row, populated procedure details, visible dustbin and second Add Procedure row. No booking was saved. | None. |
| M3-017 | 2026-10-22 | B. Calendar & Bookings / D. Finance | Searchable procedure-code selection | Let practitioners type into the booking procedure selector and identify options by procedure code. | Replaced the native procedure select with an accessible searchable combobox in the Procedure Code column. The field filters by code, name or ICD-10, results show the code and procedure name, and selecting a configured item fills the separate Name, ICD-10 and Price columns. Keyboard navigation remains supported. | `src/pages/Bookings.tsx`; `src/styles.css`; `docs/milestones/practice-2-official-milestone-03.md` | Procedure lookup is faster without permitting arbitrary unsanctioned billing lines. | No migration or permission change. | `npm run build` passed; `git diff --check` passed. Authenticated browser inspection confirmed code-led typing, filtered configured results, row population and the updated expected-charge total. No booking was saved. | Free text filters configured procedures; it does not create a new procedure outside Services & Pricing. |
| M3-018 | 2026-10-22 | B. Calendar & Bookings | Compact New Booking panel | Move the New Booking content upward and remove unnecessary empty vertical space while preserving readable spacing. | Prevented the booking editor's grid rows from stretching to fill the viewport. The booking fields and Services & Expected Charges card now retain their natural content height and remain grouped at the top of the scrollable panel. | `src/styles.css`; `docs/milestones/practice-2-official-milestone-03.md` | Presentation only; booking data and save behavior are unchanged. | None. | `npm run build` passed; `git diff --check` passed. Authenticated browser inspection confirmed both cards use natural content height, remain grouped at the top and preserve readable spacing. No booking was saved. | None. |
| M3-019 | 2026-10-22 | B. Calendar & Bookings / D. Finance | Direct procedure search | Make Add Procedure work like Patient Search so configured procedures are immediately available without a separate add-button step. | Replaced the trailing Add Procedure button with a persistent searchable Add Procedure combobox above the procedure table. Clicking the field opens all configured price-list procedures, typing filters them, and selecting one adds its code, name, ICD-10 code and price to the table while resetting the search for another selection. | `src/pages/Bookings.tsx`; `src/styles.css`; `docs/milestones/practice-2-official-milestone-03.md` | Procedure selection now takes one interaction instead of creating an empty row first. Billing data and save behavior are unchanged. | None. | `npm run build` passed; `git diff --check` passed. Authenticated browser inspection confirmed the complete list opens on click without clipping, selection populates the table and expected charge, and the search resets for another procedure. No booking was saved. | Only configured price-list procedures can be selected. |
| M3-020 | 2026-10-22 | B. Calendar & Bookings / D. Finance | Static selected procedure rows | Keep Add Procedure as the only procedure search and remove the duplicate dropdown from selected table rows. | Selected rows now display the saved Procedure Code, Name, ICD-10 Code and Price as clear table values with the existing dustbin action. Replacing a selection is handled by removing it and using Add Procedure again. | `src/pages/Bookings.tsx`; `docs/milestones/practice-2-official-milestone-03.md` | Presentation and interaction simplification only; selected procedure data and booking persistence are unchanged. | None. | `npm run build` passed; `git diff --check` passed. Authenticated browser inspection confirmed Add Procedure remains searchable while selected rows contain only static values and the dustbin action. No booking was saved. | None. |
| M3-021 | 2026-10-22 | B. Calendar & Bookings | Authenticated therapist default | Automatically select the authenticated user's active linked therapist profile in New Booking. | New Booking now derives its default from the authenticated Auth user and applies it both when the panel opens and when linked therapist data finishes loading. Existing bookings and manual therapist choices are not overwritten, and no unrelated therapist is used as a fallback. | `src/pages/Bookings.tsx`; `docs/milestones/practice-2-official-milestone-03.md` | New bookings require less manual selection for linked practitioners. | None. | `npm run build` passed; `git diff --check` passed. Authenticated browser inspection confirmed New Booking automatically selected the signed-in user's linked `Gerhard Olivier` therapist profile. | Accounts without an active linked therapist profile continue to require an explicit therapist selection. |
| M3-022 | 2026-10-22 | C. Sessions & Clinical / D. Finance | Remove redundant Session finance summary | Remove the Planned, Delivered procedures, Invoice readiness and Invoice summary strip from Session Workspace. | Removed the four-item summary card and its unused responsive styling. The detailed Session Finance controls, delivered-service table and invoice actions remain unchanged. | `src/pages/Sessions.tsx`; `src/styles.css`; `docs/milestones/practice-2-official-milestone-03.md` | Presentation only; finance calculations and lifecycle operations are unchanged. | None. | `npm run build` passed; `git diff --check` passed. Authenticated browser inspection confirmed the summary strip is absent and the detailed Planned Charges, Delivered Services and procedure controls remain available. | None. |
| M3-023 | 2026-10-22 | C. Sessions & Clinical / D. Finance | Session procedure search and static table | Match Session Workspace procedure handling to New Booking: remove the old two-step Add Procedure button and row selector, then add another configured procedure through one searchable control above the table. | Added a searchable Add Procedure combobox that opens the session's configured price-list procedures, filters by code, name or ICD-10, and appends the selected item as a static Procedure Code, Name, ICD-10 Code and Price row. The existing Save operation and dustbin removal remain authoritative. | `src/pages/Sessions.tsx`; `src/styles.css`; `docs/milestones/practice-2-official-milestone-03.md` | Session procedure selection now uses the same concise interaction pattern as New Booking. No procedure is persisted until Save is selected. | None. Existing session-procedure persistence, tenant permissions and invoice lifecycle are unchanged. | `npm run build` passed; `git diff --check` passed. Authenticated browser inspection confirmed the Add Procedure combobox, static four-column procedure rows and dustbin actions in an editable Session Finance view. No procedure was added, removed or saved during validation. | Only procedures configured on the booking's selected price list are available. |
| M3-024 | 2026-10-22 | C. Sessions & Clinical / D. Finance | Post-session invoice confirmation order | Make Confirm Invoice available once the scheduled session duration has ended. If invoicing is completed first, complete the session through the approved lifecycle operation before confirming the invoice; manually completing a session must not confirm its invoice. | Confirm Invoice is shown for eligible elapsed sessions whether or not the session is already completed. For an incomplete session it first requires explicit treatment facts and calls the protected `complete_session` RPC, then creates and confirms the invoice through the existing protected Finance RPCs. Invoice issuing remains a separate explicit action. The standalone Completed action only records clinical completion and invoice readiness. | `src/pages/Sessions.tsx`; `docs/milestones/practice-2-official-milestone-03.md` | The clinical and finance tasks can be completed in either order while retaining separate authoritative session, confirmation and issue states. | None. Reused existing protected Session and Finance RPCs, permissions and lifecycle guards. | `npm run build` passed; `git diff --check` passed. Authenticated browser inspection confirmed Confirm Invoice is available for an elapsed session whose authoritative status is still Not Started. The write path remains pending an owner-driven acceptance click. | Confirm Invoice remains unavailable before the scheduled end, for cancelled/no-show sessions, without saved billable delivered services, or while procedure edits are unsaved. |
| M3-025 | 2026-10-22 | C. Sessions & Clinical / D. Finance | Explicit completion and separate invoice issuing | Require explicit review of actual treatment times, attendance and outcome before clinical completion; do not silently issue an invoice during confirmation; clear Finance reminders only after issue. | Added a focused clinical-completion dialog shared by Completed and pre-completion Confirm Invoice. Confirm Invoice now completes the session where required, prepares the protected draft and confirms it, but stops before issue. A distinct Issue Invoice action invokes the approved issue RPC. Calendar and Session Finance reminders now derive from `issued_at`, not `confirmed_at`. | `src/pages/Bookings.tsx`; `src/pages/Sessions.tsx`; `src/styles.css`; `docs/milestones/practice-2-official-milestone-03.md` | Clinical facts are explicitly confirmed and invoice confirmation and issuing are separate practitioner decisions. Failed operations remain open with their real errors and cannot display a false combined success. | None. Existing protected Session and Finance RPCs remain authoritative. | `npm run build` passed; `git diff --check` passed. Calendar browser inspection confirmed issued-state reminder wording. Data-changing acceptance is pending. | Transactional email delivery remains unimplemented and is not claimed. |
| M3-026 | 2026-10-22 | B. Calendar & Bookings / C. Sessions & Clinical / D. Finance | Protected Cancel and No Show proposal | Prepare the smallest forward-only database repair for atomic Booking/Session cancellation and no-show outcomes without applying it. | Added protected `cancel_session(...)` and `record_session_no_show(...)` wrappers over a private terminal-outcome operation. It locks Session, Booking and any active session invoice; rejects confirmed/issued/paid finance state; cancels only an unissued draft; writes Session, Booking, Invoice, workflow and Patient History evidence; and is idempotent. Lifecycle guards recognise only the private approved call stack. | `supabase/migrations/202607180011_session_terminal_outcome_operations.sql`; `docs/milestones/practice-2-official-milestone-03.md` | No runtime behavior changes until approval and deployment. Cancel will hide from the default Calendar after frontend connection; No Show will remain visible and will not require Process Note or treatment-invoice completion. | One pending forward-only migration, not applied. No-show fee billing remains explicitly out of scope. | `npx supabase db push --linked --dry-run` identified only `202607180011`; static privilege/search-path/destructive-operation review passed. Runtime tests await migration approval. | Frontend buttons remain disabled until the RPCs are deployed and generated types are reconciled. |

## Validation Status

- Git baseline: commit `5ce8e40eb8b4c7137cc4c5d1e02fa6da890b4740` on `practice-2-frontend`.
- Current HEAD: unchanged from the baseline; Milestone 3 work remains uncommitted.
- Supabase target: `allidesk-dev` (`wdhfhdpcrcuyxqjehiyy`).
- Migration parity: remote remains at `202607180010`. Local migration `202607180011_session_terminal_outcome_operations.sql` is the only pending migration and has not been applied.
- Build: passed on 2026-10-22.
- `git diff --check`: passed on 2026-10-22.
- Authenticated browser inspection: performed throughout the Calendar, New Booking, Session Workspace, Services & Pricing and Billing Configuration refinements.
- Authenticated mutation testing: completed for the dedicated fictional M3 acceptance fixture through patient/guardian creation, initial note, booking, Session creation, Process Note skip, delivered-service update, explicit clinical completion, protected draft creation, confirmation and issuing. Persistence was verified after refresh.
- Acceptance fixture: patient `ee1e83df-25a3-4bbe-a393-de4ceed5fbdb`; guardian `681fa684-816d-467a-b451-77b186fefc2b`; booking `b6f33dcd-1a0c-4756-a2d0-6477bb5609fa`; Session `0ab02c87-2ee0-4e5f-9fcb-66a19defd4af`; invoice `3d89fab9-847d-4a79-8caf-b18fb5bb38e5` / `PILOT-INV-0008`.
- Acceptance finance result: two delivered procedures totalled `R 1,180.00`; two invoice lines totalled `R 1,180.00`; amount paid was `R 0.00`; balance due was `R 1,180.00`; exactly one active Session invoice existed.
- Authenticated RLS harness: all role-access, lifecycle-bypass and Tenant A/Tenant B isolation assertions passed after the acceptance writes.
- Finance repair harness: completed successfully in its rollback-only transaction.
- Linked database lint completed. It reported pre-existing errors in assessment, Patient Link, clinical-template and Storage functions. None originates in the unapplied Milestone 3 migration; they require separate evidence-led triage before customer production readiness.
- Commit, push and deployment: not performed.

## Milestone 3 Consolidation

### Outcome

Official Milestone 3 materially improved the solo-practitioner Calendar, Booking, Session and billing-preparation workflow. It did not complete the broader Patient Profile and Patient Link objective captured at milestone start because Product Owner direction moved toward the therapist's immediate daily workflow.

The current state is suitable for a controlled development release after the remaining Session terminal-outcome decision is resolved. It is not yet evidence-backed as customer-production-ready.

### Completed Product Work

1. Post-session work is communicated through one restrained orange task indicator on the Calendar and matching Notes and Finance tab indicators.
2. Process Notes can be saved or explicitly skipped; a persisted skip clears the clinical task and records an internal Patient History event.
3. Upcoming sessions do not show post-session reminders. Cancelled and no-show states are excluded from clinical and invoice reminders.
4. New Patient creation captures optional email, cellphone, guardian details and an internal initial note without leaving New Booking.
5. The initial patient note is visible in the first Session Workspace Notes context.
6. New Booking defaults to the authenticated user's linked active therapist and retains exact Calendar date/time selection.
7. Booking and Session procedures use consistent searchable configured-procedure selection and static tables showing Procedure Code, Name, ICD-10 Code and Price.
8. Quantity and procedure duration were removed from the practitioner-facing procedure configuration and selection experience. Historical stored values remain preserved.
9. Session Finance clearly separates Planned Charges from saved Delivered Services.
10. Confirm Invoice is available after the scheduled session end. When used first, it requires explicit confirmation of actual times, attendance and outcome, completes through `complete_session(...)`, prepares the protected draft and confirms it.
11. Invoice issuing is now a separate explicit action. The standalone Completed action remains independent and does not imply that an invoice is confirmed or issued.
12. Billing Configuration now stores per-invoice or per-statement preferences, Monthly-on-the-27th or Custom statement scheduling, and configurable monthly finance-flag thresholds.
13. Calendar and Session Workspace display patient-level orange, red or black finance flags derived from issued unpaid balances in Monthly statement mode.

### Backend and Security Impact

- `202607180011_session_terminal_outcome_operations.sql` was approved and applied to `allidesk-dev` on 22 October 2026. Local and remote migration history match through `202607180011`.
- The migration adds protected `cancel_session(...)` and `record_session_no_show(...)` wrappers around a non-executable internal helper. It grants no direct lifecycle mutation privilege.
- The approved ICD-10 repair, `202607180012_procedure_icd10_snapshot_propagation.sql`, was applied only to `allidesk-dev` on 22 October 2026. Local and remote migration history now match through `202607180012`.
- Existing tenant-scoped tables and approved RPCs remain authoritative.
- ICD-10 values and billing preferences reuse existing JSON metadata fields.
- Process Note skip reuses existing internal `session_notes` and `patient_history_events` contracts.
- Invoice confirmation reuses `complete_session`, `create_draft_invoice_from_session`, `confirm_invoice` and `issue_invoice`.
- Internal Session Planning and Process Notes remain excluded from Patient Link.
- No service-role credential or frontend security bypass was introduced.

### Files Changed From Baseline

- `src/pages/Bookings.tsx`
- `src/pages/FinancePriceLists.tsx`
- `src/pages/PracticeBilling.tsx`
- `src/pages/Sessions.tsx`
- `src/styles.css`
- `src/lib/financeFlags.ts` (new)
- `docs/milestones/practice-2-official-milestone-03.md` (new)
- `src/lib/database.types.ts` (terminal-outcome RPC signatures)
- `supabase/migrations/202607180011_session_terminal_outcome_operations.sql` (applied to development)
- `supabase/migrations/202607180012_procedure_icd10_snapshot_propagation.sql` (applied to development)
- `supabase/smoke-tests/practice_2_milestone_03_session_terminal_outcomes.sql` (new rollback-only validation)
- `supabase/smoke-tests/practice_2_milestone_03_icd10_propagation.sql` (new rollback-only validation)

Inherited `supabase/.branches/` remains excluded from application work and any release commit.

### Browser-Evidenced Behavior

- Calendar current-day treatment, faded elapsed cards and post-session task indicators.
- Notes and Finance task dots in Session Workspace.
- Billing-cycle and monthly flag configuration presentation.
- Services & Pricing without Duration and with ICD-10.
- New Booking procedure search, static procedure table, dustbin removal and therapist default.
- Session Finance procedure search, static procedure table and dustbin removal.
- Confirm Invoice visibility on an elapsed session whose status remained Not Started.
- Calendar invoice reminders now describe invoice issuing and remain visible until `issued_at` is authoritative.
- Dedicated acceptance patient, guardian and initial internal note persisted and were reused by the Booking, Session and invoice snapshots.
- Process Note Skip persisted, wrote one Patient History event and remained cleared after the Session was reopened.
- Delivered Services changed from the planned `R 400.00` to an authoritative saved `R 1,180.00`; the issued invoice contained two matching lines and the same total.
- Confirm Invoice required review of scheduled defaults for actual start/end, attendance and outcome, then completed the Session through `complete_session(...)` and stopped at confirmed status.
- The Finance reminder remained after confirmation. A separate Issue Invoice action moved `PILOT-INV-0008` to `awaiting_payment`, created the `R 1,180.00` outstanding balance and cleared the Calendar/Finance reminder after refresh.
- Cancelled and No Show now render as enabled Session Workspace actions for authorised Admin/Therapist users. Browser rendering was inspected; destructive browser execution was not performed because runtime mutations were covered by the rollback-only authenticated harness.

### Acceptance Results

1. **Passed:** new fictional patient creation with email and cellphone.
2. **Passed:** parent/guardian creation and billing-recipient snapshot.
3. **Passed:** one internal initial patient note; it appeared in Session Workspace and persisted.
4. **Passed:** live booking creation with linked therapist, location, price list and planned procedure.
5. **Passed:** Session creation from the booking through the existing approved operation.
6. **Passed:** Process Note explicit skip, including one persistent skip record and one Patient History event.
7. **Passed:** delivered-procedure save; two saved procedure rows totalled `R 1,180.00`.
8. **Passed:** explicit clinical completion review and protected `complete_session(...)` execution.
9. **Passed:** protected draft preparation and invoice confirmation; no issue occurred during confirmation.
10. **Passed:** separate invoice issuing; invoice status became `awaiting_payment`.
11. **Passed:** one active invoice only; two invoice lines matched the two delivered procedures and `R 1,180.00` total.
12. **Passed:** outstanding balance `R 1,180.00`, amount paid `R 0.00` and unpaid payment status.
13. **Passed:** refresh persistence; the Session remained completed and its Process Note and Finance task indicators remained cleared after issue.
14. **Passed:** Monthly statement configuration is active for day 27 with orange/red/black thresholds of one/two/three cycles. The newly issued invoice correctly showed no premature ageing flag before the first cycle.
15. **Passed:** Admin, Therapist, Reception and Finance read matrices, direct lifecycle-update denial and bidirectional tenant isolation in the authenticated RLS harness.
16. **Unverified:** orange/red/black transitions across actual future monthly ageing boundaries; advancing production-like financial dates was intentionally avoided.
17. **Unverified:** saving a full Process Note body in this journey; the approved Skip branch was exercised instead.
18. **Passed:** Cancel and No Show runtime behavior through authenticated rollback-only calls, including repeated-call idempotency, Booking/Session consistency, unissued draft cancellation, Patient History, status history and workflow events.
19. **Unverified:** narrow/mobile layout acceptance.

### Confirmed Acceptance Defect

The procedure-level ICD-10 snapshot does not survive Booking-to-Session conversion. For procedure `201`, the booking snapshot held ICD-10 `18738392`, while the copied Session procedure metadata and issued invoice line were both null. The existing `create_session_from_booking(...)` implementation omits `booking_procedures.metadata`, and `create_draft_invoice_from_session(...)` currently derives invoice-line ICD-10 only from the patient's active ICD-10 code. This is a genuine snapshot defect, but it does not affect totals, tenant isolation or invoice lifecycle. It requires a separate narrowly reviewed forward-only RPC repair and is not included in terminal-outcome migration `202607180011`.

### Terminal Outcome Repair Result

`202607180011_session_terminal_outcome_operations.sql` was applied only to `allidesk-dev`. Its SHA-256 remained `810d0ae4f034fc9ae5e4e9d2ea3abc8f15c40071277361d4a19ec784e6485471`, matching the approved report.

- **Cancel:** atomically marks the Booking and Session cancelled, preserves Patient History/status/workflow evidence, and the Calendar excludes cancelled records from its normal view.
- **No Show:** atomically marks both records no-show, remains eligible for a visible Calendar label, and is excluded from Process Note and treatment-invoice reminders.
- Repeated identical calls return `changed = false` without duplicate workflow events.
- Reception and cross-tenant Admin calls are denied. Admin and Therapist calls follow the approved role boundary.
- An unissued unpaid draft is cancelled through the protected operation. Confirmed, issued or paid finance records reject the terminal change.
- The internal helper remains unavailable to `authenticated`; direct Session lifecycle updates remain blocked.

### Deployed ICD-10 Repair

`202607180012_procedure_icd10_snapshot_propagation.sql` was applied only to `allidesk-dev`. Its approved SHA-256 was `371d5e2cb10925505b6a01c5e896f881dab46900378aaa9201248716cf070474`.

Root cause:

1. `create_session_from_booking(...)` creates `session_procedures` without copying `booking_procedures.metadata`, which contains the selected procedure ICD-10 snapshot.
2. `create_draft_invoice_from_session(...)` currently writes only `patients.active_icd10_code` to each invoice line, even when a procedure-specific code exists.

Exact repair scope:

- A `BEFORE INSERT OR UPDATE` Session-procedure trigger copies only a missing `metadata.icd10_code` from the same-tenant source Booking procedure. It never replaces an explicit Session value.
- A `BEFORE INSERT` Invoice-line trigger gives the same-tenant source Session/Booking procedure ICD-10 precedence over the existing patient-level fallback.
- If no procedure ICD-10 exists, the existing invoice value/fallback is retained.
- Both trigger functions use `pg_catalog, public`, receive no executable grants, change no prices or quantities, and make no historical data updates.
- Existing confirmed/issued invoice rows remain untouched and immutable.

The deployed rollback-only regression passed. It proved Booking-to-Session propagation, procedure precedence over a patient fallback, retention of the patient fallback when no procedure code exists, no fabricated code when neither source has a code, and correct unchanged line pricing and reconciled totals.

### Final Backend Repair Validation

- Linked project: `allidesk-dev` (`wdhfhdpcrcuyxqjehiyy`) verified.
- Migration history: local and remote match through `202607180012`; no migration remains pending.
- Terminal-outcome rollback harness: passed Cancel, No Show, repeated calls, Booking/Session consistency, unissued draft cancellation, issued-invoice rejection, Patient History, status history and workflow-event assertions.
- Security: Admin and Therapist permitted; Reception and cross-tenant Admin denied; internal helper execution denied; direct Session/Invoice lifecycle updates denied.
- Authenticated RLS harness: all role matrices and bidirectional tenant-isolation checks passed.
- Finance lifecycle rollback harness: passed.
- Schema smoke: passed.
- Deployed ICD-10 migration regression: passed in a remote rollback-only transaction.
- Authenticated browser: Calendar loaded, existing status labels rendered, and the Session Workspace showed enabled Cancelled and No Show actions. A destructive browser terminal transition was not executed; transition behavior was exercised by the authenticated rollback harness.
- `npm run build`: passed. The existing Vite large-chunk warning remains non-blocking.
- `git diff --check`: passed.
- Linked database lint: command completed but reports ten pre-existing errors in unrelated Assessment, Patient Link, Clinical Template and clinical-attachment functions.

### Deliberately Unfinished

- Session Feedback finalisation, Patient Link publication and transactional email delivery.
- Patient Profile filing-cabinet redesign and consolidated history.
- Patient Link staff lifecycle management and guardian-grant UX.
- Patient-facing feedback history, statements and explicitly shared documents.
- Formal immutable monthly statement generation.
- Custom and per-invoice finance-flag behavior.
- No-show fee billing.

These items must not be represented as operational in the current release.

## Release Assessment

**Status:** READY FOR DEVELOPMENT PUBLICATION

The protected Cancel/No Show repair and ICD-10 propagation repair are deployed to development and rollback-tested. The frontend builds, the core solo-practitioner patient-to-issued-invoice path passed authenticated acceptance, and targeted Session, Finance, role and tenant regressions pass. No confirmed Milestone 3 release defect remains.

Database error-level lint still reports ten pre-existing issues in unrelated Assessment, Patient Link, Clinical Template and clinical-attachment functions. None originate from `202607180011` or proposed `202607180012`; they remain separate technical debt and were not changed during this repair.

No release should include `.env`, credentials, `dist`, `.vercel`, `supabase/.branches` or temporary artifacts. The published deployment at baseline commit `5ce8e40eb8b4c7137cc4c5d1e02fa6da890b4740` remains the rollback target until a new curated release is approved.

## Next Recommended Step

Prepare the curated Official Milestone 3 development release for Product Owner approval. A focused Booking-to-Session-to-Invoice ICD-10 browser check remains useful post-publication acceptance evidence, but the deployed rollback regression has validated the backend contract. Do not begin another milestone automatically.

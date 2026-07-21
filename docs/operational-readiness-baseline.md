# Operational Readiness Baseline

Date: 2026-07-17

## Operational Readiness Step 1 — Completed Against `allidesk-dev`

Approved development target:

- Project ref: `wdhfhdpcrcuyxqjehiyy`
- Project name: `allidesk-dev`
- Classification: development only, not production
- Data classification: fictional/no real patient or clinical data

### Current Evidence-Based Status

| Area | Result | Evidence |
| --- | --- | --- |
| Supabase CLI authentication | Passed | `npx supabase projects list` returned linked project metadata. |
| Linked project verification | Passed | Local ref and remote project ref both `wdhfhdpcrcuyxqjehiyy`; remote name `allidesk-dev`. |
| Migration comparison | Passed | Final local/remote ledgers match through `202607170005`. |
| Migration deployment | Passed after repair | Pending migrations `202607080001` through `202607170004` applied; repair `202607170005` applied. |
| Schema smoke | Passed | 27 expected tables present, 27 RLS-enabled, 16 expected RPCs present. |
| Subscription seed rows | Passed | 6 active plans; hidden `free` plan present. |
| Pilot seed execution | Passed | Fictional Tenant A smoke path plus Tenant B isolation fixture inserted. |
| Seed rerun safety | Passed with expected append-only audit behaviour | Deterministic fixture counts remained stable; seed audit event is intentionally append-only. |
| Tenant isolation | Passed for simulated authenticated Tenant A user | Tenant A saw 1 Tenant A patient and 0 Tenant B patients; Tenant B update affected 0 rows; Tenant B delete denied. |
| Role validation | Partially passed | Admin, therapist, receptionist and finance matrices tested by rolled-back role changes for the same real Auth user. |
| Anonymous RLS validation | Blocked by tooling | Supabase CLI temp-role connection failed and requested `SUPABASE_DB_PASSWORD`. |
| Core booking-to-payment smoke path | Passed with noted clinical gap | Session completed, invoice confirmed/issued, payment allocated, invoice paid, histories/workflow records present. |
| Generated types | Updated | `src/lib/database.types.ts` regenerated from live dev schema. |

### Repair Work Completed During Readiness

1. Qualified pending migration crypto calls with the `extensions` schema because the remote project exposes `digest` and `gen_random_bytes` under `extensions`.
2. Added `202607170005_operational_readiness_confirm_invoice_repair.sql` to fix a runtime ambiguity in `confirm_invoice`.
3. Updated the fictional seed to include Patient Link hardening columns:
   - `public_identifier`
   - `credential_hash`
4. Updated the fictional seed to include Tenant B isolation data.
5. Updated the fictional seed invoice to include `due_date`.

### Core Pilot Smoke Path Classification

| Step | Status | Notes |
| --- | --- | --- |
| Fictional patient created | Passed | Seeded Tenant A patient created. |
| Booking created | Passed | Seeded booking exists and is linked to patient/therapist/location. |
| Session linked or created | Passed | Seeded session exists and links to booking. |
| Valid session lifecycle transition | Passed | `complete_session(...)` returned completed. |
| Clinical note linked where supported | Not implemented by this seed | Clinical engine exists, but no clinical note fixture is included in the current operational smoke seed. |
| Draft invoice created | Passed | Seeded ready-to-confirm invoice and line exist. |
| Invoice totals verified | Passed | Total `780.00`. |
| Invoice confirmed | Passed | `confirm_invoice(...)` returned `PILOT-INV-0001`. |
| Invoice issued | Passed | `issue_invoice(...)` returned `awaiting_payment`. |
| Manual payment recorded | Passed | `record_payment(...)` with method `eft` returned allocated. |
| Remaining balance checked | Passed | Invoice balance due `0.00`. |
| Patient history checked | Passed | Patient history count `5`. |
| Audit records checked | Passed | Tenant audit count `5`. |
| Workflow trigger records checked | Passed | Workflow outbox count `10`; invoice workflow event count `4`. |

### Updated Pilot Blockers

The following remain before treating the pilot as fully operational:

1. Anonymous access denial needs browser/API validation or direct DB URL tooling.
2. Separate real Auth users should be created for Tenant A therapist, Tenant A receptionist, Tenant A finance and Tenant B admin.
3. Clinical note smoke fixture should be added if clinical documentation is mandatory for the pilot.
4. Direct invoice lifecycle bypass validation remains inconclusive through the current Supabase CLI temp-role path.
5. Supabase Storage remains unimplemented.
6. Live PDF generation remains unimplemented.
7. Patient Link communication delivery remains unimplemented.
8. Workflow worker runtime remains unimplemented.

### Recommended Next Implementation Step

Create dedicated development Auth users and a small authenticated RLS validation harness for:

- Tenant A admin
- Tenant A therapist
- Tenant A receptionist
- Tenant A finance
- Tenant B admin
- anonymous/no-session
- valid Patient Link session
- revoked Patient Link session

This is the highest-value next step because the schema and core smoke path now work, but launch confidence still depends on real user-context RLS proof.

## Operational Readiness Step 1B — Authenticated Security Validation

Status: **completed**

Step 1B validated authenticated tenant isolation and role boundaries using the dedicated development Auth users that were created by the owner in Supabase Authentication.

Evidence document:

- `docs/operational-readiness-step1b-authenticated-rls.md`

### Step 1B Results

| Area | Result | Evidence |
| --- | --- | --- |
| Auth user discovery | Passed | Existing dedicated Auth users found in `auth.users`. |
| Auth user linking | Passed | Five dedicated Auth users linked to Tenant A/Tenant B profiles and tenant roles. |
| Link script rerun safety | Passed | `operational_readiness_auth_user_links.sql` reran cleanly; stable counts remained. |
| Clinical note fixture | Passed | One session-linked clinical encounter, note and note version created. |
| Tenant isolation | Passed | Tenant A/B users cannot read or update each other's patient records. |
| Admin role | Passed | Admin can read Tenant A operational records including clinical note fixture. |
| Therapist role | Passed | Therapist can read Tenant A patients/bookings/sessions/clinical notes; finance hidden. |
| Reception role | Passed | Reception can read Tenant A patients/bookings/sessions; finance and clinical hidden. |
| Finance role | Passed | Finance can read invoices/payments and operational context; clinical hidden. |
| Anonymous access | Passed | Anonymous table reads for `patients` and `clinical_notes` denied with `42501`. |
| Patient Link access | Passed | Public context allowed; invalid portal session returns `expired_session`; valid external session scoped to Patient Link data. |
| Lifecycle bypass protection | Passed after repair | Direct authenticated session/invoice lifecycle field updates are blocked. |
| Authenticated smoke path | Passed as read validation | Finance sees paid invoice/payment/allocation; therapist sees session-linked note; admin sees history/workflow/audit counts. |

### Step 1B Repair Work

Two forward-only repair migrations were created and deployed:

1. `202607170006_operational_readiness_lifecycle_direct_update_guard.sql`
2. `202607170007_operational_readiness_lifecycle_rpc_call_stack_guard.sql`

Purpose:

- Prevent direct authenticated table updates from bypassing protected session and invoice lifecycle RPCs.
- Preserve approved SECURITY DEFINER lifecycle RPC paths.

### Updated Pilot Blockers After Step 1B

Resolved:

- Dedicated Auth users exist and are linked.
- Authenticated role validation is no longer blocked.
- Anonymous access denial has API-level evidence.
- Direct invoice lifecycle bypass validation is no longer inconclusive.
- Clinical note smoke fixture exists.

Still deferred before a broader pilot:

1. Supabase Storage remains unimplemented.
2. Live PDF generation remains unimplemented.
3. Patient Link communication delivery remains unimplemented.
4. Workflow worker runtime remains unimplemented.
5. Statements and receipt PDF/document delivery remain outside the current readiness scope.

### Recommended Next Implementation Step

Implement the Supabase Storage and file/document foundation next.

Reason:

- Clinical attachments, proof of payment, invoice/receipt/statement PDFs, practice logos and Patient Link document delivery all depend on a safe tenant-scoped storage model.
- The database/RLS/authenticated baseline is now validated enough to support this next layer.

## Repository Status

- Project directory: `/Users/gerhardolivier/Go Difference Coding /Allidesk`
- Git branch: `main`
- Tracking: `main...origin/main`
- Worktree status: dirty.
- Existing tracked modifications at time of audit:
  - `src/lib/database.types.ts`
  - `src/pages/Patients.tsx`
  - `src/pages/Practice.tsx`
  - `src/routes/appRoutes.tsx`
  - `src/styles.css`
- Existing untracked Phase 6 clinical files and migrations are present, including:
  - Phase 6A-6D docs
  - Phase 6A-6D migrations
  - `src/pages/Clinical.tsx`
  - `src/pages/ClinicalTemplates.tsx`
  - `src/components/clinical/`
  - `src/components/clinical-assessments/`

This audit did not commit, push, or alter application behaviour.

## Environment Configuration

Required frontend environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Observed:

- `.env.example` contains both required keys with blank values.
- `.env` exists locally and contains both keys. Values were not inspected or documented.
- No service-role key is required by the browser application and none should be exposed to Vite.

## Package Scripts

Configured scripts:

- `npm run dev`: Vite dev server on `127.0.0.1`
- `npm run build`: `tsc -b && vite build`
- `npm run preview`: Vite preview on `127.0.0.1`

Not configured:

- No lint script.
- No unit test script.
- No E2E test script.
- No seed script.
- No QA/smoke-test script.

## Validation Commands And Results

| Command | Result | Notes |
| --- | --- | --- |
| `git status --short --branch` | Passed | Dirty worktree with existing modified/untracked Phase 6 work. |
| `node -e "...package.json..."` | Passed | Confirmed package scripts and dependencies. |
| `ls -1 supabase/migrations` | Passed | Confirmed migration file order by filename. |
| `.env` / `.env.example` key inspection | Passed | Only key names inspected; secrets hidden. |
| `npx supabase migration list --local` | Failed | Local Postgres/Supabase database was not running or reachable: `LegacyDbConnectError`. |
| `npm run build` | Passed | TypeScript and Vite build completed. Existing large chunk warning remains. |
| `git diff --check` | Passed | No whitespace errors detected. |
| `npx supabase migration list --linked` | Blocked | Linked project is named `allidesk-production`; command did not return output and was interrupted. No migrations were applied. |

Existing warning:

- Vite reports a large JavaScript chunk over 500 kB. This is known technical debt and not a new failure.

## Migration Inventory

Execution order by migration filename:

1. `202607060001_phase1_platform_identity.sql`
2. `202607080001_phase4_practice_foundation_core.sql`
3. `202607080002_phase4_therapist_profiles.sql`
4. `202607080003_phase4b_price_lists.sql`
5. `202607080004_phase5a_patient_engine.sql`
6. `202607130001_phase5b_booking_engine.sql`
7. `202607130002_phase5c_session_engine.sql`
8. `202607130003_phase5c_session_rpc_hardening.sql`
9. `202607130004_phase5d_draft_invoice_engine.sql`
10. `202607130005_phase5d_restrict_invoice_total_recalculation.sql`
11. `202607130006_phase5e_finance_workflow.sql`
12. `202607130007_phase5e_reverse_account_credits.sql`
13. `202607130008_phase5e_payment_reference_uniqueness.sql`
14. `202607130009_phase5f_patient_link_foundation.sql`
15. `202607130010_phase5f_patient_link_public_projections.sql`
16. `202607130011_phase5f_patient_link_hardening.sql`
17. `202607130012_phase5f_patient_link_validation_corrections.sql`
18. `202607130013_phase5g_workflow_engine.sql`
19. `202607130014_phase5g_workflow_engine_hardening.sql`
20. `202607150001_phase6a_clinical_engine.sql`
21. `202607160001_phase6a_clinical_engine_hardening.sql`
22. `202607160002_phase6a_clinical_publication_revocation_fix.sql`
23. `202607160003_phase6b_clinical_documentation.sql`
24. `202607160004_phase6b_clinical_documentation_frontend_rpc.sql`
25. `202607160005_phase6b_clinical_documentation_hardening.sql`
26. `202607160006_phase6b_clinical_documentation_audit_fix.sql`
27. `202607170001_phase6c_clinical_template_management.sql`
28. `202607170002_phase6c_clinical_template_management_hardening.sql`
29. `202607170003_phase6d_assessments_outcome_measures.sql`
30. `202607170004_phase6d_assessment_hardening.sql`

Migration deployment status was not verified against live Supabase during this audit.

## Module Readiness Matrix

| Area | Status | Evidence | Pilot relevance |
| --- | --- | --- | --- |
| Authentication | Needs live validation | Supabase Auth context, login, logout, session restoration and guards exist. | Launch critical |
| Tenant/profile resolution | Needs live validation | Auth context resolves profile, tenant memberships, active tenant and role. | Launch critical |
| Permissions | Needs live validation | Central authorization helpers and route guards exist. Live RLS/role tests still required. | Launch critical |
| Super Admin | Needs UX polish/live validation | Super Admin mode and platform sections exist, but not part of normal tenant pilot workflow. | Post-launch/limited pilot admin |
| Practice profile | Needs live validation | Supabase-connected CRUD page exists. | Launch critical |
| Locations | Needs live validation | Supabase-connected CRUD page exists. | Launch critical |
| Therapists | Needs live validation | Supabase-connected therapist and registration management exists. | Launch critical |
| Banking/Billing settings | Needs live validation | Supabase-connected pages exist; used by finance/PDF requirements later. | Launch critical |
| Branding | Needs integration | Supabase-connected branding config exists; file upload/storage is not implemented. | Launch critical for PDFs/Patient Link polish |
| Communication templates | Needs integration | CRUD exists; no email/SMS/WhatsApp delivery. | Pilot useful, not delivery-critical |
| Price lists | Needs live validation | Supabase-connected price list and procedure item management exists. | Launch critical |
| Patients | Needs live validation | Supabase-connected patient CRUD/detail foundation exists. Page text still says several workflows are not connected. | Launch critical |
| Bookings | Needs integration/live validation | Supabase-connected booking calendar/form exists with procedures, patient history and workflow events. Direct frontend table writes are still used for some workflows. | Launch critical |
| Sessions | Needs integration/live validation | Supabase-connected session workspace exists. Completion records draft-invoice readiness; finance handoff requires validation. | Launch critical |
| Draft invoices | Needs live validation | Finance page uses draft invoice tables/RPCs and session readiness. | Launch critical |
| Invoice issuing/payment workflow | Needs live validation | Finance page uses `issue_invoice`, `record_payment`, `allocate_payment`, `reverse_payment`; receipts are displayed as readiness records. | Launch critical |
| Statements | Needs integration | Finance architecture/database has foundation; routed live statement generation UI/PDF flow is not complete. | Launch critical |
| Receipts | Needs integration | Receipt records display in Finance; PDF generation is deferred. | Launch critical |
| Live PDFs | Launch blocker | Prototype PDF preview exists in unused `src/App.tsx`; routed production Finance flow only shows PDF readiness flags. | Launch critical |
| Supabase Storage/file uploads | Launch blocker | No Storage bucket/policy migrations found; no `supabase.storage` frontend usage found. Clinical attachments store metadata only. | Launch critical |
| Patient Link | Needs integration/live validation | `/p/:publicIdentifier` route exists with public context, verification, session, overview, appointments, invoices, receipts and privacy views. Delivery is deferred and intake/forms/documents are not complete. | Launch critical |
| Workflow Engine | Needs runtime integration | Workflow definitions, outbox, scheduled jobs, dead letters and admin UI exist. Page states it does not run workers or send communication. | Launch critical for automation if required |
| Clinical notes | Needs live validation | Clinical workspace and documentation component exist with protected RPCs. | Pilot useful |
| Clinical templates | Needs live validation | Template management exists; advanced review/actions deferred. | Pilot useful |
| Clinical assessments | Needs live validation | Assessment foundation, frontend, hardening migration and validation docs exist; automated scoring runtime is intentionally deferred. | Pilot useful, not payment-critical |
| Overview/dashboard | Needs integration | Overview/Dashboard still contain static placeholder command-centre content. | Pilot useful |
| Settings | Needs UX polish | Personal settings remain static placeholder cards. | Post-launch |
| Seed data | Launch blocker | No seed script or repeatable pilot dataset found. | Launch critical |
| QA scripts/tests | Launch blocker | No lint, test, E2E, smoke or QA scripts configured. | Launch critical |

## Operational Findings

### Genuinely Operational In Code

- React Router app shell is active through `src/main.tsx` and `src/routes/RootRoutes.tsx`.
- Authenticated app is guarded by `AuthProvider` and `AppModeGuard`.
- Patient Link has a separate public route at `/p/:publicIdentifier/*`.
- Supabase client configuration uses Vite environment variables.
- Core tenant pages are connected to Supabase tables and use the active tenant context.
- Finance has live-data screens for invoices, payments, accounts and receipts.
- Clinical workspace, clinical templates and clinical assessments compile and are routed.

### Architecture Or UI Foundation Only

- `src/App.tsx` still contains a large older localStorage/prototype application, including PDF previews and mock tenant records. It is not the active routed app entrypoint.
- Overview/dashboard command centre is mostly static placeholder content.
- Workflow worker runtime is not implemented in the frontend or package scripts.
- Communication delivery is not implemented.
- PDF generation in active routed workflows is not production connected.
- Supabase Storage is not configured in migrations or frontend.
- Patient Link intake completion, document downloads and production communication delivery remain incomplete.

### Missing Database/Runtime Connections

- No live Supabase migration validation was completed in this audit because local Supabase/Postgres was unavailable.
- No evidence of Supabase Storage bucket/policy setup.
- No active routed PDF generation workflow from live invoice/statement/receipt data.
- No worker process or scheduled job runner configured for Workflow Engine.
- No repeatable seed data or QA harness.

## Confirmed Pilot Blockers

1. Supabase migrations have not been verified against the live development project in this audit.
2. Live RLS and tenant-isolation tests are not automated or documented as passing.
3. No repeatable seeded pilot dataset exists.
4. No QA/smoke test scripts exist.
5. Supabase Storage workflows and bucket policies are not implemented.
6. Live-data PDFs for invoices, statements and receipts are not implemented in the active routed app.
7. Patient Link MVP is partial: verification and read-only portal shell exist, but delivery, intake/forms and documents need completion.
8. Workflow Engine has database/UI/admin foundations but no operational worker runtime for launch-relevant automation.
9. Overview command centre remains static and does not surface real operational tasks.

## Operational Readiness Step 1 Update

Status: blocked before live writes.

Findings:

- Linked Supabase project ref observed: `wdhfhdpcrcuyxqjehiyy`.
- Linked Supabase project name observed: `allidesk-production`.
- Because the linked project is labelled production, no migrations, seed data, RLS tests or smoke-path writes were applied.
- Remote migration comparison did not complete; `npx supabase migration list --linked` was interrupted after it returned no output.
- Local migration inventory contains 30 migrations with no duplicate timestamp prefixes.
- Generated database types include major operational tables such as patients, bookings, sessions, invoices, payments, patient links, workflow outbox, clinical notes and assessments.

Artifacts prepared:

- `docs/live-supabase-migration-validation.md`
- `supabase/seeds/operational_readiness_pilot_seed.sql`
- `supabase/smoke-tests/operational_readiness_schema_smoke.sql`
- `supabase/smoke-tests/operational_readiness_rls_manual_checklist.md`

No launch blocker was marked complete. Supabase Storage, file uploads, production PDFs, Workflow worker runtime, complete Patient Link and communication delivery remain incomplete.

## Staging Validation Handoff Update

Status: blocked before relink.

The staging-validation prompt still contained the literal placeholder `<PASTE_STAGING_PROJECT_REFERENCE_HERE>`. Because no actual staging project reference was supplied, the repository was not relinked and no migration, seed, RLS or smoke-test write operation was performed.

Verified during this handoff:

- Current linked project ref remained `wdhfhdpcrcuyxqjehiyy`.
- Current linked project name remained `allidesk-production`.
- Supabase CLI version: `2.109.1`.
- `npm run build` passed.
- `git diff --check` passed.

Owner action required: provide the real staging Supabase project reference and confirm it is non-production with no real patient or clinical data.

## Second Staging Validation Handoff Update

Status: blocked before relink.

The next staging-validation prompt still contained the literal placeholder `<INSERT_ACTUAL_STAGING_PROJECT_REFERENCE>`. The repository therefore remained linked to production ref `wdhfhdpcrcuyxqjehiyy` / `allidesk-production`, and no Supabase write operation was performed.

## Development Environment Approval Update

Status: blocked by Supabase CLI authentication before remote comparison.

The project ref `wdhfhdpcrcuyxqjehiyy` has now been owner-approved as the official AlliDesk development project and renamed to `allidesk-dev`. It is confirmed by the owner as non-production and containing no real patient or clinical data.

Verified locally:

- Linked ref remains `wdhfhdpcrcuyxqjehiyy`.
- Supabase CLI version is `2.109.1`.
- Branch is `main`.

Blocked:

- Supabase CLI is not authenticated in this execution environment.
- Debug output reported missing local CLI profile `/Users/gerhardolivier/.supabase/profile`.
- `npx supabase login` cannot prompt here because the CLI is running in non-interactive JSON output mode.

No migrations, seeds, smoke tests, RLS tests or remote writes were executed after this approval because the migration comparison could not be performed safely without CLI authentication.

## Recommended Implementation Order

1. Deploy and validate all migrations against the live Supabase development project.
2. Create a minimal seed dataset for one pilot tenant, admin, therapist, patient, booking, session, invoice and payment.
3. Add repeatable QA/smoke scripts for auth, RLS, tenant isolation and the booking-to-payment path.
4. Implement Supabase Storage buckets, policies and upload/download helpers for pilot-critical files.
5. Implement live-data PDFs for invoice, receipt and statement flows.
6. Complete Patient Link MVP around verified access, booking details, invoice/statement/receipt viewing and safe link states.
7. Wire launch-relevant workflow triggers and worker/runtime processing only where needed.
8. Replace static Overview placeholders with live pilot-critical task lists.

## Clear Readiness Labels

### Complete

- Repository has a modern routed React/Supabase architecture.
- Build passes.
- Core schemas and frontend foundations exist for the main domains.

### Needs Integration

- PDFs
- Storage
- Patient Link intake/documents
- Workflow runtime
- Overview live task data
- Statements and receipts as patient-facing artifacts

### Needs Live Validation

- Supabase migrations
- RLS policies
- Protected RPCs
- Auth/profile/tenant resolution against real users
- Cross-role access testing
- Booking/session/finance handoffs
- Clinical access boundaries

### Needs UX Polish

- Overview dashboard
- Settings
- Some placeholder copy still says future/deferred even where later engines exist.
- Patient Link mobile polish after live-data completion.

### Launch Critical

- Migration deployment validation
- RLS/tenant isolation validation
- Seed data
- QA scripts
- Patient Link MVP
- Live PDFs
- Supabase Storage
- Booking-to-session-to-finance E2E validation

### Post Launch

- Payment gateways
- Medical aid/claims
- AI
- Advanced dashboards
- Full communication delivery
- Automated assessment scoring
- Profession-specific modules

## Decisions Requiring Product Owner Input

- Which exact Patient Link capabilities are mandatory for the first pilot: intake edit, document downloads, invoice viewing, statement viewing, receipt viewing, or all of these.
- Whether the first pilot requires workflow automation to execute automatically, or whether readiness/event records plus manual workflows are acceptable.
- Whether quotes are in pilot scope, because the active routed app does not currently expose a production quote workflow.
- Which file categories must be available on day one: patient documents, referral docs, clinical attachments, branding assets, generated PDFs.

## Single Recommended Next Step

Apply and validate the full migration chain against the live Supabase development project, then run a small manual smoke test for one seeded tenant/user before implementing any new pilot-facing feature work.

## Operational Readiness Step 2 Update

Status: complete for tenant-scoped Storage foundation.

Target:

- Supabase project: `allidesk-dev`
- Project ref: `wdhfhdpcrcuyxqjehiyy`
- Classification: development only

Completed:

- Private Storage buckets created and verified:
  - `patient-documents`
  - `clinical-attachments`
  - `practice-assets`
  - `generated-documents`
- Central tenant-scoped `document_files` metadata table deployed.
- Storage object path validation deployed.
- Upload intent, finalise, archive and Patient Link shared-document RPCs deployed.
- Storage object policies deployed for authenticated upload/read/update of known tenant document metadata.
- Anonymous direct table access remains denied.
- Patient Link document access is scoped to valid external Patient Link sessions and explicitly shared documents.
- Practice Branding screen now supports logo upload to private Storage through the document upload RPC flow.
- Clinical Attachments screen now supports private clinical attachment uploads through the document upload RPC flow.
- Storage metadata seed created and verified as rerunnable.
- Authenticated storage/RLS harness created and passed.
- Supabase TypeScript types regenerated from `allidesk-dev`.
- `npm run build` passed.

Forward-only repairs created:

- `202607180002_storage_clinical_attachment_metadata_fix.sql`
- `202607180003_patient_link_document_access_log_event.sql`

Validation evidence:

- Migration list matches remote through `202607180003`.
- Schema smoke passed.
- Storage seed rerun safety confirmed with 7 stable fictional metadata rows.
- Storage security harness passed all checks across Admin, Therapist, Reception, Finance, Tenant B Admin, anonymous, and Patient Link contexts.

Still not implemented by design:

- PDF generation
- Supabase Storage binary fixture seeding
- Patient Link document download UI
- Workflow worker runtime
- Email, WhatsApp or SMS delivery
- Payment gateways
- Medical aid claims
- AI

## Updated Single Recommended Next Step

Implement the first pilot-critical generated document path: invoice/receipt/statement PDF generation that writes generated PDFs into `generated-documents` through the new Storage foundation.

## MVP Pilot E2E Validation Attempt

Date: 2026-07-21

Status: **blocked before pilot sign-off**

Target:

- Supabase project: `allidesk-dev`
- Project ref: `wdhfhdpcrcuyxqjehiyy`
- Classification: development only
- Local app URL used: `http://127.0.0.1:5173/`

Evidence document:

- `docs/mvp-pilot-e2e-validation.md`

Completed validation:

- `npx supabase projects list` confirmed linked `allidesk-dev` / `wdhfhdpcrcuyxqjehiyy`.
- `npx supabase migration list --linked` confirmed local and remote migration histories match through `202607180003`.
- `npm run build` passed.
- `git diff --check` passed.
- Local Vite app started and returned `HTTP/1.1 200 OK` at `http://127.0.0.1:5173/`.
- Storage security harness passed across Admin, Therapist, Reception, Finance, Tenant B Admin, anonymous, and Patient Link contexts.

Blocked validation:

- Browser-based E2E journey was not completed because both in-app browser and Chrome browser-control surfaces were unavailable in this session.
- Playwright is not installed in the project.
- Dedicated role login credentials were not available to this execution environment.
- Several broad linked Supabase SQL executions hung and were interrupted, although migration comparison and storage security validation completed successfully.

No reproducible application launch blocker was confirmed during this validation attempt.

Current readiness label:

- **Not ready for pilot sign-off until browser-based role E2E is completed.**

Single recommended next step:

- Run the browser-based MVP journey manually with the dedicated development role users, or provide a browser-capable execution session plus test-role login access.

# Live Supabase Migration Validation

Date: 2026-07-17

## Operational Readiness Step 1 — Approved Development Project

Status: **completed with documented live-validation limitations**

Approved target:

- Project ref: `wdhfhdpcrcuyxqjehiyy`
- Project name: `allidesk-dev`
- Classification: development only, not production
- Owner confirmed: no real patient or clinical data

### Authentication And Link Verification

- `npx supabase projects list` completed successfully.
- Supabase CLI is authenticated.
- `allidesk-dev` is visible in the project list.
- Project ref `wdhfhdpcrcuyxqjehiyy` is visible and marked linked.
- Local `.temp/project-ref` points to `wdhfhdpcrcuyxqjehiyy`.
- Local cached linked-project metadata still contains the old display name `allidesk-production`; remote project metadata from the CLI confirms the approved current name `allidesk-dev`.

### Migration Comparison And Deployment

Initial remote state:

- Remote had only `202607060001` applied.
- Local had 30 migrations through `202607170004`.
- Local-only migrations: `202607080001` through `202607170004`.
- No remote-only migrations were reported.

Applied migrations:

- `202607080001` through `202607170004` were applied to `allidesk-dev`.

Migration failure encountered:

- Migration `202607130009_phase5f_patient_link_foundation.sql` initially failed because `digest(text, text)` is installed in the `extensions` schema in the remote project.
- The pending local migration was corrected to use `extensions.digest(...)`.
- Matching pending calls to `gen_random_bytes(...)` and `digest(...)` were qualified in later pending migrations before deployment.

Forward-only repair migration created:

- `202607170005_operational_readiness_confirm_invoice_repair.sql`
- Purpose: fixes a runtime `confirm_invoice` RPC ambiguity by qualifying `public.invoice_lines.invoice_id`.

Final migration state:

- Local and remote migration ledgers match through `202607170005`.
- No remote-only migrations remain.
- No partially applied migration remains visible in `npx supabase migration list --linked`.

### Schema Smoke Results

Read-only schema smoke checks completed against `allidesk-dev`.

Evidence:

- Expected tables present: `27`
- Missing expected tables: `0`
- Expected tables with RLS enabled: `27`
- Expected RPCs present: `16`
- Missing expected RPCs: `0`
- Active subscription plans: `6`
- Hidden free plan: present
- Active plan codes: `business`, `enterprise`, `free`, `growth`, `professional`, `starter`

### Seed Data Results

The fictional operational readiness seed was executed using existing development Auth user:

- Email: `gostratgroup@gmail.com`
- Profile/Auth id: `9f24dd07-00b0-4056-bd9d-14d54860933c`

Seed adjustments made:

- Added required Patient Link `public_identifier` and `credential_hash`.
- Added a fictional Tenant B isolation fixture.
- Added `due_date` to the seeded invoice so invoice confirmation can pass real validation.

Seed result:

- Seed execution passed.
- Seed rerun passed.
- Deterministic fixture counts after rerun:
  - Seeded tenants: `2`
  - Seeded patients: `2`
  - Seeded bookings: `1`
  - Seeded sessions: `1`
  - Seeded invoices: `1`
  - Seeded patient links: `1`
- Seed audit events are append-only by design and increased across reruns.

### RLS And Tenant Isolation Results

Authenticated-role simulation used:

- `SET LOCAL ROLE authenticated`
- `request.jwt.claim.sub = 9f24dd07-00b0-4056-bd9d-14d54860933c`

Tenant isolation:

- Tenant A admin can read Tenant A seeded patient: `1`
- Tenant A admin can read Tenant B seeded patient: `0`
- Tenant A direct update against Tenant B patient affected rows: `0`
- Tenant A direct delete against Tenant B patient was denied by table privileges/RLS path.

Role checks using rolled-back tenant role changes:

- `admin`: patients `1`, bookings `1`, sessions `1`, invoices `1`, payments `0`, clinical notes `0`
- `therapist`: patients `1`, bookings `1`, sessions `1`, invoices `0`, payments `0`, clinical notes `0`
- `receptionist`: patients `1`, bookings `1`, sessions `1`, invoices `0`, payments `0`, clinical notes `0`
- `finance`: patients `1`, bookings `1`, sessions `1`, invoices `1`, payments `0`, clinical notes `0`

Anonymous validation:

- Anonymous temp-role validation could not be completed through the Supabase CLI Management API.
- The CLI returned a temp-role connection error requesting `SUPABASE_DB_PASSWORD`.
- This remains an owner/tooling validation item, not an observed policy failure.

Lifecycle protection:

- Direct session completion by table update was blocked by the `sessions_completed_state_check` constraint.
- Direct invoice status update could not be conclusively validated because the CLI temp-role query path failed with the same temp-role connection issue.

### Core Pilot Smoke Path Results

Fictional seeded path:

1. Fictional patient created: passed.
2. Booking created: passed.
3. Session linked/created: passed.
4. Session lifecycle transition: passed via `complete_session(...)`.
5. Clinical note linked where supported: not exercised; no seeded clinical note fixture exists in this smoke seed.
6. Draft invoice created: passed through seeded ready-to-confirm invoice and line.
7. Invoice totals verified: passed; total `780.00`.
8. Invoice confirmed: passed after repair migration; generated `PILOT-INV-0001`.
9. Invoice issued: passed; status moved to `awaiting_payment`.
10. Manual payment recorded: passed via `record_payment(...)` with `eft`.
11. Allocation recorded: passed; allocation count `1`.
12. Remaining balance checked: passed; balance due `0.00`.
13. Patient history checked: passed; patient history count `5`.
14. Audit records checked: passed; tenant audit count `5`.
15. Workflow trigger records checked: passed; workflow outbox count `10`, invoice workflow event count `4`.

Final invoice state:

- `invoice_status`: `paid`
- `payment_status`: `paid`
- `total_amount`: `780.00`
- `amount_paid`: `780.00`
- `balance_due`: `0.00`

### Generated Types

- Live Supabase TypeScript types were regenerated from `allidesk-dev`.
- `src/lib/database.types.ts` was stale and updated from the live schema.

### Remaining Live-Validation Items

- Anonymous access denial must still be validated through a browser/API JWT path or direct database URL tooling.
- Separate real Auth users for Tenant A therapist/receptionist/finance and Tenant B admin should be created for stronger user-context validation.
- Clinical note linkage was not part of the current seed smoke path.
- Direct invoice lifecycle bypass validation remains inconclusive through the CLI temp-role path.

## Staging Handoff Attempt

The follow-up staging-validation prompt still contained the literal placeholder:

```text
<PASTE_STAGING_PROJECT_REFERENCE_HERE>
```

Because no concrete staging project reference was supplied, the repository was **not** relinked and no staging migrations, seed scripts, RLS checks or smoke tests were run.

Preflight checks completed:

- Current linked project ref remained `wdhfhdpcrcuyxqjehiyy`.
- Current linked project name remained `allidesk-production`.
- Supabase CLI version: `2.109.1`.
- Branch remained `main`.
- `npm run build` passed.
- `git diff --check` passed.
- Existing Vite large-chunk warning remains.

Owner action required:

- Provide the actual staging Supabase project reference.
- The supplied staging reference must not equal `wdhfhdpcrcuyxqjehiyy`.
- The staging project name must clearly identify it as staging, development, testing, or non-production.
- Confirm the staging project contains no real patient or clinical data.

## Second Staging Handoff Attempt

A later staging-validation prompt contained the literal placeholder:

```text
<INSERT_ACTUAL_STAGING_PROJECT_REFERENCE>
```

Because the staging reference was still not provided, the repository again remained linked to `wdhfhdpcrcuyxqjehiyy` / `allidesk-production`. No `supabase link`, migration comparison, migration deployment, seed run, RLS test, role test, or smoke test was executed.

Preflight checks completed:

- Current linked project ref remained `wdhfhdpcrcuyxqjehiyy`.
- Current linked project name remained `allidesk-production`.
- Supabase CLI version remained `2.109.1`.
- Branch remained `main`.

## Development Environment Approval Update

The project ref `wdhfhdpcrcuyxqjehiyy` was later approved by the owner as the official AlliDesk development environment and renamed from `allidesk-production` to `allidesk-dev`.

Owner confirmation received:

- The project is the AlliDesk development project.
- It is not production.
- It contains no real patient data.
- It contains no real clinical data.
- It is safe for migrations, fictional seed data, RLS validation, role testing, workflow testing and smoke testing.

Preflight checks completed after approval:

- Current linked project ref: `wdhfhdpcrcuyxqjehiyy`.
- Cached local linked-project metadata still showed the old name `allidesk-production`; remote name could not be re-queried because the Supabase CLI is not authenticated in this execution environment.
- Supabase CLI version: `2.109.1`.
- Branch: `main`.

Attempted read-only commands:

```bash
npx supabase projects list
npx supabase migration list --linked --debug
```

Results:

- `npx supabase projects list` hung and was interrupted.

## Operational Readiness Step 1B — Authenticated Security Validation

Status: **completed**

Target:

- Project ref: `wdhfhdpcrcuyxqjehiyy`
- Project name: `allidesk-dev`
- Classification: development only

### Auth User Discovery And Linking

Existing dedicated Auth users were discovered in `auth.users` and linked to fictional seed fixtures:

- `gostratgroup+allidesk-admin-a@gmail.com` → Tenant A admin
- `gostratgroup+allidesk-therapist-a@gmail.com` → Tenant A therapist
- `gostratgroup+allidesk-reception-a@gmail.com` → Tenant A receptionist
- `gostratgroup+allidesk-finance-a@gmail.com` → Tenant A finance
- `gostratgroup+allidesk-admin-b@gmail.com` → Tenant B admin

Repeatable linking script:

```text
supabase/seeds/operational_readiness_auth_user_links.sql
```

Rerun evidence:

- Linked memberships: `5`
- Session-linked clinical notes: `1`
- Clinical note versions: `1`
- Patient Link grants: `1`

### Step 1B Migrations

Additional forward-only repair migrations were created and deployed:

1. `202607170006_operational_readiness_lifecycle_direct_update_guard.sql`
2. `202607170007_operational_readiness_lifecycle_rpc_call_stack_guard.sql`

Purpose:

- Block direct authenticated table updates to protected session lifecycle fields.
- Block direct authenticated table updates to protected invoice lifecycle fields.
- Preserve approved RPC-driven lifecycle changes.

Final migration state:

- `npx supabase migration list --linked` shows local and remote ledgers matching through `202607170007`.
- No remote-only migrations were reported.
- No local-only migrations were reported after the Step 1B repair push.

### Authenticated RLS Harness

Repeatable harness:

```text
supabase/smoke-tests/operational_readiness_authenticated_rls.sql
```

Final result: **passed**

Validated:

- Tenant A admin sees Tenant A patient and cannot see Tenant B patient.
- Tenant B admin sees Tenant B patient and cannot see Tenant A patient.
- Tenant A admin cannot update Tenant B patient.
- Admin operational read matrix passed.
- Therapist read matrix passed.
- Reception read matrix passed.
- Finance read matrix passed.
- Direct session lifecycle table update is blocked.
- Direct invoice lifecycle table update is blocked.

### Anonymous And Patient Link Validation

Anonymous REST validation used the public anon key from local `.env` without exposing the key.

Results:

- Anonymous `patients` table read denied with `42501`.
- Anonymous `clinical_notes` table read denied with `42501`.
- Patient Link public context returned the expected verification-required public payload.
- Patient Link portal request with invalid session returned `expired_session`.

Patient Link validation also confirmed that a valid external session can access the seeded fictional portal data without exposing direct patient ids.

### Authenticated Core Smoke Path

The existing terminal booking-to-paid-invoice fixture was read back through dedicated authenticated roles:

- Finance user: invoice `paid`, payment `paid`, total `780.00`, amount paid `780.00`, balance due `0.00`, payment count `1`, allocation count `1`.
- Therapist user: session count `1`, linked clinical note count `1`.
- Admin user: patient history count `5`, workflow event outbox count `13`, audit count `8`.

The mutating payment path was not replayed in Step 1B because the fixture is already terminal/paid and duplicate payment creation would weaken repeatability.

### Generated Types

`src/lib/database.types.ts` was regenerated from the live `allidesk-dev` schema after `202607170006` and `202607170007` were applied.

### Step 1B Outcome

Operational Readiness Step 1B is complete.

Remaining launch blockers are no longer authentication/RLS blockers. The next highest-value operational layer is tenant-scoped Supabase Storage and document/file handling.
- `npx supabase migration list --linked --debug` reported the missing local CLI profile path `/Users/gerhardolivier/.supabase/profile` and then hung until interrupted.
- `npx supabase login` could not prompt in this execution environment because the CLI runs in non-interactive JSON output mode.
- No `SUPABASE_*` environment variable was visible to the process.

Current blocker:

- Supabase CLI authentication is not configured for this execution environment.
- Migration comparison, `db push`, type generation from the remote project, schema smoke SQL, seed execution and authenticated RLS validation cannot proceed until the Supabase CLI is logged in or a safe access-token mechanism is provided outside repository files.

Safe owner action:

```bash
cd "/Users/gerhardolivier/Go Difference Coding /Allidesk"
npx supabase login
```

After the CLI is authenticated, rerun the operational readiness task from migration comparison. Do not paste tokens into repository files or markdown.

## Target Environment Classification

- Linked Supabase project ref: `wdhfhdpcrcuyxqjehiyy`
- Linked Supabase project name: `allidesk-production`
- Local project directory: `/Users/gerhardolivier/Go Difference Coding /Allidesk`
- Classification for this run: **blocked pending target confirmation**

The linked project name includes `production`. Because the current task explicitly requires stopping if the linked project may contain real production patient data, no migrations, seed data, RLS tests or smoke-path writes were applied to this Supabase project.

No secrets, passwords, access tokens, service-role keys, database URLs or full environment variable values were printed or documented.

## Repository And Branch Status

- Branch: `main`
- Tracking: `main...origin/main`
- Worktree: dirty before this task started.
- Existing modified files observed before this task:
  - `src/lib/database.types.ts`
  - `src/pages/Patients.tsx`
  - `src/pages/Practice.tsx`
  - `src/routes/appRoutes.tsx`
  - `src/styles.css`
- Existing untracked Phase 6 docs, migrations and clinical source files were already present.

This task added documentation/operations artifacts only. It did not modify application code or migrations.

## Local Migration Inventory

Local migration count: 30

No duplicate migration timestamp prefixes were detected.

Execution order:

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

## Local And Remote Migration Comparison

Attempted command:

```bash
npx supabase migration list --linked
```

Result:

- The command did not return output after a reasonable wait and was interrupted.
- No destructive command was run.
- Remote migration state remains **not verified**.

Previous local-only comparison command:

```bash
npx supabase migration list --local
```

Result:

- Failed because local Supabase/Postgres was not running or reachable.

## Migrations Applied

None.

Reason:

- The linked target is labelled `allidesk-production`.
- The remote comparison did not complete.
- The task rules require stopping before applying anything if the target may contain production data.

## Migration Errors

No migration was executed, so no database migration error occurred.

The only migration-state command issue was the hanging read-only `npx supabase migration list --linked` command.

## Forward-Only Repair Migrations

None created.

No live migration failure was encountered because no migrations were applied.

## Live Schema Validation

Not completed.

Blocked by:

- Production-labelled linked project.
- Remote migration comparison did not complete.

Prepared read-only schema smoke SQL:

- `supabase/smoke-tests/operational_readiness_schema_smoke.sql`

This script checks launch-relevant table presence, RLS enabled state, important RPC presence, tenant-scoping columns, policies and subscription seed rows. It must be run only after confirming the target is a safe development/staging database.

## Seeded Data Structure

No seed data was inserted into the linked Supabase project.

Prepared development-only seed file:

- `supabase/seeds/operational_readiness_pilot_seed.sql`

The seed is designed to create one fictional pilot smoke path:

- one pilot tenant
- one practice profile
- one main location
- one tenant admin membership linked to a manually created Auth user
- one therapist profile
- one bank account
- one billing settings row
- one branding row
- one patient
- one responsible party
- one price list
- one price-list item
- one booking
- one booking procedure
- one linked session
- one session procedure
- one ready-to-confirm invoice
- one invoice line item
- one financial account
- one Patient Link fixture
- one draft workflow definition and version
- one audit event

The seed is idempotent by fixed UUIDs and uses fictional `.example.test` data. It does not create passwords or insert directly into unsupported Auth tables.

## Exact Safe Seed Rerun Process

Only after confirming the target is a development/staging project with no real patient data:

1. Create a fictional Supabase Auth user manually.
2. Copy only that user's `auth.users.id`.
3. Run:

```bash
psql "$SUPABASE_DB_URL" \
  -v pilot_admin_profile_id='<AUTH_USER_UUID>' \
  -f supabase/seeds/operational_readiness_pilot_seed.sql
```

Do not commit or document `SUPABASE_DB_URL`.

## RLS Test Method

Prepared manual checklist:

- `supabase/smoke-tests/operational_readiness_rls_manual_checklist.md`

Important limitation:

- Service-role SQL is not accepted as RLS validation.
- Real authenticated user/JWT contexts are required for Tenant A/Tenant B, role and Patient Link checks.

## Tenant-Isolation Results

Not completed.

Reason:

- No safe live/staging target was confirmed.
- No test Auth users or seed data were created in the linked project.

## Role-Test Results

Not completed.

Reason:

- Same blocker as tenant-isolation testing.

## Pilot Smoke-Path Results

Not executed.

Current classification by step:

| Step | Status | Notes |
| --- | --- | --- |
| Patient created | Blocked | Seed prepared, not run. |
| Booking created | Blocked | Seed prepared, not run. |
| Session linked or created | Blocked | Seed prepared, not run. |
| Session lifecycle advanced | Blocked | Requires authenticated user/RPC smoke path. |
| Clinical record or note linked | Not implemented in seed | Clinical module exists but pilot seed does not create clinical notes. |
| Draft invoice created | Blocked | Seed prepared, not run. |
| Invoice totals validated | Blocked | Requires live seeded data. |
| Manual payment recorded | Blocked | Requires confirmed/issued invoice and authenticated finance/admin context. |
| Remaining balance checked | Blocked | Requires live payment flow. |
| Timeline/history checked | Blocked | Requires live seeded data and workflow events. |
| Audit records checked | Blocked | Seed prepared with one audit event, not run. |
| Workflow trigger records checked | Blocked | Workflow fixture prepared, not run. |

## Unresolved Blockers

1. Confirm whether `wdhfhdpcrcuyxqjehiyy` / `allidesk-production` is safe development/staging or contains any real production patient data.
2. Remote migration comparison must complete successfully.
3. Pending migrations, if any, must be applied only after target confirmation.
4. Live schema smoke SQL must be run after migration deployment.
5. Pilot seed must be run only on safe dev/staging.
6. RLS and role checks require real authenticated test users.
7. Core booking-to-payment smoke path requires live seeded data.

The following remain launch blockers and were intentionally not marked complete:

- Supabase Storage
- file uploads
- production PDFs
- Workflow worker runtime
- complete Patient Link
- communication delivery

## Recovery Or Rollback Considerations

- No live database changes were made during this task.
- No rollback is required for this task.
- If the prepared seed is later run in a safe development/staging project, it can be cleaned by deleting rows with the fixed UUID range `10000000-0000-4000-8000-000000000001` through `10000000-0000-4000-8000-000000000022` and related rows marked with metadata `seed_key = operational_readiness_pilot`.
- Do not use `supabase db reset` against linked live projects.

## Safe Rerun Commands

Read local metadata:

```bash
git status --short --branch
git branch --show-current
npm run build
git diff --check
```

Compare remote migrations after confirming the target:

```bash
npx supabase migration list --linked
```

Run read-only schema smoke checks after confirming and applying migrations:

```bash
psql "$SUPABASE_DB_URL" -f supabase/smoke-tests/operational_readiness_schema_smoke.sql
```

Run development seed only after confirming no real patient data exists:

```bash
psql "$SUPABASE_DB_URL" \
  -v pilot_admin_profile_id='<AUTH_USER_UUID>' \
  -f supabase/seeds/operational_readiness_pilot_seed.sql
```

## Production Data Confirmation

No production patient data was inspected, modified, seeded, migrated or deleted during this task.

Because the linked project is named `allidesk-production`, production-data absence is **not confirmed** and must be confirmed by the project owner before any write operation.

## Operational Readiness Step 2 Storage Validation Update

Date: 2026-07-20

Target environment:

- Supabase project: `allidesk-dev`
- Project ref: `wdhfhdpcrcuyxqjehiyy`
- Environment classification: approved development environment
- Data classification: fictional seed metadata only

### Migration Status

Local and remote migration history now match through:

- `202607180001_operational_readiness_storage_foundation`
- `202607180002_storage_clinical_attachment_metadata_fix`
- `202607180003_patient_link_document_access_log_event`

Step 2 migrations applied:

- `202607180001_operational_readiness_storage_foundation.sql`
- `202607180002_storage_clinical_attachment_metadata_fix.sql`
- `202607180003_patient_link_document_access_log_event.sql`

### Repair Migrations

Two forward-only repair migrations were required:

1. `202607180002_storage_clinical_attachment_metadata_fix.sql`
   - Preserves selected clinical attachment category metadata when a private Storage upload is finalised.
   - Keeps clinical attachment metadata linked to `document_files`.

2. `202607180003_patient_link_document_access_log_event.sql`
   - Adds `document_viewed` to the allowed `patient_link_access_logs.event_type` values.
   - Required because `get_patient_link_shared_documents(...)` records shared-document access as a document-specific audit event.

### Schema Validation

`supabase/smoke-tests/operational_readiness_schema_smoke.sql` passed after the storage migrations.

The expected subscription plans were visible:

- starter
- professional
- growth
- business
- enterprise
- free

### Storage Seed Validation

Executed:

```bash
npx supabase db query --linked --file supabase/seeds/operational_readiness_storage_seed.sql
```

Rerun safety was confirmed. The storage seed remains stable at 7 fictional metadata rows:

```text
storage_seed_rows = 7
```

The seed stores metadata only and does not insert binary files.

### Authenticated Storage RLS Validation

Executed:

```bash
npx supabase db query --linked --file supabase/smoke-tests/operational_readiness_storage_security.sql
```

All storage harness checks passed:

- all five required development Auth users discovered
- Tenant A admin sees Tenant A document metadata only
- Tenant B admin sees Tenant B document metadata only
- Admin can see patient, referral, clinical, practice, and generated document metadata
- Therapist can see patient/referral/clinical metadata and cannot see finance generated documents
- Reception can see patient/referral/practice metadata and cannot see clinical or finance documents
- Finance can see generated finance documents and cannot see clinical attachments
- Anonymous direct table access to `document_files` is denied
- Patient Link invalid session returns no documents
- Patient Link valid session returns only the explicitly shared document
- executable file types are rejected
- oversized practice logo uploads are rejected
- object paths must match tenant/document metadata

### Bucket Verification

The following private buckets were verified in `storage.buckets`:

- `patient-documents`
- `clinical-attachments`
- `practice-assets`
- `generated-documents`

All are private buckets with configured file-size and MIME-type restrictions.

### Generated Types

`src/lib/database.types.ts` was regenerated from the linked development schema after Step 2 migrations.

### Validation Commands

Passed:

- `npx supabase migration list --linked`
- `npx supabase db query --linked --file supabase/smoke-tests/operational_readiness_schema_smoke.sql`
- `npx supabase db query --linked --file supabase/seeds/operational_readiness_storage_seed.sql`
- `npx supabase db query --linked --file supabase/smoke-tests/operational_readiness_storage_security.sql`
- `npm run build`

Known warning:

- Vite still reports the existing large chunk warning.

No production data was used or introduced during this step.

## MVP Pilot E2E Validation Attempt

Date: 2026-07-21

Target environment:

- Supabase project: `allidesk-dev`
- Project ref: `wdhfhdpcrcuyxqjehiyy`
- Classification: development only
- Data classification: fictional development data only

Migration status:

- `npx supabase migration list --linked` passed.
- Local and remote migration histories match through `202607180003`.
- No pending migrations were applied during this validation attempt.
- No repair migrations were created.

Validation completed:

- `npx supabase projects list` confirmed linked project `allidesk-dev`.
- `npm run build` passed.
- `git diff --check` passed.
- Local app served `http://127.0.0.1:5173/` and returned `HTTP/1.1 200 OK`.
- `supabase/smoke-tests/operational_readiness_storage_security.sql` passed.

Blocked:

- Browser-based end-to-end pilot validation was not completed because browser-control surfaces were unavailable in this session.
- Full schema smoke and authenticated RLS SQL files hung through the linked CLI during this run and were interrupted; previous readiness evidence remains documented.

Result:

- No product defect was confirmed.
- Pilot sign-off remains blocked until the browser-based role journey is completed.

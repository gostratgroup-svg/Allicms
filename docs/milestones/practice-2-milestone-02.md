# Practice 2.0 - Validation & Financial Document Hardening

## Milestone Baseline

- Status: In progress
- Start date: 2026-10-20
- Baseline captured: 2026-10-20 12:04:06 SAST
- Branch: `practice-2-frontend`
- Baseline commit: `57c61b5bfee17d2cba74e2a354330e582d2b444a`
- Working tree: Dirty; 22 modified tracked files, 12 untracked files, and no staged changes
- Aggregate tracked working-tree diff SHA-256: `2c790c69959b1aeb13f591069bf0d19edd541064eba92e85060a7fcf2f714f25`
- Approved development Supabase project: `allidesk-dev` (`wdhfhdpcrcuyxqjehiyy`)

Milestone 1 ended with substantial uncommitted work. The fingerprints below identify the exact Milestone 2 starting contents so inherited work is not misattributed. This manifest records hashes and metadata only; it contains no credentials, environment files, patient data, database records, generated output, or source snapshots.

## Dirty-File Fingerprints

| Status | File | SHA-256 | Git blob | Bytes | Lines |
| --- | --- | --- | --- | ---: | ---: |
| Modified | `docs/mvp-pilot-e2e-validation.md` | `db3e247cbaf18ca20dde5b309372c3838d3ea6f66cd1ee3d28f6538ebc688ea2` | `f54792efd0323cf0b8bc6256cc232f7cdb382fd3` | 8,853 | 173 |
| Modified | `src/App.tsx` | `7b5ca096184b262e8e8028ddc78c5d677c458e17cecdf8375c2f64523e66da3f` | `d5a3980b58515c39c4f6e8441a0fc32b323a2879` | 350,442 | 7,715 |
| Modified | `src/auth/AuthContext.tsx` | `7cb958591c81c28df2fd8604fbb3f333c40a2db3b5053e13ec0508f7f671049e` | `e7c6283591afa7b8b91d0ba351ab028ee012d82a` | 7,683 | 297 |
| Modified | `src/components/PageHeader.tsx` | `6b27992bc695b832ed4cb4d19e5d0cfb028e98ccb24b3b3ef02e1cbad8cb35ea` | `03f51457a7a45da3d40d56fce35639d76bcb85b0` | 1,058 | 40 |
| Modified | `src/layout/AppShell.tsx` | `23c458f1609f6a61c860e43ddd402a10fa72e5ada1128c55cb9a0820c68ed9b5` | `0bc042e7268125dd855ef2991d43ffc8aca048e8` | 1,123 | 56 |
| Modified | `src/lib/financePdf.ts` | `abae92bf6541bf88ff21b7bb7016cb3037481a37b20815f9176b28f8f5f36ef7` | `eb81cd2874a127dd2b6abcfd1bad8a7418f4efa9` | 11,895 | 339 |
| Modified | `src/pages/Bookings.tsx` | `f22107b2420092610fcc068d7c6dd37b99946192f8656efad67a5ffce59c9971` | `7699df7f623eabc1d3823a777ce312dcfc8de85b` | 114,651 | 2,219 |
| Modified | `src/pages/Clinical.tsx` | `84670b35fb09d623e4756d46e3cd1cc3c00d6774cd373004768adf6281568274` | `d1091addd5633d232b70a32f9f964eb8bec63cfe` | 118,273 | 2,416 |
| Modified | `src/pages/Finance.tsx` | `34947b89ea6f59358fbfdd5c454dfa163db510ce18b04fd4abf9b9b2d4b259bd` | `8561443ccec4b0c2b0cd226b0adec29b24be0c06` | 157,346 | 2,663 |
| Modified | `src/pages/FinancePriceLists.tsx` | `938de727093e3eb35f6cc749b9bb7759330714f56f39172ed68a471b3c8df990` | `7d3bee8f312fad9a85ed0b43db6202d7e1e7a7f2` | 25,869 | 653 |
| Modified | `src/pages/Patients.tsx` | `f7da7dfb6848769b23bb17cc1d73eba92fb80c031386c98ea9422efb6653d397` | `93c960349ed7fb2aa61dec3915207c3823e2d685` | 82,303 | 1,657 |
| Modified | `src/pages/Practice.tsx` | `a54c23029be6d95c461259c96741d555f45a2ceb686494ba11bde41af673c15b` | `f25d4d3b94d7b4c72fbbb04006f033a66af02192` | 133 | 5 |
| Modified | `src/pages/PracticeBanking.tsx` | `ec5c4e8c7f71dfaa71c7e87c0442a8c809b8763325e339d037c45c46d4c9000e` | `274353e29d3bf739eddcb411f97e85586e3f5d98` | 14,189 | 382 |
| Modified | `src/pages/PracticeBilling.tsx` | `9b6035bc096167fbd6b19c779cba7108696f505c1aadf1342b39cb857c15652e` | `27e6b991f37613ef1c6fa23bf481f23bfa0be854` | 16,266 | 377 |
| Modified | `src/pages/PracticeBranding.tsx` | `e357c64281380026602b764e93f6a6252450d1b38e0be7cffba597274c77995d` | `6d060684be7fd3c4634e91c8c8e1e4b104f294cd` | 36,988 | 763 |
| Modified | `src/pages/PracticeCommunicationTemplates.tsx` | `79941d908c474bd3b5551d33617fbe737bed01b8d0db65b8fbcfd7ecaf9cd083` | `1b527f78f23eaaf240b108858b60758c55ded3ec` | 13,921 | 369 |
| Modified | `src/pages/PracticeLocations.tsx` | `71b991972ea31cd1fd926bc6f13e84ac981ea39838b14496006789fff492c175` | `0bf0c43db1a40c58b0aee58ab208bf6602e728b9` | 16,869 | 420 |
| Modified | `src/pages/PracticeProfile.tsx` | `b2fa4c0a84cb5764b14125050f3888c8fc776bcbdfaced27720f40c1aaca32fd` | `23be61698eafc9e6a2b7bf5cd16f9ee0644f80e6` | 12,927 | 314 |
| Modified | `src/pages/PracticeTherapists.tsx` | `b0349a7261db9a2c31d6c0bd725e8b4b2ac64cad510132f3a930bc58876bdef1` | `083665e447e02d2bfd21c26eb0bf1f2842283030` | 34,060 | 750 |
| Modified | `src/pages/Sessions.tsx` | `906bc78824c4417f78d7327883081fa70ed03eb7ab6fe4d52925c3a547e82bf6` | `fa5148533605e0bdd42bffaa3b00a8e9df09fde4` | 73,406 | 1,276 |
| Modified | `src/routes/appRoutes.tsx` | `bcbe395cdf55f0cbd4cf12604cf00aab31e87951d73eb92a8f9a03a9ad90a42f` | `01dc0e916ef914e04b50fe91c1e71ade76c7ead4` | 12,167 | 339 |
| Modified | `src/styles.css` | `e044964ec7360afeb1271a736ac5b8b9269ee83330d4ae2009f8647f41eb55dd` | `4c501b944acc0b2585f77da0238d85b288e2f71b` | 233,369 | 12,484 |
| Untracked | `docs/allidesk-original-session-workflow-recovery.md` | `8f3b3712f5934a872b3c9d11bcb71add6002e1f58082c9fb7decc62792afd13b` | `3060e73b7aa1bd738617b2ce35a1c1f7ab961778` | 23,987 | 316 |
| Untracked | `docs/milestones/practice-2-milestone-01-baseline.md` | `b006cf8bfe9908f95e70021c7cea2bfc2fd0456913565cce631fb04f8e67657f` | `c08057d080a31f52a10882bf279e523862efd062` | 5,593 | 50 |
| Untracked | `docs/milestones/practice-2-milestone-01.md` | `f81f38d767a530aecf45367e423f288027e72148486ef0107e40cf8b81e78b39` | `697beb3a3392e07047beaee33a30e79dad54bc3d` | 28,042 | 258 |
| Untracked | `docs/mvp-complete-functional-audit.md` | `7991c5abbf9da11bb8da7afb1182c0cfa6ff7d17907cc04a40c583d08d420681` | `97d4aaa3c2ed61b2d27ebfb7f413d1f232d24ab0` | 34,953 | 450 |
| Untracked | `src/components/EditSaveControls.tsx` | `c5d050005fd3af5d76c0f198f41e143bf9aca25fed3524784dc742405bb8da6d` | `b9768dc3bad93c2fb71056d1fe3302056c233500` | 1,324 | 51 |
| Untracked | `src/components/EditableField.tsx` | `ce5c8e7157664bdf9ba06b7ca7cf77ebbf1c73ee3c276f8f659912184077abf2` | `39f4a1e246ebd8d4926438b969321a32d0430776` | 734 | 37 |
| Untracked | `src/components/TopbarNotice.tsx` | `6c96ec91e972fb128390b207144ea3ebd999c67a3623a7cda6ad48686d76476a` | `b6d91129be562493229c1ba9308197379b963915` | 505 | 17 |
| Untracked | `src/components/icons.tsx` | `d6c2fbdc7a8b44a7888ad8880eb0f05da8681eec47c289168c96045f17a7ba5a` | `f251dd67fafdc939a2d33c1609586dd996ee8743` | 2,063 | 86 |
| Untracked | `src/lib/appNotice.ts` | `27d63bd13b7b5abd1219cbc7a3519927f6850a170c9ee8e3dbd3eef8ffc40bb0` | `43e864b63155f2f06c89695f3eacb08254933b92` | 481 | 18 |
| Untracked | `src/pages/PracticeBillingConfiguration.tsx` | `21364949b92ea787776f98ff223ca20a824949af0217a2cb1def679a16e5d023` | `3458bda9e6e1e4e3351eecb8cf92cf09eee0525e` | 2,125 | 56 |
| Untracked | `src/pages/PracticeSetupConfiguration.tsx` | `09d095df52c11921e05399a7fb7026645f95dd1f09f43532610a13ca5e552ef1` | `2f3e860b283dc4199d750eed3e7b283d2a1f11cc` | 2,522 | 53 |
| Untracked | `supabase/migrations/202607180004_invoice_default_bank_fallback.sql` | `cd079df559f40d877ae529bf07d165adad26a2b03408f2e5510505e66844ecdc` | `70437903f7e9d8b3bf2a7e4f7f245fef1f1e6d35` | 1,873 | 57 |

## Migration Inventory

- Local migration count at baseline: 35
- Latest local version: `202607180004_invoice_default_bank_fallback.sql`
- Approved pending migration SHA-256: `cd079df559f40d877ae529bf07d165adad26a2b03408f2e5510505e66844ecdc`
- Earlier migration range: `202607060001_phase1_platform_identity.sql` through `202607180003_patient_link_document_access_log_event.sql`
- Remote migration state: Not yet verified for this milestone.

## Relevant Existing Documentation

- `docs/milestones/practice-2-milestone-01-baseline.md`
- `docs/milestones/practice-2-milestone-01.md`
- `docs/mvp-complete-functional-audit.md`
- `docs/mvp-pilot-e2e-validation.md`
- `docs/operational-readiness-baseline.md`
- `docs/operational-readiness-step1b-authenticated-rls.md`
- `docs/operational-readiness-step2-storage.md`
- `docs/phase5d-step1-draft-invoice-engine-architecture.md`
- `docs/phase5d-step2-draft-invoice-database-summary.md`
- `docs/phase5d-step3-draft-invoice-frontend-summary.md`
- `docs/phase5d-step4-draft-invoice-integration-hardening-summary.md`
- `docs/phase5d-step5-draft-invoice-engine-validation.md`
- `docs/phase5e-step1-finance-workflow-architecture.md`
- `docs/phase5e-step2-finance-database-summary.md`
- `docs/phase5e-step3-finance-frontend-summary.md`
- `docs/phase5e-step4-finance-integration-hardening-summary.md`
- `docs/phase5e-step5-finance-workflow-validation.md`

## Running Change Log

| Date | Work item | Status | Evidence |
| --- | --- | --- | --- |
| 2026-10-20 | Capture exact dirty-tree Milestone 2 baseline. | Complete | Branch, HEAD, per-file hashes, aggregate tracked diff hash, migration inventory, and relevant documentation recorded. |
| 2026-10-20 | Verify and deploy approved default-bank fallback migration. | Complete | CLI authentication, project name/reference, local link, remote history and dry-run verified. Only `202607180004` was applied to `allidesk-dev`. |
| 2026-10-20 | Audit historical invoice snapshots and correct future invoice regeneration behavior. | Complete | Live-data PDF fallbacks were removed, page numbering was added, and `202607180005` was deployed and verified against rollback-only authenticated mutation attempts. |
| 2026-10-20 | Repair the first generated-document Storage policy failure. | Complete, with a second policy defect found | `202607180006` restored only the two fixed validation-helper grants. Browser generation advanced beyond the original permission error, then failed because the Storage object policy cannot see its own `pending_upload` metadata row. |
| 2026-10-20 | Visually validate financial PDFs against fictional development records. | Blocked by confirmed defect | Client-side generation ran, but Storage rejected the object insert. Signed URL viewing, download, duplicate success behavior and rendered short/multipage inspection could not be completed. |
| 2026-10-20 | Run authenticated Practice and Finance browser regression. | Partially complete | Practice screens and Finance were exercised in Chrome against fictional `allidesk-dev` data. Invoice loading passed; generated-document upload remains blocked. |
| 2026-10-20 | Prepare narrow Milestone 2 blocker repairs. | Complete, awaiting approval | Forward-only migrations `202607180007`-`202607180009` and a rollback-only post-deployment harness were prepared. No repair migration was applied. |

## Comparison Rules

- The dirty-file fingerprints above are the Milestone 2 baseline, not a restoration archive.
- Files already dirty at baseline count as Milestone 2 work only if their fingerprint changes after this capture and the change is recorded in the running log.
- No `.env` files, secrets, tokens, database records, generated build output, dependency directories, or patient information are included.
- Do not discard, reset, stash, overwrite, commit, push, deploy, or modify production infrastructure without Product Owner approval.

## Interim Validation Record

### Approved Migration Deployment

- `npx supabase projects list`: authenticated; `allidesk-dev` (`wdhfhdpcrcuyxqjehiyy`) visible, healthy and linked.
- Local `supabase/.temp/project-ref`: `wdhfhdpcrcuyxqjehiyy`.
- `npx supabase migration list --linked`: local and remote matched through `202607180003`; only `202607180004` was local-only.
- `npx supabase db push --linked --dry-run`: planned only `202607180004_invoice_default_bank_fallback.sql`.
- `npx supabase db push --linked`: applied only `202607180004_invoice_default_bank_fallback.sql` successfully.
- The migration changes future insert behavior only. It does not update historical snapshots, change RLS, alter grants, or rewrite issued invoices.

### Historical Invoice Audit Findings

**Implemented in frontend:**

- Official invoice generation no longer falls back to the live active tenant name, current patient, current therapist, or current Main location.
- Issued invoice presentation now uses only `invoice_issuer_snapshots`, `invoice_party_snapshots`, invoice lines and invoice financial records.
- Missing legacy snapshot data is displayed as not captured instead of being silently replaced with current setup data.
- Financial PDFs now include `Page X of Y` numbering.

**Database hardening deployed:**

- Existing RLS grants finance/admin users `UPDATE` access to invoice headers, lines, party snapshots and issuer snapshots.
- Lifecycle triggers protect status and payment transitions, but there is no database-level protection for due dates, identity/source fields, invoice lines, tax values, payer snapshots or issuer snapshots after confirmation.
- The UI disables editing, but UI-only immutability does not satisfy the approved historical-invoice rule.
- Applied migration `202607180005_invoice_historical_snapshot_hardening.sql`:
  - captures the active Main location into future issuer snapshots;
  - does not backfill or fabricate historical values;
  - freezes invoice identity, dates, source, totals and metadata after confirmation;
  - freezes invoice lines and party/issuer snapshots after confirmation;
  - leaves approved payment, allocation, balance, lifecycle and reconciliation fields available to their existing RPCs;
  - changes no RLS policy or role permission.

### Authenticated Browser Evidence

Browser method: Chrome against `http://127.0.0.1:5175`, using an existing authenticated development session and fictional tenant records.

| Area | Result | Evidence |
| --- | --- | --- |
| Practice Profile | Browser validated | Existing values loaded; Edit exposed fields; unchanged Save completed; global notice reported `Practice profile updated`; saved read-only view returned. |
| Locations | Browser validated | Olivier OT Main location and two additional active fictional locations loaded. |
| Therapists & Team | Browser validated | Gerhard Olivier and Tenant A Therapist loaded as active records. |
| Branding | Browser validated for loading/preview | Saved colours, Main-location identity, real default-bank preview, invoice/email/report previews and bottom AlliDesk support mark rendered. Logo upload was not retested. |
| Bank Accounts | Browser validated for loading | Active FNB account loaded and displayed as Default. No bank details were changed. |
| Billing Configuration | Browser validated for loading | Saved prefixes, sequences, seven-day terms, selected FNB account and override settings loaded. |
| Services & Pricing | Browser validated for loading | Default active Olivier Occupational Therapy price list loaded. Procedure editing was not retested. |
| Finance invoice | Browser validated for loading | Fictional paid invoice `PILOT-INV-0001` loaded with session traceability, one line, authoritative totals, status history, workflow history and patient history. |
| Invoice PDF generation before `202607180006` | Failed because of confirmed defect | Generation reached secure upload and failed with `permission denied for function is_allowed_document_content_type`. |
| Invoice PDF generation after `202607180006` | Failed because of a second confirmed policy defect | Generation completed client-side and created an upload intent, but object insertion failed with `new row violates row-level security policy`. |

### Secure Storage Defect

- Storage insert policy calls `public.is_allowed_document_content_type(...)` and `public.get_document_file_max_size(...)` as the authenticated caller.
- The storage foundation migration revoked `EXECUTE` on both helpers from `authenticated` and did not restore it.
- This blocks generated invoice, receipt and statement PDF uploads even when `create_document_upload_intent(...)` succeeds.
- Applied migration `202607180006_storage_policy_helper_execute_fix.sql` grants authenticated users execute permission only on these two immutable fixed-allowlist helpers. It does not grant table access, bucket access, broader document permissions or anonymous access.
- The original helper error is resolved. A second defect remains: the `storage.objects` INSERT policy directly queries `public.document_files`, but the authenticated SELECT policy hides rows in `pending_upload` state. A rollback-only diagnostic proved `can_manage_document_file(...) = true` while the same pending row count visible through document SELECT RLS was `0`.
- The prepared repair is `202607180007_storage_pending_upload_policy_repair.sql`. It introduces a narrowly scoped `SECURITY DEFINER` object-upload authorization helper, with `search_path = public`, which validates the matching pending metadata row and delegates to `can_manage_document_file(...)`. The Storage INSERT policy calls that helper instead of directly selecting the RLS-hidden row. It has not been applied.
- Browser PDF viewing, download, duplicate-generation success and rendered short/multipage inspection remain blocked until that policy repair is separately approved.

### Database Lint

`npx supabase db lint --linked --level warning` completed against `allidesk-dev`. It reported pre-existing function-analysis findings, including ambiguous PL/pgSQL identifiers and clinical-attachment column mismatches. No lint finding was introduced by `202607180004`. The Storage helper execute defect was established through an actual authenticated browser failure and policy/grant inspection rather than lint.

## Approved Migration Deployment - 2026-10-20

- `npx supabase projects list` independently confirmed `allidesk-dev` (`wdhfhdpcrcuyxqjehiyy`) as healthy and linked.
- Local `supabase/.temp/project-ref` matched `wdhfhdpcrcuyxqjehiyy`.
- Final `npx supabase db push --linked --dry-run` listed only:
  1. `202607180005_invoice_historical_snapshot_hardening.sql`
  2. `202607180006_storage_policy_helper_execute_fix.sql`
- `npx supabase db push --linked` applied exactly those two migrations, in that order.
- `npx supabase migration list --linked` confirmed local and remote history match through `202607180006`.
- No production project or resource was changed.

## Invoice Immutability Results

Rollback-only authenticated checks used the fictional Tenant A admin and paid invoice `PILOT-INV-0001`.

| Check | Result | Evidence |
| --- | --- | --- |
| Confirmed invoice header mutation | Passed | Direct due-date change rejected by `prevent_final_invoice_header_mutation`. |
| Confirmed invoice line mutation | Passed | Direct description change rejected by `prevent_final_invoice_child_mutation`. |
| Missing party snapshot insertion after finalisation | Passed | Insert rejected by the child immutability trigger. |
| Missing issuer snapshot insertion after finalisation | Passed | Insert rejected by the child immutability trigger. |
| Historical rows left unchanged | Passed | The legacy invoice still has zero party and issuer snapshot rows; the migration did not fabricate or backfill history. |
| Future Main-location capture | Structurally verified | Deployed trigger and `SECURITY DEFINER` function exist with `search_path = public`; no new invoice fixture was created in this run. |
| Draft invoice editing | Not runtime-tested | The development tenant currently has no editable draft invoice fixture. Trigger scope explicitly excludes `draft`, `review_required` and `ready_to_confirm`. |
| Payment reversal compatibility | Failed because of pre-existing RPC defect | `reverse_payment(...)` fails on ambiguous `payment_id` before recalculation. The test transaction did not persist changes. |

The five approved finance RPCs remain `SECURITY DEFINER`, have `search_path = public`, and retain authenticated EXECUTE grants. The deployed hardening trigger excludes payment balances, payment status, collection status, lifecycle timestamps and reconciliation fields from its immutable header comparison.

## RLS, Tenant Isolation And Storage Results

- Existing authenticated RLS harness:
  - cross-tenant reads and updates: passed;
  - direct invoice/session lifecycle bypass: passed;
  - finance role cannot read clinical notes: passed;
  - therapist and reception cannot read finance records: passed;
  - three rows reported failed only because the harness still expects exactly one Tenant A patient/booking; current fictional data contains three patients and eleven bookings. Tenant B visibility remained zero in every Tenant A context.
- Existing Storage security harness: 13 of 13 checks passed.
  - anonymous metadata access denied;
  - valid and invalid Patient Link document boundaries passed;
  - admin, therapist, reception and finance document visibility passed;
  - cross-tenant document isolation passed;
  - executable MIME, oversize and mismatched-path rejection passed.
- The browser upload failure is narrower than those read/role checks: Storage object INSERT cannot resolve its pending intent through the current metadata SELECT policy.

## Finance And Database Defects Found

1. **Generated-document upload remains blocked.** Confirmed in an authenticated Chrome session after `202607180006`; exact error: `new row violates row-level security policy`.
2. **Payment reversal is broken.** Rollback-only invocation of `reverse_payment(...)` failed because its `payment_id` output parameter conflicts with unqualified `payment_allocations.payment_id` in the allocation query.
3. **Draft invoice creation is broken.** A rollback-only runtime invocation reproduced `column reference "invoice_status" is ambiguous` in the existing-invoice lookup. The transaction aborted, so no session or invoice change persisted.
4. The authenticated RLS harness has stale exact-count expectations for Tenant A. Its security assertions remain interpretable, but the fixture-count assertions should be made cardinality-tolerant.

## PDF Validation Status

| Requirement | Result |
| --- | --- |
| Client-side invoice PDF generation invoked | Passed |
| Upload intent creation | Passed |
| Object upload to `generated-documents` | Failed: pending metadata row hidden from Storage INSERT policy |
| Correct invoice/tenant metadata | Upload intent verified; final object unavailable |
| Signed URL viewing | Blocked by upload failure |
| Download | Blocked by upload failure |
| Unauthorised and cross-tenant read boundaries | Passed in Storage security harness |
| Duplicate successful generation | Blocked by upload failure |
| Short invoice visual inspection | Blocked by upload failure |
| Multipage invoice visual inspection | Not tested; no suitable fixture was available and upload is blocked |

## Validation Commands

- `npm run build`: passed.
- `git diff --check`: passed.
- Existing Vite large-chunk warning remains; no new build error was introduced.
- `npx supabase db lint --linked --level warning`: completed and reproduced pre-existing function findings, including the confirmed `reverse_payment` ambiguity and the lint-confirmed draft-invoice ambiguity. Neither approved migration introduced a new lint finding.

## Milestone 2 Readiness

The deployed invoice immutability migration is operating safely, and the narrow helper grant did not weaken tenant or role boundaries. The current version is **not yet safe for Vercel Preview acceptance** because the primary generated-document upload path remains blocked. Payment reversal is also a confirmed finance defect. Both require separately approved forward-only repair work before Milestone 2 can close.

## Prepared Blocker Repairs - Awaiting Product Owner Approval

Target verification:

- Supabase CLI independently confirmed `allidesk-dev` (`wdhfhdpcrcuyxqjehiyy`) is healthy and linked.
- Local `supabase/.temp/project-ref` is `wdhfhdpcrcuyxqjehiyy`.
- Local and remote migration history match through `202607180006`.
- `supabase db push --linked --dry-run` lists only the three migrations below. The dry run did not apply them.

### `202607180007_storage_pending_upload_policy_repair.sql`

**Root cause:** The `storage.objects` INSERT policy directly queries `document_files`, while authenticated document SELECT RLS intentionally hides `pending_upload` rows. The uploader therefore cannot prove its own valid upload intent to Storage.

**Repair:** Add `can_upload_document_object(...)`, a `SECURITY DEFINER`, `STABLE` helper with `search_path = public`. It matches the exact bucket/path pending intent, delegates tenant and role authorization to `can_manage_document_file(...)`, and retains the existing MIME and size restrictions. Replace only the Storage INSERT policy's RLS-hidden subquery with this helper.

**Security impact:** EXECUTE is granted only to `authenticated`; `public` and `anon` are revoked. The helper returns only a boolean. It does not expose pending metadata, grant object reads, broaden completed-document access, or create a Patient Link path. Existing Storage read/update policies are unchanged.

### `202607180008_reverse_payment_ambiguity_repair.sql`

**Root cause:** `reverse_payment(...)` returns an output column named `payment_id`. The function's allocation query used unqualified `payment_id`, which conflicts with that PL/pgSQL output variable at runtime. The array initializer also generated a database lint warning.

**Repair:** Replace the existing function with the same signature and lifecycle behavior, qualify payment, allocation, credit and receipt table references, and type the empty affected-invoice array as `uuid[]`. Preserve role checks, row locking, allocation and credit reversal, receipt reversal, invoice recalculation, patient history, workflow events and idempotent repeated reversal behavior.

**Security impact:** No RLS policy changes. The function remains `SECURITY DEFINER`, uses `search_path = public`, checks `admin`/`finance` membership for the payment tenant, revokes `public`/`anon`, and grants EXECUTE only to `authenticated`.

### `202607180009_draft_invoice_ambiguity_repair.sql`

**Root cause:** `create_draft_invoice_from_session(...)` returns an output column named `invoice_status`. Its active-invoice query used unqualified `invoice_status`, causing the confirmed runtime ambiguity.

**Repair:** Replace the existing function with the repository definition and qualify only the active-invoice query through alias `i`. The function signature, authorization, session locking, procedure snapshots, billing eligibility, invoice lines, party/issuer snapshots, histories and workflow events remain unchanged.

**Security impact:** No RLS policy changes. The function remains `SECURITY DEFINER`, uses `search_path = public`, enforces the existing `admin`/`finance` tenant-role check, revokes `public`/`anon`, and grants EXECUTE only to `authenticated`.

### Historical Data Impact

The three migrations contain function/policy definitions only. They do not update, delete, backfill or recreate invoice, payment, allocation, receipt, document, session or patient rows. Historical issued invoices and payments are not modified by applying the migrations. Runtime changes occur only when an authorised caller later invokes the repaired operations.

## Prepared Post-Deployment Validation

`supabase/smoke-tests/practice_2_milestone_02_blocker_repairs.sql` is a rollback-only authenticated harness prepared for execution after approval and deployment. It covers:

- an authorised uploader resolving its exact pending generated-document intent;
- pending metadata remaining hidden through ordinary document SELECT RLS;
- same-tenant therapist and cross-tenant admin denial for the finance upload intent;
- no anonymous EXECUTE grant on the upload helper;
- payment reversal, active-allocation reversal, invoice balance reconciliation and repeated-call idempotency;
- draft invoice runtime execution and duplicate active-invoice prevention;
- confirmed invoice-line immutability.

After deployment, the existing Storage and authenticated RLS harnesses must be rerun. Authenticated browser validation must then cover the real Storage API path: invoice PDF generation, object upload, metadata finalisation, signed URL viewing, download, safe duplicate generation, short PDF inspection and multipage PDF inspection. Patient Link pending-document denial and cross-tenant object denial remain mandatory. These HTTP/browser checks have not been claimed as passed.

## Approved Repair Deployment And Validation

### Migrations Applied

On 2026-10-20 the Product Owner approved, and the Supabase CLI applied, exactly:

1. `202607180007_storage_pending_upload_policy_repair.sql`
2. `202607180008_reverse_payment_ambiguity_repair.sql`
3. `202607180009_draft_invoice_ambiguity_repair.sql`

The CLI independently identified the linked target as healthy `allidesk-dev` (`wdhfhdpcrcuyxqjehiyy`) before deployment. The final dry run listed only these three migrations. No reset or seed operation ran. Post-deployment migration history confirms local and remote versions match through `202607180009`.

### Security And Storage Results

- Deployed function inspection passed: all three repaired functions use `SECURITY DEFINER`, `search_path = public`, deny anonymous execution, and permit only the required authenticated execution.
- The deployed `storage.objects` INSERT policy applies only to `authenticated` and calls `can_upload_document_object(...)`.
- The strengthened rollback-only harness successfully inserted a matching `storage.objects` row as the Tenant A authenticated admin, finalised the corresponding metadata from `pending_upload` to `uploaded`, verified the invoice/tenant/path relationship, and rolled the transaction back.
- A same-tenant therapist and a Tenant B admin could not authorise the Tenant A invoice-PDF upload intent.
- Pending metadata remained hidden through normal document SELECT RLS.
- Existing Storage security suite: 13 of 13 checks passed, including anonymous denial, Patient Link publication boundaries, tenant isolation, role visibility, executable rejection, oversize rejection and path-integrity rejection.
- Existing authenticated RLS checks continued to block cross-tenant reads/updates and direct invoice/session lifecycle changes. Four legacy result rows still report `failed` because they expect exactly one Tenant A patient/booking; current fictional data has three patients and eleven bookings. The associated Tenant B visibility remained zero, so these are stale fixture-cardinality assertions rather than isolation failures.

### Finance Results

- `reverse_payment(...)`: passed in a rollback-only authenticated transaction.
- Active allocations were reversed, invoice balances recalculated, receipts/credits followed the existing reversal path, and a repeated reversal returned the existing reversed state without duplicating the operation.
- Existing active-invoice lookup and duplicate prevention in `create_draft_invoice_from_session(...)`: passed after the ambiguity repair. The RPC returned the existing active invoice instead of creating a duplicate.
- Confirmed invoice-line immutability: passed.
- Database lint no longer reports the repaired `reverse_payment` or `create_draft_invoice_from_session` ambiguities. Unrelated pre-existing lint findings remain outside this milestone repair scope.

### New Blocking Defect Found: Fresh Draft Creation

Testing actual fresh draft creation from a newly created and completed fictional session exposed a separate pre-existing lifecycle-guard conflict:

1. `create_session_from_booking(...)` succeeded inside the rollback-only transaction.
2. `complete_session(...)` succeeded.
3. `create_draft_invoice_from_session(...)` passed the repaired invoice-status lookup and inserted its draft header.
4. Inserting the delivered-procedure line invoked `recalculate_invoice_totals(...)`.
5. That internal total update changed `balance_due`, but `prevent_direct_invoice_lifecycle_update()` does not recognise `recalculate_invoice_totals(...)` as an approved internal call stack and raised `Invoice lifecycle changes must use approved RPCs`.
6. The entire test transaction rolled back; no booking, session or invoice history was changed.

The smallest repair is a new forward-only migration updating only the lifecycle guard's approved call-stack list to permit `recalculate_invoice_totals(...)`. Direct authenticated execution of that helper is already revoked, so the repair can preserve direct-update protection while allowing line-triggered totals for authorised draft operations. This fourth migration was not created or applied because it was outside the three-migration approval.

### Authenticated Browser Regression

- Chrome opened the current local app at `http://127.0.0.1:5175/finance` and displayed the real AlliDesk login screen.
- No authenticated session was available for that local origin. No password, token or credential was requested, entered, inspected or recovered.
- Therefore invoice PDF generation through the UI, signed URL viewing, download, regeneration, and visual inspection of short and multipage PDFs remain **not tested in this run**.
- The database Storage policy and metadata finalisation path are proven by authenticated rollback-only SQL, but this is not represented as browser proof of the complete Storage HTTP workflow.

### Historical Invoice Preservation

The three applied migrations contained function and policy definitions only and performed no historical row updates. Existing issued invoice and payment records were not rewritten. Confirmed invoice-line immutability continued to reject direct mutation.

## Current Milestone 2 Decision

- **Milestone 2 cannot close yet.** Fresh draft invoice creation is blocked by the lifecycle guard conflict.
- **The application is not yet ready for Vercel Preview acceptance.** A narrow lifecycle-guard repair and authenticated browser PDF validation are still required.
- Signed URL viewing, download, duplicate PDF generation and short/multipage visual inspection remain unverified until an authenticated browser session is available.

## Final Draft-Invoice Repair Prepared - Awaiting Product Owner Approval

### Confirmed Root Cause

`create_draft_invoice_from_session(...)` inserts delivered-procedure lines. The `invoice_lines_recalculate_invoice_totals` trigger then calls the internal `recalculate_invoice_totals(...)` helper. That helper correctly derives the invoice totals and `balance_due`, but `prevent_direct_invoice_lifecycle_update()` treats every authenticated `balance_due` change as a protected lifecycle mutation unless the call stack contains confirmation, issuing, or payment-balance recalculation. Draft total recalculation was therefore rejected even though direct authenticated EXECUTE on the helper had already been revoked.

The earlier suggestion to add `recalculate_invoice_totals(...)` to the guard's approved function-name list has been superseded. A function-name-only exception would be broader and more dependent on call-stack text than necessary.

### Proposed Migration

`202607180010_invoice_total_recalculation_guard_repair.sql`

This forward-only migration:

- creates `invoice_internal_recalculation_context`, an internal transaction/backend/invoice-scoped authorization-marker table;
- enables RLS on that table, adds no client policies, and revokes all table privileges from `public`, `anon`, and `authenticated`;
- keeps `recalculate_invoice_totals(uuid)` as a revoked internal `SECURITY DEFINER` helper with an explicit `pg_catalog, public` search path;
- limits recalculation to `draft`, `review_required`, and `ready_to_confirm` invoices;
- locks the target invoice, derives totals from its non-deleted lines, creates an exact short-lived marker, updates totals, and removes the marker before returning;
- permits the guarded `balance_due` update only when the marker matches the current transaction, backend, tenant, and invoice; all other protected lifecycle fields must remain unchanged and the balance must equal `max(total - amount_paid, 0)`;
- preserves the existing approved confirmation, issuing, and payment-balance operations;
- performs no historical invoice, line, snapshot, payment, allocation, or receipt updates.

Authenticated clients cannot create or inspect the marker and cannot execute the totals helper directly. Confirmed and issued invoices remain outside the helper's editable-state boundary, while the existing final-header, line, and snapshot immutability triggers remain unchanged.

### Regression Harness Updates

`practice_2_milestone_02_blocker_repairs.sql` is now deterministic and rollback-only. It creates its own fictional booking/session/invoice/payment lifecycle from the stable pilot seed instead of depending on current record counts or an existing reversible payment. It verifies:

1. Fresh draft invoice creation succeeds.
2. Delivered-procedure lines are created and remain traceable to the session.
3. Subtotal, discounts, adjustments, tax, total, and `balance_due` match authoritative line calculations.
4. Repeated draft creation returns the same active invoice and does not create a duplicate.
5. Direct authenticated `balance_due` mutation remains blocked.
6. The authenticated role cannot execute the internal totals helper or access its authorization table.
7. Confirmation and issuing continue through the approved RPCs.
8. Payment recording/allocation reaches a zero balance; reversal restores the balance; repeated reversal remains idempotent.
9. Tenant A cannot update Tenant B invoice rows.
10. Final invoice lines, party snapshots, and issuer snapshots remain immutable.
11. Internal authorization markers are removed after recalculation.

`operational_readiness_authenticated_rls.sql` no longer expects an exact count of one own-tenant patient, booking, or session. Own-tenant assertions now require at least one visible record, while all cross-tenant and restricted-domain expectations remain exactly zero.

### Pre-Deployment Validation Results

- CLI target verification: passed. The linked healthy project is `allidesk-dev` (`wdhfhdpcrcuyxqjehiyy`).
- Remote migration comparison: local and remote match through `202607180009`; `202607180010` is local-only.
- `npx supabase db push --linked --dry-run`: passed and listed only `202607180010_invoice_total_recalculation_guard_repair.sql`; nothing was applied.
- Full clean local migration chain: passed through `202607180010` in an isolated database-only Supabase stack.
- Deterministic rollback-only blocker-repair harness: passed.
- Existing schema smoke test: passed locally; required tables, tenant columns, functions, and RLS policies were present.
- Updated authenticated RLS harness: 11 of 11 checks passed locally, including role boundaries, lifecycle bypass denial, and tenant isolation.
- Local database lint: the new migration introduced no lint finding. Existing unrelated Patient Link, Clinical Template, Assessment, and Clinical Attachment lint findings remain outside this repair scope.

### Remaining Uncertainty And Approval Boundary

At preparation time, the repair had not yet been applied to `allidesk-dev`; validation was limited to a clean isolated local database. The approved deployment and post-deployment evidence are recorded below. Authenticated browser PDF upload, signed URL viewing/download, duplicate generation, and short/multipage visual inspection remained pending from the earlier Milestone 2 scope.

## Final Repair Deployment And Post-Deployment Validation

### Migration Deployment

On 2026-10-20 the Product Owner approved `202607180010_invoice_total_recalculation_guard_repair.sql` for development only.

- Supabase CLI authentication succeeded.
- `npx supabase projects list` identified the linked healthy project as `allidesk-dev` with reference `wdhfhdpcrcuyxqjehiyy`.
- Pre-deployment migration history matched through `202607180009`.
- The final dry run listed only `202607180010_invoice_total_recalculation_guard_repair.sql`.
- `npx supabase db push --linked` applied exactly that migration.
- Post-deployment migration history matches locally and remotely through `202607180010`.
- No database reset or seed operation ran against development.
- The migration contains no historical invoice or payment DML.

### Complete Invoice Lifecycle Regression

The deterministic rollback-only `practice_2_milestone_02_blocker_repairs.sql` harness passed against `allidesk-dev`. It exercised the complete approved lifecycle rather than calling the repaired helper in isolation:

| Check | Result |
| --- | --- |
| Fresh session and draft invoice creation | Passed |
| Delivered procedure line creation and traceability | Passed |
| Subtotal, adjustment, tax, total and outstanding balance | Passed |
| Duplicate active invoice prevention | Passed |
| Direct authenticated lifecycle update rejection | Passed |
| Authenticated direct helper execution denial | Passed |
| Authenticated authorization-marker table denial | Passed |
| Invoice confirmation through approved RPC | Passed |
| Invoice issuing through approved RPC | Passed |
| Payment recording and full allocation | Passed |
| Payment reversal and balance reconciliation | Passed |
| Repeated reversal idempotency | Passed |
| Confirmed invoice line and snapshot immutability | Passed |
| Cross-tenant invoice update denial | Passed |
| Transaction marker cleanup | Passed; zero active marker rows after execution |

All lifecycle fixtures created by this harness were rolled back. No test invoice, payment, allocation, receipt, or history row was retained.

### Security And Storage Regression

- Updated authenticated RLS harness: 11 of 11 checks passed on development.
- Tenant A saw no Tenant B patient rows and could not update Tenant B data.
- Therapist and reception roles remained unable to read finance records.
- Finance remained unable to read clinical notes.
- Direct session and invoice lifecycle bypass attempts remained blocked.
- Existing Storage security harness: 13 of 13 checks passed.
- Anonymous document-table access remained denied.
- Patient Link saw only explicitly shared documents through a valid external session.
- Admin, therapist, reception and finance document visibility matched the approved role boundaries.
- Cross-tenant document visibility remained denied.
- Invalid paths, executable types and oversized uploads remained rejected.

The pilot invoice remains `paid` with one line, total `780`, and balance `0`. Authenticated users still have no direct EXECUTE permission on `recalculate_invoice_totals(uuid)` and no SELECT permission on `invoice_internal_recalculation_context`.

### PDF And Browser Validation

Chrome was opened to the running local application at `http://127.0.0.1:5175/finance`. The actual AlliDesk login screen rendered, but that local origin had no authenticated session. No password, token, session, or credential was requested, entered, inspected, or stored.

Consequently, these browser requirements remain unverified in this run:

- invoice PDF generation through the real Finance UI;
- object upload to `generated-documents` through the Storage API;
- signed URL opening and download;
- duplicate generation behavior;
- visual inspection of a single-page PDF;
- visual inspection of a multipage PDF;
- browser-level unauthorized access denial.

Read-only database inspection found three invoice-PDF metadata records for the pilot invoice, one marked `uploaded`, but no matching `storage.objects` row. These are development seed/metadata records and are not accepted as proof of a real uploaded file, signed URL, or download. The authenticated rollback-only SQL proves the object INSERT policy and metadata-finalisation transition, but it does not replace browser/Storage API proof.

### Smallest Owner-Assisted Browser Procedure

1. Open `http://127.0.0.1:5175/finance` in Chrome.
2. Sign in directly with the existing authorised development account; do not share the password or session.
3. Open the fictional issued pilot invoice and generate its PDF.
4. Confirm the success notice, reopen the stored PDF, and download it.
5. Generate the same invoice again and confirm the application handles the duplicate safely.
6. Inspect the downloaded single-page PDF for invoice number, patient/responsible party, immutable line values, totals, default bank details, branding and footer.
7. Use or create a fictional development invoice with enough procedure lines for more than one page, then inspect every page and the fixed footer.
8. Sign out or use a restricted fictional role to confirm the generated finance document is unavailable where finance access is not granted.

### Milestone Decision

- **Backend repair status:** complete and passed in development.
- **Remaining confirmed backend defects in this scope:** none.
- **Milestone 2 status:** **BACKEND HARDENING COMPLETE — BROWSER PDF ACCEPTANCE DEFERRED.**
- **Approved database state:** migrations through `202607180010` are applied to `allidesk-dev`; the complete finance lifecycle regression and Storage/RLS security suites passed.
- **Remaining acceptance work:** authenticated browser PDF generation, Storage upload, signed URL viewing, download, duplicate-generation behavior, and single-page/multipage visual inspection remain unverified and must not be represented as validated.
- **Product Owner review:** the Finance UX has not yet received Product Owner acceptance.
- **Private Preview policy:** these outstanding Finance/PDF acceptance items do not block a restricted Vercel Preview used only by authorised Product Owner reviewers with fictional development data. They continue to block customer-production acceptance until completed.

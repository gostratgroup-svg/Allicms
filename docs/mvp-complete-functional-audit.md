# AlliDesk Complete MVP Functional and User-Facing Audit

Audit date: 2026-10-18
Repository: `/Users/gerhardolivier/Go Difference Coding /Allidesk`
Branch: `main`
Approved environment: `allidesk-dev` (`wdhfhdpcrcuyxqjehiyy`)
Audit mode: functional audit followed by targeted MVP blocker repair, fictional development data only

## A. Executive Summary

### Release recommendation

**CODE REPAIRS COMPLETE; AUTHENTICATED BROWSER ACCEPTANCE STILL REQUIRED**

AlliDesk has a substantial live Supabase implementation and a strong validated security foundation. The database migration chain is current, the production build passes, tenant isolation and role RLS were previously proven with authenticated users, and the core database patient-to-paid-invoice path has passed.

The original audit found three user-facing integration defects. The targeted repair completed on 2026-10-18 removed those invalid paths without changing database security:

1. The global **New Booking** button now opens the existing live Supabase Bookings create form.
2. Unsupported Session **Start, Pause, Resume, Cancel, and No Show** controls and their prohibited direct updates were removed. Approved **Complete** and **Reopen** RPC paths remain.
3. The prototype role selector was removed. Shell and Super Admin rendering now use resolved authenticated identity only.
4. The obsolete Finance **Mark ready** direct lifecycle write was removed; the approved review-and-confirm path remains.

No P0 cross-tenant or confirmed sensitive-data exposure was found. The primary blocker is application integration, followed by authenticated browser acceptance testing with working fictional credentials.

### Confirmed working capabilities

- Production URL responds and renders the AlliDesk login screen.
- Invalid login attempts return a friendly error.
- Invalid Patient Link identifiers return a safe generic unavailable state without exposing patient data.
- Supabase CLI is authenticated and linked to `allidesk-dev`.
- Local and remote migration histories match through `202607180003`.
- `npm run build` passes.
- Prior authenticated RLS evidence confirms tenant isolation and current role read matrices.
- Prior database smoke evidence confirms patient, booking, session completion, invoice confirmation/issue, manual payment, allocation, history, audit, and workflow-event records.
- Invoice, receipt, and statement PDF generation is connected to the private `generated-documents` bucket and uses signed URLs for viewing.

### Confirmed defects

- Global New Booking creates local-only prototype data.
- Several Session lifecycle buttons conflict with deployed lifecycle guards.
- Role preview can visually switch a tenant user into Super Admin mode.
- Finance users are not represented in the role selector and default visually to Admin.
- Forgot Password has no handler.
- Overview and personal Settings are static placeholders.
- Super Admin tenant, subscription, support, and configuration records are local in-memory fixtures, not platform data.
- Finance Mark Ready attempts a direct protected invoice status update and will be rejected by the database guard.
- Clinical attachments can be uploaded but have no staff view/download action.
- Patient document upload/view is not present in the Patients screen.
- Financial PDFs do not render the configured practice logo or brand colours.

### Unverified capabilities

- Successful browser login for every tenant role and Super Admin.
- Authenticated route visibility and direct-route denial in a real browser session.
- All live create/edit forms through the browser.
- Full patient-to-PDF browser journey.
- PDF rendering, opening, and download output.
- Valid Patient Link verification and authenticated portal views.
- Desktop layout across authenticated screens and practical mobile layout.
- Refresh/session expiry behavior.

All six dedicated fictional Auth users exist, are email-confirmed, are not banned/deleted, have profiles, and have one active tenant membership. The rejected login is therefore a credential issue and remains a **testing blocker**, not a missing-user defect. No password or token is recorded in this report. The live development data currently has no profile with `is_super_admin = true`; genuine Super Admin testing requires the Product Owner to designate and promote the intended profile.

## A1. MVP Blocker Repair Record

### AD-MVP-001 — Global New Booking

- **Original problem:** The top-bar action opened `NewSessionModal` and wrote prototype patient, booking, and invoice records to React/localStorage state.
- **Root cause:** The global shell predated the live `BookingsPage` and retained its own booking implementation.
- **Files changed:** `src/App.tsx`, `src/pages/Bookings.tsx`.
- **Fix implemented:** The top-bar action now navigates to `/bookings?new=1`. `BookingsPage` consumes the one-time query flag and opens its existing live create form. The top-bar action is visible only with `tenant.bookings.manage`. The shell no longer mounts the prototype booking modal.
- **Validation performed:** TypeScript/Vite build passed; source review confirms booking save remains the existing Supabase insert path. Authenticated browser creation, refresh persistence, and list visibility remain to be executed.
- **Remaining limitation:** Not marked fully functional until a booking is created and reloaded in an authenticated browser session.

### AD-MVP-002 — Session lifecycle

- **Original problem:** Start, Pause, Resume, Cancel, and No Show performed direct protected updates to `sessions` and were rejected by the deployed lifecycle guard.
- **Root cause:** The UI exposed lifecycle transitions for which no approved backend RPC exists.
- **Files changed:** `src/pages/Sessions.tsx`.
- **Fix implemented:** Unsupported controls and their direct mutation functions were removed. Existing approved `create_session_from_booking`, `complete_session`, and `reopen_completed_session` RPC paths were preserved.
- **Validation performed:** Migration/RPC inspection and build validation confirm no remaining UI reference to the prohibited handlers. Prior authenticated security validation proves direct lifecycle bypass is rejected.
- **Remaining limitation:** Start/Pause/Resume/Cancel/No Show are intentionally unavailable for MVP until approved backend operations exist. Complete/Reopen still require browser acceptance testing.

### AD-MVP-003 — Prototype role switching

- **Original problem:** A local selector could render a mock Super Admin workspace and showed an incorrect visual role for Finance users.
- **Root cause:** App rendering used local `role` state instead of the resolved identity context.
- **Files changed:** `src/App.tsx`.
- **Fix implemented:** The selector and local shell-role state were removed. Navigation, page title, Super Admin workspace, tenant workspace, and role label now derive from `activeRole`; permissions continue through `useAuthorization()`.
- **Validation performed:** Build passed and static source review found no shell role selector. Backend memberships were read-only verified for the dedicated fictional users.
- **Remaining limitation:** Authenticated browser navigation by role remains untested. No current profile is flagged as Super Admin in `allidesk-dev`.

### AD-MVP-004 — Finance Mark Ready

- **Original problem:** Mark Ready directly updated protected invoice lifecycle fields and conflicted with the invoice guard.
- **Root cause:** The UI retained a redundant intermediate transition not represented by an approved RPC.
- **Files changed:** `src/pages/Finance.tsx`.
- **Fix implemented:** The misleading action and prohibited direct mutation were removed. Draft invoices continue through the existing approved Review and Confirm flow.
- **Validation performed:** Build passed; source review confirms the removed handler is no longer referenced and existing confirmation RPC code remains unchanged.
- **Remaining limitation:** Invoice confirmation and payment regression require authenticated browser testing.

### AD-TEST-001 — Authentication test access

- **Original problem:** The supplied fictional credential was rejected, blocking authenticated browser acceptance.
- **Root cause:** Auth metadata is healthy, so the remaining cause is a password mismatch or unavailable current password.
- **Files changed:** Documentation only; no Auth data or credentials changed.
- **Validation performed:** Read-only query verified six dedicated users are confirmed, active, linked to profiles, and linked to one active membership each. Role mapping is Admin A, Admin B, Therapist A, Reception A, Finance A, plus `gostratgroup@gmail.com` as tenant Admin.
- **Remaining limitation:** Product Owner must privately reset or use a known development password. The intended Super Admin profile must be explicitly selected before its `is_super_admin` flag is changed.

## B. Complete Route Inventory

### Routed screens

| Route | Screen | Intended access | Component | Navigation | Live data | Audit status | MVP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` and unmatched unauthenticated routes | Login | Public | `Login` through `AppModeGuard` | Direct | Supabase Auth | PARTIALLY WORKING | Yes |
| `/overview` | Overview | All tenant roles | `OverviewPage` | Sidebar/default | No | FAIL: static placeholder | Yes |
| `/bookings` | Bookings | Admin, receptionist, therapist | `BookingsPage` | Sidebar | Yes | NOT TESTED in authenticated browser | Yes |
| `/bookings/sessions` | Sessions | Booking/clinical/finance viewers | `SessionsPage` | From Bookings/direct | Yes | FAIL: lifecycle integration mismatch | Yes |
| `/patients` | Patients | Tenant patient viewers | `PatientsPage` | Sidebar | Yes | NOT TESTED in authenticated browser | Yes |
| `/patients/clinical` | Clinical Workspace | Admin, therapist | `ClinicalPage` | From patient/direct | Yes | NOT TESTED in authenticated browser | Yes |
| `/finance` | Finance | Admin, finance, receptionist read-only | `FinancePage` | Sidebar | Yes | PARTIALLY WORKING from code/database evidence | Yes |
| `/finance/price-lists` | Price Lists | Finance/admin | `FinancePriceListsPage` | Finance hub/direct | Yes | NOT TESTED in authenticated browser | Yes |
| `/practice` | Practice hub | Admin | `PracticePage` | Sidebar | Mixed | PARTIALLY WORKING | Yes |
| `/practice/profile` | Practice Profile | Admin | `PracticeProfilePage` | Practice card | Yes | NOT TESTED in authenticated browser | Yes |
| `/practice/locations` | Practice Locations | Admin | `PracticeLocationsPage` | Practice card | Yes | NOT TESTED in authenticated browser | Yes |
| `/practice/therapists` | Therapist Profiles | Admin; team readers by direct route | `PracticeTherapistsPage` | Practice card | Yes | NOT TESTED in authenticated browser | Yes |
| `/practice/banking` | Banking Details | Admin/finance | `PracticeBankingPage` | Practice card | Yes | NOT TESTED in authenticated browser | Yes |
| `/practice/billing` | Billing Configuration | Admin/finance | `PracticeBillingPage` | Practice card | Yes | NOT TESTED in authenticated browser | Yes |
| `/practice/branding` | Practice Branding | Admin | `PracticeBrandingPage` | Practice card | Yes | NOT TESTED in authenticated browser | Yes |
| `/practice/clinical-templates` | Clinical Templates | Admin/clinical | `ClinicalTemplatesPage` | Practice card | Yes | NOT TESTED in authenticated browser | Yes |
| `/practice/communication-templates` | Communication Templates | Admin | `PracticeCommunicationTemplatesPage` | Practice card | Yes | NOT TESTED in authenticated browser | No, optional for manual pilot |
| `/practice/workflows` | Workflow Engine | Admin/configured viewers | `PracticeWorkflowsPage` | Practice card | Yes | PARTIALLY WORKING; runtime deferred | No |
| `/settings` | Personal Settings | All tenant roles | `SettingsPage` | Sidebar | No | FAIL: static placeholder | No |
| `/p/:publicIdentifier/verify` | Patient Link verification | Public | `PatientLinkPortal` | Public link | Public RPCs | PARTIALLY WORKING | No for first pilot |
| `/p/:publicIdentifier/overview` | Patient Link overview | Verified external session | `OverviewView` | Patient Link nav | Public projection RPC | NOT TESTED | No for first pilot |
| `/p/:publicIdentifier/appointments` | Patient Link appointments | Verified external session | `AppointmentsView` | Patient Link nav | Public projection RPC | NOT TESTED | No |
| `/p/:publicIdentifier/invoices` | Patient Link invoices | Verified external session | `InvoicesView` | Patient Link nav | Public projection RPC | NOT TESTED | No |
| `/p/:publicIdentifier/receipts` | Patient Link receipts | Verified external session | `ReceiptsView` | Patient Link nav | Public projection RPC | NOT TESTED | No |
| `/p/:publicIdentifier/privacy` | Patient Link privacy | Verified external session | `PrivacyView` | Patient Link nav | Public projection RPC | NOT TESTED | No |

### Legacy redirects

The router redirects `/dashboard`, `/appointments`, `/calendar`, `/clinical-notes`, `/documents`, `/billing`, `/reports`, and `/team` to the current consolidated routes. These are redirects rather than independent screens.

### Super Admin internal screens

Super Admin uses internal component state rather than URL routes.

| Internal screen | Live data | Functional status | Evidence |
| --- | --- | --- | --- |
| Dashboard | Mostly local fixture data | PARTIALLY WORKING | Support actions work in memory; metrics are not platform queries |
| Tenant Management | Local fixture state | FAIL for real administration | Tenant creation does not insert tenant/profile/membership/Auth records |
| Subscription Management | Local fixture state | FAIL for real administration | Pricing edits are not persisted to `subscription_plans` |
| Support Centre | Local fixture state | FAIL for real administration | Tickets disappear on refresh; no support-ticket table integration |
| System Health | Browser connection/session checks | PARTIALLY WORKING | Useful lightweight status, not full service monitoring |
| Platform Configuration | Static values | FAIL for real configuration | No database persistence |

## C. Functional Screen Matrix

Status definitions:

- PASS requires a successful user-facing browser path and persisted result.
- PARTIAL means only part of the screen was browser-confirmed or implementation/database evidence exists without full browser proof.
- FAIL means a reproducible implementation mismatch, dead primary action, or non-operational placeholder exists.
- NOT TESTED means the authenticated browser path was unavailable.

| Screen | Main actions | Data path | Status | Evidence/defect |
| --- | --- | --- | --- | --- |
| Login | Sign in, forgot password | Supabase Auth | PARTIAL | Rendering and invalid-credential feedback confirmed; password recovery is dead; successful login not completed |
| Patient Link verification | Request/verify code | Public RPCs | PARTIAL | Invalid identifier safe state confirmed; valid challenge depends on deferred communication delivery |
| Overview | Daily command centre | Static constants | FAIL | No booking, invoice, payment, intake, history, or task queries |
| Bookings | Create/edit/status/cancel/no-show | Live Supabase tables | NOT TESTED | Strong query/mutation implementation; global CTA bypasses it |
| Sessions | Create/start/pause/resume/complete/cancel/no-show | RPCs plus direct updates | FAIL | Start/pause/resume/cancel/no-show direct updates are rejected by deployed guard |
| Patients | CRUD and nested patient records | Live Supabase tables | NOT TESTED | No browser persistence proof; no patient document UI |
| Clinical | Encounters, notes, plans, goals, assessments, attachments | Live tables/RPCs/Storage | NOT TESTED | Upload path exists; attachment view/download absent |
| Finance | Drafts, confirm, issue, payments, PDFs | Live tables/RPCs/Storage | PARTIAL | Backend path previously passed; browser/PDF output untested; Mark Ready conflicts with guard |
| Price Lists | CRUD lists and items | Live Supabase tables | NOT TESTED | Code wired; no browser proof |
| Practice hub | Navigate to configuration | Route links/static cards | PARTIAL | Core links exist; Team, Security & Permissions, and Integrations cards have no actions |
| Practice Profile | Create/update | Live Supabase | NOT TESTED | Code wired; no browser proof |
| Locations | Create/update | Live Supabase | NOT TESTED | Code wired; no browser proof |
| Therapists | Profiles/registrations | Live Supabase | NOT TESTED | Code wired; no browser proof |
| Banking | Accounts/default | Live Supabase | NOT TESTED | Code wired; no browser proof |
| Billing Configuration | Defaults/sequence setup | Live Supabase | NOT TESTED | Code wired; no browser proof |
| Branding | Save/upload logo | Live Supabase/Storage | NOT TESTED | Upload wired; private object path rendering remains unverified |
| Clinical Templates | Draft/version/publish | Live tables/RPCs | NOT TESTED | Code wired; no browser proof |
| Communication Templates | CRUD | Live Supabase | NOT TESTED | Code wired; delivery is intentionally absent |
| Workflows | Definition/version/admin controls | Live tables/RPCs | PARTIAL | Admin foundation present; worker runtime intentionally absent |
| Settings | Personal preferences/security | Static cards | FAIL | All cards explicitly show Not connected |

Screen count, using the 31 distinct screens in this report:

- Fully confirmed working end-to-end: **0**
- Partially working/evidenced: **7**
- Confirmed broken/non-operational: **7**
- Not tested in an authenticated browser: **17**

Two public states were directly confirmed: the login error state and invalid Patient Link state. Neither constitutes a complete end-to-end screen workflow.

## D. Public-Facing Audit

### Confirmed

- `https://allidesk.co.za/` loads the branded login UI.
- Invalid credentials produce a friendly generic error.
- `/p/invalid-audit-link` transitions from loading to a generic `Patient Link unavailable` state.
- The invalid Patient Link state exposes no patient, practice, clinical, financial, document, or configuration data.
- Unauthenticated operational routes are rendered through `AppModeGuard` and show Login.

### Defects and limitations

- **Forgot Password** has no `onClick`, route, or reset flow (`src/pages/Login.tsx:89`).
- Valid Patient Link verification was not executed.
- The verification UI offers email, SMS, and WhatsApp even though communication delivery is deferred. The page itself warns that delivery depends on a communication service.
- Patient Link is Post-MVP for the first pilot by Product Owner decision.
- No separate marketing/public landing page exists in this repository; that is not an MVP defect for the SaaS application.
- Mobile public presentation was not executed at an explicit device viewport during this audit.

## E. Role-Based Audit

### Previously validated backend security

The authenticated SQL harness documented in `docs/operational-readiness-step1b-authenticated-rls.md` passed for:

- Tenant A admin
- Tenant A therapist
- Tenant A receptionist
- Tenant A finance
- Tenant B admin
- Tenant A/Tenant B read and update isolation
- Direct session and invoice lifecycle bypass prevention
- Anonymous patient and clinical table denial
- Scoped Patient Link public/session access

### Current browser validation

Successful role login was not completed. The available fictional credential failed with the expected invalid-credentials response. Therefore the following remain NOT TESTED in a browser:

- correct tenant shell after login
- navigation visibility per role
- direct route denial
- backend rejection surfaced through the UI
- logout after authenticated use
- protected-route refresh
- expired-session behavior

### Role UI defects

- `App.tsx:1918` renders a role selector independently of `activeRole`.
- Any tenant user can select `Super Admin` and render the local mock platform workspace (`App.tsx:1991`).
- Finance is absent from the UI `Role` type and selector (`App.tsx:12`, `App.tsx:265`). A Finance user remains visually labelled Admin after identity resolution.
- The selector does not change backend permissions, so this is not proven privilege escalation. It is still a serious production UX/security-boundary defect because the interface claims access and accepts non-persistent platform actions.

## F. Full Operational Journey

| Journey step | Status | Evidence |
| --- | --- | --- |
| Practice profile create/edit | NOT TESTED | Live Supabase CRUD exists |
| Location configuration | NOT TESTED | Live Supabase CRUD exists |
| Therapist configuration | NOT TESTED | Live Supabase CRUD exists |
| Billing/banking configuration | NOT TESTED | Live Supabase CRUD exists |
| Practice logo upload | NOT TESTED | Storage upload helper connected |
| Patient create/search/open/edit | NOT TESTED | Live Supabase CRUD and nested records exist |
| Patient history | NOT TESTED in browser | Database fixture/history count previously passed |
| Patient contact save | NOT TESTED | Live mutation exists |
| Booking create through `/bookings` | NOT TESTED | Live mutation exists |
| Global New Booking action | FAIL | Writes localStorage prototype records, not Supabase |
| Booking view/edit/status/cancel | NOT TESTED | Live mutation exists |
| Booking persistence after refresh | NOT TESTED | Query reload implementation exists |
| Create session from booking | NOT TESTED | Uses approved `create_session_from_booking` RPC |
| Start/pause/resume session | FAIL | Direct protected lifecycle update |
| Cancel/no-show session | FAIL | Direct protected lifecycle update |
| Complete session | PARTIAL | Approved RPC passed prior database smoke; browser not tested |
| Reopen session | NOT TESTED | Approved RPC exists |
| Create/save/reopen clinical note | NOT TESTED | Live RPC/table implementation exists |
| Finalise/sign/amend note | NOT TESTED | Protected RPCs exist |
| Create draft invoice | PARTIAL | Database smoke path passed; browser not tested |
| Edit draft lines | NOT TESTED | Live mutations exist |
| Mark invoice ready | FAIL | Direct protected `invoice_status` update conflicts with guard |
| Confirm invoice | PARTIAL | Approved RPC passed database smoke; browser not tested |
| Issue invoice | PARTIAL | Approved RPC passed database smoke; browser not tested |
| Record/allocate manual payment | PARTIAL | Approved RPCs passed database smoke; browser not tested |
| Generate/view invoice PDF | NOT TESTED | Implementation exists; browser output not validated |
| Generate/view receipt PDF | NOT TESTED | Implementation exists; browser output not validated |
| Generate/view statement PDF | NOT TESTED | Implementation exists; browser output not validated |
| Upload clinical attachment | NOT TESTED | Secure upload implementation exists |
| View/download clinical attachment | NOT IMPLEMENTED | No signed URL action in Clinical UI |
| Upload/view patient document | NOT IMPLEMENTED | Storage schema exists; Patients UI has no document integration |

The shortest valid live workflow currently appears to be:

`Patient -> Booking from /bookings -> Create Session -> Complete Session directly -> Draft Invoice -> Review and Confirm directly -> Issue -> Record Payment -> Generate PDFs`

That workaround skips broken Start/Advance and Mark Ready controls. A pilot should not be asked to discover these workarounds.

## G. Dead and Broken Functionality

1. **Global New Booking is the prototype flow**
   - Evidence: `src/App.tsx:1935-1984` supplies local fixture patients and stores new bookings/invoices in React/localStorage state.
   - The actual live booking creation is in `src/pages/Bookings.tsx:795`.
   - Result: users can create apparently successful bookings that disappear outside that browser and never enter Supabase.

2. **Session lifecycle UI conflicts with database hardening**
   - Direct updates: `src/pages/Sessions.tsx:673-740` and `src/pages/Sessions.tsx:967-1014`.
   - Guard: `supabase/migrations/202607170007_operational_readiness_lifecycle_rpc_call_stack_guard.sql:24-40`.
   - Only `complete_session` and `reopen_completed_session` are approved call stacks.

3. **Role selector is a production-invalid preview control**
   - Evidence: `src/App.tsx:1918-1924` and `src/App.tsx:1991-1992`.
   - Result: a tenant user can display the mock Super Admin workspace; Finance users show the wrong role.

4. **Finance Mark Ready conflicts with invoice guard**
   - Direct update: `src/pages/Finance.tsx:1532-1597`.
   - Guard only approves `confirm_invoice`, `issue_invoice`, and `recalculate_invoice_payment_balance` (`202607170007...sql:60-79`).
   - The invoice can still be confirmed directly from draft, so this is not the sole blocker to billing.

5. **Forgot Password is dead**
   - Evidence: `src/pages/Login.tsx:89-91` has no handler.

6. **Overview is static**
   - Evidence: `src/pages/Overview.tsx:3-44` contains constants and no queries/actions.

7. **Settings is static**
   - Evidence: `src/pages/Settings.tsx:31-59` labels every card Not connected.

8. **Super Admin changes are not persistent**
   - Evidence: tenant and support records are component `useState` fixtures in `src/App.tsx:6720-6753`; creation/editing has no Supabase call.

9. **Clinical file retrieval is absent**
   - Evidence: `uploadDocumentFile` is used by Clinical, but `createSignedDocumentUrl` is only used by Finance.

10. **Patient documents are absent from the operational patient screen**
    - Evidence: Patients has no `document_files` query or storage helper use.

## H. Security Findings

### Confirmed controls

- No P0 cross-tenant defect was found.
- All remote migrations match the repository.
- Core operational tables enable RLS.
- Security-definer lifecycle/storage functions set `search_path = public`.
- Prior authenticated tests proved Tenant A cannot read or update Tenant B patient data.
- Prior role tests proved therapist/reception/finance clinical and finance boundaries.
- Anonymous patient and clinical table access was denied.
- Storage buckets are private and signed URLs are used for generated documents.
- Storage validation rejects executable types, oversized assets, and invalid tenant/object paths.

### Unverified controls

- Browser route visibility and backend denial for every role.
- Signed URL opening from the actual browser for all document categories.
- Valid Patient Link document projection in the current deployed frontend.
- Session timeout/refresh behavior in browser.

### Security-boundary concern

The role selector does not change RLS permissions, but allowing a tenant user to render a Super Admin interface is misleading and violates the intended product boundary. It should be removed from the production shell rather than treated as a real role-switch facility.

## I. UX Findings

- The main Overview is the default landing screen but provides no live operational value.
- The most prominent New Booking action launches the wrong implementation.
- Role switching exposes development concepts to real users.
- Dead cards and buttons are displayed as available rather than clearly deferred.
- The Session UI offers actions that the backend rejects.
- Error handling is generally present on live pages, but the most important failed lifecycle actions will surface database implementation errors rather than guide the user.
- The Practice hub mixes operational links with dead future cards.
- The current JavaScript bundle is approximately 1.1 MB minified and triggers the existing Vite chunk warning. This is not a launch blocker.
- Responsive CSS breakpoints exist, but authenticated mobile behavior was not executed.

## J. Prioritised Defect Register

### MVP product defects

| ID | Severity | Screen | Reproduction | Expected | Actual | Smallest fix | Complexity | Pilot blocker |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AD-MVP-001 | P1 | Global shell / New Booking | Login as tenant user; click top-right New Booking; create booking | Open/live-save through `/bookings` | Creates local prototype patient/booking/invoice state | Replace CTA with navigation to `/bookings` and open the live create form; remove legacy modal path | Small/Medium | Yes |
| AD-MVP-002 | P1 | Sessions | Open eligible session; click Start, Pause, Resume, Cancel, or No Show | Approved lifecycle transition persists with history/events | Direct update is rejected by deployed lifecycle trigger | Add minimal protected RPCs for required transitions or one validated transition RPC; call it from UI | Medium | Yes |
| AD-MVP-003 | P1 | App shell / Super Admin | Login as tenant role; choose Super Admin in role selector | Role is fixed by authenticated membership | Mock platform workspace renders | Remove role selector and derive display/rendering exclusively from `activeRole`; add Finance label handling | Small | Yes |
| AD-MVP-004 | P2 | Finance invoice draft | Click Mark ready on draft invoice | Status becomes ready-to-confirm | Direct update is rejected by invoice guard | Remove redundant Mark Ready step for MVP or protect it with a minimal RPC | Small | No; direct confirmation is available |
| AD-MVP-005 | P2 | Login | Click Forgot Password | Reset workflow or clear handoff guidance | No action | Implement Supabase reset flow or remove the button and provide pilot support wording | Small | No for controlled pilot |
| AD-MVP-006 | P2 | Overview | Login | Live daily work summary | Static explanatory cards | For MVP, replace with links/counts from existing modules or redirect default landing to Bookings | Small/Medium | No |
| AD-MVP-007 | P2 | Clinical attachments | Upload an attachment, then attempt to open it | Authorized staff can obtain signed URL | No view/download action | Add signed URL action using existing helper | Small | Depends on pilot file usage |
| AD-MVP-008 | P2 | Patient documents | Open patient profile | Upload/list/view operational documents | No patient document UI | Defer explicitly or add minimal list/upload/view using existing storage contract | Medium | No unless pilot requires paperless documents |
| AD-MVP-009 | P2 | Super Admin | Create tenant/support ticket/subscription edit; refresh | Changes persist | Component state resets | Use manual pilot provisioning/support outside app, or connect only pilot-critical platform records | Medium/Large | No for controlled pilot |
| AD-MVP-010 | P2 | Financial PDFs | Generate documents | Practice branding is reflected | Text details/banking appear, but logo and brand colours are not rendered | Accept plain official documents for pilot or add logo/colour rendering later | Medium | No if plain PDFs are accepted |
| AD-MVP-011 | P2 | Receipt/statement PDFs | Generate while another user changes allocations/invoices | Document uses authoritative fresh records | Receipt allocations and statement rows derive from current client state | Refresh affected records immediately before generation | Medium | No confirmed failure; accuracy risk |
| AD-MVP-012 | P2 | Practice hub | Click Team, Security & Permissions, Integrations | Navigate or clearly show unavailable | Cards have no action | Hide deferred cards for pilot or label them unavailable | Small | No |
| AD-MVP-013 | P3 | Settings | Open Settings | Personal preferences | Static framework | Defer/remove from pilot navigation | Small | No |
| AD-MVP-014 | P3 | Workflows | Expect automatic work execution | Worker processes outbox/jobs | Runtime intentionally deferred | Keep deferred; do not present as automated | Large | No |

### Testing blocker

| ID | Type | Description | Required owner/tool action |
| --- | --- | --- | --- |
| AD-TEST-001 | Testing blocker | No current fictional role credential authenticated in the browser audit | Reset the dedicated development-user passwords privately in Supabase or complete the manual role journey; do not send passwords in chat or commit them |

## K. MVP Release Recommendation

### CODE REPAIRS COMPLETE; PILOT SIGN-OFF PENDING

The four identified integration defects are repaired in source. Pilot sign-off remains pending because:

- Essential authenticated browser workflows remain untested.
- A live booking has not yet been created and verified after refresh through the repaired global action.
- Complete/Reopen and invoice/payment regression paths have not yet been exercised in the browser.
- The intended Super Admin identity has not been designated in development data.

The shortest route to a controlled pilot is now:

1. Privately reset or use a known password for the dedicated development users.
2. Designate the intended Super Admin account and set its existing profile's `is_super_admin` flag through an owner-approved data operation.
3. Execute the full authenticated browser journey, including booking refresh persistence, session completion, invoice confirmation/payment, and PDFs.

Overview, personal Settings, persistent Super Admin support/subscription tooling, Patient Link expansion, workflow runtime, automation, advanced reporting, payment gateways, medical aid, and AI should remain outside the pilot-critical path.

## Validation Record

| Command/check | Result |
| --- | --- |
| `git status --short` | Clean before report creation |
| `git branch --show-current` | `main` |
| `npx supabase projects list --output json` | Passed; `allidesk-dev` linked and `ACTIVE_HEALTHY` |
| `npx supabase migration list --linked` | Passed; 36 local/remote versions match through `202607180003` |
| `npm run build` | Passed |
| Read-only Auth/profile/membership query | Passed; six fictional users confirmed and linked |
| Super Admin profile query | No profile currently has `is_super_admin = true` |
| `operational_readiness_schema_smoke.sql` | Passed against linked `allidesk-dev` |
| `operational_readiness_authenticated_rls.sql` | Passed: tenant isolation, Admin/Therapist/Reception/Finance matrices, and lifecycle bypass checks |
| Read-only finance fixture regression | Passed: paid invoice total R780.00, one payment/allocation, zero balance |
| `git diff --check` before report | Passed |
| Vite bundle | Passed with existing >500 kB chunk warning; JS approximately 1.10 MB minified |
| Public login page | Browser-tested |
| Invalid login error | Browser-tested |
| Forgot Password | Browser-tested; no effect |
| Invalid Patient Link | Browser-tested; safe unavailable state |
| Successful authenticated login | Not completed; fictional credential rejected |
| Authenticated role journeys | Not tested in browser |
| Explicit mobile viewport | Not tested |

## Five Highest-Value Next Checks

1. Restore private access to one fictional tenant Admin account.
2. Browser-create a booking from the global action and verify it survives refresh.
3. Browser-complete a session and verify direct lifecycle bypass remains blocked.
4. Browser-confirm an invoice, record payment, and generate all three PDFs.
5. Repeat route/action checks with therapist, reception, and finance identities.

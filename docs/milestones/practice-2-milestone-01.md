# Practice 2.0 - UI/UX Refinement 1

## Milestone Baseline

- Status: Closed for Product Technical Lead review
- Start date: 2026-10-20
- Close date: 2026-10-20
- Baseline captured: 2026-10-20 08:27:32 SAST
- Branch: `practice-2-frontend`
- Baseline commit: `57c61b5bfee17d2cba74e2a354330e582d2b444a`
- Baseline working tree: Dirty; 13 modified tracked files, 5 untracked files, and no staged changes
- Baseline manifest: [`practice-2-milestone-01-baseline.md`](practice-2-milestone-01-baseline.md)

The baseline manifest fingerprints every pre-existing dirty file. Those inherited changes are not milestone work unless a later Product Owner request modifies them.

## Running Change Log

| Date | Requested change | Status | Files changed | Validation |
| --- | --- | --- | --- | --- |
| 2026-10-20 | Start milestone and capture the exact dirty working-tree baseline. | Complete | `docs/milestones/practice-2-milestone-01.md`; `docs/milestones/practice-2-milestone-01-baseline.md` | Branch, HEAD, status, per-file fingerprints, and aggregate tracked-diff fingerprint recorded. No application or Supabase changes. |
| 2026-10-20 | Remove the redundant Practice Setup route header and active tenant summary from Practice Setup. | Complete | `src/routes/appRoutes.tsx`; `src/pages/PracticeProfile.tsx`; milestone log | Practice profile form, permissions, status field, and Supabase operations preserved. `npm run build` and `git diff --check` passed. |
| 2026-10-20 | Lock saved practice-profile fields by default and add reusable pencil/save controls. | Complete | `src/components/EditSaveControls.tsx`; `src/components/icons.tsx`; `src/pages/PracticeProfile.tsx`; `src/styles.css`; milestone log | Existing permission and Supabase save flow preserved. `npm run build` and `git diff --check` passed. |
| 2026-10-20 | Standardise Practice Profile success/error feedback in the global header speech bubble beside the notification bell. | Complete | `src/pages/PracticeProfile.tsx`; `src/styles.css`; milestone log | Removed the duplicate inline notice and kept the header notice layer above forms and side panels. `npm run build` and `git diff --check` passed. |
| 2026-10-20 | Show a concise `Edit` hover tooltip on reusable pencil controls. | Complete | `src/components/EditSaveControls.tsx`; milestone log | Kept the more descriptive accessible label for assistive technology. `npm run build` and `git diff --check` passed. |
| 2026-10-20 | Finalise reusable global notice and edit/save APIs for future forms. | Complete | `src/lib/appNotice.ts`; `src/components/EditSaveControls.tsx`; `src/pages/Bookings.tsx`; `src/pages/PracticeProfile.tsx`; milestone log | Current callers migrated to semantic success/error helpers; reusable edit-control props exported. `npm run build` and `git diff --check` passed. |
| 2026-10-20 | Show saved practice details as plain values and reveal field controls only in edit mode. | Complete | `src/components/EditableField.tsx`; `src/pages/PracticeProfile.tsx`; `src/styles.css`; milestone log | Reusable display/edit field wrapper added; successful save returns to the clean value view. `npm run build` and `git diff --check` passed. |
| 2026-10-20 | Apply the saved/read-only presentation and reusable edit/save controls across persisted setup and master-data functions. | Complete | `src/components/EditableField.tsx`; Practice configuration pages; `src/pages/FinancePriceLists.tsx`; `src/pages/Patients.tsx`; `src/pages/Sessions.tsx`; `src/pages/Clinical.tsx`; `src/styles.css`; milestone log | Saved Practice, therapist, registration, banking, billing, branding, location, communication-template, price-list, and procedure records now return to a clean value view after confirmed saves. Global save/error feedback is consistently routed to the header notice. Operational lifecycle forms remain action-driven. |
| 2026-10-20 | Remove the redundant Practice Locations route header and tenant summary. | Complete | `src/routes/appRoutes.tsx`; `src/pages/PracticeLocations.tsx`; milestone log | Location management now opens directly into the location list and detail workspace; permissions and live Supabase behavior are unchanged. |
| 2026-10-20 | Hide the empty New Location form until the user explicitly chooses Add Location. | Complete | `src/pages/PracticeLocations.tsx`; `src/styles.css`; milestone log | Locations now opens as a full-width list. Add Location opens the creation form, while selecting an existing record opens its saved detail view. |
| 2026-10-20 | Apply the clean list-first and explicit-add pattern to Therapists & Team. | Complete | `src/routes/appRoutes.tsx`; `src/pages/PracticeTherapists.tsx`; milestone log | Removed the redundant route and tenant summary headers. Add Therapist and Add Registration now explicitly reveal their forms; saved records retain the shared edit/save behavior. |
| 2026-10-20 | Apply the clean list-first and explicit-add pattern to Services & Pricing. | Complete | `src/routes/appRoutes.tsx`; `src/pages/FinancePriceLists.tsx`; milestone log | Removed redundant route and tenant summary headers. Add Price List and Add Procedure explicitly reveal their forms. Existing tenant-scoped price lists and procedure lines remain unchanged; therapist/location allocation requires a real relationship contract and was not represented with frontend-only metadata. |
| 2026-10-20 | Consolidate Banking Details and Billing Configuration into one Practice navigation item. | Complete | `src/App.tsx`; `src/routes/appRoutes.tsx`; `src/pages/PracticeBillingConfiguration.tsx`; `src/pages/PracticeBanking.tsx`; `src/pages/PracticeBilling.tsx`; `src/styles.css`; milestone log | Billing Configuration now contains Bank Accounts and Billing Configuration views. Redundant headers were removed, Bank Accounts uses the list-first Add Account pattern, and the former Banking URL redirects safely. |
| 2026-10-20 | Consolidate Practice administration and move Services & Pricing into Billing Configuration. | Complete | `src/App.tsx`; `src/routes/appRoutes.tsx`; `src/pages/PracticeSetupConfiguration.tsx`; `src/pages/PracticeBillingConfiguration.tsx`; `src/pages/PracticeBranding.tsx`; `src/styles.css`; milestone log | Practice Setup now contains permission-aware Practice Profile, Locations, Therapists & Team, and Branding views. Billing Configuration now also contains Services & Pricing. Existing child URLs redirect to the consolidated views. |
| 2026-10-20 | Add customer-facing branding previews for invoice, email, and report presentation. | Complete | `src/pages/PracticeBranding.tsx`; `src/styles.css`; milestone log | Three fixed previews now reflect the configured display name, logo, and brand colours. Stored private logos use the existing signed-URL helper; no template builder or document-generation behavior was added. |
| 2026-10-20 | Source the Branding display name from Practice Profile and add expandable preview actions. | Complete | `src/components/icons.tsx`; `src/pages/PracticeBranding.tsx`; `src/styles.css`; milestone log | Practice Profile is now the visible display-name source. Each predefined invoice, email, and report preview has an eye action that opens a larger in-page customer-view overlay. |
| 2026-10-20 | Align the branded invoice preview and generated invoice PDF with the supplied clean invoice reference. | Complete | `src/pages/PracticeBranding.tsx`; `src/pages/Finance.tsx`; `src/lib/financePdf.ts`; `src/styles.css`; milestone log | Invoice preview and live PDF now share a clear practice/recipient masthead, prominent amount due, procedure table, totals, payment details, and terms. Issued-invoice snapshot data and colours remain authoritative; receipt and statement layouts are unchanged. |
| 2026-10-20 | Always include the configured Main location on the practice invoice. | Complete | `src/pages/PracticeBranding.tsx`; `src/pages/Finance.tsx`; milestone log | The branding preview loads the active tenant's Main location. Generated invoices use that location's name, address and contact details first, with the existing invoice location snapshot retained as a fallback for tenants without a configured Main location. |
| 2026-10-20 | Add a discreet AlliDesk support mark to invoice footers. | Complete | `src/pages/PracticeBranding.tsx`; `src/lib/financePdf.ts`; `src/styles.css`; milestone log | The preview uses the existing dark-blue AlliDesk wordmark and generated invoices carry a small dark-blue `This practice is supported by AlliDesk` footer on every invoice page. Receipt and statement branding is unchanged. |
| 2026-10-20 | Keep the exact AlliDesk support statement anchored to the bottom of every invoice page. | Complete | `src/pages/PracticeBranding.tsx`; `src/lib/financePdf.ts`; `src/styles.css`; milestone log | The footer now reads `This practice is supported by AlliDesk.` with the dark-blue wordmark and final punctuation, and remains at the bottom of single- and multi-page invoices. |
| 2026-10-20 | Suggest brand colours automatically from an uploaded practice logo. | Complete | `src/pages/PracticeBranding.tsx`; milestone log | Logo analysis runs locally in the browser, ignores transparent and near-white pixels, selects a dominant primary colour, derives a light supporting colour, and chooses a distinct logo accent where available. Suggested colours remain fully editable before save and no external image-analysis service receives the logo. |
| 2026-10-20 | Add ideal logo-size guidance and maximise square/rectangular logo use in previews. | Complete | `src/pages/PracticeBranding.tsx`; `src/styles.css`; milestone log | The upload area now shows concise ticks for square, rectangular, format, file-size and transparency recommendations. Selected logos are inspected for dimensions and shape, while preview containers allow square marks to use height and landscape wordmarks to use additional width. |
| 2026-10-20 | Anchor the AlliDesk support statement to the physical bottom of the invoice preview. | Complete | `src/styles.css`; milestone log | The invoice uses a dedicated flexible grid row so terms remain above and `This practice is supported by AlliDesk.` stays in the final bottom row instead of floating beneath short invoice content. Generated PDF pages already use fixed bottom coordinates. |
| 2026-10-20 | Use the stipulated or default practice bank account on invoices. | Complete | `supabase/migrations/202607180004_invoice_default_bank_fallback.sql`; `src/pages/PracticeBranding.tsx`; milestone log | Explicit Billing Configuration selection remains authoritative. When none is stipulated, new invoice issuer snapshots fall back to the active tenant-owned account marked Default. The branding invoice preview follows the same precedence and shows the real bank details instead of placeholders. |

## Milestone Rules

- Record only Product Owner-requested UI/UX work performed after the baseline capture.
- Preserve inherited working-tree changes and distinguish them using the baseline fingerprints.
- Do not discard, stash, reset, overwrite, commit, push, or deploy without approval.
- Preserve Supabase, RLS, tenant isolation, and existing booking, session, clinical, and finance contracts.
- Run `npm run build` and `git diff --check` after meaningful application changes.

## Final Milestone Report

### Closure And Baseline Reconciliation

- Branch: `practice-2-frontend`
- Baseline and closing HEAD: `57c61b5bfee17d2cba74e2a354330e582d2b444a`
- Commits, pushes and deployments during the milestone: None
- Baseline tree: 13 modified tracked files and 5 untracked files
- Closing tree: 22 modified tracked files and 12 untracked files
- The dirty baseline was preserved. No inherited work was discarded, stashed, reset or overwritten.
- Byte-for-byte unchanged inherited tracked files: `docs/mvp-pilot-e2e-validation.md`, `src/auth/AuthContext.tsx`, `src/components/PageHeader.tsx`, `src/layout/AppShell.tsx`, and `src/pages/Practice.tsx`.
- Byte-for-byte unchanged inherited untracked files: `docs/allidesk-original-session-workflow-recovery.md`, `docs/mvp-complete-functional-audit.md`, and `src/components/TopbarNotice.tsx`.
- Inherited files intentionally changed again during this milestone: `src/App.tsx`, `src/pages/Bookings.tsx`, `src/pages/Clinical.tsx`, `src/pages/Finance.tsx`, `src/pages/Patients.tsx`, `src/pages/Sessions.tsx`, `src/routes/appRoutes.tsx`, `src/styles.css`, `src/components/icons.tsx`, and `src/lib/appNotice.ts`.

### Screens And Components Changed

| Area | Screen or component | Milestone change |
| --- | --- | --- |
| Application navigation | `App.tsx`, `appRoutes.tsx` | Consolidated Practice navigation, added section redirects and preserved permission-aware routing. |
| Practice Setup | `PracticeSetupConfiguration.tsx` | Added one permission-aware host for Practice Profile, Locations, Therapists & Team, and Branding. |
| Practice Profile | `PracticeProfile.tsx` | Removed redundant headings, locked saved values, and added explicit edit/save controls. |
| Locations | `PracticeLocations.tsx` | Removed redundant headings; list-first presentation; form opens only for Add Location or a selected record. |
| Therapists & Team | `PracticeTherapists.tsx` | Added list-first therapist/registration management and explicit Add actions with clean saved views. |
| Branding | `PracticeBranding.tsx` | Added saved/edit presentation, real practice and Main-location identity, invoice/email/report previews, expandable customer views, logo palette suggestions, logo-size guidance, adaptive logo sizing, and real default-bank preview details. |
| Billing Configuration | `PracticeBillingConfiguration.tsx` | Added one host for Bank Accounts, Billing Configuration, and Services & Pricing. |
| Bank Accounts | `PracticeBanking.tsx` | Added list-first account management and reusable saved/edit behavior. |
| Billing Settings | `PracticeBilling.tsx` | Added clean saved state and explicit editing while preserving existing defaults and permissions. |
| Services & Pricing | `FinancePriceLists.tsx` | Added list-first Price List and Procedure management with explicit Add actions. |
| Communication Templates | `PracticeCommunicationTemplates.tsx` | Applied the shared saved/read-only and explicit edit/save presentation. |
| Patients | `Patients.tsx` | Applied shared saved/read-only presentation and global save/error feedback where appropriate. |
| Sessions | `Sessions.tsx` | Applied shared saved/read-only presentation without changing lifecycle RPC ownership. |
| Clinical | `Clinical.tsx` | Applied shared saved/read-only presentation without changing clinical lifecycle or publication contracts. |
| Bookings | `Bookings.tsx` | Migrated general success/error feedback to the reusable topbar notice API. Booking operations were not redesigned in this milestone. |
| Finance | `Finance.tsx` | Reworked generated invoice data presentation, Main-location resolution and invoice PDF content. Receipt and statement renderers were intentionally left unchanged. |
| Financial PDF renderer | `financePdf.ts` | Added an invoice-specific A4 layout with practice/recipient masthead, amount due, procedure table, totals, payment details, terms, pagination and fixed AlliDesk support footer. |
| Shared edit UI | `EditSaveControls.tsx`, `EditableField.tsx`, `icons.tsx` | Added reusable pencil/save controls, hover labeling, plain saved-value rendering and required icons. |
| Shared notifications | `appNotice.ts` | Added semantic success/error helpers consumed by the existing global topbar notice. |
| Shared styling | `styles.css` | Added consolidated Practice navigation, saved-field, list-first, branding-preview, invoice, logo-guidance and responsive styles. |

### UI And UX Improvements

- Practice administration now opens into focused configuration views instead of explanatory landing cards.
- Saved setup/master-data values display as clean text. Inputs appear only after the user chooses Edit.
- Pencil actions expose an `Edit` tooltip; save remains adjacent and returns the record to its locked presentation after confirmed persistence.
- General save/error feedback is presented consistently through the existing top-right speech-bubble notice.
- Locations, therapists, registrations, bank accounts, price lists and procedures no longer show empty creation forms by default.
- Practice Setup and Billing Configuration group related settings into compact internal tabs while preserving direct-link redirects.
- Branding previews show how the configured practice identity, logo and colours affect an invoice, email and report.
- The invoice preview follows a customer-facing A4 hierarchy and keeps `This practice is supported by AlliDesk.` physically anchored to the bottom.
- Logo upload now suggests editable colours locally, reports actual image dimensions/shape, and explains ideal square and landscape sizes.

### Functional Behaviour Changed

- Saved records are locked by default and require explicit Edit before changes can be submitted.
- Successful saves close editing state; failures retain the form and report the error globally.
- Existing Practice child URLs redirect to the consolidated section and preserve the intended tab.
- Generated invoice PDFs now use an invoice-specific layout and authoritative invoice line/totals data.
- Invoice rendering prefers the active Main location and falls back to the captured invoice location when no Main location is configured.
- Invoice previews resolve an explicitly selected Billing Configuration account first and otherwise use the tenant-owned account marked Default.
- A forward-only trigger migration applies the same bank-account fallback when creating new invoice issuer snapshots.
- Selecting a logo automatically suggests primary, supporting and accent colours. Users may change every suggestion before saving.
- No booking, session, clinical or finance lifecycle transition was moved out of its existing protected operation/RPC.

### Product Owner Decisions Recorded

- Practice navigation is reduced to two principal configuration areas: Practice Setup and Billing Configuration.
- Practice Setup contains Practice Profile, Locations, Therapists & Team, and Branding.
- Billing Configuration contains Bank Accounts, Billing Configuration, and Services & Pricing.
- Saved configuration should appear as readable values, not permanently visible form controls.
- Add forms should remain hidden until the user explicitly chooses an Add action.
- The practice display name is sourced from Practice Profile rather than independently edited in Branding.
- AlliDesk supplies three predefined customer-view templates; this milestone does not introduce a template builder.
- Uploaded logos should drive suggested colours while preserving manual choice.
- Both square and landscape logos are supported, with quality guidance shown before save.
- Invoices must show the Main location and applicable bank details.
- Explicit Billing Configuration bank selection overrides the Bank Account marked Default.
- Every invoice page carries the discreet statement `This practice is supported by AlliDesk.` at the physical bottom.

### Backend, Security And Integration Impact

- Supabase: added the unapplied forward-only migration `202607180004_invoice_default_bank_fallback.sql`.
- Migration behavior: before a new `invoice_issuer_snapshots` insert, it fills missing bank snapshot fields from the active tenant-owned account marked Default. Existing explicit bank values are never overwritten.
- Database schema tables, RLS policies and grants: unchanged.
- Authentication/session resolution: unchanged from the recorded baseline.
- Permission model: unchanged. Existing `tenant.practice.configure`, finance permissions, route guards and RLS remain authoritative.
- Clinical records: no schema, RLS, lifecycle, signing, amendment or publication changes.
- Finance: invoice rendering and future invoice snapshot fallback changed; invoice/payment lifecycle RPCs, totals and receipt/statement logic remain unchanged.
- Storage: existing signed URLs and `practice-assets` upload flow are reused. No bucket or storage-policy changes.
- Logo palette analysis runs entirely in the browser; no logo is sent to a third-party analysis service.

### Completed And Verified

- TypeScript compilation and production Vite build pass.
- `git diff --check` passes.
- Every requested source change is represented in the running change log.
- Baseline fingerprint comparison was completed and unchanged inherited files were identified.
- The Product Owner iteratively reviewed portions of the Practice and Calendar experience locally during development.
- No commit, push or deployment occurred.

### Untested Or Not Fully Verified

- No final authenticated browser regression covered every changed Practice tab and role.
- The final invoice PDF layout has not received a formal rendered-PDF comparison across short and multi-page invoices.
- Logo colour extraction, unusual aspect-ratio handling and the 5 MB rejection path have compiled but have not been browser-tested with a representative logo matrix.
- The new default-bank migration has not been applied or executed against `allidesk-dev`.
- Invoice snapshot fallback, explicit billing-account precedence and RLS behavior therefore remain runtime-unverified.
- No automated lint or test scripts exist in `package.json`; only `dev`, `build` and `preview` are configured.

### Outstanding Defects And Incomplete Work

1. **Default-bank migration pending:** invoices created before deployment do not receive the new fallback. Existing issued invoice snapshots are intentionally not rewritten.
2. **Historical Main-location caveat:** PDF generation currently prefers the practice's current Main location. Regenerating an older invoice after the Main location changes can display the newer address instead of the historical service/location snapshot. This requires a Product Technical Lead decision before production financial-document sign-off.
3. **Generated practice logo limitation:** the Branding preview uses the uploaded logo, but the lightweight PDF renderer currently renders a practice monogram/name rather than embedding the uploaded bitmap logo.
4. **AlliDesk PDF footer limitation:** the on-screen preview uses the supplied dark-blue logo asset; the generated PDF uses a dark-blue typographic wordmark because the current lightweight renderer does not embed PNG assets.
5. **Price-list allocation gap:** therapist/location allocation was requested conceptually, but the current schema has no approved relationship contract. No frontend-only metadata workaround was introduced.
6. **Browser regression pending:** consolidated routes, mobile navigation, edit/save permissions and customer previews need one authenticated end-to-end pass.
7. **Existing build warning:** Vite continues to report a JavaScript chunk larger than 500 kB. The build succeeds; code splitting was outside this milestone.
8. **Quotation scope:** no quotation document workflow exists in this milestone. Bank-account precedence was implemented for invoices only.

### Files Changed During Milestone 1

The following list excludes inherited files proven byte-for-byte unchanged. Files marked **inherited-and-extended** were dirty at baseline and deliberately changed again for milestone work.

- `src/App.tsx` (**inherited-and-extended**)
- `src/components/EditSaveControls.tsx`
- `src/components/EditableField.tsx`
- `src/components/icons.tsx` (**inherited-and-extended**)
- `src/lib/appNotice.ts` (**inherited-and-extended**)
- `src/lib/financePdf.ts`
- `src/pages/Bookings.tsx` (**inherited-and-extended**)
- `src/pages/Clinical.tsx` (**inherited-and-extended**)
- `src/pages/Finance.tsx` (**inherited-and-extended**)
- `src/pages/FinancePriceLists.tsx`
- `src/pages/Patients.tsx` (**inherited-and-extended**)
- `src/pages/PracticeBanking.tsx`
- `src/pages/PracticeBilling.tsx`
- `src/pages/PracticeBillingConfiguration.tsx`
- `src/pages/PracticeBranding.tsx`
- `src/pages/PracticeCommunicationTemplates.tsx`
- `src/pages/PracticeLocations.tsx`
- `src/pages/PracticeProfile.tsx`
- `src/pages/PracticeSetupConfiguration.tsx`
- `src/pages/PracticeTherapists.tsx`
- `src/pages/Sessions.tsx` (**inherited-and-extended**)
- `src/routes/appRoutes.tsx` (**inherited-and-extended**)
- `src/styles.css` (**inherited-and-extended**)
- `supabase/migrations/202607180004_invoice_default_bank_fallback.sql`
- `docs/milestones/practice-2-milestone-01-baseline.md`
- `docs/milestones/practice-2-milestone-01.md`

### Final Validation

- `npm run build`: PASS on 2026-10-20. TypeScript and Vite completed successfully.
- `git diff --check`: PASS on 2026-10-20.
- Existing warning: Vite reports a generated JavaScript chunk above 500 kB.
- Additional lint/typecheck/test commands: none configured. TypeScript checking is included in `npm run build` via `tsc -b`.

## Product Review Summary

**Milestone:** Practice 2.0 - UI/UX Refinement 1
**Status:** Closed for Product Technical Lead review
**Branch:** `practice-2-frontend`
**Baseline/closing commit:** `57c61b5bfee17d2cba74e2a354330e582d2b444a`

### What Changed

AlliDesk's Practice administration was consolidated into focused Practice Setup and Billing Configuration areas. Saved settings now display as clean locked values with reusable pencil/save actions. Locations, therapists, registrations, bank accounts, price lists and procedures use a list-first flow and reveal creation forms only after an explicit Add action. Branding gained live invoice/email/report previews, expanded customer views, automatic editable colour suggestions, logo quality guidance and adaptive logo sizing. The generated invoice received a cleaner A4 layout with Main-location identity, real billing details, line items, totals, terms and a fixed AlliDesk support footer.

### What Now Works

- Cleaner permission-aware Practice navigation with safe redirects.
- Consistent saved/read-only presentation and explicit editing across setup records.
- Consistent topbar success/error feedback.
- Customer-facing brand previews driven by saved practice data.
- Local, private logo colour analysis with manual override.
- Invoice-specific PDF composition and multipage support.
- Explicit billing account precedence in previews.
- A forward-only fallback for future invoice snapshots when only a Bank Account Default is configured.

### What Remains Unverified

- Final authenticated browser regression across every role and consolidated Practice route.
- Rendered invoice PDF review for real short/multipage data.
- Logo analysis across representative square, landscape, transparent and oversized files.
- Deployment and live RLS/runtime validation of the default-bank migration.

### New Product Decisions

- Practice administration is grouped by user task rather than exposed as many top-level destinations.
- Configuration stays visually locked until Edit is chosen.
- Practice Profile owns the customer-facing practice name.
- Logo upload may suggest branding, but users retain control.
- Explicit Billing Configuration wins; otherwise the default bank account is used.
- Every invoice page identifies AlliDesk discreetly at the bottom.

### Outstanding Issues

- Decide whether historical invoices must preserve a snapshotted Main-location address instead of resolving the current Main location when regenerated.
- The lightweight PDF renderer does not yet embed uploaded practice/AlliDesk PNG logos.
- Therapist/location-specific price-list allocation lacks an approved data relationship.
- Complete authenticated regression and deploy/test the pending migration before release.
- The existing Vite large-chunk warning remains.

### Recommended Next Milestone

**Practice 2.0 - Validation & Financial Document Hardening**: apply and validate the default-bank migration in `allidesk-dev`, resolve the historical Main-location snapshot decision, visually inspect generated invoice PDFs including multipage cases, and run one authenticated role/route regression. Keep this milestone validation-focused; do not add new Practice modules.

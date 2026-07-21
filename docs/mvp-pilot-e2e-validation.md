# MVP Pilot E2E Validation

Date: 2026-07-21

## Environment Used

- Supabase project: `allidesk-dev`
- Project ref: `wdhfhdpcrcuyxqjehiyy`
- Environment classification: development only
- Data classification: fictional development data only
- Local app URL: `http://127.0.0.1:5173/`
- Git branch: `main`

No production environment was used.

## Pre-Test Checks

| Check | Result | Evidence |
| --- | --- | --- |
| `git status --short` | Passed with dirty worktree | Existing Phase 6/storage/PDF work remains uncommitted. No unrelated changes were reverted. |
| `git branch --show-current` | Passed | Current branch: `main`. |
| `npx supabase projects list` | Passed | Linked project is `allidesk-dev`, ref `wdhfhdpcrcuyxqjehiyy`, status `ACTIVE_HEALTHY`. |
| `npx supabase migration list --linked` | Passed | Local and remote migration histories match through `202607180003`. |
| `npm run build` | Passed | TypeScript and Vite build completed. Existing Vite large-chunk warning remains. |
| `git diff --check` | Passed | No whitespace errors. |
| Local app startup | Passed | Vite served `http://127.0.0.1:5173/`. |
| Local HTTP reachability | Passed | `curl -s -I http://127.0.0.1:5173/` returned `HTTP/1.1 200 OK`. |

## Browser Validation Status

The requested browser-based MVP journey could not be completed in this execution session.

Blockers:

- In-app browser connector returned: `No browser is available`.
- Chrome connector returned: `Browser is not available: extension`.
- Playwright is not installed in the project.
- Dedicated Auth user passwords were not available in the execution environment, so role-based UI login could not be performed independently.

This is a validation-environment blocker, not a confirmed product defect.

## Users And Roles Tested

Terminal-authenticated RLS and storage harnesses use the dedicated development Auth users:

- `gostratgroup+allidesk-admin-a@gmail.com` — Tenant A admin
- `gostratgroup+allidesk-therapist-a@gmail.com` — Tenant A therapist
- `gostratgroup+allidesk-reception-a@gmail.com` — Tenant A receptionist
- `gostratgroup+allidesk-finance-a@gmail.com` — Tenant A finance
- `gostratgroup+allidesk-admin-b@gmail.com` — Tenant B admin

Browser login for these users was not completed because credentials/browser control were unavailable.

## Complete Test Journey

| Step | Result | Notes |
| --- | --- | --- |
| Practice setup | Not browser-tested | Requires UI login/browser access. Prior implementation/build validation exists. |
| User and therapist setup | Not browser-tested | Requires UI login/browser access. |
| Patient creation | Not browser-tested | Requires UI login/browser access. |
| Booking creation | Not browser-tested | Requires UI login/browser access. |
| Session management | Not browser-tested | Requires UI login/browser access. |
| Clinical note creation | Not browser-tested | Requires UI login/browser access. |
| Invoice creation | Not browser-tested | Requires UI login/browser access. |
| Invoice PDF generation | Not browser-tested | Implementation builds; live browser generation not executed. |
| Manual payment recording | Not browser-tested | Requires UI login/browser access. |
| Receipt PDF generation | Not browser-tested | Implementation builds; live browser generation not executed. |
| Patient statement PDF generation | Not browser-tested | Implementation builds; live browser generation not executed. |
| Document view/download | Not browser-tested | Signed URL browser interaction not executed. |
| Patient history verification | Not browser-tested | Existing terminal smoke history evidence remains, but this run did not complete browser verification. |
| Audit verification | Not browser-tested | Existing readiness evidence remains, but this run did not complete browser verification. |

## PDF Output Validation

Implementation status:

- Invoice PDF generation exists in `src/pages/Finance.tsx`.
- Receipt PDF generation exists in `src/pages/Finance.tsx`.
- Patient statement PDF generation exists in `src/pages/Finance.tsx`.
- PDF creation utility exists at `src/lib/financePdf.ts`.
- Generated PDFs use the existing `generated-documents` Storage bucket.
- View actions use short-lived signed URLs.

Live browser validation status:

- Not completed.

Remote metadata observation:

- Existing generated finance document metadata exists for `invoice_pdf` in `generated-documents`.
- Observed status was `uploaded`, not a newly browser-generated `available` PDF from this run.

This means the final browser proof for generated financial PDFs remains outstanding.

## Security And Tenant Isolation Validation

Storage security harness executed successfully:

```bash
npx supabase db query --linked --file supabase/smoke-tests/operational_readiness_storage_security.sql
```

Result: passed.

Validated:

- all five required development Auth users discovered
- Tenant A admin sees Tenant A document metadata only
- Tenant B admin sees Tenant B document metadata only
- admin sees patient, clinical, practice, and generated document metadata
- therapist cannot see generated finance documents
- reception cannot see clinical or finance documents
- finance can see generated finance documents and cannot see clinical attachments
- anonymous direct table access to `document_files` is denied
- invalid Patient Link session cannot see documents
- valid Patient Link session sees only explicitly shared documents
- executable uploads are rejected
- oversized practice logo uploads are rejected
- object paths must match tenant/document metadata

The full authenticated RLS harness did not complete through the linked CLI during this run and was interrupted after repeated timeout windows.

## Usability Findings

Not assessed in browser during this run.

Reason:

- no automated browser was available
- role login credentials were unavailable to the execution environment

## Defects Found

No reproducible application defect was confirmed during this run.

Validation blockers found:

1. Browser automation unavailable in this Codex session.
2. Role login credentials unavailable to the execution environment.
3. Some linked Supabase SQL executions hung and had to be interrupted:
   - pilot seed refresh
   - storage seed refresh
   - schema smoke file
   - authenticated RLS file
   - several broad summary queries

The storage security harness and migration comparison did complete successfully.

## Defects Fixed

None.

No code changes were made during this validation pass.

## Launch Blockers

No product launch blocker was reproduced.

However, MVP pilot sign-off is blocked until the browser-based E2E journey is completed with actual role logins.

## Pilot-Polish Items

None recorded because browser usability testing was not completed.

## Post-MVP Items

No new Post-MVP items were added.

The existing Post-MVP decisions remain:

- payment gateways
- medical aid claims
- AI
- workflow automation runtime
- email, WhatsApp, and SMS automation
- advanced reporting
- Patient Link expansion
- patient portal/accounts/messaging
- recurring bookings
- advanced assessment scoring
- profession-specific modules

## Safe Rerun Instructions

1. Confirm Supabase target:

   ```bash
   npx supabase projects list
   npx supabase migration list --linked
   ```

2. Start the app:

   ```bash
   npm run dev
   ```

3. Open:

   ```text
   http://127.0.0.1:5173/
   ```

4. Log in manually with each dedicated development role.

5. Complete the MVP journey:

   ```text
   practice setup
   -> patient
   -> booking
   -> session
   -> clinical note
   -> invoice confirm/issue
   -> invoice PDF
   -> manual payment
   -> receipt PDF
   -> statement PDF
   -> document view/download
   -> history/audit checks
   ```

6. Run final validation:

   ```bash
   npm run build
   git diff --check
   npx supabase migration list --linked
   npx supabase db query --linked --file supabase/smoke-tests/operational_readiness_storage_security.sql
   ```

## Final Result

Status: **NOT READY FOR PILOT SIGN-OFF**

Reason:

- The requested browser-based pilot E2E journey was not completed.
- No reproducible product defect was found.
- The remaining blocker is validation access/tooling, not a confirmed application defect.

Next required action:

- Run the browser journey manually or provide a browser-capable session plus test-role login access so the final pilot sign-off can be completed.

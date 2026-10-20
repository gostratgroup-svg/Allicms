# AlliDesk MVP Pilot E2E Validation

Validation date: 2026-10-18

Repository: `/Users/gerhardolivier/Go Difference Coding /Allidesk`

Supabase project: `allidesk-dev` (`wdhfhdpcrcuyxqjehiyy`)
Data classification: fictional development data only

## Overall Result

**NOT READY FOR CONTROLLED PILOT SIGN-OFF**

The repaired local application opened successfully in an automated Chrome session. The complete authenticated browser journey could not begin because no current development-user password was available to the validation environment. No credential was requested, displayed, logged, committed, or changed.

This is an acceptance-test access blocker, not a newly confirmed application defect.

## Browser-Testing Method

- Method: Chrome browser automation through the supported computer-use connector.
- Application tested: local repaired source at `http://127.0.0.1:5173/`.
- Browser result: AlliDesk Login rendered successfully.
- Saved session result: none available.
- Autofilled credential result: none available.
- Playwright package: not added to the repository; the supported browser connector was sufficient.
- Authenticated browser interactions: not performed because a valid password was unavailable.

No browser workflow is marked passed unless it was actually exercised.

## Authentication Verification

A read-only query against `allidesk-dev` confirmed these existing fictional users:

| User | Tenant | Role | Confirmed | Membership |
| --- | --- | --- | --- | --- |
| `gostratgroup+allidesk-admin-a@gmail.com` | AlliDesk Pilot Practice | admin | Yes | Active |
| `gostratgroup+allidesk-therapist-a@gmail.com` | AlliDesk Pilot Practice | therapist | Yes | Active |
| `gostratgroup+allidesk-reception-a@gmail.com` | AlliDesk Pilot Practice | receptionist | Yes | Active |
| `gostratgroup+allidesk-finance-a@gmail.com` | AlliDesk Pilot Practice | finance | Yes | Active |
| `gostratgroup+allidesk-admin-b@gmail.com` | AlliDesk Isolation Tenant B | admin | Yes | Active |
| `gostratgroup@gmail.com` | AlliDesk Pilot Practice | admin | Yes | Active |

None is banned. Profiles and tenant memberships already exist and must not be recreated.

No profile currently has `is_super_admin = true`. This does not block the tenant pilot journey, but Super Admin testing requires a separately approved profile promotion.

## Owner Password Reset Action

Use `gostratgroup+allidesk-admin-a@gmail.com` for the first journey. The safest reset is an owner-controlled, one-time Supabase Auth Admin update. It must run only from a trusted local terminal with the project secret key and must never use the browser publishable key.

1. Sign in to the Supabase Dashboard and open `allidesk-dev`.
2. Open **Project Settings > API Keys** and copy a project secret key temporarily. Do not paste it into chat or save it in `.env`.
3. In a private local terminal, run the following. Enter the secret and new fictional-user password only at the hidden prompts:

   ```bash
   cd "/Users/gerhardolivier/Go Difference Coding /Allidesk"
   read -s "SUPABASE_SECRET_KEY?Supabase secret key: "
   echo
   read -s "ALLIDESK_TEST_PASSWORD?New fictional test password: "
   echo
   export SUPABASE_SECRET_KEY ALLIDESK_TEST_PASSWORD
   node --input-type=module -e '
   import { createClient } from "@supabase/supabase-js";
   const client = createClient("https://wdhfhdpcrcuyxqjehiyy.supabase.co", process.env.SUPABASE_SECRET_KEY, {
     auth: { autoRefreshToken: false, persistSession: false }
   });
   const email = "gostratgroup+allidesk-admin-a@gmail.com";
   const { data, error } = await client.auth.admin.listUsers({ page: 1, perPage: 100 });
   if (error) throw error;
   const user = data.users.find((item) => item.email?.toLowerCase() === email);
   if (!user) throw new Error("Development user not found");
   const result = await client.auth.admin.updateUserById(user.id, { password: process.env.ALLIDESK_TEST_PASSWORD });
   if (result.error) throw result.error;
   console.log("Development test password updated successfully.");
   '
   unset SUPABASE_SECRET_KEY ALLIDESK_TEST_PASSWORD
   ```

4. Close the terminal after the variables are cleared.
5. Enter the new password directly into the AlliDesk login form. Do not send it through chat.

The reset changes only the selected fictional Auth credential. It does not recreate the user or modify profile, tenant, or role records. Supabase documents `auth.admin.updateUserById()` as a trusted-server operation; the secret key must never be exposed in frontend code.

## Acceptance Journey

| Step | Status | Evidence / next check |
| --- | --- | --- |
| 1. Successful login | Blocked by owner credential action | User metadata is healthy; no password was available. |
| 2. Practice dashboard | Not tested | Requires authenticated session. |
| 3. Patient creation | Not tested | Create a uniquely named fictional patient and confirm success. |
| 4. Booking creation | Not tested | Use the top-bar New Booking action and live form. |
| 5. Booking persistence after refresh | Not tested | Refresh `/bookings`; verify the created booking remains. |
| 6. Session completion | Not tested | Create/open session and use approved Complete action. |
| 7. Clinical note creation and reopening | Not tested | Save a draft, reopen it, and verify content persists. |
| 8. Invoice creation and issuing | Not tested | Confirm and issue the session-linked invoice. |
| 9. Invoice PDF generation and viewing | Not tested | Generate, open signed URL, and verify patient/practice/totals. |
| 10. Manual payment recording | Not tested | Record a fictional payment and verify balance. |
| 11. Receipt PDF generation and viewing | Not tested | Generate and open the receipt. |
| 12. Statement PDF generation and viewing | Not tested | Generate and open the patient statement. |
| 13. Patient history | Not tested | Confirm booking, session, clinical, invoice, and payment events. |
| 14. Logout and login again | Not tested | Verify logout clears session and login restores tenant workspace. |

## Manual Fallback Checklist

1. Open `http://127.0.0.1:5173/`.
2. Sign in as Tenant A Admin using the privately reset password.
3. Create one fictional patient named with the current date/time.
4. Click the global **New Booking** action and save a booking for that patient.
5. Refresh the browser and confirm the booking remains.
6. Create/open its session and complete it using the supported action.
7. Create and save a clinical note, leave it, reopen it, and verify the content.
8. Open Finance, confirm and issue the generated invoice.
9. Generate and open the invoice PDF.
10. Record a fictional manual payment for the full balance.
11. Generate and open the receipt PDF.
12. Generate and open a patient statement PDF.
13. Return to the patient and inspect operational history.
14. Log out, log in again, and verify the same tenant data remains.

Record the URL, action, expected result, actual result, and screenshot for any failure. Classify only a data-loss, security, or core-workflow failure as P0/P1.

## Defects

### Confirmed in this run

None. The journey did not advance far enough to establish a product defect.

### Previously repaired and awaiting browser regression

- Global New Booking now enters the live Supabase Bookings form.
- Prototype role switching is removed.
- Unsupported direct session lifecycle mutations are removed; approved RPC actions remain.
- Obsolete Finance Mark Ready is removed.

## Validation Status

### Passed

- Local repaired app started.
- Automated Chrome opened the local app.
- Login screen rendered.
- Existing fictional Auth identities, profiles, memberships, roles, and tenant mappings were verified read-only.

### Failed

None were executed with valid authentication, so no functional step is classified as failed.

### Not tested

All authenticated steps 1–14 remain untested pending the owner credential action.

## Remaining P0/P1 Defects

- No P0 or P1 product defect was confirmed in this run.
- Authenticated browser acceptance remains a release-sign-off blocker.

## Files Changed

- `docs/mvp-pilot-e2e-validation.md` — current browser method, identity evidence, owner reset procedure, and acceptance status.

No application, migration, RLS, or Auth data was changed during this validation attempt.

## Final Validation

- `npm run build`: passed; existing Vite large-chunk warning remains.
- `git diff --check`: passed.
- Additional RLS checks: not required because this attempt changed no application permissions or database access.

## Release Decision

**NOT READY for controlled pilot sign-off.**

The sole currently evidenced blocker is completion of the authenticated browser journey. After the Product Owner privately resets one fictional Admin password, rerun this document's 14-step journey and record evidence before changing the release decision.

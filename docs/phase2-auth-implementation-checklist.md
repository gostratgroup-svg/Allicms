# Phase 2 Auth Implementation Checklist

Date: 2026-07-06  
Status: Preparation checklist only. No login UI, route guards, live workflow connections, or localStorage replacement are included in this step.

## Current Preparation Verification

- `src/lib/supabase.ts` imports `createClient` from `@supabase/supabase-js`.
- `src/lib/supabase.ts` reads `import.meta.env.VITE_SUPABASE_URL`.
- `src/lib/supabase.ts` reads `import.meta.env.VITE_SUPABASE_ANON_KEY`.
- `.env.example` contains:
  - `VITE_SUPABASE_URL=`
  - `VITE_SUPABASE_ANON_KEY=`
- `.gitignore` includes `.env`.
- No service-role key should be added to frontend env files.
- No patients, bookings, invoices, clinical data, documents, payments, or storage workflows are connected to Supabase in this step.
- localStorage prototype workflows remain unchanged.

## Supabase Auth Dashboard Settings To Configure

- Confirm Supabase Auth is enabled for the development project.
- Confirm email/password provider is enabled.
- Confirm email verification is enabled before production tenant access.
- Confirm password recovery emails are enabled.
- Configure sender name and email where available.
- Review email templates:
  - Confirm signup
  - Invite user
  - Magic link if used later
  - Reset password
  - Change email
- Confirm token expiry settings are appropriate.
- Confirm rate limits are acceptable for pilot testing.
- Confirm no service-role key is exposed in Vercel or frontend code.

## Local Env Verification

- Add full `VITE_SUPABASE_URL` to `.env`.
- Add full `VITE_SUPABASE_ANON_KEY` / publishable key to `.env`.
- Do not commit `.env`.
- Confirm `.env.example` remains blank and safe.
- Run the app locally and confirm the Supabase connection test does not show `not_configured`.
- Confirm no service-role key exists in `.env`, `.env.example`, source code, or docs.

## Vercel Env Verification

- Add `VITE_SUPABASE_URL` in Vercel project settings.
- Add `VITE_SUPABASE_ANON_KEY` in Vercel project settings.
- Confirm values are configured for the correct environment:
  - Development
  - Preview
  - Production when ready
- Do not add service-role keys to frontend Vercel variables.
- Redeploy after env variables are added.

## Redirect URLs

Configure Supabase Auth redirect URLs for:

- Local development URL, for example `http://127.0.0.1:5174`.
- Vercel preview URL pattern if needed.
- Production app URL: `https://app.allidesk.co.za`.
- Password reset callback route, once implemented.
- Email verification callback route, once implemented.
- Invite callback route, once implemented.

Recommended future callback paths:

- `/auth/callback`
- `/auth/reset-password`
- `/auth/verify-email`
- `/auth/invite`

## Login Implementation

- Create auth service/helper functions.
- Add session provider or auth context.
- Add login form with email and password.
- Call Supabase `signInWithPassword`.
- Show loading, error, and success states.
- Resolve profile after login.
- Resolve tenant memberships after profile load.
- Route to tenant shell, Super Admin shell, tenant selection, or no-workspace state.
- Do not connect patient, booking, invoice, or clinical workflows during the first login implementation.

## Logout Implementation

- Add logout action.
- Call Supabase `signOut`.
- Clear auth/profile/membership state.
- Clear active tenant selection state.
- Redirect to login.
- Do not clear prototype localStorage data.

## Password Reset Implementation

- Add forgot password screen.
- Call Supabase `resetPasswordForEmail`.
- Configure redirect URL.
- Add reset password screen.
- Validate recovery session.
- Allow user to set a new password.
- Show expired link and invalid session states.

## Profile Resolution

- Load `profiles` row by `auth.user.id`.
- If missing, route to profile creation/recovery.
- Allow user to complete basic profile fields.
- Do not allow frontend writes to `is_super_admin`.
- Do not allow frontend soft-delete of profile.
- Keep `profiles.id = auth.users.id`.

## Tenant Membership Resolution

- Load active `tenant_users` rows for the authenticated profile.
- Ignore inactive or soft-deleted memberships.
- Load tenant shell metadata only after membership is confirmed.
- If one tenant exists, select it automatically.
- If multiple tenants exist, show tenant selection.
- If none exist and user is not Super Admin, show a no-workspace state.

## Route Protection

- Add protected route wrapper or route guard.
- Public routes:
  - Login
  - Forgot password
  - Password reset
  - Auth callback
- Authenticated routes:
  - Tenant shell
  - Account/profile
  - Tenant selection
- Super Admin routes:
  - Dashboard
  - Tenant Management
  - Subscription Management
  - Support Centre
  - System Health
  - Platform Configuration
- Route guards improve UX, but RLS remains the security boundary.

## RLS Testing

- Create at least two test users.
- Create at least two test tenants.
- Add active `tenant_users` memberships.
- Confirm each user can read only their own profile and tenant membership.
- Confirm Tenant Admin can manage tenant users in their tenant.
- Confirm Finance can read tenant subscriptions where allowed.
- Confirm a user cannot access another tenant's tenant shell.
- Confirm non-Super Admin users cannot manage platform tables.
- Confirm Super Admin can access platform tables without gaining tenant operational data access.
- Confirm anonymous users cannot read protected tables.

## Implementation Gate Before Phase 3

Do not proceed to live tenant/practice/patient workflows until:

- Login works.
- Logout works.
- Session persistence works.
- Password reset works.
- Email verification behaviour is clear.
- Profile resolution works.
- Tenant membership resolution works.
- Role resolution works.
- Super Admin route protection works.
- Tenant route protection works.
- RLS has been tested with multiple users and tenants.
- `npm run build` passes.

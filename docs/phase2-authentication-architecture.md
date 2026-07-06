# Phase 2 Authentication Architecture

Date: 2026-07-06  
Status: Planning document only. No application code, SQL migrations, or workflow changes are introduced by this document.

This document defines the Phase 2 authentication and identity architecture for AlliDesk. It aligns with:

- `docs/allidesk-database-architecture-v1.md`
- `docs/architecture-decisions.md`
- `docs/project-roadmap.md`
- `docs/phase1-deployment-report.md`

Phase 2 should introduce authentication carefully without replacing current localStorage workflows or connecting operational app modules to live data yet.

## 1. Supabase Auth Architecture

AlliDesk will use Supabase Auth as the identity provider.

Core model:

```text
auth.users
|
+-- profiles
    |
    +-- tenant_users
        |
        +-- tenant role and active membership
```

Responsibilities:

- `auth.users`: Supabase-owned authentication identity.
- `profiles`: global application profile linked to `auth.users.id`.
- `tenant_users`: tenant membership, tenant role, and active/inactive state.
- `tenants`: tenant workspace metadata.
- `audit_events`: authentication-adjacent audit events where appropriate.

Important rule:

- One person has one `profile`.
- One `profile` can belong to multiple tenants through `tenant_users`.
- Never duplicate the same person as separate users per tenant.

Phase 2 should authenticate users and resolve identity, but it should not yet connect patient, booking, clinical, finance, or document workflows to live data.

## 2. Login Flow

Login should use Supabase email/password authentication first.

Required behaviour:

- User enters email and password.
- Supabase Auth validates credentials.
- App loads current session.
- App loads `profiles` row for `auth.user.id`.
- App loads active `tenant_users` memberships.
- App resolves active tenant.
- App resolves role for the active tenant.
- App routes user to the correct shell:
  - Super Admin shell if `profiles.is_super_admin = true` and Super Admin mode is selected.
  - Tenant app shell if active tenant membership exists.

Login should not expose tenant records before membership resolution has succeeded.

### Login Sequence Diagram

```text
User
 |
 | enters email/password
 v
AlliDesk App
 |
 | signInWithPassword()
 v
Supabase Auth
 |
 | returns session + auth user
 v
AlliDesk App
 |
 | fetch profile by auth.user.id
 v
profiles
 |
 | fetch active memberships
 v
tenant_users
 |
 | resolve active tenant + role
 v
Protected App Shell
```

## 3. Logout Flow

Logout should clear the Supabase session and local auth UI state.

Required behaviour:

- User clicks logout.
- App calls Supabase `signOut()`.
- App clears active tenant selection from local auth state.
- App clears any cached profile/membership state.
- App redirects to login.

Do not clear prototype localStorage data in Phase 2 unless the user explicitly requests it. Prototype data is still separate from production auth.

## 4. Session Persistence

Supabase client should use standard session persistence.

Expected behaviour:

- Session persists across browser refresh.
- On app load, auth state is checked before rendering protected routes.
- While the session is being resolved, show a loading state.
- If no valid session exists, show login.
- If a session exists but no profile exists, route to profile creation/recovery flow.
- If a profile exists but no tenant membership exists, route to a safe no-workspace state.

Security note:

- Never store service-role keys in the frontend.
- Only use `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` / publishable key in the app.

## 5. Password Reset Flow

Password reset should use Supabase Auth reset email.

Required behaviour:

- User enters email on "Forgot password".
- App calls Supabase password reset.
- Supabase sends password reset email.
- User opens reset link.
- App validates recovery session.
- User sets new password.
- App redirects to login or authenticated shell after successful reset.

### Password Reset Sequence Diagram

```text
User
 |
 | requests password reset
 v
AlliDesk App
 |
 | resetPasswordForEmail()
 v
Supabase Auth
 |
 | sends reset email
 v
User Email
 |
 | opens recovery link
 v
AlliDesk App
 |
 | validates recovery session
 | updates password
 v
Supabase Auth
 |
 | password updated
 v
Login / App Shell
```

## 6. Email Verification

Email verification should be enabled before production tenants use live auth.

Required behaviour:

- New users receive a verification email.
- Unverified users should not access tenant data.
- App should show a clear "Check your email" state.
- App should provide a resend verification action.
- Verified user can continue to membership resolution.

Recommended policy:

- Tenant Admin invitation can create or invite a user.
- User must verify email before accessing tenant workspace.
- Super Admin bootstrap should also use a verified email.

## 7. Tenant User Invitation Flow

Tenant user invitations should support Admin-created users for:

- admin
- receptionist
- therapist
- finance

Phase 2 should plan the flow before implementation. The current Phase 1 schema has `tenant_users` and invitation-related fields, but a future `user_invitations` table is still recommended by the master architecture.

Recommended invitation flow:

- Tenant Admin enters user's email, name, phone, and role.
- App creates or finds `profile` by auth identity only after invite acceptance, not by duplicating users.
- System sends Supabase invitation or magic link.
- User accepts invitation.
- User sets password if needed.
- App creates/updates `profiles`.
- App activates `tenant_users`.
- App records audit event.

### Invited User Onboarding Sequence Diagram

```text
Tenant Admin
 |
 | invites user with role
 v
AlliDesk App
 |
 | create invitation / auth invite
 v
Supabase Auth
 |
 | sends invite email
 v
Invited User
 |
 | opens invite link
 v
AlliDesk App
 |
 | verifies auth session
 | completes profile
 | activates tenant_users membership
 v
Tenant Workspace
```

Phase 2 implementation can start with a simpler flow:

- Create user through Supabase Auth.
- Create `profiles` row.
- Create `tenant_users` row.
- Require password reset or invite email.

Before production use, invitations should be hardened with an explicit `user_invitations` table.

## 8. Super Admin Authentication

Super Admin is a platform role, not a tenant role.

Current Phase 1 foundation:

- `profiles.is_super_admin` controls Super Admin access.
- Super Admin can manage platform metadata.
- Super Admin must not have default access to tenant patient, booking, clinical, document, or finance records.

Bootstrap rule:

- The first Super Admin must be created through a trusted service-role or direct database process.
- A normal frontend user must never be able to grant themselves Super Admin status.

Super Admin login flow:

- User logs in through Supabase Auth.
- App loads `profiles`.
- If `is_super_admin = true`, app may show Super Admin mode.
- If the user also has tenant memberships, tenant mode and Super Admin mode should be separate UI contexts.

## 9. Profile Creation

Profile creation links the Supabase Auth user to AlliDesk application identity.

Required profile fields for Phase 2:

- `id`
- `first_name`
- `last_name`
- `email`
- `phone`
- `is_super_admin`
- `created_at`
- `updated_at`
- `deleted_at`

Rules:

- `profiles.id` must equal `auth.users.id`.
- Users may create their own profile row with their own ID.
- Users may update only basic profile fields allowed by RLS/grants.
- Users may not set `is_super_admin`.
- Users may not soft-delete their profile from the frontend.

Expected edge states:

- Auth user exists but profile missing.
- Profile exists but is soft-deleted.
- Email changed in Auth but profile email stale.
- User has profile but no tenant memberships.

## 10. Tenant Membership Resolution

Tenant membership resolution determines which tenant workspaces the user can access.

Resolution process:

1. Load active session.
2. Load `profiles`.
3. Load active `tenant_users` rows where:
   - `profile_id = auth.user.id`
   - `is_active = true`
   - `deleted_at is null`
4. Join or fetch tenant shell records.
5. Filter out tenants with blocked statuses where needed:
   - `suspended`
   - `cancelled`
   - `archived`
6. Select active tenant.

Default active tenant rules:

- If exactly one active tenant membership exists, select it automatically.
- If multiple active memberships exist, show tenant selection.
- If no tenant membership exists and user is Super Admin, open Super Admin shell.
- If no tenant membership exists and user is not Super Admin, show no-workspace state.

## 11. Role Resolution

Tenant roles are resolved from `tenant_users.role`.

Current tenant roles:

- `admin`
- `receptionist`
- `therapist`
- `finance`

Role resolution should produce a simple app role:

- `admin` maps to Admin view.
- `receptionist` maps to Reception view.
- `therapist` maps to Therapist view.
- `finance` maps to Finance access.

Rules:

- Role is tenant-specific.
- A user may be Admin in one tenant and Therapist in another.
- Do not store tenant role on `profiles`.
- Route protection and UI access should use active tenant role.

## 12. Route Protection

Route protection should be added before live tenant workflows are connected.

Recommended route groups:

- Public:
  - login
  - forgot password
  - reset password
  - email verification callback
  - patient portal public/secure link routes, later
- Authenticated:
  - tenant app shell
  - settings
  - account/profile
  - tenant selection
- Super Admin:
  - platform dashboard
  - tenant management
  - subscription management
  - support centre
  - system health
  - platform configuration

Protection checks:

- Session exists.
- Email verified where required.
- Profile exists.
- Active membership exists for tenant routes.
- Active tenant role is allowed for the route.
- Super Admin flag is true for platform routes.

## 13. Multi-Tenant Switching For Future Support

Multi-tenant switching should be planned now but can be minimal in Phase 2.

Future behaviour:

- User opens tenant switcher.
- App lists active memberships.
- User selects tenant.
- App stores active tenant ID in safe local state.
- App reloads tenant-scoped data.
- RLS ensures only selected tenant data is queried.

### Tenant Selection Sequence Diagram

```text
Authenticated User
 |
 | has multiple tenant_users rows
 v
AlliDesk App
 |
 | fetch active tenant memberships
 v
Tenant Selection Screen
 |
 | user selects tenant
 v
AlliDesk App
 |
 | set active_tenant_id in app state
 | resolve role for tenant
 v
Tenant Workspace
```

Do not assume the first membership is always correct in production.

## 14. RLS Interaction

Authentication and RLS must work together.

Phase 1 helper functions:

- `is_super_admin()`
- `is_tenant_member(target_tenant_id uuid)`
- `has_tenant_role(target_tenant_id uuid, allowed_roles text[])`

Expected pattern:

- Frontend authenticates with Supabase Auth.
- Supabase sends user JWT with requests.
- RLS uses `auth.uid()` to match `profiles.id`.
- Tenant tables check active `tenant_users` membership.
- Role-specific policies check `tenant_users.role`.

Important rules:

- Frontend route protection improves UX but is not the security boundary.
- RLS is the security boundary.
- Super Admin policies must remain limited to platform data unless future audited support access is explicitly designed.

## 15. First-Time Onboarding Flow

There are two first-time onboarding paths.

### Tenant Admin Onboarding

Used when a new tenant is created.

Flow:

- Super Admin creates tenant shell.
- Super Admin invites Tenant Admin.
- Tenant Admin accepts invite.
- Tenant Admin verifies email.
- Tenant Admin completes profile.
- Tenant Admin lands in tenant workspace.
- Tenant Admin completes Practice Configuration.

### Tenant Staff Onboarding

Used when Tenant Admin adds a receptionist, therapist, or finance user.

Flow:

- Tenant Admin creates/invites user.
- User accepts invite.
- User verifies email.
- User completes profile.
- User lands in tenant workspace with assigned role.
- Therapist-specific professional setup can follow later.

First-time onboarding should not create patient or booking data.

## 16. Security Considerations

Key security rules:

- Never expose service-role keys in frontend or Vercel public variables.
- Use only anon/publishable key in the Vite app.
- Keep `profiles.is_super_admin` protected from client writes.
- Require email verification for production tenant access.
- Keep Super Admin and tenant workspaces logically separate.
- Do not rely only on frontend role checks.
- RLS must protect every live table.
- Treat invite links and password reset links as sensitive.
- Expire invitations.
- Record audit events for role changes, user activation/deactivation, tenant membership changes, and Super Admin actions.
- Do not connect patient/clinical data until auth and tenant resolution are stable.

## 17. Error States And Edge Cases

Expected error states:

- Invalid login credentials.
- Email not verified.
- Password reset link expired.
- Invite link expired.
- Auth user exists but profile row missing.
- Profile exists but is soft-deleted.
- User has no tenant memberships.
- User has multiple tenant memberships.
- Tenant membership is inactive.
- Tenant is suspended.
- Tenant is cancelled.
- Tenant is archived.
- User role is unknown or unsupported.
- Supabase session expired.
- Network connection fails during auth resolution.
- RLS denies a query.
- Super Admin flag exists but no platform route access is available due to policy mismatch.

Recommended handling:

- Show plain, actionable user messages.
- Log technical detail to developer console only in development.
- Avoid leaking whether a tenant or patient exists.
- Provide retry actions for network errors.
- Provide logout/reset path when auth state is inconsistent.

## 18. Recommended Implementation Order

Phase 2 should be implemented in small, reversible steps:

1. Confirm Supabase Auth settings in the development project.
2. Configure allowed URLs:
   - local dev URL
   - Vercel preview URL pattern if needed
   - `https://app.allidesk.co.za`
3. Confirm `.env` has full `VITE_SUPABASE_URL` and anon/publishable key locally.
4. Generate or update Supabase TypeScript types after Phase 1 is fully verified.
5. Create auth service/helper module.
6. Add session provider/auth context.
7. Add login screen.
8. Add logout action.
9. Add password reset screens.
10. Add profile loading and profile creation recovery flow.
11. Add tenant membership loading.
12. Add tenant selection state.
13. Add route guards.
14. Add Super Admin route guard.
15. Add basic audit events for auth-adjacent changes where supported by current schema.
16. Verify RLS behaviour with test users.
17. Keep existing localStorage app workflows untouched until auth shell is stable.

Do not start Phase 3 tenant/practice live-data work until:

- login works,
- logout works,
- session persistence works,
- password reset works,
- profile resolution works,
- tenant membership resolution works,
- role resolution works,
- Super Admin route protection works,
- tenant route protection works,
- RLS has been tested with at least two users and two tenant contexts.

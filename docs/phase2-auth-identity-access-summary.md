# Phase 2 Authentication, Identity And Access Summary

Date: 2026-07-06  
Status: Phase 2 foundation implemented. Operational modules remain prototype/localStorage-based.

## Executive Summary

Phase 2 established the AlliDesk authentication, identity resolution, tenant context, tenant switching, and authorization foundation.

The app can now:

- Sign in with Supabase Auth.
- Restore authenticated sessions on page refresh.
- Sign out safely.
- Resolve the authenticated user's `profiles` row.
- Resolve active `tenant_users` memberships.
- Load tenant shell records from `tenants`.
- Select a single active tenant automatically.
- Allow tenant selection/switching for users with multiple memberships.
- Allow Super Admin mode without requiring an active tenant.
- Display resolved identity context in the app shell.
- Preview broad role permissions through a centralized authorization layer.

Phase 2 intentionally does not connect operational modules such as patients, bookings, invoices, clinical notes, settings, documents, or finance workflows to Supabase yet.

## Implementation Files Reviewed

Core implementation:

- `src/auth/AuthContext.tsx`
- `src/auth/AppModeGuard.tsx`
- `src/auth/permissions.ts`
- `src/pages/Login.tsx`
- `src/main.tsx`
- `src/App.tsx`
- `src/styles.css`

Phase 2 documentation reviewed:

- `docs/phase2-authentication-architecture.md`
- `docs/phase2-auth-implementation-checklist.md`
- `docs/phase2-step2-auth-foundation.md`
- `docs/phase2-step3-login-ui.md`
- `docs/phase2-step4-auth-verification.md`
- `docs/phase2-step5-profile-tenant-resolution.md`
- `docs/phase2-step6-app-mode-guarding.md`
- `docs/phase2-step7-tenant-context-display.md`
- `docs/phase2-step8-tenant-switching-flow.md`
- `docs/phase2-step9-authorization-permission-foundation.md`
- `docs/phase2-step10-permission-aware-ui-preview.md`

## What Phase 2 Implemented

### Auth Foundation

`AuthContext` wraps the application and exposes:

- `user`
- `session`
- `loading`
- `signIn(email, password)`
- `signOut()`

The Supabase client uses:

- `persistSession: true`
- `autoRefreshToken: true`
- `detectSessionInUrl: true`

The app restores the session on page refresh through `supabase.auth.getSession()` and listens for auth state changes through `supabase.auth.onAuthStateChange()`.

### Login UI

`src/pages/Login.tsx` provides the first authentication screen.

It includes:

- Email field
- Password field
- Sign In button
- Forgot Password placeholder
- Loading state
- Friendly error handling
- AlliDesk branding

The Login component calls `signIn()` from `useAuth()` and does not call Supabase directly.

### Logout Verification

The authenticated app shell includes a Logout button.

Logout calls:

```ts
useAuth().signOut()
```

Logout clears the authenticated Supabase session and auth context state, then returns the user to the Login screen.

Prototype localStorage data is not cleared.

## Current Auth Flow

```text
User opens app
 |
 v
AuthProvider checks Supabase session
 |
 +-- no session --> Login screen
 |
 +-- session exists
       |
       v
     resolve profile
       |
       v
     resolve tenant memberships
       |
       v
     AppModeGuard selects safe render state
```

Render outcomes:

- Unauthenticated: Login screen
- Auth/session loading: loading screen
- Identity loading: resolving workspace screen
- Missing profile: safe "Profile not created yet" state
- No tenant membership: safe "No workspace assigned yet" state
- Multiple tenant memberships: tenant selection screen
- Super Admin: existing Super Admin app shell
- Tenant user: existing tenant app shell

## Profile Resolution

After a user is authenticated, `AuthContext` fetches:

```text
profiles where id = auth.user.id
```

If no profile exists:

- The app shows "Profile not created yet."
- The app does not create a profile automatically.

This is intentional. Profile creation should happen through a controlled onboarding/invitation flow in a future step.

## Tenant Membership Resolution

When a profile exists and is not Super Admin, `AuthContext` fetches active tenant memberships:

```text
tenant_users where profile_id = auth.user.id
and is_active = true
and deleted_at is null
```

The query also loads the related tenant shell record:

```text
tenant_users -> tenants
```

If no active tenant membership exists:

- The app shows "No workspace assigned yet."

If one active membership exists:

- That tenant is selected automatically.
- The membership role becomes the active role.

If multiple memberships exist:

- The app shows a tenant selection screen before entering the app shell.

## Active Tenant Handling

The active tenant is stored in `AuthContext` as:

```ts
activeTenant
```

The active role is stored as:

```ts
activeRole
```

The context exposes:

```ts
selectActiveTenant(tenantId)
```

Calling `selectActiveTenant()`:

- Finds the selected membership.
- Sets `activeTenant`.
- Sets `activeRole`.
- Clears identity errors.

The app topbar displays:

- Current user name/email
- Current resolved role
- Active tenant/practice name

For multi-tenant users, the app topbar shows a small workspace switcher.

## Super Admin Handling

Super Admin is resolved from:

```ts
profile.is_super_admin
```

When true:

- `activeRole` becomes `super_admin`.
- The app does not require `activeTenant`.
- The existing Super Admin app mode is allowed.
- The header shows platform context instead of tenant context.

The Super Admin role remains platform-only in design.

It should manage:

- Tenants
- Subscriptions
- Platform configuration
- Support
- System health

It should not browse tenant operational data such as patients, bookings, clinical notes, invoices, documents, or tenant finance records.

## App Mode Guard

`src/auth/AppModeGuard.tsx` centralizes the safe app render decision.

It prevents the app shell from rendering before the auth/identity state is known.

This keeps route/mode decisions separate from:

- `main.tsx`
- `App.tsx`
- Login UI
- Operational modules

## Tenant Context Display

`src/App.tsx` now reads resolved identity context from `AuthContext`.

It displays:

- User name from `profile.first_name` and `profile.last_name`
- Email fallback from `profile.email` or `user.email`
- Resolved role label
- Active tenant practice name
- Platform context for Super Admin

The visible identity display is safe because it only uses auth/profile/tenant shell metadata.

## Tenant Switching

Users with more than one tenant membership see a workspace switcher in the app topbar.

Rules:

- Hidden for Super Admin platform mode
- Hidden for users with only one tenant membership
- Shown only when more than one tenant membership exists

Switching tenants calls `selectActiveTenant(tenantId)` from `AuthContext`.

Because operational modules remain localStorage-based, tenant switching currently changes identity context only. It does not yet reload tenant-scoped operational data.

## Permission Foundation

`src/auth/permissions.ts` defines the authorization foundation.

It exports:

- `createAuthorization()`
- `useAuthorization()`

The authorization object exposes:

- `role`
- `isAuthenticated`
- `isSuperAdmin`
- `hasTenantContext`
- `permissions`
- `hasRole(...roles)`
- `hasPermission(...permissions)`
- `canAccess(area)`

Supported roles:

- `super_admin`
- `admin`
- `therapist`
- `receptionist`
- `finance`

Super Admin receives platform permissions only.

Tenant roles receive tenant workspace permissions only.

This preserves the AlliDesk privacy boundary:

```text
Super Admin manages the platform, not tenant customer or patient data.
```

## Permission Preview UI

The app currently includes a small permission foundation preview panel.

It shows:

- Active role
- Key permissions
- Future access preview for Patients, Bookings, Clinical, Finance, Reports, and Settings

This panel is informational only.

It does not:

- Hide navigation
- Disable buttons
- Block routes
- Enforce module access
- Connect operational data to Supabase

## Intentionally Not Connected Yet

The following modules still use prototype/localStorage data:

- Patients
- Patient Profile Link
- Bookings
- Booking calendar
- Session details
- Clinical notes
- Session planning
- Finance
- Invoices
- Statements
- Payment proof
- Practice settings
- Billing configuration
- Documents
- Reports
- Patient history

No operational production data workflows were connected during Phase 2.

## Known Temporary Or Prototype Areas

The following areas are intentionally temporary or prototype-level:

- Role preview switcher remains available for design testing.
- Permission preview panel is visible for development only.
- Finance role has permission definitions but no dedicated enforced app mode yet.
- Tenant switching updates identity context but not operational localStorage datasets.
- Missing-profile state does not create profiles automatically.
- Password reset link is still a placeholder.
- Invitation flow is not implemented yet.
- Route-level permission enforcement is not implemented yet.
- Generated Supabase database types still need to be refreshed once the schema is final and connected in the development environment.

## Security And RLS Boundary

Phase 2 did not alter RLS policies.

The current frontend identity resolution relies on Phase 1 policies:

- Users can read their own profile.
- Users can read their own active tenant memberships.
- Tenant members can read their tenant shell.
- Super Admin can access platform-level records.

Frontend authorization is a UX and route-control foundation only.

Database-level security must remain enforced through RLS as production data tables are introduced.

## Recommended Next Phase

Recommended Phase 3: Controlled Onboarding And User Lifecycle.

Suggested order:

1. Refresh generated Supabase database types from the live Phase 1 schema.
2. Implement profile bootstrap/admin-managed profile creation strategy.
3. Implement Tenant Admin invitation flow.
4. Implement password reset flow.
5. Implement email verification states.
6. Add route-level permission guards using `useAuthorization()`.
7. Hide or remove the temporary permission preview panel once real guards exist.
8. Start live-data migration with a low-risk domain, such as Practice Configuration or Platform Subscription Plans.

Operational modules should only move from localStorage to Supabase after onboarding, role resolution, and route permission behaviour are stable.

## Build Verification

`npm run build` should pass after Phase 2 Step 11.

The existing Vite large chunk warning is expected and is not a build failure.

# Phase 2 Step 5: Profile And Tenant Resolution

## Objective

Resolve the authenticated user's AlliDesk identity context after Supabase Auth succeeds, without connecting operational app data to Supabase.

## Files Modified

- `src/auth/AuthContext.tsx`
- `src/main.tsx`
- `src/App.tsx`
- `src/styles.css`

## Auth Context Additions

The existing `AuthContext` now exposes:

- `profile`
- `tenantMemberships`
- `activeTenant`
- `activeRole`
- `identityLoading`
- `identityError`
- `selectActiveTenant(tenantId)`

## Resolution Flow

When no Supabase user is authenticated:

- No identity lookup runs.
- The app continues to show the Login screen.

When a Supabase user is authenticated:

1. The app fetches the user's `profiles` row where `profiles.id = user.id`.
2. If no profile exists, the app shows a safe "Profile not created yet" state.
3. If the profile exists and `is_super_admin = true`, the existing app shell is allowed through and the current Super Admin mode remains available.
4. If the profile exists and is not Super Admin, active `tenant_users` memberships are loaded.
5. Tenant shell records are loaded through the related `tenants` records.
6. If one tenant membership exists, it is selected automatically.
7. If multiple tenant memberships exist, the app shows a simple tenant selection screen.
8. If no tenant memberships exist, the app shows "No workspace assigned yet."

## Temporary Identity Screens

`src/main.tsx` now includes temporary guarded states for:

- Resolving workspace
- Profile not created yet
- No workspace assigned yet
- Tenant selection
- Workspace could not be resolved

These states are intentionally simple and can be replaced once production onboarding and tenant switching are designed.

## Super Admin Handling

If `profile.is_super_admin` is true:

- `activeRole` becomes `super_admin`.
- The existing app shell renders.
- `src/App.tsx` switches the role preview to the existing Super Admin mode.

## What This Step Does Not Do

- Does not create profiles automatically.
- Does not create tenants.
- Does not create SQL migrations.
- Does not alter RLS policies.
- Does not connect patients, bookings, invoices, finance, clinical data, settings, or documents to Supabase.
- Does not replace localStorage prototype data.
- Does not implement invitations or password reset.

## RLS Notes

This implementation relies on the Phase 1 policies:

- Users can read their own profile.
- Users can read their own active tenant memberships.
- Tenant members can read their tenant shell.
- Super Admin access remains platform-oriented.

No RLS policy changes were made in this step.

## Verification

`npm run build` was run successfully after implementation.

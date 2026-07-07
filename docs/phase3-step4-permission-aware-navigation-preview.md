# Phase 3 Step 4: Permission-Aware Navigation Preview

## Objective

Use the existing authorization foundation to make tenant sidebar navigation visibility permission-aware without enforcing route-level blocking yet.

## Files Changed

- `src/App.tsx`
- `src/routes/appRoutes.tsx`
- `docs/phase3-step4-permission-aware-navigation-preview.md`

## What Was Implemented

Extended the central route configuration with permission metadata:

```ts
accessArea: AccessArea
```

Tenant sidebar navigation now filters route links through:

```ts
authorization.canAccess(route.accessArea)
```

This means users only see tenant navigation items that their active role is currently allowed to access according to `useAuthorization()`.

## Route Access Metadata

Current mappings:

- Dashboard -> `overview`
- Patients -> `patients`
- Appointments -> `bookings`
- Calendar -> `bookings`
- Clinical Notes -> `clinical`
- Documents -> `documents`
- Billing -> `finance`
- Finance -> `finance`
- Reports -> `reports`
- Team -> `settings`
- Settings -> `settings`

## Behaviour Preserved

Preserved:

- `AuthContext`
- `AppModeGuard`
- `AppShell`
- React Router routing
- Tenant switching
- Authorization foundation
- Permission preview panel
- Placeholder route rendering
- LocalStorage prototype data

## Important Boundary

This is navigation visibility only.

It does not:

- Block direct route access
- Enforce module permissions
- Redirect unauthorized users
- Connect modules to Supabase
- Alter RLS policies

Route-level enforcement should be implemented separately in a later step.

## Super Admin Navigation

Super Admin navigation remains separate and module-state based through `activeSuperAdminModule`.

The platform shell can be routed later when the Super Admin workspace is redesigned.

## Assumptions

The `Team` route currently maps to `settings` permissions because team/user management belongs to tenant administration settings in the current permission model.

The `Billing` route maps to `finance` permissions for now. A separate billing permission can be introduced when billing configuration and invoice workflows are split into production modules.

## Verification

`npm run build` passed after implementation.

The existing Vite large chunk warning remains a warning only.

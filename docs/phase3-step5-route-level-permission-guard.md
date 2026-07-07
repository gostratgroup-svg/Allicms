# Phase 3 Step 5: Route-Level Permission Guard

## Objective

Add safe route-level permission guarding using the existing route access metadata and authorization foundation.

## Files Changed

- `src/routes/appRoutes.tsx`
- `src/styles.css`
- `docs/phase3-step5-route-level-permission-guard.md`

## What Was Implemented

Added a reusable route guard inside the central route configuration file:

```tsx
ProtectedRoute
```

Each configured tenant route remains registered in React Router, but its rendered content is guarded by:

```ts
authorization.canAccess(route.accessArea)
```

If the current user cannot access the route, the route renders a safe placeholder:

```text
Access not allowed
```

## Behaviour

This step protects direct route rendering.

Example:

- A user without clinical access may not see Clinical Notes in sidebar navigation.
- If they manually open `/clinical-notes`, they see the safe "Access not allowed" placeholder instead of the page placeholder.

## Preserved Behaviour

Preserved:

- `AuthContext`
- `AppModeGuard`
- `AppShell`
- Tenant switching
- Super Admin handling
- Permission-aware sidebar visibility
- Route definitions
- Placeholder route pages
- LocalStorage prototype data

## Important Boundaries

This is still a foundation guard.

It does not:

- Connect operational modules to Supabase
- Replace localStorage prototype data
- Create SQL migrations
- Alter RLS policies
- Add module-specific production permissions
- Change Super Admin navigation

## Super Admin Navigation

Super Admin navigation remains separate and module-state based for now.

The route guard applies to tenant app routes only.

## Assumptions

The existing `accessArea` route metadata from Step 4 remains the source of truth for route access.

This frontend guard improves user experience and route safety, but database security must still be enforced through Supabase RLS when live operational tables are introduced.

## Verification

`npm run build` passed after implementation.

The existing Vite large chunk warning remains a warning only.

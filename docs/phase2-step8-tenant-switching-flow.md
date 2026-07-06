# Phase 2 Step 8: Tenant Switching Flow

## Objective

Allow authenticated users with multiple tenant memberships to switch their active tenant safely from the existing AlliDesk app UI.

## Files Changed

- `src/App.tsx`
- `src/styles.css`
- `docs/phase2-step8-tenant-switching-flow.md`

## What Was Implemented

A compact workspace switcher was added to the app topbar.

It is shown only when:

- The user has more than one `tenantMemberships` record.
- The user is not in Super Admin platform mode.

The switcher displays:

- The currently active tenant/practice.
- Each available tenant membership.
- The resolved role for each tenant option.

Changing the selected workspace calls:

```ts
selectActiveTenant(tenantId)
```

This keeps active tenant and active role updates inside `AuthContext`.

## Super Admin Behaviour

Super Admin users do not need an active tenant for platform mode.

The tenant switcher is hidden when:

```ts
activeRole === 'super_admin'
```

## Tenant User Behaviour

Tenant users with one tenant membership do not see the switcher.

Tenant users with multiple memberships can switch between workspaces from the topbar. After switching:

- `activeTenant` updates.
- `activeRole` updates.
- The topbar identity context updates.
- The existing app shell remains mounted.

## Explicitly Not Changed

- Patient workflows
- Booking workflows
- Invoice workflows
- Finance workflows
- Clinical data
- Settings data
- Document workflows
- LocalStorage prototype data
- SQL migrations
- RLS policies

## Assumptions

Operational prototype data still comes from localStorage, so switching tenants currently changes only the resolved identity context and header/account display. Tenant-scoped operational data loading will be introduced in a later phase.

## Verification

`npm run build` passed after implementation.

The existing Vite large chunk warning remains a warning only.

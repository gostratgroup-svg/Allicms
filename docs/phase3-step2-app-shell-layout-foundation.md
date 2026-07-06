# Phase 3 Step 2: App Shell Layout Foundation

## Objective

Create a reusable authenticated app shell layout around the Phase 3 routing foundation while preserving the existing authentication, identity, tenant, tenant switching, and authorization behaviour.

## Files Changed

- `src/App.tsx`
- `src/layout/AppShell.tsx`
- `docs/phase3-step2-app-shell-layout-foundation.md`

## Shell Structure Created

Created:

- `AppShell`
- `Sidebar`
- `Topbar`
- `MainContent`

File:

- `src/layout/AppShell.tsx`

The shell supports these slots:

- `topNotice`
- `sidebar`
- `topbar`
- `children`
- `modals`

Current render shape:

```text
AppShell
|
+-- top action notice
+-- Sidebar
+-- main
|   |
|   +-- Topbar
|   +-- MainContent
|       |
|       +-- permission preview
|       +-- routed content
|
+-- modal slot
```

## What Moved

The authenticated app shell wrapper moved from inline JSX in `src/App.tsx` into reusable layout components.

The following existing UI remains visually and behaviourally the same:

- Sidebar brand
- Sidebar navigation
- Super Admin platform note
- Topbar title and identity context
- Tenant switcher
- Role preview switcher
- Logout button
- New Booking button
- Permission preview panel
- Routed placeholder content
- New Booking modal

## Behaviour Preserved

Preserved:

- `AuthContext`
- `AppModeGuard`
- Supabase login/logout/session behaviour
- Profile resolution
- Tenant membership resolution
- Active tenant handling
- Tenant switching
- Authorization foundation
- Permission preview
- React Router route rendering inside the authenticated shell

## Explicitly Not Changed

- Patient workflows
- Booking workflows
- Invoice workflows
- Finance workflows
- Clinical notes
- Documents
- Settings persistence
- localStorage prototype data
- Supabase RLS
- SQL migrations

## Assumptions

This step is a structure extraction, not a visual redesign.

The current shell class names remain in use so existing styling remains stable. Future steps can improve the shell design once routing and module boundaries are settled.

## Verification

`npm run build` passed after implementation.

The existing Vite large chunk warning remains a warning only.

# Phase 2 Step 6: App Route And Mode Guarding

## Objective

Centralise the authenticated app entry decision so AlliDesk renders the correct experience from the resolved Supabase identity context.

## Files Changed

- `src/auth/AppModeGuard.tsx`
- `src/main.tsx`
- `src/App.tsx`
- `docs/phase2-step6-app-mode-guarding.md`

## What Was Implemented

Created `src/auth/AppModeGuard.tsx` as the single entry guard for the app.

The guard uses the existing `AuthContext` values:

- `user`
- `profile`
- `tenantMemberships`
- `activeTenant`
- `activeRole`
- `identityLoading`
- `identityError`
- `selectActiveTenant`

## Render Rules

The guard now renders one of these states:

- Unauthenticated user: `Login`
- Identity loading: resolving workspace screen
- Missing profile: safe "Profile not created yet" screen
- Identity error after membership lookup: safe error screen
- No tenant and not Super Admin: safe "No workspace assigned yet" screen
- Multiple tenants: tenant selector
- Super Admin: existing app shell in Super Admin mode
- Tenant user: existing app shell after `activeTenant` and `activeRole` are resolved

## App Shell Alignment

`src/App.tsx` now reads:

- `activeTenant`
- `activeRole`

The topbar tenant name uses `activeTenant.practice_name` when available.

The existing prototype role preview is aligned to resolved roles where matching app modes already exist:

- `super_admin` -> `Super Admin`
- `admin` -> `Admin`
- `receptionist` -> `Reception`
- `therapist` -> `Therapist`

## Assumptions

The Phase 2 database role `finance` exists, but the current prototype app shell does not yet have a dedicated Finance role mode. For now, finance users can pass the guard when their tenant membership resolves, but no finance-specific route permissions or UI mode were added in this step.

## Explicitly Not Changed

- Supabase login/logout/session behaviour
- LocalStorage prototype workflows
- Patient data
- Booking data
- Invoice data
- Finance workflows
- Clinical data
- Settings workflows
- SQL migrations
- RLS policies

## Verification

`npm run build` passed after implementation.

The existing Vite large chunk warning remains a warning only.

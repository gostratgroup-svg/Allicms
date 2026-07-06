# Phase 2 Step 7: Tenant Context Display And Safe UI Binding

## Objective

Display the resolved Supabase identity context inside the existing AlliDesk app shell without connecting operational modules to Supabase.

## Files Changed

- `src/App.tsx`
- `src/styles.css`
- `docs/phase2-step7-tenant-context-display.md`

## What Was Implemented

The app shell now safely displays:

- Current authenticated user's name when available
- Current authenticated user's email as a fallback
- Resolved role label
- Active tenant/practice name for tenant users
- Platform context for Super Admin users

The topbar now uses a compact `identity-context-pill` instead of the earlier temporary authenticated indicator.

## Identity Binding Rules

The UI reads these values from `AuthContext`:

- `user`
- `profile`
- `activeTenant`
- `activeRole`

Role labels are displayed safely:

- `super_admin` -> `Super Admin`
- `admin` -> `Admin`
- `receptionist` -> `Reception`
- `therapist` -> `Therapist`
- `finance` -> `Finance`
- unresolved fallback -> `Authenticated`

## Super Admin Behaviour

Super Admin mode does not require an active tenant.

When `activeRole` is `super_admin`:

- The header context shows `AlliDesk Platform`.
- The visible role label shows `Super Admin`.
- The existing Super Admin app mode remains available.

## Tenant User Behaviour

Tenant users display:

- The resolved tenant practice name from `activeTenant.practice_name`
- Their resolved role label from `activeRole`
- Their profile name or email

## Explicitly Not Changed

- Patient workflows
- Booking workflows
- Invoice workflows
- Finance workflows
- Clinical notes
- Settings workflows
- Documents
- LocalStorage prototype data
- SQL migrations
- RLS policies

## Assumptions

The current prototype still includes a role preview switcher for design/testing. Step 7 adds resolved identity context next to it but does not remove the switcher or enforce production route permissions yet.

The `finance` role is displayed safely as a role label, but a dedicated Finance-only app mode is still a future step.

## Verification

Run:

```bash
npm run build
```

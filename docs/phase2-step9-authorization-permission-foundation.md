# Phase 2 Step 9: Authorization And Permission Foundation

## Objective

Create a centralized permission layer that future AlliDesk modules can use to make access decisions based on the resolved authenticated identity context.

## Files Changed

- `src/auth/permissions.ts`
- `docs/phase2-step9-authorization-permission-foundation.md`

## What Was Implemented

Created `src/auth/permissions.ts`.

It defines:

- Role-based permissions
- Area access mappings
- A reusable `createAuthorization()` utility
- A reusable `useAuthorization()` hook

## Auth Context Values Used

The authorization layer consumes:

- `profile`
- `activeRole`
- `activeTenant`

## Roles Defined

The permission foundation supports:

- `super_admin`
- `admin`
- `therapist`
- `receptionist`
- `finance`

## Helper Methods

The exported authorization object exposes:

- `hasRole(...roles)`
- `hasPermission(...permissions)`
- `canAccess(area)`

It also exposes:

- `role`
- `isAuthenticated`
- `isSuperAdmin`
- `hasTenantContext`
- `permissions`

## Current Permission Direction

Super Admin permissions are platform-only:

- Platform dashboard
- Tenant management
- Subscription management
- Support centre
- System health
- Platform configuration

Tenant roles are tenant-workspace permissions only:

- Overview
- Users and practice configuration, where applicable
- Patients
- Bookings
- Clinical
- Finance
- Reports
- Documents
- Communication

## POPIA Boundary

The permission layer follows the AlliDesk privacy rule:

Super Admin manages the platform, not tenant customer or patient data.

This means `super_admin` can access platform areas but does not receive tenant operational permissions from this foundation.

## Not Enforced Yet

This step does not enforce permissions throughout the app.

Future modules should consume `useAuthorization()` instead of creating local role checks.

## Explicitly Not Changed

- Patient workflows
- Booking workflows
- Invoice workflows
- Finance workflows
- Clinical notes
- Settings data
- Document workflows
- LocalStorage prototype data
- SQL migrations
- RLS policies

## Assumptions

The permission names are intentionally broad for Phase 2. They can be refined into more granular actions when the production modules move from localStorage to Supabase-backed data.

The `finance` role has finance management permissions but no dedicated app mode is enforced yet.

## Verification

`npm run build` passed after implementation.

The existing Vite large chunk warning remains a warning only.

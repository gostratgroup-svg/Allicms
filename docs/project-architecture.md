# AlliDesk Project Architecture

Date: 2026-07-06  
Status: Current architecture index before Phase 3.

## 1. Current Architecture Overview

AlliDesk is a React and TypeScript single-page application hosted through Vercel, with Supabase selected as the production backend.

The current app has two important layers:

- Production foundation: Supabase client configuration, authentication, identity resolution, tenant context, and authorization foundation.
- Prototype operational layer: patients, bookings, finance, settings, clinical notes, reports, invoices, statements, and patient portal experiences still run from local React state and localStorage.

This separation is intentional. Authentication and identity are being stabilized first before operational modules move to live Supabase data.

High-level shape:

```text
AlliDesk App
|
+-- Supabase Auth
|   |
|   +-- profiles
|   +-- tenant_users
|   +-- tenants
|
+-- App Mode Guard
|   |
|   +-- Login
|   +-- Identity states
|   +-- Tenant selector
|   +-- Super Admin shell
|   +-- Tenant app shell
|
+-- Prototype Modules
    |
    +-- Overview
    +-- Bookings
    +-- Patients
    +-- Finances
    +-- Settings
    +-- Patient Link
```

## 2. Authentication Flow

Authentication is handled by Supabase Auth through `src/auth/AuthContext.tsx`.

Flow:

```text
Browser loads app
|
v
AuthProvider calls supabase.auth.getSession()
|
+-- no session
|   |
|   v
| Login screen
|
+-- session exists
    |
    v
  user/session stored in AuthContext
    |
    v
  identity resolution starts
```

The login UI is implemented in `src/pages/Login.tsx`.

The login component:

- Collects email and password.
- Calls `signIn(email, password)` from `useAuth()`.
- Does not call Supabase directly.

Logout:

- Lives in the authenticated app shell.
- Calls `useAuth().signOut()`.
- Clears Supabase auth state.
- Does not clear localStorage prototype data.

## 3. Identity Resolution Flow

Identity resolution runs after Supabase Auth returns an authenticated user.

Implemented in:

- `src/auth/AuthContext.tsx`
- `src/auth/AppModeGuard.tsx`

Flow:

```text
Authenticated Supabase user
|
v
fetch profiles where id = auth.user.id
|
+-- no profile
|   |
|   v
| Profile not created yet
|
+-- profile exists
    |
    +-- is_super_admin = true
    |   |
    |   v
    | Super Admin app mode
    |
    +-- is_super_admin = false
        |
        v
      fetch active tenant_users memberships
        |
        +-- no memberships -> No workspace assigned yet
        +-- one membership -> auto-select active tenant
        +-- many memberships -> tenant selection screen
```

`AuthContext` exposes:

- `profile`
- `tenantMemberships`
- `activeTenant`
- `activeRole`
- `identityLoading`
- `identityError`
- `selectActiveTenant(tenantId)`

## 4. Authorization Flow

Authorization foundation lives in:

- `src/auth/permissions.ts`

It provides:

- `createAuthorization()`
- `useAuthorization()`

The authorization layer consumes:

- `profile`
- `activeRole`
- `activeTenant`

It exposes:

- `hasRole(...roles)`
- `hasPermission(...permissions)`
- `canAccess(area)`

Current supported roles:

- `super_admin`
- `admin`
- `therapist`
- `receptionist`
- `finance`

Important boundary:

```text
Super Admin manages the platform, not tenant customer or patient data.
```

The permission foundation is currently previewed in the UI but not enforced across modules yet.

## 5. Multi-Tenant Architecture

AlliDesk is designed around tenant isolation.

Current identity model:

```text
auth.users
|
+-- profiles
    |
    +-- tenant_users
        |
        +-- tenants
```

Rules:

- `profiles` is the global auth-linked user profile.
- `tenant_users` links one profile to one or more tenants.
- `tenant_users.role` defines the role inside a tenant.
- `tenants` stores tenant shell/platform metadata.
- One person should not be duplicated as separate users per tenant.
- Operational tenant tables in future phases must include `tenant_id`.
- RLS must remain the production enforcement layer for data isolation.

Super Admin:

- Does not require `activeTenant`.
- Uses `profile.is_super_admin`.
- Should not receive default access to tenant operational data.

Tenant users:

- Must have an active tenant membership.
- Can switch tenants if multiple memberships exist.

## 6. Current Project Folder Structure

Current source tree:

```text
src/
|
+-- App.tsx
+-- main.tsx
+-- styles.css
+-- vite-env.d.ts
|
+-- auth/
|   |
|   +-- AppModeGuard.tsx
|   +-- AuthContext.tsx
|   +-- permissions.ts
|
+-- lib/
|   |
|   +-- database.types.ts
|   +-- supabase.ts
|
+-- pages/
    |
    +-- Login.tsx
```

Current Supabase structure:

```text
supabase/
|
+-- migrations/
|   |
|   +-- 202607060001_phase1_platform_identity.sql
|
+-- .temp/
    |
    +-- local Supabase CLI link metadata
```

Current documentation structure includes:

- Architecture decisions
- Current data audit
- Database architecture blueprint
- Phase 1 database review/deployment docs
- Phase 2 authentication and identity docs
- Roadmap and release history

## 7. Major Contexts

### AuthContext

File:

- `src/auth/AuthContext.tsx`

Responsibilities:

- Supabase session loading
- Auth state listener
- Login
- Logout
- Profile resolution
- Tenant membership resolution
- Active tenant state
- Active role state
- Tenant switching function
- Safe identity error/loading state

### AppModeGuard

File:

- `src/auth/AppModeGuard.tsx`

Responsibilities:

- Central app render decision
- Login vs authenticated shell
- Loading states
- Missing profile state
- No workspace state
- Tenant selector
- Super Admin shell access
- Tenant shell access

## 8. Major Utilities

### Supabase Client

File:

- `src/lib/supabase.ts`

Responsibilities:

- Reads `VITE_SUPABASE_URL`
- Reads `VITE_SUPABASE_ANON_KEY`
- Creates Supabase client
- Configures auth session persistence
- Provides simple connection test

### Authorization Utility

File:

- `src/auth/permissions.ts`

Responsibilities:

- Defines permission names
- Defines access areas
- Maps roles to permissions
- Exposes `createAuthorization()`
- Exposes `useAuthorization()`
- Keeps role/permission logic centralized

### Database Types

File:

- `src/lib/database.types.ts`

Current status:

- Placeholder/minimal typing exists.
- Should be regenerated from Supabase once schema and project environments are stable.

## 9. Current Development Phases Completed

### Prototype Product Build

Completed:

- Overview workspace
- Booking calendar
- New Booking flow
- Patient profile workspace
- Patient link prototype
- Notes, session planning, feedback, history
- Finance workflow prototype
- Invoice and statement PDF layout prototype
- Settings configuration areas
- Super Admin prototype modules
- AlliDesk rebrand

### Phase 1: Platform And Identity Database Foundation

Completed:

- Supabase client setup
- Phase 1 SQL migration for:
  - `platform_configurations`
  - `subscription_plans`
  - `tenants`
  - `profiles`
  - `tenant_users`
  - `tenant_subscriptions`
  - `audit_events`
- RLS foundation
- Deployment and review documentation

### Phase 2: Authentication, Identity And Access Foundation

Completed:

- Auth architecture
- Auth provider
- Login UI
- Logout
- Session persistence
- Profile resolution
- Tenant membership resolution
- App mode guarding
- Tenant context display
- Tenant switching
- Authorization foundation
- Permission preview UI
- Phase 2 summary

## 10. Remaining Roadmap

Recommended next sequence:

1. Refresh generated Supabase database types from the live Phase 1 schema.
2. Implement controlled profile creation/bootstrap.
3. Implement tenant admin invitation flow.
4. Implement password reset flow.
5. Implement email verification states.
6. Add route-level permission enforcement using `useAuthorization()`.
7. Remove or hide temporary permission preview UI.
8. Connect a low-risk module to Supabase first, such as Practice Configuration.
9. Add live tenant-scoped data access layer.
10. Move Patients, Bookings, Clinical, Finance, and Documents in controlled phases.

Future domains still to build:

- Patient portal authentication model
- Practice configuration live data
- Scheduling live data
- Patient database live data
- Clinical note versioning
- Finance/invoice/statement persistence
- File storage
- Communication logs
- Reports
- AI assistant safety model
- Automation and integrations

## 11. Coding Conventions Followed

Current conventions:

- React with TypeScript.
- Functional components and hooks.
- Auth state kept in `AuthContext`.
- Route/mode decisions centralized in `AppModeGuard`.
- Permission logic centralized in `permissions.ts`.
- Supabase access isolated through `src/lib/supabase.ts` and auth context.
- Prototype operational state remains in local component state/localStorage.
- No service-role keys in frontend code.
- Environment variables use Vite `VITE_` prefix.
- Database naming conventions use snake_case.
- Future tenant-scoped database tables must include `tenant_id`.
- Future production security must rely on RLS, not frontend checks alone.

UI conventions:

- Keep controls compact and task-focused.
- Use existing AlliDesk brand colours.
- Avoid redesigning full screens during backend foundation work.
- Add temporary development UI only when clearly marked.

## 12. Future Module Integration Principles

When moving modules from prototype to production:

1. Keep module data tenant-scoped.
2. Use `activeTenant` as the tenant context.
3. Use `useAuthorization()` for UI and route decisions.
4. Keep RLS as the real data protection layer.
5. Do not let Super Admin access tenant patient, clinical, booking, document, or finance data by default.
6. Introduce database tables through reviewed migrations only.
7. Preserve immutable financial snapshots for invoices and statements.
8. Preserve clinical note version history.
9. Add audit events for meaningful create, update, delete, role, consent, booking, invoice, payment, and document actions.
10. Migrate one domain at a time and keep localStorage fallback/prototype behaviour separate from production data access.

Suggested first live-data module:

- Practice Configuration, because it is tenant-scoped, operationally important, and lower risk than patients, bookings, clinical notes, or finance.

Suggested next after that:

- Users/invitations
- Billing configuration reference data
- Bookings
- Patients
- Clinical notes
- Finance

## Related Documents

- `docs/architecture-decisions.md`
- `docs/project-roadmap.md`
- `docs/release-history.md`
- `docs/allidesk-current-data-audit.md`
- `docs/allidesk-database-architecture-v1.md`
- `docs/phase2-auth-identity-access-summary.md`

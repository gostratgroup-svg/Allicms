# Phase 3: Application Shell Foundation Summary

## Status

Phase 3 completed the routed application shell foundation for AlliDesk. The app now has a scalable authenticated shell, permission-aware navigation, guarded routed placeholders, shared UI primitives, responsive behaviour, and a consolidated design token foundation.

Operational modules are intentionally not connected to Supabase yet. Existing prototype/localStorage workflows remain untouched.

## What Phase 3 Implemented

Phase 3 implemented:

- React Router application routing
- Reusable authenticated `AppShell`
- Sidebar navigation using central route metadata
- Permission-aware navigation visibility
- Route-level permission guarding
- Shared loading, empty, error and access-denied states
- Reusable `PageHeader` with breadcrumbs
- Structured static Dashboard framework
- Topbar user/account menu
- Topbar notification placeholder
- Shared UI primitives
- Reusable list-page placeholder pattern
- Structured static Settings framework
- Responsive shell and mobile bottom navigation behaviour
- Design-system CSS tokens and shared visual patterns

## Current App Shell Architecture

The authenticated app shell is composed from:

- `src/layout/AppShell.tsx`
  - `AppShell`
  - `Sidebar`
  - `Topbar`
  - `MainContent`

- `src/App.tsx`
  - Builds the sidebar navigation.
  - Builds the topbar.
  - Renders the permission preview panel.
  - Renders either the Super Admin prototype workspace or routed tenant workspace.

- `src/routes/appRoutes.tsx`
  - Owns central route metadata.
  - Renders route elements.
  - Applies route-level permission guard.
  - Selects placeholder page patterns.

The shell still preserves the older prototype modules in `src/App.tsx` while newer production-ready routed placeholders are introduced route by route.

## Route Structure

Current tenant routes:

| Path | Route | Access area | Placeholder pattern |
| --- | --- | --- | --- |
| `/dashboard` | Dashboard | `overview` | dashboard framework |
| `/patients` | Patients | `patients` | list placeholder |
| `/appointments` | Appointments | `bookings` | list placeholder |
| `/calendar` | Calendar | `bookings` | simple placeholder |
| `/clinical-notes` | Clinical Notes | `clinical` | simple placeholder |
| `/documents` | Documents | `documents` | list placeholder |
| `/billing` | Billing | `finance` | list placeholder |
| `/finance` | Finance | `finance` | list placeholder |
| `/reports` | Reports | `reports` | list placeholder |
| `/team` | Team | `settings` | list placeholder |
| `/settings` | Settings | `settings` | settings framework |

The root route redirects to `/dashboard`.

## Navigation And Permissions

Permissions are centralised in:

`src/auth/permissions.ts`

The permission layer exposes:

- `permissions`
- `hasRole(...)`
- `hasPermission(...)`
- `canAccess(...)`

Current role groups:

- `super_admin`
- `admin`
- `therapist`
- `receptionist`
- `finance`

Sidebar navigation uses `canAccess(route.accessArea)` to show only routes available to the active tenant role.

Route-level guarding uses the same `accessArea` metadata. If a user navigates directly to a route they cannot access, the route renders the shared `AccessDeniedState`.

Super Admin navigation remains separate for now and continues to use the existing platform workspace mode.

## Shared Components Available

### Shell And Navigation

- `AppShell`
- `Sidebar`
- `Topbar`
- `MainContent`
- `UserAccountMenu`
- `NotificationMenu`

### Page Structure

- `PageHeader`
- `ListPagePlaceholder`
- `DashboardPage`
- `SettingsPage`

### UI State

- `LoadingState`
- `EmptyState`
- `ErrorState`
- `AccessDeniedState`

### UI Primitives

Defined in `src/components/ui.tsx`:

- `Card`
- `Button`
- `StatusBadge`
- `SearchBar`

## Dashboard Framework

The Dashboard route now includes static placeholder sections for:

- welcome summary
- KPI cards
- upcoming appointments
- recent activity
- quick actions

The Dashboard remains disconnected from live data and does not read operational localStorage state.

## Settings Framework

The Settings route now includes static configuration sections for:

- Practice profile
- Team & roles
- Billing settings
- Clinical settings
- Communication settings
- Security & access

Settings are not connected to Supabase yet.

## Responsive Shell

Responsive support now includes:

- desktop left sidebar
- tablet/mobile fixed bottom navigation strip
- horizontally scrollable navigation on smaller screens
- wrapping topbar on tablet
- stacked topbar on mobile
- horizontally scrollable topbar actions
- one-column dashboard, settings and list placeholder layouts on mobile

## Design-System Tokens

`src/styles.css` now includes tokens for:

- brand colours
- semantic surfaces
- borders
- focus states
- status colours
- typography
- spacing
- border radius
- shadows

The newer shared components and placeholders use these tokens where safe.

## Temporary And Prototype Areas

The following areas remain intentionally temporary:

- Existing operational workflows still use local React state and localStorage.
- Patient, booking, finance, invoice, clinical note and settings workflows are not connected to Supabase.
- The permission preview panel is still visible for development.
- The prototype role preview dropdown remains visible.
- Super Admin modules still use existing prototype state and layout.
- `database.types.ts` is still a placeholder and has not yet been regenerated from Supabase.
- Some legacy CSS remains in the large `src/styles.css` file and can be migrated gradually.

## Known Warnings

`npm run build` continues to pass, but Vite reports the existing large chunk warning:

- Some chunks are larger than 500 kB after minification.

This is not a build failure. It should be addressed later with route/module code splitting once operational modules are separated.

## Readiness For Phase 4

The application is ready to begin Phase 4 because:

- authentication and identity resolution exist
- tenant context exists
- authorization helpers exist
- routing is centralised
- permission-aware navigation exists
- route guards exist
- placeholder page patterns exist
- reusable UI primitives exist
- responsive shell behaviour exists
- settings and dashboard shells are prepared for future live data

Phase 4 can now start replacing static placeholders with one production module at a time.

## Recommended Phase 4 Starting Point

Recommended Phase 4 starting point:

**Tenant Practice Foundation**

Suggested order:

1. Create production Supabase tables for tenant practice configuration.
2. Generate current Supabase TypeScript types.
3. Create a small typed data access layer for practice configuration only.
4. Connect the Settings → Practice profile area first.
5. Keep all other modules on placeholders/localStorage until the practice foundation is stable.

Reason:

Practice configuration is low-risk compared with patients, clinical notes, finance and bookings. It establishes tenant-scoped live data patterns, RLS validation, forms, save states and audit readiness before handling sensitive operational records.

# Phase 3 Step 7: Page Header And Breadcrumb Foundation

## Objective

Create a reusable page header pattern for routed tenant workspace pages while preserving the existing authentication, identity, tenant switching, authorization, and prototype data behaviour.

## Files Created

- `src/components/PageHeader.tsx`

## Files Modified

- `src/routes/appRoutes.tsx`
- `src/styles.css`

## Component Added

### `PageHeader`

`PageHeader` supports:

- page title
- short description
- optional breadcrumb trail
- optional action slot

Breadcrumbs use React Router `Link` when a route target is provided, so routed navigation stays inside the single-page application.

## Where It Is Used

The current placeholder routed pages now render inside a shared page frame:

- `Dashboard`
- `Patients`
- `Appointments`
- `Calendar`
- `Clinical Notes`
- `Documents`
- `Billing`
- `Finance`
- `Reports`
- `Team`
- `Settings`

The route-level access denied state also uses the same page frame so blocked direct-route navigation keeps the same header and breadcrumb context.

## Route Metadata

Page titles and descriptions are derived from the central `appRoutes` configuration. This keeps page chrome consistent and avoids duplicating display copy across placeholder pages.

## Behaviour Preserved

This step does not:

- connect operational modules to Supabase
- replace localStorage prototype data
- create SQL migrations
- alter RLS policies
- redesign the app shell
- change authentication, identity, tenant switching, or authorization logic

## Assumptions

- `Workspace / Current Page` is sufficient breadcrumb context for the placeholder route layer.
- Future production modules can pass route-specific action buttons into `PageHeader` through the existing action slot.

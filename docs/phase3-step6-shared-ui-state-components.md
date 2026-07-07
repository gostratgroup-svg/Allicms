# Phase 3 Step 6: Shared UI State Components

## Objective

Create reusable UI state components for consistent loading, empty, error, and access-denied states across AlliDesk.

## Files Changed

- `src/components/UiState.tsx`
- `src/routes/appRoutes.tsx`
- `src/styles.css`
- `docs/phase3-step6-shared-ui-state-components.md`

## Components Created

Created:

- `LoadingState`
- `EmptyState`
- `ErrorState`
- `AccessDeniedState`

File:

- `src/components/UiState.tsx`

## Where Components Are Used

Route placeholders now use:

- `EmptyState`

Route-level permission denial now uses:

- `AccessDeniedState`

This replaces the previous route-level local "Access not allowed" placeholder markup.

## Styling

Added shared `.ui-state-panel` styles.

The previous `.route-placeholder-panel` styles remain as a compatibility alias while routed pages transition to shared state components.

Additional state variants:

- `.access-denied-state-panel`
- `.error-state-panel`
- `.loading-state-panel`

## Explicitly Not Changed

- Auth behaviour
- Route permission logic
- Sidebar permission visibility
- Operational module data
- Supabase data connections
- localStorage prototype data
- SQL migrations
- RLS policies

## Assumptions

These components are intentionally simple foundation components. Future module pages can add richer actions, illustrations, or contextual copy as needed without creating one-off state layouts.

## Verification

`npm run build` passed after implementation.

The existing Vite large chunk warning remains a warning only.

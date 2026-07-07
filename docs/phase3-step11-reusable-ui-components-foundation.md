# Phase 3 Step 11: Reusable UI Components Foundation

## Objective

Create a small reusable UI component foundation for future routed modules without redesigning the full application or connecting operational data.

## Files Created

- `src/components/ui.tsx`

## Files Modified

- `src/pages/Dashboard.tsx`
- `src/styles.css`

## Components Created

### `Card`

Reusable surface component for module panels, dashboard cards and future workspace sections.

### `Button`

Reusable button component with simple variants:

- `primary`
- `secondary`
- `ghost`

### `StatusBadge`

Reusable pill/badge component with tone variants:

- `neutral`
- `success`
- `warning`
- `danger`
- `info`

### `SearchBar`

Reusable labelled search input for future list views and module filters.

## Where Components Are Used

The safe static Dashboard placeholder now uses:

- `Card` for welcome, KPI and dashboard panels
- `Button` for quick action placeholders
- `StatusBadge` for framework/status labels

`SearchBar` has been created for upcoming module list pages but is not yet used because the current routed placeholders do not include search-driven content.

## Behaviour Preserved

This step does not:

- redesign the full UI
- connect operational modules to Supabase
- connect patients, bookings, invoices, finance, clinical notes, reports or communication modules
- replace localStorage prototype data
- create SQL migrations
- alter RLS policies

## Assumptions

- The dashboard placeholder layer is the safest place to introduce shared UI primitives first.
- The larger prototype screens should be migrated to these components gradually in future steps rather than through a broad refactor.

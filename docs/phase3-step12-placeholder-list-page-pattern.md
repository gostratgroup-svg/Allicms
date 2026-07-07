# Phase 3 Step 12: Placeholder List Page Pattern

## Objective

Create a reusable list-page placeholder pattern for future routed modules while keeping all content static and disconnected from operational data.

## Files Created

- `src/components/ListPagePlaceholder.tsx`

## Files Modified

- `src/routes/appRoutes.tsx`
- `src/styles.css`

## Component Created

### `ListPagePlaceholder`

The component supports:

- title
- description
- search placeholder
- empty state copy
- optional primary action label

It uses the shared `Card`, `Button`, `StatusBadge`, and `SearchBar` primitives from `src/components/ui.tsx`.

## Where It Is Used

The list-page placeholder pattern is now used for:

- Patients
- Appointments
- Documents
- Billing
- Finance
- Reports
- Team

The following routes remain simple placeholders because the list pattern does not yet fit their intended future shape:

- Calendar
- Clinical Notes
- Settings

Dashboard continues to use the structured dashboard framework from Step 8.

## Route Metadata

`appRoutes` now includes optional placeholder metadata:

- `placeholderPattern`
- `searchPlaceholder`
- `emptyState`
- `primaryActionLabel`

This keeps routed placeholder behavior centralised and avoids duplicating list-page configuration.

## Behaviour Preserved

This step does not:

- connect real data
- connect Supabase operational modules
- connect patients, bookings, invoices, finance, clinical notes, reports, documents or communication modules
- replace localStorage prototype data
- create SQL migrations
- alter RLS policies

## Assumptions

- The primary action buttons are visual placeholders only and should not trigger workflows yet.
- Search input state is local to the placeholder component and intentionally does not query or filter any real records.

# Phase 3 Step 8: Dashboard Framework Placeholder

## Objective

Replace the simple routed Dashboard placeholder with a structured static dashboard framework that can later receive live tenant data safely.

## Files Created

- `src/pages/Dashboard.tsx`

## Files Modified

- `src/routes/appRoutes.tsx`
- `src/styles.css`

## Dashboard Sections Created

The Dashboard route now includes static placeholder sections for:

- welcome summary
- KPI cards
- upcoming appointments
- recent activity
- quick actions

## Implementation Notes

- The Dashboard page is rendered through the existing routed page frame and keeps the shared `PageHeader` and breadcrumb pattern.
- The Dashboard route uses static placeholder arrays only.
- Placeholder text avoids real patient, booking, finance, clinical, report, or tenant operational data.
- Other routed modules continue using the shared empty placeholder state.

## Behaviour Preserved

This step does not:

- connect Supabase operational data
- connect patients, bookings, invoices, finance, clinical notes, reports, or documents
- replace localStorage prototype data
- create SQL migrations
- alter RLS policies
- change authentication, identity, tenant switching, or authorization logic

## Assumptions

- The dashboard should show a production-ready layout skeleton before real module data is connected.
- Quick action buttons are visual placeholders only in this step and intentionally do not trigger workflows yet.

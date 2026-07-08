# Phase 4 Step 7: Practice Locations UI And Data Connection

## What Was Implemented

Added the Practice Locations management screen for active tenant locations.

The new route is:

- `/practice/locations`

The Practice hub now links the `Locations` card to this route.

## Data Operations

The page uses the existing Supabase client and active tenant context.

Implemented operations:

- Select all non-deleted `practice_locations` rows for the active tenant
- Create a new practice location for the active tenant
- Update an existing practice location for the active tenant
- Mark a location active or inactive using the existing `is_active` field
- Mark a location as the main location using the existing `is_main_location` field

No separate rooms, calendars, bookings, or operational scheduling logic was implemented.

## Fields Supported

- Location name
- Location type
- Address line 1
- Address line 2
- Suburb / area
- City
- Province
- Postal code
- Country
- Contact email
- Contact phone
- Room / venue notes
- Main location
- Active / inactive status

## Files Changed

- `src/pages/PracticeLocations.tsx`
- `src/pages/Practice.tsx`
- `src/routes/appRoutes.tsx`
- `src/styles.css`

## Permission Assumption

The existing permission framework does not yet have a separate `tenant.practice.view` permission.

This step follows the existing practice settings pattern:

- Route access: `settings`
- Edit permission: `tenant.practice.configure`

Users without `tenant.practice.configure` see the locations page as read-only if they can access the route through the current guard.

## Known Limitations

- No hard delete or soft delete action is exposed in the UI.
- No room model was created; room and venue details remain notes only.
- No calendar or booking workflow consumes locations yet.
- No audit event write is emitted from the frontend yet.
- The database unique constraint allows only one main location per active tenant, so changing main locations may require future UX handling when multiple rows exist.

## Next Recommended Step

Implement Practice Banking Details or Practice Branding next, using the same pattern:

1. Add a hidden Practice sub-route.
2. Link the relevant Practice hub card.
3. Load active tenant rows.
4. Add create/update support.
5. Keep the page tenant-scoped and permission-aware.

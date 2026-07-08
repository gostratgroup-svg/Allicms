# Phase 4 Step 6: Practice Profile UI And Data Connection

## What Was Implemented

Added the first live Practice Foundation screen for tenant practice profile management.

The new route is:

- `/practice/profile`

The Practice hub now links the `Practice Profile` card to this route.

The page loads the active tenant's current row from `practice_profiles`. If no row exists, it shows an editable empty form. Saving creates the first profile for the active tenant. If a row exists, the form is populated and saving updates that row.

## Data Operations

The screen uses the existing Supabase client and active tenant context.

Implemented operations:

- Select active practice profile by `tenant_id` where `deleted_at is null`
- Insert a new `practice_profiles` row for the active tenant
- Update the existing `practice_profiles` row for the active tenant

No other Practice Foundation tables were connected.

## Files Changed

- `src/pages/PracticeProfile.tsx`
- `src/pages/Practice.tsx`
- `src/routes/appRoutes.tsx`
- `src/App.tsx`
- `src/components/SectionHubPage.tsx`
- `src/styles.css`

## Permission Assumption

The existing permission framework does not yet have a separate `tenant.practice.view` permission.

This step uses the closest approved pattern:

- Route access: `settings`
- Edit permission: `tenant.practice.configure`

Users without `tenant.practice.configure` see the form as read-only if they can access the route through the current guard.

## Known Limitations

- No locations, branding, billing settings, banking details, or communication templates are connected yet.
- No audit event write is emitted from the frontend yet.
- No optimistic updates or realtime subscription is implemented.
- Form validation is intentionally light and relies on database constraints plus simple required defaults.
- Super Admin platform access is not exposed through this tenant screen.

## Next Recommended Step

Implement Practice Locations using the same pattern:

1. Add `/practice/locations`.
2. Link the Locations card from the Practice hub.
3. Load locations by active `tenant_id`.
4. Add create/update support with active/inactive handling.
5. Keep the page tenant-scoped and permission-aware.

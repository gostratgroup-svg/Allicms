# Phase 4 Step 10: Practice Branding UI And Data Connection

## What Was Implemented

Added the active tenant Practice Branding configuration screen.

The new route is:

- `/practice/branding`

The Practice hub now links the `Branding` card to this route.

## Data Operations

The page uses the existing Supabase client and active tenant context.

Implemented operations:

- Select the active tenant's non-deleted `practice_branding` row
- Create a `practice_branding` row when none exists
- Update the existing `practice_branding` row

No file upload, storage integration, invoice rendering, document rendering, or patient-link rendering was connected in this step.

## Fields Supported

- Patient-facing display name
- Logo URL / path
- Primary colour
- Secondary colour
- Accent colour
- Invoice logo position
- Statement logo position
- Document branding enabled
- Patient Link branding enabled
- Communication branding enabled
- Metadata notes

## Preview

The page includes a static preview card showing:

- Patient-facing display name
- Logo path text
- Primary colour header band
- Primary, secondary and accent colour swatches

The preview does not render uploaded files yet.

## Permission Handling

This route uses the existing `settings` access pattern.

View access follows the closest current practice/settings permission model:

- `tenant.practice.configure`
- or `tenant.users.manage` through the existing `settings` access area

Editing requires:

- `tenant.practice.configure`

## Files Changed

- `src/pages/PracticeBranding.tsx`
- `src/pages/Practice.tsx`
- `src/routes/appRoutes.tsx`
- `src/components/ui.tsx`
- `src/styles.css`

## Known Limitations

- No file upload is implemented.
- No Supabase Storage integration is implemented.
- Invoice and statement rendering do not consume branding yet.
- Patient Link rendering does not consume branding yet.
- No audit event write is emitted from the frontend yet.

## Next Recommended Step

Implement Communication Templates next, then complete a short Practice Foundation review before moving toward operational workflows.

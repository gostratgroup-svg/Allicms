# Phase 4 - Step 13: Therapist Profiles UI

## Objective

Implement the first therapist management screen for the Practice Foundation. This step connects the app to the Phase 4 therapist profile tables without introducing bookings, therapist banking, operational calendars, or workflow automation.

## What Was Implemented

- Added the `/practice/therapists` route.
- Linked the Therapists card on the Practice hub to the new route.
- Added read/create/update support for `therapist_profiles`.
- Added basic read/create/update support for `professional_registrations`.
- Added a therapist list and editor layout consistent with the existing Practice screens.
- Added registration management inside the selected therapist edit view.
- Added safe optional linked-user selection when tenant user records are readable.

## Data Operations

The page loads tenant-scoped, non-deleted records from:

- `therapist_profiles`
- `professional_registrations`

The page can insert and update:

- therapist profile fields such as display name, profession, qualifications, practice number and billing details
- professional registration fields such as registration body, registration number, validity dates, primary status and active status

When a registration is marked as primary, the UI clears other primary registrations for the same therapist before saving the selected registration as primary.

## Permission Assumption

View access uses the new `practice_team` access area, backed by:

- `tenant.team.view`
- `tenant.practice.configure`

Edit access requires:

- `tenant.practice.configure`

This keeps therapist profile editing aligned with practice administration while allowing tenant members with team visibility to view therapist profiles.

Linked user/profile selection is only attempted when the current user has:

- `tenant.users.manage`

This avoids relying on profile reads that may be restricted by RLS.

## Known Limitations

- Therapist-owned bank accounts are not implemented.
- Therapist-specific billing automation is not implemented.
- Booking provider relationships are not implemented.
- Calendar availability and appointment assignment are not connected.
- Profile display names for linked users are not resolved yet; the selector uses role and profile id only.

## Next Recommended Step

The next Practice Foundation step should introduce the Team/User management screen or begin Price List and Procedure configuration, depending on whether identity administration or billing setup is the next priority.

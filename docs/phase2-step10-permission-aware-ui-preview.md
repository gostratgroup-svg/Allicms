# Phase 2 Step 10: Permission-Aware UI Preview

## Objective

Use the authorization foundation to preview role permissions in the app UI without enforcing access control across prototype modules yet.

## Files Changed

- `src/App.tsx`
- `src/styles.css`
- `docs/phase2-step10-permission-aware-ui-preview.md`

## What Was Implemented

Added a small permission foundation preview panel below the app topbar.

The panel uses:

```ts
useAuthorization()
```

It displays:

- Active resolved role
- A short list of key permissions available to that role
- Future area access preview for:
  - Patients
  - Bookings
  - Clinical
  - Finance
  - Reports
  - Settings

## Behaviour

The preview is informational only.

It does not:

- Hide navigation items
- Disable buttons
- Block routes
- Change module rendering
- Change localStorage data
- Connect any operational data to Supabase

## Why This Exists

This gives a visible development checkpoint for the permission model before access is enforced in future modules.

Future modules should use `useAuthorization()` and permission helpers instead of implementing local role logic.

## Explicitly Not Changed

- Patient workflows
- Booking workflows
- Invoice workflows
- Finance workflows
- Clinical notes
- Reports
- Settings data
- Documents
- LocalStorage prototype data
- SQL migrations
- RLS policies

## Assumptions

This is a preview/debug foundation panel and is not intended as final production UI.

Permissions are still broad Phase 2 permissions. More granular action-level permissions can be added when each module is connected to production data.

## Verification

`npm run build` passed after implementation.

The existing Vite large chunk warning remains a warning only.

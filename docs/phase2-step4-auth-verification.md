# Phase 2 Step 4: Authentication Verification

## Objective

Verify the Supabase authentication foundation inside the existing AlliDesk application shell without changing prototype data workflows.

## Files Modified

- `src/App.tsx`
- `src/styles.css`

## Authenticated State

The existing application shell now reads the authenticated Supabase user through `useAuth()`.

When Supabase Auth returns an authenticated user:

- The existing app shell renders as before.
- No profile records are loaded.
- No tenant membership records are loaded.
- No patient, booking, invoice, finance, clinical, or settings data is connected to Supabase.
- Existing localStorage prototype workflows remain untouched.

## Temporary Developer UI

A temporary authenticated user indicator was added to the topbar.

It shows:

- Authenticated status
- Current authenticated email, when available

This UI is for development verification only and can be removed or replaced once production user and tenant resolution is implemented.

## Logout Flow

The topbar now includes a Logout button.

The button calls:

```ts
useAuth().signOut()
```

After logout:

- Supabase clears the authenticated session.
- `AuthContext` receives the auth state change.
- The app returns to the Login screen.
- Prototype localStorage data is not cleared.

## Explicitly Not Implemented

- Profile loading
- Tenant user loading
- Tenant resolution
- Role resolution from Supabase
- Tenant switching
- Route permissions
- Password reset
- Invitations
- Any production data migration away from localStorage

## Verification

Run:

```bash
npm run build
```

The build must pass before continuing to the next phase step.

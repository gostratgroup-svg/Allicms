# Phase 2 Step 2 Auth Foundation

Date: 2026-07-06  
Status: Implemented authentication foundation only.

This step prepares AlliDesk for Supabase Authentication without adding login UI, route protection, live workflow data loading, or replacing existing localStorage prototype workflows.

## Files Created

### `src/auth/AuthContext.tsx`

Created a reusable authentication provider and hook.

Exports:

- `AuthProvider`
- `useAuth`

The provider exposes:

- `user`
- `session`
- `loading`
- `signIn(email, password)`
- `signOut()`

## Files Modified

### `src/main.tsx`

Wrapped the existing `<App />` with `<AuthProvider>`.

This keeps the current app shell and navigation unchanged while making auth state available for future steps.

### `src/lib/supabase.ts`

Updated Supabase Auth client options to support authentication foundation behaviour:

- `persistSession: true`
- `autoRefreshToken: true`
- `detectSessionInUrl: true`

The client still reads:

- `import.meta.env.VITE_SUPABASE_URL`
- `import.meta.env.VITE_SUPABASE_ANON_KEY`

No service-role key is used or exposed.

### `src/styles.css`

Added a small loading state style for auth session resolution:

- `.auth-resolving-screen`

## Exported Context

`AuthContext` is internal to `src/auth/AuthContext.tsx`.

It provides the following shape:

```ts
{
  user,
  session,
  loading,
  signIn,
  signOut,
}
```

The context is intentionally accessed through `useAuth()` rather than exported directly.

## Exported Hook

### `useAuth()`

Use this hook inside React components wrapped by `AuthProvider`.

It returns:

- `user`: current Supabase Auth user or `null`
- `session`: current Supabase Auth session or `null`
- `loading`: `true` while the initial session is resolving
- `signIn(email, password)`: wrapper around Supabase `signInWithPassword`
- `signOut()`: wrapper around Supabase `signOut`

If used outside `AuthProvider`, it throws an error so incorrect usage is caught during development.

## Auth Lifecycle

### App Load

```text
App starts
|
+-- AuthProvider mounts
|
+-- If Supabase is not configured:
|   |
|   +-- loading = false
|   +-- current app renders unchanged
|
+-- If Supabase is configured:
    |
    +-- supabase.auth.getSession()
    |
    +-- restore session if available
    |
    +-- set user/session
    |
    +-- loading = false
    |
    +-- current app renders unchanged
```

### Auth State Changes

```text
Supabase auth event
|
+-- onAuthStateChange receives next session
|
+-- AuthProvider updates session
|
+-- AuthProvider updates user
|
+-- loading = false
```

### Sign In

```text
signIn(email, password)
|
+-- supabase.auth.signInWithPassword()
|
+-- Supabase emits auth state change
|
+-- AuthProvider receives session
|
+-- user/session become available
```

No login UI has been added yet. This method is prepared for Step 3.

### Sign Out

```text
signOut()
|
+-- supabase.auth.signOut()
|
+-- AuthProvider clears session and user
```

The existing prototype/localStorage data is not cleared.

## What Was Not Changed

- No login UI was created.
- No logout button was added.
- No route protection was added.
- No app navigation was changed.
- No patient data was connected to Supabase.
- No booking data was connected to Supabase.
- No invoice, finance, or clinical data was connected to Supabase.
- No settings workflows were connected to Supabase.
- localStorage workflows remain unchanged.

## Build Verification

Command run:

```bash
npm run build
```

Result:

- Build passed.
- Existing Vite large chunk warning remains.

## What Remains For Step 3

Recommended next step: Login UI and basic auth screens.

Step 3 should include:

- Login screen
- Login form state
- Call `useAuth().signIn`
- User-friendly login errors
- Logout action placement
- Forgot password entry point
- Basic auth route/screen switching

Step 3 should still avoid:

- Connecting patients/bookings/invoices/clinical data to Supabase
- Replacing localStorage workflows
- Creating new production tables unless explicitly requested

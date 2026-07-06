# Phase 3 Step 1: Application Routing Foundation

## Objective

Introduce a scalable React Router foundation inside the authenticated AlliDesk application shell while preserving the existing authentication, identity, tenant, tenant switching, and authorization behaviour.

## Files Changed

- `package.json`
- `package-lock.json`
- `src/main.tsx`
- `src/App.tsx`
- `src/routes/appRoutes.tsx`
- `src/styles.css`
- `docs/phase3-step1-application-routing-foundation.md`

## Dependency Added

Installed:

```text
react-router-dom
```

## Routing Structure

The app is now wrapped in:

```tsx
<BrowserRouter>
  <AuthProvider>
    <AppModeGuard />
  </AuthProvider>
</BrowserRouter>
```

This preserves the existing auth and identity order:

```text
BrowserRouter
|
+-- AuthProvider
    |
    +-- AppModeGuard
        |
        +-- Login / identity states / authenticated app shell
```

## Central Route Configuration

Created:

- `src/routes/appRoutes.tsx`

It exports:

- `appRoutes`
- `getRouteForPath(pathname)`
- `AppRoutes`

Routes currently defined:

- `/dashboard`
- `/patients`
- `/appointments`
- `/calendar`
- `/clinical-notes`
- `/documents`
- `/billing`
- `/finance`
- `/reports`
- `/team`
- `/settings`

The root route redirects to:

```text
/dashboard
```

Unknown routes redirect to:

```text
/dashboard
```

## Placeholder Pages

Each route renders a simple placeholder page with:

- Page title
- Short placeholder description

These placeholders intentionally do not load operational data.

## Existing Shell Behaviour Preserved

The route content renders inside the existing authenticated app shell.

Preserved:

- `AuthContext`
- `AppModeGuard`
- Supabase login
- Logout
- Session persistence
- Profile resolution
- Tenant membership resolution
- Active tenant display
- Tenant switching
- Authorization foundation
- Permission preview
- New Booking modal shell action

## Prototype Data Boundary

No operational module was connected to Supabase.

No localStorage workflows were replaced.

Existing prototype modules remain in the codebase but are no longer the primary routed content for this foundation step.

## Deployment Note

The project already includes `vercel.json` with an SPA rewrite to `index.html`, which supports direct BrowserRouter route loads on Vercel.

## Explicitly Not Changed

- Supabase RLS
- SQL migrations
- Patient data
- Booking data
- Invoice data
- Finance data
- Clinical notes
- Documents
- Settings persistence
- localStorage prototype state

## Assumptions

This step creates the routing foundation first. Future steps can progressively move real module implementations behind these routes.

The existing prototype screen logic remains available in the codebase as a reference while Phase 3 modules are rebuilt or connected one route at a time.

## Verification

`npm run build` passed after implementation.

The existing Vite large chunk warning remains a warning only.

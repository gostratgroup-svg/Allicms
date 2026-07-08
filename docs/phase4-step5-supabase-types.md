# Phase 4 Step 5: Supabase Database Types

## Objective

Update the local TypeScript Supabase database types so the Phase 4 Practice Foundation tables are available to the app.

## Type Source

The existing project used `src/lib/database.types.ts` as the local Supabase type file. Before this step it contained a placeholder schema.

The local type file was updated from the approved Phase 1 and Phase 4 migration files.

## Supabase CLI Generation

The attempted generation command was:

```bash
npx supabase gen types typescript --linked --schema public
```

In this local environment the command stalled while fetching/running the Supabase CLI package, so the checked-in type file was updated from the migration schema instead.

When the developer environment has the Supabase CLI available, the preferred regeneration command is:

```bash
npx supabase gen types typescript --linked --schema public > src/lib/database.types.ts
```

## Phase 4 Tables Confirmed

The local type file now includes:

- `practice_profiles`
- `practice_locations`
- `bank_accounts`
- `practice_branding`
- `billing_settings`
- `communication_templates`

## Data Boundary

This step did not connect live practice data, add UI forms, implement CRUD, change RLS policies, or modify workflows.

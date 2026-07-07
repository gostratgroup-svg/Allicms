# Initial Super Admin Bootstrap

## Purpose

The production login for `gostratgroup@gmail.com` authenticates successfully, but the app shows:

`Profile not created yet`

That means Supabase Auth has the user in `auth.users`, but AlliDesk does not yet have the matching application profile in `public.profiles`.

This bootstrap creates the first Super Admin profile safely and manually.

## Important Safety Notes

- Do not create this from the frontend.
- Do not add auto-profile creation yet.
- Do not alter RLS policies.
- Do not create tenant operational data.
- Run the SQL only in a trusted admin database context, such as the Supabase SQL editor.
- This is a one-time bootstrap for the first AlliDesk Super Admin.

## Source Of Truth

The Phase 1 migration defines `public.profiles` as:

- `id uuid primary key references auth.users(id)`
- `first_name text`
- `last_name text`
- `email text`
- `phone text`
- `is_super_admin boolean not null default false`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz`

The frontend currently resolves Super Admin mode from:

`profiles.is_super_admin = true`

## SQL Script

Use:

`docs/initial-super-admin-bootstrap.sql`

The script:

1. Finds the existing `auth.users` row for `gostratgroup@gmail.com`.
2. Inserts the matching `public.profiles` row if missing.
3. Updates the existing profile if it already exists.
4. Sets:
   - `first_name = 'Gerhard'`
   - `last_name = 'Olivier'`
   - `email = auth.users.email`
   - `is_super_admin = true`
   - `deleted_at = null`

## Verification

After running the script, verify:

```sql
select id, first_name, last_name, email, is_super_admin, deleted_at
from public.profiles
where lower(email) = lower('gostratgroup@gmail.com');
```

Expected result:

- One row is returned.
- `is_super_admin` is `true`.
- `deleted_at` is `null`.

After logging in again, AlliDesk should resolve the profile and allow the Super Admin app mode.

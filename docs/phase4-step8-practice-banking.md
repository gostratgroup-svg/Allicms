# Phase 4 Step 8: Practice Banking Details UI And Data Connection

## What Was Implemented

Added tenant-owned Practice Banking Details management.

The new route is:

- `/practice/banking`

The Practice hub now links the `Banking Details` card to this route.

## Data Operations

The page uses the existing Supabase client and active tenant context.

Implemented operations:

- Select all non-deleted tenant-owned `bank_accounts` rows for the active tenant
- Filter strictly to `owner_type = 'tenant'` and `owner_id is null`
- Create a new tenant-owned bank account
- Update an existing tenant-owned bank account
- Mark a bank account active or inactive using `is_active`
- Mark a bank account as default using `is_default`

Therapist-owned and location-owned bank accounts are intentionally not connected yet.

## Fields Supported

- Bank name
- Account holder
- Account number
- Branch code
- Account type
- Default account
- Active / inactive status

## Default Account Behaviour

The database supports one active default account per owner.

When a user marks an account as default, the UI first clears `is_default` from other non-deleted tenant-owned accounts for the active tenant, then saves the selected account as default.

If clearing the previous default fails, the save is stopped and the error is shown to the user.

## Files Changed

- `src/pages/PracticeBanking.tsx`
- `src/pages/Practice.tsx`
- `src/routes/appRoutes.tsx`
- `src/auth/permissions.ts`

## Permission Assumption

The existing permission framework did not have a dedicated banking access area.

This step adds a route access area for practice banking that allows users with either:

- `tenant.finance.view`
- `tenant.practice.configure`

Editing requires the closest existing finance/admin permissions:

- `tenant.finance.manage`
- or `tenant.practice.configure`

## Known Limitations

- No billing settings are connected to the default bank account yet.
- No therapist-owned bank accounts are connected.
- No location-owned bank accounts are connected.
- No hard delete or soft delete action is exposed in the UI.
- No audit event write is emitted from the frontend yet.

## Next Recommended Step

Connect Billing Settings after banking details, because `billing_settings.default_bank_account_id` can later point to one of these tenant-owned accounts.

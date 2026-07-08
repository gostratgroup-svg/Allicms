# Phase 4 Step 9: Billing Configuration UI And Data Connection

## What Was Implemented

Added the active tenant Billing Configuration screen.

The new route is:

- `/practice/billing`

The Practice hub now links the `Billing Configuration` card to this route.

## Data Operations

The page uses the existing Supabase client and active tenant context.

Implemented operations:

- Select the active tenant's non-deleted `billing_settings` row
- Select active tenant-owned `bank_accounts` for default bank account selection
- Create a `billing_settings` row when none exists
- Update the existing `billing_settings` row

This step does not generate invoice numbers, statements, invoices, or billing documents.

## Fields Supported

- Invoice prefix
- Next invoice number
- Statement prefix
- Next statement number
- Payment terms days
- Default bank account
- Allow therapist billing overrides
- Allow therapist bank account overrides
- Allow therapist practice number overrides

## Bank Account Selection Behaviour

The default bank account dropdown loads active tenant-owned accounts only:

- `owner_type = 'tenant'`
- `owner_id is null`
- `is_active = true`
- `deleted_at is null`

If no active tenant-owned bank accounts exist, the dropdown shows that no active accounts are available.

## Validation

The form validates:

- Invoice prefix cannot be empty
- Statement prefix cannot be empty
- Next invoice number must be a positive integer
- Next statement number must be a positive integer
- Payment terms days must be a positive integer

Payment terms defaults to `7`.

## Permission Handling

The route uses a dedicated `practice_billing` access area.

View access allows users with either:

- `tenant.finance.view`
- `tenant.practice.configure`

Edit access requires either:

- `tenant.finance.manage`
- `tenant.practice.configure`

## Schema Note

The current `billing_settings` table includes:

- `allow_therapist_billing`
- `allow_therapist_bank_accounts`
- `allow_price_override`
- `metadata`

There is no dedicated column for therapist practice number overrides. To avoid changing the schema in this step, the UI stores `allow_therapist_practice_number_overrides` inside `billing_settings.metadata`.

## Files Changed

- `src/pages/PracticeBilling.tsx`
- `src/pages/Practice.tsx`
- `src/routes/appRoutes.tsx`
- `src/auth/permissions.ts`
- `src/styles.css`

## Known Limitations

- Invoice and statement records are not implemented yet.
- Invoice and statement numbers are not consumed by workflows yet.
- Billing settings are not connected to invoice generation yet.
- No audit event write is emitted from the frontend yet.
- Default bank account selection depends on accounts created in `/practice/banking`.

## Next Recommended Step

Implement Practice Branding or Communication Templates next, then return to operational finance workflows once Practice Foundation configuration is stable.

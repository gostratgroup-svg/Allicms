# Phase 4B - Step 16: Price Lists Migration

## Objective

Add the database foundation for AlliDesk Price Lists and Procedure Line Items.

This step creates the schema only. It does not build UI, connect bookings, connect invoices, implement price list workflows, or modify operational modules.

## Migration File

`supabase/migrations/202607080003_phase4b_price_lists.sql`

## Tables Created

### `price_lists`

Stores tenant-owned price lists such as:

- Cash Rates
- Medical Aid Rates
- School Rates
- Contract Rates

Fields include:

- `id`
- `tenant_id`
- `name`
- `description`
- `list_type`
- `is_default`
- `is_active`
- `metadata`
- `deleted_at`
- `created_at`
- `updated_at`

### `price_list_items`

Stores billable procedure/service line items for each price list.

Fields include:

- `id`
- `tenant_id`
- `price_list_id`
- `procedure_name`
- `procedure_code`
- `description`
- `price`
- `duration_minutes`
- `is_active`
- `metadata`
- `deleted_at`
- `created_at`
- `updated_at`

## Constraints Added

### `price_lists`

- Name must not be blank.
- Price list names are unique per tenant where not deleted.
- Only one default price list can exist per tenant where not deleted.

### `price_list_items`

- Procedure name must not be blank.
- Procedure code must not be blank when supplied.
- Price must be greater than or equal to zero.
- Duration must be null or greater than zero.
- Active procedure codes cannot be duplicated inside the same price list where not deleted.

## Indexes Added

### `price_lists`

- `price_lists_tenant_id_idx`
- `price_lists_is_default_idx`
- `price_lists_is_active_idx`
- `price_lists_deleted_at_idx`
- `price_lists_unique_name_per_tenant_idx`
- `price_lists_one_default_per_tenant_idx`

### `price_list_items`

- `price_list_items_tenant_id_idx`
- `price_list_items_price_list_id_idx`
- `price_list_items_procedure_code_idx`
- `price_list_items_is_active_idx`
- `price_list_items_deleted_at_idx`
- `price_list_items_unique_active_code_per_list_idx`

## RLS Policies Added

Row Level Security is enabled on:

- `price_lists`
- `price_list_items`

Policies allow:

- `admin` and `finance` tenant roles to read price lists and items.
- `admin` and `finance` tenant roles to create price lists and items.
- `admin` and `finance` tenant roles to update price lists and items.

No delete policies were added. Soft delete should be handled by updating `deleted_at`.

## Permission Mapping

The approved app-level permission model is:

- View: `tenant.finance.view` or `tenant.practice.configure`
- Edit: `tenant.finance.manage` or `tenant.practice.configure`

The current database RLS foundation stores tenant roles, not granular permission strings. Therefore, this migration maps those permissions conservatively to:

- `admin`
- `finance`

The application permission layer can continue to expose richer permissions while RLS protects tenant boundaries at the database layer.

## Updated At Triggers

The migration uses the existing `public.set_updated_at()` convention for:

- `price_lists`
- `price_list_items`

## Type Updates

Local TypeScript database types were updated in:

`src/lib/database.types.ts`

New table types:

- `price_lists`
- `price_list_items`

New relationship type:

- `PriceListRelationship`

## Architecture Notes

- ICD-10 remains patient-level.
- Price list items are not ICD-10 records.
- Future bookings will select one or more price list items.
- Future invoices will snapshot selected procedure item details.
- Booking and invoice integration is intentionally not implemented in this step.

## Known Limitations

- No UI exists yet.
- No seed data exists yet.
- No booking workflow uses these tables yet.
- No invoice workflow uses these tables yet.
- No service package model exists yet.
- No medical aid claim logic exists yet.

## Next Recommended Step

Phase 4B Step 17 should update or verify database types after applying the migration to Supabase, then the UI can be added in a later step.

# Phase 4B - Step 17: Price Lists UI

## Objective

Implement Price Lists management with procedure line items.

This step connects the Finance area to the Phase 4B `price_lists` and `price_list_items` tables. It does not connect bookings, invoices, patient ICD-10, statements, or operational workflow logic.

## Route Added

`/finance/price-lists`

The Finance hub Price Lists card now links to this route.

## Data Operations

The page loads tenant-scoped, non-deleted records from:

- `price_lists`
- `price_list_items`

The page supports create and update for price lists:

- Name
- Description
- List type
- Is default
- Is active

The page supports create and update for procedure line items:

- Procedure name
- Procedure code
- Description
- Price
- Duration minutes
- Is active

## Default Price List Behaviour

When a price list is marked as default, the UI first clears `is_default` on other non-deleted price lists for the active tenant, then saves the selected list as default.

This mirrors the database constraint that allows only one default price list per tenant.

## Validation

Price list validation:

- Price list name is required.

Procedure item validation:

- Procedure name is required.
- Price cannot be negative.
- Duration must be positive if supplied.

## Permission Handling

View access uses the route access area:

- `practice_billing`

Editing requires:

- `tenant.finance.manage` or `tenant.practice.configure`

This matches the approved Phase 4B permission model:

- View: `tenant.finance.view` or `tenant.practice.configure`
- Edit: `tenant.finance.manage` or `tenant.practice.configure`

## Active Tenant Safety

The page requires an active tenant before querying or saving data. All reads and writes are scoped by `tenant_id`.

## Known Limitations

- Bookings do not select price list items yet.
- Invoices are not generated from price list items yet.
- Patient ICD-10 is not implemented yet.
- No delete UI is implemented; inactive and future soft-delete behaviour should be used instead.
- Procedure packages are not implemented.
- Medical aid tariff logic is not implemented.

## Next Recommended Step

The next operational step should connect price lists into the future booking form once the Booking Foundation tables exist.

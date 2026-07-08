# Phase 4B - Step 15: Price Lists Architecture

## Goal

Price Lists will become the tenant-scoped source of truth for billable procedures and services used by AlliDesk during bookings, invoice generation, statements, reporting, and future medical aid workflows.

This document is an architecture specification only. It does not introduce migrations, UI, source code, or workflow changes.

## 1. Price Lists

Price Lists are owned by a tenant/practice. A tenant can maintain multiple price lists for different billing contexts.

Examples:

- Cash Rates
- Medical Aid Rates
- School Rates
- Contract Rates
- Assessment Rates
- Internal/Pro Bono Rates

Each price list should support:

- tenant ownership through `tenant_id`
- name
- description
- active/inactive status
- default list handling
- optional metadata for future pricing rules
- soft delete

### Default List Handling

Only one active default price list should exist per tenant. The default list should be used when a booking is created unless the user chooses another list.

If a user marks a list as default, the system should clear the previous default list for the same tenant.

## 2. Procedure Line Items

Each price list contains procedure line items. These line items describe billable services or procedures that can later be selected during bookings and invoice creation.

Required fields:

- procedure name
- procedure code
- description
- price
- duration minutes if appropriate
- active/inactive status

Duration should be optional because not every procedure has its own time allocation. Some procedures may be billing-only items, while others determine booking duration.

Recommended duration values:

- `null` for not applicable
- 15
- 30
- 45
- 60
- 90
- 120
- 180

## 3. ICD-10 Decision

ICD-10 should remain patient-level, not price-list-item-level.

Reason:

- A procedure describes what service was performed.
- ICD-10 describes the clinical diagnosis/reason linked to the patient.
- The same procedure may be used for many patients with different ICD-10 codes.

Future invoices should combine:

- patient ICD-10 code
- selected procedure line items
- therapist/practice billing details
- patient/responsible party snapshots

This avoids duplicating ICD-10 codes across price lists and keeps billing cleaner.

## 4. Booking Integration

Bookings will later select one or more procedure line items from a chosen price list.

Future booking flow:

1. User selects patient.
2. User selects practice/location/therapist.
3. System selects the default price list or user chooses another list.
4. User selects one or more active procedure line items.
5. Booking duration can be calculated from selected items where duration is available.
6. Selected procedure line items become appointment billing line items.
7. Draft invoice is created from the same selected items.

This supports capture-once reuse:

- no duplicate procedure entry during booking
- no duplicate procedure entry during invoice confirmation
- cleaner reporting
- better future automation

## 5. Finance Integration

Price list items should drive future invoice and statement workflows.

Future finance flow:

1. Booking selects procedure line items.
2. Draft invoice is created with status `confirm_invoice`.
3. Draft invoice stores immutable snapshots of selected procedure names, codes, descriptions, prices, patient details, practice details, therapist details, and banking details.
4. User confirms invoice.
5. Confirmed invoice creates an official billing obligation.
6. Invoice moves to `awaiting_payment`.
7. After due date, invoice displays as `payment_due`.
8. Payment received updates the invoice.
9. Statements can group one or more invoices.

Statements should list the invoice lines that formed part of the statement, preserving the original invoice snapshots.

## 6. Permissions

Price Lists sit between Practice configuration and Finance operations.

Recommended access:

| Action | Permission |
| --- | --- |
| View price lists | `tenant.finance.view` or `tenant.practice.configure` |
| Create price lists | `tenant.finance.manage` or `tenant.practice.configure` |
| Edit price lists | `tenant.finance.manage` or `tenant.practice.configure` |
| Deactivate price lists | `tenant.finance.manage` or `tenant.practice.configure` |
| View procedure items | `tenant.finance.view` or `tenant.practice.configure` |
| Create procedure items | `tenant.finance.manage` or `tenant.practice.configure` |
| Edit procedure items | `tenant.finance.manage` or `tenant.practice.configure` |
| Deactivate procedure items | `tenant.finance.manage` or `tenant.practice.configure` |

Hard delete should not be used. Deactivation or soft delete is safer because old bookings and invoices may reference previous pricing.

## 7. Data Model Proposal

### `price_lists`

Purpose:

Stores tenant-owned pricing lists.

Suggested fields:

- `id uuid primary key default gen_random_uuid()`
- `tenant_id uuid not null references tenants(id)`
- `practice_profile_id uuid null references practice_profiles(id)`
- `name text not null`
- `description text null`
- `price_list_type text null`
- `currency_code text not null default 'ZAR'`
- `is_default boolean not null default false`
- `is_active boolean not null default true`
- `metadata jsonb not null default '{}'::jsonb`
- `deleted_at timestamptz null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Suggested constraints:

- unique active/default list per tenant
- non-empty name
- valid currency code length

Suggested indexes:

- `tenant_id`
- `tenant_id, is_active`
- `tenant_id, is_default`
- `deleted_at`

### `price_list_items`

Purpose:

Stores billable procedure/service line items inside a price list.

Suggested fields:

- `id uuid primary key default gen_random_uuid()`
- `tenant_id uuid not null references tenants(id)`
- `price_list_id uuid not null references price_lists(id)`
- `procedure_name text not null`
- `procedure_code text not null`
- `description text null`
- `price numeric(12,2) not null`
- `duration_minutes integer null`
- `is_active boolean not null default true`
- `metadata jsonb not null default '{}'::jsonb`
- `deleted_at timestamptz null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Suggested constraints:

- non-empty procedure name
- non-empty procedure code
- price must be zero or greater
- duration must be null or greater than zero
- avoid duplicate active procedure codes per tenant and price list

Suggested indexes:

- `tenant_id`
- `price_list_id`
- `tenant_id, price_list_id`
- `tenant_id, is_active`
- `procedure_code`
- `deleted_at`

## 8. Future Scalability

### Multiple Locations

Price lists can later be linked to locations through metadata or a future join table if different branches use different pricing.

Potential future table:

- `location_price_lists`

### Cash/Private vs Medical Aid Pricing

Multiple price lists allow a tenant to keep separate cash, private, medical aid, and contract pricing without changing booking or invoice logic.

### Contract Pricing

Contract pricing can be represented as separate price lists assigned to specific patients, schools, corporate clients, or referral partners later.

Potential future links:

- patient default price list
- responsible party default price list
- contract entity default price list

### Reports

Structured price list items allow reports such as:

- revenue by procedure
- bookings by procedure
- therapist procedure mix
- location procedure mix
- medical aid vs cash pricing split
- frequently used procedures

### AI Suggestions

AI can later suggest likely procedure items based on:

- therapist profession
- booking type
- patient history
- previous sessions
- notes
- selected assessment/therapy context

AI should suggest, not automatically bill, unless explicitly approved by the user.

### Medical Aid Codes

Medical aid procedure codes can be added later through metadata or dedicated fields if claim workflows require them.

Future fields may include:

- medical aid tariff code
- scheme-specific code
- modifier code
- claim category

### Packages Later

Packages should be modeled separately later because a package may include multiple procedure items, discounts, expiry rules, or prepaid sessions.

Potential future tables:

- `service_packages`
- `service_package_items`
- `patient_package_allocations`

## 9. Implementation Plan

Recommended future implementation steps:

### Step 16: Migration

Create Supabase migration for:

- `price_lists`
- `price_list_items`

Add RLS, indexes, constraints, updated_at triggers, soft delete fields, and default-list safety.

### Step 17: Types

Regenerate or update local Supabase database types so the app can safely query:

- `price_lists`
- `price_list_items`

### Step 18: Price List UI

Create Practice or Finance route for price list management.

Recommended route:

- `/practice/price-lists`

Capabilities:

- list price lists
- create price list
- edit price list
- mark default list
- activate/deactivate list

### Step 19: Procedure Items UI

Inside each selected price list:

- list procedure items
- create item
- edit item
- activate/deactivate item
- manage price and duration

### Step 20: Booking Integration Later

When booking operational modules begin:

- select default or chosen price list
- choose one or more procedure items
- calculate duration from selected items where applicable
- store selected procedures as booking billing line items

### Step 21: Invoice Integration Later

When invoice modules begin:

- generate draft invoice from booking procedure items
- snapshot selected procedure item details
- combine patient ICD-10 with invoice lines
- confirm invoice into official billing obligation

## Final Note

Price Lists should remain a clean configuration layer. They should not contain patient diagnosis data, invoice snapshots, payment statuses, or booking-specific logic. Those belong to later operational domains.

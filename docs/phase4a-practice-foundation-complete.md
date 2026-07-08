# Phase 4A - Practice Foundation Complete

## Summary

Phase 4A establishes the first production-connected Practice Foundation layer for AlliDesk. It introduces tenant-scoped practice administration screens that use the active tenant context, Supabase client, generated database types, shared UI patterns, and the existing permission foundation.

This phase does not implement operational modules such as patients, bookings, invoices, statements, payments, price lists, clinical notes, calendars, or workflow automation.

## What Phase 4A Includes

- Practice navigation hub.
- Practice profile configuration.
- Practice location management.
- Tenant-owned banking details management.
- Billing defaults configuration.
- Practice branding configuration.
- Communication template management.
- Therapist profile and basic professional registration management.
- Phase 4A database types for all implemented Practice Foundation tables.
- Permission-aware route access through the existing app route guard.

## Routes Implemented

| Route | Purpose | Data Connected |
| --- | --- | --- |
| `/practice` | Practice hub and section cards | Static hub only |
| `/practice/profile` | Tenant practice profile | `practice_profiles` |
| `/practice/locations` | Practice locations | `practice_locations` |
| `/practice/banking` | Tenant-owned bank accounts | `bank_accounts` |
| `/practice/billing` | Billing defaults | `billing_settings`, `bank_accounts` |
| `/practice/branding` | Practice branding settings | `practice_branding` |
| `/practice/communication-templates` | Manual/future automation message templates | `communication_templates` |
| `/practice/therapists` | Therapist profiles and basic registrations | `therapist_profiles`, `professional_registrations` |

## Practice Hub Card Review

The implemented Phase 4A hub cards link to their matching routes:

- Practice Profile -> `/practice/profile`
- Locations -> `/practice/locations`
- Therapists -> `/practice/therapists`
- Branding -> `/practice/branding`
- Banking Details -> `/practice/banking`
- Billing Configuration -> `/practice/billing`
- Communication Templates -> `/practice/communication-templates`

The following cards remain intentionally unlinked placeholders because their modules have not started yet:

- Team
- Security & Permissions
- Integrations

## Tables Implemented

Phase 4A relies on these tenant-scoped tables:

- `practice_profiles`
- `practice_locations`
- `bank_accounts`
- `billing_settings`
- `practice_branding`
- `communication_templates`
- `therapist_profiles`
- `professional_registrations`

The local TypeScript database types include all Phase 4A tables.

## Permissions Added Or Used

Phase 4A uses the existing centralized authorization layer.

### Practice Profile

- View route access: `settings` access area
- Edit: `tenant.practice.configure`

### Locations

- View route access: `settings` access area
- Edit: `tenant.practice.configure`

### Banking Details

- View route access: `practice_banking`
- Edit: `tenant.finance.manage` or `tenant.practice.configure`

### Billing Configuration

- View route access: `practice_billing`
- Edit: `tenant.finance.manage` or `tenant.practice.configure`

### Branding

- View route access: `settings` access area
- Edit: `tenant.practice.configure`

### Communication Templates

- View route access: `settings` access area
- Edit: `tenant.practice.configure`

### Therapist Profiles

- View route access: `practice_team`
- Edit: `tenant.practice.configure`
- Optional linked user loading: `tenant.users.manage`

### Permissions Introduced During Phase 4A

- `tenant.team.view`
- `practice_team` access area
- `practice_billing` access area
- `practice_banking` access area

## Active Tenant Safety

Every production-connected Practice Foundation page checks for an active tenant before querying or saving data. If no active tenant is available, the page returns a safe error state rather than executing tenantless queries.

All reads and writes include `tenant_id` filters or inserts using the active tenant id.

## Loading, Error, And Empty States

Phase 4A pages use the shared UI state components:

- `LoadingState`
- `ErrorState`
- `EmptyState`

Coverage:

- Loading states exist on all connected pages.
- Error states exist on all connected pages.
- Empty states exist where the page presents lists or dependent records, such as locations, bank accounts, communication templates, therapists, and therapist registrations.
- Single-record configuration pages use editable default forms when no row exists.

## Known Limitations

- Team management is not implemented yet.
- Security and permission configuration UI is not implemented yet.
- Integrations are placeholders only.
- Price Lists and procedure pricing are intentionally not implemented in Phase 4A.
- Operational workflows are not connected yet.
- Patients, bookings, clinical notes, invoices, statements, payments, documents, and patient links remain outside this phase.
- File uploads are not implemented for branding or documents.
- Therapist-specific banking is not implemented.
- Therapist calendar/provider availability is not implemented.
- Communication templates are stored only; no WhatsApp, SMS, email, or automation sending is connected.
- Billing settings do not generate live invoice or statement numbers yet.

## QA Findings

- All required Phase 4A routes are registered in the central route configuration.
- All implemented Practice hub cards point to the correct route.
- Route guarding uses the existing authorization foundation.
- All connected Practice pages use active tenant context safely.
- Phase 4A table types are present in `src/lib/database.types.ts`.
- No database schema changes were required during this consolidation pass.
- No application behaviour changes were required during this consolidation pass.

## Recommended Next Milestone

Phase 4B should begin the Operational Foundation.

Recommended starting order:

1. Price Lists and Procedure Pricing
2. Patient Foundation tables and patient profile shell
3. Booking Foundation tables and booking lifecycle
4. Draft invoice creation from bookings
5. Patient Link intake foundation

Price Lists are the natural next step because bookings, billing, invoices and service duration logic will all depend on structured procedure pricing.

# Phase 4 Step 2: Practice Foundation Data Model Specification

## Purpose

This document defines the proposed Practice Foundation data model for AlliDesk before database migrations, UI work, or operational module connections begin.

This is an architectural design document only.

No SQL, migrations, TypeScript types, React code, or existing app behaviour are changed by this specification.

## Design Principles

- Every operational practice record must be tenant-scoped with `tenant_id`.
- Practice data should be captured once and reused across bookings, invoices, statements, Patient Link, communication, reports and future automation.
- Practice Foundation records should be lower-risk setup records, not patient, clinical, booking or finance transaction records.
- RLS must rely on tenant membership and role/permission checks.
- Super Admin should not have default access to tenant operational configuration unless future audited support access explicitly allows it.
- Meaningful create, update, deactivate and delete actions should generate audit events.

## 1. Practice Profile

### Purpose

The Practice Profile stores the tenant's main business/practice identity. It is the source of truth for practice details used throughout AlliDesk.

It should feed:

- Patient Link practice display
- invoices and statements
- communication templates
- reports
- booking location defaults
- practice setup screens

### Proposed Entity

Recommended table name:

`practice_profiles`

### Primary Fields

- `id`
- `tenant_id`
- `practice_name`
- `trading_name`
- `registration_number`
- `vat_number`
- `tax_number`
- `practice_number`
- `address_line_1`
- `address_line_2`
- `city`
- `province`
- `postal_code`
- `country`
- `time_zone`
- `phone`
- `email`
- `website`
- `default_language`
- `is_complete`
- `created_at`
- `updated_at`
- `deleted_at`

### Relationships

- Belongs to `tenants`.
- Has many `practice_locations`.
- Has many `bank_accounts`.
- Has one active/default `practice_branding` record.
- Has one active/default `billing_configuration`.
- Has many `communication_templates`.
- May be referenced by invoice and statement immutable snapshots.

### Validation Rules

- `tenant_id` is required.
- `practice_name` is required.
- `email` should be valid if provided.
- `phone` should be valid enough for display and future communication.
- `time_zone` should default to `Africa/Johannesburg` for South African tenants.
- Address fields may be optional during initial setup but should be required before generating official invoices/statements.
- `practice_number` may be required based on profession/billing rules.
- Only one active main practice profile should exist per tenant.

## 2. Practice Locations

### Purpose

Practice Locations represent physical venues, satellite branches, rooms/modes and future service points.

### Proposed Entities

Recommended table names:

- `practice_locations`
- `practice_rooms`

### Practice Location Fields

- `id`
- `tenant_id`
- `practice_profile_id`
- `location_name`
- `address_line_1`
- `address_line_2`
- `city`
- `province`
- `postal_code`
- `country`
- `phone`
- `email`
- `is_main_location`
- `is_active`
- `created_at`
- `updated_at`
- `deleted_at`

### Practice Room Fields

- `id`
- `tenant_id`
- `practice_location_id`
- `room_name`
- `room_type`
- `is_active`
- `created_at`
- `updated_at`
- `deleted_at`

### Relationships

- Location belongs to `practice_profiles`.
- Location has many `practice_rooms`.
- Bookings will reference a location and optionally a room.
- Invoices/statements may store location snapshots if needed.

### Future Scalability

The model should support:

- multiple locations per tenant
- telehealth as a room/mode option
- rooms shared by multiple therapists
- future availability per location
- future location-specific price lists
- future location-specific banking or invoice details

### Active/Inactive Handling

- Locations and rooms should be soft-deletable.
- Inactive locations should not appear for new bookings.
- Historical bookings should retain their location/room references or snapshots.
- A main location should not be deleted if it is required for practice identity; it should be edited from Practice Profile.

## 3. Team Members

### Purpose

Team Members represent tenant membership and role participation for authenticated users.

Phase 1 already includes:

- `profiles`
- `tenant_users`

Practice Foundation should build on these instead of duplicating users.

### Relationship To Authenticated Users

- `profiles.id` links to `auth.users.id`.
- `tenant_users.profile_id` links a global profile to a tenant.
- A profile can belong to multiple tenants.
- Do not duplicate one person as separate users per tenant.

### Relationship To Therapists

Not every team member is a therapist.

Therapist-specific data should live in `therapist_profiles` linked to `tenant_users`.

Recommended relationship:

`tenant_users.id -> therapist_profiles.tenant_user_id`

### Permission Considerations

Existing permission concepts:

- `tenant.users.manage`
- `tenant.practice.configure`
- `tenant.finance.view`
- `tenant.finance.manage`
- `tenant.bookings.view`
- `tenant.bookings.manage`
- `tenant.clinical.view`
- `tenant.clinical.manage`
- `tenant.communication.manage`

Team member management should require `tenant.users.manage`.

Practice setup changes should require `tenant.practice.configure`.

Finance-specific team setup should require either `tenant.practice.configure` or `tenant.finance.manage`, depending on the action.

## 4. Therapist Profiles

### Purpose

Therapist Profiles store professional, clinical and optional billing configuration for therapist users.

### Proposed Entity

Recommended table name:

`therapist_profiles`

### Professional Information

Fields:

- `id`
- `tenant_id`
- `tenant_user_id`
- `display_name`
- `discipline`
- `qualification`
- `bio`
- `phone`
- `email`
- `calendar_color`
- `signature_document_id`
- `is_active`
- `created_at`
- `updated_at`
- `deleted_at`

### Practice Numbers

Fields:

- `uses_own_practice_number`
- `practice_number`
- `default_practice_number_source`

Rules:

- If `uses_own_practice_number = false`, use the main practice number from Practice Profile.
- If `uses_own_practice_number = true`, `practice_number` should be required.
- Invoice and statement snapshots should store whichever practice number was used at issue time.

### Registration Bodies

Therapist Profile should not store only one fixed registration field forever.

Professional registrations should be a separate related entity so therapists can hold more than one registration over time.

### Banking Permissions

Therapists may or may not be allowed to use their own banking details.

Suggested fields:

- `can_use_own_bank_account`
- `default_bank_account_id`

Rules:

- If therapist-specific billing is disabled, invoices use the practice default bank account.
- If enabled, therapist-specific bank accounts may be selectable.
- Final invoice snapshots must store the bank account details used.

### Billing Configuration

Therapist profile may influence:

- default price list
- default practice number
- default bank account
- invoice therapist display name
- therapist signature on reports/documents

These should remain configurable but not duplicate invoice snapshot data.

## 5. Professional Registrations

### Purpose

Professional Registrations support current and future professional bodies.

Examples:

- HPCSA
- AHPCSA
- SACSSP
- Other future discipline-specific bodies

### Proposed Entity

Recommended table name:

`professional_registrations`

### Current Recommended Structure

Fields:

- `id`
- `tenant_id`
- `therapist_profile_id`
- `registration_body`
- `registration_number`
- `discipline`
- `registration_category`
- `valid_from`
- `valid_until`
- `is_primary`
- `is_active`
- `created_at`
- `updated_at`
- `deleted_at`

### Rules

- A therapist can have multiple registrations.
- One registration may be marked primary.
- Expired registrations should remain in history.
- Invoices/reports should snapshot registration details where legally required.

## 6. Bank Accounts

### Purpose

Bank Accounts store banking details for practice and future therapist billing.

### Proposed Entity

Recommended table name:

`bank_accounts`

### Fields

- `id`
- `tenant_id`
- `owner_type`
- `owner_id`
- `account_label`
- `account_name`
- `bank_name`
- `account_number`
- `branch_code`
- `account_type`
- `is_default`
- `is_active`
- `created_at`
- `updated_at`
- `deleted_at`

### Practice Bank Accounts

Practice-owned accounts use:

- `owner_type = practice_profile`
- `owner_id = practice_profiles.id`

### Future Therapist Bank Accounts

Therapist-owned accounts use:

- `owner_type = therapist_profile`
- `owner_id = therapist_profiles.id`

### Ownership Model

Use polymorphic ownership carefully.

If strict foreign keys are preferred, split into:

- `practice_bank_accounts`
- `therapist_bank_accounts`

However, one `bank_accounts` table with `owner_type` is simpler for selecting default accounts across practice and therapist billing workflows.

### Default Account Selection

Rules:

- A practice should have one default active bank account.
- A therapist may have one default active bank account if therapist billing is enabled.
- Invoices should store immutable bank account snapshots at confirmation.

## 7. Branding

### Purpose

Branding stores tenant visual identity and document/communication branding preferences.

### Proposed Entity

Recommended table name:

`practice_branding`

### Fields

- `id`
- `tenant_id`
- `practice_profile_id`
- `logo_document_id`
- `primary_color`
- `secondary_color`
- `accent_color`
- `invoice_logo_position`
- `statement_logo_position`
- `patient_link_branding_enabled`
- `communication_branding_enabled`
- `created_at`
- `updated_at`
- `deleted_at`

### Logo

Logo files should eventually live in the Documents/Storage domain.

Practice branding should store references, not raw file payloads.

### Colours

Colour fields should support branding but must not break accessibility.

### Invoice Branding

Invoice branding should control:

- practice logo placement
- colour accents
- footer branding
- practice display name

### Communication Branding

Communication branding should control:

- practice name in messages
- logo on Patient Link
- future email template appearance

## 8. Communication Templates

### Purpose

Communication Templates define reusable message content for manual generation now and automation later.

### Proposed Entity

Recommended table name:

`communication_templates`

### Fields

- `id`
- `tenant_id`
- `practice_profile_id`
- `template_key`
- `template_name`
- `channel`
- `subject`
- `body`
- `available_variables`
- `is_active`
- `created_at`
- `updated_at`
- `deleted_at`

### Manual Generation Now

Current workflow:

- user clicks an icon/action
- system generates a ready-to-send WhatsApp/email message
- user copies and sends manually

Templates should support this without requiring automated messaging infrastructure.

### Automation-Ready Later

Future workflow:

- booking created triggers reminder/intake message
- invoice confirmed triggers invoice available message
- payment due triggers reminder
- feedback available triggers Patient Link message

Templates should store:

- event key
- channel
- variables
- active/inactive state

## 9. Billing Configuration

### Purpose

Billing Configuration stores tenant defaults for invoices, statements, payment terms and billing behaviour.

### Proposed Entity

Recommended table name:

`billing_configurations`

### Fields

- `id`
- `tenant_id`
- `practice_profile_id`
- `invoice_prefix`
- `invoice_next_number`
- `statement_prefix`
- `statement_next_number`
- `payment_terms_days`
- `default_bank_account_id`
- `default_price_list_id`
- `allow_therapist_billing`
- `allow_price_override`
- `invoice_notes`
- `statement_notes`
- `created_at`
- `updated_at`
- `deleted_at`

### Invoice Numbering

Invoice numbering should be tenant-scoped.

Recommended:

- prefix field
- next number field
- immutable generated invoice number stored on invoice

### Statement Numbering

Statement numbering should be separate from invoice numbering.

### Payment Terms

Default payment terms:

- 7 days after confirmation for current workflow

Store as:

- `payment_terms_days = 7`

### Default Banking Account

`default_bank_account_id` points to the default practice bank account.

### Therapist Billing Options

`allow_therapist_billing` controls whether therapist-owned practice numbers/banking details can be used.

## 10. Entity Relationship Diagram

Text relationship diagram:

```text
Tenant
  |
  +-- Practice Profile
  |     |
  |     +-- Practice Locations
  |     |     |
  |     |     +-- Practice Rooms
  |     |
  |     +-- Practice Branding
  |     |
  |     +-- Bank Accounts
  |     |
  |     +-- Billing Configuration
  |     |
  |     +-- Communication Templates
  |
  +-- Profiles
  |     |
  |     +-- Tenant Users
  |           |
  |           +-- Therapist Profiles
  |                 |
  |                 +-- Professional Registrations
  |                 |
  |                 +-- Bank Accounts
  |
  +-- Patients
        |
        +-- Responsible Parties
        |
        +-- Patient Link
        |
        +-- Bookings
              |
              +-- Therapist Profile
              |
              +-- Practice Location
              |
              +-- Practice Room
              |
              +-- Price List
              |     |
              |     +-- Procedure Line Items
              |
              +-- Invoices
                    |
                    +-- Invoice Line Items
                    |
                    +-- Payments
                    |
                    +-- Statements
                          |
                          +-- Statement Invoice Links
                          |
                          +-- Payments
```

Extended finance relationship:

```text
Price Lists
  |
  +-- Procedure Line Items
        |
        +-- Booking Procedure Selections
              |
              +-- Draft Invoice Line Items
                    |
                    +-- Confirmed Invoice Snapshots
```

Patient-facing relationship:

```text
Patient
  |
  +-- Patient Link
        |
        +-- Intake Form
        +-- Upcoming Sessions
        +-- Patient-Facing Feedback
        +-- Patient-Facing History
        +-- Invoices
        +-- Statements
```

## 11. Audit Events

All important configuration changes should create `audit_events`.

### Practice Profile Events

- `practice_profile.created`
- `practice_profile.updated`
- `practice_profile.completed`
- `practice_profile.deleted`

### Location Events

- `practice_location.created`
- `practice_location.updated`
- `practice_location.activated`
- `practice_location.deactivated`
- `practice_location.deleted`

### Room Events

- `practice_room.created`
- `practice_room.updated`
- `practice_room.activated`
- `practice_room.deactivated`
- `practice_room.deleted`

### Team Member Events

- `tenant_user.invited`
- `tenant_user.activated`
- `tenant_user.deactivated`
- `tenant_user.role_changed`
- `tenant_user.deleted`

### Therapist Profile Events

- `therapist_profile.created`
- `therapist_profile.updated`
- `therapist_profile.activated`
- `therapist_profile.deactivated`
- `therapist_profile.practice_number_changed`
- `therapist_profile.billing_setting_changed`

### Professional Registration Events

- `professional_registration.created`
- `professional_registration.updated`
- `professional_registration.activated`
- `professional_registration.deactivated`
- `professional_registration.deleted`

### Bank Account Events

- `bank_account.created`
- `bank_account.updated`
- `bank_account.default_changed`
- `bank_account.activated`
- `bank_account.deactivated`
- `bank_account.deleted`

### Branding Events

- `practice_branding.created`
- `practice_branding.updated`
- `practice_branding.logo_changed`

### Communication Template Events

- `communication_template.created`
- `communication_template.updated`
- `communication_template.activated`
- `communication_template.deactivated`
- `communication_template.deleted`

### Billing Configuration Events

- `billing_configuration.created`
- `billing_configuration.updated`
- `billing_configuration.invoice_numbering_changed`
- `billing_configuration.statement_numbering_changed`
- `billing_configuration.default_bank_account_changed`
- `billing_configuration.default_price_list_changed`

## 12. Permissions

This section maps entity actions to the current permission framework. More granular permissions may be introduced later.

| Entity | View | Create | Edit | Delete |
| --- | --- | --- | --- | --- |
| Practice Profile | `tenant.practice.configure` | `tenant.practice.configure` | `tenant.practice.configure` | `tenant.practice.configure` |
| Practice Locations | `tenant.practice.configure` | `tenant.practice.configure` | `tenant.practice.configure` | `tenant.practice.configure` |
| Practice Rooms | `tenant.practice.configure` | `tenant.practice.configure` | `tenant.practice.configure` | `tenant.practice.configure` |
| Team Members | `tenant.users.manage` | `tenant.users.manage` | `tenant.users.manage` | `tenant.users.manage` |
| Therapist Profiles | `tenant.users.manage` or `tenant.practice.configure` | `tenant.users.manage` | `tenant.users.manage` or `tenant.practice.configure` | `tenant.users.manage` |
| Professional Registrations | `tenant.users.manage` or `tenant.practice.configure` | `tenant.users.manage` | `tenant.users.manage` or `tenant.practice.configure` | `tenant.users.manage` |
| Bank Accounts | `tenant.practice.configure` or `tenant.finance.manage` | `tenant.practice.configure` or `tenant.finance.manage` | `tenant.practice.configure` or `tenant.finance.manage` | `tenant.practice.configure` or `tenant.finance.manage` |
| Branding | `tenant.practice.configure` | `tenant.practice.configure` | `tenant.practice.configure` | `tenant.practice.configure` |
| Communication Templates | `tenant.communication.manage` or `tenant.practice.configure` | `tenant.communication.manage` | `tenant.communication.manage` | `tenant.communication.manage` |
| Billing Configuration | `tenant.finance.manage` or `tenant.practice.configure` | `tenant.finance.manage` or `tenant.practice.configure` | `tenant.finance.manage` or `tenant.practice.configure` | `tenant.finance.manage` or `tenant.practice.configure` |
| Price Lists | `tenant.finance.view` | `tenant.finance.manage` | `tenant.finance.manage` | `tenant.finance.manage` |
| Procedure Line Items | `tenant.finance.view` | `tenant.finance.manage` | `tenant.finance.manage` | `tenant.finance.manage` |

### Permission Notes

- Viewing basic practice identity may be allowed broadly in future because it is needed across the app.
- Editing practice identity should remain restricted.
- Bank account viewing may need redaction for users without finance permissions.
- Deleting should generally be soft delete/deactivation rather than hard delete.
- Solo practitioners may have all relevant permissions.
- Therapists may receive finance/admin permissions if the tenant config allows it.

## 13. Future Considerations

### Multi-Location Practices

The model supports:

- multiple locations
- multiple rooms
- location-specific booking context
- future location-specific availability
- future location-specific price lists

### Solo Practitioners

Solo practitioners can use:

- one practice profile
- one main location
- one therapist profile
- default practice bank account
- all permissions assigned to one user

The model should not force unnecessary complexity for solo use.

### Large Multidisciplinary Practices

Large practices can use:

- multiple locations
- many users
- many therapist profiles
- multiple disciplines
- multiple professional registrations
- multiple price lists
- separate finance/admin users
- future location-specific reporting

### Automation

The model supports automation by centralising:

- communication templates
- billing defaults
- therapist billing rules
- bank account defaults
- practice branding
- audit events

Future workflow events can use these records without asking users to re-enter setup data.

### AI Features

AI features can rely on structured practice context:

- therapist discipline
- communication templates
- practice defaults
- patient-facing tone
- document/report branding
- workflow history

AI must not access tenant data outside permission and RLS boundaries.

### Medical Aid Integration

The model supports future medical aid workflows by keeping:

- practice numbers
- therapist practice number overrides
- professional registrations
- procedure codes/prices
- patient-level ICD-10
- immutable invoice snapshots

Medical aid claim tables should be added later in the Finance domain, not inside Practice Foundation.

### Patient Portal Expansion

Patient Link can reuse:

- practice branding
- communication templates
- practice contact details
- therapist display details
- invoices/statements
- patient-facing history

Practice Foundation therefore supports Patient Link without exposing internal-only configuration.

## Recommended Implementation Gate

Before SQL migrations are created:

1. Review this data model specification.
2. Confirm table naming.
3. Confirm whether bank accounts use polymorphic ownership or split practice/therapist tables.
4. Confirm exact permission mapping.
5. Confirm whether `Practice` becomes a new routed navigation item before UI connection.
6. Confirm which Practice Foundation entities are included in the first migration batch.

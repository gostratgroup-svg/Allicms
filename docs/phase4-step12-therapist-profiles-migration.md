# Phase 4 Step 12: Therapist Profiles Database Migration

## Objective

Add the Practice Foundation database tables required for therapist profiles and professional registrations.

This step is database-only. It does not add UI, forms, bookings, patients, invoices, or operational workflow logic.

## Migration File

Created:

- `supabase/migrations/202607080002_phase4_therapist_profiles.sql`

## Tables Created

### therapist_profiles

Purpose: Store tenant-scoped therapist profile records that can later connect authenticated users to professional, billing and appointment-provider details.

Key fields:

- `id`
- `tenant_id`
- `user_id`
- `display_name`
- `profession`
- `qualifications`
- `bio`
- `default_appointment_duration_minutes`
- `default_billing_rate`
- `practice_number`
- `billing_name`
- `billing_email`
- `billing_phone`
- `is_active`
- `metadata`
- `deleted_at`
- `created_at`
- `updated_at`

### professional_registrations

Purpose: Store tenant-scoped professional registration records linked to therapist profiles.

Key fields:

- `id`
- `tenant_id`
- `therapist_profile_id`
- `registration_body`
- `registration_number`
- `registration_type`
- `country`
- `valid_from`
- `valid_until`
- `is_primary`
- `is_active`
- `metadata`
- `deleted_at`
- `created_at`
- `updated_at`

## RLS Policies Added

Both tables have Row Level Security enabled.

Policies added:

- Tenant members can read therapist profiles.
- Tenant admins can create therapist profiles.
- Tenant admins can update therapist profiles.
- Tenant members can read professional registrations.
- Tenant admins can create professional registrations.
- Tenant admins can update professional registrations.

No hard delete policy was added. Records should be soft-deleted through `deleted_at`.

## Indexes And Constraints

Added indexes for:

- `tenant_id`
- `user_id`
- `therapist_profile_id`
- `is_active`
- `deleted_at`
- `registration_body`
- `registration_number`

Added uniqueness:

- One therapist profile per tenant/user when `user_id` is present and the row is not deleted.
- No duplicate active registration numbers per tenant/body when not deleted.
- One active primary registration per therapist profile.

Added validation:

- Appointment duration must be positive when present.
- Billing rate must be zero or positive when present.
- Registration validity dates must not be inverted.

## Future Support Notes

The migration includes comments for future support of:

- Therapist-specific banking.
- Therapist-specific practice numbers.
- Therapist-specific billing overrides.
- Appointment and service-provider relationships.

## Type Updates

Updated:

- `src/lib/database.types.ts`

The local type file now includes:

- `therapist_profiles`
- `professional_registrations`

The preferred future Supabase CLI regeneration command remains:

```bash
npx supabase gen types typescript --linked --schema public > src/lib/database.types.ts
```

Manual type updates were used here because previous local CLI generation stalled while fetching/running the Supabase CLI package.

## Known Limitations

- No UI has been built yet.
- No therapist-owned bank accounts are connected yet.
- No booking provider relationship exists yet.
- No service/procedure relationship exists yet.
- No audit trigger was added because the project does not yet have an approved generic audit trigger pattern.

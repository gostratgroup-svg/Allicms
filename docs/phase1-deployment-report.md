# Phase 1 Deployment Report

Date: 2026-07-06  
Migration: `supabase/migrations/202607060001_phase1_platform_identity.sql`  
Supabase project ref: `wdhfhdpcrcuyxqjehiyy`  
Status: Deployed and verified with one seed-row read limitation noted below.

## Migration Execution Status

The local project was successfully linked to the Supabase development project.

Link result:

```text
{"project_ref":"wdhfhdpcrcuyxqjehiyy","message":""}
```

Migration history showed the Phase 1 migration is already present remotely:

```text
{"migrations":[{"local":"202607060001","remote":"202607060001","time":"202607060001"}],"message":"Migrations listed"}
```

Dry-run deployment check confirmed no pending migrations:

```text
DRY RUN: migrations will *not* be pushed to the database.
Connecting to remote database...
Remote database is up to date.
```

No additional migration push was required.

## Tables Created

Verified all 7 Phase 1 tables exist in the remote `public` schema:

- `audit_events`
- `platform_configurations`
- `profiles`
- `subscription_plans`
- `tenant_subscriptions`
- `tenant_users`
- `tenants`

Verification query returned `expected_phase1_table_count = 7`.

No patient, booking, invoice, clinical, document, payment, or storage tables were created by this phase.

## RLS Verification

RLS is enabled on all Phase 1 tables:

- `audit_events`: enabled
- `platform_configurations`: enabled
- `profiles`: enabled
- `subscription_plans`: enabled
- `tenant_subscriptions`: enabled
- `tenant_users`: enabled
- `tenants`: enabled

Policy count verification:

- `audit_events`: 2 policies
- `platform_configurations`: 2 policies
- `profiles`: 4 policies
- `subscription_plans`: 2 policies
- `tenant_subscriptions`: 2 policies
- `tenant_users`: 3 policies
- `tenants`: 2 policies

Note: A verbose `pg_policies` listing query hung through the Supabase CLI Management API, so policy verification used policy counts by table instead.

## Index Verification

Verified remote indexes:

- `audit_events_actor_profile_id_idx`
- `audit_events_entity_idx`
- `audit_events_pkey`
- `audit_events_tenant_occurred_at_idx`
- `platform_configurations_config_key_key`
- `platform_configurations_pkey`
- `profiles_email_idx`
- `profiles_pkey`
- `subscription_plans_active_public_idx`
- `subscription_plans_pkey`
- `subscription_plans_plan_code_key`
- `tenant_subscriptions_one_current_per_tenant_idx`
- `tenant_subscriptions_pkey`
- `tenant_subscriptions_status_idx`
- `tenant_subscriptions_tenant_id_idx`
- `tenant_users_pkey`
- `tenant_users_profile_id_idx`
- `tenant_users_role_idx`
- `tenant_users_tenant_id_idx`
- `tenant_users_unique_membership`
- `tenants_pkey`
- `tenants_primary_contact_email_idx`
- `tenants_tenant_status_idx`

Index verification passed.

## Constraint Verification

Verified primary keys, foreign keys, unique constraints, and check constraints exist for Phase 1.

Confirmed examples:

- `profiles_id_fkey`
- `tenant_users_profile_id_fkey`
- `tenant_users_tenant_id_fkey`
- `tenant_subscriptions_subscription_plan_id_fkey`
- `tenant_subscriptions_tenant_id_fkey`
- `audit_events_actor_profile_id_fkey`
- `audit_events_actor_tenant_user_id_fkey`
- `audit_events_tenant_id_fkey`
- `tenant_users_role_check`
- `tenants_tenant_status_check`
- `tenant_subscriptions_subscription_status_check`
- `tenant_subscriptions_billing_cycle_check`
- `tenant_users_unique_membership`
- `subscription_plans_plan_code_key`
- `platform_configurations_config_key_key`

Constraint verification passed.

## Helper Function Verification

Verified helper functions exist:

- `has_tenant_role(target_tenant_id uuid, allowed_roles text[])`
- `is_super_admin()`
- `is_tenant_member(target_tenant_id uuid)`
- `set_updated_at()`

Helper function verification passed.

## Seed Verification

Verified:

- `platform_identity` exists in `platform_configurations` with count `1`.

Pending direct row confirmation:

- Direct read/count queries against `subscription_plans` hung through the Supabase CLI Management API, even with a short statement timeout.
- The migration history confirms the migration containing the subscription plan seed ran remotely.
- Index and constraint verification confirms the `subscription_plans` table and its unique `plan_code` structure exist.

Recommended follow-up after the full anon/publishable key is added locally:

- Verify subscription plans through either:
  - Supabase Dashboard table editor,
  - REST client using the anon key,
  - SQL editor in Supabase Dashboard,
  - or a service-role/direct SQL check.

Expected seed rows:

- `free`
- `starter`
- `professional`
- `growth`
- `business`
- `enterprise`

## Issues Encountered

1. Supabase CLI was not installed globally.

Resolution:

- Used `npx supabase`.
- Confirmed CLI version `2.109.0`.

2. Local project was initially not linked.

Resolution:

- Linked project to `wdhfhdpcrcuyxqjehiyy`.

3. Docker is not running locally.

Impact:

- `supabase status` and `supabase db dump` could not be used for local service/data dump verification.
- Remote migration history and remote read-only SQL verification still worked.

4. Some direct table read queries through `supabase db query --linked` hung.

Impact:

- Verbose policy listing was replaced by policy-count verification.
- Verbose index listing was replaced by a smaller `pg_index` query.
- `platform_configurations` seed was directly verified.
- `subscription_plans` direct seed-row verification remains pending.

## Build Verification

`npm run build` passes.

Build note:

- Vite still reports the existing large chunk warning.
- The build completes successfully.

## Final Deployment Status

Phase 1 database foundation is deployed and structurally verified.

Verified successfully:

- Migration history
- Remote database up-to-date dry run
- Tables
- RLS enabled
- RLS policy counts
- Indexes
- Constraints and foreign keys
- Helper functions
- Platform identity seed
- Application build

Pending manual/alternate confirmation:

- Direct subscription plan seed row confirmation, because CLI direct reads against `subscription_plans` hung during verification.

No new tables beyond Phase 1 were created. No application code was modified. localStorage workflows remain unchanged.

AlliDesk is ready to proceed toward Phase 2: Authentication after the subscription plan seed rows are confirmed manually or through a working anon/service SQL verification path.

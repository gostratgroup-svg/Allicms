# Phase 1 Database Review

Date: 2026-07-06  
Migration reviewed: `supabase/migrations/202607060001_phase1_platform_identity.sql`  
Scope: Production database foundation only.

## Executive Summary

The Phase 1 migration is aligned with the AlliDesk database architecture v1 document and is suitable as the production foundation after Supabase project verification. It creates only the requested platform and identity foundation tables and does not introduce patient, booking, clinical, finance transaction, document, payment, or storage tables.

The migration uses UUID primary keys, snake_case naming, timestamp fields, soft delete fields where appropriate, foreign keys, conservative RLS policies, helper functions, indexes, and seed data for platform identity and subscription plans.

Three low-risk improvements were made during review:

- Added a partial unique index to prevent more than one non-deleted tenant subscription row per tenant.
- Restricted direct execution of helper functions to authenticated users.
- Removed `deleted_at` from normal authenticated profile update column grants so users cannot soft-delete their own profiles from the client.

## Tables Reviewed

- `platform_configurations`
- `subscription_plans`
- `tenants`
- `profiles`
- `tenant_users`
- `tenant_subscriptions`
- `audit_events`

No other production domain tables are created in this migration.

## Strengths

- The migration follows snake_case naming.
- All tables use UUID primary keys named `id`.
- `profiles.id` references `auth.users(id)`.
- `tenant_users` correctly links `profiles` to `tenants`.
- `tenant_users` supports the required roles: `admin`, `receptionist`, `therapist`, and `finance`.
- `tenants` supports the required `tenant_status` values: `trial`, `active`, `suspended`, `cancelled`, and `archived`.
- `tenant_subscriptions` supports the required `subscription_status` values: `trial`, `active`, `past_due`, `cancelled`, and `suspended`.
- All tables include `created_at` and `updated_at`, except `audit_events` also includes both while remaining append-only through permissions.
- Soft delete fields are present where required.
- Row Level Security is enabled on every Phase 1 table.
- Tenant membership helper functions are present.
- Audit events are designed to be append-only from the client perspective.
- Seed data is limited to platform identity and subscription plan options.
- No localStorage workflow is affected.

## Potential Risks

- `platform_configurations` is readable by all authenticated users. This is acceptable for current non-sensitive public platform identity configuration, but future sensitive configuration must either be stored elsewhere or protected by stricter policies.
- Super Admin bootstrap still requires a service-role or direct database operation to create the first Super Admin profile, because client-side users cannot grant themselves `is_super_admin`.
- `tenant_users` is designed for active membership and role management but does not yet include a permissions table. This is acceptable for Phase 1 but should be reviewed before advanced role customisation.
- `audit_events.metadata` is flexible JSONB. This is useful early, but conventions should be defined before production app writes begin so sensitive payloads are not copied into audit logs.
- The migration uses text checks for enum-like statuses instead of PostgreSQL enum types. This is easier to evolve, but future changes must be controlled through migrations and application types.

## Suggested Improvements

Implemented during this review:

- Added `tenant_subscriptions_one_current_per_tenant_idx`:
  - Reason: prevents duplicate current subscription rows per tenant.
  - Impact: non-breaking for a fresh deployment.
- Added explicit function execution grants:
  - Reason: helper functions should not be directly executable by anonymous users.
  - Impact: authenticated RLS policies continue to work.
- Removed `deleted_at` from authenticated profile update grants:
  - Reason: normal users should not soft-delete their own profile through the client.
  - Impact: profile soft-delete should be handled later through admin/service workflows.

Recommended later:

- Add generated Supabase TypeScript types after migration deployment.
- Add a documented Super Admin bootstrap procedure.
- Add migration tests or SQL verification scripts before production data is introduced.
- Define audit metadata conventions before app workflows write audit records.

## Security Review

Security posture is conservative for Phase 1.

Positive findings:

- RLS is enabled on every table.
- Helper functions are `security definer` with fixed `search_path = public`.
- Super Admin access is based on `profiles.is_super_admin`.
- Tenant membership is checked through `tenant_users`.
- Client users cannot set `is_super_admin` through granted profile insert/update columns.
- Anonymous users have no table grants.
- Audit events have insert/select grants only; no update/delete client grants are present.

Important bootstrap note:

- The first Super Admin must be created with a trusted service-role path or direct database action. This is intentional and safer than allowing client-side escalation.

## RLS Review

Reviewed policy behaviour:

- `platform_configurations`
  - Authenticated users can read.
  - Super Admins can manage.
- `subscription_plans`
  - Authenticated users can read active public plans.
  - Super Admins can read/manage hidden and inactive plans.
- `tenants`
  - Tenant members can read their tenant shell.
  - Super Admins can manage tenants.
- `profiles`
  - Users can read and update their own basic profile.
  - Super Admins can manage profiles, subject to column grants.
- `tenant_users`
  - Users can read their own membership.
  - Tenant Admins can read/manage users in their tenant.
  - Super Admins can manage tenant users.
- `tenant_subscriptions`
  - Tenant Admin and Finance roles can read subscriptions for their tenant.
  - Super Admins can manage subscriptions.
- `audit_events`
  - Tenant Admins can read tenant audit events.
  - Tenant members can append audit events for their tenant.
  - Super Admins can read/append platform or tenant audit events.

RLS risk level: acceptable for Phase 1.

## Performance Review

The migration includes sensible indexes for expected Phase 1 access patterns:

- active/public subscription plan lookups,
- tenant status filtering,
- tenant contact email lookup,
- profile email lookup,
- tenant user membership checks,
- tenant user role checks,
- subscription by tenant/status/date,
- audit event lookup by tenant, actor, and entity.

The helper functions rely on `tenant_users.profile_id`, `tenant_users.tenant_id`, and active membership filtering. Existing indexes support those checks.

Performance risk level: low for Phase 1.

## Index Review

Indexes reviewed:

- `subscription_plans_active_public_idx`
- `tenants_tenant_status_idx`
- `tenants_primary_contact_email_idx`
- `profiles_email_idx`
- `tenant_users_tenant_id_idx`
- `tenant_users_profile_id_idx`
- `tenant_users_role_idx`
- `tenant_subscriptions_tenant_id_idx`
- `tenant_subscriptions_one_current_per_tenant_idx`
- `tenant_subscriptions_status_idx`
- `audit_events_tenant_occurred_at_idx`
- `audit_events_actor_profile_id_idx`
- `audit_events_entity_idx`

The added partial unique index on `tenant_subscriptions(tenant_id)` where `deleted_at is null` confirms the intended Phase 1 model: one current subscription row per tenant, with future billing history handled separately.

## Migration Safety Review

Safety findings:

- The migration is additive for a new Supabase project.
- It creates only Phase 1 foundation tables.
- It does not modify application code.
- It does not remove localStorage workflows.
- It does not create patient, booking, invoice, clinical, document, payment, or storage tables.
- Seed data is idempotent through `on conflict`.
- RLS is enabled immediately.
- No destructive statements are present.

Pre-deployment requirement:

- Confirm the target Supabase project is the correct AlliDesk project.
- Confirm this migration has not already been partially applied.
- Confirm the old deleted pilot migration is not part of the deployment path.

Review result: approved for controlled Supabase deployment after checklist completion.

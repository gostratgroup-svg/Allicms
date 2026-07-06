# Phase 1 Deployment Checklist

Migration: `supabase/migrations/202607060001_phase1_platform_identity.sql`  
Scope: AlliDesk platform and identity foundation only.

## Backup Considerations

□ Confirm whether the target Supabase project is empty or already contains data.  
□ If data exists, create a database backup before applying the migration.  
□ Export current schema state if the project has previous experiments.  
□ Confirm backup restore access before migration execution.

## Environment Verification

□ Confirm local repository branch is correct.  
□ Confirm `.env.local` points to the intended Supabase project for testing.  
□ Confirm Vercel environment variables are not changed during this database-only deployment.  
□ Confirm no app workflow is being switched from localStorage to live data in this sprint.

## Supabase Project Verification

□ Confirm Supabase project name and URL.  
□ Confirm project region.  
□ Confirm database password/admin access is available.  
□ Confirm Supabase Auth is enabled or available.  
□ Confirm service-role access is available for initial Super Admin bootstrap.  
□ Confirm this is not a production patient-data project containing real patient records.

## Migration Execution

□ Review migration file one final time.  
□ Confirm only Phase 1 tables are included.  
□ Apply migration through the approved Supabase workflow.  
□ Save migration execution output.  
□ Confirm migration completed without errors.

## Table Verification

□ Verify `platform_configurations` exists.  
□ Verify `subscription_plans` exists.  
□ Verify `tenants` exists.  
□ Verify `profiles` exists.  
□ Verify `tenant_users` exists.  
□ Verify `tenant_subscriptions` exists.  
□ Verify `audit_events` exists.  
□ Confirm no patient, booking, invoice, clinical, document, payment, or storage tables were created.

## Constraint Verification

□ Verify UUID primary keys named `id`.  
□ Verify `profiles.id` references `auth.users.id`.  
□ Verify `tenant_users.tenant_id` references `tenants.id`.  
□ Verify `tenant_users.profile_id` references `profiles.id`.  
□ Verify `tenant_subscriptions.tenant_id` references `tenants.id`.  
□ Verify `tenant_subscriptions.subscription_plan_id` references `subscription_plans.id`.  
□ Verify `tenant_users.role` check constraint.  
□ Verify `tenants.tenant_status` check constraint.  
□ Verify `tenant_subscriptions.subscription_status` check constraint.  
□ Verify unique membership constraint on `tenant_users(tenant_id, profile_id)`.  
□ Verify one current tenant subscription partial unique index.

## RLS Verification

□ Confirm RLS is enabled on `platform_configurations`.  
□ Confirm RLS is enabled on `subscription_plans`.  
□ Confirm RLS is enabled on `tenants`.  
□ Confirm RLS is enabled on `profiles`.  
□ Confirm RLS is enabled on `tenant_users`.  
□ Confirm RLS is enabled on `tenant_subscriptions`.  
□ Confirm RLS is enabled on `audit_events`.  
□ Confirm anonymous users cannot read tables.  
□ Confirm authenticated users can only access allowed records.  
□ Confirm tenant membership policies work after test users are created.

## Auth Verification

□ Create or identify a test authenticated user.  
□ Create matching `profiles` row.  
□ Confirm user can read own profile.  
□ Confirm user cannot set `is_super_admin` from client grants.  
□ Bootstrap one Super Admin through service-role/direct trusted process.  
□ Confirm Super Admin can manage platform tables.  
□ Create a test tenant and tenant admin membership.  
□ Confirm tenant admin can read tenant shell and membership records.

## Index Verification

□ Verify subscription plan indexes.  
□ Verify tenant status index.  
□ Verify tenant primary contact email index.  
□ Verify profile email index.  
□ Verify tenant user membership indexes.  
□ Verify tenant subscription indexes.  
□ Verify audit event indexes.

## Seed Verification

□ Verify `platform_identity` exists in `platform_configurations`.  
□ Verify subscription plans exist:

□ Free  
□ Starter  
□ Professional  
□ Growth  
□ Business  
□ Enterprise

□ Confirm Free plan is hidden from public plan reads unless Super Admin.  
□ Confirm active public plans are readable by authenticated users.

## Rollback Considerations

□ Confirm there is no real patient or tenant operational data before rollback.  
□ If rollback is needed immediately after migration, drop only Phase 1 objects in reverse dependency order.  
□ If data exists, export affected rows before rollback.  
□ Record rollback reason in project notes.  
□ Do not rollback by editing app code or localStorage workflows.

## Sign-Off Checklist

□ Database migration applied successfully.  
□ Phase 1 tables verified.  
□ RLS verified.  
□ Constraints verified.  
□ Indexes verified.  
□ Seed data verified.  
□ Super Admin bootstrap path confirmed.  
□ `npm run build` passes after migration file changes.  
□ No application workflow was moved to live data.  
□ Approved to proceed to the next production foundation task.

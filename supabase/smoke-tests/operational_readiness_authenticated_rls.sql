-- AlliDesk Operational Readiness Step 1B authenticated RLS harness.
--
-- Purpose:
--   Validate tenant isolation and role-scoped access for the dedicated
--   development Auth users created for allidesk-dev.
--
-- Safety:
--   - Development only.
--   - Does not store passwords, JWTs, or service-role secrets.
--   - Direct lifecycle bypass attempts are wrapped in subtransactions and do
--     not persist test mutations.

create temp table if not exists operational_readiness_rls_results (
  area text,
  actor_email text,
  check_name text,
  observed text,
  expected text,
  status text,
  details text
) on commit preserve rows;

truncate operational_readiness_rls_results;
grant insert, select on operational_readiness_rls_results to authenticated;

create temp table if not exists operational_readiness_auth_context (
  email text primary key,
  profile_id uuid not null
) on commit preserve rows;

truncate operational_readiness_auth_context;
grant select on operational_readiness_auth_context to authenticated;

insert into operational_readiness_auth_context (email, profile_id)
select lower(email), id
from auth.users
where lower(email) in (
  'gostratgroup+allidesk-admin-a@gmail.com',
  'gostratgroup+allidesk-therapist-a@gmail.com',
  'gostratgroup+allidesk-reception-a@gmail.com',
  'gostratgroup+allidesk-finance-a@gmail.com',
  'gostratgroup+allidesk-admin-b@gmail.com'
);

-- Tenant A admin.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', (select profile_id::text from operational_readiness_auth_context where email = 'gostratgroup+allidesk-admin-a@gmail.com'), true);
insert into operational_readiness_rls_results
select 'tenant_isolation', 'gostratgroup+allidesk-admin-a@gmail.com', 'Tenant A admin sees Tenant A patient', count(*)::text, '1', case when count(*) = 1 then 'passed' else 'failed' end, null
from public.patients where tenant_id = '10000000-0000-4000-8000-000000000001';
insert into operational_readiness_rls_results
select 'tenant_isolation', 'gostratgroup+allidesk-admin-a@gmail.com', 'Tenant A admin cannot see Tenant B patient', count(*)::text, '0', case when count(*) = 0 then 'passed' else 'failed' end, null
from public.patients where tenant_id = '20000000-0000-4000-8000-000000000001';
insert into operational_readiness_rls_results
select 'role_access', 'gostratgroup+allidesk-admin-a@gmail.com', 'Admin operational read matrix',
       jsonb_build_object(
         'patients', (select count(*) from public.patients),
         'bookings', (select count(*) from public.bookings),
         'sessions', (select count(*) from public.sessions),
         'invoices', (select count(*) from public.invoices),
         'clinical_notes', (select count(*) from public.clinical_notes)
       )::text,
       'Tenant A operational records visible; Tenant B hidden',
       case
         when (select count(*) from public.patients where tenant_id = '10000000-0000-4000-8000-000000000001') = 1
          and (select count(*) from public.patients where tenant_id = '20000000-0000-4000-8000-000000000001') = 0
          and (select count(*) from public.invoices) >= 1
         then 'passed'
         else 'failed'
       end,
       null;
do $$
declare
  affected integer := 0;
  message text := null;
begin
  begin
    update public.patients
    set phone = '+27999999999'
    where id = '20000000-0000-4000-8000-000000000002';
    get diagnostics affected = row_count;
    raise exception 'rollback direct cross-tenant update test';
  exception when others then
    message := sqlerrm;
    insert into operational_readiness_rls_results
    values (
      'tenant_isolation',
      'gostratgroup+allidesk-admin-a@gmail.com',
      'Tenant A admin cannot update Tenant B patient',
      coalesce(affected::text, '0'),
      '0',
      case when coalesce(affected, 0) = 0 then 'passed' else 'failed' end,
      message
    );
  end;
end $$;
do $$
declare
  affected integer := 0;
  message text := null;
begin
  begin
    update public.sessions
    set
      session_status = 'cancelled',
      attendance_outcome = 'cancelled',
      session_outcome = 'cancelled',
      cancelled_at = now()
    where id = '10000000-0000-4000-8000-000000000014';
    get diagnostics affected = row_count;
    raise exception 'rollback direct session lifecycle update test';
  exception when others then
    message := sqlerrm;
    insert into operational_readiness_rls_results
    values (
      'lifecycle_bypass',
      'gostratgroup+allidesk-admin-a@gmail.com',
      'Direct session lifecycle update cannot bypass RPC',
      coalesce(affected::text, '0'),
      'blocked or zero rows',
      case when message <> 'rollback direct session lifecycle update test' or coalesce(affected, 0) = 0 then 'passed' else 'failed' end,
      message
    );
  end;
end $$;
do $$
declare
  affected integer := 0;
  message text := null;
begin
  begin
    update public.invoices
    set invoice_status = 'confirmed'
    where id = '10000000-0000-4000-8000-000000000016';
    get diagnostics affected = row_count;
    raise exception 'rollback direct invoice lifecycle update test';
  exception when others then
    message := sqlerrm;
    insert into operational_readiness_rls_results
    values (
      'lifecycle_bypass',
      'gostratgroup+allidesk-admin-a@gmail.com',
      'Direct invoice lifecycle update cannot bypass RPC',
      coalesce(affected::text, '0'),
      'blocked or zero rows',
      case when message <> 'rollback direct invoice lifecycle update test' or coalesce(affected, 0) = 0 then 'passed' else 'failed' end,
      message
    );
  end;
end $$;
commit;

-- Tenant A therapist.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', (select profile_id::text from operational_readiness_auth_context where email = 'gostratgroup+allidesk-therapist-a@gmail.com'), true);
insert into operational_readiness_rls_results
select 'role_access', 'gostratgroup+allidesk-therapist-a@gmail.com', 'Therapist read matrix',
       jsonb_build_object(
         'patients', (select count(*) from public.patients),
         'bookings', (select count(*) from public.bookings),
         'sessions', (select count(*) from public.sessions),
         'invoices', (select count(*) from public.invoices),
         'clinical_notes', (select count(*) from public.clinical_notes)
       )::text,
       'Patients/bookings/sessions/clinical visible; finance hidden',
       case
         when (select count(*) from public.patients) = 1
          and (select count(*) from public.bookings) = 1
          and (select count(*) from public.sessions) = 1
          and (select count(*) from public.clinical_notes) >= 1
          and (select count(*) from public.invoices) = 0
         then 'passed'
         else 'failed'
       end,
       null;
commit;

-- Tenant A receptionist.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', (select profile_id::text from operational_readiness_auth_context where email = 'gostratgroup+allidesk-reception-a@gmail.com'), true);
insert into operational_readiness_rls_results
select 'role_access', 'gostratgroup+allidesk-reception-a@gmail.com', 'Reception read matrix',
       jsonb_build_object(
         'patients', (select count(*) from public.patients),
         'bookings', (select count(*) from public.bookings),
         'sessions', (select count(*) from public.sessions),
         'invoices', (select count(*) from public.invoices),
         'clinical_notes', (select count(*) from public.clinical_notes)
       )::text,
       'Patients/bookings/sessions visible; finance/clinical hidden',
       case
         when (select count(*) from public.patients) = 1
          and (select count(*) from public.bookings) = 1
          and (select count(*) from public.sessions) = 1
          and (select count(*) from public.invoices) = 0
          and (select count(*) from public.clinical_notes) = 0
         then 'passed'
         else 'failed'
       end,
       null;
commit;

-- Tenant A finance.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', (select profile_id::text from operational_readiness_auth_context where email = 'gostratgroup+allidesk-finance-a@gmail.com'), true);
insert into operational_readiness_rls_results
select 'role_access', 'gostratgroup+allidesk-finance-a@gmail.com', 'Finance read matrix',
       jsonb_build_object(
         'patients', (select count(*) from public.patients),
         'bookings', (select count(*) from public.bookings),
         'sessions', (select count(*) from public.sessions),
         'invoices', (select count(*) from public.invoices),
         'payments', (select count(*) from public.payments),
         'clinical_notes', (select count(*) from public.clinical_notes)
       )::text,
       'Finance records visible; clinical hidden',
       case
         when (select count(*) from public.invoices) >= 1
          and (select count(*) from public.clinical_notes) = 0
         then 'passed'
         else 'failed'
       end,
       null;
commit;

-- Tenant B admin.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', (select profile_id::text from operational_readiness_auth_context where email = 'gostratgroup+allidesk-admin-b@gmail.com'), true);
insert into operational_readiness_rls_results
select 'tenant_isolation', 'gostratgroup+allidesk-admin-b@gmail.com', 'Tenant B admin sees Tenant B patient', count(*)::text, '1', case when count(*) = 1 then 'passed' else 'failed' end, null
from public.patients where tenant_id = '20000000-0000-4000-8000-000000000001';
insert into operational_readiness_rls_results
select 'tenant_isolation', 'gostratgroup+allidesk-admin-b@gmail.com', 'Tenant B admin cannot see Tenant A patient', count(*)::text, '0', case when count(*) = 0 then 'passed' else 'failed' end, null
from public.patients where tenant_id = '10000000-0000-4000-8000-000000000001';
commit;

select *
from operational_readiness_rls_results
order by area, actor_email, check_name;

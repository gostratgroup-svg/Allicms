-- AlliDesk Phase 1: Platform and identity foundation.
-- Scope: platform_configurations, subscription_plans, tenants, profiles,
-- tenant_users, tenant_subscriptions, audit_events.
--
-- This migration intentionally does not create patient, booking, invoice,
-- clinical, document, payment, or storage tables.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.platform_configurations (
  id uuid primary key default gen_random_uuid(),
  config_key text not null unique,
  config_value jsonb not null default '{}'::jsonb,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  plan_code text not null unique,
  plan_name text not null,
  description text,
  user_min integer,
  user_max integer,
  price_monthly numeric(12, 2),
  currency_code text not null default 'ZAR',
  is_active boolean not null default true,
  is_public boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint subscription_plans_user_range_check
    check (user_min is null or user_max is null or user_min <= user_max),
  constraint subscription_plans_price_monthly_check
    check (price_monthly is null or price_monthly >= 0)
);

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  practice_name text not null,
  trading_name text,
  company_registration_number text,
  vat_number text,
  primary_contact_name text,
  primary_contact_email text,
  primary_contact_phone text,
  country text not null default 'South Africa',
  time_zone text not null default 'Africa/Johannesburg',
  tenant_status text not null default 'trial',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint tenants_tenant_status_check
    check (tenant_status in ('trial', 'active', 'suspended', 'cancelled', 'archived'))
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  email text,
  phone text,
  is_super_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.tenant_users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null,
  is_active boolean not null default true,
  invited_at timestamptz,
  activated_at timestamptz,
  deactivated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint tenant_users_role_check
    check (role in ('admin', 'receptionist', 'therapist', 'finance')),
  constraint tenant_users_unique_membership unique (tenant_id, profile_id)
);

create table public.tenant_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  subscription_plan_id uuid references public.subscription_plans(id) on delete set null,
  subscription_status text not null default 'trial',
  billing_cycle text not null default 'monthly',
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  current_period_starts_at timestamptz,
  current_period_ends_at timestamptz,
  next_billing_date date,
  cancelled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint tenant_subscriptions_subscription_status_check
    check (subscription_status in ('trial', 'active', 'past_due', 'cancelled', 'suspended')),
  constraint tenant_subscriptions_billing_cycle_check
    check (billing_cycle in ('monthly', 'annual', 'custom'))
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  actor_tenant_user_id uuid references public.tenant_users(id) on delete set null,
  action text not null,
  entity_table text not null,
  entity_id uuid,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger platform_configurations_set_updated_at
before update on public.platform_configurations
for each row execute function public.set_updated_at();

create trigger subscription_plans_set_updated_at
before update on public.subscription_plans
for each row execute function public.set_updated_at();

create trigger tenants_set_updated_at
before update on public.tenants
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger tenant_users_set_updated_at
before update on public.tenant_users
for each row execute function public.set_updated_at();

create trigger tenant_subscriptions_set_updated_at
before update on public.tenant_subscriptions
for each row execute function public.set_updated_at();

create index subscription_plans_active_public_idx
  on public.subscription_plans (is_active, is_public)
  where deleted_at is null;

create index tenants_tenant_status_idx
  on public.tenants (tenant_status)
  where deleted_at is null;

create index tenants_primary_contact_email_idx
  on public.tenants (lower(primary_contact_email))
  where primary_contact_email is not null and deleted_at is null;

create index profiles_email_idx
  on public.profiles (lower(email))
  where email is not null and deleted_at is null;

create index tenant_users_tenant_id_idx
  on public.tenant_users (tenant_id)
  where deleted_at is null;

create index tenant_users_profile_id_idx
  on public.tenant_users (profile_id)
  where deleted_at is null;

create index tenant_users_role_idx
  on public.tenant_users (tenant_id, role)
  where deleted_at is null and is_active = true;

create index tenant_subscriptions_tenant_id_idx
  on public.tenant_subscriptions (tenant_id)
  where deleted_at is null;

create unique index tenant_subscriptions_one_current_per_tenant_idx
  on public.tenant_subscriptions (tenant_id)
  where deleted_at is null;

create index tenant_subscriptions_status_idx
  on public.tenant_subscriptions (subscription_status, next_billing_date)
  where deleted_at is null;

create index audit_events_tenant_occurred_at_idx
  on public.audit_events (tenant_id, occurred_at desc);

create index audit_events_actor_profile_id_idx
  on public.audit_events (actor_profile_id, occurred_at desc);

create index audit_events_entity_idx
  on public.audit_events (entity_table, entity_id);

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (
      select p.is_super_admin
      from public.profiles p
      where p.id = auth.uid()
        and p.deleted_at is null
    ),
    false
  );
$$;

create or replace function public.is_tenant_member(target_tenant_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_users tu
    where tu.tenant_id = target_tenant_id
      and tu.profile_id = auth.uid()
      and tu.is_active = true
      and tu.deleted_at is null
  );
$$;

create or replace function public.has_tenant_role(target_tenant_id uuid, allowed_roles text[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_users tu
    where tu.tenant_id = target_tenant_id
      and tu.profile_id = auth.uid()
      and tu.role = any(allowed_roles)
      and tu.is_active = true
      and tu.deleted_at is null
  );
$$;

revoke all on function public.is_super_admin() from public, anon;
revoke all on function public.is_tenant_member(uuid) from public, anon;
revoke all on function public.has_tenant_role(uuid, text[]) from public, anon;

grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_tenant_member(uuid) to authenticated;
grant execute on function public.has_tenant_role(uuid, text[]) to authenticated;

alter table public.platform_configurations enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.tenant_users enable row level security;
alter table public.tenant_subscriptions enable row level security;
alter table public.audit_events enable row level security;

create policy "authenticated users can read platform configurations"
on public.platform_configurations
for select
to authenticated
using (true);

create policy "super admins can manage platform configurations"
on public.platform_configurations
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

create policy "authenticated users can read public active subscription plans"
on public.subscription_plans
for select
to authenticated
using (
  deleted_at is null
  and (
    (is_active = true and is_public = true)
    or public.is_super_admin()
  )
);

create policy "super admins can manage subscription plans"
on public.subscription_plans
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

create policy "tenant members can read their tenant shell"
on public.tenants
for select
to authenticated
using (
  deleted_at is null
  and (
    public.is_super_admin()
    or public.is_tenant_member(id)
  )
);

create policy "super admins can manage tenants"
on public.tenants
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

create policy "users can read their own profile"
on public.profiles
for select
to authenticated
using (
  deleted_at is null
  and (
    id = auth.uid()
    or public.is_super_admin()
  )
);

create policy "users can create their own profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "users can update their own basic profile"
on public.profiles
for update
to authenticated
using (id = auth.uid() and deleted_at is null)
with check (id = auth.uid() and deleted_at is null);

create policy "super admins can manage profiles"
on public.profiles
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

create policy "users can read their tenant memberships"
on public.tenant_users
for select
to authenticated
using (
  deleted_at is null
  and (
    profile_id = auth.uid()
    or public.is_super_admin()
    or public.has_tenant_role(tenant_id, array['admin'])
  )
);

create policy "tenant admins can create tenant users"
on public.tenant_users
for insert
to authenticated
with check (
  public.is_super_admin()
  or public.has_tenant_role(tenant_id, array['admin'])
);

create policy "tenant admins can update tenant users"
on public.tenant_users
for update
to authenticated
using (
  public.is_super_admin()
  or public.has_tenant_role(tenant_id, array['admin'])
)
with check (
  public.is_super_admin()
  or public.has_tenant_role(tenant_id, array['admin'])
);

create policy "tenant admins and finance users can read subscriptions"
on public.tenant_subscriptions
for select
to authenticated
using (
  deleted_at is null
  and (
    public.is_super_admin()
    or public.has_tenant_role(tenant_id, array['admin', 'finance'])
  )
);

create policy "super admins can manage tenant subscriptions"
on public.tenant_subscriptions
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

create policy "tenant admins can read tenant audit events"
on public.audit_events
for select
to authenticated
using (
  public.is_super_admin()
  or (
    tenant_id is not null
    and public.has_tenant_role(tenant_id, array['admin'])
  )
);

create policy "members can append tenant audit events"
on public.audit_events
for insert
to authenticated
with check (
  actor_profile_id = auth.uid()
  and (
    public.is_super_admin()
    or (
      tenant_id is not null
      and public.is_tenant_member(tenant_id)
    )
  )
);

revoke all on public.platform_configurations from anon, authenticated;
revoke all on public.subscription_plans from anon, authenticated;
revoke all on public.tenants from anon, authenticated;
revoke all on public.profiles from anon, authenticated;
revoke all on public.tenant_users from anon, authenticated;
revoke all on public.tenant_subscriptions from anon, authenticated;
revoke all on public.audit_events from anon, authenticated;

grant select on public.platform_configurations to authenticated;
grant select on public.subscription_plans to authenticated;
grant select on public.tenants to authenticated;
grant select on public.tenant_subscriptions to authenticated;
grant select, insert on public.audit_events to authenticated;

grant select on public.profiles to authenticated;
grant insert (id, first_name, last_name, email, phone) on public.profiles to authenticated;
grant update (first_name, last_name, email, phone, updated_at) on public.profiles to authenticated;

grant select, insert, update on public.tenant_users to authenticated;

grant insert, update on public.platform_configurations to authenticated;
grant insert, update on public.subscription_plans to authenticated;
grant insert, update on public.tenants to authenticated;
grant insert, update on public.tenant_subscriptions to authenticated;

insert into public.platform_configurations (config_key, config_value, description)
values
  (
    'platform_identity',
    jsonb_build_object(
      'platform_name', 'AlliDesk',
      'marketing_website', 'https://allidesk.co.za',
      'web_app', 'https://app.allidesk.co.za',
      'default_time_zone', 'Africa/Johannesburg',
      'default_language', 'English'
    ),
    'Core platform identity and public URLs.'
  )
on conflict (config_key) do nothing;

insert into public.subscription_plans (
  plan_code,
  plan_name,
  description,
  user_min,
  user_max,
  price_monthly,
  currency_code,
  is_active,
  is_public
)
values
  ('free', 'Free', 'Internal testing and assisted setup', null, null, 0, 'ZAR', true, false),
  ('starter', 'Starter', 'Solo Practitioner', 1, 1, 399, 'ZAR', true, true),
  ('professional', 'Professional', 'Small Practice', 2, 5, 899, 'ZAR', true, true),
  ('growth', 'Growth', 'Growing Practice', 6, 15, 1899, 'ZAR', true, true),
  ('business', 'Business', 'Multi-disciplinary Practice', 16, 50, 3499, 'ZAR', true, true),
  ('enterprise', 'Enterprise', 'Large Healthcare Group', 51, null, null, 'ZAR', true, true)
on conflict (plan_code) do nothing;

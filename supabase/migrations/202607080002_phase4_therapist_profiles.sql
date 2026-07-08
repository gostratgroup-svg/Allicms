-- AlliDesk Phase 4: Therapist profile foundation.
-- Scope: therapist_profiles and professional_registrations.
--
-- This migration intentionally does not create bookings, patients, invoices,
-- statements, payments, calendars, documents, or operational workflow tables.
--
-- Future support notes:
-- - therapist_profiles will later connect to appointment/service provider
--   relationships when bookings are implemented.
-- - therapist-specific practice numbers can be selected by invoice snapshots
--   when billing workflows are implemented.
-- - therapist-specific banking can be represented through bank_accounts
--   using owner_type = 'therapist' and owner_id = therapist_profiles.id,
--   after explicit relationship constraints are approved.
-- - therapist-specific billing overrides should be governed by billing_settings
--   and captured immutably on invoices when finance workflows are implemented.

create table public.therapist_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  display_name text not null,
  profession text,
  qualifications text,
  bio text,
  default_appointment_duration_minutes integer,
  default_billing_rate numeric(12, 2),
  practice_number text,
  billing_name text,
  billing_email text,
  billing_phone text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint therapist_profiles_default_duration_check
    check (
      default_appointment_duration_minutes is null
      or default_appointment_duration_minutes > 0
    ),
  constraint therapist_profiles_default_billing_rate_check
    check (
      default_billing_rate is null
      or default_billing_rate >= 0
    )
);

create table public.professional_registrations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  therapist_profile_id uuid not null references public.therapist_profiles(id) on delete cascade,
  registration_body text not null,
  registration_number text not null,
  registration_type text,
  country text not null default 'South Africa',
  valid_from date,
  valid_until date,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint professional_registrations_valid_dates_check
    check (
      valid_from is null
      or valid_until is null
      or valid_from <= valid_until
    )
);

create trigger therapist_profiles_set_updated_at
before update on public.therapist_profiles
for each row execute function public.set_updated_at();

create trigger professional_registrations_set_updated_at
before update on public.professional_registrations
for each row execute function public.set_updated_at();

create index therapist_profiles_tenant_id_idx
  on public.therapist_profiles (tenant_id)
  where deleted_at is null;

create index therapist_profiles_user_id_idx
  on public.therapist_profiles (user_id)
  where user_id is not null and deleted_at is null;

create index therapist_profiles_active_idx
  on public.therapist_profiles (tenant_id, is_active)
  where deleted_at is null;

create index therapist_profiles_deleted_at_idx
  on public.therapist_profiles (deleted_at);

create unique index therapist_profiles_one_per_tenant_user_idx
  on public.therapist_profiles (tenant_id, user_id)
  where user_id is not null and deleted_at is null;

create index professional_registrations_tenant_id_idx
  on public.professional_registrations (tenant_id)
  where deleted_at is null;

create index professional_registrations_therapist_profile_id_idx
  on public.professional_registrations (therapist_profile_id)
  where deleted_at is null;

create index professional_registrations_active_idx
  on public.professional_registrations (tenant_id, is_active)
  where deleted_at is null;

create index professional_registrations_deleted_at_idx
  on public.professional_registrations (deleted_at);

create index professional_registrations_body_idx
  on public.professional_registrations (tenant_id, registration_body)
  where deleted_at is null;

create index professional_registrations_number_idx
  on public.professional_registrations (tenant_id, registration_number)
  where deleted_at is null;

create unique index professional_registrations_unique_active_number_idx
  on public.professional_registrations (tenant_id, lower(registration_body), lower(registration_number))
  where deleted_at is null and is_active = true;

create unique index professional_registrations_one_primary_per_therapist_idx
  on public.professional_registrations (therapist_profile_id)
  where deleted_at is null and is_active = true and is_primary = true;

alter table public.therapist_profiles enable row level security;
alter table public.professional_registrations enable row level security;

create policy "tenant members can read therapist profiles"
on public.therapist_profiles
for select
to authenticated
using (
  deleted_at is null
  and public.is_tenant_member(tenant_id)
);

create policy "tenant admins can create therapist profiles"
on public.therapist_profiles
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin']));

create policy "tenant admins can update therapist profiles"
on public.therapist_profiles
for update
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin'])
)
with check (public.has_tenant_role(tenant_id, array['admin']));

create policy "tenant members can read professional registrations"
on public.professional_registrations
for select
to authenticated
using (
  deleted_at is null
  and public.is_tenant_member(tenant_id)
);

create policy "tenant admins can create professional registrations"
on public.professional_registrations
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin']));

create policy "tenant admins can update professional registrations"
on public.professional_registrations
for update
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin'])
)
with check (public.has_tenant_role(tenant_id, array['admin']));

revoke all on public.therapist_profiles from anon, authenticated;
revoke all on public.professional_registrations from anon, authenticated;

grant select, insert, update on public.therapist_profiles to authenticated;
grant select, insert, update on public.professional_registrations to authenticated;

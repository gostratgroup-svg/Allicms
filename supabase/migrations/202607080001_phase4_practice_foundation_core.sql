-- AlliDesk Phase 4: Practice Foundation core.
-- Scope: practice_profiles, practice_locations, bank_accounts,
-- practice_branding, billing_settings, communication_templates.
--
-- This migration intentionally does not create booking, patient, invoice,
-- statement, payment, patient link, clinical, document, or operational
-- workflow tables.
--
-- Audit note:
-- Phase 1 created audit_events but no generic audit trigger pattern exists yet.
-- Practice Foundation write actions should append audit_events from the
-- application/service layer until an explicit audit trigger design is approved.

create table public.practice_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  legal_name text,
  trading_name text,
  business_registration_number text,
  tax_number text,
  vat_number text,
  main_email text,
  main_phone text,
  website text,
  default_time_zone text not null default 'Africa/Johannesburg',
  default_country text not null default 'South Africa',
  default_currency text not null default 'ZAR',
  profile_status text not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint practice_profiles_profile_status_check
    check (profile_status in ('draft', 'active', 'incomplete', 'archived')),
  constraint practice_profiles_default_currency_check
    check (char_length(default_currency) = 3)
);

create table public.practice_locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  practice_profile_id uuid references public.practice_profiles(id) on delete set null,
  location_name text not null,
  location_type text not null default 'practice',
  address_line_1 text,
  address_line_2 text,
  suburb text,
  city text,
  province text,
  postal_code text,
  country text not null default 'South Africa',
  contact_email text,
  contact_phone text,
  room_venue_notes text,
  is_main_location boolean not null default false,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint practice_locations_location_type_check
    check (location_type in ('practice', 'satellite', 'telehealth', 'partner', 'other'))
);

create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  owner_type text not null default 'tenant',
  owner_id uuid,
  account_label text,
  bank_name text not null,
  account_holder text not null,
  account_number text not null,
  branch_code text,
  account_type text,
  is_default boolean not null default false,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint bank_accounts_owner_type_check
    check (owner_type in ('tenant', 'therapist', 'location')),
  constraint bank_accounts_tenant_owner_check
    check (
      (owner_type = 'tenant' and owner_id is null)
      or (owner_type <> 'tenant' and owner_id is not null)
    )
);

create table public.practice_branding (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  practice_profile_id uuid references public.practice_profiles(id) on delete set null,
  logo_url text,
  primary_colour text,
  secondary_colour text,
  accent_colour text,
  invoice_logo_position text not null default 'bottom_left',
  statement_logo_position text not null default 'bottom_left',
  patient_facing_display_name text,
  document_branding_enabled boolean not null default true,
  patient_link_branding_enabled boolean not null default true,
  communication_branding_enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint practice_branding_invoice_logo_position_check
    check (invoice_logo_position in ('none', 'top_left', 'top_right', 'bottom_left', 'bottom_right')),
  constraint practice_branding_statement_logo_position_check
    check (statement_logo_position in ('none', 'top_left', 'top_right', 'bottom_left', 'bottom_right'))
);

create table public.billing_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  practice_profile_id uuid references public.practice_profiles(id) on delete set null,
  invoice_prefix text not null default 'INV',
  next_invoice_number integer not null default 1,
  statement_prefix text not null default 'ST',
  next_statement_number integer not null default 1,
  payment_terms_days integer not null default 7,
  default_bank_account_id uuid references public.bank_accounts(id) on delete set null,
  allow_therapist_billing boolean not null default false,
  allow_therapist_bank_accounts boolean not null default false,
  allow_price_override boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint billing_settings_next_invoice_number_check
    check (next_invoice_number > 0),
  constraint billing_settings_next_statement_number_check
    check (next_statement_number > 0),
  constraint billing_settings_payment_terms_days_check
    check (payment_terms_days between 0 and 365)
);

create table public.communication_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  practice_profile_id uuid references public.practice_profiles(id) on delete set null,
  template_key text not null,
  channel text not null,
  title text not null,
  message_body text not null,
  automation_trigger_key text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint communication_templates_channel_check
    check (channel in ('whatsapp', 'email', 'sms', 'patient_link', 'internal'))
);

create trigger practice_profiles_set_updated_at
before update on public.practice_profiles
for each row execute function public.set_updated_at();

create trigger practice_locations_set_updated_at
before update on public.practice_locations
for each row execute function public.set_updated_at();

create trigger bank_accounts_set_updated_at
before update on public.bank_accounts
for each row execute function public.set_updated_at();

create trigger practice_branding_set_updated_at
before update on public.practice_branding
for each row execute function public.set_updated_at();

create trigger billing_settings_set_updated_at
before update on public.billing_settings
for each row execute function public.set_updated_at();

create trigger communication_templates_set_updated_at
before update on public.communication_templates
for each row execute function public.set_updated_at();

create index practice_profiles_tenant_id_idx
  on public.practice_profiles (tenant_id)
  where deleted_at is null;

create unique index practice_profiles_one_active_per_tenant_idx
  on public.practice_profiles (tenant_id)
  where deleted_at is null;

create index practice_profiles_status_idx
  on public.practice_profiles (tenant_id, profile_status)
  where deleted_at is null;

create index practice_locations_tenant_id_idx
  on public.practice_locations (tenant_id)
  where deleted_at is null;

create index practice_locations_profile_id_idx
  on public.practice_locations (practice_profile_id)
  where deleted_at is null;

create index practice_locations_active_idx
  on public.practice_locations (tenant_id, is_active)
  where deleted_at is null;

create unique index practice_locations_one_main_per_tenant_idx
  on public.practice_locations (tenant_id)
  where deleted_at is null and is_main_location = true;

create index bank_accounts_tenant_id_idx
  on public.bank_accounts (tenant_id)
  where deleted_at is null;

create index bank_accounts_owner_idx
  on public.bank_accounts (tenant_id, owner_type, owner_id)
  where deleted_at is null;

create index bank_accounts_active_idx
  on public.bank_accounts (tenant_id, is_active)
  where deleted_at is null;

create unique index bank_accounts_one_default_per_owner_idx
  on public.bank_accounts (tenant_id, owner_type, coalesce(owner_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where deleted_at is null and is_active = true and is_default = true;

create index practice_branding_tenant_id_idx
  on public.practice_branding (tenant_id)
  where deleted_at is null;

create unique index practice_branding_one_active_per_tenant_idx
  on public.practice_branding (tenant_id)
  where deleted_at is null;

create index billing_settings_tenant_id_idx
  on public.billing_settings (tenant_id)
  where deleted_at is null;

create unique index billing_settings_one_active_per_tenant_idx
  on public.billing_settings (tenant_id)
  where deleted_at is null;

create index billing_settings_default_bank_account_idx
  on public.billing_settings (default_bank_account_id)
  where default_bank_account_id is not null and deleted_at is null;

create index communication_templates_tenant_id_idx
  on public.communication_templates (tenant_id)
  where deleted_at is null;

create index communication_templates_key_idx
  on public.communication_templates (tenant_id, template_key)
  where deleted_at is null;

create index communication_templates_channel_idx
  on public.communication_templates (tenant_id, channel, is_active)
  where deleted_at is null;

create index communication_templates_automation_trigger_idx
  on public.communication_templates (tenant_id, automation_trigger_key)
  where automation_trigger_key is not null and deleted_at is null;

create unique index communication_templates_unique_key_channel_idx
  on public.communication_templates (tenant_id, template_key, channel)
  where deleted_at is null;

alter table public.practice_profiles enable row level security;
alter table public.practice_locations enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.practice_branding enable row level security;
alter table public.billing_settings enable row level security;
alter table public.communication_templates enable row level security;

create policy "tenant members can read practice profiles"
on public.practice_profiles
for select
to authenticated
using (
  deleted_at is null
  and public.is_tenant_member(tenant_id)
);

create policy "tenant admins can create practice profiles"
on public.practice_profiles
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin']));

create policy "tenant admins can update practice profiles"
on public.practice_profiles
for update
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin'])
)
with check (public.has_tenant_role(tenant_id, array['admin']));

create policy "tenant members can read practice locations"
on public.practice_locations
for select
to authenticated
using (
  deleted_at is null
  and public.is_tenant_member(tenant_id)
);

create policy "tenant admins can create practice locations"
on public.practice_locations
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin']));

create policy "tenant admins can update practice locations"
on public.practice_locations
for update
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin'])
)
with check (public.has_tenant_role(tenant_id, array['admin']));

create policy "tenant admins and finance users can read bank accounts"
on public.bank_accounts
for select
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin', 'finance'])
);

create policy "tenant admins and finance users can create bank accounts"
on public.bank_accounts
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant admins and finance users can update bank accounts"
on public.bank_accounts
for update
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin', 'finance'])
)
with check (public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant members can read practice branding"
on public.practice_branding
for select
to authenticated
using (
  deleted_at is null
  and public.is_tenant_member(tenant_id)
);

create policy "tenant admins can create practice branding"
on public.practice_branding
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin']));

create policy "tenant admins can update practice branding"
on public.practice_branding
for update
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin'])
)
with check (public.has_tenant_role(tenant_id, array['admin']));

create policy "tenant admins and finance users can read billing settings"
on public.billing_settings
for select
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin', 'finance'])
);

create policy "tenant admins and finance users can create billing settings"
on public.billing_settings
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant admins and finance users can update billing settings"
on public.billing_settings
for update
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin', 'finance'])
)
with check (public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant members can read communication templates"
on public.communication_templates
for select
to authenticated
using (
  deleted_at is null
  and public.is_tenant_member(tenant_id)
);

create policy "tenant admins and communication users can create templates"
on public.communication_templates
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin']));

create policy "tenant admins and communication users can update templates"
on public.communication_templates
for update
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin'])
)
with check (public.has_tenant_role(tenant_id, array['admin']));

revoke all on public.practice_profiles from anon, authenticated;
revoke all on public.practice_locations from anon, authenticated;
revoke all on public.bank_accounts from anon, authenticated;
revoke all on public.practice_branding from anon, authenticated;
revoke all on public.billing_settings from anon, authenticated;
revoke all on public.communication_templates from anon, authenticated;

grant select, insert, update on public.practice_profiles to authenticated;
grant select, insert, update on public.practice_locations to authenticated;
grant select, insert, update on public.bank_accounts to authenticated;
grant select, insert, update on public.practice_branding to authenticated;
grant select, insert, update on public.billing_settings to authenticated;
grant select, insert, update on public.communication_templates to authenticated;

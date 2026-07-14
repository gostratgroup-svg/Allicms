-- AlliDesk Phase 5A: Patient Engine database foundation.
-- Scope: patients, responsible_parties, patient_addresses,
-- patient_emergency_contacts, patient_medical_information,
-- patient_consents, patient_alerts, patient_history_events, patient_links.
--
-- This migration intentionally does not create bookings, sessions, clinical
-- notes, invoices, statements, payments, documents, file storage, workflow
-- automation, or Patient Link UI behaviour.
--
-- Architecture notes:
-- - Patient data is tenant-owned operational data.
-- - Super Admin must not receive default access to patient records.
-- - Patient History is a human workflow timeline, not the audit log.
-- - Patient Link access will need a dedicated safe access path in a later
--   step. These tables only prepare the permanent link foundation.
-- - Confirmed finance documents must snapshot patient/responsible-party data
--   later rather than depending on mutable patient rows.

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_number text,
  patient_status text not null default 'prospective',
  patient_type text not null default 'unspecified',
  title text,
  first_name text not null,
  last_name text not null,
  preferred_name text,
  date_of_birth date,
  id_number text,
  gender text,
  language text,
  email text,
  phone text,
  referral_source text,
  active_icd10_code text,
  assigned_therapist_profile_id uuid references public.therapist_profiles(id) on delete set null,
  intake_sent_at timestamptz,
  intake_started_at timestamptz,
  intake_completed_at timestamptz,
  reviewed_at timestamptz,
  archived_at timestamptz,
  archive_reason text,
  merged_into_patient_id uuid references public.patients(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patients_patient_status_check
    check (patient_status in ('prospective', 'intake_sent', 'intake_in_progress', 'pending_review', 'registered', 'active', 'inactive', 'archived', 'merged')),
  constraint patients_patient_type_check
    check (patient_type in ('adult', 'teen', 'child', 'other', 'unspecified')),
  constraint patients_first_name_not_blank_check
    check (btrim(first_name) <> ''),
  constraint patients_last_name_not_blank_check
    check (btrim(last_name) <> ''),
  constraint patients_archived_state_check
    check (
      (patient_status = 'archived' and archived_at is not null)
      or patient_status <> 'archived'
    ),
  constraint patients_merged_patient_check
    check (merged_into_patient_id is null or merged_into_patient_id <> id)
);

create table public.responsible_parties (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  party_type text not null default 'person',
  relationship_to_patient text,
  full_name text not null,
  organisation_name text,
  id_number text,
  email text,
  phone text,
  is_primary boolean not null default false,
  is_billing_contact boolean not null default true,
  account_responsibility_status text not null default 'active',
  medical_aid_member_number text,
  medical_aid_dependant_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint responsible_parties_party_type_check
    check (party_type in ('person', 'organisation', 'employer', 'school', 'medical_aid_member', 'third_party')),
  constraint responsible_parties_account_responsibility_status_check
    check (account_responsibility_status in ('active', 'inactive', 'pending_review')),
  constraint responsible_parties_full_name_not_blank_check
    check (btrim(full_name) <> '')
);

create table public.patient_addresses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete cascade,
  responsible_party_id uuid references public.responsible_parties(id) on delete cascade,
  address_owner_type text not null,
  address_type text not null default 'residential',
  address_line_1 text,
  address_line_2 text,
  suburb text,
  city text,
  province text,
  postal_code text,
  country text not null default 'South Africa',
  is_primary boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patient_addresses_owner_type_check
    check (address_owner_type in ('patient', 'responsible_party')),
  constraint patient_addresses_type_check
    check (address_type in ('residential', 'billing', 'postal', 'other')),
  constraint patient_addresses_owner_check
    check (
      (address_owner_type = 'patient' and patient_id is not null and responsible_party_id is null)
      or (address_owner_type = 'responsible_party' and responsible_party_id is not null)
    )
);

create table public.patient_emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  full_name text not null,
  phone text not null,
  relationship_to_patient text,
  email text,
  notes text,
  is_primary boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patient_emergency_contacts_full_name_not_blank_check
    check (btrim(full_name) <> ''),
  constraint patient_emergency_contacts_phone_not_blank_check
    check (btrim(phone) <> '')
);

create table public.patient_medical_information (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  has_medical_aid boolean not null default false,
  medical_aid_name text,
  medical_aid_number text,
  medical_aid_dependant_code text,
  medical_aid_plan text,
  main_member_name text,
  main_member_id_number text,
  referring_professional text,
  referring_practice text,
  medical_conditions text,
  current_medication text,
  medical_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.patient_consents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  responsible_party_id uuid references public.responsible_parties(id) on delete set null,
  consent_type text not null,
  consent_status text not null default 'pending',
  consent_version text,
  consent_text text,
  signed_by_name text,
  signed_by_relationship text,
  signature_url text,
  accepted_at timestamptz,
  revoked_at timestamptz,
  source text not null default 'internal',
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patient_consents_type_check
    check (consent_type in ('popia', 'treatment', 'assessment', 'communication', 'financial_responsibility', 'other')),
  constraint patient_consents_status_check
    check (consent_status in ('pending', 'accepted', 'declined', 'revoked', 'expired')),
  constraint patient_consents_source_check
    check (source in ('internal', 'patient_link', 'imported')),
  constraint patient_consents_acceptance_check
    check (
      (consent_status = 'accepted' and accepted_at is not null)
      or consent_status <> 'accepted'
    )
);

create table public.patient_alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  alert_type text not null,
  severity text not null default 'info',
  title text not null,
  description text,
  is_active boolean not null default true,
  is_patient_visible boolean not null default false,
  resolved_at timestamptz,
  resolved_by_profile_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patient_alerts_type_check
    check (alert_type in ('allergy', 'medical', 'risk', 'consent', 'intake', 'finance', 'admin', 'clinical', 'other')),
  constraint patient_alerts_severity_check
    check (severity in ('info', 'low', 'medium', 'high', 'critical')),
  constraint patient_alerts_title_not_blank_check
    check (btrim(title) <> '')
);

create table public.patient_history_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  event_type text not null,
  event_title text not null,
  event_body text,
  source_table text,
  source_id uuid,
  is_patient_visible boolean not null default false,
  patient_visible_title text,
  patient_visible_body text,
  occurred_at timestamptz not null default now(),
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patient_history_events_title_not_blank_check
    check (btrim(event_title) <> ''),
  constraint patient_history_events_patient_visible_content_check
    check (
      is_patient_visible = false
      or patient_visible_title is not null
      or event_title is not null
    )
);

create table public.patient_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  link_token text not null,
  link_status text not null default 'active',
  requires_intake boolean not null default true,
  intake_started_at timestamptz,
  intake_completed_at timestamptz,
  last_accessed_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patient_links_status_check
    check (link_status in ('active', 'revoked', 'expired', 'archived')),
  constraint patient_links_token_not_blank_check
    check (btrim(link_token) <> '')
);

create trigger patients_set_updated_at
before update on public.patients
for each row execute function public.set_updated_at();

create trigger responsible_parties_set_updated_at
before update on public.responsible_parties
for each row execute function public.set_updated_at();

create trigger patient_addresses_set_updated_at
before update on public.patient_addresses
for each row execute function public.set_updated_at();

create trigger patient_emergency_contacts_set_updated_at
before update on public.patient_emergency_contacts
for each row execute function public.set_updated_at();

create trigger patient_medical_information_set_updated_at
before update on public.patient_medical_information
for each row execute function public.set_updated_at();

create trigger patient_consents_set_updated_at
before update on public.patient_consents
for each row execute function public.set_updated_at();

create trigger patient_alerts_set_updated_at
before update on public.patient_alerts
for each row execute function public.set_updated_at();

create trigger patient_history_events_set_updated_at
before update on public.patient_history_events
for each row execute function public.set_updated_at();

create trigger patient_links_set_updated_at
before update on public.patient_links
for each row execute function public.set_updated_at();

create index patients_tenant_id_idx
  on public.patients (tenant_id)
  where deleted_at is null;

create index patients_status_idx
  on public.patients (tenant_id, patient_status)
  where deleted_at is null;

create index patients_number_idx
  on public.patients (tenant_id, patient_number)
  where patient_number is not null and deleted_at is null;

create unique index patients_unique_number_per_tenant_idx
  on public.patients (tenant_id, lower(patient_number))
  where patient_number is not null and deleted_at is null;

create index patients_name_idx
  on public.patients (tenant_id, lower(last_name), lower(first_name))
  where deleted_at is null;

create index patients_id_number_idx
  on public.patients (tenant_id, id_number)
  where id_number is not null and deleted_at is null;

create index patients_assigned_therapist_idx
  on public.patients (tenant_id, assigned_therapist_profile_id)
  where assigned_therapist_profile_id is not null and deleted_at is null;

create index patients_deleted_at_idx
  on public.patients (deleted_at);

create index responsible_parties_tenant_id_idx
  on public.responsible_parties (tenant_id)
  where deleted_at is null;

create index responsible_parties_patient_id_idx
  on public.responsible_parties (patient_id)
  where deleted_at is null;

create index responsible_parties_email_idx
  on public.responsible_parties (tenant_id, lower(email))
  where email is not null and deleted_at is null;

create unique index responsible_parties_one_primary_per_patient_idx
  on public.responsible_parties (patient_id)
  where deleted_at is null and is_primary = true;

create index patient_addresses_tenant_id_idx
  on public.patient_addresses (tenant_id)
  where deleted_at is null;

create index patient_addresses_patient_id_idx
  on public.patient_addresses (patient_id)
  where patient_id is not null and deleted_at is null;

create index patient_addresses_responsible_party_id_idx
  on public.patient_addresses (responsible_party_id)
  where responsible_party_id is not null and deleted_at is null;

create unique index patient_addresses_one_primary_per_owner_idx
  on public.patient_addresses (
    tenant_id,
    address_owner_type,
    coalesce(patient_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(responsible_party_id, '00000000-0000-0000-0000-000000000000'::uuid),
    address_type
  )
  where deleted_at is null and is_primary = true;

create index patient_emergency_contacts_tenant_id_idx
  on public.patient_emergency_contacts (tenant_id)
  where deleted_at is null;

create index patient_emergency_contacts_patient_id_idx
  on public.patient_emergency_contacts (patient_id)
  where deleted_at is null;

create unique index patient_emergency_contacts_one_primary_per_patient_idx
  on public.patient_emergency_contacts (patient_id)
  where deleted_at is null and is_primary = true;

create index patient_medical_information_tenant_id_idx
  on public.patient_medical_information (tenant_id)
  where deleted_at is null;

create index patient_medical_information_patient_id_idx
  on public.patient_medical_information (patient_id)
  where deleted_at is null;

create unique index patient_medical_information_one_active_per_patient_idx
  on public.patient_medical_information (patient_id)
  where deleted_at is null;

create index patient_consents_tenant_id_idx
  on public.patient_consents (tenant_id)
  where deleted_at is null;

create index patient_consents_patient_id_idx
  on public.patient_consents (patient_id)
  where deleted_at is null;

create index patient_consents_type_status_idx
  on public.patient_consents (tenant_id, consent_type, consent_status)
  where deleted_at is null;

create index patient_alerts_tenant_id_idx
  on public.patient_alerts (tenant_id)
  where deleted_at is null;

create index patient_alerts_patient_id_idx
  on public.patient_alerts (patient_id)
  where deleted_at is null;

create index patient_alerts_active_idx
  on public.patient_alerts (tenant_id, is_active, severity)
  where deleted_at is null;

create index patient_history_events_tenant_id_idx
  on public.patient_history_events (tenant_id)
  where deleted_at is null;

create index patient_history_events_patient_occurred_idx
  on public.patient_history_events (patient_id, occurred_at desc)
  where deleted_at is null;

create index patient_history_events_visible_idx
  on public.patient_history_events (tenant_id, patient_id, is_patient_visible, occurred_at desc)
  where deleted_at is null;

create index patient_history_events_source_idx
  on public.patient_history_events (source_table, source_id)
  where source_table is not null and source_id is not null and deleted_at is null;

create index patient_links_tenant_id_idx
  on public.patient_links (tenant_id)
  where deleted_at is null;

create index patient_links_patient_id_idx
  on public.patient_links (patient_id)
  where deleted_at is null;

create unique index patient_links_one_active_per_patient_idx
  on public.patient_links (patient_id)
  where deleted_at is null and link_status = 'active';

create unique index patient_links_token_idx
  on public.patient_links (link_token)
  where deleted_at is null;

alter table public.patients enable row level security;
alter table public.responsible_parties enable row level security;
alter table public.patient_addresses enable row level security;
alter table public.patient_emergency_contacts enable row level security;
alter table public.patient_medical_information enable row level security;
alter table public.patient_consents enable row level security;
alter table public.patient_alerts enable row level security;
alter table public.patient_history_events enable row level security;
alter table public.patient_links enable row level security;

create policy "tenant members can read patients"
on public.patients
for select
to authenticated
using (
  deleted_at is null
  and public.is_tenant_member(tenant_id)
);

create policy "tenant care users can create patients"
on public.patients
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist']));

create policy "tenant care users can update patients"
on public.patients
for update
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist'])
)
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist']));

create policy "tenant members can read responsible parties"
on public.responsible_parties
for select
to authenticated
using (
  deleted_at is null
  and public.is_tenant_member(tenant_id)
);

create policy "tenant care and finance users can create responsible parties"
on public.responsible_parties
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist', 'finance']));

create policy "tenant care and finance users can update responsible parties"
on public.responsible_parties
for update
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist', 'finance'])
)
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist', 'finance']));

create policy "tenant members can read patient addresses"
on public.patient_addresses
for select
to authenticated
using (
  deleted_at is null
  and public.is_tenant_member(tenant_id)
);

create policy "tenant care and finance users can create patient addresses"
on public.patient_addresses
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist', 'finance']));

create policy "tenant care and finance users can update patient addresses"
on public.patient_addresses
for update
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist', 'finance'])
)
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist', 'finance']));

create policy "tenant members can read patient emergency contacts"
on public.patient_emergency_contacts
for select
to authenticated
using (
  deleted_at is null
  and public.is_tenant_member(tenant_id)
);

create policy "tenant care users can create patient emergency contacts"
on public.patient_emergency_contacts
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist']));

create policy "tenant care users can update patient emergency contacts"
on public.patient_emergency_contacts
for update
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist'])
)
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist']));

create policy "tenant care users can read patient medical information"
on public.patient_medical_information
for select
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist'])
);

create policy "tenant clinical users can create patient medical information"
on public.patient_medical_information
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'therapist']));

create policy "tenant clinical users can update patient medical information"
on public.patient_medical_information
for update
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin', 'therapist'])
)
with check (public.has_tenant_role(tenant_id, array['admin', 'therapist']));

create policy "tenant care users can read patient consents"
on public.patient_consents
for select
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist'])
);

create policy "tenant care users can create patient consents"
on public.patient_consents
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist']));

create policy "tenant care users can update patient consents"
on public.patient_consents
for update
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist'])
)
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist']));

create policy "tenant care users can read patient alerts"
on public.patient_alerts
for select
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist'])
);

create policy "tenant care users can create patient alerts"
on public.patient_alerts
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist']));

create policy "tenant care users can update patient alerts"
on public.patient_alerts
for update
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist'])
)
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist']));

create policy "tenant members can read patient history events"
on public.patient_history_events
for select
to authenticated
using (
  deleted_at is null
  and public.is_tenant_member(tenant_id)
);

create policy "tenant members can create patient history events"
on public.patient_history_events
for insert
to authenticated
with check (public.is_tenant_member(tenant_id));

create policy "tenant admins can update patient history events"
on public.patient_history_events
for update
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin'])
)
with check (public.has_tenant_role(tenant_id, array['admin']));

create policy "tenant care users can read patient links"
on public.patient_links
for select
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist'])
);

create policy "tenant care users can create patient links"
on public.patient_links
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist']));

create policy "tenant care users can update patient links"
on public.patient_links
for update
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist'])
)
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist']));

revoke all on public.patients from anon, authenticated;
revoke all on public.responsible_parties from anon, authenticated;
revoke all on public.patient_addresses from anon, authenticated;
revoke all on public.patient_emergency_contacts from anon, authenticated;
revoke all on public.patient_medical_information from anon, authenticated;
revoke all on public.patient_consents from anon, authenticated;
revoke all on public.patient_alerts from anon, authenticated;
revoke all on public.patient_history_events from anon, authenticated;
revoke all on public.patient_links from anon, authenticated;

grant select, insert, update on public.patients to authenticated;
grant select, insert, update on public.responsible_parties to authenticated;
grant select, insert, update on public.patient_addresses to authenticated;
grant select, insert, update on public.patient_emergency_contacts to authenticated;
grant select, insert, update on public.patient_medical_information to authenticated;
grant select, insert, update on public.patient_consents to authenticated;
grant select, insert, update on public.patient_alerts to authenticated;
grant select, insert, update on public.patient_history_events to authenticated;
grant select, insert, update on public.patient_links to authenticated;

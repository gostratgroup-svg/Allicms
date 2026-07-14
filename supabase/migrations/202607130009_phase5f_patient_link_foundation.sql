-- AlliDesk Phase 5F: Patient Link database foundation.
--
-- Scope: external Patient Link identity hardening, access grants,
-- verification challenges, external sessions, access logs, workflow events,
-- and transactional helper functions.
--
-- This migration intentionally does not implement frontend Patient Link pages,
-- communication delivery, payment links, messaging, documents, or anonymous
-- direct table access.

create extension if not exists pgcrypto;

alter table public.patient_links
  add column if not exists public_identifier text,
  add column if not exists credential_hash text,
  add column if not exists credential_reset_at timestamptz,
  add column if not exists suspended_at timestamptz,
  add column if not exists replaced_by_patient_link_id uuid references public.patient_links(id) on delete set null;

update public.patient_links
set
  public_identifier = coalesce(public_identifier, link_token),
  credential_hash = coalesce(credential_hash, encode(digest(link_token, 'sha256'), 'hex'))
where public_identifier is null
   or credential_hash is null;

alter table public.patient_links
  alter column public_identifier set not null,
  alter column credential_hash set not null,
  drop constraint if exists patient_links_status_check,
  add constraint patient_links_status_check
    check (link_status in ('pending', 'active', 'suspended', 'revoked', 'expired', 'replaced', 'archived')),
  add constraint patient_links_public_identifier_not_blank_check
    check (btrim(public_identifier) <> ''),
  add constraint patient_links_credential_hash_not_blank_check
    check (btrim(credential_hash) <> '');

create unique index if not exists patient_links_public_identifier_idx
  on public.patient_links (public_identifier)
  where deleted_at is null;

create index if not exists patient_links_status_idx
  on public.patient_links (tenant_id, link_status)
  where deleted_at is null;

create table public.patient_link_access_grants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_link_id uuid not null references public.patient_links(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  responsible_party_id uuid references public.responsible_parties(id) on delete set null,
  access_type text not null,
  access_status text not null default 'active',
  finance_visible boolean not null default false,
  appointments_visible boolean not null default true,
  documents_visible boolean not null default false,
  contact_destination_hash text,
  authority_confirmed_at timestamptz,
  consent_acknowledged_at timestamptz,
  last_used_at timestamptz,
  revoked_at timestamptz,
  revoked_by_profile_id uuid references public.profiles(id) on delete set null,
  revocation_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patient_link_access_grants_type_check
    check (access_type in ('patient_self', 'parent_guardian', 'responsible_party', 'authorised_representative', 'organisation', 'medical_aid')),
  constraint patient_link_access_grants_status_check
    check (access_status in ('pending', 'active', 'suspended', 'revoked', 'expired', 'archived')),
  constraint patient_link_access_grants_revocation_check
    check (
      (
        access_status = 'revoked'
        and revoked_at is not null
      )
      or access_status <> 'revoked'
    )
);

create table public.patient_link_verification_challenges (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_link_id uuid not null references public.patient_links(id) on delete cascade,
  access_grant_id uuid references public.patient_link_access_grants(id) on delete cascade,
  delivery_method text not null,
  destination_hash text,
  verification_code_hash text not null,
  code_salt text not null default encode(gen_random_bytes(16), 'hex'),
  challenge_status text not null default 'pending',
  attempts_count integer not null default 0,
  max_attempts integer not null default 5,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  last_attempt_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patient_link_verification_method_check
    check (delivery_method in ('email', 'sms', 'whatsapp')),
  constraint patient_link_verification_status_check
    check (challenge_status in ('pending', 'verified', 'failed', 'expired', 'consumed', 'revoked')),
  constraint patient_link_verification_attempts_check
    check (attempts_count >= 0 and max_attempts between 1 and 20),
  constraint patient_link_verification_hash_not_blank_check
    check (btrim(verification_code_hash) <> ''),
  constraint patient_link_verification_expiry_check
    check (expires_at > created_at)
);

create table public.patient_link_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_link_id uuid not null references public.patient_links(id) on delete cascade,
  access_grant_id uuid references public.patient_link_access_grants(id) on delete set null,
  patient_id uuid not null references public.patients(id) on delete cascade,
  session_token_hash text not null,
  session_status text not null default 'active',
  ip_address inet,
  ip_address_hash text,
  user_agent text,
  user_agent_hash text,
  created_from_challenge_id uuid references public.patient_link_verification_challenges(id) on delete set null,
  expires_at timestamptz not null,
  last_activity_at timestamptz,
  revoked_at timestamptz,
  revocation_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint patient_link_sessions_status_check
    check (session_status in ('active', 'expired', 'revoked')),
  constraint patient_link_sessions_token_hash_not_blank_check
    check (btrim(session_token_hash) <> ''),
  constraint patient_link_sessions_expiry_check
    check (expires_at > created_at),
  constraint patient_link_sessions_revocation_check
    check (
      (
        session_status = 'revoked'
        and revoked_at is not null
      )
      or session_status <> 'revoked'
    )
);

create table public.patient_link_access_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_link_id uuid references public.patient_links(id) on delete set null,
  access_grant_id uuid references public.patient_link_access_grants(id) on delete set null,
  session_id uuid references public.patient_link_sessions(id) on delete set null,
  patient_id uuid references public.patients(id) on delete set null,
  event_type text not null,
  event_status text not null default 'recorded',
  resource_type text,
  resource_id uuid,
  ip_address_hash text,
  user_agent_hash text,
  failure_reason text,
  suspicious boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint patient_link_access_logs_event_type_check
    check (event_type in ('login', 'logout', 'verification_requested', 'verification_succeeded', 'verification_failed', 'session_created', 'session_expired', 'access_revoked', 'invoice_viewed', 'appointment_viewed', 'receipt_viewed', 'suspicious_activity')),
  constraint patient_link_access_logs_status_check
    check (event_status in ('recorded', 'success', 'failed', 'blocked'))
);

create table public.patient_link_workflow_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_link_id uuid references public.patient_links(id) on delete cascade,
  access_grant_id uuid references public.patient_link_access_grants(id) on delete set null,
  patient_id uuid references public.patients(id) on delete cascade,
  event_type text not null,
  event_status text not null default 'pending',
  idempotency_key text not null,
  payload jsonb not null default '{}'::jsonb,
  available_at timestamptz not null default now(),
  processed_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patient_link_workflow_events_type_check
    check (event_type in ('patient_link_created', 'patient_link_activated', 'patient_link_verification_requested', 'patient_link_verified', 'patient_link_access_failed', 'patient_link_session_created', 'patient_link_revoked', 'patient_link_credentials_reset', 'patient_link_invoice_available', 'patient_link_receipt_available', 'patient_link_appointment_updated')),
  constraint patient_link_workflow_events_status_check
    check (event_status in ('pending', 'ready', 'processed', 'failed', 'cancelled')),
  constraint patient_link_workflow_events_idempotency_not_blank_check
    check (btrim(idempotency_key) <> '')
);

create trigger patient_link_access_grants_set_updated_at
before update on public.patient_link_access_grants
for each row execute function public.set_updated_at();

create trigger patient_link_verification_challenges_set_updated_at
before update on public.patient_link_verification_challenges
for each row execute function public.set_updated_at();

create trigger patient_link_sessions_set_updated_at
before update on public.patient_link_sessions
for each row execute function public.set_updated_at();

create trigger patient_link_workflow_events_set_updated_at
before update on public.patient_link_workflow_events
for each row execute function public.set_updated_at();

create or replace function public.validate_patient_link_foundation_tenant_integrity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if TG_TABLE_NAME = 'patient_link_access_grants' then
    if not exists (
      select 1
      from public.patient_links pl
      where pl.id = NEW.patient_link_id
        and pl.tenant_id = NEW.tenant_id
        and pl.patient_id = NEW.patient_id
        and pl.deleted_at is null
    ) then
      raise exception 'Patient Link grant must reference a link and patient in the same tenant';
    end if;

    if NEW.responsible_party_id is not null and not exists (
      select 1
      from public.responsible_parties rp
      where rp.id = NEW.responsible_party_id
        and rp.tenant_id = NEW.tenant_id
        and rp.deleted_at is null
    ) then
      raise exception 'Patient Link grant responsible party must belong to the same tenant';
    end if;
  elsif TG_TABLE_NAME = 'patient_link_verification_challenges' then
    if not exists (
      select 1
      from public.patient_links pl
      where pl.id = NEW.patient_link_id
        and pl.tenant_id = NEW.tenant_id
        and pl.deleted_at is null
    ) then
      raise exception 'Patient Link challenge must reference a link in the same tenant';
    end if;

    if NEW.access_grant_id is not null and not exists (
      select 1
      from public.patient_link_access_grants ag
      where ag.id = NEW.access_grant_id
        and ag.tenant_id = NEW.tenant_id
        and ag.patient_link_id = NEW.patient_link_id
        and ag.deleted_at is null
    ) then
      raise exception 'Patient Link challenge grant must belong to the same tenant and link';
    end if;
  elsif TG_TABLE_NAME = 'patient_link_sessions' then
    if not exists (
      select 1
      from public.patient_links pl
      where pl.id = NEW.patient_link_id
        and pl.tenant_id = NEW.tenant_id
        and pl.patient_id = NEW.patient_id
        and pl.deleted_at is null
    ) then
      raise exception 'Patient Link session must reference a link and patient in the same tenant';
    end if;

    if NEW.access_grant_id is not null and not exists (
      select 1
      from public.patient_link_access_grants ag
      where ag.id = NEW.access_grant_id
        and ag.tenant_id = NEW.tenant_id
        and ag.patient_link_id = NEW.patient_link_id
        and ag.deleted_at is null
    ) then
      raise exception 'Patient Link session grant must belong to the same tenant and link';
    end if;

    if NEW.created_from_challenge_id is not null and not exists (
      select 1
      from public.patient_link_verification_challenges vc
      where vc.id = NEW.created_from_challenge_id
        and vc.tenant_id = NEW.tenant_id
        and vc.patient_link_id = NEW.patient_link_id
        and vc.deleted_at is null
    ) then
      raise exception 'Patient Link session challenge must belong to the same tenant and link';
    end if;
  elsif TG_TABLE_NAME = 'patient_link_access_logs' then
    if NEW.patient_link_id is not null and not exists (
      select 1
      from public.patient_links pl
      where pl.id = NEW.patient_link_id
        and pl.tenant_id = NEW.tenant_id
    ) then
      raise exception 'Patient Link access log link must belong to the same tenant';
    end if;

    if NEW.access_grant_id is not null and not exists (
      select 1
      from public.patient_link_access_grants ag
      where ag.id = NEW.access_grant_id
        and ag.tenant_id = NEW.tenant_id
    ) then
      raise exception 'Patient Link access log grant must belong to the same tenant';
    end if;

    if NEW.session_id is not null and not exists (
      select 1
      from public.patient_link_sessions pls
      where pls.id = NEW.session_id
        and pls.tenant_id = NEW.tenant_id
    ) then
      raise exception 'Patient Link access log session must belong to the same tenant';
    end if;

    if NEW.patient_id is not null and not exists (
      select 1
      from public.patients p
      where p.id = NEW.patient_id
        and p.tenant_id = NEW.tenant_id
    ) then
      raise exception 'Patient Link access log patient must belong to the same tenant';
    end if;
  elsif TG_TABLE_NAME = 'patient_link_workflow_events' then
    if NEW.patient_link_id is not null and not exists (
      select 1
      from public.patient_links pl
      where pl.id = NEW.patient_link_id
        and pl.tenant_id = NEW.tenant_id
    ) then
      raise exception 'Patient Link workflow event link must belong to the same tenant';
    end if;

    if NEW.access_grant_id is not null and not exists (
      select 1
      from public.patient_link_access_grants ag
      where ag.id = NEW.access_grant_id
        and ag.tenant_id = NEW.tenant_id
    ) then
      raise exception 'Patient Link workflow event grant must belong to the same tenant';
    end if;

    if NEW.patient_id is not null and not exists (
      select 1
      from public.patients p
      where p.id = NEW.patient_id
        and p.tenant_id = NEW.tenant_id
    ) then
      raise exception 'Patient Link workflow event patient must belong to the same tenant';
    end if;
  end if;

  return NEW;
end;
$$;

create trigger patient_link_access_grants_validate_tenant_integrity
before insert or update on public.patient_link_access_grants
for each row execute function public.validate_patient_link_foundation_tenant_integrity();

create trigger patient_link_verification_challenges_validate_tenant_integrity
before insert or update on public.patient_link_verification_challenges
for each row execute function public.validate_patient_link_foundation_tenant_integrity();

create trigger patient_link_sessions_validate_tenant_integrity
before insert or update on public.patient_link_sessions
for each row execute function public.validate_patient_link_foundation_tenant_integrity();

create trigger patient_link_access_logs_validate_tenant_integrity
before insert or update on public.patient_link_access_logs
for each row execute function public.validate_patient_link_foundation_tenant_integrity();

create trigger patient_link_workflow_events_validate_tenant_integrity
before insert or update on public.patient_link_workflow_events
for each row execute function public.validate_patient_link_foundation_tenant_integrity();

create index patient_link_access_grants_link_idx
  on public.patient_link_access_grants (tenant_id, patient_link_id, access_status)
  where deleted_at is null;

create index patient_link_access_grants_patient_idx
  on public.patient_link_access_grants (tenant_id, patient_id, access_status)
  where deleted_at is null;

create index patient_link_access_grants_responsible_party_idx
  on public.patient_link_access_grants (tenant_id, responsible_party_id, access_status)
  where deleted_at is null and responsible_party_id is not null;

create unique index patient_link_access_grants_active_unique_idx
  on public.patient_link_access_grants (patient_link_id, coalesce(responsible_party_id, patient_id), access_type)
  where deleted_at is null and access_status = 'active';

create index patient_link_verification_challenges_link_idx
  on public.patient_link_verification_challenges (tenant_id, patient_link_id, challenge_status, expires_at)
  where deleted_at is null;

create index patient_link_verification_challenges_grant_idx
  on public.patient_link_verification_challenges (access_grant_id, challenge_status, expires_at)
  where deleted_at is null and access_grant_id is not null;

create unique index patient_link_sessions_token_hash_idx
  on public.patient_link_sessions (session_token_hash)
  where deleted_at is null and session_status = 'active';

create index patient_link_sessions_link_idx
  on public.patient_link_sessions (tenant_id, patient_link_id, session_status, expires_at)
  where deleted_at is null;

create index patient_link_sessions_grant_idx
  on public.patient_link_sessions (access_grant_id, session_status, expires_at)
  where deleted_at is null and access_grant_id is not null;

create index patient_link_access_logs_link_time_idx
  on public.patient_link_access_logs (tenant_id, patient_link_id, occurred_at desc);

create index patient_link_access_logs_session_time_idx
  on public.patient_link_access_logs (session_id, occurred_at desc)
  where session_id is not null;

create index patient_link_access_logs_event_idx
  on public.patient_link_access_logs (tenant_id, event_type, occurred_at desc);

create unique index patient_link_workflow_events_idempotency_idx
  on public.patient_link_workflow_events (tenant_id, idempotency_key)
  where deleted_at is null;

create index patient_link_workflow_events_link_idx
  on public.patient_link_workflow_events (tenant_id, patient_link_id, event_status, available_at)
  where deleted_at is null;

alter table public.patient_link_access_grants enable row level security;
alter table public.patient_link_verification_challenges enable row level security;
alter table public.patient_link_sessions enable row level security;
alter table public.patient_link_access_logs enable row level security;
alter table public.patient_link_workflow_events enable row level security;

create policy "tenant care users can read patient link access grants"
on public.patient_link_access_grants for select to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist'])
);

create policy "tenant care users can create patient link access grants"
on public.patient_link_access_grants for insert to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist']));

create policy "tenant care users can update patient link access grants"
on public.patient_link_access_grants for update to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist'])
)
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist']));

create policy "tenant care users can read patient link challenges"
on public.patient_link_verification_challenges for select to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin'])
);

create policy "tenant admins can create patient link challenges"
on public.patient_link_verification_challenges for insert to authenticated
with check (public.has_tenant_role(tenant_id, array['admin']));

create policy "tenant admins can update patient link challenges"
on public.patient_link_verification_challenges for update to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin'])
)
with check (public.has_tenant_role(tenant_id, array['admin']));

create policy "tenant admins can read patient link sessions"
on public.patient_link_sessions for select to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin'])
);

create policy "tenant admins can update patient link sessions"
on public.patient_link_sessions for update to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin'])
)
with check (public.has_tenant_role(tenant_id, array['admin']));

create policy "tenant admins can read patient link access logs"
on public.patient_link_access_logs for select to authenticated
using (
  public.has_tenant_role(tenant_id, array['admin'])
);

create policy "tenant admins can read patient link workflow events"
on public.patient_link_workflow_events for select to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin'])
);

create policy "tenant admins can create patient link workflow events"
on public.patient_link_workflow_events for insert to authenticated
with check (public.has_tenant_role(tenant_id, array['admin']));

create policy "tenant admins can update patient link workflow events"
on public.patient_link_workflow_events for update to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin'])
)
with check (public.has_tenant_role(tenant_id, array['admin']));

create or replace function public.hash_patient_link_secret(secret_input text, salt_input text default '')
returns text
language sql
immutable
set search_path = public
as $$
  select encode(digest(coalesce(salt_input, '') || coalesce(secret_input, ''), 'sha256'), 'hex');
$$;

create or replace function public.create_or_get_patient_link(target_patient_id uuid)
returns table (
  patient_link_id uuid,
  public_identifier text,
  link_status text,
  created_link boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  patient_record public.patients%rowtype;
  link_record public.patient_links%rowtype;
  generated_identifier text;
  generated_credential text;
begin
  select * into patient_record
  from public.patients
  where id = target_patient_id
    and deleted_at is null;

  if patient_record.id is null then
    raise exception 'Patient not found';
  end if;

  if not public.has_tenant_role(patient_record.tenant_id, array['admin', 'receptionist', 'therapist']) then
    raise exception 'Not allowed to manage Patient Link for this patient';
  end if;

  select * into link_record
  from public.patient_links
  where patient_id = patient_record.id
    and tenant_id = patient_record.tenant_id
    and deleted_at is null
    and link_status in ('pending', 'active', 'suspended')
  order by created_at desc
  limit 1;

  if link_record.id is not null then
    patient_link_id := link_record.id;
    public_identifier := link_record.public_identifier;
    link_status := link_record.link_status;
    created_link := false;
    return next;
    return;
  end if;

  generated_identifier := encode(gen_random_bytes(24), 'hex');
  generated_credential := encode(gen_random_bytes(32), 'hex');

  insert into public.patient_links (
    tenant_id,
    patient_id,
    link_token,
    public_identifier,
    credential_hash,
    link_status,
    created_by_profile_id,
    updated_by_profile_id
  )
  values (
    patient_record.tenant_id,
    patient_record.id,
    generated_identifier,
    generated_identifier,
    public.hash_patient_link_secret(generated_credential),
    'active',
    auth.uid(),
    auth.uid()
  )
  returning * into link_record;

  insert into public.patient_link_workflow_events (
    tenant_id, patient_link_id, patient_id, event_type, event_status, idempotency_key, payload, created_by_profile_id
  )
  values (
    link_record.tenant_id, link_record.id, link_record.patient_id, 'patient_link_created', 'ready',
    'patient_link:' || link_record.id::text || ':created:v1',
    jsonb_build_object('source', 'create_or_get_patient_link'), auth.uid()
  )
  on conflict (tenant_id, idempotency_key) where deleted_at is null do nothing;

  patient_link_id := link_record.id;
  public_identifier := link_record.public_identifier;
  link_status := link_record.link_status;
  created_link := true;
  return next;
end;
$$;

create or replace function public.request_patient_link_verification(
  target_public_identifier text,
  access_grant_id_input uuid,
  delivery_method_input text,
  destination_hash_input text,
  verification_code_input text,
  expires_in_minutes integer default 10
)
returns table (
  challenge_id uuid,
  expires_at timestamptz,
  challenge_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  link_record public.patient_links%rowtype;
  grant_record public.patient_link_access_grants%rowtype;
  salt_value text;
  challenge_record public.patient_link_verification_challenges%rowtype;
begin
  select * into link_record
  from public.patient_links
  where public_identifier = target_public_identifier
    and deleted_at is null;

  if link_record.id is null or link_record.link_status <> 'active' then
    raise exception 'Patient Link verification could not be started';
  end if;

  if access_grant_id_input is not null then
    select * into grant_record
    from public.patient_link_access_grants
    where id = access_grant_id_input
      and tenant_id = link_record.tenant_id
      and patient_link_id = link_record.id
      and deleted_at is null
      and access_status = 'active';

    if grant_record.id is null then
      raise exception 'Patient Link verification could not be started';
    end if;
  end if;

  if verification_code_input is null or btrim(verification_code_input) = '' then
    raise exception 'Verification code is required';
  end if;

  salt_value := encode(gen_random_bytes(16), 'hex');

  insert into public.patient_link_verification_challenges (
    tenant_id,
    patient_link_id,
    access_grant_id,
    delivery_method,
    destination_hash,
    verification_code_hash,
    code_salt,
    expires_at
  )
  values (
    link_record.tenant_id,
    link_record.id,
    access_grant_id_input,
    delivery_method_input,
    destination_hash_input,
    public.hash_patient_link_secret(verification_code_input, salt_value),
    salt_value,
    now() + make_interval(mins => least(greatest(coalesce(expires_in_minutes, 10), 1), 60))
  )
  returning * into challenge_record;

  insert into public.patient_link_access_logs (
    tenant_id, patient_link_id, access_grant_id, patient_id, event_type, event_status
  )
  values (
    link_record.tenant_id, link_record.id, access_grant_id_input, link_record.patient_id, 'verification_requested', 'recorded'
  );

  insert into public.patient_link_workflow_events (
    tenant_id, patient_link_id, access_grant_id, patient_id, event_type, event_status, idempotency_key, payload
  )
  values (
    link_record.tenant_id, link_record.id, access_grant_id_input, link_record.patient_id,
    'patient_link_verification_requested', 'ready',
    'patient_link:' || link_record.id::text || ':challenge:' || challenge_record.id::text || ':verification_requested:v1',
    jsonb_build_object('challenge_id', challenge_record.id, 'delivery_method', delivery_method_input)
  )
  on conflict (tenant_id, idempotency_key) where deleted_at is null do nothing;

  challenge_id := challenge_record.id;
  expires_at := challenge_record.expires_at;
  challenge_status := challenge_record.challenge_status;
  return next;
end;
$$;

create or replace function public.verify_patient_link(
  target_challenge_id uuid,
  verification_code_input text
)
returns table (
  patient_link_id uuid,
  access_grant_id uuid,
  verified boolean,
  challenge_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  challenge_record public.patient_link_verification_challenges%rowtype;
  link_record public.patient_links%rowtype;
  computed_hash text;
begin
  select * into challenge_record
  from public.patient_link_verification_challenges
  where id = target_challenge_id
    and deleted_at is null
  for update;

  if challenge_record.id is null then
    raise exception 'Verification failed';
  end if;

  select * into link_record
  from public.patient_links
  where id = challenge_record.patient_link_id
    and tenant_id = challenge_record.tenant_id
    and deleted_at is null;

  if link_record.id is null or link_record.link_status <> 'active' then
    raise exception 'Verification failed';
  end if;

  if challenge_record.challenge_status <> 'pending' then
    raise exception 'Verification failed';
  end if;

  if challenge_record.expires_at <= now() then
    update public.patient_link_verification_challenges
    set challenge_status = 'expired',
        updated_by_profile_id = auth.uid()
    where id = challenge_record.id;
    raise exception 'Verification failed';
  end if;

  if challenge_record.attempts_count >= challenge_record.max_attempts then
    update public.patient_link_verification_challenges
    set challenge_status = 'failed',
        updated_by_profile_id = auth.uid()
    where id = challenge_record.id;
    raise exception 'Verification failed';
  end if;

  computed_hash := public.hash_patient_link_secret(verification_code_input, challenge_record.code_salt);

  if computed_hash <> challenge_record.verification_code_hash then
    update public.patient_link_verification_challenges
    set attempts_count = attempts_count + 1,
        last_attempt_at = now(),
        challenge_status = case when attempts_count + 1 >= max_attempts then 'failed' else challenge_status end,
        updated_by_profile_id = auth.uid()
    where id = challenge_record.id;

    insert into public.patient_link_access_logs (
      tenant_id, patient_link_id, access_grant_id, patient_id, event_type, event_status, failure_reason
    )
    values (
      challenge_record.tenant_id, challenge_record.patient_link_id, challenge_record.access_grant_id,
      link_record.patient_id, 'verification_failed', 'failed', 'invalid_code'
    );

    raise exception 'Verification failed';
  end if;

  update public.patient_link_verification_challenges
  set challenge_status = 'verified',
      consumed_at = now(),
      last_attempt_at = now(),
      attempts_count = attempts_count + 1,
      updated_by_profile_id = auth.uid()
  where id = challenge_record.id;

  insert into public.patient_link_access_logs (
    tenant_id, patient_link_id, access_grant_id, patient_id, event_type, event_status
  )
  values (
    challenge_record.tenant_id, challenge_record.patient_link_id, challenge_record.access_grant_id,
    link_record.patient_id, 'verification_succeeded', 'success'
  );

  insert into public.patient_link_workflow_events (
    tenant_id, patient_link_id, access_grant_id, patient_id, event_type, event_status, idempotency_key, payload
  )
  values (
    challenge_record.tenant_id, challenge_record.patient_link_id, challenge_record.access_grant_id,
    link_record.patient_id, 'patient_link_verified', 'ready',
    'patient_link:' || challenge_record.patient_link_id::text || ':challenge:' || challenge_record.id::text || ':verified:v1',
    jsonb_build_object('challenge_id', challenge_record.id)
  )
  on conflict (tenant_id, idempotency_key) where deleted_at is null do nothing;

  patient_link_id := challenge_record.patient_link_id;
  access_grant_id := challenge_record.access_grant_id;
  verified := true;
  challenge_status := 'verified';
  return next;
end;
$$;

create or replace function public.create_patient_link_session(
  target_challenge_id uuid,
  session_token_input text,
  ip_address_input inet default null,
  user_agent_input text default null,
  expires_in_minutes integer default 60
)
returns table (
  session_id uuid,
  expires_at timestamptz,
  session_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  challenge_record public.patient_link_verification_challenges%rowtype;
  link_record public.patient_links%rowtype;
  session_record public.patient_link_sessions%rowtype;
begin
  select * into challenge_record
  from public.patient_link_verification_challenges
  where id = target_challenge_id
    and deleted_at is null
    and challenge_status = 'verified';

  if challenge_record.id is null then
    raise exception 'Patient Link session could not be created';
  end if;

  select * into link_record
  from public.patient_links
  where id = challenge_record.patient_link_id
    and tenant_id = challenge_record.tenant_id
    and deleted_at is null
    and link_status = 'active';

  if link_record.id is null then
    raise exception 'Patient Link session could not be created';
  end if;

  if session_token_input is null or btrim(session_token_input) = '' then
    raise exception 'Session token is required';
  end if;

  insert into public.patient_link_sessions (
    tenant_id,
    patient_link_id,
    access_grant_id,
    patient_id,
    session_token_hash,
    ip_address,
    ip_address_hash,
    user_agent,
    user_agent_hash,
    created_from_challenge_id,
    expires_at,
    last_activity_at
  )
  values (
    link_record.tenant_id,
    link_record.id,
    challenge_record.access_grant_id,
    link_record.patient_id,
    public.hash_patient_link_secret(session_token_input),
    ip_address_input,
    case when ip_address_input is null then null else public.hash_patient_link_secret(ip_address_input::text) end,
    user_agent_input,
    case when user_agent_input is null then null else public.hash_patient_link_secret(user_agent_input) end,
    challenge_record.id,
    now() + make_interval(mins => least(greatest(coalesce(expires_in_minutes, 60), 5), 1440)),
    now()
  )
  returning * into session_record;

  update public.patient_link_verification_challenges
  set challenge_status = 'consumed',
      consumed_at = coalesce(consumed_at, now()),
      updated_by_profile_id = auth.uid()
  where id = challenge_record.id;

  update public.patient_links
  set last_accessed_at = now()
  where id = link_record.id;

  insert into public.patient_link_access_logs (
    tenant_id, patient_link_id, access_grant_id, session_id, patient_id, event_type, event_status,
    ip_address_hash, user_agent_hash
  )
  values (
    session_record.tenant_id, session_record.patient_link_id, session_record.access_grant_id, session_record.id,
    session_record.patient_id, 'session_created', 'success', session_record.ip_address_hash, session_record.user_agent_hash
  );

  insert into public.patient_link_workflow_events (
    tenant_id, patient_link_id, access_grant_id, patient_id, event_type, event_status, idempotency_key, payload
  )
  values (
    session_record.tenant_id, session_record.patient_link_id, session_record.access_grant_id, session_record.patient_id,
    'patient_link_session_created', 'ready',
    'patient_link:' || session_record.patient_link_id::text || ':session:' || session_record.id::text || ':created:v1',
    jsonb_build_object('session_id', session_record.id)
  )
  on conflict (tenant_id, idempotency_key) where deleted_at is null do nothing;

  session_id := session_record.id;
  expires_at := session_record.expires_at;
  session_status := session_record.session_status;
  return next;
end;
$$;

create or replace function public.revoke_patient_link_session(
  target_session_token text,
  revocation_reason_input text default 'logout'
)
returns table (
  session_id uuid,
  revoked boolean,
  session_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  session_record public.patient_link_sessions%rowtype;
begin
  select * into session_record
  from public.patient_link_sessions
  where session_token_hash = public.hash_patient_link_secret(target_session_token)
    and deleted_at is null
  for update;

  if session_record.id is null then
    raise exception 'Patient Link session could not be revoked';
  end if;

  if session_record.session_status = 'revoked' then
    session_id := session_record.id;
    revoked := false;
    session_status := session_record.session_status;
    return next;
    return;
  end if;

  update public.patient_link_sessions
  set session_status = 'revoked',
      revoked_at = now(),
      revocation_reason = revocation_reason_input
  where id = session_record.id
  returning * into session_record;

  insert into public.patient_link_access_logs (
    tenant_id, patient_link_id, access_grant_id, session_id, patient_id, event_type, event_status
  )
  values (
    session_record.tenant_id, session_record.patient_link_id, session_record.access_grant_id,
    session_record.id, session_record.patient_id, 'logout', 'success'
  );

  session_id := session_record.id;
  revoked := true;
  session_status := session_record.session_status;
  return next;
end;
$$;

create or replace function public.reset_patient_link_credentials(
  target_patient_link_id uuid
)
returns table (
  patient_link_id uuid,
  public_identifier text,
  credential_reset_at timestamptz,
  reset_credentials boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  link_record public.patient_links%rowtype;
  generated_credential text;
begin
  select * into link_record
  from public.patient_links
  where id = target_patient_link_id
    and deleted_at is null
  for update;

  if link_record.id is null then
    raise exception 'Patient Link not found';
  end if;

  if not public.has_tenant_role(link_record.tenant_id, array['admin', 'receptionist', 'therapist']) then
    raise exception 'Not allowed to reset this Patient Link';
  end if;

  generated_credential := encode(gen_random_bytes(32), 'hex');

  update public.patient_links
  set credential_hash = public.hash_patient_link_secret(generated_credential),
      credential_reset_at = now(),
      updated_by_profile_id = auth.uid()
  where id = link_record.id
  returning * into link_record;

  update public.patient_link_sessions
  set session_status = 'revoked',
      revoked_at = now(),
      revocation_reason = 'credentials_reset'
  where patient_link_id = link_record.id
    and deleted_at is null
    and session_status = 'active';

  insert into public.patient_link_workflow_events (
    tenant_id, patient_link_id, patient_id, event_type, event_status, idempotency_key, payload, created_by_profile_id
  )
  values (
    link_record.tenant_id, link_record.id, link_record.patient_id, 'patient_link_credentials_reset', 'ready',
    'patient_link:' || link_record.id::text || ':credentials_reset:' || extract(epoch from link_record.credential_reset_at)::text,
    jsonb_build_object('credential_reset_at', link_record.credential_reset_at), auth.uid()
  )
  on conflict (tenant_id, idempotency_key) where deleted_at is null do nothing;

  patient_link_id := link_record.id;
  public_identifier := link_record.public_identifier;
  credential_reset_at := link_record.credential_reset_at;
  reset_credentials := true;
  return next;
end;
$$;

revoke all on public.patient_link_access_grants from anon, authenticated;
revoke all on public.patient_link_verification_challenges from anon, authenticated;
revoke all on public.patient_link_sessions from anon, authenticated;
revoke all on public.patient_link_access_logs from anon, authenticated;
revoke all on public.patient_link_workflow_events from anon, authenticated;

grant select, insert, update on public.patient_link_access_grants to authenticated;
grant select, insert, update on public.patient_link_verification_challenges to authenticated;
grant select, update on public.patient_link_sessions to authenticated;
grant select on public.patient_link_access_logs to authenticated;
grant select, insert, update on public.patient_link_workflow_events to authenticated;

revoke all on function public.hash_patient_link_secret(text, text) from public, anon, authenticated;
revoke all on function public.validate_patient_link_foundation_tenant_integrity() from public, anon, authenticated;
revoke all on function public.create_or_get_patient_link(uuid) from public, anon;
revoke all on function public.request_patient_link_verification(text, uuid, text, text, text, integer) from public, anon;
revoke all on function public.verify_patient_link(uuid, text) from public, anon;
revoke all on function public.create_patient_link_session(uuid, text, inet, text, integer) from public, anon;
revoke all on function public.revoke_patient_link_session(text, text) from public, anon;
revoke all on function public.reset_patient_link_credentials(uuid) from public, anon;

grant execute on function public.create_or_get_patient_link(uuid) to authenticated;
grant execute on function public.request_patient_link_verification(text, uuid, text, text, text, integer) to authenticated;
grant execute on function public.verify_patient_link(uuid, text) to authenticated;
grant execute on function public.create_patient_link_session(uuid, text, inet, text, integer) to authenticated;
grant execute on function public.revoke_patient_link_session(text, text) to authenticated;
grant execute on function public.reset_patient_link_credentials(uuid) to authenticated;

comment on table public.patient_link_access_grants is 'Explicit tenant-scoped grants defining who may access a patient Patient Link.';
comment on table public.patient_link_verification_challenges is 'Hashed verification challenge records for Patient Link access. OTPs are never stored in plaintext.';
comment on table public.patient_link_sessions is 'External Patient Link sessions, separate from internal staff authentication.';
comment on table public.patient_link_access_logs is 'Patient Link access and security event log. Secrets and sensitive content must not be logged.';
comment on table public.patient_link_workflow_events is 'Patient Link workflow events for future communication and automation readiness.';
comment on column public.patient_links.public_identifier is 'Opaque public identifier for Patient Link URLs. Must not contain patient, tenant or sequential identifiers.';
comment on column public.patient_links.credential_hash is 'Hashed Patient Link credential material. Plaintext credentials must never be stored.';

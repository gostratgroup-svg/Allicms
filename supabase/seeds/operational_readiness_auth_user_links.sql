-- AlliDesk Operational Readiness Step 1B auth-user links.
--
-- Purpose:
--   Link existing development Supabase Auth users to the fictional operational
--   readiness tenants without storing passwords, JWTs, or service-role secrets.
--
-- Safety:
--   - Development only.
--   - Uses auth.users email lookups for users already created by the owner.
--   - Idempotent by auth user id, seeded tenant ids, and deterministic clinical
--     fixture ids.

begin;

do $$
declare
  tenant_a_id constant uuid := '10000000-0000-4000-8000-000000000001';
  tenant_b_id constant uuid := '20000000-0000-4000-8000-000000000001';
  patient_a_id constant uuid := '10000000-0000-4000-8000-000000000010';
  responsible_party_a_id constant uuid := '10000000-0000-4000-8000-000000000011';
  booking_a_id constant uuid := '10000000-0000-4000-8000-000000000012';
  session_a_id constant uuid := '10000000-0000-4000-8000-000000000014';
  patient_link_a_id constant uuid := '10000000-0000-4000-8000-000000000019';
  patient_link_grant_a_id constant uuid := '10000000-0000-4000-8000-000000000033';
  therapist_profile_a_id constant uuid := '10000000-0000-4000-8000-000000000007';
  location_a_id constant uuid := '10000000-0000-4000-8000-000000000003';
  clinical_encounter_id constant uuid := '10000000-0000-4000-8000-000000000030';
  clinical_note_id constant uuid := '10000000-0000-4000-8000-000000000031';
  clinical_note_version_id constant uuid := '10000000-0000-4000-8000-000000000032';

  admin_a_id uuid;
  therapist_a_id uuid;
  reception_a_id uuid;
  finance_a_id uuid;
  admin_b_id uuid;
begin
  select id into admin_a_id from auth.users where lower(email) = 'gostratgroup+allidesk-admin-a@gmail.com';
  select id into therapist_a_id from auth.users where lower(email) = 'gostratgroup+allidesk-therapist-a@gmail.com';
  select id into reception_a_id from auth.users where lower(email) = 'gostratgroup+allidesk-reception-a@gmail.com';
  select id into finance_a_id from auth.users where lower(email) = 'gostratgroup+allidesk-finance-a@gmail.com';
  select id into admin_b_id from auth.users where lower(email) = 'gostratgroup+allidesk-admin-b@gmail.com';

  if admin_a_id is null or therapist_a_id is null or reception_a_id is null or finance_a_id is null or admin_b_id is null then
    raise exception 'One or more required operational readiness Auth users are missing.';
  end if;

  insert into public.profiles (id, first_name, last_name, email, is_super_admin)
  values
    (admin_a_id, 'Tenant A', 'Admin', 'gostratgroup+allidesk-admin-a@gmail.com', false),
    (therapist_a_id, 'Tenant A', 'Therapist', 'gostratgroup+allidesk-therapist-a@gmail.com', false),
    (reception_a_id, 'Tenant A', 'Reception', 'gostratgroup+allidesk-reception-a@gmail.com', false),
    (finance_a_id, 'Tenant A', 'Finance', 'gostratgroup+allidesk-finance-a@gmail.com', false),
    (admin_b_id, 'Tenant B', 'Admin', 'gostratgroup+allidesk-admin-b@gmail.com', false)
  on conflict (id) do update
  set first_name = excluded.first_name,
      last_name = excluded.last_name,
      email = excluded.email,
      is_super_admin = false,
      deleted_at = null;

  insert into public.tenant_users (tenant_id, profile_id, role, is_active, activated_at)
  values
    (tenant_a_id, admin_a_id, 'admin', true, now()),
    (tenant_a_id, therapist_a_id, 'therapist', true, now()),
    (tenant_a_id, reception_a_id, 'receptionist', true, now()),
    (tenant_a_id, finance_a_id, 'finance', true, now()),
    (tenant_b_id, admin_b_id, 'admin', true, now())
  on conflict (tenant_id, profile_id) do update
  set role = excluded.role,
      is_active = true,
      activated_at = coalesce(public.tenant_users.activated_at, now()),
      deactivated_at = null,
      deleted_at = null;

  update public.therapist_profiles
  set user_id = therapist_a_id,
      display_name = 'Tenant A Therapist',
      billing_email = 'gostratgroup+allidesk-therapist-a@gmail.com',
      is_active = true,
      deleted_at = null
  where id = therapist_profile_a_id
    and tenant_id = tenant_a_id;

  insert into public.clinical_encounters (
    id,
    tenant_id,
    patient_id,
    booking_id,
    session_id,
    responsible_therapist_profile_id,
    practice_location_id,
    encounter_type,
    encounter_status,
    clinical_visibility,
    occurred_at,
    started_at,
    ended_at,
    summary,
    metadata,
    created_by_profile_id,
    updated_by_profile_id
  )
  values (
    clinical_encounter_id,
    tenant_a_id,
    patient_a_id,
    booking_a_id,
    session_a_id,
    therapist_profile_a_id,
    location_a_id,
    'session',
    'completed',
    'internal',
    timestamptz '2026-08-03 08:30:00+02',
    timestamptz '2026-08-03 08:30:00+02',
    timestamptz '2026-08-03 09:30:00+02',
    'Fictional operational readiness clinical encounter linked to the seeded session.',
    jsonb_build_object('seed_key', 'operational_readiness_clinical_note', 'fictional_data', true),
    therapist_a_id,
    therapist_a_id
  )
  on conflict (id) do update
  set responsible_therapist_profile_id = excluded.responsible_therapist_profile_id,
      encounter_status = 'completed',
      summary = excluded.summary,
      metadata = excluded.metadata,
      updated_by_profile_id = excluded.updated_by_profile_id,
      deleted_at = null;

  insert into public.clinical_notes (
    id,
    tenant_id,
    patient_id,
    clinical_encounter_id,
    booking_id,
    session_id,
    responsible_therapist_profile_id,
    author_profile_id,
    note_type,
    note_title,
    note_status,
    clinical_visibility,
    patient_visible_allowed,
    is_restricted,
    metadata,
    created_by_profile_id,
    updated_by_profile_id
  )
  values (
    clinical_note_id,
    tenant_a_id,
    patient_a_id,
    clinical_encounter_id,
    booking_a_id,
    session_a_id,
    therapist_profile_a_id,
    therapist_a_id,
    'progress_note',
    'Operational readiness session note',
    'draft',
    'internal',
    false,
    false,
    jsonb_build_object('seed_key', 'operational_readiness_clinical_note', 'fictional_data', true),
    therapist_a_id,
    therapist_a_id
  )
  on conflict (id) do update
  set clinical_encounter_id = excluded.clinical_encounter_id,
      session_id = excluded.session_id,
      responsible_therapist_profile_id = excluded.responsible_therapist_profile_id,
      author_profile_id = excluded.author_profile_id,
      note_status = 'draft',
      metadata = excluded.metadata,
      updated_by_profile_id = excluded.updated_by_profile_id,
      deleted_at = null;

  insert into public.clinical_note_versions (
    id,
    tenant_id,
    clinical_note_id,
    version_number,
    free_text_content,
    structured_content,
    version_status,
    author_profile_id,
    metadata
  )
  values (
    clinical_note_version_id,
    tenant_a_id,
    clinical_note_id,
    1,
    'Fictional clinical note for operational readiness. No real patient data.',
    jsonb_build_object('session_linked', true, 'fictional_data', true),
    'draft',
    therapist_a_id,
    jsonb_build_object('seed_key', 'operational_readiness_clinical_note', 'fictional_data', true)
  )
  on conflict (id) do update
  set free_text_content = excluded.free_text_content,
      structured_content = excluded.structured_content,
      version_status = 'draft',
      author_profile_id = excluded.author_profile_id,
      metadata = excluded.metadata,
      deleted_at = null;

  update public.clinical_notes
  set latest_version_id = clinical_note_version_id,
      updated_by_profile_id = therapist_a_id,
      deleted_at = null
  where id = clinical_note_id;

  insert into public.patient_link_access_grants (
    id,
    tenant_id,
    patient_link_id,
    patient_id,
    responsible_party_id,
    access_type,
    access_status,
    finance_visible,
    appointments_visible,
    documents_visible,
    contact_destination_hash,
    authority_confirmed_at,
    consent_acknowledged_at,
    metadata,
    created_by_profile_id,
    updated_by_profile_id
  )
  values (
    patient_link_grant_a_id,
    tenant_a_id,
    patient_link_a_id,
    patient_a_id,
    responsible_party_a_id,
    'parent_guardian',
    'active',
    true,
    true,
    false,
    encode(extensions.digest('guardian@example.test', 'sha256'), 'hex'),
    now(),
    now(),
    jsonb_build_object('seed_key', 'operational_readiness_patient_link_grant', 'fictional_data', true),
    admin_a_id,
    admin_a_id
  )
  on conflict (id) do update
  set access_status = 'active',
      finance_visible = true,
      appointments_visible = true,
      documents_visible = false,
      authority_confirmed_at = coalesce(public.patient_link_access_grants.authority_confirmed_at, now()),
      consent_acknowledged_at = coalesce(public.patient_link_access_grants.consent_acknowledged_at, now()),
      metadata = excluded.metadata,
      updated_by_profile_id = excluded.updated_by_profile_id,
      revoked_at = null,
      revocation_reason = null,
      deleted_at = null;

  insert into public.audit_events (tenant_id, actor_profile_id, action, entity_table, entity_id, metadata)
  values (
    tenant_a_id,
    admin_a_id,
    'seed.operational_readiness_auth_users_linked',
    'tenant_users',
    tenant_a_id,
    jsonb_build_object('seed_key', 'operational_readiness_auth_user_links', 'fictional_data', true)
  );
end $$;

commit;

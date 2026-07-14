-- AlliDesk Phase 5F Step 5: Patient Link validation corrections.
--
-- Keep pre-verification public context non-enumerating. Exact suspended,
-- revoked, expired, archived or replaced link lifecycle states are internal
-- operational details and should not be exposed before external verification.

create or replace function public.get_patient_link_public_context(target_public_identifier text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  link_record public.patient_links%rowtype;
  tenant_record public.tenants%rowtype;
  patient_record public.patients%rowtype;
  practice_record public.practice_profiles%rowtype;
  branding_record public.practice_branding%rowtype;
begin
  select * into link_record
  from public.patient_links
  where public_identifier = target_public_identifier
    and deleted_at is null
  limit 1;

  if link_record.id is null then
    return jsonb_build_object('access_state', 'invalid');
  end if;

  select * into tenant_record
  from public.tenants
  where id = link_record.tenant_id
    and deleted_at is null
  limit 1;

  if tenant_record.id is null or tenant_record.tenant_status not in ('trial', 'active') then
    return jsonb_build_object('access_state', 'unavailable');
  end if;

  if link_record.link_status <> 'active' then
    return jsonb_build_object('access_state', 'unavailable');
  end if;

  select * into patient_record
  from public.patients
  where id = link_record.patient_id
    and tenant_id = link_record.tenant_id
    and deleted_at is null
  limit 1;

  if patient_record.id is null or patient_record.patient_status in ('archived', 'merged') then
    return jsonb_build_object('access_state', 'unavailable');
  end if;

  select * into practice_record
  from public.practice_profiles
  where tenant_id = link_record.tenant_id
    and deleted_at is null
  order by created_at desc
  limit 1;

  select * into branding_record
  from public.practice_branding
  where tenant_id = link_record.tenant_id
    and deleted_at is null
  order by created_at desc
  limit 1;

  return jsonb_build_object(
    'access_state', 'verification_required',
    'public_identifier', link_record.public_identifier,
    'requires_intake', link_record.requires_intake,
    'practice', jsonb_build_object(
      'display_name', coalesce(branding_record.patient_facing_display_name, practice_record.trading_name, practice_record.legal_name, 'AlliDesk practice'),
      'email', practice_record.main_email,
      'phone', practice_record.main_phone,
      'website', practice_record.website,
      'country', practice_record.default_country
    ),
    'branding', jsonb_build_object(
      'logo_url', branding_record.logo_url,
      'primary_colour', coalesce(branding_record.primary_colour, '#27156f'),
      'accent_colour', coalesce(branding_record.accent_colour, '#ff7a3d')
    )
  );
end;
$$;

comment on function public.get_patient_link_public_context(text) is 'Returns non-sensitive Patient Link public context. Exact inactive link lifecycle states are intentionally hidden before verification.';

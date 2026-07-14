-- AlliDesk Phase 5F Step 3: Patient Link public projection RPCs.
--
-- Scope: secure, session-validated JSON projections for the external
-- Patient Link frontend. This migration does not expose raw tables and does
-- not implement communication delivery, payment links, document downloads or
-- patient messaging.

create or replace function public.get_patient_link_public_context(target_public_identifier text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  link_record public.patient_links%rowtype;
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

  if link_record.link_status in ('revoked', 'expired', 'archived', 'replaced') then
    return jsonb_build_object('access_state', link_record.link_status);
  end if;

  if link_record.link_status = 'suspended' then
    return jsonb_build_object('access_state', 'suspended');
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
    ),
    'patient_hint', jsonb_build_object(
      'display_name', trim(concat(patient_record.first_name, ' ', patient_record.last_name)),
      'patient_type', patient_record.patient_type
    )
  );
end;
$$;

create or replace function public.get_patient_link_portal_data(
  target_public_identifier text,
  session_token_input text,
  selected_public_identifier text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  source_link public.patient_links%rowtype;
  selected_link public.patient_links%rowtype;
  session_record public.patient_link_sessions%rowtype;
  grant_record public.patient_link_access_grants%rowtype;
  patient_record public.patients%rowtype;
  practice_record public.practice_profiles%rowtype;
  branding_record public.practice_branding%rowtype;
  location_record public.practice_locations%rowtype;
begin
  if session_token_input is null or btrim(session_token_input) = '' then
    return jsonb_build_object('access_state', 'expired_session');
  end if;

  select * into source_link
  from public.patient_links
  where public_identifier = target_public_identifier
    and deleted_at is null
  limit 1;

  if source_link.id is null then
    return jsonb_build_object('access_state', 'invalid');
  end if;

  if source_link.link_status <> 'active' then
    return jsonb_build_object('access_state', source_link.link_status);
  end if;

  select * into session_record
  from public.patient_link_sessions
  where patient_link_id = source_link.id
    and session_token_hash = public.hash_patient_link_secret(session_token_input)
    and session_status = 'active'
    and deleted_at is null
  limit 1;

  if session_record.id is null or session_record.expires_at <= now() then
    return jsonb_build_object('access_state', 'expired_session');
  end if;

  if session_record.access_grant_id is not null then
    select * into grant_record
    from public.patient_link_access_grants
    where id = session_record.access_grant_id
      and tenant_id = source_link.tenant_id
      and patient_link_id = source_link.id
      and access_status = 'active'
      and deleted_at is null
    limit 1;

    if grant_record.id is null then
      return jsonb_build_object('access_state', 'no_active_grant');
    end if;
  end if;

  if selected_public_identifier is not null and btrim(selected_public_identifier) <> '' then
    select pl.* into selected_link
    from public.patient_links pl
    join public.patient_link_access_grants ag on ag.patient_link_id = pl.id
    where pl.public_identifier = selected_public_identifier
      and pl.tenant_id = source_link.tenant_id
      and pl.link_status = 'active'
      and pl.deleted_at is null
      and ag.deleted_at is null
      and ag.access_status = 'active'
      and (
        ag.id = session_record.access_grant_id
        or (
          grant_record.responsible_party_id is not null
          and ag.responsible_party_id = grant_record.responsible_party_id
        )
      )
    limit 1;
  end if;

  if selected_link.id is null then
    selected_link := source_link;
  end if;

  select * into patient_record
  from public.patients
  where id = selected_link.patient_id
    and tenant_id = selected_link.tenant_id
    and deleted_at is null
  limit 1;

  if patient_record.id is null or patient_record.patient_status in ('archived', 'merged') then
    return jsonb_build_object('access_state', 'unavailable');
  end if;

  select * into practice_record
  from public.practice_profiles
  where tenant_id = selected_link.tenant_id
    and deleted_at is null
  order by created_at desc
  limit 1;

  select * into branding_record
  from public.practice_branding
  where tenant_id = selected_link.tenant_id
    and deleted_at is null
  order by created_at desc
  limit 1;

  select * into location_record
  from public.practice_locations
  where tenant_id = selected_link.tenant_id
    and deleted_at is null
    and is_active = true
  order by is_main_location desc, created_at asc
  limit 1;

  update public.patient_link_sessions
  set last_activity_at = now()
  where id = session_record.id;

  return jsonb_build_object(
    'access_state', 'active',
    'session', jsonb_build_object(
      'expires_at', session_record.expires_at,
      'last_activity_at', now()
    ),
    'selected_patient', jsonb_build_object(
      'public_identifier', selected_link.public_identifier,
      'display_name', trim(concat(patient_record.first_name, ' ', patient_record.last_name)),
      'patient_number', patient_record.patient_number,
      'patient_type', patient_record.patient_type
    ),
    'accessible_patients', coalesce((
      select jsonb_agg(jsonb_build_object(
        'public_identifier', linked.public_identifier,
        'display_name', trim(concat(p.first_name, ' ', p.last_name)),
        'patient_type', p.patient_type
      ) order by p.first_name, p.last_name)
      from public.patient_link_access_grants ag
      join public.patient_links linked on linked.id = ag.patient_link_id and linked.deleted_at is null and linked.link_status = 'active'
      join public.patients p on p.id = linked.patient_id and p.deleted_at is null
      where ag.tenant_id = selected_link.tenant_id
        and ag.deleted_at is null
        and ag.access_status = 'active'
        and (
          ag.id = session_record.access_grant_id
          or (
            grant_record.responsible_party_id is not null
            and ag.responsible_party_id = grant_record.responsible_party_id
          )
        )
    ), jsonb_build_array(jsonb_build_object(
      'public_identifier', selected_link.public_identifier,
      'display_name', trim(concat(patient_record.first_name, ' ', patient_record.last_name)),
      'patient_type', patient_record.patient_type
    ))),
    'practice', jsonb_build_object(
      'display_name', coalesce(branding_record.patient_facing_display_name, practice_record.trading_name, practice_record.legal_name, 'AlliDesk practice'),
      'legal_name', practice_record.legal_name,
      'trading_name', practice_record.trading_name,
      'email', practice_record.main_email,
      'phone', practice_record.main_phone,
      'website', practice_record.website,
      'country', practice_record.default_country,
      'location', jsonb_build_object(
        'name', location_record.location_name,
        'address_line_1', location_record.address_line_1,
        'address_line_2', location_record.address_line_2,
        'suburb', location_record.suburb,
        'city', location_record.city,
        'province', location_record.province,
        'postal_code', location_record.postal_code,
        'country', location_record.country,
        'phone', location_record.contact_phone,
        'email', location_record.contact_email
      )
    ),
    'branding', jsonb_build_object(
      'logo_url', branding_record.logo_url,
      'primary_colour', coalesce(branding_record.primary_colour, '#27156f'),
      'accent_colour', coalesce(branding_record.accent_colour, '#ff7a3d')
    ),
    'overview', jsonb_build_object(
      'next_appointment', (
        select to_jsonb(next_booking)
        from (
          select
            b.id,
            b.start_at,
            b.end_at,
            b.duration_minutes,
            b.booking_status,
            b.appointment_mode,
            b.patient_facing_title,
            b.patient_facing_notes,
            tp.display_name as therapist_name,
            pl.location_name
          from public.bookings b
          left join public.therapist_profiles tp on tp.id = b.therapist_profile_id
          left join public.practice_locations pl on pl.id = b.practice_location_id
          where b.tenant_id = selected_link.tenant_id
            and b.patient_id = selected_link.patient_id
            and b.deleted_at is null
            and b.patient_link_visible = true
            and b.start_at >= now()
            and b.booking_status in ('scheduled', 'confirmed', 'checked_in', 'in_progress')
          order by b.start_at asc
          limit 1
        ) next_booking
      ),
      'outstanding_balance', coalesce((
        select sum(i.balance_due)
        from public.invoices i
        where i.tenant_id = selected_link.tenant_id
          and i.patient_id = selected_link.patient_id
          and i.deleted_at is null
          and i.patient_link_visible = true
          and i.invoice_status in ('issued', 'awaiting_payment', 'partially_paid', 'overdue')
      ), 0)
    ),
    'appointments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', b.id,
        'date', b.start_at,
        'start_at', b.start_at,
        'end_at', b.end_at,
        'duration_minutes', b.duration_minutes,
        'status', b.booking_status,
        'appointment_type', b.booking_type,
        'mode', b.appointment_mode,
        'title', b.patient_facing_title,
        'notes', b.patient_facing_notes,
        'therapist_name', tp.display_name,
        'location_name', pl.location_name,
        'room_label', b.room_label
      ) order by b.start_at desc)
      from public.bookings b
      left join public.therapist_profiles tp on tp.id = b.therapist_profile_id
      left join public.practice_locations pl on pl.id = b.practice_location_id
      where b.tenant_id = selected_link.tenant_id
        and b.patient_id = selected_link.patient_id
        and b.deleted_at is null
        and b.patient_link_visible = true
        and b.booking_status in ('scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show')
    ), '[]'::jsonb),
    'invoices', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'invoice_number', i.invoice_number,
        'invoice_status', i.invoice_status,
        'payment_status', i.payment_status,
        'service_date', i.service_date,
        'invoice_date', i.invoice_date,
        'issued_at', i.issued_at,
        'due_date', i.due_date,
        'currency_code', i.currency_code,
        'total_amount', i.total_amount,
        'amount_paid', i.amount_paid,
        'balance_due', i.balance_due,
        'lines', coalesce((
          select jsonb_agg(jsonb_build_object(
            'procedure_name', il.procedure_name,
            'procedure_code', il.procedure_code,
            'description', il.description,
            'service_date', il.service_date,
            'quantity', il.quantity,
            'unit_price', il.unit_price,
            'line_total', il.line_total,
            'currency_code', il.currency_code
          ) order by il.line_order)
          from public.invoice_lines il
          where il.invoice_id = i.id
            and il.tenant_id = i.tenant_id
            and il.deleted_at is null
        ), '[]'::jsonb)
      ) order by coalesce(i.issued_at, i.confirmed_at, i.created_at) desc)
      from public.invoices i
      where i.tenant_id = selected_link.tenant_id
        and i.patient_id = selected_link.patient_id
        and i.deleted_at is null
        and i.patient_link_visible = true
        and i.invoice_status in ('issued', 'awaiting_payment', 'partially_paid', 'paid', 'overdue')
    ), '[]'::jsonb),
    'receipts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id,
        'receipt_number', r.receipt_number,
        'receipt_status', r.receipt_status,
        'receipt_date', r.receipt_date,
        'issued_at', r.issued_at,
        'payment_amount', r.payment_amount,
        'currency_code', r.currency_code,
        'payment_method', r.payment_method,
        'payment_reference', r.payment_reference,
        'allocation_snapshot', r.allocation_snapshot
      ) order by r.issued_at desc)
      from public.receipts r
      where r.tenant_id = selected_link.tenant_id
        and r.patient_id = selected_link.patient_id
        and r.deleted_at is null
        and r.patient_link_ready = true
        and r.receipt_status = 'issued'
    ), '[]'::jsonb),
    'consents', coalesce((
      select jsonb_agg(jsonb_build_object(
        'consent_type', pc.consent_type,
        'consent_status', pc.consent_status,
        'consent_version', pc.consent_version,
        'signed_by_name', pc.signed_by_name,
        'signed_by_relationship', pc.signed_by_relationship,
        'accepted_at', pc.accepted_at,
        'source', pc.source
      ) order by pc.created_at desc)
      from public.patient_consents pc
      where pc.tenant_id = selected_link.tenant_id
        and pc.patient_id = selected_link.patient_id
        and pc.deleted_at is null
        and pc.source in ('patient_link', 'internal')
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.log_patient_link_portal_access(
  target_public_identifier text,
  session_token_input text,
  event_type_input text,
  resource_type_input text default null,
  resource_id_input uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  link_record public.patient_links%rowtype;
  session_record public.patient_link_sessions%rowtype;
begin
  select * into link_record
  from public.patient_links
  where public_identifier = target_public_identifier
    and deleted_at is null
  limit 1;

  if link_record.id is null then
    return jsonb_build_object('logged', false);
  end if;

  select * into session_record
  from public.patient_link_sessions
  where patient_link_id = link_record.id
    and session_token_hash = public.hash_patient_link_secret(session_token_input)
    and session_status = 'active'
    and expires_at > now()
    and deleted_at is null
  limit 1;

  if session_record.id is null then
    return jsonb_build_object('logged', false);
  end if;

  insert into public.patient_link_access_logs (
    tenant_id, patient_link_id, access_grant_id, session_id, patient_id, event_type, event_status, resource_type, resource_id
  )
  values (
    session_record.tenant_id, session_record.patient_link_id, session_record.access_grant_id, session_record.id,
    session_record.patient_id, event_type_input, 'recorded', resource_type_input, resource_id_input
  );

  return jsonb_build_object('logged', true);
end;
$$;

grant execute on function public.get_patient_link_public_context(text) to anon, authenticated;
grant execute on function public.get_patient_link_portal_data(text, text, text) to anon, authenticated;
grant execute on function public.log_patient_link_portal_access(text, text, text, text, uuid) to anon, authenticated;

grant execute on function public.request_patient_link_verification(text, uuid, text, text, text, integer) to anon;
grant execute on function public.verify_patient_link(uuid, text) to anon;
grant execute on function public.create_patient_link_session(uuid, text, inet, text, integer) to anon;
grant execute on function public.revoke_patient_link_session(text, text) to anon;

comment on function public.get_patient_link_public_context(text) is 'Safe public Patient Link context projection. Does not expose tenant or patient IDs.';
comment on function public.get_patient_link_portal_data(text, text, text) is 'Session-validated Patient Link portal projection for approved patient-facing data only.';
comment on function public.log_patient_link_portal_access(text, text, text, text, uuid) is 'Session-validated external Patient Link access logging helper.';

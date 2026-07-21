-- AlliDesk Phase 5F Step 4: Patient Link integration and security hardening.
--
-- This migration tightens the public projection boundary added in Step 3.
-- It does not create new tables, expose raw operational tables, implement
-- communication delivery, payments, PDFs, messaging or booking changes.

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

  if link_record.link_status in ('suspended', 'revoked', 'expired', 'archived', 'replaced') then
    return jsonb_build_object('access_state', link_record.link_status);
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

create or replace function public.request_patient_link_public_verification(
  target_public_identifier text,
  delivery_method_input text,
  expires_in_minutes integer default 10
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  link_record public.patient_links%rowtype;
  tenant_record public.tenants%rowtype;
  grant_record public.patient_link_access_grants%rowtype;
  generated_code text;
  salt_value text;
  challenge_record public.patient_link_verification_challenges%rowtype;
begin
  select * into link_record
  from public.patient_links
  where public_identifier = target_public_identifier
    and deleted_at is null
  limit 1;

  if link_record.id is null or link_record.link_status <> 'active' then
    return jsonb_build_object(
      'requested', true,
      'challenge_id', gen_random_uuid(),
      'expires_at', now() + make_interval(mins => least(greatest(coalesce(expires_in_minutes, 10), 1), 60)),
      'delivery_deferred', true
    );
  end if;

  select * into tenant_record
  from public.tenants
  where id = link_record.tenant_id
    and deleted_at is null
  limit 1;

  if tenant_record.id is null or tenant_record.tenant_status not in ('trial', 'active') then
    return jsonb_build_object(
      'requested', true,
      'challenge_id', gen_random_uuid(),
      'expires_at', now() + make_interval(mins => least(greatest(coalesce(expires_in_minutes, 10), 1), 60)),
      'delivery_deferred', true
    );
  end if;

  select * into grant_record
  from public.patient_link_access_grants
  where tenant_id = link_record.tenant_id
    and patient_link_id = link_record.id
    and patient_id = link_record.patient_id
    and access_status = 'active'
    and deleted_at is null
  order by last_used_at desc nulls last, created_at asc
  limit 1;

  if grant_record.id is null then
    insert into public.patient_link_access_logs (
      tenant_id, patient_link_id, patient_id, event_type, event_status, failure_reason
    )
    values (
      link_record.tenant_id, link_record.id, link_record.patient_id, 'verification_requested', 'blocked', 'no_active_grant'
    );

    return jsonb_build_object(
      'requested', true,
      'challenge_id', gen_random_uuid(),
      'expires_at', now() + make_interval(mins => least(greatest(coalesce(expires_in_minutes, 10), 1), 60)),
      'delivery_deferred', true
    );
  end if;

  if delivery_method_input not in ('email', 'sms', 'whatsapp') then
    delivery_method_input := 'email';
  end if;

  generated_code := lpad((floor(random() * 1000000))::integer::text, 6, '0');
  salt_value := encode(extensions.gen_random_bytes(16), 'hex');

  insert into public.patient_link_verification_challenges (
    tenant_id,
    patient_link_id,
    access_grant_id,
    delivery_method,
    destination_hash,
    verification_code_hash,
    code_salt,
    expires_at,
    metadata
  )
  values (
    link_record.tenant_id,
    link_record.id,
    grant_record.id,
    delivery_method_input,
    grant_record.contact_destination_hash,
    public.hash_patient_link_secret(generated_code, salt_value),
    salt_value,
    now() + make_interval(mins => least(greatest(coalesce(expires_in_minutes, 10), 1), 60)),
    jsonb_build_object('delivery_deferred', true)
  )
  returning * into challenge_record;

  insert into public.patient_link_access_logs (
    tenant_id, patient_link_id, access_grant_id, patient_id, event_type, event_status
  )
  values (
    link_record.tenant_id, link_record.id, grant_record.id, link_record.patient_id, 'verification_requested', 'recorded'
  );

  insert into public.patient_link_workflow_events (
    tenant_id, patient_link_id, access_grant_id, patient_id, event_type, event_status, idempotency_key, payload
  )
  values (
    link_record.tenant_id, link_record.id, grant_record.id, link_record.patient_id,
    'patient_link_verification_requested', 'ready',
    'patient_link:' || link_record.id::text || ':challenge:' || challenge_record.id::text || ':verification_requested:v2',
    jsonb_build_object('challenge_id', challenge_record.id, 'delivery_method', delivery_method_input, 'delivery_deferred', true)
  )
  on conflict (tenant_id, idempotency_key) where deleted_at is null do nothing;

  return jsonb_build_object(
    'requested', true,
    'challenge_id', challenge_record.id,
    'expires_at', challenge_record.expires_at,
    'delivery_deferred', true
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
  tenant_record public.tenants%rowtype;
  session_record public.patient_link_sessions%rowtype;
  grant_record public.patient_link_access_grants%rowtype;
  selected_grant public.patient_link_access_grants%rowtype;
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

  select * into tenant_record
  from public.tenants
  where id = source_link.tenant_id
    and deleted_at is null
  limit 1;

  if tenant_record.id is null or tenant_record.tenant_status not in ('trial', 'active') then
    return jsonb_build_object('access_state', 'tenant_unavailable');
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

  if source_link.credential_reset_at is not null and session_record.created_at < source_link.credential_reset_at then
    update public.patient_link_sessions
    set session_status = 'revoked',
        revoked_at = now(),
        revocation_reason = 'credentials_reset'
    where id = session_record.id;

    return jsonb_build_object('access_state', 'expired_session');
  end if;

  if session_record.access_grant_id is null then
    return jsonb_build_object('access_state', 'no_active_grant');
  end if;

  select * into grant_record
  from public.patient_link_access_grants
  where id = session_record.access_grant_id
    and tenant_id = source_link.tenant_id
    and patient_link_id = source_link.id
    and patient_id = source_link.patient_id
    and access_status = 'active'
    and deleted_at is null
  limit 1;

  if grant_record.id is null then
    return jsonb_build_object('access_state', 'no_active_grant');
  end if;

  if selected_public_identifier is not null and btrim(selected_public_identifier) <> '' then
    select pl.* into selected_link
    from public.patient_links pl
    join public.patient_link_access_grants ag on ag.patient_link_id = pl.id
    join public.patients p on p.id = pl.patient_id
    where pl.public_identifier = selected_public_identifier
      and pl.tenant_id = source_link.tenant_id
      and pl.link_status = 'active'
      and pl.deleted_at is null
      and ag.deleted_at is null
      and ag.access_status = 'active'
      and p.deleted_at is null
      and p.patient_status not in ('archived', 'merged')
      and (
        ag.id = grant_record.id
        or (
          grant_record.responsible_party_id is not null
          and ag.responsible_party_id = grant_record.responsible_party_id
        )
      )
    limit 1;

    if selected_link.id is not null then
      select ag.* into selected_grant
      from public.patient_link_access_grants ag
      where ag.patient_link_id = selected_link.id
        and ag.tenant_id = source_link.tenant_id
        and ag.deleted_at is null
        and ag.access_status = 'active'
        and (
          ag.id = grant_record.id
          or (
            grant_record.responsible_party_id is not null
            and ag.responsible_party_id = grant_record.responsible_party_id
          )
        )
      order by ag.last_used_at desc nulls last, ag.created_at asc
      limit 1;
    end if;
  end if;

  if selected_link.id is null then
    selected_link := source_link;
    selected_grant := grant_record;
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

  update public.patient_link_access_grants
  set last_used_at = now()
  where id = selected_grant.id;

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
      join public.patients p on p.id = linked.patient_id and p.deleted_at is null and p.patient_status not in ('archived', 'merged')
      where ag.tenant_id = selected_link.tenant_id
        and ag.deleted_at is null
        and ag.access_status = 'active'
        and (
          ag.id = grant_record.id
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
      'next_appointment', case when selected_grant.appointments_visible then (
        select to_jsonb(next_booking)
        from (
          select
            b.start_at,
            b.end_at,
            b.duration_minutes,
            b.booking_status,
            b.appointment_mode,
            b.booking_type,
            b.patient_facing_title,
            b.patient_facing_notes,
            tp.display_name as therapist_name,
            pl.location_name,
            b.room_label
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
      ) else null end,
      'outstanding_balance', case when selected_grant.finance_visible then coalesce((
        select sum(i.balance_due)
        from public.invoices i
        where i.tenant_id = selected_link.tenant_id
          and i.patient_id = selected_link.patient_id
          and i.deleted_at is null
          and i.patient_link_visible = true
          and i.reconciliation_required = false
          and i.invoice_status in ('issued', 'awaiting_payment', 'partially_paid', 'overdue')
          and (
            selected_grant.responsible_party_id is null
            or i.responsible_party_id = selected_grant.responsible_party_id
          )
      ), 0) else 0 end
    ),
    'appointments', case when selected_grant.appointments_visible then coalesce((
      select jsonb_agg(jsonb_build_object(
        'date', appointment_rows.start_at,
        'start_at', appointment_rows.start_at,
        'end_at', appointment_rows.end_at,
        'duration_minutes', appointment_rows.duration_minutes,
        'status', appointment_rows.booking_status,
        'appointment_type', appointment_rows.booking_type,
        'mode', appointment_rows.appointment_mode,
        'title', appointment_rows.patient_facing_title,
        'notes', appointment_rows.patient_facing_notes,
        'therapist_name', appointment_rows.therapist_name,
        'location_name', appointment_rows.location_name,
        'room_label', appointment_rows.room_label
      ) order by appointment_rows.start_at desc)
      from (
        select
          b.start_at,
          b.end_at,
          b.duration_minutes,
          b.booking_status,
          b.appointment_mode,
          b.booking_type,
          b.patient_facing_title,
          b.patient_facing_notes,
          tp.display_name as therapist_name,
          pl.location_name,
          b.room_label
        from public.bookings b
        left join public.therapist_profiles tp on tp.id = b.therapist_profile_id
        left join public.practice_locations pl on pl.id = b.practice_location_id
        where b.tenant_id = selected_link.tenant_id
          and b.patient_id = selected_link.patient_id
          and b.deleted_at is null
          and b.patient_link_visible = true
          and b.booking_status in ('scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled')
        order by b.start_at desc
        limit 100
      ) appointment_rows
    ), '[]'::jsonb) else '[]'::jsonb end,
    'invoices', case when selected_grant.finance_visible then coalesce((
      select jsonb_agg(jsonb_build_object(
        'invoice_number', invoice_rows.invoice_number,
        'invoice_status', invoice_rows.invoice_status,
        'payment_status', invoice_rows.payment_status,
        'service_date', invoice_rows.service_date,
        'invoice_date', invoice_rows.invoice_date,
        'issued_at', invoice_rows.issued_at,
        'due_date', invoice_rows.due_date,
        'currency_code', invoice_rows.currency_code,
        'total_amount', invoice_rows.total_amount,
        'amount_paid', invoice_rows.amount_paid,
        'balance_due', invoice_rows.balance_due,
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
          where il.invoice_id = invoice_rows.id
            and il.tenant_id = invoice_rows.tenant_id
            and il.deleted_at is null
            and il.line_type <> 'informational'
        ), '[]'::jsonb)
      ) order by coalesce(invoice_rows.issued_at, invoice_rows.confirmed_at, invoice_rows.created_at) desc)
      from (
        select
          i.id,
          i.tenant_id,
          i.invoice_number,
          i.invoice_status,
          i.payment_status,
          i.service_date,
          i.invoice_date,
          i.issued_at,
          i.confirmed_at,
          i.created_at,
          i.due_date,
          i.currency_code,
          i.total_amount,
          i.amount_paid,
          i.balance_due
        from public.invoices i
        where i.tenant_id = selected_link.tenant_id
          and i.patient_id = selected_link.patient_id
          and i.deleted_at is null
          and i.patient_link_visible = true
          and i.reconciliation_required = false
          and i.invoice_status in ('issued', 'awaiting_payment', 'partially_paid', 'paid', 'overdue')
          and (
            selected_grant.responsible_party_id is null
            or i.responsible_party_id = selected_grant.responsible_party_id
          )
        order by coalesce(i.issued_at, i.confirmed_at, i.created_at) desc
        limit 100
      ) invoice_rows
    ), '[]'::jsonb) else '[]'::jsonb end,
    'receipts', case when selected_grant.finance_visible then coalesce((
      select jsonb_agg(jsonb_build_object(
        'receipt_number', receipt_rows.receipt_number,
        'receipt_status', receipt_rows.receipt_status,
        'receipt_date', receipt_rows.receipt_date,
        'issued_at', receipt_rows.issued_at,
        'payment_amount', receipt_rows.payment_amount,
        'currency_code', receipt_rows.currency_code,
        'payment_method', receipt_rows.payment_method,
        'payment_reference', receipt_rows.payment_reference,
        'allocation_snapshot', receipt_rows.allocation_snapshot
      ) order by receipt_rows.issued_at desc)
      from (
        select
          r.receipt_number,
          r.receipt_status,
          r.receipt_date,
          r.issued_at,
          r.payment_amount,
          r.currency_code,
          r.payment_method,
          r.payment_reference,
          r.allocation_snapshot
        from public.receipts r
        where r.tenant_id = selected_link.tenant_id
          and r.patient_id = selected_link.patient_id
          and r.deleted_at is null
          and r.patient_link_ready = true
          and r.receipt_status in ('issued', 'reversed')
          and (
            selected_grant.responsible_party_id is null
            or r.responsible_party_id = selected_grant.responsible_party_id
          )
        order by r.issued_at desc
        limit 100
      ) receipt_rows
    ), '[]'::jsonb) else '[]'::jsonb end,
    'consents', coalesce((
      select jsonb_agg(jsonb_build_object(
        'consent_type', consent_rows.consent_type,
        'consent_status', consent_rows.consent_status,
        'consent_version', consent_rows.consent_version,
        'signed_by_name', consent_rows.signed_by_name,
        'signed_by_relationship', consent_rows.signed_by_relationship,
        'accepted_at', consent_rows.accepted_at,
        'source', consent_rows.source
      ) order by consent_rows.created_at desc)
      from (
        select
          pc.consent_type,
          pc.consent_status,
          pc.consent_version,
          pc.signed_by_name,
          pc.signed_by_relationship,
          pc.accepted_at,
          pc.source,
          pc.created_at
        from public.patient_consents pc
        where pc.tenant_id = selected_link.tenant_id
          and pc.patient_id = selected_link.patient_id
          and pc.deleted_at is null
          and pc.source in ('patient_link', 'internal')
        order by pc.created_at desc
        limit 30
      ) consent_rows
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
  if event_type_input not in ('appointment_viewed', 'invoice_viewed', 'receipt_viewed', 'logout', 'suspicious_activity') then
    return jsonb_build_object('logged', false);
  end if;

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
    insert into public.patient_link_access_logs (
      tenant_id, patient_link_id, patient_id, event_type, event_status, failure_reason
    )
    values (
      link_record.tenant_id, link_record.id, link_record.patient_id, 'suspicious_activity', 'blocked', 'invalid_or_expired_session'
    );

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

revoke execute on function public.request_patient_link_verification(text, uuid, text, text, text, integer) from public;
revoke execute on function public.request_patient_link_verification(text, uuid, text, text, text, integer) from anon;
revoke execute on function public.request_patient_link_verification(text, uuid, text, text, text, integer) from authenticated;
grant execute on function public.request_patient_link_public_verification(text, text, integer) to anon, authenticated;

comment on function public.request_patient_link_public_verification(text, text, integer) is 'Browser-safe Patient Link verification request. Generates and hashes verification material without returning the code.';

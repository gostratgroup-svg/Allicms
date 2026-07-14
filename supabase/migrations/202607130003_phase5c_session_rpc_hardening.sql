-- AlliDesk Phase 5C Step 5: Session RPC hardening.
--
-- This migration tightens create_session_from_booking() eligibility checks
-- discovered during Session Engine validation. It keeps the existing table
-- design intact and does not add new operational features.

create or replace function public.create_session_from_booking(target_booking_id uuid)
returns table (
  session_id uuid,
  created_session boolean,
  session_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_record public.bookings%rowtype;
  existing_session public.sessions%rowtype;
  patient_record public.patients%rowtype;
  therapist_record public.therapist_profiles%rowtype;
  location_record public.practice_locations%rowtype;
  new_session_id uuid;
begin
  select *
  into booking_record
  from public.bookings
  where id = target_booking_id
    and deleted_at is null
  for update;

  if booking_record.id is null then
    raise exception 'Booking not found';
  end if;

  if not public.has_tenant_role(booking_record.tenant_id, array['admin', 'receptionist', 'therapist']) then
    raise exception 'Not allowed to create a session for this booking';
  end if;

  if booking_record.booking_status not in ('scheduled', 'confirmed', 'checked_in', 'in_progress') then
    raise exception 'Cannot create a session from this booking status';
  end if;

  select *
  into patient_record
  from public.patients
  where id = booking_record.patient_id
    and tenant_id = booking_record.tenant_id
    and deleted_at is null;

  if patient_record.id is null then
    raise exception 'Booking patient not found';
  end if;

  if patient_record.patient_status in ('archived', 'merged') then
    raise exception 'Cannot create a session for an archived or merged patient';
  end if;

  if booking_record.therapist_profile_id is null then
    raise exception 'Booking requires a therapist before session creation';
  end if;

  select *
  into therapist_record
  from public.therapist_profiles
  where id = booking_record.therapist_profile_id
    and tenant_id = booking_record.tenant_id
    and deleted_at is null;

  if therapist_record.id is null then
    raise exception 'Booking therapist not found';
  end if;

  if therapist_record.is_active = false then
    raise exception 'Cannot create a session for an inactive therapist';
  end if;

  if booking_record.practice_location_id is not null then
    select *
    into location_record
    from public.practice_locations
    where id = booking_record.practice_location_id
      and tenant_id = booking_record.tenant_id
      and deleted_at is null;

    if location_record.id is null then
      raise exception 'Booking location not found';
    end if;

    if location_record.is_active = false then
      raise exception 'Cannot create a session for an inactive location';
    end if;
  end if;

  select *
  into existing_session
  from public.sessions
  where booking_id = target_booking_id
    and deleted_at is null;

  if existing_session.id is not null then
    session_id := existing_session.id;
    created_session := false;
    session_status := existing_session.session_status;
    return next;
    return;
  end if;

  insert into public.sessions (
    tenant_id,
    booking_id,
    patient_id,
    therapist_profile_id,
    practice_location_id,
    session_status,
    session_type,
    session_modality,
    scheduled_start_at,
    scheduled_end_at,
    timezone,
    room_label,
    created_by_profile_id,
    updated_by_profile_id
  )
  values (
    booking_record.tenant_id,
    booking_record.id,
    booking_record.patient_id,
    booking_record.therapist_profile_id,
    booking_record.practice_location_id,
    'not_started',
    booking_record.booking_type,
    booking_record.appointment_mode,
    booking_record.start_at,
    booking_record.end_at,
    booking_record.timezone,
    booking_record.room_label,
    auth.uid(),
    auth.uid()
  )
  returning id into new_session_id;

  insert into public.session_procedures (
    tenant_id,
    session_id,
    booking_procedure_id,
    price_list_id,
    price_list_item_id,
    procedure_name,
    procedure_code,
    description,
    unit_price,
    quantity,
    discount_amount,
    adjustment_amount,
    line_total,
    duration_minutes,
    currency_code,
    is_billable,
    created_by_profile_id,
    updated_by_profile_id
  )
  select
    bp.tenant_id,
    new_session_id,
    bp.id,
    bp.price_list_id,
    bp.price_list_item_id,
    bp.procedure_name,
    bp.procedure_code,
    bp.description,
    bp.unit_price,
    bp.quantity,
    bp.discount_amount,
    bp.adjustment_amount,
    bp.line_total,
    bp.duration_minutes,
    bp.currency_code,
    bp.is_billable,
    auth.uid(),
    auth.uid()
  from public.booking_procedures bp
  where bp.booking_id = booking_record.id
    and bp.deleted_at is null;

  insert into public.session_status_history (
    tenant_id,
    session_id,
    booking_id,
    patient_id,
    to_status,
    event_type,
    event_reason,
    created_by_profile_id
  )
  values (
    booking_record.tenant_id,
    new_session_id,
    booking_record.id,
    booking_record.patient_id,
    'not_started',
    'session_created',
    'Session created from booking',
    auth.uid()
  );

  insert into public.session_workflow_events (
    tenant_id,
    session_id,
    booking_id,
    patient_id,
    event_type,
    idempotency_key,
    payload,
    created_by_profile_id
  )
  values (
    booking_record.tenant_id,
    new_session_id,
    booking_record.id,
    booking_record.patient_id,
    'session_created',
    'session:' || new_session_id::text || ':session_created:v1',
    jsonb_build_object('booking_id', booking_record.id),
    auth.uid()
  )
  on conflict (tenant_id, idempotency_key) where deleted_at is null do nothing;

  insert into public.patient_history_events (
    tenant_id,
    patient_id,
    event_type,
    event_title,
    event_body,
    source_table,
    source_id,
    is_patient_visible,
    occurred_at,
    created_by_profile_id,
    metadata
  )
  values (
    booking_record.tenant_id,
    booking_record.patient_id,
    'session_created',
    'Session created',
    'A session record was created from the booking.',
    'sessions',
    new_session_id,
    false,
    now(),
    auth.uid(),
    jsonb_build_object('booking_id', booking_record.id)
  );

  session_id := new_session_id;
  created_session := true;
  session_status := 'not_started';
  return next;
end;
$$;

revoke all on function public.create_session_from_booking(uuid) from public, anon;
grant execute on function public.create_session_from_booking(uuid) to authenticated;

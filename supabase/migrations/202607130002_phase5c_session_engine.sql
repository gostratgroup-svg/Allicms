-- AlliDesk Phase 5C: Session Engine database foundation.
-- Scope: sessions, session_procedures, session_status_history,
-- session_notes, session_workflow_events, and integrity RPCs for
-- idempotent session creation/completion.
--
-- This migration intentionally does not create the future Clinical Notes
-- Engine, invoices, statements, payments, documents, communication sending,
-- or workflow automation execution.
--
-- Architecture notes:
-- - Booking remains the source of scheduled intent.
-- - Session records actual delivered care facts and completion readiness.
-- - Formal clinical notes remain out of scope and must be versioned later
--   in the Clinical Notes Engine.
-- - Finance users may read billing-relevant session facts/procedures, but
--   internal operational notes are separated into session_notes.

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  booking_id uuid not null references public.bookings(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  therapist_profile_id uuid references public.therapist_profiles(id) on delete set null,
  practice_location_id uuid references public.practice_locations(id) on delete set null,
  session_status text not null default 'not_started',
  attendance_outcome text not null default 'not_recorded',
  session_type text not null default 'standard',
  session_modality text not null default 'in_person',
  session_outcome text,
  scheduled_start_at timestamptz,
  scheduled_end_at timestamptz,
  actual_start_at timestamptz,
  actual_end_at timestamptz,
  actual_duration_minutes integer,
  timezone text not null default 'Africa/Johannesburg',
  room_label text,
  operational_summary text,
  completed_at timestamptz,
  completed_by_profile_id uuid references public.profiles(id) on delete set null,
  cancelled_at timestamptz,
  cancelled_by_profile_id uuid references public.profiles(id) on delete set null,
  cancellation_reason text,
  no_show_at timestamptz,
  reopened_at timestamptz,
  reopened_by_profile_id uuid references public.profiles(id) on delete set null,
  reopen_reason text,
  draft_invoice_requested_at timestamptz,
  draft_invoice_request_status text not null default 'not_requested',
  patient_history_ready boolean not null default false,
  patient_link_update_ready boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sessions_status_check
    check (session_status in ('not_started', 'ready', 'in_progress', 'paused', 'completed', 'cancelled', 'no_show', 'reopened')),
  constraint sessions_attendance_outcome_check
    check (attendance_outcome in ('not_recorded', 'attended', 'partial_attendance', 'cancelled', 'no_show', 'rescheduled_before_start')),
  constraint sessions_type_check
    check (session_type in ('standard', 'assessment', 'review', 'group', 'admin', 'other')),
  constraint sessions_modality_check
    check (session_modality in ('in_person', 'telehealth', 'home_visit', 'school_visit', 'other')),
  constraint sessions_outcome_check
    check (
      session_outcome is null
      or session_outcome in ('completed_as_planned', 'completed_with_changes', 'follow_up_required', 'report_required', 'feedback_required', 'referred_on', 'cancelled', 'no_show')
    ),
  constraint sessions_scheduled_time_order_check
    check (scheduled_start_at is null or scheduled_end_at is null or scheduled_start_at < scheduled_end_at),
  constraint sessions_actual_time_order_check
    check (actual_start_at is null or actual_end_at is null or actual_start_at < actual_end_at),
  constraint sessions_actual_duration_check
    check (actual_duration_minutes is null or actual_duration_minutes > 0),
  constraint sessions_completed_state_check
    check (
      (
        session_status = 'completed'
        and completed_at is not null
        and actual_start_at is not null
        and actual_end_at is not null
        and actual_duration_minutes is not null
        and attendance_outcome in ('attended', 'partial_attendance')
        and session_outcome is not null
      )
      or session_status <> 'completed'
    ),
  constraint sessions_cancelled_state_check
    check (
      (
        session_status = 'cancelled'
        and cancelled_at is not null
        and cancellation_reason is not null
        and btrim(cancellation_reason) <> ''
        and attendance_outcome = 'cancelled'
      )
      or session_status <> 'cancelled'
    ),
  constraint sessions_no_show_state_check
    check (
      (
        session_status = 'no_show'
        and no_show_at is not null
        and attendance_outcome = 'no_show'
      )
      or session_status <> 'no_show'
    ),
  constraint sessions_reopened_state_check
    check (
      (
        session_status = 'reopened'
        and reopened_at is not null
        and reopen_reason is not null
        and btrim(reopen_reason) <> ''
      )
      or session_status <> 'reopened'
    ),
  constraint sessions_draft_invoice_request_status_check
    check (draft_invoice_request_status in ('not_requested', 'requested', 'stale_after_reopen', 'failed', 'cancelled', 'processed'))
);

create table public.session_procedures (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  session_id uuid not null references public.sessions(id) on delete cascade,
  booking_procedure_id uuid references public.booking_procedures(id) on delete set null,
  price_list_id uuid references public.price_lists(id) on delete set null,
  price_list_item_id uuid references public.price_list_items(id) on delete set null,
  procedure_name text not null,
  procedure_code text,
  description text,
  unit_price numeric(12, 2) not null default 0,
  quantity numeric(10, 2) not null default 1,
  discount_amount numeric(12, 2) not null default 0,
  adjustment_amount numeric(12, 2) not null default 0,
  line_total numeric(12, 2) not null default 0,
  duration_minutes integer,
  currency_code text not null default 'ZAR',
  is_billable boolean not null default true,
  differs_from_booking boolean not null default false,
  change_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint session_procedures_name_not_blank_check
    check (btrim(procedure_name) <> ''),
  constraint session_procedures_code_not_blank_check
    check (procedure_code is null or btrim(procedure_code) <> ''),
  constraint session_procedures_unit_price_check
    check (unit_price >= 0),
  constraint session_procedures_quantity_check
    check (quantity > 0),
  constraint session_procedures_discount_check
    check (discount_amount >= 0),
  constraint session_procedures_line_total_check
    check (line_total >= 0),
  constraint session_procedures_duration_check
    check (duration_minutes is null or duration_minutes > 0),
  constraint session_procedures_currency_code_check
    check (char_length(currency_code) = 3),
  constraint session_procedures_change_reason_check
    check (
      differs_from_booking = false
      or (change_reason is not null and btrim(change_reason) <> '')
    )
);

create table public.session_status_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  session_id uuid not null references public.sessions(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  patient_id uuid references public.patients(id) on delete set null,
  from_status text,
  to_status text not null,
  event_type text not null,
  event_reason text,
  actual_start_at timestamptz,
  actual_end_at timestamptz,
  is_patient_visible boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint session_status_history_from_status_check
    check (from_status is null or from_status in ('not_started', 'ready', 'in_progress', 'paused', 'completed', 'cancelled', 'no_show', 'reopened')),
  constraint session_status_history_to_status_check
    check (to_status in ('not_started', 'ready', 'in_progress', 'paused', 'completed', 'cancelled', 'no_show', 'reopened')),
  constraint session_status_history_event_type_check
    check (event_type in ('session_created', 'session_ready', 'session_started', 'session_paused', 'session_resumed', 'session_completed', 'session_reopened', 'session_cancelled', 'session_no_show_recorded', 'session_procedures_changed', 'draft_invoice_requested', 'admin_correction'))
);

create table public.session_notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  session_id uuid not null references public.sessions(id) on delete cascade,
  note_type text not null default 'operational',
  visibility text not null default 'internal',
  title text,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint session_notes_type_check
    check (note_type in ('operational', 'planning', 'patient_facing_feedback', 'other')),
  constraint session_notes_visibility_check
    check (visibility in ('internal', 'patient_facing')),
  constraint session_notes_body_not_blank_check
    check (btrim(body) <> ''),
  constraint session_notes_patient_feedback_visibility_check
    check (note_type <> 'patient_facing_feedback' or visibility = 'patient_facing')
);

create table public.session_workflow_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  session_id uuid not null references public.sessions(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  patient_id uuid references public.patients(id) on delete set null,
  event_type text not null,
  idempotency_key text not null,
  event_status text not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  failed_at timestamptz,
  error_message text,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint session_workflow_events_type_check
    check (event_type in ('session_created', 'session_ready', 'session_started', 'session_paused', 'session_resumed', 'session_completed', 'session_reopened', 'session_cancelled', 'session_no_show_recorded', 'session_procedures_changed', 'draft_invoice_requested', 'patient_history_ready', 'patient_link_update_ready', 'communication_ready')),
  constraint session_workflow_events_status_check
    check (event_status in ('pending', 'processing', 'processed', 'failed', 'ignored')),
  constraint session_workflow_events_idempotency_not_blank_check
    check (btrim(idempotency_key) <> '')
);

create trigger sessions_set_updated_at
before update on public.sessions
for each row execute function public.set_updated_at();

create trigger session_procedures_set_updated_at
before update on public.session_procedures
for each row execute function public.set_updated_at();

create trigger session_status_history_set_updated_at
before update on public.session_status_history
for each row execute function public.set_updated_at();

create trigger session_notes_set_updated_at
before update on public.session_notes
for each row execute function public.set_updated_at();

create trigger session_workflow_events_set_updated_at
before update on public.session_workflow_events
for each row execute function public.set_updated_at();

create unique index sessions_one_active_per_booking_idx
  on public.sessions (booking_id)
  where deleted_at is null;

create index sessions_tenant_status_idx
  on public.sessions (tenant_id, session_status, scheduled_start_at)
  where deleted_at is null;

create index sessions_therapist_queue_idx
  on public.sessions (tenant_id, therapist_profile_id, session_status, scheduled_start_at)
  where deleted_at is null and therapist_profile_id is not null;

create index sessions_patient_history_idx
  on public.sessions (tenant_id, patient_id, scheduled_start_at desc)
  where deleted_at is null;

create index sessions_booking_id_idx
  on public.sessions (booking_id)
  where deleted_at is null;

create index sessions_location_date_idx
  on public.sessions (tenant_id, practice_location_id, scheduled_start_at)
  where deleted_at is null and practice_location_id is not null;

create index sessions_actual_start_idx
  on public.sessions (tenant_id, actual_start_at)
  where deleted_at is null and actual_start_at is not null;

create index sessions_completed_at_idx
  on public.sessions (tenant_id, completed_at)
  where deleted_at is null and completed_at is not null;

create index sessions_draft_invoice_request_idx
  on public.sessions (tenant_id, draft_invoice_request_status, draft_invoice_requested_at)
  where deleted_at is null;

create index session_procedures_session_id_idx
  on public.session_procedures (session_id)
  where deleted_at is null;

create index session_procedures_tenant_id_idx
  on public.session_procedures (tenant_id)
  where deleted_at is null;

create index session_procedures_booking_procedure_idx
  on public.session_procedures (booking_procedure_id)
  where booking_procedure_id is not null and deleted_at is null;

create index session_procedures_price_list_item_idx
  on public.session_procedures (price_list_item_id)
  where price_list_item_id is not null and deleted_at is null;

create index session_status_history_session_id_idx
  on public.session_status_history (session_id, created_at desc)
  where deleted_at is null;

create index session_status_history_tenant_event_idx
  on public.session_status_history (tenant_id, event_type, created_at desc)
  where deleted_at is null;

create index session_status_history_patient_idx
  on public.session_status_history (tenant_id, patient_id, created_at desc)
  where patient_id is not null and deleted_at is null;

create index session_notes_session_id_idx
  on public.session_notes (session_id, created_at desc)
  where deleted_at is null;

create index session_notes_visibility_idx
  on public.session_notes (tenant_id, visibility, created_at desc)
  where deleted_at is null;

create index session_workflow_events_session_id_idx
  on public.session_workflow_events (session_id, created_at desc)
  where deleted_at is null;

create index session_workflow_events_status_idx
  on public.session_workflow_events (tenant_id, event_status, created_at)
  where deleted_at is null;

create unique index session_workflow_events_idempotency_idx
  on public.session_workflow_events (tenant_id, idempotency_key)
  where deleted_at is null;

alter table public.sessions enable row level security;
alter table public.session_procedures enable row level security;
alter table public.session_status_history enable row level security;
alter table public.session_notes enable row level security;
alter table public.session_workflow_events enable row level security;

create policy "tenant members can read sessions"
on public.sessions
for select
to authenticated
using (
  deleted_at is null
  and public.is_tenant_member(tenant_id)
);

create policy "tenant session users can create sessions"
on public.sessions
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist']));

create policy "tenant session users can update sessions"
on public.sessions
for update
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist'])
)
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist']));

create policy "tenant members can read session procedures"
on public.session_procedures
for select
to authenticated
using (
  deleted_at is null
  and public.is_tenant_member(tenant_id)
);

create policy "tenant session users can create session procedures"
on public.session_procedures
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist']));

create policy "tenant session users can update session procedures"
on public.session_procedures
for update
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist'])
)
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist']));

create policy "tenant members can read session status history"
on public.session_status_history
for select
to authenticated
using (
  deleted_at is null
  and public.is_tenant_member(tenant_id)
);

create policy "tenant session users can create session status history"
on public.session_status_history
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist']));

create policy "tenant admins can update session status history"
on public.session_status_history
for update
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin'])
)
with check (public.has_tenant_role(tenant_id, array['admin']));

create policy "tenant users can read permitted session notes"
on public.session_notes
for select
to authenticated
using (
  deleted_at is null
  and public.is_tenant_member(tenant_id)
  and (
    visibility = 'patient_facing'
    or public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist'])
  )
);

create policy "tenant session users can create session notes"
on public.session_notes
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist']));

create policy "tenant session users can update session notes"
on public.session_notes
for update
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist'])
)
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist']));

create policy "tenant members can read session workflow events"
on public.session_workflow_events
for select
to authenticated
using (
  deleted_at is null
  and public.is_tenant_member(tenant_id)
);

create policy "tenant session users can create session workflow events"
on public.session_workflow_events
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist']));

create policy "tenant admins can update session workflow events"
on public.session_workflow_events
for update
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin'])
)
with check (public.has_tenant_role(tenant_id, array['admin']));

create or replace function public.validate_session_tenant_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  related_tenant_id uuid;
begin
  select b.tenant_id
  into related_tenant_id
  from public.bookings b
  where b.id = new.booking_id
    and b.deleted_at is null;

  if related_tenant_id is null or related_tenant_id <> new.tenant_id then
    raise exception 'Session booking must belong to the same tenant';
  end if;

  select p.tenant_id
  into related_tenant_id
  from public.patients p
  where p.id = new.patient_id
    and p.deleted_at is null;

  if related_tenant_id is null or related_tenant_id <> new.tenant_id then
    raise exception 'Session patient must belong to the same tenant';
  end if;

  if new.therapist_profile_id is not null then
    select tp.tenant_id
    into related_tenant_id
    from public.therapist_profiles tp
    where tp.id = new.therapist_profile_id
      and tp.deleted_at is null;

    if related_tenant_id is null or related_tenant_id <> new.tenant_id then
      raise exception 'Session therapist must belong to the same tenant';
    end if;
  end if;

  if new.practice_location_id is not null then
    select pl.tenant_id
    into related_tenant_id
    from public.practice_locations pl
    where pl.id = new.practice_location_id
      and pl.deleted_at is null;

    if related_tenant_id is null or related_tenant_id <> new.tenant_id then
      raise exception 'Session location must belong to the same tenant';
    end if;
  end if;

  return new;
end;
$$;

create trigger sessions_validate_tenant_integrity
before insert or update of tenant_id, booking_id, patient_id, therapist_profile_id, practice_location_id
on public.sessions
for each row execute function public.validate_session_tenant_integrity();

create or replace function public.validate_session_procedure_tenant_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  related_tenant_id uuid;
begin
  select s.tenant_id
  into related_tenant_id
  from public.sessions s
  where s.id = new.session_id
    and s.deleted_at is null;

  if related_tenant_id is null or related_tenant_id <> new.tenant_id then
    raise exception 'Session procedure session must belong to the same tenant';
  end if;

  if new.booking_procedure_id is not null then
    select bp.tenant_id
    into related_tenant_id
    from public.booking_procedures bp
    where bp.id = new.booking_procedure_id
      and bp.deleted_at is null;

    if related_tenant_id is null or related_tenant_id <> new.tenant_id then
      raise exception 'Session procedure booking line must belong to the same tenant';
    end if;
  end if;

  return new;
end;
$$;

create trigger session_procedures_validate_tenant_integrity
before insert or update of tenant_id, session_id, booking_procedure_id
on public.session_procedures
for each row execute function public.validate_session_procedure_tenant_integrity();

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

  if booking_record.booking_status in ('cancelled', 'no_show') then
    raise exception 'Cannot create a session from a cancelled or no-show booking';
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

create or replace function public.complete_session(
  target_session_id uuid,
  actual_start_at_input timestamptz,
  actual_end_at_input timestamptz,
  attendance_outcome_input text,
  session_outcome_input text,
  operational_summary_input text default null
)
returns table (
  session_id uuid,
  completed_session boolean,
  draft_invoice_requested boolean,
  session_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  session_record public.sessions%rowtype;
  duration_minutes integer;
  has_billable_procedure boolean;
begin
  select *
  into session_record
  from public.sessions
  where id = target_session_id
    and deleted_at is null
  for update;

  if session_record.id is null then
    raise exception 'Session not found';
  end if;

  if not public.has_tenant_role(session_record.tenant_id, array['admin', 'therapist']) then
    raise exception 'Not allowed to complete this session';
  end if;

  if session_record.session_status = 'completed' then
    session_id := session_record.id;
    completed_session := false;
    draft_invoice_requested := session_record.draft_invoice_request_status in ('requested', 'processed');
    session_status := session_record.session_status;
    return next;
    return;
  end if;

  if session_record.session_status in ('cancelled', 'no_show') then
    raise exception 'Cannot complete a cancelled or no-show session';
  end if;

  if actual_start_at_input is null or actual_end_at_input is null or actual_start_at_input >= actual_end_at_input then
    raise exception 'Actual start and end times are required and must be valid';
  end if;

  if attendance_outcome_input not in ('attended', 'partial_attendance') then
    raise exception 'Completed sessions require attended or partial attendance outcome';
  end if;

  if session_outcome_input not in ('completed_as_planned', 'completed_with_changes', 'follow_up_required', 'report_required', 'feedback_required', 'referred_on') then
    raise exception 'Invalid completion outcome';
  end if;

  select exists (
    select 1
    from public.session_procedures sp
    where sp.session_id = session_record.id
      and sp.deleted_at is null
      and sp.is_billable = true
  )
  into has_billable_procedure;

  if not has_billable_procedure then
    raise exception 'At least one active billable session procedure is required before completion';
  end if;

  duration_minutes := greatest(1, floor(extract(epoch from (actual_end_at_input - actual_start_at_input)) / 60)::integer);

  update public.sessions
  set
    session_status = 'completed',
    attendance_outcome = attendance_outcome_input,
    session_outcome = session_outcome_input,
    actual_start_at = actual_start_at_input,
    actual_end_at = actual_end_at_input,
    actual_duration_minutes = duration_minutes,
    operational_summary = operational_summary_input,
    completed_at = now(),
    completed_by_profile_id = auth.uid(),
    draft_invoice_requested_at = coalesce(draft_invoice_requested_at, now()),
    draft_invoice_request_status = case
      when draft_invoice_request_status = 'processed' then draft_invoice_request_status
      else 'requested'
    end,
    patient_history_ready = true,
    patient_link_update_ready = true,
    updated_by_profile_id = auth.uid()
  where id = session_record.id;

  insert into public.session_status_history (
    tenant_id,
    session_id,
    booking_id,
    patient_id,
    from_status,
    to_status,
    event_type,
    event_reason,
    actual_start_at,
    actual_end_at,
    is_patient_visible,
    created_by_profile_id
  )
  values (
    session_record.tenant_id,
    session_record.id,
    session_record.booking_id,
    session_record.patient_id,
    session_record.session_status,
    'completed',
    'session_completed',
    'Session completed',
    actual_start_at_input,
    actual_end_at_input,
    true,
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
  values
    (
      session_record.tenant_id,
      session_record.id,
      session_record.booking_id,
      session_record.patient_id,
      'session_completed',
      'session:' || session_record.id::text || ':session_completed:v1',
      jsonb_build_object('actual_start_at', actual_start_at_input, 'actual_end_at', actual_end_at_input),
      auth.uid()
    ),
    (
      session_record.tenant_id,
      session_record.id,
      session_record.booking_id,
      session_record.patient_id,
      'draft_invoice_requested',
      'session:' || session_record.id::text || ':draft_invoice_requested:v1',
      jsonb_build_object('source', 'session_completion'),
      auth.uid()
    ),
    (
      session_record.tenant_id,
      session_record.id,
      session_record.booking_id,
      session_record.patient_id,
      'patient_history_ready',
      'session:' || session_record.id::text || ':patient_history_ready:v1',
      jsonb_build_object('source', 'session_completion'),
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
    patient_visible_title,
    occurred_at,
    created_by_profile_id,
    metadata
  )
  values (
    session_record.tenant_id,
    session_record.patient_id,
    'session_completed',
    'Session completed',
    'A session was completed.',
    'sessions',
    session_record.id,
    true,
    'Session completed',
    now(),
    auth.uid(),
    jsonb_build_object('booking_id', session_record.booking_id)
  );

  update public.bookings
  set
    booking_status = 'completed',
    checked_in_at = coalesce(checked_in_at, actual_start_at_input),
    in_progress_at = coalesce(in_progress_at, actual_start_at_input),
    completed_at = coalesce(completed_at, now()),
    draft_invoice_ready = true,
    updated_by_profile_id = auth.uid()
  where id = session_record.booking_id
    and deleted_at is null
    and booking_status not in ('completed', 'cancelled', 'no_show');

  session_id := session_record.id;
  completed_session := true;
  draft_invoice_requested := true;
  session_status := 'completed';
  return next;
end;
$$;

create or replace function public.reopen_completed_session(
  target_session_id uuid,
  reopen_reason_input text
)
returns table (
  session_id uuid,
  reopened_session boolean,
  session_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  session_record public.sessions%rowtype;
begin
  select *
  into session_record
  from public.sessions
  where id = target_session_id
    and deleted_at is null
  for update;

  if session_record.id is null then
    raise exception 'Session not found';
  end if;

  if not public.has_tenant_role(session_record.tenant_id, array['admin', 'therapist']) then
    raise exception 'Not allowed to reopen this session';
  end if;

  if reopen_reason_input is null or btrim(reopen_reason_input) = '' then
    raise exception 'Reopen reason is required';
  end if;

  if session_record.session_status = 'reopened' then
    session_id := session_record.id;
    reopened_session := false;
    session_status := session_record.session_status;
    return next;
    return;
  end if;

  if session_record.session_status <> 'completed' then
    raise exception 'Only completed sessions can be reopened';
  end if;

  update public.sessions
  set
    session_status = 'reopened',
    reopened_at = now(),
    reopened_by_profile_id = auth.uid(),
    reopen_reason = reopen_reason_input,
    draft_invoice_request_status = case
      when draft_invoice_request_status in ('requested', 'processed') then 'stale_after_reopen'
      else draft_invoice_request_status
    end,
    updated_by_profile_id = auth.uid()
  where id = session_record.id;

  insert into public.session_status_history (
    tenant_id,
    session_id,
    booking_id,
    patient_id,
    from_status,
    to_status,
    event_type,
    event_reason,
    is_patient_visible,
    created_by_profile_id
  )
  values (
    session_record.tenant_id,
    session_record.id,
    session_record.booking_id,
    session_record.patient_id,
    session_record.session_status,
    'reopened',
    'session_reopened',
    reopen_reason_input,
    false,
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
    session_record.tenant_id,
    session_record.id,
    session_record.booking_id,
    session_record.patient_id,
    'session_reopened',
    'session:' || session_record.id::text || ':session_reopened:' || extract(epoch from now())::bigint::text,
    jsonb_build_object('reopen_reason', reopen_reason_input),
    auth.uid()
  );

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
    session_record.tenant_id,
    session_record.patient_id,
    'session_reopened',
    'Session reopened',
    'A completed session was reopened for correction.',
    'sessions',
    session_record.id,
    false,
    now(),
    auth.uid(),
    jsonb_build_object('booking_id', session_record.booking_id)
  );

  session_id := session_record.id;
  reopened_session := true;
  session_status := 'reopened';
  return next;
end;
$$;

revoke all on function public.validate_session_tenant_integrity() from public, anon, authenticated;
revoke all on function public.validate_session_procedure_tenant_integrity() from public, anon, authenticated;
revoke all on function public.create_session_from_booking(uuid) from public, anon;
revoke all on function public.complete_session(uuid, timestamptz, timestamptz, text, text, text) from public, anon;
revoke all on function public.reopen_completed_session(uuid, text) from public, anon;

grant execute on function public.create_session_from_booking(uuid) to authenticated;
grant execute on function public.complete_session(uuid, timestamptz, timestamptz, text, text, text) to authenticated;
grant execute on function public.reopen_completed_session(uuid, text) to authenticated;

revoke all on public.sessions from anon, authenticated;
revoke all on public.session_procedures from anon, authenticated;
revoke all on public.session_status_history from anon, authenticated;
revoke all on public.session_notes from anon, authenticated;
revoke all on public.session_workflow_events from anon, authenticated;

grant select, insert, update on public.sessions to authenticated;
grant select, insert, update on public.session_procedures to authenticated;
grant select, insert, update on public.session_status_history to authenticated;
grant select, insert, update on public.session_notes to authenticated;
grant select, insert, update on public.session_workflow_events to authenticated;

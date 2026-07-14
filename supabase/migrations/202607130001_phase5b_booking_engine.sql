-- AlliDesk Phase 5B: Booking Engine database foundation.
-- Scope: bookings, booking_procedures, booking_status_history,
-- booking_recurrence_rules, booking_occurrence_exceptions,
-- booking_notes, and booking_workflow_events.
--
-- This migration intentionally does not create sessions, clinical notes,
-- invoices, statements, payments, documents, external calendar sync,
-- communication sending, or workflow automation execution.
--
-- Architecture notes:
-- - A booking is the operational starting point for patient, session,
--   finance, Patient Link, and workflow readiness.
-- - Procedure and price details are snapshotted on booking_procedures so
--   historical bookings do not change when practice price lists change.
-- - Complex status transition rules, conflict checks, and recurrence
--   expansion remain application/RPC responsibilities for now. This
--   foundation provides constraints, indexes, history, and event surfaces.

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete restrict,
  therapist_profile_id uuid references public.therapist_profiles(id) on delete set null,
  practice_location_id uuid references public.practice_locations(id) on delete set null,
  price_list_id uuid references public.price_lists(id) on delete set null,
  recurrence_rule_id uuid,
  booking_status text not null default 'draft',
  booking_type text not null default 'standard',
  booking_source text not null default 'internal',
  appointment_mode text not null default 'in_person',
  start_at timestamptz,
  end_at timestamptz,
  duration_minutes integer,
  timezone text not null default 'Africa/Johannesburg',
  room_label text,
  patient_facing_title text,
  patient_facing_notes text,
  cancellation_reason text,
  cancelled_at timestamptz,
  no_show_at timestamptz,
  checked_in_at timestamptz,
  in_progress_at timestamptz,
  completed_at timestamptz,
  rescheduled_from_booking_id uuid references public.bookings(id) on delete set null,
  session_ready boolean not null default false,
  draft_invoice_ready boolean not null default false,
  patient_link_visible boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_status_check
    check (booking_status in ('draft', 'scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled')),
  constraint bookings_type_check
    check (booking_type in ('standard', 'assessment', 'review', 'group', 'admin', 'other')),
  constraint bookings_source_check
    check (booking_source in ('internal', 'patient_link', 'phone', 'email', 'imported', 'external_calendar')),
  constraint bookings_appointment_mode_check
    check (appointment_mode in ('in_person', 'telehealth', 'home_visit', 'school_visit', 'other')),
  constraint bookings_time_order_check
    check (start_at is null or end_at is null or start_at < end_at),
  constraint bookings_duration_check
    check (duration_minutes is null or duration_minutes > 0),
  constraint bookings_scheduled_time_check
    check (
      booking_status = 'draft'
      or (start_at is not null and end_at is not null and duration_minutes is not null)
    ),
  constraint bookings_cancelled_state_check
    check (
      (booking_status = 'cancelled' and cancelled_at is not null and cancellation_reason is not null and btrim(cancellation_reason) <> '')
      or booking_status <> 'cancelled'
    ),
  constraint bookings_no_show_state_check
    check (
      (booking_status = 'no_show' and no_show_at is not null)
      or booking_status <> 'no_show'
    ),
  constraint bookings_checked_in_state_check
    check (
      (booking_status in ('checked_in', 'in_progress', 'completed') and checked_in_at is not null)
      or booking_status not in ('checked_in', 'in_progress', 'completed')
    ),
  constraint bookings_in_progress_state_check
    check (
      (booking_status in ('in_progress', 'completed') and in_progress_at is not null)
      or booking_status not in ('in_progress', 'completed')
    ),
  constraint bookings_completed_state_check
    check (
      (booking_status = 'completed' and completed_at is not null)
      or booking_status <> 'completed'
    )
);

create table public.booking_procedures (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
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
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_procedures_name_not_blank_check
    check (btrim(procedure_name) <> ''),
  constraint booking_procedures_code_not_blank_check
    check (procedure_code is null or btrim(procedure_code) <> ''),
  constraint booking_procedures_unit_price_check
    check (unit_price >= 0),
  constraint booking_procedures_quantity_check
    check (quantity > 0),
  constraint booking_procedures_discount_check
    check (discount_amount >= 0),
  constraint booking_procedures_duration_check
    check (duration_minutes is null or duration_minutes > 0),
  constraint booking_procedures_currency_code_check
    check (char_length(currency_code) = 3),
  constraint booking_procedures_line_total_check
    check (line_total >= 0)
);

create table public.booking_status_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  from_status text,
  to_status text not null,
  event_type text not null,
  event_reason text,
  old_start_at timestamptz,
  old_end_at timestamptz,
  new_start_at timestamptz,
  new_end_at timestamptz,
  is_patient_visible boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_status_history_from_status_check
    check (from_status is null or from_status in ('draft', 'scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled')),
  constraint booking_status_history_to_status_check
    check (to_status in ('draft', 'scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled')),
  constraint booking_status_history_event_type_check
    check (event_type in ('booking_created', 'status_changed', 'booking_confirmed', 'booking_rescheduled', 'booking_cancelled', 'patient_checked_in', 'session_started', 'booking_completed', 'no_show_recorded', 'admin_correction')),
  constraint booking_status_history_event_type_not_blank_check
    check (btrim(event_type) <> '')
);

create table public.booking_recurrence_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  series_booking_id uuid not null references public.bookings(id) on delete cascade,
  recurrence_status text not null default 'active',
  rrule text not null,
  starts_on date not null,
  ends_on date,
  timezone text not null default 'Africa/Johannesburg',
  edit_scope text,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_recurrence_rules_status_check
    check (recurrence_status in ('active', 'paused', 'completed', 'cancelled')),
  constraint booking_recurrence_rules_rrule_not_blank_check
    check (btrim(rrule) <> ''),
  constraint booking_recurrence_rules_date_order_check
    check (ends_on is null or starts_on <= ends_on),
  constraint booking_recurrence_rules_edit_scope_check
    check (edit_scope is null or edit_scope in ('one_occurrence', 'future_occurrences', 'entire_series'))
);

alter table public.bookings
  add constraint bookings_recurrence_rule_id_fkey
  foreign key (recurrence_rule_id)
  references public.booking_recurrence_rules(id)
  on delete set null;

create table public.booking_occurrence_exceptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  recurrence_rule_id uuid not null references public.booking_recurrence_rules(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  original_start_at timestamptz not null,
  original_end_at timestamptz,
  exception_type text not null,
  new_start_at timestamptz,
  new_end_at timestamptz,
  cancellation_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_occurrence_exceptions_type_check
    check (exception_type in ('cancelled', 'rescheduled', 'modified', 'skipped')),
  constraint booking_occurrence_exceptions_time_order_check
    check (new_start_at is null or new_end_at is null or new_start_at < new_end_at),
  constraint booking_occurrence_exceptions_rescheduled_time_check
    check (
      exception_type <> 'rescheduled'
      or (new_start_at is not null and new_end_at is not null)
    )
);

create table public.booking_notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  note_type text not null default 'internal_admin',
  title text,
  body text not null,
  is_patient_visible boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_notes_type_check
    check (note_type in ('internal_admin', 'patient_facing', 'reschedule', 'cancellation', 'no_show', 'other')),
  constraint booking_notes_body_not_blank_check
    check (btrim(body) <> '')
);

create table public.booking_workflow_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
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
  constraint booking_workflow_events_type_check
    check (event_type in ('booking_created', 'booking_confirmed', 'booking_rescheduled', 'booking_cancelled', 'patient_checked_in', 'session_started', 'booking_completed', 'no_show_recorded', 'draft_invoice_ready', 'patient_link_update_ready', 'communication_ready')),
  constraint booking_workflow_events_status_check
    check (event_status in ('pending', 'processing', 'processed', 'failed', 'ignored')),
  constraint booking_workflow_events_idempotency_not_blank_check
    check (btrim(idempotency_key) <> '')
);

create trigger bookings_set_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

create trigger booking_procedures_set_updated_at
before update on public.booking_procedures
for each row execute function public.set_updated_at();

create trigger booking_status_history_set_updated_at
before update on public.booking_status_history
for each row execute function public.set_updated_at();

create trigger booking_recurrence_rules_set_updated_at
before update on public.booking_recurrence_rules
for each row execute function public.set_updated_at();

create trigger booking_occurrence_exceptions_set_updated_at
before update on public.booking_occurrence_exceptions
for each row execute function public.set_updated_at();

create trigger booking_notes_set_updated_at
before update on public.booking_notes
for each row execute function public.set_updated_at();

create trigger booking_workflow_events_set_updated_at
before update on public.booking_workflow_events
for each row execute function public.set_updated_at();

create index bookings_tenant_id_idx
  on public.bookings (tenant_id)
  where deleted_at is null;

create index bookings_calendar_range_idx
  on public.bookings (tenant_id, start_at, end_at)
  where deleted_at is null and start_at is not null and end_at is not null;

create index bookings_therapist_calendar_idx
  on public.bookings (tenant_id, therapist_profile_id, start_at)
  where deleted_at is null and therapist_profile_id is not null and start_at is not null;

create index bookings_location_calendar_idx
  on public.bookings (tenant_id, practice_location_id, start_at)
  where deleted_at is null and practice_location_id is not null and start_at is not null;

create index bookings_patient_calendar_idx
  on public.bookings (tenant_id, patient_id, start_at)
  where deleted_at is null and start_at is not null;

create index bookings_status_calendar_idx
  on public.bookings (tenant_id, booking_status, start_at)
  where deleted_at is null;

create index bookings_active_therapist_overlap_idx
  on public.bookings (tenant_id, therapist_profile_id, start_at, end_at)
  where deleted_at is null
    and therapist_profile_id is not null
    and start_at is not null
    and end_at is not null
    and booking_status in ('scheduled', 'confirmed', 'checked_in', 'in_progress');

create index bookings_recurrence_rule_idx
  on public.bookings (recurrence_rule_id)
  where recurrence_rule_id is not null and deleted_at is null;

create index booking_procedures_tenant_id_idx
  on public.booking_procedures (tenant_id)
  where deleted_at is null;

create index booking_procedures_booking_id_idx
  on public.booking_procedures (booking_id)
  where deleted_at is null;

create index booking_procedures_price_list_item_idx
  on public.booking_procedures (price_list_item_id)
  where price_list_item_id is not null and deleted_at is null;

create index booking_status_history_booking_id_idx
  on public.booking_status_history (booking_id, created_at desc)
  where deleted_at is null;

create index booking_status_history_tenant_event_idx
  on public.booking_status_history (tenant_id, event_type, created_at desc)
  where deleted_at is null;

create index booking_recurrence_rules_tenant_id_idx
  on public.booking_recurrence_rules (tenant_id)
  where deleted_at is null;

create index booking_recurrence_rules_series_booking_idx
  on public.booking_recurrence_rules (series_booking_id)
  where deleted_at is null;

create index booking_recurrence_rules_status_idx
  on public.booking_recurrence_rules (tenant_id, recurrence_status)
  where deleted_at is null;

create index booking_occurrence_exceptions_rule_idx
  on public.booking_occurrence_exceptions (recurrence_rule_id, original_start_at)
  where deleted_at is null;

create index booking_occurrence_exceptions_booking_idx
  on public.booking_occurrence_exceptions (booking_id)
  where booking_id is not null and deleted_at is null;

create unique index booking_occurrence_exceptions_one_per_occurrence_idx
  on public.booking_occurrence_exceptions (recurrence_rule_id, original_start_at)
  where deleted_at is null;

create index booking_notes_booking_id_idx
  on public.booking_notes (booking_id, created_at desc)
  where deleted_at is null;

create index booking_notes_patient_visible_idx
  on public.booking_notes (tenant_id, booking_id, is_patient_visible)
  where deleted_at is null;

create index booking_workflow_events_booking_id_idx
  on public.booking_workflow_events (booking_id, created_at desc)
  where deleted_at is null;

create index booking_workflow_events_status_idx
  on public.booking_workflow_events (tenant_id, event_status, created_at)
  where deleted_at is null;

create unique index booking_workflow_events_idempotency_idx
  on public.booking_workflow_events (tenant_id, idempotency_key)
  where deleted_at is null;

alter table public.bookings enable row level security;
alter table public.booking_procedures enable row level security;
alter table public.booking_status_history enable row level security;
alter table public.booking_recurrence_rules enable row level security;
alter table public.booking_occurrence_exceptions enable row level security;
alter table public.booking_notes enable row level security;
alter table public.booking_workflow_events enable row level security;

create policy "tenant members can read bookings"
on public.bookings
for select
to authenticated
using (
  deleted_at is null
  and public.is_tenant_member(tenant_id)
);

create policy "tenant booking users can create bookings"
on public.bookings
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist']));

create policy "tenant booking users can update bookings"
on public.bookings
for update
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist'])
)
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist']));

create policy "tenant members can read booking procedures"
on public.booking_procedures
for select
to authenticated
using (
  deleted_at is null
  and public.is_tenant_member(tenant_id)
);

create policy "tenant booking users can create booking procedures"
on public.booking_procedures
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist']));

create policy "tenant booking users can update booking procedures"
on public.booking_procedures
for update
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist'])
)
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist']));

create policy "tenant members can read booking status history"
on public.booking_status_history
for select
to authenticated
using (
  deleted_at is null
  and public.is_tenant_member(tenant_id)
);

create policy "tenant booking users can create booking status history"
on public.booking_status_history
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist']));

create policy "tenant admins can update booking status history"
on public.booking_status_history
for update
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin'])
)
with check (public.has_tenant_role(tenant_id, array['admin']));

create policy "tenant members can read booking recurrence rules"
on public.booking_recurrence_rules
for select
to authenticated
using (
  deleted_at is null
  and public.is_tenant_member(tenant_id)
);

create policy "tenant booking users can create booking recurrence rules"
on public.booking_recurrence_rules
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist']));

create policy "tenant booking users can update booking recurrence rules"
on public.booking_recurrence_rules
for update
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist'])
)
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist']));

create policy "tenant members can read booking occurrence exceptions"
on public.booking_occurrence_exceptions
for select
to authenticated
using (
  deleted_at is null
  and public.is_tenant_member(tenant_id)
);

create policy "tenant booking users can create booking occurrence exceptions"
on public.booking_occurrence_exceptions
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist']));

create policy "tenant booking users can update booking occurrence exceptions"
on public.booking_occurrence_exceptions
for update
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist'])
)
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist']));

create policy "tenant members can read permitted booking notes"
on public.booking_notes
for select
to authenticated
using (
  deleted_at is null
  and public.is_tenant_member(tenant_id)
  and (
    is_patient_visible = true
    or public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist'])
  )
);

create policy "tenant booking users can create booking notes"
on public.booking_notes
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist']));

create policy "tenant booking users can update booking notes"
on public.booking_notes
for update
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist'])
)
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist']));

create policy "tenant members can read booking workflow events"
on public.booking_workflow_events
for select
to authenticated
using (
  deleted_at is null
  and public.is_tenant_member(tenant_id)
);

create policy "tenant booking users can create booking workflow events"
on public.booking_workflow_events
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'receptionist', 'therapist']));

create policy "tenant admins can update booking workflow events"
on public.booking_workflow_events
for update
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin'])
)
with check (public.has_tenant_role(tenant_id, array['admin']));

revoke all on public.bookings from anon, authenticated;
revoke all on public.booking_procedures from anon, authenticated;
revoke all on public.booking_status_history from anon, authenticated;
revoke all on public.booking_recurrence_rules from anon, authenticated;
revoke all on public.booking_occurrence_exceptions from anon, authenticated;
revoke all on public.booking_notes from anon, authenticated;
revoke all on public.booking_workflow_events from anon, authenticated;

grant select, insert, update on public.bookings to authenticated;
grant select, insert, update on public.booking_procedures to authenticated;
grant select, insert, update on public.booking_status_history to authenticated;
grant select, insert, update on public.booking_recurrence_rules to authenticated;
grant select, insert, update on public.booking_occurrence_exceptions to authenticated;
grant select, insert, update on public.booking_notes to authenticated;
grant select, insert, update on public.booking_workflow_events to authenticated;

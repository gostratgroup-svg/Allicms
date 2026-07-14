-- AlliDesk Phase 5D: Draft Invoice Engine database foundation.
--
-- Scope: invoices, invoice lines, invoice snapshots, invoice status/workflow
-- events, invoice number sequences, deterministic total calculations, and
-- RPCs for idempotent draft creation and transactional confirmation.
--
-- This migration intentionally does not create payments, statements, credit
-- notes, medical aid claim submissions, PDF generation, communication
-- delivery, or Patient Link authentication.

create table public.invoice_number_sequences (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  sequence_key text not null default 'default',
  prefix text not null default 'INV',
  suffix text,
  next_number integer not null default 1,
  padding_length integer not null default 4,
  reset_strategy text not null default 'never',
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoice_number_sequences_key_not_blank_check check (btrim(sequence_key) <> ''),
  constraint invoice_number_sequences_prefix_not_blank_check check (btrim(prefix) <> ''),
  constraint invoice_number_sequences_next_number_check check (next_number > 0),
  constraint invoice_number_sequences_padding_check check (padding_length between 1 and 12),
  constraint invoice_number_sequences_reset_strategy_check check (reset_strategy in ('never', 'calendar_year', 'financial_year'))
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  responsible_party_id uuid references public.responsible_parties(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  therapist_profile_id uuid references public.therapist_profiles(id) on delete set null,
  practice_location_id uuid references public.practice_locations(id) on delete set null,
  source_workflow_event_id uuid references public.session_workflow_events(id) on delete set null,
  source_type text not null default 'session',
  invoice_status text not null default 'draft',
  draft_reference text not null,
  invoice_number text,
  invoice_prefix text,
  invoice_sequence_number integer,
  invoice_sequence_key text,
  invoice_date date not null default current_date,
  service_date date,
  due_date date,
  payment_terms_days integer not null default 7,
  currency_code text not null default 'ZAR',
  subtotal_amount numeric(12, 2) not null default 0,
  discount_total numeric(12, 2) not null default 0,
  adjustment_total numeric(12, 2) not null default 0,
  taxable_amount numeric(12, 2) not null default 0,
  tax_total numeric(12, 2) not null default 0,
  rounding_adjustment numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  amount_paid numeric(12, 2) not null default 0,
  balance_due numeric(12, 2) not null default 0,
  draft_created_at timestamptz not null default now(),
  review_required_at timestamptz,
  review_required_reason text,
  ready_to_confirm_at timestamptz,
  confirmed_at timestamptz,
  confirmed_by_profile_id uuid references public.profiles(id) on delete set null,
  cancelled_at timestamptz,
  cancelled_by_profile_id uuid references public.profiles(id) on delete set null,
  cancellation_reason text,
  voided_at timestamptz,
  voided_by_profile_id uuid references public.profiles(id) on delete set null,
  void_reason text,
  differs_from_source boolean not null default false,
  manually_edited boolean not null default false,
  manual_edit_reason text,
  reconciliation_required boolean not null default false,
  reconciliation_reason text,
  session_reopened_at timestamptz,
  patient_link_visible boolean not null default false,
  patient_link_update_ready boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoices_source_type_check check (source_type in ('session', 'manual', 'adjustment')),
  constraint invoices_status_check check (invoice_status in ('draft', 'review_required', 'ready_to_confirm', 'confirmed', 'issued', 'awaiting_payment', 'partially_paid', 'paid', 'overdue', 'cancelled', 'voided', 'written_off')),
  constraint invoices_draft_reference_not_blank_check check (btrim(draft_reference) <> ''),
  constraint invoices_currency_code_check check (char_length(currency_code) = 3),
  constraint invoices_payment_terms_check check (payment_terms_days between 0 and 365),
  constraint invoices_totals_non_negative_check check (
    subtotal_amount >= 0
    and discount_total >= 0
    and adjustment_total >= 0
    and tax_total >= 0
    and total_amount >= 0
    and amount_paid >= 0
    and balance_due >= 0
  ),
  constraint invoices_sequence_number_check check (invoice_sequence_number is null or invoice_sequence_number > 0),
  constraint invoices_confirmed_state_check check (
    (
      invoice_status in ('confirmed', 'issued', 'awaiting_payment', 'partially_paid', 'paid', 'overdue', 'written_off')
      and confirmed_at is not null
      and invoice_number is not null
      and invoice_sequence_number is not null
    )
    or invoice_status not in ('confirmed', 'issued', 'awaiting_payment', 'partially_paid', 'paid', 'overdue', 'written_off')
  ),
  constraint invoices_cancelled_state_check check (
    (
      invoice_status = 'cancelled'
      and cancelled_at is not null
      and cancellation_reason is not null
      and btrim(cancellation_reason) <> ''
    )
    or invoice_status <> 'cancelled'
  ),
  constraint invoices_voided_state_check check (
    (
      invoice_status = 'voided'
      and voided_at is not null
      and void_reason is not null
      and btrim(void_reason) <> ''
    )
    or invoice_status <> 'voided'
  )
);

create table public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  source_session_procedure_id uuid references public.session_procedures(id) on delete set null,
  source_booking_procedure_id uuid references public.booking_procedures(id) on delete set null,
  source_price_list_item_id uuid references public.price_list_items(id) on delete set null,
  therapist_profile_id uuid references public.therapist_profiles(id) on delete set null,
  practice_location_id uuid references public.practice_locations(id) on delete set null,
  line_type text not null default 'session_procedure',
  line_order integer not null default 1,
  service_date date,
  procedure_name text not null,
  procedure_code text,
  description text,
  icd10_code text,
  quantity numeric(10, 2) not null default 1,
  unit_price numeric(12, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  adjustment_amount numeric(12, 2) not null default 0,
  tax_rate numeric(5, 2) not null default 0,
  tax_amount numeric(12, 2) not null default 0,
  line_subtotal numeric(12, 2) not null default 0,
  line_total numeric(12, 2) not null default 0,
  currency_code text not null default 'ZAR',
  differs_from_source boolean not null default false,
  change_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoice_lines_type_check check (line_type in ('session_procedure', 'manual', 'adjustment', 'informational')),
  constraint invoice_lines_order_check check (line_order > 0),
  constraint invoice_lines_name_not_blank_check check (btrim(procedure_name) <> ''),
  constraint invoice_lines_quantity_check check (quantity > 0),
  constraint invoice_lines_unit_price_check check (unit_price >= 0),
  constraint invoice_lines_discount_check check (discount_amount >= 0),
  constraint invoice_lines_adjustment_check check (adjustment_amount >= 0),
  constraint invoice_lines_tax_rate_check check (tax_rate >= 0),
  constraint invoice_lines_tax_amount_check check (tax_amount >= 0),
  constraint invoice_lines_totals_check check (line_subtotal >= 0 and line_total >= 0),
  constraint invoice_lines_currency_code_check check (char_length(currency_code) = 3),
  constraint invoice_lines_change_reason_check check (
    differs_from_source = false
    or (change_reason is not null and btrim(change_reason) <> '')
  )
);

create table public.invoice_party_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  patient_id uuid references public.patients(id) on delete set null,
  responsible_party_id uuid references public.responsible_parties(id) on delete set null,
  patient_full_name text not null,
  patient_number text,
  patient_date_of_birth date,
  patient_id_number text,
  patient_icd10_code text,
  responsible_party_name text,
  responsible_party_type text,
  relationship_to_patient text,
  responsible_party_id_number text,
  billing_email text,
  billing_phone text,
  billing_address jsonb not null default '{}'::jsonb,
  organisation_name text,
  medical_aid_context jsonb not null default '{}'::jsonb,
  snapshot jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoice_party_snapshots_patient_name_not_blank_check check (btrim(patient_full_name) <> '')
);

create table public.invoice_issuer_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  practice_profile_id uuid references public.practice_profiles(id) on delete set null,
  therapist_profile_id uuid references public.therapist_profiles(id) on delete set null,
  practice_location_id uuid references public.practice_locations(id) on delete set null,
  bank_account_id uuid references public.bank_accounts(id) on delete set null,
  practice_legal_name text,
  practice_trading_name text,
  practice_registration_number text,
  practice_tax_number text,
  practice_vat_number text,
  practice_email text,
  practice_phone text,
  practice_website text,
  practice_address jsonb not null default '{}'::jsonb,
  therapist_name text,
  therapist_profession text,
  therapist_practice_number text,
  therapist_registration jsonb not null default '{}'::jsonb,
  location_name text,
  location_address jsonb not null default '{}'::jsonb,
  bank_account_holder text,
  bank_name text,
  bank_account_number text,
  bank_branch_code text,
  bank_account_type text,
  branding jsonb not null default '{}'::jsonb,
  payment_instructions text,
  invoice_footer text,
  currency_code text not null default 'ZAR',
  payment_terms_days integer not null default 7,
  snapshot jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoice_issuer_snapshots_currency_code_check check (char_length(currency_code) = 3),
  constraint invoice_issuer_snapshots_payment_terms_check check (payment_terms_days between 0 and 365)
);

create table public.invoice_status_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  session_id uuid references public.sessions(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  patient_id uuid references public.patients(id) on delete set null,
  from_status text,
  to_status text not null,
  event_type text not null,
  event_reason text,
  is_patient_visible boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoice_status_history_from_status_check check (from_status is null or from_status in ('draft', 'review_required', 'ready_to_confirm', 'confirmed', 'issued', 'awaiting_payment', 'partially_paid', 'paid', 'overdue', 'cancelled', 'voided', 'written_off')),
  constraint invoice_status_history_to_status_check check (to_status in ('draft', 'review_required', 'ready_to_confirm', 'confirmed', 'issued', 'awaiting_payment', 'partially_paid', 'paid', 'overdue', 'cancelled', 'voided', 'written_off')),
  constraint invoice_status_history_event_type_check check (event_type in ('draft_invoice_requested', 'draft_invoice_created', 'draft_invoice_updated', 'draft_invoice_review_required', 'invoice_ready_to_confirm', 'invoice_number_allocated', 'invoice_confirmed', 'draft_invoice_cancelled', 'invoice_reconciliation_required', 'invoice_issued', 'invoice_voided', 'invoice_written_off'))
);

create table public.invoice_workflow_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  session_id uuid references public.sessions(id) on delete set null,
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
  constraint invoice_workflow_events_type_check check (event_type in ('draft_invoice_requested', 'draft_invoice_created', 'draft_invoice_updated', 'draft_invoice_review_required', 'invoice_ready_to_confirm', 'invoice_number_allocated', 'invoice_confirmed', 'draft_invoice_cancelled', 'invoice_reconciliation_required', 'patient_link_update_ready', 'communication_ready', 'pdf_generation_ready')),
  constraint invoice_workflow_events_status_check check (event_status in ('pending', 'processing', 'processed', 'failed', 'ignored')),
  constraint invoice_workflow_events_idempotency_not_blank_check check (btrim(idempotency_key) <> '')
);

create trigger invoice_number_sequences_set_updated_at
before update on public.invoice_number_sequences
for each row execute function public.set_updated_at();

create trigger invoices_set_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

create trigger invoice_lines_set_updated_at
before update on public.invoice_lines
for each row execute function public.set_updated_at();

create trigger invoice_party_snapshots_set_updated_at
before update on public.invoice_party_snapshots
for each row execute function public.set_updated_at();

create trigger invoice_issuer_snapshots_set_updated_at
before update on public.invoice_issuer_snapshots
for each row execute function public.set_updated_at();

create trigger invoice_status_history_set_updated_at
before update on public.invoice_status_history
for each row execute function public.set_updated_at();

create trigger invoice_workflow_events_set_updated_at
before update on public.invoice_workflow_events
for each row execute function public.set_updated_at();

create unique index invoice_number_sequences_unique_key_idx
  on public.invoice_number_sequences (tenant_id, sequence_key)
  where deleted_at is null;

create index invoice_number_sequences_active_idx
  on public.invoice_number_sequences (tenant_id, is_active)
  where deleted_at is null;

create index invoices_tenant_status_idx
  on public.invoices (tenant_id, invoice_status, invoice_date)
  where deleted_at is null;

create index invoices_patient_date_idx
  on public.invoices (tenant_id, patient_id, invoice_date desc)
  where deleted_at is null;

create index invoices_responsible_party_date_idx
  on public.invoices (tenant_id, responsible_party_id, invoice_date desc)
  where responsible_party_id is not null and deleted_at is null;

create index invoices_session_id_idx
  on public.invoices (session_id)
  where session_id is not null and deleted_at is null;

create unique index invoices_one_primary_session_invoice_idx
  on public.invoices (tenant_id, session_id)
  where deleted_at is null and session_id is not null and source_type = 'session' and invoice_status not in ('cancelled', 'voided');

create unique index invoices_unique_number_per_tenant_idx
  on public.invoices (tenant_id, invoice_number)
  where deleted_at is null and invoice_number is not null;

create index invoices_due_date_idx
  on public.invoices (tenant_id, due_date, invoice_status)
  where deleted_at is null and due_date is not null;

create index invoices_reconciliation_idx
  on public.invoices (tenant_id, reconciliation_required, updated_at desc)
  where deleted_at is null and reconciliation_required = true;

create index invoice_lines_invoice_id_idx
  on public.invoice_lines (invoice_id, line_order)
  where deleted_at is null;

create index invoice_lines_tenant_id_idx
  on public.invoice_lines (tenant_id)
  where deleted_at is null;

create index invoice_lines_session_procedure_idx
  on public.invoice_lines (source_session_procedure_id)
  where source_session_procedure_id is not null and deleted_at is null;

create unique index invoice_lines_unique_source_session_procedure_idx
  on public.invoice_lines (invoice_id, source_session_procedure_id)
  where source_session_procedure_id is not null and deleted_at is null;

create unique index invoice_party_snapshots_one_per_invoice_idx
  on public.invoice_party_snapshots (invoice_id)
  where deleted_at is null;

create unique index invoice_issuer_snapshots_one_per_invoice_idx
  on public.invoice_issuer_snapshots (invoice_id)
  where deleted_at is null;

create index invoice_status_history_invoice_id_idx
  on public.invoice_status_history (invoice_id, created_at desc)
  where deleted_at is null;

create index invoice_status_history_tenant_event_idx
  on public.invoice_status_history (tenant_id, event_type, created_at desc)
  where deleted_at is null;

create index invoice_workflow_events_invoice_id_idx
  on public.invoice_workflow_events (invoice_id, created_at desc)
  where deleted_at is null;

create index invoice_workflow_events_status_idx
  on public.invoice_workflow_events (tenant_id, event_status, created_at)
  where deleted_at is null;

create unique index invoice_workflow_events_idempotency_idx
  on public.invoice_workflow_events (tenant_id, idempotency_key)
  where deleted_at is null;

alter table public.invoice_number_sequences enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;
alter table public.invoice_party_snapshots enable row level security;
alter table public.invoice_issuer_snapshots enable row level security;
alter table public.invoice_status_history enable row level security;
alter table public.invoice_workflow_events enable row level security;

create policy "tenant finance users can read invoice sequences"
on public.invoice_number_sequences
for select
to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can create invoice sequences"
on public.invoice_number_sequences
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can update invoice sequences"
on public.invoice_number_sequences
for update
to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin', 'finance']))
with check (public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can read invoices"
on public.invoices
for select
to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can create invoices"
on public.invoices
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can update invoices"
on public.invoices
for update
to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin', 'finance']))
with check (public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can read invoice lines"
on public.invoice_lines
for select
to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can create invoice lines"
on public.invoice_lines
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can update invoice lines"
on public.invoice_lines
for update
to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin', 'finance']))
with check (public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can read invoice party snapshots"
on public.invoice_party_snapshots
for select
to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can create invoice party snapshots"
on public.invoice_party_snapshots
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can update invoice party snapshots"
on public.invoice_party_snapshots
for update
to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin', 'finance']))
with check (public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can read invoice issuer snapshots"
on public.invoice_issuer_snapshots
for select
to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can create invoice issuer snapshots"
on public.invoice_issuer_snapshots
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can update invoice issuer snapshots"
on public.invoice_issuer_snapshots
for update
to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin', 'finance']))
with check (public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can read invoice status history"
on public.invoice_status_history
for select
to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can create invoice status history"
on public.invoice_status_history
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant admins can update invoice status history"
on public.invoice_status_history
for update
to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin']))
with check (public.has_tenant_role(tenant_id, array['admin']));

create policy "tenant finance users can read invoice workflow events"
on public.invoice_workflow_events
for select
to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can create invoice workflow events"
on public.invoice_workflow_events
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant admins can update invoice workflow events"
on public.invoice_workflow_events
for update
to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin']))
with check (public.has_tenant_role(tenant_id, array['admin']));

create or replace function public.calculate_invoice_line_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.line_subtotal := round((new.quantity * new.unit_price)::numeric, 2);
  new.tax_amount := round((((new.line_subtotal - new.discount_amount + new.adjustment_amount) * new.tax_rate) / 100)::numeric, 2);
  new.line_total := round((new.line_subtotal - new.discount_amount + new.adjustment_amount + new.tax_amount)::numeric, 2);

  if new.line_total < 0 then
    raise exception 'Invoice line total cannot be negative';
  end if;

  return new;
end;
$$;

create trigger invoice_lines_calculate_totals
before insert or update of quantity, unit_price, discount_amount, adjustment_amount, tax_rate
on public.invoice_lines
for each row execute function public.calculate_invoice_line_totals();

create or replace function public.recalculate_invoice_totals(target_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  totals record;
begin
  select
    coalesce(sum(line_subtotal), 0)::numeric(12, 2) as subtotal_amount,
    coalesce(sum(discount_amount), 0)::numeric(12, 2) as discount_total,
    coalesce(sum(adjustment_amount), 0)::numeric(12, 2) as adjustment_total,
    coalesce(sum(line_subtotal - discount_amount + adjustment_amount), 0)::numeric(12, 2) as taxable_amount,
    coalesce(sum(tax_amount), 0)::numeric(12, 2) as tax_total,
    coalesce(sum(line_total), 0)::numeric(12, 2) as line_total
  into totals
  from public.invoice_lines
  where invoice_id = target_invoice_id
    and deleted_at is null;

  update public.invoices
  set
    subtotal_amount = totals.subtotal_amount,
    discount_total = totals.discount_total,
    adjustment_total = totals.adjustment_total,
    taxable_amount = totals.taxable_amount,
    tax_total = totals.tax_total,
    total_amount = round((totals.line_total + rounding_adjustment)::numeric, 2),
    balance_due = greatest(0, round((totals.line_total + rounding_adjustment - amount_paid)::numeric, 2))
  where id = target_invoice_id
    and deleted_at is null;
end;
$$;

create or replace function public.recalculate_invoice_after_line_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recalculate_invoice_totals(coalesce(new.invoice_id, old.invoice_id));
  return new;
end;
$$;

create trigger invoice_lines_recalculate_invoice_totals
after insert or update on public.invoice_lines
for each row execute function public.recalculate_invoice_after_line_change();

create or replace function public.validate_invoice_tenant_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  related_tenant_id uuid;
begin
  select p.tenant_id into related_tenant_id from public.patients p where p.id = new.patient_id and p.deleted_at is null;
  if related_tenant_id is null or related_tenant_id <> new.tenant_id then
    raise exception 'Invoice patient must belong to the same tenant';
  end if;

  if new.responsible_party_id is not null then
    select rp.tenant_id into related_tenant_id from public.responsible_parties rp where rp.id = new.responsible_party_id and rp.deleted_at is null;
    if related_tenant_id is null or related_tenant_id <> new.tenant_id then
      raise exception 'Invoice responsible party must belong to the same tenant';
    end if;
  end if;

  if new.booking_id is not null then
    select b.tenant_id into related_tenant_id from public.bookings b where b.id = new.booking_id and b.deleted_at is null;
    if related_tenant_id is null or related_tenant_id <> new.tenant_id then
      raise exception 'Invoice booking must belong to the same tenant';
    end if;
  end if;

  if new.session_id is not null then
    select s.tenant_id into related_tenant_id from public.sessions s where s.id = new.session_id and s.deleted_at is null;
    if related_tenant_id is null or related_tenant_id <> new.tenant_id then
      raise exception 'Invoice session must belong to the same tenant';
    end if;
  end if;

  if new.therapist_profile_id is not null then
    select tp.tenant_id into related_tenant_id from public.therapist_profiles tp where tp.id = new.therapist_profile_id and tp.deleted_at is null;
    if related_tenant_id is null or related_tenant_id <> new.tenant_id then
      raise exception 'Invoice therapist must belong to the same tenant';
    end if;
  end if;

  if new.practice_location_id is not null then
    select pl.tenant_id into related_tenant_id from public.practice_locations pl where pl.id = new.practice_location_id and pl.deleted_at is null;
    if related_tenant_id is null or related_tenant_id <> new.tenant_id then
      raise exception 'Invoice location must belong to the same tenant';
    end if;
  end if;

  return new;
end;
$$;

create trigger invoices_validate_tenant_integrity
before insert or update of tenant_id, patient_id, responsible_party_id, booking_id, session_id, therapist_profile_id, practice_location_id
on public.invoices
for each row execute function public.validate_invoice_tenant_integrity();

create or replace function public.validate_invoice_line_tenant_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  related_tenant_id uuid;
begin
  select i.tenant_id into related_tenant_id from public.invoices i where i.id = new.invoice_id and i.deleted_at is null;
  if related_tenant_id is null or related_tenant_id <> new.tenant_id then
    raise exception 'Invoice line invoice must belong to the same tenant';
  end if;

  if new.source_session_procedure_id is not null then
    select sp.tenant_id into related_tenant_id from public.session_procedures sp where sp.id = new.source_session_procedure_id and sp.deleted_at is null;
    if related_tenant_id is null or related_tenant_id <> new.tenant_id then
      raise exception 'Invoice line session procedure must belong to the same tenant';
    end if;
  end if;

  return new;
end;
$$;

create trigger invoice_lines_validate_tenant_integrity
before insert or update of tenant_id, invoice_id, source_session_procedure_id
on public.invoice_lines
for each row execute function public.validate_invoice_line_tenant_integrity();

create or replace function public.create_draft_invoice_from_session(target_session_id uuid)
returns table (
  invoice_id uuid,
  created_invoice boolean,
  invoice_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  session_record public.sessions%rowtype;
  existing_invoice public.invoices%rowtype;
  patient_record public.patients%rowtype;
  responsible_party_record public.responsible_parties%rowtype;
  billing_record public.billing_settings%rowtype;
  practice_record public.practice_profiles%rowtype;
  branding_record public.practice_branding%rowtype;
  therapist_record public.therapist_profiles%rowtype;
  location_record public.practice_locations%rowtype;
  bank_record public.bank_accounts%rowtype;
  registration_record public.professional_registrations%rowtype;
  workflow_event public.session_workflow_events%rowtype;
  new_invoice_id uuid;
  draft_status text := 'draft';
  review_reason text;
  line_count integer;
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

  if not public.has_tenant_role(session_record.tenant_id, array['admin', 'finance']) then
    raise exception 'Not allowed to create draft invoices for this session';
  end if;

  if session_record.session_status <> 'completed' then
    raise exception 'Draft invoices can only be created from completed sessions';
  end if;

  select *
  into existing_invoice
  from public.invoices
  where tenant_id = session_record.tenant_id
    and session_id = session_record.id
    and source_type = 'session'
    and invoice_status not in ('cancelled', 'voided')
    and deleted_at is null;

  if existing_invoice.id is not null then
    invoice_id := existing_invoice.id;
    created_invoice := false;
    invoice_status := existing_invoice.invoice_status;
    return next;
    return;
  end if;

  select *
  into workflow_event
  from public.session_workflow_events
  where tenant_id = session_record.tenant_id
    and session_id = session_record.id
    and event_type = 'draft_invoice_requested'
    and deleted_at is null
  order by created_at desc
  limit 1;

  if workflow_event.id is null then
    raise exception 'Session has no draft invoice request event';
  end if;

  select *
  into patient_record
  from public.patients
  where id = session_record.patient_id
    and tenant_id = session_record.tenant_id
    and deleted_at is null;

  if patient_record.id is null then
    raise exception 'Invoice patient not found';
  end if;

  if patient_record.patient_status in ('archived', 'merged') then
    raise exception 'Cannot create draft invoice for archived or merged patient';
  end if;

  select *
  into responsible_party_record
  from public.responsible_parties
  where tenant_id = session_record.tenant_id
    and patient_id = session_record.patient_id
    and deleted_at is null
  order by is_billing_contact desc, is_primary desc, created_at asc
  limit 1;

  select *
  into billing_record
  from public.billing_settings
  where tenant_id = session_record.tenant_id
    and deleted_at is null
  order by created_at desc
  limit 1;

  select *
  into practice_record
  from public.practice_profiles
  where tenant_id = session_record.tenant_id
    and deleted_at is null
  order by created_at desc
  limit 1;

  select *
  into branding_record
  from public.practice_branding
  where tenant_id = session_record.tenant_id
    and deleted_at is null
  order by created_at desc
  limit 1;

  if session_record.therapist_profile_id is not null then
    select * into therapist_record from public.therapist_profiles where id = session_record.therapist_profile_id and deleted_at is null;
    select * into registration_record from public.professional_registrations where therapist_profile_id = session_record.therapist_profile_id and deleted_at is null and is_active = true order by is_primary desc, created_at asc limit 1;
  end if;

  if session_record.practice_location_id is not null then
    select * into location_record from public.practice_locations where id = session_record.practice_location_id and deleted_at is null;
  end if;

  if billing_record.default_bank_account_id is not null then
    select * into bank_record from public.bank_accounts where id = billing_record.default_bank_account_id and tenant_id = session_record.tenant_id and deleted_at is null and is_active = true;
  end if;

  select count(*)
  into line_count
  from public.session_procedures sp
  where sp.session_id = session_record.id
    and sp.tenant_id = session_record.tenant_id
    and sp.deleted_at is null
    and sp.is_billable = true;

  if line_count = 0 then
    raise exception 'At least one billable session procedure is required';
  end if;

  if responsible_party_record.id is null then
    review_reason := concat_ws('; ', review_reason, 'Responsible party requires review');
  end if;

  if billing_record.id is null then
    review_reason := concat_ws('; ', review_reason, 'Billing settings require review');
  end if;

  if bank_record.id is null then
    review_reason := concat_ws('; ', review_reason, 'Banking details require review');
  end if;

  if review_reason is not null then
    draft_status := 'review_required';
  end if;

  insert into public.invoices (
    tenant_id,
    patient_id,
    responsible_party_id,
    booking_id,
    session_id,
    therapist_profile_id,
    practice_location_id,
    source_workflow_event_id,
    source_type,
    invoice_status,
    draft_reference,
    invoice_prefix,
    invoice_date,
    service_date,
    due_date,
    payment_terms_days,
    currency_code,
    review_required_at,
    review_required_reason,
    created_by_profile_id,
    updated_by_profile_id,
    metadata
  )
  values (
    session_record.tenant_id,
    session_record.patient_id,
    responsible_party_record.id,
    session_record.booking_id,
    session_record.id,
    session_record.therapist_profile_id,
    session_record.practice_location_id,
    workflow_event.id,
    'session',
    draft_status,
    'DRAFT-' || upper(substr(gen_random_uuid()::text, 1, 8)),
    coalesce(billing_record.invoice_prefix, 'INV'),
    current_date,
    coalesce(session_record.actual_start_at::date, session_record.scheduled_start_at::date, current_date),
    current_date + coalesce(billing_record.payment_terms_days, 7),
    coalesce(billing_record.payment_terms_days, 7),
    coalesce(practice_record.default_currency, 'ZAR'),
    case when draft_status = 'review_required' then now() else null end,
    review_reason,
    auth.uid(),
    auth.uid(),
    jsonb_build_object('source_session_status', session_record.session_status)
  )
  returning id into new_invoice_id;

  insert into public.invoice_lines (
    tenant_id,
    invoice_id,
    source_session_procedure_id,
    source_booking_procedure_id,
    source_price_list_item_id,
    therapist_profile_id,
    practice_location_id,
    line_type,
    line_order,
    service_date,
    procedure_name,
    procedure_code,
    description,
    icd10_code,
    quantity,
    unit_price,
    discount_amount,
    adjustment_amount,
    currency_code,
    created_by_profile_id,
    updated_by_profile_id
  )
  select
    sp.tenant_id,
    new_invoice_id,
    sp.id,
    sp.booking_procedure_id,
    sp.price_list_item_id,
    session_record.therapist_profile_id,
    session_record.practice_location_id,
    'session_procedure',
    row_number() over (order by sp.created_at, sp.id),
    coalesce(session_record.actual_start_at::date, session_record.scheduled_start_at::date, current_date),
    sp.procedure_name,
    sp.procedure_code,
    sp.description,
    patient_record.active_icd10_code,
    sp.quantity,
    sp.unit_price,
    sp.discount_amount,
    sp.adjustment_amount,
    sp.currency_code,
    auth.uid(),
    auth.uid()
  from public.session_procedures sp
  where sp.session_id = session_record.id
    and sp.tenant_id = session_record.tenant_id
    and sp.deleted_at is null
    and sp.is_billable = true;

  insert into public.invoice_party_snapshots (
    tenant_id,
    invoice_id,
    patient_id,
    responsible_party_id,
    patient_full_name,
    patient_number,
    patient_date_of_birth,
    patient_id_number,
    patient_icd10_code,
    responsible_party_name,
    responsible_party_type,
    relationship_to_patient,
    responsible_party_id_number,
    billing_email,
    billing_phone,
    organisation_name,
    medical_aid_context,
    snapshot,
    created_by_profile_id,
    updated_by_profile_id
  )
  values (
    session_record.tenant_id,
    new_invoice_id,
    patient_record.id,
    responsible_party_record.id,
    btrim(patient_record.first_name || ' ' || patient_record.last_name),
    patient_record.patient_number,
    patient_record.date_of_birth,
    patient_record.id_number,
    patient_record.active_icd10_code,
    responsible_party_record.full_name,
    responsible_party_record.party_type,
    responsible_party_record.relationship_to_patient,
    responsible_party_record.id_number,
    coalesce(responsible_party_record.email, patient_record.email),
    coalesce(responsible_party_record.phone, patient_record.phone),
    responsible_party_record.organisation_name,
    jsonb_build_object(
      'member_number', responsible_party_record.medical_aid_member_number,
      'dependant_code', responsible_party_record.medical_aid_dependant_code
    ),
    jsonb_build_object('patient_status', patient_record.patient_status),
    auth.uid(),
    auth.uid()
  );

  insert into public.invoice_issuer_snapshots (
    tenant_id,
    invoice_id,
    practice_profile_id,
    therapist_profile_id,
    practice_location_id,
    bank_account_id,
    practice_legal_name,
    practice_trading_name,
    practice_registration_number,
    practice_tax_number,
    practice_vat_number,
    practice_email,
    practice_phone,
    practice_website,
    practice_address,
    therapist_name,
    therapist_profession,
    therapist_practice_number,
    therapist_registration,
    location_name,
    location_address,
    bank_account_holder,
    bank_name,
    bank_account_number,
    bank_branch_code,
    bank_account_type,
    branding,
    currency_code,
    payment_terms_days,
    snapshot,
    created_by_profile_id,
    updated_by_profile_id
  )
  values (
    session_record.tenant_id,
    new_invoice_id,
    practice_record.id,
    therapist_record.id,
    location_record.id,
    bank_record.id,
    practice_record.legal_name,
    practice_record.trading_name,
    practice_record.business_registration_number,
    practice_record.tax_number,
    practice_record.vat_number,
    practice_record.main_email,
    practice_record.main_phone,
    practice_record.website,
    jsonb_build_object('country', practice_record.default_country),
    therapist_record.display_name,
    therapist_record.profession,
    case
      when coalesce((billing_record.metadata ->> 'allow_therapist_practice_number_overrides')::boolean, false) then therapist_record.practice_number
      else null
    end,
    jsonb_build_object(
      'registration_body', registration_record.registration_body,
      'registration_number', registration_record.registration_number,
      'registration_type', registration_record.registration_type
    ),
    location_record.location_name,
    jsonb_build_object(
      'address_line_1', location_record.address_line_1,
      'address_line_2', location_record.address_line_2,
      'suburb', location_record.suburb,
      'city', location_record.city,
      'province', location_record.province,
      'postal_code', location_record.postal_code,
      'country', location_record.country
    ),
    bank_record.account_holder,
    bank_record.bank_name,
    bank_record.account_number,
    bank_record.branch_code,
    bank_record.account_type,
    jsonb_build_object(
      'logo_url', branding_record.logo_url,
      'primary_colour', branding_record.primary_colour,
      'invoice_logo_position', branding_record.invoice_logo_position,
      'patient_facing_display_name', branding_record.patient_facing_display_name
    ),
    coalesce(practice_record.default_currency, 'ZAR'),
    coalesce(billing_record.payment_terms_days, 7),
    jsonb_build_object('billing_settings_id', billing_record.id),
    auth.uid(),
    auth.uid()
  );

  perform public.recalculate_invoice_totals(new_invoice_id);

  insert into public.invoice_status_history (
    tenant_id,
    invoice_id,
    session_id,
    booking_id,
    patient_id,
    to_status,
    event_type,
    event_reason,
    created_by_profile_id
  )
  values (
    session_record.tenant_id,
    new_invoice_id,
    session_record.id,
    session_record.booking_id,
    session_record.patient_id,
    draft_status,
    case when draft_status = 'review_required' then 'draft_invoice_review_required' else 'draft_invoice_created' end,
    coalesce(review_reason, 'Draft invoice created from completed session'),
    auth.uid()
  );

  insert into public.invoice_workflow_events (
    tenant_id,
    invoice_id,
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
    new_invoice_id,
    session_record.id,
    session_record.booking_id,
    session_record.patient_id,
    'draft_invoice_created',
    'invoice:' || new_invoice_id::text || ':draft_invoice_created:v1',
    jsonb_build_object('source_workflow_event_id', workflow_event.id),
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
    session_record.tenant_id,
    session_record.patient_id,
    'draft_invoice_created',
    'Draft invoice created',
    'A draft invoice was created from the completed session.',
    'invoices',
    new_invoice_id,
    false,
    now(),
    auth.uid(),
    jsonb_build_object('session_id', session_record.id, 'booking_id', session_record.booking_id)
  );

  invoice_id := new_invoice_id;
  created_invoice := true;
  invoice_status := draft_status;
  return next;
end;
$$;

create or replace function public.confirm_invoice(target_invoice_id uuid)
returns table (
  invoice_id uuid,
  confirmed_invoice boolean,
  invoice_status text,
  invoice_number text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  invoice_record public.invoices%rowtype;
  sequence_record public.invoice_number_sequences%rowtype;
  billing_record public.billing_settings%rowtype;
  line_count integer;
  allocated_number text;
  previous_status text;
begin
  select *
  into invoice_record
  from public.invoices
  where id = target_invoice_id
    and deleted_at is null
  for update;

  if invoice_record.id is null then
    raise exception 'Invoice not found';
  end if;

  if not public.has_tenant_role(invoice_record.tenant_id, array['admin', 'finance']) then
    raise exception 'Not allowed to confirm this invoice';
  end if;

  if invoice_record.invoice_status in ('confirmed', 'issued', 'awaiting_payment', 'partially_paid', 'paid', 'overdue') then
    invoice_id := invoice_record.id;
    confirmed_invoice := false;
    invoice_status := invoice_record.invoice_status;
    invoice_number := invoice_record.invoice_number;
    return next;
    return;
  end if;

  if invoice_record.invoice_status not in ('draft', 'ready_to_confirm') then
    raise exception 'Only draft or ready-to-confirm invoices can be confirmed';
  end if;

  if invoice_record.reconciliation_required then
    raise exception 'Invoice requires reconciliation before confirmation';
  end if;

  select count(*)
  into line_count
  from public.invoice_lines
  where invoice_id = invoice_record.id
    and tenant_id = invoice_record.tenant_id
    and deleted_at is null;

  if line_count = 0 then
    raise exception 'Invoice requires at least one line before confirmation';
  end if;

  if invoice_record.due_date is null then
    raise exception 'Invoice requires a due date before confirmation';
  end if;

  perform public.recalculate_invoice_totals(invoice_record.id);

  select *
  into invoice_record
  from public.invoices
  where id = target_invoice_id
    and deleted_at is null
  for update;

  if invoice_record.total_amount < 0 then
    raise exception 'Invoice total cannot be negative';
  end if;

  select *
  into billing_record
  from public.billing_settings
  where tenant_id = invoice_record.tenant_id
    and deleted_at is null
  order by created_at desc
  limit 1;

  insert into public.invoice_number_sequences (
    tenant_id,
    sequence_key,
    prefix,
    next_number,
    padding_length,
    created_by_profile_id,
    updated_by_profile_id
  )
  values (
    invoice_record.tenant_id,
    'default',
    coalesce(billing_record.invoice_prefix, invoice_record.invoice_prefix, 'INV'),
    coalesce(billing_record.next_invoice_number, 1),
    4,
    auth.uid(),
    auth.uid()
  )
  on conflict (tenant_id, sequence_key) where deleted_at is null do nothing;

  select *
  into sequence_record
  from public.invoice_number_sequences
  where tenant_id = invoice_record.tenant_id
    and sequence_key = 'default'
    and deleted_at is null
  for update;

  allocated_number := sequence_record.prefix || '-' || lpad(sequence_record.next_number::text, sequence_record.padding_length, '0') || coalesce(sequence_record.suffix, '');
  previous_status := invoice_record.invoice_status;

  update public.invoice_number_sequences
  set
    next_number = next_number + 1,
    updated_by_profile_id = auth.uid()
  where id = sequence_record.id;

  update public.invoices
  set
    invoice_status = 'confirmed',
    invoice_number = allocated_number,
    invoice_prefix = sequence_record.prefix,
    invoice_sequence_number = sequence_record.next_number,
    invoice_sequence_key = sequence_record.sequence_key,
    confirmed_at = now(),
    confirmed_by_profile_id = auth.uid(),
    patient_link_update_ready = true,
    updated_by_profile_id = auth.uid()
  where id = invoice_record.id;

  insert into public.invoice_status_history (
    tenant_id,
    invoice_id,
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
    invoice_record.tenant_id,
    invoice_record.id,
    invoice_record.session_id,
    invoice_record.booking_id,
    invoice_record.patient_id,
    previous_status,
    'confirmed',
    'invoice_confirmed',
    'Invoice confirmed and final number allocated',
    true,
    auth.uid()
  );

  insert into public.invoice_workflow_events (
    tenant_id,
    invoice_id,
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
      invoice_record.tenant_id,
      invoice_record.id,
      invoice_record.session_id,
      invoice_record.booking_id,
      invoice_record.patient_id,
      'invoice_number_allocated',
      'invoice:' || invoice_record.id::text || ':invoice_number_allocated:v1',
      jsonb_build_object('invoice_number', allocated_number),
      auth.uid()
    ),
    (
      invoice_record.tenant_id,
      invoice_record.id,
      invoice_record.session_id,
      invoice_record.booking_id,
      invoice_record.patient_id,
      'invoice_confirmed',
      'invoice:' || invoice_record.id::text || ':invoice_confirmed:v1',
      jsonb_build_object('invoice_number', allocated_number),
      auth.uid()
    ),
    (
      invoice_record.tenant_id,
      invoice_record.id,
      invoice_record.session_id,
      invoice_record.booking_id,
      invoice_record.patient_id,
      'patient_link_update_ready',
      'invoice:' || invoice_record.id::text || ':patient_link_update_ready:v1',
      jsonb_build_object('invoice_number', allocated_number),
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
    patient_visible_body,
    occurred_at,
    created_by_profile_id,
    metadata
  )
  values (
    invoice_record.tenant_id,
    invoice_record.patient_id,
    'invoice_confirmed',
    'Invoice confirmed',
    'An invoice was confirmed and is ready for payment tracking.',
    'invoices',
    invoice_record.id,
    true,
    'Invoice available',
    'An invoice is available from the practice.',
    now(),
    auth.uid(),
    jsonb_build_object('invoice_number', allocated_number)
  );

  invoice_id := invoice_record.id;
  confirmed_invoice := true;
  invoice_status := 'confirmed';
  invoice_number := allocated_number;
  return next;
end;
$$;

revoke all on function public.calculate_invoice_line_totals() from public, anon, authenticated;
revoke all on function public.recalculate_invoice_totals(uuid) from public, anon;
revoke all on function public.recalculate_invoice_after_line_change() from public, anon, authenticated;
revoke all on function public.validate_invoice_tenant_integrity() from public, anon, authenticated;
revoke all on function public.validate_invoice_line_tenant_integrity() from public, anon, authenticated;
revoke all on function public.create_draft_invoice_from_session(uuid) from public, anon;
revoke all on function public.confirm_invoice(uuid) from public, anon;

grant execute on function public.recalculate_invoice_totals(uuid) to authenticated;
grant execute on function public.create_draft_invoice_from_session(uuid) to authenticated;
grant execute on function public.confirm_invoice(uuid) to authenticated;

revoke all on public.invoice_number_sequences from anon, authenticated;
revoke all on public.invoices from anon, authenticated;
revoke all on public.invoice_lines from anon, authenticated;
revoke all on public.invoice_party_snapshots from anon, authenticated;
revoke all on public.invoice_issuer_snapshots from anon, authenticated;
revoke all on public.invoice_status_history from anon, authenticated;
revoke all on public.invoice_workflow_events from anon, authenticated;

grant select, insert, update on public.invoice_number_sequences to authenticated;
grant select, insert, update on public.invoices to authenticated;
grant select, insert, update on public.invoice_lines to authenticated;
grant select, insert, update on public.invoice_party_snapshots to authenticated;
grant select, insert, update on public.invoice_issuer_snapshots to authenticated;
grant select, insert, update on public.invoice_status_history to authenticated;
grant select, insert, update on public.invoice_workflow_events to authenticated;

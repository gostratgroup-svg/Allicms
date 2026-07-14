-- AlliDesk Phase 5E: Finance Workflow database foundation.
--
-- Scope: invoice issuance, payment recording, payment allocation, account
-- credits, receipt readiness, status/workflow events, and transactional
-- payment balance maintenance.
--
-- This migration intentionally does not implement statements, payment gateway
-- integrations, PDF generation, Patient Link rendering, communication delivery,
-- medical aid claims, refunds, write-offs, or credit-note workflows.

alter table public.invoices
  add column if not exists issued_at timestamptz,
  add column if not exists issued_by_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists collection_status text not null default 'normal',
  add column if not exists payment_reconciliation_status text not null default 'not_reconciled',
  add column if not exists last_payment_at timestamptz,
  add column if not exists overdue_since date;

alter table public.invoices
  drop constraint if exists invoices_status_check,
  drop constraint if exists invoices_confirmed_state_check;

alter table public.invoices
  add constraint invoices_status_check
    check (invoice_status in ('draft', 'review_required', 'ready_to_confirm', 'confirmed', 'issued', 'awaiting_payment', 'partially_paid', 'paid', 'overdue', 'cancelled', 'voided', 'written_off', 'disputed')),
  add constraint invoices_confirmed_state_check
    check (
      (
        invoice_status in ('confirmed', 'issued', 'awaiting_payment', 'partially_paid', 'paid', 'overdue', 'written_off', 'disputed')
        and confirmed_at is not null
        and invoice_number is not null
        and invoice_sequence_number is not null
      )
      or invoice_status not in ('confirmed', 'issued', 'awaiting_payment', 'partially_paid', 'paid', 'overdue', 'written_off', 'disputed')
    ),
  add constraint invoices_payment_status_check
    check (payment_status in ('unpaid', 'partially_paid', 'paid', 'overpaid', 'credited', 'reversed')),
  add constraint invoices_collection_status_check
    check (collection_status in ('normal', 'overdue', 'disputed', 'suspended', 'written_off')),
  add constraint invoices_payment_reconciliation_status_check
    check (payment_reconciliation_status in ('not_reconciled', 'partially_reconciled', 'reconciled', 'manual_review'));

alter table public.invoice_status_history
  drop constraint if exists invoice_status_history_from_status_check,
  drop constraint if exists invoice_status_history_to_status_check,
  drop constraint if exists invoice_status_history_event_type_check;

alter table public.invoice_status_history
  add constraint invoice_status_history_from_status_check
    check (from_status is null or from_status in ('draft', 'review_required', 'ready_to_confirm', 'confirmed', 'issued', 'awaiting_payment', 'partially_paid', 'paid', 'overdue', 'cancelled', 'voided', 'written_off', 'disputed')),
  add constraint invoice_status_history_to_status_check
    check (to_status in ('draft', 'review_required', 'ready_to_confirm', 'confirmed', 'issued', 'awaiting_payment', 'partially_paid', 'paid', 'overdue', 'cancelled', 'voided', 'written_off', 'disputed')),
  add constraint invoice_status_history_event_type_check
    check (event_type in ('draft_invoice_requested', 'draft_invoice_created', 'draft_invoice_updated', 'draft_invoice_review_required', 'invoice_ready_to_confirm', 'invoice_number_allocated', 'invoice_confirmed', 'draft_invoice_cancelled', 'invoice_reconciliation_required', 'invoice_issued', 'invoice_awaiting_payment', 'invoice_partially_paid', 'invoice_paid', 'invoice_overdue', 'invoice_disputed', 'invoice_voided', 'invoice_written_off', 'payment_allocated', 'allocation_reversed'));

alter table public.invoice_workflow_events
  drop constraint if exists invoice_workflow_events_type_check;

alter table public.invoice_workflow_events
  add constraint invoice_workflow_events_type_check
    check (event_type in ('draft_invoice_requested', 'draft_invoice_created', 'draft_invoice_updated', 'draft_invoice_review_required', 'invoice_ready_to_confirm', 'invoice_number_allocated', 'invoice_confirmed', 'draft_invoice_cancelled', 'invoice_reconciliation_required', 'patient_link_update_ready', 'communication_ready', 'pdf_generation_ready', 'invoice_issued', 'invoice_awaiting_payment', 'invoice_partially_paid', 'invoice_paid', 'invoice_overdue', 'payment_allocated', 'receipt_ready'));

create table public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  patient_id uuid references public.patients(id) on delete set null,
  responsible_party_id uuid references public.responsible_parties(id) on delete set null,
  account_type text not null default 'patient',
  account_name text not null,
  account_reference text,
  currency_code text not null default 'ZAR',
  account_status text not null default 'active',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_accounts_name_not_blank_check check (btrim(account_name) <> ''),
  constraint financial_accounts_type_check check (account_type in ('patient', 'responsible_party', 'organisation', 'medical_aid')),
  constraint financial_accounts_status_check check (account_status in ('active', 'inactive', 'archived')),
  constraint financial_accounts_currency_check check (char_length(currency_code) = 3),
  constraint financial_accounts_context_check check (
    patient_id is not null
    or responsible_party_id is not null
    or account_type in ('organisation', 'medical_aid')
  )
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  financial_account_id uuid references public.financial_accounts(id) on delete set null,
  patient_id uuid references public.patients(id) on delete set null,
  responsible_party_id uuid references public.responsible_parties(id) on delete set null,
  primary_invoice_id uuid references public.invoices(id) on delete set null,
  bank_account_id uuid references public.bank_accounts(id) on delete set null,
  therapist_profile_id uuid references public.therapist_profiles(id) on delete set null,
  practice_location_id uuid references public.practice_locations(id) on delete set null,
  payer_name text not null,
  payer_email text,
  payer_phone text,
  payment_date date not null default current_date,
  amount numeric(12, 2) not null,
  allocated_amount numeric(12, 2) not null default 0,
  unallocated_amount numeric(12, 2) not null default 0,
  currency_code text not null default 'ZAR',
  payment_method text not null,
  payment_reference text,
  external_transaction_reference text,
  payment_status text not null default 'recorded',
  reconciliation_status text not null default 'unreconciled',
  notes text,
  reversed_at timestamptz,
  reversed_by_profile_id uuid references public.profiles(id) on delete set null,
  reversal_reason text,
  refund_ready boolean not null default false,
  proof_document_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  recorded_by_profile_id uuid references public.profiles(id) on delete set null,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_payer_name_not_blank_check check (btrim(payer_name) <> ''),
  constraint payments_amount_check check (amount > 0),
  constraint payments_allocated_check check (allocated_amount >= 0 and unallocated_amount >= 0),
  constraint payments_currency_check check (char_length(currency_code) = 3),
  constraint payments_method_check check (payment_method in ('cash', 'eft', 'card', 'online', 'medical_aid', 'account_credit', 'other')),
  constraint payments_status_check check (payment_status in ('recorded', 'unallocated', 'partially_allocated', 'allocated', 'reversed', 'failed', 'refunded')),
  constraint payments_reconciliation_status_check check (reconciliation_status in ('unreconciled', 'matched', 'manual_review', 'reconciled', 'reversed')),
  constraint payments_reversal_state_check check (
    (
      payment_status = 'reversed'
      and reversed_at is not null
      and reversal_reason is not null
      and btrim(reversal_reason) <> ''
    )
    or payment_status <> 'reversed'
  )
);

create table public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  payment_id uuid not null references public.payments(id) on delete restrict,
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  financial_account_id uuid references public.financial_accounts(id) on delete set null,
  patient_id uuid references public.patients(id) on delete set null,
  responsible_party_id uuid references public.responsible_parties(id) on delete set null,
  allocated_amount numeric(12, 2) not null,
  currency_code text not null default 'ZAR',
  allocation_order integer not null default 1,
  allocation_status text not null default 'active',
  allocated_at timestamptz not null default now(),
  allocated_by_profile_id uuid references public.profiles(id) on delete set null,
  reversed_at timestamptz,
  reversed_by_profile_id uuid references public.profiles(id) on delete set null,
  reversal_reason text,
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_allocations_amount_check check (allocated_amount > 0),
  constraint payment_allocations_currency_check check (char_length(currency_code) = 3),
  constraint payment_allocations_order_check check (allocation_order > 0),
  constraint payment_allocations_status_check check (allocation_status in ('active', 'reversed', 'removed')),
  constraint payment_allocations_reversal_state_check check (
    (
      allocation_status in ('reversed', 'removed')
      and reversed_at is not null
      and reversal_reason is not null
      and btrim(reversal_reason) <> ''
    )
    or allocation_status = 'active'
  )
);

create table public.account_credits (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  financial_account_id uuid references public.financial_accounts(id) on delete set null,
  patient_id uuid references public.patients(id) on delete set null,
  responsible_party_id uuid references public.responsible_parties(id) on delete set null,
  source_payment_id uuid references public.payments(id) on delete set null,
  source_payment_allocation_id uuid references public.payment_allocations(id) on delete set null,
  original_amount numeric(12, 2) not null,
  remaining_amount numeric(12, 2) not null,
  currency_code text not null default 'ZAR',
  credit_status text not null default 'available',
  credit_reason text not null,
  expires_at date,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_credits_amount_check check (original_amount > 0 and remaining_amount >= 0 and remaining_amount <= original_amount),
  constraint account_credits_currency_check check (char_length(currency_code) = 3),
  constraint account_credits_status_check check (credit_status in ('available', 'partially_used', 'used', 'refunded', 'expired', 'reversed')),
  constraint account_credits_reason_not_blank_check check (btrim(credit_reason) <> '')
);

create table public.receipt_number_sequences (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  sequence_key text not null default 'default',
  prefix text not null default 'RCT',
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
  constraint receipt_number_sequences_key_not_blank_check check (btrim(sequence_key) <> ''),
  constraint receipt_number_sequences_prefix_not_blank_check check (btrim(prefix) <> ''),
  constraint receipt_number_sequences_next_number_check check (next_number > 0),
  constraint receipt_number_sequences_padding_check check (padding_length between 1 and 12),
  constraint receipt_number_sequences_reset_strategy_check check (reset_strategy in ('never', 'calendar_year', 'financial_year'))
);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  payment_id uuid not null references public.payments(id) on delete restrict,
  financial_account_id uuid references public.financial_accounts(id) on delete set null,
  patient_id uuid references public.patients(id) on delete set null,
  responsible_party_id uuid references public.responsible_parties(id) on delete set null,
  invoice_issuer_snapshot_id uuid references public.invoice_issuer_snapshots(id) on delete set null,
  receipt_number text not null,
  receipt_prefix text,
  receipt_sequence_number integer,
  receipt_sequence_key text,
  receipt_status text not null default 'issued',
  receipt_date date not null default current_date,
  issued_at timestamptz not null default now(),
  issued_by_profile_id uuid references public.profiles(id) on delete set null,
  payer_snapshot jsonb not null default '{}'::jsonb,
  issuer_snapshot jsonb not null default '{}'::jsonb,
  allocation_snapshot jsonb not null default '[]'::jsonb,
  payment_amount numeric(12, 2) not null,
  currency_code text not null default 'ZAR',
  payment_reference text,
  payment_method text,
  patient_link_ready boolean not null default false,
  pdf_generation_ready boolean not null default false,
  communication_ready boolean not null default false,
  reversed_at timestamptz,
  reversed_by_profile_id uuid references public.profiles(id) on delete set null,
  reversal_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint receipts_number_not_blank_check check (btrim(receipt_number) <> ''),
  constraint receipts_amount_check check (payment_amount > 0),
  constraint receipts_currency_check check (char_length(currency_code) = 3),
  constraint receipts_status_check check (receipt_status in ('issued', 'reversed', 'voided')),
  constraint receipts_reversal_state_check check (
    (
      receipt_status in ('reversed', 'voided')
      and reversed_at is not null
      and reversal_reason is not null
      and btrim(reversal_reason) <> ''
    )
    or receipt_status = 'issued'
  )
);

create table public.payment_status_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  payment_id uuid not null references public.payments(id) on delete restrict,
  financial_account_id uuid references public.financial_accounts(id) on delete set null,
  patient_id uuid references public.patients(id) on delete set null,
  responsible_party_id uuid references public.responsible_parties(id) on delete set null,
  from_status text,
  to_status text not null,
  event_type text not null,
  event_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_status_history_from_status_check check (from_status is null or from_status in ('recorded', 'unallocated', 'partially_allocated', 'allocated', 'reversed', 'failed', 'refunded')),
  constraint payment_status_history_to_status_check check (to_status in ('recorded', 'unallocated', 'partially_allocated', 'allocated', 'reversed', 'failed', 'refunded')),
  constraint payment_status_history_event_type_check check (event_type in ('payment_recorded', 'payment_allocated', 'payment_partially_allocated', 'payment_unallocated', 'payment_reversed', 'allocation_reversed', 'receipt_created', 'account_credit_created'))
);

create table public.payment_workflow_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  payment_id uuid references public.payments(id) on delete set null,
  payment_allocation_id uuid references public.payment_allocations(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  receipt_id uuid references public.receipts(id) on delete set null,
  financial_account_id uuid references public.financial_accounts(id) on delete set null,
  patient_id uuid references public.patients(id) on delete set null,
  responsible_party_id uuid references public.responsible_parties(id) on delete set null,
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
  constraint payment_workflow_events_type_check check (event_type in ('payment_recorded', 'payment_allocated', 'payment_partially_allocated', 'payment_unallocated', 'payment_reversed', 'allocation_reversed', 'account_credit_created', 'receipt_created', 'receipt_ready', 'statement_ready', 'medical_aid_remittance_ready', 'payment_gateway_callback_ready')),
  constraint payment_workflow_events_status_check check (event_status in ('pending', 'processing', 'processed', 'failed', 'ignored')),
  constraint payment_workflow_events_idempotency_not_blank_check check (btrim(idempotency_key) <> '')
);

create trigger financial_accounts_set_updated_at
before update on public.financial_accounts
for each row execute function public.set_updated_at();

create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create trigger payment_allocations_set_updated_at
before update on public.payment_allocations
for each row execute function public.set_updated_at();

create trigger account_credits_set_updated_at
before update on public.account_credits
for each row execute function public.set_updated_at();

create trigger receipt_number_sequences_set_updated_at
before update on public.receipt_number_sequences
for each row execute function public.set_updated_at();

create trigger receipts_set_updated_at
before update on public.receipts
for each row execute function public.set_updated_at();

create trigger payment_status_history_set_updated_at
before update on public.payment_status_history
for each row execute function public.set_updated_at();

create trigger payment_workflow_events_set_updated_at
before update on public.payment_workflow_events
for each row execute function public.set_updated_at();

create unique index financial_accounts_unique_patient_idx
  on public.financial_accounts (tenant_id, patient_id, account_type)
  where deleted_at is null and patient_id is not null and account_type = 'patient';

create unique index financial_accounts_unique_responsible_party_idx
  on public.financial_accounts (tenant_id, responsible_party_id, account_type)
  where deleted_at is null and responsible_party_id is not null and account_type = 'responsible_party';

create index financial_accounts_tenant_status_idx
  on public.financial_accounts (tenant_id, account_status, account_type)
  where deleted_at is null;

create index payments_tenant_date_idx
  on public.payments (tenant_id, payment_date desc)
  where deleted_at is null;

create index payments_account_idx
  on public.payments (tenant_id, financial_account_id, payment_date desc)
  where deleted_at is null and financial_account_id is not null;

create index payments_patient_idx
  on public.payments (tenant_id, patient_id, payment_date desc)
  where deleted_at is null and patient_id is not null;

create index payments_responsible_party_idx
  on public.payments (tenant_id, responsible_party_id, payment_date desc)
  where deleted_at is null and responsible_party_id is not null;

create index payments_status_idx
  on public.payments (tenant_id, payment_status, reconciliation_status)
  where deleted_at is null;

create unique index payments_external_reference_idx
  on public.payments (tenant_id, payment_method, external_transaction_reference)
  where deleted_at is null and external_transaction_reference is not null;

create index payment_allocations_payment_idx
  on public.payment_allocations (payment_id, allocation_order)
  where deleted_at is null;

create index payment_allocations_invoice_idx
  on public.payment_allocations (tenant_id, invoice_id, allocated_at desc)
  where deleted_at is null;

create unique index payment_allocations_idempotency_idx
  on public.payment_allocations (tenant_id, idempotency_key)
  where deleted_at is null and idempotency_key is not null;

create unique index payment_allocations_active_payment_invoice_idx
  on public.payment_allocations (tenant_id, payment_id, invoice_id, allocation_order)
  where deleted_at is null and allocation_status = 'active';

create index account_credits_account_idx
  on public.account_credits (tenant_id, financial_account_id, credit_status)
  where deleted_at is null;

create index account_credits_patient_idx
  on public.account_credits (tenant_id, patient_id, credit_status)
  where deleted_at is null and patient_id is not null;

create unique index receipt_number_sequences_unique_key_idx
  on public.receipt_number_sequences (tenant_id, sequence_key)
  where deleted_at is null;

create unique index receipts_unique_number_per_tenant_idx
  on public.receipts (tenant_id, receipt_number)
  where deleted_at is null;

create unique index receipts_payment_id_idx
  on public.receipts (payment_id)
  where deleted_at is null;

create index receipts_tenant_date_idx
  on public.receipts (tenant_id, receipt_date desc)
  where deleted_at is null;

create index payment_status_history_payment_idx
  on public.payment_status_history (payment_id, created_at desc)
  where deleted_at is null;

create index payment_workflow_events_payment_idx
  on public.payment_workflow_events (payment_id, created_at desc)
  where deleted_at is null;

create index payment_workflow_events_status_idx
  on public.payment_workflow_events (tenant_id, event_status, created_at)
  where deleted_at is null;

create unique index payment_workflow_events_idempotency_idx
  on public.payment_workflow_events (tenant_id, idempotency_key)
  where deleted_at is null;

create index invoices_payment_status_idx
  on public.invoices (tenant_id, payment_status, due_date)
  where deleted_at is null;

create index invoices_overdue_lookup_idx
  on public.invoices (tenant_id, due_date, balance_due)
  where deleted_at is null and balance_due > 0;

alter table public.financial_accounts enable row level security;
alter table public.payments enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.account_credits enable row level security;
alter table public.receipt_number_sequences enable row level security;
alter table public.receipts enable row level security;
alter table public.payment_status_history enable row level security;
alter table public.payment_workflow_events enable row level security;

create policy "tenant finance users can read financial accounts"
on public.financial_accounts for select to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can create financial accounts"
on public.financial_accounts for insert to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can update financial accounts"
on public.financial_accounts for update to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin', 'finance']))
with check (public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can read payments"
on public.payments for select to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can create payments"
on public.payments for insert to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can update payments"
on public.payments for update to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin', 'finance']))
with check (public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can read payment allocations"
on public.payment_allocations for select to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can create payment allocations"
on public.payment_allocations for insert to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can update payment allocations"
on public.payment_allocations for update to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin', 'finance']))
with check (public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can read account credits"
on public.account_credits for select to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can create account credits"
on public.account_credits for insert to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can update account credits"
on public.account_credits for update to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin', 'finance']))
with check (public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can read receipt sequences"
on public.receipt_number_sequences for select to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can create receipt sequences"
on public.receipt_number_sequences for insert to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can update receipt sequences"
on public.receipt_number_sequences for update to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin', 'finance']))
with check (public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can read receipts"
on public.receipts for select to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can create receipts"
on public.receipts for insert to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can update receipts"
on public.receipts for update to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin', 'finance']))
with check (public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can read payment status history"
on public.payment_status_history for select to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can create payment status history"
on public.payment_status_history for insert to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant admins can update payment status history"
on public.payment_status_history for update to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin']))
with check (public.has_tenant_role(tenant_id, array['admin']));

create policy "tenant finance users can read payment workflow events"
on public.payment_workflow_events for select to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant finance users can create payment workflow events"
on public.payment_workflow_events for insert to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant admins can update payment workflow events"
on public.payment_workflow_events for update to authenticated
using (deleted_at is null and public.has_tenant_role(tenant_id, array['admin']))
with check (public.has_tenant_role(tenant_id, array['admin']));

create or replace function public.validate_financial_account_tenant_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  related_tenant_id uuid;
begin
  if new.patient_id is not null then
    select tenant_id into related_tenant_id from public.patients where id = new.patient_id and deleted_at is null;
    if related_tenant_id is null or related_tenant_id <> new.tenant_id then
      raise exception 'Financial account patient must belong to the same tenant';
    end if;
  end if;

  if new.responsible_party_id is not null then
    select tenant_id into related_tenant_id from public.responsible_parties where id = new.responsible_party_id and deleted_at is null;
    if related_tenant_id is null or related_tenant_id <> new.tenant_id then
      raise exception 'Financial account responsible party must belong to the same tenant';
    end if;
  end if;

  return new;
end;
$$;

create trigger financial_accounts_validate_tenant_integrity
before insert or update of tenant_id, patient_id, responsible_party_id
on public.financial_accounts
for each row execute function public.validate_financial_account_tenant_integrity();

create or replace function public.validate_payment_tenant_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  related_tenant_id uuid;
begin
  if new.financial_account_id is not null then
    select tenant_id into related_tenant_id from public.financial_accounts where id = new.financial_account_id and deleted_at is null;
    if related_tenant_id is null or related_tenant_id <> new.tenant_id then
      raise exception 'Payment account must belong to the same tenant';
    end if;
  end if;

  if new.patient_id is not null then
    select tenant_id into related_tenant_id from public.patients where id = new.patient_id and deleted_at is null;
    if related_tenant_id is null or related_tenant_id <> new.tenant_id then
      raise exception 'Payment patient must belong to the same tenant';
    end if;
  end if;

  if new.responsible_party_id is not null then
    select tenant_id into related_tenant_id from public.responsible_parties where id = new.responsible_party_id and deleted_at is null;
    if related_tenant_id is null or related_tenant_id <> new.tenant_id then
      raise exception 'Payment responsible party must belong to the same tenant';
    end if;
  end if;

  if new.primary_invoice_id is not null then
    select tenant_id into related_tenant_id from public.invoices where id = new.primary_invoice_id and deleted_at is null;
    if related_tenant_id is null or related_tenant_id <> new.tenant_id then
      raise exception 'Payment invoice must belong to the same tenant';
    end if;
  end if;

  return new;
end;
$$;

create trigger payments_validate_tenant_integrity
before insert or update of tenant_id, financial_account_id, patient_id, responsible_party_id, primary_invoice_id
on public.payments
for each row execute function public.validate_payment_tenant_integrity();

create or replace function public.validate_payment_allocation_tenant_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  related_tenant_id uuid;
begin
  select tenant_id into related_tenant_id from public.payments where id = new.payment_id and deleted_at is null;
  if related_tenant_id is null or related_tenant_id <> new.tenant_id then
    raise exception 'Payment allocation payment must belong to the same tenant';
  end if;

  select tenant_id into related_tenant_id from public.invoices where id = new.invoice_id and deleted_at is null;
  if related_tenant_id is null or related_tenant_id <> new.tenant_id then
    raise exception 'Payment allocation invoice must belong to the same tenant';
  end if;

  return new;
end;
$$;

create trigger payment_allocations_validate_tenant_integrity
before insert or update of tenant_id, payment_id, invoice_id
on public.payment_allocations
for each row execute function public.validate_payment_allocation_tenant_integrity();

create or replace function public.recalculate_invoice_payment_balance(target_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  invoice_record public.invoices%rowtype;
  paid_amount numeric(12, 2);
  new_status text;
  new_payment_status text;
  new_collection_status text;
begin
  select * into invoice_record
  from public.invoices
  where id = target_invoice_id
    and deleted_at is null
  for update;

  if invoice_record.id is null then
    raise exception 'Invoice not found';
  end if;

  select coalesce(sum(allocated_amount), 0)::numeric(12, 2)
  into paid_amount
  from public.payment_allocations
  where invoice_id = target_invoice_id
    and tenant_id = invoice_record.tenant_id
    and allocation_status = 'active'
    and deleted_at is null;

  if paid_amount <= 0 then
    new_payment_status := 'unpaid';
  elsif paid_amount < invoice_record.total_amount then
    new_payment_status := 'partially_paid';
  elsif paid_amount = invoice_record.total_amount then
    new_payment_status := 'paid';
  else
    new_payment_status := 'overpaid';
  end if;

  if invoice_record.invoice_status in ('voided', 'cancelled', 'written_off') then
    new_status := invoice_record.invoice_status;
  elsif new_payment_status in ('paid', 'overpaid') then
    new_status := 'paid';
  elsif new_payment_status = 'partially_paid' then
    new_status := 'partially_paid';
  elsif invoice_record.due_date is not null and invoice_record.due_date < current_date and invoice_record.total_amount - paid_amount > 0 then
    new_status := 'overdue';
  elsif invoice_record.invoice_status = 'issued' then
    new_status := 'awaiting_payment';
  else
    new_status := invoice_record.invoice_status;
  end if;

  new_collection_status := case
    when new_status = 'overdue' then 'overdue'
    when new_status = 'written_off' then 'written_off'
    when new_status = 'disputed' then 'disputed'
    else 'normal'
  end;

  update public.invoices
  set
    amount_paid = paid_amount,
    balance_due = greatest(0, round((total_amount - paid_amount)::numeric, 2)),
    payment_status = new_payment_status,
    invoice_status = new_status,
    collection_status = new_collection_status,
    overdue_since = case when new_status = 'overdue' then coalesce(overdue_since, due_date) else null end,
    last_payment_at = case when paid_amount > 0 then now() else last_payment_at end
  where id = target_invoice_id;
end;
$$;

create or replace function public.recalculate_payment_allocation_totals(target_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_record public.payments%rowtype;
  allocated numeric(12, 2);
  remaining numeric(12, 2);
  new_status text;
begin
  select * into payment_record
  from public.payments
  where id = target_payment_id
    and deleted_at is null
  for update;

  if payment_record.id is null then
    raise exception 'Payment not found';
  end if;

  if payment_record.payment_status = 'reversed' then
    return;
  end if;

  select coalesce(sum(allocated_amount), 0)::numeric(12, 2)
  into allocated
  from public.payment_allocations
  where payment_id = target_payment_id
    and tenant_id = payment_record.tenant_id
    and allocation_status = 'active'
    and deleted_at is null;

  if allocated > payment_record.amount then
    raise exception 'Payment allocations cannot exceed payment amount';
  end if;

  remaining := round((payment_record.amount - allocated)::numeric, 2);

  if allocated = 0 then
    new_status := 'unallocated';
  elsif remaining = 0 then
    new_status := 'allocated';
  else
    new_status := 'partially_allocated';
  end if;

  update public.payments
  set
    allocated_amount = allocated,
    unallocated_amount = remaining,
    payment_status = new_status
  where id = target_payment_id;
end;
$$;

create or replace function public.create_receipt_for_payment(target_payment_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_record public.payments%rowtype;
  sequence_record public.receipt_number_sequences%rowtype;
  receipt_id uuid;
  receipt_number_value text;
  issuer_snapshot_record public.invoice_issuer_snapshots%rowtype;
begin
  select * into payment_record
  from public.payments
  where id = target_payment_id
    and deleted_at is null
  for update;

  if payment_record.id is null then
    raise exception 'Payment not found';
  end if;

  select id into receipt_id
  from public.receipts
  where tenant_id = payment_record.tenant_id
    and payment_id = payment_record.id
    and deleted_at is null
  limit 1;

  if receipt_id is not null then
    return receipt_id;
  end if;

  insert into public.receipt_number_sequences (
    tenant_id,
    sequence_key,
    prefix,
    next_number,
    padding_length,
    created_by_profile_id,
    updated_by_profile_id
  )
  values (
    payment_record.tenant_id,
    'default',
    'RCT',
    1,
    4,
    auth.uid(),
    auth.uid()
  )
  on conflict (tenant_id, sequence_key) where deleted_at is null do nothing;

  select * into sequence_record
  from public.receipt_number_sequences
  where tenant_id = payment_record.tenant_id
    and sequence_key = 'default'
    and deleted_at is null
  for update;

  receipt_number_value := sequence_record.prefix || '-' || lpad(sequence_record.next_number::text, sequence_record.padding_length, '0') || coalesce(sequence_record.suffix, '');

  select iis.* into issuer_snapshot_record
  from public.invoice_issuer_snapshots iis
  join public.invoices i on i.id = iis.invoice_id
  where i.tenant_id = payment_record.tenant_id
    and i.id = payment_record.primary_invoice_id
    and iis.deleted_at is null
  limit 1;

  insert into public.receipts (
    tenant_id,
    payment_id,
    financial_account_id,
    patient_id,
    responsible_party_id,
    invoice_issuer_snapshot_id,
    receipt_number,
    receipt_prefix,
    receipt_sequence_number,
    receipt_sequence_key,
    payer_snapshot,
    issuer_snapshot,
    payment_amount,
    currency_code,
    payment_reference,
    payment_method,
    issued_by_profile_id,
    created_by_profile_id,
    updated_by_profile_id
  )
  values (
    payment_record.tenant_id,
    payment_record.id,
    payment_record.financial_account_id,
    payment_record.patient_id,
    payment_record.responsible_party_id,
    issuer_snapshot_record.id,
    receipt_number_value,
    sequence_record.prefix,
    sequence_record.next_number,
    sequence_record.sequence_key,
    jsonb_build_object(
      'payer_name', payment_record.payer_name,
      'payer_email', payment_record.payer_email,
      'payer_phone', payment_record.payer_phone
    ),
    coalesce(issuer_snapshot_record.snapshot, '{}'::jsonb),
    payment_record.amount,
    payment_record.currency_code,
    payment_record.payment_reference,
    payment_record.payment_method,
    auth.uid(),
    auth.uid(),
    auth.uid()
  )
  returning id into receipt_id;

  update public.receipt_number_sequences
  set next_number = next_number + 1,
      updated_by_profile_id = auth.uid()
  where id = sequence_record.id;

  return receipt_id;
end;
$$;

create or replace function public.issue_invoice(target_invoice_id uuid)
returns table (
  invoice_id uuid,
  issued_invoice boolean,
  invoice_status text,
  issued_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  invoice_record public.invoices%rowtype;
  previous_status text;
begin
  select * into invoice_record
  from public.invoices
  where id = target_invoice_id
    and deleted_at is null
  for update;

  if invoice_record.id is null then
    raise exception 'Invoice not found';
  end if;

  if not public.has_tenant_role(invoice_record.tenant_id, array['admin', 'finance']) then
    raise exception 'Not allowed to issue this invoice';
  end if;

  if invoice_record.invoice_status in ('issued', 'awaiting_payment', 'partially_paid', 'paid', 'overdue') then
    invoice_id := invoice_record.id;
    issued_invoice := false;
    invoice_status := invoice_record.invoice_status;
    issued_at := invoice_record.issued_at;
    return next;
    return;
  end if;

  if invoice_record.invoice_status <> 'confirmed' then
    raise exception 'Only confirmed invoices can be issued';
  end if;

  previous_status := invoice_record.invoice_status;

  update public.invoices
  set
    invoice_status = 'awaiting_payment',
    issued_at = now(),
    issued_by_profile_id = auth.uid(),
    patient_link_visible = true,
    patient_link_update_ready = true,
    updated_by_profile_id = auth.uid()
  where id = invoice_record.id
  returning * into invoice_record;

  insert into public.invoice_status_history (
    tenant_id, invoice_id, session_id, booking_id, patient_id, from_status, to_status,
    event_type, event_reason, is_patient_visible, created_by_profile_id
  )
  values (
    invoice_record.tenant_id, invoice_record.id, invoice_record.session_id, invoice_record.booking_id, invoice_record.patient_id,
    previous_status, 'awaiting_payment', 'invoice_issued', 'Invoice issued and awaiting payment', true, auth.uid()
  );

  insert into public.invoice_workflow_events (
    tenant_id, invoice_id, session_id, booking_id, patient_id, event_type, idempotency_key, payload, created_by_profile_id
  )
  values (
    invoice_record.tenant_id, invoice_record.id, invoice_record.session_id, invoice_record.booking_id, invoice_record.patient_id,
    'invoice_issued', 'invoice:' || invoice_record.id::text || ':invoice_issued:v1',
    jsonb_build_object('issued_at', invoice_record.issued_at), auth.uid()
  )
  on conflict (tenant_id, idempotency_key) where deleted_at is null do nothing;

  insert into public.patient_history_events (
    tenant_id, patient_id, event_type, event_title, event_body, source_table, source_id,
    is_patient_visible, patient_visible_title, patient_visible_body, occurred_at, created_by_profile_id, metadata
  )
  values (
    invoice_record.tenant_id, invoice_record.patient_id, 'invoice_issued', 'Invoice issued',
    'An invoice was issued and is awaiting payment.', 'invoices', invoice_record.id,
    true, 'Invoice issued', 'An invoice is available from the practice.', now(), auth.uid(),
    jsonb_build_object('invoice_number', invoice_record.invoice_number)
  );

  invoice_id := invoice_record.id;
  issued_invoice := true;
  invoice_status := invoice_record.invoice_status;
  issued_at := invoice_record.issued_at;
  return next;
end;
$$;

create or replace function public.apply_payment_allocations(target_payment_id uuid, allocations jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_record public.payments%rowtype;
  allocation_item jsonb;
  invoice_record public.invoices%rowtype;
  allocation_amount numeric(12, 2);
  allocation_id uuid;
  allocation_order_value integer := 1;
  available_amount numeric(12, 2);
  previous_invoice_status text;
begin
  select * into payment_record
  from public.payments
  where id = target_payment_id
    and deleted_at is null
  for update;

  if payment_record.id is null then
    raise exception 'Payment not found';
  end if;

  if payment_record.payment_status = 'reversed' then
    raise exception 'Reversed payments cannot be allocated';
  end if;

  if allocations is null or jsonb_typeof(allocations) <> 'array' then
    return;
  end if;

  for allocation_item in select * from jsonb_array_elements(allocations)
  loop
    allocation_amount := round(coalesce((allocation_item ->> 'amount')::numeric, 0), 2);
    if allocation_amount <= 0 then
      raise exception 'Allocation amount must be greater than zero';
    end if;

    select * into invoice_record
    from public.invoices
    where id = (allocation_item ->> 'invoice_id')::uuid
      and tenant_id = payment_record.tenant_id
      and deleted_at is null
    for update;

    if invoice_record.id is null then
      raise exception 'Invoice for allocation was not found';
    end if;

    if invoice_record.invoice_status in ('draft', 'review_required', 'ready_to_confirm', 'cancelled', 'voided', 'written_off') then
      raise exception 'Invoice is not eligible for payment allocation';
    end if;

    if invoice_record.currency_code <> payment_record.currency_code then
      raise exception 'Payment and invoice currency must match';
    end if;

    perform public.recalculate_payment_allocation_totals(payment_record.id);

    select (amount - allocated_amount)::numeric(12, 2)
    into available_amount
    from public.payments
    where id = payment_record.id
    for update;

    if allocation_amount > available_amount then
      raise exception 'Allocation exceeds available payment balance';
    end if;

    perform public.recalculate_invoice_payment_balance(invoice_record.id);

    select * into invoice_record
    from public.invoices
    where id = invoice_record.id
    for update;

    if allocation_amount > invoice_record.balance_due then
      raise exception 'Allocation exceeds invoice balance';
    end if;

    previous_invoice_status := invoice_record.invoice_status;

    insert into public.payment_allocations (
      tenant_id,
      payment_id,
      invoice_id,
      financial_account_id,
      patient_id,
      responsible_party_id,
      allocated_amount,
      currency_code,
      allocation_order,
      allocated_by_profile_id,
      idempotency_key,
      created_by_profile_id,
      updated_by_profile_id
    )
    values (
      payment_record.tenant_id,
      payment_record.id,
      invoice_record.id,
      payment_record.financial_account_id,
      invoice_record.patient_id,
      invoice_record.responsible_party_id,
      allocation_amount,
      payment_record.currency_code,
      coalesce((allocation_item ->> 'allocation_order')::integer, allocation_order_value),
      auth.uid(),
      coalesce(allocation_item ->> 'idempotency_key', 'payment:' || payment_record.id::text || ':invoice:' || invoice_record.id::text || ':order:' || allocation_order_value::text),
      auth.uid(),
      auth.uid()
    )
    returning id into allocation_id;

    perform public.recalculate_invoice_payment_balance(invoice_record.id);
    perform public.recalculate_payment_allocation_totals(payment_record.id);

    select * into invoice_record from public.invoices where id = invoice_record.id;

    if previous_invoice_status <> invoice_record.invoice_status then
      insert into public.invoice_status_history (
        tenant_id, invoice_id, session_id, booking_id, patient_id, from_status, to_status,
        event_type, event_reason, is_patient_visible, created_by_profile_id
      )
      values (
        invoice_record.tenant_id, invoice_record.id, invoice_record.session_id, invoice_record.booking_id, invoice_record.patient_id,
        previous_invoice_status, invoice_record.invoice_status,
        case when invoice_record.invoice_status = 'paid' then 'invoice_paid' else 'invoice_partially_paid' end,
        'Payment allocation updated invoice balance', true, auth.uid()
      );
    end if;

    insert into public.payment_workflow_events (
      tenant_id, payment_id, payment_allocation_id, invoice_id, financial_account_id, patient_id,
      responsible_party_id, event_type, idempotency_key, payload, created_by_profile_id
    )
    values (
      payment_record.tenant_id, payment_record.id, allocation_id, invoice_record.id, payment_record.financial_account_id,
      invoice_record.patient_id, invoice_record.responsible_party_id,
      'payment_allocated',
      'payment:' || payment_record.id::text || ':allocation:' || allocation_id::text || ':payment_allocated:v1',
      jsonb_build_object('allocated_amount', allocation_amount, 'invoice_number', invoice_record.invoice_number),
      auth.uid()
    )
    on conflict (tenant_id, idempotency_key) where deleted_at is null do nothing;

    insert into public.patient_history_events (
      tenant_id, patient_id, event_type, event_title, event_body, source_table, source_id,
      is_patient_visible, patient_visible_title, patient_visible_body, occurred_at, created_by_profile_id, metadata
    )
    values (
      invoice_record.tenant_id, invoice_record.patient_id, 'payment_allocated', 'Payment allocated',
      'A payment was allocated to an invoice.', 'payment_allocations', allocation_id,
      true, 'Payment received', 'A payment was received by the practice.', now(), auth.uid(),
      jsonb_build_object('invoice_id', invoice_record.id, 'payment_id', payment_record.id)
    );

    allocation_order_value := allocation_order_value + 1;
  end loop;
end;
$$;

create or replace function public.allocate_payment(target_payment_id uuid, allocations jsonb)
returns table (
  payment_id uuid,
  allocated_amount numeric,
  unallocated_amount numeric,
  payment_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_record public.payments%rowtype;
begin
  select * into payment_record
  from public.payments
  where id = target_payment_id
    and deleted_at is null
  for update;

  if payment_record.id is null then
    raise exception 'Payment not found';
  end if;

  if not public.has_tenant_role(payment_record.tenant_id, array['admin', 'finance']) then
    raise exception 'Not allowed to allocate this payment';
  end if;

  perform public.apply_payment_allocations(payment_record.id, allocations);
  perform public.recalculate_payment_allocation_totals(payment_record.id);

  select * into payment_record from public.payments where id = target_payment_id;

  payment_id := payment_record.id;
  allocated_amount := payment_record.allocated_amount;
  unallocated_amount := payment_record.unallocated_amount;
  payment_status := payment_record.payment_status;
  return next;
end;
$$;

create or replace function public.record_payment(
  target_tenant_id uuid,
  financial_account_id_input uuid,
  patient_id_input uuid,
  responsible_party_id_input uuid,
  primary_invoice_id_input uuid,
  payer_name_input text,
  payment_date_input date,
  amount_input numeric,
  currency_code_input text,
  payment_method_input text,
  payment_reference_input text default null,
  external_transaction_reference_input text default null,
  bank_account_id_input uuid default null,
  therapist_profile_id_input uuid default null,
  practice_location_id_input uuid default null,
  notes_input text default null,
  allocations_input jsonb default '[]'::jsonb
)
returns table (
  payment_id uuid,
  receipt_id uuid,
  allocated_amount numeric,
  unallocated_amount numeric,
  payment_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_payment_id uuid;
  new_receipt_id uuid;
  payment_record public.payments%rowtype;
  new_account_credit_id uuid;
begin
  if not public.has_tenant_role(target_tenant_id, array['admin', 'finance']) then
    raise exception 'Not allowed to record payments for this tenant';
  end if;

  if payer_name_input is null or btrim(payer_name_input) = '' then
    raise exception 'Payer name is required';
  end if;

  if amount_input is null or amount_input <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  if currency_code_input is null or char_length(currency_code_input) <> 3 then
    raise exception 'Valid payment currency is required';
  end if;

  insert into public.payments (
    tenant_id,
    financial_account_id,
    patient_id,
    responsible_party_id,
    primary_invoice_id,
    bank_account_id,
    therapist_profile_id,
    practice_location_id,
    payer_name,
    payment_date,
    amount,
    unallocated_amount,
    currency_code,
    payment_method,
    payment_reference,
    external_transaction_reference,
    notes,
    recorded_by_profile_id,
    created_by_profile_id,
    updated_by_profile_id
  )
  values (
    target_tenant_id,
    financial_account_id_input,
    patient_id_input,
    responsible_party_id_input,
    primary_invoice_id_input,
    bank_account_id_input,
    therapist_profile_id_input,
    practice_location_id_input,
    btrim(payer_name_input),
    coalesce(payment_date_input, current_date),
    round(amount_input, 2),
    round(amount_input, 2),
    upper(currency_code_input),
    payment_method_input,
    nullif(btrim(coalesce(payment_reference_input, '')), ''),
    nullif(btrim(coalesce(external_transaction_reference_input, '')), ''),
    notes_input,
    auth.uid(),
    auth.uid(),
    auth.uid()
  )
  returning id into new_payment_id;

  insert into public.payment_status_history (
    tenant_id, payment_id, financial_account_id, patient_id, responsible_party_id,
    to_status, event_type, event_reason, created_by_profile_id
  )
  values (
    target_tenant_id, new_payment_id, financial_account_id_input, patient_id_input, responsible_party_id_input,
    'recorded', 'payment_recorded', 'Payment recorded', auth.uid()
  );

  insert into public.payment_workflow_events (
    tenant_id, payment_id, financial_account_id, patient_id, responsible_party_id,
    event_type, idempotency_key, payload, created_by_profile_id
  )
  values (
    target_tenant_id, new_payment_id, financial_account_id_input, patient_id_input, responsible_party_id_input,
    'payment_recorded', 'payment:' || new_payment_id::text || ':payment_recorded:v1',
    jsonb_build_object('payment_method', payment_method_input, 'amount', amount_input), auth.uid()
  )
  on conflict (tenant_id, idempotency_key) where deleted_at is null do nothing;

  perform public.apply_payment_allocations(new_payment_id, allocations_input);
  perform public.recalculate_payment_allocation_totals(new_payment_id);

  new_receipt_id := public.create_receipt_for_payment(new_payment_id);

  insert into public.payment_workflow_events (
    tenant_id, payment_id, receipt_id, financial_account_id, patient_id, responsible_party_id,
    event_type, idempotency_key, payload, created_by_profile_id
  )
  values (
    target_tenant_id, new_payment_id, new_receipt_id, financial_account_id_input, patient_id_input, responsible_party_id_input,
    'receipt_created', 'payment:' || new_payment_id::text || ':receipt_created:v1',
    jsonb_build_object('receipt_id', new_receipt_id), auth.uid()
  )
  on conflict (tenant_id, idempotency_key) where deleted_at is null do nothing;

  select * into payment_record from public.payments where id = new_payment_id;

  if payment_record.payment_status <> 'recorded' then
    insert into public.payment_status_history (
      tenant_id, payment_id, financial_account_id, patient_id, responsible_party_id,
      from_status, to_status, event_type, event_reason, created_by_profile_id
    )
    values (
      payment_record.tenant_id,
      payment_record.id,
      payment_record.financial_account_id,
      payment_record.patient_id,
      payment_record.responsible_party_id,
      'recorded',
      payment_record.payment_status,
      case
        when payment_record.payment_status = 'allocated' then 'payment_allocated'
        when payment_record.payment_status = 'partially_allocated' then 'payment_partially_allocated'
        else 'payment_unallocated'
      end,
      'Payment allocation status calculated',
      auth.uid()
    );
  end if;

  if payment_record.unallocated_amount > 0 then
    insert into public.account_credits (
      tenant_id,
      financial_account_id,
      patient_id,
      responsible_party_id,
      source_payment_id,
      original_amount,
      remaining_amount,
      currency_code,
      credit_reason,
      created_by_profile_id,
      updated_by_profile_id
    )
    values (
      payment_record.tenant_id,
      payment_record.financial_account_id,
      payment_record.patient_id,
      payment_record.responsible_party_id,
      payment_record.id,
      payment_record.unallocated_amount,
      payment_record.unallocated_amount,
      payment_record.currency_code,
      'Unallocated payment balance',
      auth.uid(),
      auth.uid()
    )
    returning id into new_account_credit_id;

    insert into public.payment_workflow_events (
      tenant_id, payment_id, financial_account_id, patient_id, responsible_party_id,
      event_type, idempotency_key, payload, created_by_profile_id
    )
    values (
      payment_record.tenant_id,
      payment_record.id,
      payment_record.financial_account_id,
      payment_record.patient_id,
      payment_record.responsible_party_id,
      'account_credit_created',
      'payment:' || payment_record.id::text || ':account_credit_created:v1',
      jsonb_build_object('account_credit_id', new_account_credit_id, 'remaining_amount', payment_record.unallocated_amount),
      auth.uid()
    )
    on conflict (tenant_id, idempotency_key) where deleted_at is null do nothing;
  end if;

  if payment_record.patient_id is not null then
    insert into public.patient_history_events (
      tenant_id, patient_id, event_type, event_title, event_body, source_table, source_id,
      is_patient_visible, patient_visible_title, patient_visible_body, occurred_at, created_by_profile_id, metadata
    )
    values (
      payment_record.tenant_id, payment_record.patient_id, 'payment_recorded', 'Payment recorded',
      'A payment was recorded on the account.', 'payments', payment_record.id,
      true, 'Payment received', 'A payment was received by the practice.', now(), auth.uid(),
      jsonb_build_object('payment_id', payment_record.id, 'receipt_id', new_receipt_id)
    );
  end if;

  payment_id := payment_record.id;
  receipt_id := new_receipt_id;
  allocated_amount := payment_record.allocated_amount;
  unallocated_amount := payment_record.unallocated_amount;
  payment_status := payment_record.payment_status;
  return next;
end;
$$;

create or replace function public.reverse_payment(target_payment_id uuid, reversal_reason_input text)
returns table (
  payment_id uuid,
  reversed_payment boolean,
  payment_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_record public.payments%rowtype;
  allocation_record public.payment_allocations%rowtype;
  affected_invoice_ids uuid[] := '{}';
  affected_invoice_id uuid;
begin
  select * into payment_record
  from public.payments
  where id = target_payment_id
    and deleted_at is null
  for update;

  if payment_record.id is null then
    raise exception 'Payment not found';
  end if;

  if not public.has_tenant_role(payment_record.tenant_id, array['admin', 'finance']) then
    raise exception 'Not allowed to reverse this payment';
  end if;

  if reversal_reason_input is null or btrim(reversal_reason_input) = '' then
    raise exception 'Payment reversal reason is required';
  end if;

  if payment_record.payment_status = 'reversed' then
    payment_id := payment_record.id;
    reversed_payment := false;
    payment_status := payment_record.payment_status;
    return next;
    return;
  end if;

  for allocation_record in
    select * from public.payment_allocations
    where payment_id = payment_record.id
      and tenant_id = payment_record.tenant_id
      and allocation_status = 'active'
      and deleted_at is null
    for update
  loop
    update public.payment_allocations
    set
      allocation_status = 'reversed',
      reversed_at = now(),
      reversed_by_profile_id = auth.uid(),
      reversal_reason = reversal_reason_input,
      updated_by_profile_id = auth.uid()
    where id = allocation_record.id;

    affected_invoice_ids := array_append(affected_invoice_ids, allocation_record.invoice_id);

    insert into public.payment_workflow_events (
      tenant_id, payment_id, payment_allocation_id, invoice_id, financial_account_id, patient_id,
      responsible_party_id, event_type, idempotency_key, payload, created_by_profile_id
    )
    values (
      payment_record.tenant_id, payment_record.id, allocation_record.id, allocation_record.invoice_id,
      payment_record.financial_account_id, allocation_record.patient_id, allocation_record.responsible_party_id,
      'allocation_reversed',
      'payment:' || payment_record.id::text || ':allocation:' || allocation_record.id::text || ':allocation_reversed:v1',
      jsonb_build_object('reason', reversal_reason_input), auth.uid()
    )
    on conflict (tenant_id, idempotency_key) where deleted_at is null do nothing;
  end loop;

  update public.payments
  set
    payment_status = 'reversed',
    reconciliation_status = 'reversed',
    allocated_amount = 0,
    unallocated_amount = 0,
    reversed_at = now(),
    reversed_by_profile_id = auth.uid(),
    reversal_reason = reversal_reason_input,
    updated_by_profile_id = auth.uid()
  where id = payment_record.id
  returning * into payment_record;

  if array_length(affected_invoice_ids, 1) is not null then
    for affected_invoice_id in
      select distinct unnest(affected_invoice_ids)
    loop
      perform public.recalculate_invoice_payment_balance(affected_invoice_id);
    end loop;
  end if;

  update public.receipts
  set
    receipt_status = 'reversed',
    reversed_at = now(),
    reversed_by_profile_id = auth.uid(),
    reversal_reason = reversal_reason_input,
    updated_by_profile_id = auth.uid()
  where payment_id = payment_record.id
    and tenant_id = payment_record.tenant_id
    and deleted_at is null
    and receipt_status = 'issued';

  insert into public.payment_status_history (
    tenant_id, payment_id, financial_account_id, patient_id, responsible_party_id,
    from_status, to_status, event_type, event_reason, created_by_profile_id
  )
  values (
    payment_record.tenant_id, payment_record.id, payment_record.financial_account_id, payment_record.patient_id,
    payment_record.responsible_party_id, 'recorded', 'reversed', 'payment_reversed', reversal_reason_input, auth.uid()
  );

  insert into public.payment_workflow_events (
    tenant_id, payment_id, financial_account_id, patient_id, responsible_party_id,
    event_type, idempotency_key, payload, created_by_profile_id
  )
  values (
    payment_record.tenant_id, payment_record.id, payment_record.financial_account_id, payment_record.patient_id,
    payment_record.responsible_party_id, 'payment_reversed',
    'payment:' || payment_record.id::text || ':payment_reversed:v1',
    jsonb_build_object('reason', reversal_reason_input), auth.uid()
  )
  on conflict (tenant_id, idempotency_key) where deleted_at is null do nothing;

  if payment_record.patient_id is not null then
    insert into public.patient_history_events (
      tenant_id, patient_id, event_type, event_title, event_body, source_table, source_id,
      is_patient_visible, occurred_at, created_by_profile_id, metadata
    )
    values (
      payment_record.tenant_id, payment_record.patient_id, 'payment_reversed', 'Payment reversed',
      'A payment was reversed on the account.', 'payments', payment_record.id,
      false, now(), auth.uid(), jsonb_build_object('payment_id', payment_record.id)
    );
  end if;

  payment_id := payment_record.id;
  reversed_payment := true;
  payment_status := payment_record.payment_status;
  return next;
end;
$$;

revoke all on function public.validate_financial_account_tenant_integrity() from public, anon, authenticated;
revoke all on function public.validate_payment_tenant_integrity() from public, anon, authenticated;
revoke all on function public.validate_payment_allocation_tenant_integrity() from public, anon, authenticated;
revoke all on function public.recalculate_invoice_payment_balance(uuid) from public, anon, authenticated;
revoke all on function public.recalculate_payment_allocation_totals(uuid) from public, anon, authenticated;
revoke all on function public.create_receipt_for_payment(uuid) from public, anon, authenticated;
revoke all on function public.apply_payment_allocations(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.issue_invoice(uuid) from public, anon;
revoke all on function public.allocate_payment(uuid, jsonb) from public, anon;
revoke all on function public.record_payment(uuid, uuid, uuid, uuid, uuid, text, date, numeric, text, text, text, text, uuid, uuid, uuid, text, jsonb) from public, anon;
revoke all on function public.reverse_payment(uuid, text) from public, anon;

grant execute on function public.issue_invoice(uuid) to authenticated;
grant execute on function public.allocate_payment(uuid, jsonb) to authenticated;
grant execute on function public.record_payment(uuid, uuid, uuid, uuid, uuid, text, date, numeric, text, text, text, text, uuid, uuid, uuid, text, jsonb) to authenticated;
grant execute on function public.reverse_payment(uuid, text) to authenticated;

revoke all on public.financial_accounts from anon, authenticated;
revoke all on public.payments from anon, authenticated;
revoke all on public.payment_allocations from anon, authenticated;
revoke all on public.account_credits from anon, authenticated;
revoke all on public.receipt_number_sequences from anon, authenticated;
revoke all on public.receipts from anon, authenticated;
revoke all on public.payment_status_history from anon, authenticated;
revoke all on public.payment_workflow_events from anon, authenticated;

grant select, insert, update on public.financial_accounts to authenticated;
grant select, insert, update on public.payments to authenticated;
grant select, insert, update on public.payment_allocations to authenticated;
grant select, insert, update on public.account_credits to authenticated;
grant select, insert, update on public.receipt_number_sequences to authenticated;
grant select, insert, update on public.receipts to authenticated;
grant select, insert, update on public.payment_status_history to authenticated;
grant select, insert, update on public.payment_workflow_events to authenticated;

comment on table public.payments is 'Tenant-scoped payment records. Allocations are authoritative for invoice balances; no hard deletes.';
comment on table public.payment_allocations is 'Allocates payment amounts to invoices. Supports partial payments and many-to-many payment/invoice relationships.';
comment on table public.account_credits is 'Future-ready account credit ledger for unallocated payments, overpayments, credit notes and refunds.';
comment on table public.receipts is 'Receipt readiness records created from payments. PDF delivery and communication remain future workflows.';

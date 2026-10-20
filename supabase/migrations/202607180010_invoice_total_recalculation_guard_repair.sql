-- Permit internal draft-invoice total recalculation without weakening the
-- protected invoice lifecycle. No invoice data is changed by this migration.

create table public.invoice_internal_recalculation_context (
  transaction_id bigint not null,
  backend_pid integer not null,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  operation text not null check (operation = 'recalculate_invoice_totals'),
  created_at timestamptz not null default now(),
  primary key (transaction_id, backend_pid, invoice_id, operation)
);

alter table public.invoice_internal_recalculation_context enable row level security;

revoke all on table public.invoice_internal_recalculation_context from public, anon, authenticated;

comment on table public.invoice_internal_recalculation_context is
  'Internal transaction-scoped authorization markers for derived draft invoice total updates. Client roles have no access and no RLS policies.';

create or replace function public.recalculate_invoice_totals(target_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  invoice_record public.invoices%rowtype;
  totals record;
  current_transaction_id bigint := txid_current();
  current_backend_pid integer := pg_backend_pid();
begin
  select i.*
  into invoice_record
  from public.invoices i
  where i.id = target_invoice_id
    and i.deleted_at is null
  for update;

  if invoice_record.id is null then
    raise exception 'Invoice not found';
  end if;

  if invoice_record.invoice_status not in ('draft', 'review_required', 'ready_to_confirm') then
    raise exception 'Invoice totals can only be recalculated while the invoice is editable';
  end if;

  select
    coalesce(sum(il.line_subtotal), 0)::numeric(12, 2) as subtotal_amount,
    coalesce(sum(il.discount_amount), 0)::numeric(12, 2) as discount_total,
    coalesce(sum(il.adjustment_amount), 0)::numeric(12, 2) as adjustment_total,
    coalesce(sum(il.line_subtotal - il.discount_amount + il.adjustment_amount), 0)::numeric(12, 2) as taxable_amount,
    coalesce(sum(il.tax_amount), 0)::numeric(12, 2) as tax_total,
    coalesce(sum(il.line_total), 0)::numeric(12, 2) as line_total
  into totals
  from public.invoice_lines il
  where il.invoice_id = target_invoice_id
    and il.deleted_at is null;

  insert into public.invoice_internal_recalculation_context (
    transaction_id,
    backend_pid,
    tenant_id,
    invoice_id,
    operation
  )
  values (
    current_transaction_id,
    current_backend_pid,
    invoice_record.tenant_id,
    invoice_record.id,
    'recalculate_invoice_totals'
  );

  update public.invoices i
  set
    subtotal_amount = totals.subtotal_amount,
    discount_total = totals.discount_total,
    adjustment_total = totals.adjustment_total,
    taxable_amount = totals.taxable_amount,
    tax_total = totals.tax_total,
    total_amount = round((totals.line_total + i.rounding_adjustment)::numeric, 2),
    balance_due = greatest(
      0,
      round((totals.line_total + i.rounding_adjustment - i.amount_paid)::numeric, 2)
    )
  where i.id = invoice_record.id
    and i.tenant_id = invoice_record.tenant_id
    and i.deleted_at is null;

  delete from public.invoice_internal_recalculation_context c
  where c.transaction_id = current_transaction_id
    and c.backend_pid = current_backend_pid
    and c.tenant_id = invoice_record.tenant_id
    and c.invoice_id = invoice_record.id
    and c.operation = 'recalculate_invoice_totals';
exception
  when others then
    delete from public.invoice_internal_recalculation_context c
    where c.transaction_id = current_transaction_id
      and c.backend_pid = current_backend_pid
      and c.invoice_id = target_invoice_id
      and c.operation = 'recalculate_invoice_totals';
    raise;
end;
$$;

revoke all on function public.recalculate_invoice_totals(uuid) from public, anon, authenticated;

comment on function public.recalculate_invoice_totals(uuid) is
  'Internal helper that recalculates editable invoice totals under an exact transaction-scoped authorization marker. Direct client execution is denied.';

create or replace function public.prevent_direct_invoice_lifecycle_update()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  call_stack text := '';
  lifecycle_change boolean;
  approved_rpc_call boolean;
  approved_total_recalculation boolean;
begin
  get diagnostics call_stack = pg_context;

  lifecycle_change :=
    old.invoice_status is distinct from new.invoice_status
    or old.payment_status is distinct from new.payment_status
    or old.confirmed_at is distinct from new.confirmed_at
    or old.issued_at is distinct from new.issued_at
    or old.last_payment_at is distinct from new.last_payment_at
    or old.cancelled_at is distinct from new.cancelled_at
    or old.amount_paid is distinct from new.amount_paid
    or old.balance_due is distinct from new.balance_due;

  approved_rpc_call :=
    call_stack like '%PL/pgSQL function confirm_invoice(%'
    or call_stack like '%PL/pgSQL function issue_invoice(%'
    or call_stack like '%PL/pgSQL function recalculate_invoice_payment_balance(%';

  approved_total_recalculation :=
    old.invoice_status in ('draft', 'review_required', 'ready_to_confirm')
    and new.invoice_status = old.invoice_status
    and new.payment_status is not distinct from old.payment_status
    and new.confirmed_at is not distinct from old.confirmed_at
    and new.issued_at is not distinct from old.issued_at
    and new.last_payment_at is not distinct from old.last_payment_at
    and new.cancelled_at is not distinct from old.cancelled_at
    and new.amount_paid is not distinct from old.amount_paid
    and new.balance_due = greatest(0, round((new.total_amount - new.amount_paid)::numeric, 2))
    and exists (
      select 1
      from public.invoice_internal_recalculation_context c
      where c.transaction_id = txid_current()
        and c.backend_pid = pg_backend_pid()
        and c.tenant_id = new.tenant_id
        and c.invoice_id = new.id
        and c.operation = 'recalculate_invoice_totals'
    );

  if lifecycle_change
    and auth.uid() is not null
    and not approved_rpc_call
    and not approved_total_recalculation
  then
    raise exception 'Invoice lifecycle changes must use approved RPCs';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_direct_invoice_lifecycle_update() from public, anon, authenticated;

comment on function public.prevent_direct_invoice_lifecycle_update() is
  'Blocks direct authenticated invoice lifecycle mutations. Editable derived-total updates require an exact internal transaction marker; approved lifecycle RPCs remain allowed.';

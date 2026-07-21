-- Operational readiness repair:
-- The first direct lifecycle guard used current_user, but trigger functions run
-- as SECURITY DEFINER and therefore cannot distinguish direct authenticated
-- table updates from approved RPC-driven updates by current_user alone.
--
-- This forward-only repair inspects the PL/pgSQL call stack. Approved
-- lifecycle RPCs leave their function names in PG_CONTEXT; direct client table
-- updates do not. This preserves existing RPC workflows while blocking direct
-- mutation of protected lifecycle columns.

create or replace function public.prevent_direct_session_lifecycle_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  call_stack text := '';
  lifecycle_change boolean;
  approved_rpc_call boolean;
begin
  get diagnostics call_stack = pg_context;

  lifecycle_change :=
    old.session_status is distinct from new.session_status
    or old.attendance_outcome is distinct from new.attendance_outcome
    or old.session_outcome is distinct from new.session_outcome
    or old.completed_at is distinct from new.completed_at
    or old.cancelled_at is distinct from new.cancelled_at
    or old.no_show_at is distinct from new.no_show_at;

  approved_rpc_call :=
    call_stack like '%PL/pgSQL function complete_session(%'
    or call_stack like '%PL/pgSQL function reopen_completed_session(%';

  if lifecycle_change
    and auth.uid() is not null
    and not approved_rpc_call
  then
    raise exception 'Session lifecycle changes must use approved RPCs';
  end if;

  return new;
end;
$$;

create or replace function public.prevent_direct_invoice_lifecycle_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  call_stack text := '';
  lifecycle_change boolean;
  approved_rpc_call boolean;
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

  if lifecycle_change
    and auth.uid() is not null
    and not approved_rpc_call
  then
    raise exception 'Invoice lifecycle changes must use approved RPCs';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_direct_session_lifecycle_update() from public, anon, authenticated;
revoke all on function public.prevent_direct_invoice_lifecycle_update() from public, anon, authenticated;

comment on function public.prevent_direct_session_lifecycle_update() is
  'Operational readiness guard: authenticated clients cannot directly mutate protected session lifecycle fields; approved lifecycle RPC call stacks remain allowed.';

comment on function public.prevent_direct_invoice_lifecycle_update() is
  'Operational readiness guard: authenticated clients cannot directly mutate protected invoice lifecycle fields; approved lifecycle RPC call stacks remain allowed.';

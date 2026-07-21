-- Operational readiness repair:
-- Prevent authenticated clients from bypassing protected lifecycle RPCs by
-- directly updating session or invoice lifecycle status fields.
--
-- Existing lifecycle RPCs are SECURITY DEFINER functions and continue to update
-- these fields through controlled server-side code paths. Direct authenticated
-- table updates must not change lifecycle state.

create or replace function public.prevent_direct_session_lifecycle_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_user = 'authenticated'
    and (
      old.session_status is distinct from new.session_status
      or old.attendance_outcome is distinct from new.attendance_outcome
      or old.session_outcome is distinct from new.session_outcome
      or old.completed_at is distinct from new.completed_at
      or old.cancelled_at is distinct from new.cancelled_at
      or old.no_show_at is distinct from new.no_show_at
    )
  then
    raise exception 'Session lifecycle changes must use approved RPCs';
  end if;

  return new;
end;
$$;

drop trigger if exists sessions_prevent_direct_lifecycle_update on public.sessions;

create trigger sessions_prevent_direct_lifecycle_update
before update of session_status, attendance_outcome, session_outcome, completed_at, cancelled_at, no_show_at
on public.sessions
for each row
execute function public.prevent_direct_session_lifecycle_update();

create or replace function public.prevent_direct_invoice_lifecycle_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_user = 'authenticated'
    and (
      old.invoice_status is distinct from new.invoice_status
      or old.payment_status is distinct from new.payment_status
      or old.confirmed_at is distinct from new.confirmed_at
      or old.issued_at is distinct from new.issued_at
      or old.last_payment_at is distinct from new.last_payment_at
      or old.cancelled_at is distinct from new.cancelled_at
      or old.amount_paid is distinct from new.amount_paid
      or old.balance_due is distinct from new.balance_due
    )
  then
    raise exception 'Invoice lifecycle changes must use approved RPCs';
  end if;

  return new;
end;
$$;

drop trigger if exists invoices_prevent_direct_lifecycle_update on public.invoices;

create trigger invoices_prevent_direct_lifecycle_update
before update of invoice_status, payment_status, confirmed_at, issued_at, last_payment_at, cancelled_at, amount_paid, balance_due
on public.invoices
for each row
execute function public.prevent_direct_invoice_lifecycle_update();

revoke all on function public.prevent_direct_session_lifecycle_update() from public, anon, authenticated;
revoke all on function public.prevent_direct_invoice_lifecycle_update() from public, anon, authenticated;

comment on function public.prevent_direct_session_lifecycle_update() is
  'Operational readiness guard: authenticated clients cannot directly mutate protected session lifecycle fields; approved SECURITY DEFINER RPCs remain the lifecycle path.';

comment on function public.prevent_direct_invoice_lifecycle_update() is
  'Operational readiness guard: authenticated clients cannot directly mutate protected invoice lifecycle fields; approved SECURITY DEFINER RPCs remain the lifecycle path.';

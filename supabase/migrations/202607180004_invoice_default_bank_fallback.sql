-- Ensure new invoice issuer snapshots use the tenant's default practice bank
-- account when Billing Configuration has not stipulated another account.
-- Existing explicit snapshot values always take precedence.

create or replace function public.apply_default_bank_to_invoice_issuer_snapshot()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  default_bank public.bank_accounts%rowtype;
begin
  if new.bank_account_id is not null
    or new.bank_name is not null
    or new.bank_account_number is not null then
    return new;
  end if;

  select ba.*
  into default_bank
  from public.bank_accounts ba
  where ba.tenant_id = new.tenant_id
    and ba.owner_type = 'tenant'
    and ba.owner_id is null
    and ba.is_default = true
    and ba.is_active = true
    and ba.deleted_at is null
  order by ba.created_at asc
  limit 1;

  if default_bank.id is null then
    return new;
  end if;

  new.bank_account_id := default_bank.id;
  new.bank_account_holder := default_bank.account_holder;
  new.bank_name := default_bank.bank_name;
  new.bank_account_number := default_bank.account_number;
  new.bank_branch_code := default_bank.branch_code;
  new.bank_account_type := default_bank.account_type;

  return new;
end;
$$;

drop trigger if exists invoice_issuer_snapshots_apply_default_bank
on public.invoice_issuer_snapshots;

create trigger invoice_issuer_snapshots_apply_default_bank
before insert on public.invoice_issuer_snapshots
for each row
execute function public.apply_default_bank_to_invoice_issuer_snapshot();

comment on function public.apply_default_bank_to_invoice_issuer_snapshot() is
  'Uses the active tenant-owned default bank account only when an invoice issuer snapshot has no explicitly stipulated bank account.';

revoke all on function public.apply_default_bank_to_invoice_issuer_snapshot() from public, anon, authenticated;

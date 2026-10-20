-- Preserve the financial and presentation content of confirmed invoices.
--
-- This forward-only hardening intentionally does not modify existing invoice
-- rows or fabricate missing historical snapshot values. It captures the Main
-- location for future issuer snapshots and prevents confirmed invoice content
-- from being changed outside a future explicit correction workflow.

create or replace function public.capture_invoice_main_location_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  main_location public.practice_locations%rowtype;
  main_address jsonb;
begin
  if coalesce(new.snapshot, '{}'::jsonb) ? 'main_location' then
    return new;
  end if;

  select pl.*
  into main_location
  from public.practice_locations pl
  where pl.tenant_id = new.tenant_id
    and pl.is_main_location = true
    and pl.is_active = true
    and pl.deleted_at is null
  order by pl.created_at asc, pl.id asc
  limit 1;

  if main_location.id is null then
    return new;
  end if;

  main_address := jsonb_strip_nulls(jsonb_build_object(
    'address_line_1', main_location.address_line_1,
    'address_line_2', main_location.address_line_2,
    'suburb', main_location.suburb,
    'city', main_location.city,
    'province', main_location.province,
    'postal_code', main_location.postal_code,
    'country', main_location.country
  ));

  new.practice_address := main_address;
  new.snapshot := coalesce(new.snapshot, '{}'::jsonb) || jsonb_build_object(
    'main_location',
    jsonb_strip_nulls(jsonb_build_object(
      'id', main_location.id,
      'name', main_location.location_name,
      'email', main_location.contact_email,
      'phone', main_location.contact_phone,
      'address', main_address
    ))
  );

  return new;
end;
$$;

drop trigger if exists invoice_issuer_snapshots_capture_main_location
on public.invoice_issuer_snapshots;

create trigger invoice_issuer_snapshots_capture_main_location
before insert on public.invoice_issuer_snapshots
for each row
execute function public.capture_invoice_main_location_snapshot();

create or replace function public.prevent_final_invoice_header_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.invoice_status not in ('draft', 'review_required', 'ready_to_confirm')
    and row(
      old.tenant_id,
      old.patient_id,
      old.responsible_party_id,
      old.booking_id,
      old.session_id,
      old.therapist_profile_id,
      old.practice_location_id,
      old.source_workflow_event_id,
      old.source_type,
      old.draft_reference,
      old.invoice_number,
      old.invoice_prefix,
      old.invoice_sequence_number,
      old.invoice_sequence_key,
      old.invoice_date,
      old.service_date,
      old.due_date,
      old.payment_terms_days,
      old.currency_code,
      old.subtotal_amount,
      old.discount_total,
      old.adjustment_total,
      old.taxable_amount,
      old.tax_total,
      old.rounding_adjustment,
      old.total_amount,
      old.metadata,
      old.deleted_at,
      old.created_by_profile_id,
      old.created_at
    ) is distinct from row(
      new.tenant_id,
      new.patient_id,
      new.responsible_party_id,
      new.booking_id,
      new.session_id,
      new.therapist_profile_id,
      new.practice_location_id,
      new.source_workflow_event_id,
      new.source_type,
      new.draft_reference,
      new.invoice_number,
      new.invoice_prefix,
      new.invoice_sequence_number,
      new.invoice_sequence_key,
      new.invoice_date,
      new.service_date,
      new.due_date,
      new.payment_terms_days,
      new.currency_code,
      new.subtotal_amount,
      new.discount_total,
      new.adjustment_total,
      new.taxable_amount,
      new.tax_total,
      new.rounding_adjustment,
      new.total_amount,
      new.metadata,
      new.deleted_at,
      new.created_by_profile_id,
      new.created_at
    )
  then
    raise exception 'Confirmed invoice content is immutable; use an approved correction workflow';
  end if;

  return new;
end;
$$;

drop trigger if exists invoices_prevent_final_content_mutation on public.invoices;

create trigger invoices_prevent_final_content_mutation
before update on public.invoices
for each row
execute function public.prevent_final_invoice_header_mutation();

create or replace function public.prevent_final_invoice_child_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  protected_invoice_exists boolean;
begin
  if tg_op = 'INSERT' then
    select exists (
      select 1
      from public.invoices i
      where i.id = new.invoice_id
        and i.invoice_status not in ('draft', 'review_required', 'ready_to_confirm')
    ) into protected_invoice_exists;
  elsif tg_op = 'UPDATE' then
    select exists (
      select 1
      from public.invoices i
      where i.id = any(array[old.invoice_id, new.invoice_id])
        and i.invoice_status not in ('draft', 'review_required', 'ready_to_confirm')
    ) into protected_invoice_exists;
  else
    select exists (
      select 1
      from public.invoices i
      where i.id = old.invoice_id
        and i.invoice_status not in ('draft', 'review_required', 'ready_to_confirm')
    ) into protected_invoice_exists;
  end if;

  if protected_invoice_exists then
    raise exception 'Confirmed invoice lines and snapshots are immutable; use an approved correction workflow';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists invoice_lines_prevent_final_mutation on public.invoice_lines;
create trigger invoice_lines_prevent_final_mutation
before insert or update or delete on public.invoice_lines
for each row execute function public.prevent_final_invoice_child_mutation();

drop trigger if exists invoice_party_snapshots_prevent_final_mutation on public.invoice_party_snapshots;
create trigger invoice_party_snapshots_prevent_final_mutation
before insert or update or delete on public.invoice_party_snapshots
for each row execute function public.prevent_final_invoice_child_mutation();

drop trigger if exists invoice_issuer_snapshots_prevent_final_mutation on public.invoice_issuer_snapshots;
create trigger invoice_issuer_snapshots_prevent_final_mutation
before insert or update or delete on public.invoice_issuer_snapshots
for each row execute function public.prevent_final_invoice_child_mutation();

revoke all on function public.capture_invoice_main_location_snapshot() from public, anon, authenticated;
revoke all on function public.prevent_final_invoice_header_mutation() from public, anon, authenticated;
revoke all on function public.prevent_final_invoice_child_mutation() from public, anon, authenticated;

comment on function public.capture_invoice_main_location_snapshot() is
  'Captures the active Main location in future invoice issuer snapshots without changing existing invoices.';

comment on function public.prevent_final_invoice_header_mutation() is
  'Prevents confirmed invoice identity, dates, totals and source content from destructive mutation while allowing approved lifecycle and payment fields to change.';

comment on function public.prevent_final_invoice_child_mutation() is
  'Makes invoice lines and party/issuer snapshots immutable after the invoice leaves its editable draft states.';

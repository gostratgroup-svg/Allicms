-- Preserve procedure-specific ICD-10 snapshots from Booking through Session
-- and Invoice without changing historical invoice records.

create or replace function public.preserve_session_procedure_icd10_snapshot()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  booking_icd10 text;
begin
  if new.booking_procedure_id is null
    or nullif(btrim(coalesce(new.metadata ->> 'icd10_code', '')), '') is not null
  then
    return new;
  end if;

  select nullif(btrim(bp.metadata ->> 'icd10_code'), '')
  into booking_icd10
  from public.booking_procedures bp
  where bp.id = new.booking_procedure_id
    and bp.tenant_id = new.tenant_id
    and bp.deleted_at is null;

  if booking_icd10 is not null then
    new.metadata := jsonb_set(
      coalesce(new.metadata, '{}'::jsonb),
      '{icd10_code}',
      to_jsonb(booking_icd10),
      true
    );
  end if;

  return new;
end;
$$;

revoke all on function public.preserve_session_procedure_icd10_snapshot() from public, anon, authenticated;

drop trigger if exists session_procedures_preserve_icd10_snapshot on public.session_procedures;
create trigger session_procedures_preserve_icd10_snapshot
before insert or update of booking_procedure_id, metadata
on public.session_procedures
for each row
execute function public.preserve_session_procedure_icd10_snapshot();

create or replace function public.prefer_procedure_icd10_on_invoice_line()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  procedure_icd10 text;
begin
  if new.source_session_procedure_id is null then
    return new;
  end if;

  select coalesce(
    nullif(btrim(sp.metadata ->> 'icd10_code'), ''),
    nullif(btrim(bp.metadata ->> 'icd10_code'), '')
  )
  into procedure_icd10
  from public.session_procedures sp
  left join public.booking_procedures bp
    on bp.id = sp.booking_procedure_id
   and bp.tenant_id = sp.tenant_id
   and bp.deleted_at is null
  where sp.id = new.source_session_procedure_id
    and sp.tenant_id = new.tenant_id
    and sp.deleted_at is null;

  if procedure_icd10 is not null then
    new.icd10_code := procedure_icd10;
  end if;

  return new;
end;
$$;

revoke all on function public.prefer_procedure_icd10_on_invoice_line() from public, anon, authenticated;

drop trigger if exists invoice_lines_prefer_procedure_icd10 on public.invoice_lines;
create trigger invoice_lines_prefer_procedure_icd10
before insert on public.invoice_lines
for each row
execute function public.prefer_procedure_icd10_on_invoice_line();

comment on function public.preserve_session_procedure_icd10_snapshot() is
  'Copies a selected Booking procedure ICD-10 snapshot into its Session procedure when no Session-specific value exists.';

comment on function public.prefer_procedure_icd10_on_invoice_line() is
  'Gives a source procedure ICD-10 snapshot precedence over the patient-level fallback during Invoice line creation.';

-- AlliDesk Phase 4B: Price list foundation.
-- Scope: price_lists and price_list_items.
--
-- This migration intentionally does not connect bookings, invoices,
-- statements, payments, medical aid claims, or operational workflow logic.
--
-- Architecture notes:
-- - ICD-10 remains patient-level and is not stored on price list items.
-- - Price list items will later become selected appointment and invoice
--   line items.
-- - Future booking and invoice integration should snapshot selected price
--   list item details instead of mutating historic finance records.

create table public.price_lists (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  description text,
  list_type text,
  is_default boolean not null default false,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint price_lists_name_not_blank_check
    check (btrim(name) <> '')
);

create table public.price_list_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  price_list_id uuid not null references public.price_lists(id) on delete cascade,
  procedure_name text not null,
  procedure_code text,
  description text,
  price numeric(12, 2) not null default 0,
  duration_minutes integer,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint price_list_items_procedure_name_not_blank_check
    check (btrim(procedure_name) <> ''),
  constraint price_list_items_procedure_code_not_blank_check
    check (procedure_code is null or btrim(procedure_code) <> ''),
  constraint price_list_items_price_check
    check (price >= 0),
  constraint price_list_items_duration_minutes_check
    check (duration_minutes is null or duration_minutes > 0)
);

create trigger price_lists_set_updated_at
before update on public.price_lists
for each row execute function public.set_updated_at();

create trigger price_list_items_set_updated_at
before update on public.price_list_items
for each row execute function public.set_updated_at();

create index price_lists_tenant_id_idx
  on public.price_lists (tenant_id)
  where deleted_at is null;

create index price_lists_is_default_idx
  on public.price_lists (tenant_id, is_default)
  where deleted_at is null;

create index price_lists_is_active_idx
  on public.price_lists (tenant_id, is_active)
  where deleted_at is null;

create index price_lists_deleted_at_idx
  on public.price_lists (deleted_at);

create unique index price_lists_unique_name_per_tenant_idx
  on public.price_lists (tenant_id, lower(name))
  where deleted_at is null;

create unique index price_lists_one_default_per_tenant_idx
  on public.price_lists (tenant_id)
  where deleted_at is null and is_default = true;

create index price_list_items_tenant_id_idx
  on public.price_list_items (tenant_id)
  where deleted_at is null;

create index price_list_items_price_list_id_idx
  on public.price_list_items (price_list_id)
  where deleted_at is null;

create index price_list_items_procedure_code_idx
  on public.price_list_items (tenant_id, procedure_code)
  where procedure_code is not null and deleted_at is null;

create index price_list_items_is_active_idx
  on public.price_list_items (tenant_id, is_active)
  where deleted_at is null;

create index price_list_items_deleted_at_idx
  on public.price_list_items (deleted_at);

create unique index price_list_items_unique_active_code_per_list_idx
  on public.price_list_items (price_list_id, lower(procedure_code))
  where procedure_code is not null and deleted_at is null and is_active = true;

alter table public.price_lists enable row level security;
alter table public.price_list_items enable row level security;

create policy "tenant admins and finance users can read price lists"
on public.price_lists
for select
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin', 'finance'])
);

create policy "tenant admins and finance users can create price lists"
on public.price_lists
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant admins and finance users can update price lists"
on public.price_lists
for update
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin', 'finance'])
)
with check (public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant admins and finance users can read price list items"
on public.price_list_items
for select
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin', 'finance'])
);

create policy "tenant admins and finance users can create price list items"
on public.price_list_items
for insert
to authenticated
with check (public.has_tenant_role(tenant_id, array['admin', 'finance']));

create policy "tenant admins and finance users can update price list items"
on public.price_list_items
for update
to authenticated
using (
  deleted_at is null
  and public.has_tenant_role(tenant_id, array['admin', 'finance'])
)
with check (public.has_tenant_role(tenant_id, array['admin', 'finance']));

revoke all on public.price_lists from anon, authenticated;
revoke all on public.price_list_items from anon, authenticated;

grant select, insert, update on public.price_lists to authenticated;
grant select, insert, update on public.price_list_items to authenticated;

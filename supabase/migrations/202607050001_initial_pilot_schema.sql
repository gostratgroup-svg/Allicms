-- AlliDesk pilot live-data backend.
-- Do not load real patient data into this pilot schema yet.
-- Billing and file uploads are intentionally out of scope for this migration.

create extension if not exists pgcrypto;

create type public.tenant_status as enum ('trial', 'active', 'suspended');
create type public.profile_role as enum ('admin', 'receptionist', 'therapist', 'finance', 'super_admin');
create type public.patient_type as enum ('adult', 'teen', 'child');
create type public.appointment_status as enum ('booked', 'completed', 'cancelled', 'no_show', 'blocked');

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status public.tenant_status not null default 'trial',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  role public.profile_role not null default 'therapist',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, email)
);

create table public.practices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  registration_number text,
  practice_number text,
  address text,
  phone text,
  email text,
  website text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.therapists (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  practice_id uuid references public.practices(id) on delete set null,
  discipline text,
  qualification text,
  hpcsa_number text,
  practice_number text,
  uses_own_practice_number boolean not null default false,
  colour text not null default '#9999ed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, profile_id)
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_number text not null,
  first_name text not null,
  last_name text not null,
  patient_type public.patient_type not null,
  date_of_birth date,
  guardian_name text,
  guardian_phone text,
  guardian_email text,
  responsible_person_name text,
  responsible_person_id_number text,
  dependant_code text,
  medical_aid_name text,
  medical_aid_plan text,
  no_medical_aid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, patient_number)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  duration_minutes integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code),
  constraint services_duration_positive check (duration_minutes is null or duration_minutes > 0)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  therapist_id uuid references public.therapists(id) on delete set null,
  practice_id uuid references public.practices(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'booked',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_valid_time check (ends_at > starts_at)
);

create index tenants_slug_idx on public.tenants (slug);
create index profiles_tenant_id_idx on public.profiles (tenant_id);
create index practices_tenant_id_idx on public.practices (tenant_id);
create index therapists_tenant_id_idx on public.therapists (tenant_id);
create index therapists_profile_id_idx on public.therapists (profile_id);
create index patients_tenant_id_idx on public.patients (tenant_id);
create index appointments_tenant_id_starts_at_idx on public.appointments (tenant_id, starts_at);
create index appointments_patient_id_idx on public.appointments (patient_id);
create index appointments_therapist_id_idx on public.appointments (therapist_id);
create index services_tenant_id_idx on public.services (tenant_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tenants_set_updated_at before update on public.tenants for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger practices_set_updated_at before update on public.practices for each row execute function public.set_updated_at();
create trigger therapists_set_updated_at before update on public.therapists for each row execute function public.set_updated_at();
create trigger patients_set_updated_at before update on public.patients for each row execute function public.set_updated_at();
create trigger appointments_set_updated_at before update on public.appointments for each row execute function public.set_updated_at();
create trigger services_set_updated_at before update on public.services for each row execute function public.set_updated_at();

create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id
  from public.profiles
  where id = auth.uid()
    and is_active = true
  limit 1;
$$;

create or replace function public.is_tenant_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_active = true
      and role in ('admin', 'super_admin')
  );
$$;

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.practices enable row level security;
alter table public.therapists enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.services enable row level security;

create policy "tenant members can view own tenant"
on public.tenants for select
to authenticated
using (id = public.current_tenant_id());

create policy "tenant admins can update own tenant"
on public.tenants for update
to authenticated
using (id = public.current_tenant_id() and public.is_tenant_admin())
with check (id = public.current_tenant_id() and public.is_tenant_admin());

create policy "tenant members can view tenant profiles"
on public.profiles for select
to authenticated
using (tenant_id = public.current_tenant_id());

create policy "users can update own profile"
on public.profiles for update
to authenticated
using (id = auth.uid() and tenant_id = public.current_tenant_id())
with check (id = auth.uid() and tenant_id = public.current_tenant_id());

create policy "tenant admins can manage profiles"
on public.profiles for all
to authenticated
using (tenant_id = public.current_tenant_id() and public.is_tenant_admin())
with check (tenant_id = public.current_tenant_id() and public.is_tenant_admin());

create policy "tenant members can view practices"
on public.practices for select
to authenticated
using (tenant_id = public.current_tenant_id());

create policy "tenant admins can manage practices"
on public.practices for all
to authenticated
using (tenant_id = public.current_tenant_id() and public.is_tenant_admin())
with check (tenant_id = public.current_tenant_id() and public.is_tenant_admin());

create policy "tenant members can view therapists"
on public.therapists for select
to authenticated
using (tenant_id = public.current_tenant_id());

create policy "tenant admins can manage therapists"
on public.therapists for all
to authenticated
using (tenant_id = public.current_tenant_id() and public.is_tenant_admin())
with check (tenant_id = public.current_tenant_id() and public.is_tenant_admin());

create policy "tenant members can view patients"
on public.patients for select
to authenticated
using (tenant_id = public.current_tenant_id());

create policy "tenant members can manage patients"
on public.patients for all
to authenticated
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "tenant members can view appointments"
on public.appointments for select
to authenticated
using (tenant_id = public.current_tenant_id());

create policy "tenant members can manage appointments"
on public.appointments for all
to authenticated
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "tenant members can view services"
on public.services for select
to authenticated
using (tenant_id = public.current_tenant_id());

create policy "tenant admins can manage services"
on public.services for all
to authenticated
using (tenant_id = public.current_tenant_id() and public.is_tenant_admin())
with check (tenant_id = public.current_tenant_id() and public.is_tenant_admin());

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.practices to authenticated;
grant select, insert, update, delete on public.therapists to authenticated;
grant select, insert, update, delete on public.patients to authenticated;
grant select, insert, update, delete on public.appointments to authenticated;
grant select, insert, update, delete on public.services to authenticated;
grant select, update on public.tenants to authenticated;

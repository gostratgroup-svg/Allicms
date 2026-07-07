-- AlliDesk Initial Super Admin Bootstrap
-- Purpose: Create or update the first Super Admin profile for an existing Supabase Auth user.
-- Run manually in the Supabase SQL editor or another trusted admin database context.
-- Do not run from the frontend.

begin;

with target_user as (
  select
    id,
    email
  from auth.users
  where lower(email) = lower('gostratgroup@gmail.com')
  limit 1
),
upsert_profile as (
  insert into public.profiles (
    id,
    first_name,
    last_name,
    email,
    is_super_admin,
    updated_at,
    deleted_at
  )
  select
    id,
    'Gerhard',
    'Olivier',
    email,
    true,
    now(),
    null
  from target_user
  on conflict (id) do update
    set first_name = excluded.first_name,
        last_name = excluded.last_name,
        email = excluded.email,
        is_super_admin = true,
        updated_at = now(),
        deleted_at = null
  returning id, first_name, last_name, email, is_super_admin
)
select
  case
    when exists (select 1 from target_user)
      then 'Super Admin profile bootstrapped'
    else 'No auth.users row found for gostratgroup@gmail.com'
  end as bootstrap_status,
  id,
  first_name,
  last_name,
  email,
  is_super_admin
from upsert_profile
union all
select
  'No auth.users row found for gostratgroup@gmail.com' as bootstrap_status,
  null::uuid as id,
  null::text as first_name,
  null::text as last_name,
  null::text as email,
  null::boolean as is_super_admin
where not exists (select 1 from target_user);

commit;

-- Optional verification query:
-- select id, first_name, last_name, email, is_super_admin, deleted_at
-- from public.profiles
-- where lower(email) = lower('gostratgroup@gmail.com');

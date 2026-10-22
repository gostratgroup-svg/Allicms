-- Practice 2.0 Milestone 3 Session terminal-outcome validation.
-- Run only against allidesk-dev after 202607180011. All mutations roll back.

begin;
set role postgres;

create temp table m3_terminal_auth (
  email text primary key,
  profile_id uuid not null
) on commit drop;

insert into m3_terminal_auth (email, profile_id)
select lower(email), id
from public.profiles
where lower(email) in (
  'gostratgroup+allidesk-admin-a@gmail.com',
  'gostratgroup+allidesk-therapist-a@gmail.com',
  'gostratgroup+allidesk-reception-a@gmail.com',
  'gostratgroup+allidesk-admin-b@gmail.com'
);

do $$
begin
  if (select count(*) from m3_terminal_auth) <> 4 then
    raise exception 'Required fictional authenticated users were not found';
  end if;
end;
$$;

grant select on m3_terminal_auth to authenticated;

-- Admin cancellation and idempotency.
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from m3_terminal_auth where email = 'gostratgroup+allidesk-admin-a@gmail.com'),
  true
);

do $$
declare
  first_result record;
  repeat_result record;
begin
  select * into first_result
  from public.cancel_session(
    'ff5e9815-7170-4e90-b47f-1e75e078b5ad',
    'Milestone 3 rollback-only cancellation validation'
  );

  if not first_result.changed or first_result.terminal_outcome <> 'cancelled' then
    raise exception 'Cancel Session did not report the expected changed outcome';
  end if;

  if not exists (
    select 1
    from public.sessions s
    join public.bookings b on b.id = s.booking_id
    where s.id = first_result.session_id
      and s.session_status = 'cancelled'
      and b.booking_status = 'cancelled'
  ) then
    raise exception 'Cancel Session did not keep Booking and Session status consistent';
  end if;

  select * into repeat_result
  from public.cancel_session(
    'ff5e9815-7170-4e90-b47f-1e75e078b5ad',
    'Milestone 3 rollback-only cancellation validation'
  );

  if repeat_result.changed then
    raise exception 'Repeated Cancel Session was not idempotent';
  end if;
end;
$$;

-- Therapist no-show and idempotency.
select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from m3_terminal_auth where email = 'gostratgroup+allidesk-therapist-a@gmail.com'),
  true
);

do $$
declare
  first_result record;
  repeat_result record;
begin
  select * into first_result
  from public.record_session_no_show('e837c4da-5936-46f9-af1f-692bfc565a14');

  if not first_result.changed or first_result.terminal_outcome <> 'no_show' then
    raise exception 'No Show did not report the expected changed outcome';
  end if;

  if not exists (
    select 1
    from public.sessions s
    join public.bookings b on b.id = s.booking_id
    where s.id = first_result.session_id
      and s.session_status = 'no_show'
      and b.booking_status = 'no_show'
  ) then
    raise exception 'No Show did not keep Booking and Session status consistent';
  end if;

  select * into repeat_result
  from public.record_session_no_show('e837c4da-5936-46f9-af1f-692bfc565a14');

  if repeat_result.changed then
    raise exception 'Repeated No Show was not idempotent';
  end if;
end;
$$;

-- Reception cannot invoke a clinical terminal outcome.
select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from m3_terminal_auth where email = 'gostratgroup+allidesk-reception-a@gmail.com'),
  true
);

do $$
begin
  begin
    perform * from public.cancel_session(
      'ac6a8e23-9cb5-41a9-af83-98070314d177',
      'Unauthorised validation attempt'
    );
    raise exception 'Reception unexpectedly cancelled a Session';
  exception
    when others then
      if sqlerrm = 'Reception unexpectedly cancelled a Session' then raise; end if;
      if sqlerrm not like '%Not allowed to change this session outcome%' then raise; end if;
  end;
end;
$$;

-- A Tenant B admin cannot operate on Tenant A.
select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from m3_terminal_auth where email = 'gostratgroup+allidesk-admin-b@gmail.com'),
  true
);

do $$
begin
  begin
    perform * from public.record_session_no_show('ac6a8e23-9cb5-41a9-af83-98070314d177');
    raise exception 'Cross-tenant admin unexpectedly changed a Session';
  exception
    when others then
      if sqlerrm = 'Cross-tenant admin unexpectedly changed a Session' then raise; end if;
      if sqlerrm not like '%Not allowed to change this session outcome%' then raise; end if;
  end;
end;
$$;

reset role;
select set_config('request.jwt.claim.sub', '', true);

-- Convert existing fictional records inside this transaction only to exercise
-- draft cancellation and issued-invoice protection. ROLLBACK restores them.
update public.sessions
set session_status = 'ready', attendance_outcome = 'not_recorded', session_outcome = null,
    completed_at = null, completed_by_profile_id = null
where id in (
  '63903b5f-8879-48b1-ae73-5eede4f0c6ef',
  '0ab02c87-2ee0-4e5f-9fcb-66a19defd4af'
);

update public.bookings
set booking_status = 'confirmed', completed_at = null
where id in (
  '8c5d1049-cbec-4e26-b4da-ea38a8521940',
  'b6f33dcd-1a0c-4756-a2d0-6477bb5609fa'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from m3_terminal_auth where email = 'gostratgroup+allidesk-admin-a@gmail.com'),
  true
);

do $$
declare
  outcome_result record;
begin
  select * into outcome_result
  from public.record_session_no_show('63903b5f-8879-48b1-ae73-5eede4f0c6ef');

  if outcome_result.cancelled_invoice_id is distinct from '021020a5-75e2-40d4-9686-e325fb7006ef'::uuid then
    raise exception 'No Show did not return its cancelled unissued invoice';
  end if;

  if not exists (
    select 1 from public.invoices
    where id = outcome_result.cancelled_invoice_id
      and invoice_status = 'cancelled'
      and confirmed_at is null
      and issued_at is null
      and amount_paid = 0
  ) then
    raise exception 'No Show did not safely cancel the unissued unpaid draft';
  end if;

  begin
    perform * from public.cancel_session(
      '0ab02c87-2ee0-4e5f-9fcb-66a19defd4af',
      'Issued-invoice protection validation'
    );
    raise exception 'Session with an issued invoice was unexpectedly cancelled';
  exception
    when others then
      if sqlerrm = 'Session with an issued invoice was unexpectedly cancelled' then raise; end if;
      if sqlerrm not like '%Confirmed, issued or paid invoices require a separate financial correction%' then raise; end if;
  end;
end;
$$;

reset role;

do $$
begin
  if not exists (
    select 1 from public.session_status_history
    where session_id = 'ff5e9815-7170-4e90-b47f-1e75e078b5ad'
      and to_status = 'cancelled'
      and event_type = 'session_cancelled'
  ) then raise exception 'Cancellation status history was not recorded'; end if;

  if not exists (
    select 1 from public.session_workflow_events
    where session_id = 'e837c4da-5936-46f9-af1f-692bfc565a14'
      and event_type = 'session_no_show_recorded'
  ) then raise exception 'No-show workflow event was not recorded'; end if;

  if not exists (
    select 1 from public.patient_history_events
    where source_table = 'sessions'
      and source_id = 'ff5e9815-7170-4e90-b47f-1e75e078b5ad'
      and event_type = 'session_cancelled'
  ) then raise exception 'Cancellation Patient History was not recorded'; end if;

  if has_function_privilege('authenticated', 'public.apply_session_terminal_outcome(uuid,text,text)', 'EXECUTE') then
    raise exception 'Authenticated role can execute the internal terminal-outcome helper';
  end if;
end;
$$;

rollback;

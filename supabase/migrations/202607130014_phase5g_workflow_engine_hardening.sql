-- AlliDesk Phase 5G Steps 4 & 5: Workflow Engine hardening corrections.
--
-- Forward-only corrections for activation integrity, immutable active versions,
-- idempotent outbox ingestion, permission-checked validation, and scheduled-job
-- cancellation through a protected RPC rather than direct table mutation.

create or replace function public.enforce_workflow_version_immutability()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if TG_OP = 'UPDATE' and OLD.status in ('active', 'superseded', 'archived') then
    if OLD.workflow_definition_id is distinct from NEW.workflow_definition_id
      or OLD.tenant_id is distinct from NEW.tenant_id
      or OLD.version_number is distinct from NEW.version_number
      or OLD.trigger_type is distinct from NEW.trigger_type
      or OLD.trigger_event_type is distinct from NEW.trigger_event_type
      or OLD.trigger_config is distinct from NEW.trigger_config
      or OLD.condition_config is distinct from NEW.condition_config
      or OLD.action_config is distinct from NEW.action_config
      or OLD.timezone_strategy is distinct from NEW.timezone_strategy
      or OLD.effective_from is distinct from NEW.effective_from
      or OLD.published_at is distinct from NEW.published_at
      or OLD.published_by_profile_id is distinct from NEW.published_by_profile_id
    then
      raise exception 'Published workflow versions are immutable. Create a new draft version instead.';
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists workflow_definition_versions_enforce_immutability on public.workflow_definition_versions;
create trigger workflow_definition_versions_enforce_immutability
before update on public.workflow_definition_versions
for each row execute function public.enforce_workflow_version_immutability();

create or replace function public.validate_workflow_activation_graph()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  definition_record public.workflow_definitions%rowtype;
  active_version_record public.workflow_definition_versions%rowtype;
begin
  if TG_TABLE_NAME = 'workflow_definitions' then
    definition_record := NEW;
  elsif TG_TABLE_NAME = 'workflow_definition_versions' then
    select * into definition_record
    from public.workflow_definitions
    where id = NEW.workflow_definition_id
      and deleted_at is null;
  end if;

  if definition_record.id is null then
    return null;
  end if;

  if definition_record.status = 'active' then
    if definition_record.active_version_id is null then
      raise exception 'Active workflow definitions require an active version';
    end if;

    select * into active_version_record
    from public.workflow_definition_versions
    where id = definition_record.active_version_id
      and workflow_definition_id = definition_record.id
      and deleted_at is null;

    if active_version_record.id is null or active_version_record.status <> 'active' then
      raise exception 'Workflow definition active_version_id must reference an active version';
    end if;
  end if;

  if TG_TABLE_NAME = 'workflow_definition_versions' and NEW.status = 'active' then
    if definition_record.status <> 'active' or definition_record.active_version_id is distinct from NEW.id then
      raise exception 'Active workflow versions must be the parent definition active_version_id';
    end if;
  end if;

  return null;
end;
$$;

drop trigger if exists workflow_definitions_validate_activation_graph on public.workflow_definitions;
create constraint trigger workflow_definitions_validate_activation_graph
after insert or update on public.workflow_definitions
deferrable initially deferred
for each row execute function public.validate_workflow_activation_graph();

drop trigger if exists workflow_definition_versions_validate_activation_graph on public.workflow_definition_versions;
create constraint trigger workflow_definition_versions_validate_activation_graph
after insert or update on public.workflow_definition_versions
deferrable initially deferred
for each row execute function public.validate_workflow_activation_graph();

create or replace function public.enqueue_workflow_event(
  target_tenant_id uuid,
  event_type_input text,
  source_domain_input text,
  source_table_input text,
  source_event_id_input uuid,
  source_record_id_input uuid,
  idempotency_key_input text,
  payload_input jsonb default '{}'::jsonb,
  patient_id_input uuid default null,
  responsible_party_id_input uuid default null,
  booking_id_input uuid default null,
  session_id_input uuid default null,
  invoice_id_input uuid default null,
  payment_id_input uuid default null,
  patient_link_id_input uuid default null,
  actor_profile_id_input uuid default null,
  event_version_input integer default 1,
  priority_input integer default 100,
  available_at_input timestamptz default now(),
  correlation_id_input uuid default null,
  causation_id_input uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  outbox_id uuid;
begin
  if target_tenant_id is null then
    raise exception 'Workflow event tenant is required';
  end if;

  if idempotency_key_input is null or btrim(idempotency_key_input) = '' then
    raise exception 'Workflow event idempotency key is required';
  end if;

  if event_type_input is null or btrim(event_type_input) = '' then
    raise exception 'Workflow event type is required';
  end if;

  if source_table_input is null or btrim(source_table_input) = '' then
    raise exception 'Workflow source table is required';
  end if;

  if source_domain_input not in ('booking', 'session', 'invoice', 'payment', 'patient_link', 'patient', 'system') then
    raise exception 'Unsupported workflow source domain';
  end if;

  if source_event_id_input is not null then
    select id into outbox_id
    from public.workflow_event_outbox
    where tenant_id = target_tenant_id
      and source_domain = source_domain_input
      and source_table = source_table_input
      and source_event_id = source_event_id_input
      and deleted_at is null;

    if outbox_id is not null then
      return outbox_id;
    end if;
  end if;

  select id into outbox_id
  from public.workflow_event_outbox
  where tenant_id = target_tenant_id
    and idempotency_key = idempotency_key_input
    and deleted_at is null;

  if outbox_id is not null then
    return outbox_id;
  end if;

  begin
    insert into public.workflow_event_outbox (
      tenant_id, event_type, event_version, source_domain, source_table, source_event_id, source_record_id,
      patient_id, responsible_party_id, booking_id, session_id, invoice_id, payment_id, patient_link_id,
      actor_profile_id, correlation_id, causation_id, idempotency_key, payload, priority, available_at
    )
    values (
      target_tenant_id, event_type_input, coalesce(event_version_input, 1), source_domain_input, source_table_input, source_event_id_input, source_record_id_input,
      patient_id_input, responsible_party_id_input, booking_id_input, session_id_input, invoice_id_input, payment_id_input, patient_link_id_input,
      actor_profile_id_input, coalesce(correlation_id_input, gen_random_uuid()), causation_id_input, idempotency_key_input, coalesce(payload_input, '{}'::jsonb),
      least(greatest(coalesce(priority_input, 100), 0), 1000), coalesce(available_at_input, now())
    )
    on conflict (tenant_id, idempotency_key) where deleted_at is null do update
      set updated_at = public.workflow_event_outbox.updated_at
    returning id into outbox_id;
  exception
    when unique_violation then
      select id into outbox_id
      from public.workflow_event_outbox
      where tenant_id = target_tenant_id
        and deleted_at is null
        and (
          idempotency_key = idempotency_key_input
          or (
            source_event_id_input is not null
            and source_domain = source_domain_input
            and source_table = source_table_input
            and source_event_id = source_event_id_input
          )
        )
      limit 1;

      if outbox_id is null then
        raise;
      end if;
  end;

  return outbox_id;
end;
$$;

create or replace function public.validate_workflow_definition_version(target_version_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  version_record public.workflow_definition_versions%rowtype;
  definition_record public.workflow_definitions%rowtype;
  validation_errors text[] := array[]::text[];
  action_item jsonb;
begin
  select * into version_record
  from public.workflow_definition_versions
  where id = target_version_id
    and deleted_at is null;

  if version_record.id is null then
    raise exception 'Workflow definition version not found';
  end if;

  select * into definition_record
  from public.workflow_definitions
  where id = version_record.workflow_definition_id
    and deleted_at is null;

  if definition_record.id is null then
    raise exception 'Workflow definition not found';
  end if;

  if definition_record.is_system_workflow and not public.is_super_admin() then
    raise exception 'Only Super Admin can validate system workflow versions';
  end if;

  if not definition_record.is_system_workflow and not public.has_tenant_role(definition_record.tenant_id, array['admin']) then
    raise exception 'Only tenant admins can validate tenant workflow versions';
  end if;

  if version_record.status in ('active', 'superseded', 'archived') then
    validation_errors := array_append(validation_errors, 'published workflow versions cannot be edited; create a new draft version');
  end if;

  if version_record.trigger_type in ('domain_event', 'delay_after_event') and (version_record.trigger_event_type is null or btrim(version_record.trigger_event_type) = '') then
    validation_errors := array_append(validation_errors, version_record.trigger_type || ' triggers require trigger_event_type');
  end if;

  if version_record.trigger_type = 'external_webhook' then
    validation_errors := array_append(validation_errors, 'external webhook triggers are deferred and cannot be activated yet');
  end if;

  if jsonb_array_length(version_record.action_config) = 0 then
    validation_errors := array_append(validation_errors, 'workflow version requires at least one action');
  end if;

  for action_item in select value from jsonb_array_elements(version_record.action_config)
  loop
    if coalesce(action_item ->> 'action_type', '') not in (
      'create_communication_request',
      'create_patient_link_invitation_request',
      'mark_patient_link_content_available',
      'create_staff_task',
      'add_patient_history_event',
      'create_internal_notification',
      'request_draft_invoice_recovery',
      'request_invoice_reconciliation_review',
      'schedule_later_execution',
      'trigger_domain_rpc',
      'request_pdf_generation'
    ) then
      validation_errors := array_append(validation_errors, 'unsupported action_type: ' || coalesce(action_item ->> 'action_type', '<missing>'));
    end if;

    if coalesce(action_item ->> 'action_type', '') = 'create_external_webhook_request' then
      validation_errors := array_append(validation_errors, 'external webhook actions are deferred and cannot be activated yet');
    end if;

    if action_item ? 'sql' or action_item ? 'javascript' or action_item ? 'script' or action_item ? 'code' or action_item ? 'url' then
      validation_errors := array_append(validation_errors, 'action configuration cannot contain executable code, SQL or external URL keys');
    end if;
  end loop;

  return jsonb_build_object(
    'valid', cardinality(validation_errors) = 0,
    'errors', to_jsonb(validation_errors)
  );
end;
$$;

create or replace function public.cancel_workflow_scheduled_job(target_job_id uuid, cancellation_reason_input text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  job_record public.workflow_scheduled_jobs%rowtype;
begin
  select * into job_record
  from public.workflow_scheduled_jobs
  where id = target_job_id
    and deleted_at is null
  for update;

  if job_record.id is null then
    raise exception 'Workflow scheduled job not found';
  end if;

  if not public.is_super_admin() and not public.has_tenant_role(job_record.tenant_id, array['admin']) then
    raise exception 'Only tenant admins can cancel workflow scheduled jobs';
  end if;

  if job_record.status in ('completed', 'cancelled', 'superseded', 'dead_lettered') then
    return target_job_id;
  end if;

  update public.workflow_scheduled_jobs
  set status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = left(coalesce(cancellation_reason_input, 'Cancelled by tenant administrator'), 1000),
      locked_at = null,
      locked_by = null
  where id = target_job_id
    and deleted_at is null;

  insert into public.audit_events (tenant_id, actor_profile_id, action, entity_table, entity_id, metadata)
  values (job_record.tenant_id, auth.uid(), 'workflow_scheduled_job_cancelled', 'workflow_scheduled_jobs', target_job_id, jsonb_build_object('reason', left(coalesce(cancellation_reason_input, ''), 1000)));

  return target_job_id;
end;
$$;

revoke all on function public.enforce_workflow_version_immutability() from public, anon, authenticated;
revoke all on function public.validate_workflow_activation_graph() from public, anon, authenticated;
revoke all on function public.cancel_workflow_scheduled_job(uuid, text) from public, anon;

grant execute on function public.cancel_workflow_scheduled_job(uuid, text) to authenticated;

comment on function public.enforce_workflow_version_immutability() is 'Prevents direct mutation of published workflow version configuration.';
comment on function public.validate_workflow_activation_graph() is 'Deferred activation graph integrity check for workflow definitions and versions.';
comment on function public.cancel_workflow_scheduled_job(uuid, text) is 'Permission-checked cancellation RPC for scheduled workflow jobs.';

# Phase 5G Step 1: Workflow Engine Architecture

## 1. Objective

Phase 5G designs the AlliDesk Workflow Engine before any code, SQL, worker runtime, UI, communication delivery, or automation execution is implemented.

The Workflow Engine is a reliable orchestration layer. It observes meaningful domain events from the existing operational engines and coordinates approved downstream actions.

It must not become the authoritative owner of patient, booking, session, invoice, payment, finance, Patient Link, or clinical state.

Each domain engine remains responsible for its own data integrity, lifecycle rules, permissions, and canonical records.

## 2. Core Principles

### Workflow-Driven Platform

AlliDesk is workflow-driven:

```text
Patient
  -> Booking
  -> Session
  -> Draft Invoice
  -> Finance
  -> Patient Link
```

The Workflow Engine should make this flow reliable, observable, recoverable, and automation-ready.

### Observe, Coordinate, Do Not Own

The Workflow Engine observes canonical domain events and coordinates actions.

It should not directly mutate protected domain tables unless the action is routed through an approved domain RPC/API designed for that purpose.

### Capture Once, Reuse Everywhere

Domain engines already capture important facts. The Workflow Engine should reference those records and copy only the minimum metadata needed for routing, idempotency, retry, and audit.

### Privacy By Architecture

Generic workflow payloads must not contain:

- clinical note bodies
- session process notes
- internal operational notes
- patient alerts unless specifically required and safe
- banking secrets
- verification codes
- session tokens
- Patient Link credentials
- full invoice or receipt payloads
- unnecessary personal information

### Transactional Capture, Eventual Execution

Domain events should be captured transactionally with the domain state change. Workflow actions can execute asynchronously with at-least-once processing and idempotent consumers.

### Automation Over Administration

The first milestone should prepare operational automation and recovery, not build a general-purpose visual automation platform.

## 3. Existing Event-Source Review

Existing event foundations should be preserved.

Current domain event sources include:

- `booking_workflow_events`
- `session_workflow_events`
- `invoice_workflow_events`
- `payment_workflow_events`
- `patient_link_workflow_events`
- `patient_history_events`
- `audit_events`

These tables already use tenant scope, event types, statuses, idempotency keys, timestamps, and RLS patterns.

The Workflow Engine should not duplicate these domain tables.

Recommended approach:

- keep domain workflow-event tables as domain-owned event sources
- add a central normalized workflow outbox for orchestration
- link central outbox records back to the source domain table and source record
- mark source domain events as processed/ignored/failed only through controlled functions or worker-owned flows

## 4. Canonical Event Model

The central event envelope normalizes different domain events into one workflow-processing shape.

Recommended canonical fields:

- `id`
- `tenant_id`
- `event_type`
- `event_version`
- `source_domain`
- `source_table`
- `source_record_id`
- `patient_id`
- `responsible_party_id`
- `booking_id`
- `session_id`
- `invoice_id`
- `payment_id`
- `patient_link_id`
- `occurred_at`
- `recorded_at`
- `actor_profile_id`
- `actor_type`
- `correlation_id`
- `causation_id`
- `idempotency_key`
- `payload`
- `processing_status`

### Stored Directly

Store routing and orchestration metadata directly:

- tenant
- source domain/table/record
- event type/version
- related core record IDs
- timestamps
- correlation and causation IDs
- idempotency key
- processing state
- minimal structured payload

### Referenced Only

Keep detailed domain state referenced in domain tables:

- patient demographics
- responsible-party details
- booking details
- session notes
- invoice line details
- payment allocation details
- Patient Link grant/session/challenge details

### Payload Rules

Payload should contain only safe workflow metadata, such as:

- previous status
- new status
- reason code
- source action
- workflow hint
- requested communication template key
- safe schedule values

Payload should not contain clinical content, financial secrets, tokens, codes, or internal notes.

### Schema Evolution

Use `event_version` and structured payload keys to support event evolution.

Workers should understand versioned event envelopes and either:

- process supported versions
- route unsupported versions to dead letter
- ignore events explicitly marked as obsolete

### Duplicate Detection

Duplicate source events are detected through stable uniqueness:

```text
tenant_id + source_domain + source_table + source_record_id + source_event_id
```

or, where source event ID is not available:

```text
tenant_id + idempotency_key
```

## 5. Event Ingestion Strategy

Recommended strategy for AlliDesk now:

### Phase 5G Initial

Use domain RPCs and database functions to enqueue normalized outbox events transactionally when domain workflow events are created.

For existing domain event tables, introduce controlled `enqueue_workflow_event(...)` style functions in a future migration. These functions should:

- validate tenant membership or worker identity
- validate the source event exists
- create one normalized outbox record
- enforce source-event uniqueness
- preserve source-domain ownership
- avoid copying sensitive payload data

### Why Not Frontend Ingestion

Frontend execution cannot be the source of reliable workflow processing because:

- browser sessions can close
- network calls can fail
- users can navigate away
- retries are not durable
- tenant security would be weaker

### Why Not Direct External Network Calls In Transactions

Database transactions should not send external emails/SMS/WhatsApp, call webhooks, or execute long-running work. They should enqueue durable work only.

### Backfill Strategy

Previously created domain events should generally be ignored for automation unless a specific recovery/backfill job is created.

If backfill is needed:

- run tenant-scoped backfill scripts/functions
- record a backfill correlation ID
- avoid creating duplicate communications or tasks
- default to dry-run reporting before enqueueing work

## 6. Outbox Strategy

A central workflow outbox is recommended.

Purpose:

- normalize domain events
- provide a single claimable queue
- support retry/dead-letter behaviour
- provide observability across engines
- avoid every worker polling every domain table

Recommended entity:

`workflow_event_outbox`

Suggested fields:

- `id`
- `tenant_id`
- `source_domain`
- `source_table`
- `source_event_id`
- `source_record_id`
- `event_type`
- `event_version`
- `event_envelope`
- `processing_status`
- `available_at`
- `priority`
- `attempt_count`
- `max_attempts`
- `locked_at`
- `locked_by`
- `completed_at`
- `failed_at`
- `dead_lettered_at`
- `last_error_code`
- `last_error_summary`
- `correlation_id`
- `causation_id`
- `idempotency_key`
- `created_at`
- `updated_at`
- `deleted_at`

Recommended statuses:

- `pending`
- `scheduled`
- `processing`
- `processed`
- `failed`
- `ignored`
- `dead_lettered`
- `cancelled`

### Worker Claiming

Workers should claim jobs with a concurrency-safe pattern:

```sql
select ...
for update skip locked
```

Claiming should:

- select available jobs only
- respect priority
- respect tenant fairness
- set `locked_at`
- set `locked_by`
- increment attempt counters carefully
- avoid destructive queue consumption

### At-Least-Once Processing

The outbox should assume at-least-once processing.

Every downstream workflow execution and action must be idempotent.

## 7. Workflow Definition and Version Model

Definitions describe what should happen when a trigger matches.

Recommended entities:

- `workflow_definitions`
- `workflow_definition_versions`

### `workflow_definitions`

Purpose:

- stable workflow identity
- tenant/system ownership
- high-level status and metadata

Suggested fields:

- `id`
- `tenant_id`, nullable for system workflows
- `workflow_key`
- `name`
- `description`
- `workflow_scope`
- `workflow_owner_type`
- `status`
- `active_version_id`
- `is_system_workflow`
- `is_tenant_override_allowed`
- `created_by_profile_id`
- `updated_by_profile_id`
- `created_at`
- `updated_at`
- `deleted_at`

Statuses:

- `draft`
- `active`
- `paused`
- `disabled`
- `archived`

### `workflow_definition_versions`

Purpose:

- immutable executable version
- preserves behaviour for running executions

Suggested fields:

- `id`
- `workflow_definition_id`
- `tenant_id`, nullable for system version
- `version_number`
- `trigger_config`
- `condition_config`
- `action_config`
- `status`
- `effective_from`
- `effective_until`
- `activated_at`
- `activated_by_profile_id`
- `created_by_profile_id`
- `created_at`
- `updated_at`
- `deleted_at`

Version statuses:

- `draft`
- `validating`
- `active`
- `superseded`
- `disabled`
- `archived`

### Versioning Rules

- Active versions are immutable.
- Editing an active workflow creates a new draft version.
- Running executions retain the version they started with.
- Tenants may clone system workflows where permitted.
- Mandatory system workflows cannot be disabled by tenants.
- Configurable system workflows may expose safe settings only.
- Invalid workflow versions cannot be activated.

## 8. Trigger Model

Initial trigger types:

- `domain_event`
- `scheduled_time`
- `delay_after_event`
- `date_relative_to_booking`
- `date_relative_to_invoice_due_date`
- `manual_trigger`
- `retry_trigger`

Future trigger types:

- `external_webhook`
- `patient_link_activity`
- `ai_suggested_manual_review`

Trigger configuration must be controlled JSON, not executable code.

Examples:

```json
{
  "type": "domain_event",
  "event_type": "booking_confirmed",
  "source_domain": "booking"
}
```

```json
{
  "type": "date_relative_to_booking",
  "offset": "-24 hours",
  "timezone_source": "practice_location"
}
```

### Timezone Behaviour

Timezone resolution order:

1. booking location timezone, when available
2. practice profile timezone
3. tenant default timezone
4. platform default timezone

Use timezone-aware `timestamptz` storage. Recalculate scheduled reminders when bookings are rescheduled or location timezones change.

## 9. Condition Model

Conditions must use a controlled schema.

Do not allow tenant-supplied SQL, scripts, arbitrary URLs, or executable code.

Initial condition categories:

- event field comparison
- domain state check
- visibility/permission check
- consent/contact readiness check
- idempotency/completion check
- tenant setting check
- time-window check

Examples:

- booking status equals `confirmed`
- appointment is within configured reminder window
- invoice balance is greater than zero
- invoice is issued
- payment has not been recorded
- Patient Link is active
- patient has approved electronic-access consent
- responsible party has valid contact method
- practice communication channel is enabled
- workflow has not already completed for this record/action

Conditions should be evaluated by worker-side controlled evaluators or database functions, never arbitrary tenant logic.

## 10. Action Model

Actions are controlled requests for downstream work.

Initial action types:

- `create_communication_request`
- `create_patient_link_invitation_request`
- `mark_patient_link_content_available`
- `create_staff_task`
- `add_patient_history_event`
- `create_internal_notification`
- `request_draft_invoice_recovery`
- `request_invoice_reconciliation_review`
- `schedule_later_execution`
- `trigger_domain_rpc`

Future action types:

- `create_external_webhook_request`
- `request_pdf_generation`
- `request_medical_aid_claim`
- `request_ai_summary`

### Domain Mutation Boundary

The Workflow Engine should not update domain tables directly.

For domain mutations, it should call approved domain RPCs such as future:

- `request_draft_invoice_recovery(...)`
- `mark_patient_link_invoice_available(...)`
- `create_staff_task(...)`
- `create_communication_request(...)`

Actions should be idempotent and auditable.

## 11. Communication-Request Boundary

Communication delivery remains deferred.

The Workflow Engine may prepare a communication request, but should not send messages in the initial milestone.

Recommended future entity:

`communication_requests`

Suggested fields:

- `id`
- `tenant_id`
- `recipient_type`
- `recipient_patient_id`
- `recipient_responsible_party_id`
- `channel`
- `template_id`
- `template_version`
- `approved_merge_fields`
- `related_patient_id`
- `related_booking_id`
- `related_session_id`
- `related_invoice_id`
- `related_payment_id`
- `related_patient_link_id`
- `scheduled_send_at`
- `status`
- `idempotency_key`
- `created_at`
- `updated_at`
- `deleted_at`

Allowed initial statuses:

- `draft`
- `ready`
- `scheduled`
- `blocked`
- `cancelled`

Communication payloads must avoid medical details and unnecessary financial details. Templates should resolve only approved merge fields.

## 12. Execution Model

Recommended entity:

`workflow_executions`

Purpose:

- one workflow run for one event/trigger/context

Suggested fields:

- `id`
- `tenant_id`
- `workflow_definition_id`
- `workflow_definition_version_id`
- `triggering_outbox_event_id`
- `trigger_type`
- `status`
- `started_at`
- `completed_at`
- `cancelled_at`
- `failed_at`
- `dead_lettered_at`
- `current_step_key`
- `attempt_count`
- `next_retry_at`
- `error_code`
- `error_summary`
- `correlation_id`
- `causation_id`
- `idempotency_key`
- `created_at`
- `updated_at`
- `deleted_at`

Statuses:

- `pending`
- `scheduled`
- `running`
- `waiting`
- `completed`
- `failed`
- `cancelled`
- `dead_lettered`

### Valid Transitions

```text
pending -> scheduled
pending -> running
scheduled -> running
running -> waiting
running -> completed
running -> failed
failed -> scheduled
failed -> dead_lettered
scheduled -> cancelled
waiting -> running
waiting -> cancelled
dead_lettered -> scheduled, only by manual retry
```

## 13. Step-Execution Model

Individual workflow actions should have execution records when workflows contain multiple actions or retryable steps.

Recommended entity:

`workflow_step_executions`

Suggested fields:

- `id`
- `tenant_id`
- `workflow_execution_id`
- `workflow_definition_version_id`
- `step_key`
- `step_order`
- `action_type`
- `input_summary`
- `output_summary`
- `status`
- `attempt_count`
- `started_at`
- `completed_at`
- `failed_at`
- `next_retry_at`
- `error_code`
- `error_summary`
- `idempotency_key`
- `created_at`
- `updated_at`
- `deleted_at`

Avoid storing full sensitive input/output payloads. Keep summaries safe and traceable.

## 14. Scheduling and Delays

Recommended entity:

`workflow_scheduled_jobs`

Purpose:

- durable delayed execution
- reminder windows
- retry scheduling
- cancellation/supersession tracking

Suggested fields:

- `id`
- `tenant_id`
- `workflow_execution_id`
- `workflow_step_execution_id`
- `source_outbox_event_id`
- `job_type`
- `available_at`
- `timezone`
- `status`
- `superseded_by_job_id`
- `cancelled_at`
- `cancelled_reason`
- `idempotency_key`
- `created_at`
- `updated_at`
- `deleted_at`

Examples:

- reminder 24 hours before a booking
- reminder 2 hours before a booking
- invoice reminder 3 days after due date
- Patient Link invitation after registration
- retry after transient failure

### Revalidation Rule

Every delayed job must revalidate current domain state immediately before action:

- booking still exists
- booking is not cancelled
- booking time has not changed
- invoice still has balance due
- Patient Link still active
- consent/contact method still valid
- tenant still active
- workflow still enabled

## 15. Retry Strategy

Retries should apply only to transient failures.

Retryable failures:

- temporary network failure
- transient provider outage
- temporary database lock timeout
- worker timeout
- rate-limited downstream provider

Permanent failures:

- invalid workflow definition
- missing required tenant configuration
- revoked Patient Link
- cancelled booking
- paid invoice
- missing consent
- unsupported action
- validation failure
- permission failure

Recommended defaults:

- max attempts: 5
- backoff: exponential with jitter
- first retry: 1 minute
- later retries: 5, 15, 60 minutes, then dead letter
- tenant-specific rate limits later

Manual retry should be allowed only after review and should create audit events.

## 16. Idempotency

Idempotency is required at every layer.

Required idempotency scopes:

- source-event ingestion
- outbox record creation
- workflow execution creation
- step execution creation
- communication request creation
- scheduled job creation
- domain RPC action
- manual retry

Recommended stable key pattern:

```text
tenant:{tenant_id}:workflow:{workflow_key}:version:{version}:event:{source_event_id}:action:{action_key}:target:{target_id}
```

Duplicate processing must not create duplicate:

- draft invoices
- patient history entries
- payment records
- Patient Link invitations
- communication requests
- staff tasks
- scheduled reminders

## 17. Failure and Dead-Letter Handling

Recommended entity:

`workflow_dead_letters`

Purpose:

- durable failure review
- safe manual retry
- manual cancellation or resolution

Suggested fields:

- `id`
- `tenant_id`
- `workflow_execution_id`
- `workflow_step_execution_id`
- `outbox_event_id`
- `failure_class`
- `error_code`
- `error_summary`
- `safe_context`
- `attempt_count`
- `first_failed_at`
- `last_failed_at`
- `resolved_at`
- `resolved_by_profile_id`
- `resolution_notes`
- `status`
- `created_at`
- `updated_at`

Failure classes:

- `transient`
- `configuration`
- `validation`
- `permission`
- `domain_state`
- `provider`
- `security`
- `unknown`

Do not store raw stack traces, tokens, codes, full personal data, or secrets in tenant-visible error summaries.

## 18. Cancellation and Supersession

Scheduled jobs and executions should be cancelled or skipped when domain state changes.

Examples:

- booking cancelled after reminder scheduled: cancel reminder job
- booking rescheduled: supersede old reminder jobs and create new jobs
- invoice paid before overdue reminder: cancel overdue reminder
- Patient Link revoked: cancel invitation/update workflows
- consent withdrawn: block communications
- workflow definition disabled: stop new executions, allow existing executions to finish or cancel based on definition policy
- new workflow version activated: new events use new version, existing executions keep old version
- tenant suspended: skip/cancel external actions and place pending jobs into tenant-suspended state

Cancelled records should remain auditable.

## 19. System Workflows

Initial system workflows should be centrally maintained.

Recommended mandatory system workflows:

- session completed -> request draft invoice recovery if missing
- invoice issued -> mark Patient Link invoice available
- payment recorded -> mark receipt available
- booking updated -> update Patient Link appointment availability
- Patient Link access failure threshold -> create security review event

Recommended configurable system workflows:

- booking confirmed -> communication request readiness
- booking cancelled -> communication request readiness
- appointment reminder readiness
- invoice available notification readiness
- overdue invoice reminder readiness
- payment receipt available notification readiness

System workflow deployment rules:

- system versions are created by platform migration/admin tooling
- tenants may enable/disable configurable workflows where allowed
- mandatory workflows cannot be disabled by tenant users
- tenants may clone permitted system workflows into tenant workflows

## 20. Tenant-Configured Workflows

Tenant configuration should be constrained and safe.

Allowed tenant settings:

- enabled/disabled
- timing
- channel preference
- template choice
- reminder count
- recipient type
- location filter
- therapist filter
- invoice threshold
- working-hour restrictions

Disallowed:

- arbitrary scripts
- arbitrary SQL
- untrusted code
- unrestricted URLs
- direct mutation of domain tables
- access to hidden patient/clinical/finance fields

Tenant-created workflows must pass validation before activation.

## 21. Security and Permissions

### Tenant Roles

Recommended permissions:

- tenant admins: view/configure workflows, activate tenant workflows, retry/cancel executions
- practice managers: view workflows and operational executions, retry allowed failures if granted
- finance users: view/retry finance-related workflows
- therapists: view workflows related to their operational work if permitted, no configuration by default
- reception/operations: view booking/communication readiness workflows if permitted
- read-only users: view only where explicitly allowed
- Super Admin: platform/system workflow health and diagnostics, not tenant patient/clinical payloads
- background worker: narrowly scoped service identity for claiming and completing jobs

### Security Rules

- RLS remains the source of truth.
- Worker functions must be narrowly granted.
- Frontend must never use service-role access.
- Security-definer functions must use safe `search_path`.
- Workflow payloads must be minimized.
- Tenant isolation applies to definitions, executions, queues, schedules, action requests, and logs.
- Tenant users cannot modify system workflow definitions.
- Super Admin should see platform-level health and safe diagnostics, not tenant clinical or patient detail payloads.

## 22. Audit and Observability

Workflow activity should produce audit events for meaningful administrative actions:

- workflow created
- workflow version created
- workflow activated
- workflow disabled
- workflow cloned
- execution manually retried
- execution cancelled
- dead-letter resolved
- worker configuration changed

Operational metrics:

- events ingested
- events deduplicated
- workflows triggered
- workflows completed
- workflows failed
- retry counts
- dead-letter counts
- average processing delay
- scheduled jobs pending
- action type counts
- tenant-level failure rate
- provider failure rate

Avoid excessive low-value logging for every internal evaluator decision.

## 23. Data-Model Guidance

Recommended future entities:

- `workflow_event_outbox`
- `workflow_definitions`
- `workflow_definition_versions`
- `workflow_executions`
- `workflow_step_executions`
- `workflow_scheduled_jobs`
- `workflow_dead_letters`
- `workflow_action_requests`
- `communication_requests`
- `staff_tasks`

Keep clear separation between:

- source domain events
- central event envelope
- workflow definitions
- workflow executions
- action requests
- audit logs

Do not duplicate existing domain event tables.

## 24. Runtime and Worker Guidance

Recommended runtime for current AlliDesk stack:

### Hybrid Model

PostgreSQL:

- transactional event enqueueing
- idempotency enforcement
- queue claiming primitives
- state transitions
- audit inserts
- tenant-safe validation functions

Worker runtime:

- Supabase Edge Functions or a dedicated worker
- scheduled invocation through Supabase scheduling or Vercel cron initially
- later dedicated long-running worker if event volume requires it

Avoid:

- long-running external network calls inside database transactions
- frontend-triggered automation
- service-role credentials in browser code

### Job Claiming

Workers should:

- claim batches with `for update skip locked`
- mark jobs locked
- execute outside the transaction
- complete/fail through database functions
- use idempotent action requests
- release stale locks through controlled timeout recovery

### Secrets

Provider secrets belong in server/worker environment variables only.

Workflow definitions may reference provider/channel keys but must not contain raw secrets.

### Deployment Behaviour

Running executions keep their workflow version.

New deployments may activate new system workflow versions without mutating existing executions.

Rollback should disable new versions and leave historical executions intact.

## 25. Database Function Guidance

Recommended secure functions:

- `enqueue_workflow_event(...)`
- `claim_workflow_jobs(...)`
- `complete_workflow_job(...)`
- `fail_workflow_job(...)`
- `schedule_workflow_action(...)`
- `cancel_workflow_action(...)`
- `create_workflow_execution(...)`
- `complete_workflow_execution(...)`
- `retry_dead_letter_execution(...)`
- `activate_workflow_version(...)`
- `validate_workflow_definition_version(...)`

Functions must be:

- tenant-aware
- concurrency-safe
- idempotent
- auditable
- narrowly granted
- safe under RLS/security-definer rules
- explicit about allowed status transitions

## 26. Validation Rules

Validate before activation or execution:

- supported event type
- active workflow version
- valid trigger
- valid condition schema
- valid action schema
- tenant ownership
- duplicate event
- duplicate execution
- scheduled time
- timezone
- retry count
- dead-letter retry eligibility
- disabled workflow
- suspended tenant
- revoked Patient Link
- cancelled booking
- paid invoice
- missing contact destination
- missing consent
- invalid template
- unsupported action
- unsafe payload

Invalid workflows should not activate.

Invalid executions should fail safely with a non-sensitive error summary.

## 27. Scalability and Reliability

Design considerations:

- high event volume: batch claim and process
- concurrent workers: row locks and idempotency keys
- queue locking: `for update skip locked`
- at-least-once processing: idempotent downstream actions
- eventual consistency: UI should show queued/pending states where needed
- backpressure: priority and tenant fairness
- tenant fairness: avoid one tenant monopolizing queue workers
- retry storms: exponential backoff and dead-letter thresholds
- dead-letter growth: monitoring and retention policies
- retention: archive old execution logs after defined period
- partitioning readiness: high-volume tables may later partition by month or tenant hash
- workflow version growth: immutable versions with archival
- scheduled-job performance: indexes on `status`, `available_at`, `tenant_id`, `priority`
- disaster recovery: outbox and executions are durable and replayable
- deployment rollback: workflow versions are immutable and reversible by activation state

## 28. Future AI Readiness

Future AI opportunities:

- suggest workflows based on practice behaviour
- detect missing automation
- explain failed workflows in safe plain language
- draft workflow conditions for admin approval
- recommend reminder timing
- identify unusual workflow failure patterns
- summarize dead-letter causes

AI must not directly activate workflows, execute actions, access hidden clinical content, or send communications without explicit approved controls.

## 29. Explicit Assumptions

- Domain workflow-event tables remain the canonical source of domain automation signals.
- The Workflow Engine adds central orchestration, not replacement domain logic.
- Communication delivery is not implemented yet.
- Patient Link remains read-only in the current milestone.
- Staff tasks are readiness infrastructure, not full task-management product scope yet.
- Worker runtime selection can start with scheduled serverless workers and evolve to a dedicated worker later.
- RLS and tenant isolation remain mandatory for all workflow tables.
- Super Admin visibility remains platform-operational and privacy-preserving.

## 30. Deferred Functionality

Deferred from Phase 5G Step 1:

- SQL migrations
- generated types
- React UI
- route changes
- worker implementation
- Edge Function implementation
- communication delivery
- payment gateway actions
- medical aid claims
- PDF generation
- external webhooks
- visual workflow builder
- AI workflow creation
- workflow execution

## 31. Recommended Implementation Roadmap

Follow the AlliDesk methodology:

### Architecture

- Approve this Phase 5G Workflow Engine architecture.
- Confirm initial system workflow categories.
- Confirm worker runtime choice.
- Confirm security and Super Admin visibility boundaries.

### Database

- Add central outbox, workflow definitions, versions, executions, steps, schedules, dead letters, and action-request tables.
- Add RLS policies.
- Add idempotency constraints.
- Add queue-claiming and transition functions.
- Add safe audit hooks where appropriate.

### Types

- Regenerate Supabase TypeScript types.
- Add typed workflow config helpers if needed.
- Avoid broad frontend integration until types are stable.

### Frontend

- Add a limited internal workflow monitoring page.
- Add tenant configuration only for safe settings.
- Add dead-letter/retry views for permitted users.
- Do not expose visual builder functionality initially.

### Integration

- Ingest existing booking, session, invoice, payment, and Patient Link workflow events into the outbox.
- Implement the first system workflows as action requests only.
- Add communication request readiness without sending messages.
- Add staff task readiness if approved.

### Testing

- Validate event ingestion idempotency.
- Validate queue claiming under concurrency.
- Validate retries and dead letters.
- Validate tenant isolation and RLS.
- Validate workflow cancellation on booking/invoice/Patient Link state changes.
- Validate no sensitive payload leakage.
- Validate observability metrics and audit events.


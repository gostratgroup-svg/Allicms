# Phase 5G Step 2: Workflow Engine Database Summary

## Objective

Phase 5G Step 2 adds the database foundation for the AlliDesk Workflow Engine.

This step is database-only. It does not implement workers, frontend workflow builders, communication delivery, external integrations, AI actions, or runtime automation execution.

The implementation preserves the existing domain-owned workflow event tables and adds a canonical orchestration layer that can consume those events safely.

## Migration

Migration file:

`supabase/migrations/202607130013_phase5g_workflow_engine.sql`

## Tables Created

### `workflow_event_outbox`

Canonical workflow event queue.

Purpose:

- Normalize workflow events emitted by bookings, sessions, invoices, payments, patient links, patients, and system processes.
- Provide idempotent event ingestion.
- Support worker claiming, retries, dead-lettering, correlation, causation, priority, delayed availability, and entity references.

Important fields:

- `tenant_id`
- `event_type`
- `event_version`
- `source_domain`
- `source_table`
- `source_event_id`
- `source_record_id`
- entity references such as `patient_id`, `booking_id`, `session_id`, `invoice_id`, `payment_id`, `patient_link_id`
- `idempotency_key`
- `payload`
- `processing_status`
- `attempt_count`
- `max_attempts`
- `locked_at`
- `locked_by`

### `workflow_definitions`

Workflow definition header table.

Purpose:

- Store system and tenant workflow definitions.
- Support active version tracking.
- Allow future tenant-specific workflow clones while preserving system workflows.

### `workflow_definition_versions`

Versioned workflow configuration.

Purpose:

- Store immutable-ish versions of trigger, condition, and action configuration.
- Allow validation before activation.
- Preserve version history as workflows evolve.

### `workflow_executions`

Runtime execution record for a workflow instance.

Purpose:

- Track the lifecycle of a workflow triggered by a canonical outbox event or manual/scheduled trigger.
- Store execution status, attempts, error summary, cancellation details, correlation, and idempotency.

### `workflow_step_executions`

Runtime record for individual workflow steps.

Purpose:

- Track each action step inside a workflow execution.
- Support retries, skips, dead-lettering, step idempotency, and per-step error state.

### `workflow_scheduled_jobs`

Scheduler foundation.

Purpose:

- Store delayed workflow work, reminder jobs, retry jobs, date-relative jobs, and future scheduled automation.
- Support worker claiming and cancellation/supersession.

### `workflow_dead_letters`

Dead-letter queue.

Purpose:

- Preserve failed outbox events, workflow executions, step executions, communication requests, action requests, and scheduled jobs for review and retry.

### `workflow_action_requests`

Internal action request queue.

Purpose:

- Queue non-communication workflow actions such as creating staff tasks, updating patient link availability, requesting PDF generation, or requesting domain RPC execution.
- Keep external side effects out of normal staff-facing UI tables.

### `communication_requests`

Communication request queue.

Purpose:

- Store future outbound communication requests for WhatsApp, email, SMS, patient link notifications, and internal notifications.
- This table does not send communication. It only records the request for a future delivery worker.

### `staff_tasks`

Workflow-created staff task foundation.

Purpose:

- Store operational tasks created by workflows, such as intake follow-up, payment follow-up, invoice review, booking follow-up, or security review tasks.

## Existing Event Sources Preserved

The migration does not replace the existing domain workflow event tables.

It adds ingestion triggers for:

- `booking_workflow_events`
- `session_workflow_events`
- `invoice_workflow_events`
- `payment_workflow_events`
- `patient_link_workflow_events`

Each inserted domain event is copied into `workflow_event_outbox` through a common trigger function.

## Event Ingestion Strategy

Events are ingested through:

- `enqueue_domain_workflow_event_trigger()`
- `enqueue_workflow_event(...)`

The ingestion strategy is:

1. Domain table records a workflow event.
2. Insert trigger calls `enqueue_workflow_event(...)`.
3. The event is inserted into `workflow_event_outbox`.
4. Idempotency prevents duplicate canonical events.
5. Future workers claim canonical outbox events from `workflow_event_outbox`.

This keeps domain modules independent while giving the platform one workflow orchestration queue.

## Idempotency

Idempotency is enforced with partial unique indexes where records are not soft-deleted.

Important idempotency indexes include:

- `workflow_event_outbox_idempotency_idx`
- `workflow_executions_idempotency_idx`
- `workflow_step_executions_idempotency_idx`
- `workflow_scheduled_jobs_idempotency_idx`
- `workflow_action_requests_idempotency_idx`
- `communication_requests_idempotency_idx`
- `staff_tasks_idempotency_idx`

The outbox also has a unique source event index so the same domain event cannot be ingested twice.

## Workflow Definitions And Versioning

The model separates:

- workflow header: `workflow_definitions`
- executable configuration: `workflow_definition_versions`

Definitions can be system-owned or tenant-owned.

Version records store:

- trigger type
- trigger event type
- trigger config
- condition config
- action config
- timezone strategy
- validation metadata

Only one active version is allowed per workflow definition.

## Seeded System Workflows

The migration seeds disabled system workflows for future activation:

- `system.session_completed.draft_invoice_recovery`
- `system.invoice_issued.patient_link_available`
- `system.payment_recorded.receipt_available`
- `system.booking_updated.patient_link_appointment`
- `system.patient_link.access_failure.security_review`

These are intentionally disabled by default. They provide the future system workflow catalogue without triggering runtime behaviour yet.

## Transactional Functions

The migration adds the following workflow functions:

- `enqueue_workflow_event(...)`
- `validate_workflow_definition_version(uuid)`
- `activate_workflow_version(uuid)`
- `claim_workflow_outbox_events(text, integer)`
- `complete_workflow_outbox_event(uuid, text)`
- `fail_workflow_outbox_event(uuid, text, text, text, boolean)`
- `claim_workflow_scheduled_jobs(text, integer)`
- `cancel_workflow_execution(uuid, text)`
- `retry_workflow_dead_letter(uuid)`

Worker-oriented functions are granted to `service_role` only.

Authenticated tenant users may validate, activate, cancel, and retry through permission-checked RPCs where appropriate.

## Claiming And Locking Strategy

Worker claim functions use row-level locking semantics with `for update skip locked`.

This allows multiple future workers to safely claim work without double-processing the same row.

Claimed rows store:

- `locked_at`
- `locked_by`
- incremented `attempt_count`
- updated processing status

## Retry And Dead-Letter Model

Retry and dead-letter readiness is included in:

- outbox status fields
- execution status fields
- step status fields
- scheduled job status fields
- `workflow_dead_letters`

Failures can be classified as:

- transient
- configuration
- validation
- permission
- domain_state
- provider
- security
- unknown

This supports future operational review and safe retry behaviour.

## Action Requests

`workflow_action_requests` is the bridge between workflow orchestration and future domain side effects.

Supported action categories include:

- communication
- patient_link
- staff_task
- finance
- booking
- patient_history
- document
- notification
- integration
- ai

This keeps side-effect execution explicit and reviewable.

## Communication And Staff Task Readiness

`communication_requests` prepares the workflow engine for future manual or automated:

- WhatsApp messages
- email
- SMS
- patient link notifications
- internal notifications

`staff_tasks` prepares the workflow engine to create operational follow-up tasks for practice users.

Neither table sends communication or assigns real-time work yet.

## RLS And Permissions

Row Level Security is enabled on every new table.

Policies follow the existing tenant membership pattern:

- Tenant members can read relevant workflow operational records.
- Tenant admins/config users can manage workflow definitions and versions.
- Staff tasks can be read by tenant members and managed by tenant admin/config users.
- Communication request creation is limited to tenant admin/config users.

Service-role-only worker RPCs are intentionally not granted to normal authenticated users.

## Tenant Integrity

The migration adds `validate_workflow_tenant_integrity()`.

This trigger validates tenant consistency across workflow-owned relationships, including:

- workflow definition to active version
- workflow version to definition
- workflow execution to definition/version/outbox event
- workflow step to execution/version
- scheduled job to execution/step/outbox
- action request to execution/step
- communication request to workflow execution/step/action request

Domain entity tenant integrity remains the responsibility of the domain tables, RLS policies, and future worker/domain RPCs.

## Index Review

Indexes were added for:

- outbox claiming
- idempotency
- source events
- status lookups
- trace/correlation lookup
- entity references
- workflow version activation
- scheduled jobs due for processing
- dead-letter review
- action request claiming
- communication request claiming
- staff task queues and assignees

These indexes are intentionally oriented around workflow processing and operational support views.

## Audit And Observability

The workflow engine is audit-compatible through:

- append-style outbox events
- workflow execution records
- step execution records
- action requests
- communication requests
- staff tasks
- dead letters
- correlation IDs
- causation IDs

The migration does not invent new audit triggers because the current project does not yet have a universal audit trigger convention for all operational tables.

Future work can add `audit_events` writes from workflow RPCs or domain services once runtime execution exists.

## Database Types

`src/lib/database.types.ts` was updated to include:

- all new workflow tables
- all new communication/staff task tables
- new workflow RPC definitions

## Worker Layer Responsibilities

The future workflow worker must handle:

- claiming outbox events
- matching active workflow definitions
- evaluating workflow conditions
- creating workflow executions and step executions
- creating action requests
- creating communication requests
- creating scheduled jobs
- completing or failing work
- moving unrecoverable failures into `workflow_dead_letters`
- enforcing domain-level validation before executing side effects

The database foundation intentionally does not run these behaviours automatically.

## Data Retention Readiness

The schema includes:

- `deleted_at` on configuration and operational records where soft delete is appropriate
- status fields for cancellation, failure, completion, and dead-lettering
- correlation fields for traceability

Future retention policies can archive or purge workflow operational records without changing core domain records.

## Local Verification

Attempted local Supabase verification:

```bash
npx supabase migration list --local
npx supabase status
```

Result:

The CLI could not connect to the local Supabase/Postgres environment. `migration list --local` could not connect to Postgres, and `supabase status` reported that Docker was not running:

```text
failed to connect to postgres
Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?
```

Because Docker/local Supabase was unavailable in this shell, the migration could not be executed against a local database during this step.

Static validation completed:

- migration file created
- database types updated
- TypeScript build passed
- `git diff --check` passed

## Assumptions

- Existing domain workflow event tables remain the source of domain-specific event truth.
- The canonical workflow outbox is the source of workflow-orchestration truth.
- Worker execution will run with service-role privileges in a secure backend environment, not in the browser.
- Staff-facing UI may later read workflow execution, staff task, and communication request state through RLS.
- Super Admin platform access remains separate from tenant operational workflow data.

## Deferred Functionality

The following are intentionally deferred:

- workflow runtime worker
- visual workflow builder
- workflow activation UI
- frontend workflow management screens
- communication delivery
- patient link communication rendering
- PDF/document generation
- payment gateway integration
- external webhooks
- AI workflow actions
- full audit trigger automation
- retention jobs
- operational support dashboards

## Validation Commands

Completed:

```bash
npm run build
git diff --check
```

The build passed. The existing Vite large chunk warning remains and is unrelated to this workflow database step.

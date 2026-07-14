# Phase 5G Steps 4 & 5: Workflow Engine Integration, Hardening, Testing, Validation, and Completion

## Summary

Phase 5G Steps 4 and 5 completed the Workflow Engine integration and production-hardening pass for the current code milestone.

The Workflow Engine remains an orchestration foundation. It normalizes domain workflow events into a central outbox, exposes workflow definition/version administration, and provides readiness tables for executions, scheduled jobs, action requests, communication requests, staff tasks, and dead letters.

No worker runtime, communication delivery, AI execution, external webhook execution, or automatic domain mutation was added.

## Files Reviewed

- `docs/phase5g-step1-workflow-engine-architecture.md`
- `docs/phase5g-step2-workflow-engine-database-summary.md`
- `docs/phase5g-step3-workflow-engine-frontend-summary.md`
- `supabase/migrations/202607130013_phase5g_workflow_engine.sql`
- `src/pages/PracticeWorkflows.tsx`
- `src/lib/database.types.ts`
- Phase 5B booking workflow event contracts
- Phase 5C session workflow event contracts
- Phase 5D invoice workflow event contracts
- Phase 5E payment and finance workflow event contracts
- Phase 5F Patient Link workflow event contracts
- Existing authorization and tenant-role helpers
- Existing RLS and `SECURITY DEFINER` patterns

## Integration Review

Validated by source review:

- Booking, Session, Draft Invoice, Finance, and Patient Link workflow-event tables are preserved as domain-owned sources.
- `workflow_event_outbox` is the canonical normalized orchestration queue.
- Domain event triggers enqueue canonical outbox records transactionally after source event insertion.
- Central outbox records retain source domain, source table, source event ID, source record ID, entity references, correlation ID, causation ID, and idempotency key.
- The frontend Workflow workspace reads workflow definitions, versions, executions, step executions, scheduled jobs, failures, action requests, communication requests, and staff tasks through tenant-scoped RLS.
- The Workflow UI does not use service-role credentials.
- Practice, Settings, Finance, Patient Link, Booking, Session, and Patient pages remain routed through the existing AppShell and permission framework.

## Event Validation

Validated by source review:

- Existing workflow event sources are not replaced.
- New domain workflow events are ingested into `workflow_event_outbox` by trigger.
- Duplicate canonical events are blocked by source-event and idempotency uniqueness.
- A forward correction now makes `enqueue_workflow_event(...)` return the existing outbox row for duplicate source events even if the incoming idempotency key differs.
- Source domain values are constrained.
- Payloads remain JSON objects and are intended for safe workflow metadata only.

Requires live Supabase verification:

- Actual trigger firing for each source table.
- Duplicate event ingestion under concurrent inserts.
- Tenant isolation with real tenant users and real source events.

## Outbox Validation

Validated by source review:

- `workflow_event_outbox` includes processing status, retry attempt counts, max attempts, priority, delayed availability, lock owner, lock timestamp, completion/failure timestamps, and dead-letter timestamp.
- Claim RPC uses `FOR UPDATE SKIP LOCKED`.
- Claim RPC is granted to `service_role` only.
- Complete/fail RPCs require the same worker ID that claimed the row.
- Failed outbox events either become retryable failed records or dead-letter records.
- Forward correction improves duplicate-source handling before insert.

Requires live Supabase verification:

- Worker claim race behaviour across concurrent workers.
- Lock expiry and reclaim behaviour.
- Retry scheduling under real PostgreSQL time.
- Dead-letter movement under max-attempt exhaustion.

## Workflow Definition Validation

Validated by source review:

- Definitions and versions are separate.
- Tenant workflows are tenant scoped.
- System workflows are global and centrally managed.
- Version history is preserved.
- Unique indexes prevent duplicate definition keys and duplicate active versions.
- Activation goes through `activate_workflow_version(...)`, validates configuration, supersedes prior active versions, sets the definition active version, and records audit history.

Correction added:

- `202607130014_phase5g_workflow_engine_hardening.sql` adds immutable published-version protection.
- Active, superseded, and archived workflow version configuration can no longer be directly mutated.
- Active definitions must reference an active version.
- Active versions must be the parent definition `active_version_id`.
- External webhook triggers/actions remain blocked for activation because external integration execution is deferred.
- Validation RPC now enforces Super Admin/system and tenant-admin/tenant permission boundaries.

## Execution Validation

Validated by source review:

- `workflow_executions` tracks status, attempts, retry timing, current step, failure summary, cancellation, correlation, causation, and idempotency.
- `workflow_step_executions` tracks action type, step key, step order, input/output summaries, retries, and failure state.
- Execution cancellation RPC is permission checked and cancels related scheduled jobs.
- Frontend execution view is read-only except for tenant-admin cancellation.

Requires live Supabase verification:

- Runtime creation of execution and step rows once the worker exists.
- Duplicate execution prevention under worker concurrency.
- Stale execution recovery.
- Step retry behaviour.

## Scheduled-Job Validation

Validated by source review:

- `workflow_scheduled_jobs` supports due scheduling, cancellation, supersession, retry timing, locks, worker claim readiness, timezone labels, target entities, and idempotency.
- Scheduled-job claim RPC uses `FOR UPDATE SKIP LOCKED` and is service-role only.
- Unique idempotency prevents duplicate active scheduled jobs for the same workflow context when stable keys are used.

Correction added:

- The frontend previously attempted direct table updates for job cancellation, but authenticated users only had `select` on `workflow_scheduled_jobs`.
- Added protected `cancel_workflow_scheduled_job(...)` RPC.
- Updated `PracticeWorkflows` to cancel scheduled jobs through the RPC.
- Updated `database.types.ts` with the new RPC signature.

Requires live Supabase verification:

- Due scheduling across real tenant/practice timezones.
- Booking reschedule and invoice due-date scheduling once runtime producers exist.
- Concurrent scheduled-job claims.
- Supersession behaviour with real generated jobs.

## Retry And Dead-Letter Validation

Validated by source review:

- Outbox failures can retry with exponential minute delay.
- Non-retryable or exhausted outbox failures create `workflow_dead_letters`.
- Dead letters preserve failure class, error code, safe context, attempt count, timestamps, retry count, resolution status, and auditability.
- Retry RPC is tenant-admin/Super Admin protected and resets linked outbox events to pending.

Requires live Supabase verification:

- Retry race behaviour.
- Duplicate retry requests.
- Dead-letter retry against missing or already-processed source records.

## Action Requests

Validated by source review:

- `workflow_action_requests` captures internal readiness records without executing side effects.
- `communication_requests` captures communication readiness without sending email, SMS, WhatsApp, or internal notifications.
- `staff_tasks` captures workflow-created task readiness.
- Idempotency indexes protect action requests, communication requests, and staff tasks.
- Payloads and summaries are bounded and JSON-shaped where relevant.

Requires live Supabase verification:

- Worker-created action request idempotency.
- Duplicate staff-task creation prevention under concurrent execution.
- Communication request safety using real template records.

## Permissions Review

Validated by source review:

- Tenant workflow mutation is restricted to tenant admins through RLS/RPC checks.
- Super Admin is required for system workflow activation/validation.
- Finance, therapist, receptionist, and communication-authorized users can view only what frontend permissions expose and RLS permits.
- Worker claim/complete/fail RPCs are service-role only.
- Frontend uses the browser Supabase client only.

Current local role model:

- Tenant Admin maps to `admin`.
- Finance maps to `finance`.
- Therapist maps to `therapist`.
- Reception maps to `receptionist`.
- Super Admin maps to platform `super_admin`.
- Dedicated Practice Manager and Read Only roles are not yet represented as separate role values in the current authorization model.

Requires live Supabase verification:

- Role-by-role RLS checks using real users.
- Super Admin system workflow activation.
- Tenant-admin-only workflow mutation.

## RLS Review

Validated by source review:

- RLS is enabled on all Workflow Engine tables.
- Workflow outbox, executions, steps, scheduled jobs, dead letters, action requests, communication requests, and staff tasks are tenant scoped.
- Authenticated users do not receive direct access to worker claim/complete/fail RPCs.
- Trigger/helper functions use fixed `search_path = public`.
- No hard-delete workflow UI path was added.
- The hardening migration keeps RLS intact and adds RPC-based cancellation instead of granting direct scheduled-job updates.

Requires live Supabase verification:

- Every Workflow Engine table under real tenant membership.
- `SECURITY DEFINER` execution with deployed function owners.
- Service-role-only worker RPC access from the deployed Supabase project.

## Idempotency Review

Validated by source review:

- Outbox idempotency is enforced by tenant/idempotency key and source event uniqueness.
- Executions, step executions, scheduled jobs, action requests, communication requests, and staff tasks have idempotency uniqueness where applicable.
- Forward migration makes duplicate source-event ingestion idempotent even when duplicate source and duplicate idempotency paths differ.

Requires live Supabase verification:

- Duplicate insert races.
- Duplicate retry/cancellation requests.
- Duplicate action/staff task creation once runtime workers exist.

## Concurrency Review

Validated by source review:

- Activation locks target version and definition.
- Only one active version per definition is allowed by unique partial index.
- Forward migration adds deferred activation graph checks so active definitions and active versions cannot drift apart.
- Outbox and scheduled-job claims use `FOR UPDATE SKIP LOCKED`.
- Worker completion/failure validates worker ownership.
- Execution cancellation locks the execution row.

Requires live Supabase verification:

- Activation races across two tenant-admin sessions.
- Worker claim races.
- Scheduled-job claim races.
- Retry and cancellation races.

## Code-Quality Review

Validated by source review:

- Workflow UI is scoped to monitoring and controlled definition/version administration.
- Large operational tables are paginated by query limits.
- Mutations guard duplicate clicks with `actionInProgress`.
- User-facing errors are normalized through `safeErrorMessage`.
- Direct scheduled-job mutation was removed in favor of a protected RPC.
- Existing application foundations were not redesigned.

Remaining technical debt:

- The Workflow page is large and could later be split into smaller components after runtime behaviour stabilizes.
- Dedicated Practice Manager and Read Only roles should be introduced in a future authorization milestone if required by the product model.

## Database Review

Reviewed migrations:

- `202607130013_phase5g_workflow_engine.sql`
- `202607130014_phase5g_workflow_engine_hardening.sql`

Forward-only migration added:

- `202607130014_phase5g_workflow_engine_hardening.sql`

Issues corrected:

- Duplicate source-event outbox ingestion could fail under a different idempotency key.
- Published workflow versions were not sufficiently immutable against direct updates.
- Active definition/version graph could drift through direct table mutation.
- Validation RPC lacked an explicit permission boundary.
- Scheduled-job cancellation UI attempted a direct table update that was not granted by the database.

## Deployment Dependencies

Apply the Phase 5G migrations in order:

- `202607130013_phase5g_workflow_engine.sql`
- `202607130014_phase5g_workflow_engine_hardening.sql`

The earlier Phase 5B, 5C, 5D, 5E, and 5F migrations must also be applied because Phase 5G references their domain event tables and operational records.

## Deferred Runtime Behaviour

Deferred by design:

- Worker execution runtime.
- Workflow execution creation from outbox events.
- Step execution processing.
- Scheduled job runtime processing.
- Communication delivery.
- AI execution.
- External webhook/integration execution.
- Direct automated mutation of Booking, Session, Invoice, Finance, Patient Link, or Clinical state.

## Local Testing Limitations

Local review could validate TypeScript, build output, static SQL structure, frontend call paths, and permission intent.

The following could not be fully verified without a running local Supabase/Docker database:

- RLS behaviour for every role.
- Trigger execution against real source events.
- `FOR UPDATE SKIP LOCKED` worker concurrency.
- Transaction rollback behaviour under RPC failures.
- Function grants and service-role-only RPC execution.
- Scheduled-job due handling with real PostgreSQL timestamps.
- Retry timing and lock expiry.
- Dead-letter insertion under real failures.

## Final Readiness Assessment

Phase 5G is complete for the current Workflow Engine foundation milestone.

The Workflow Engine is ready for deployment to the development Supabase project for live migration and role-based validation.

Phase 5 – Operational Engine is complete for the current product roadmap milestone and ready to move into Phase 6 – Clinical Engine after the Phase 5G migrations and live validation are applied.

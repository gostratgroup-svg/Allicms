# Phase 5G Step 3: Workflow Engine Frontend Summary

## Objective

Phase 5G Step 3 implements the first internal Workflow Engine administration and monitoring frontend.

This step does not implement a worker runtime, workflow action execution, communication delivery, external webhooks, AI workflow generation, or a visual workflow builder.

## Navigation And Route Placement

The Workflow Engine was added inside Practice administration because:

- Overview remains the operational command centre.
- Practice contains business administration and tenant configuration.
- Settings remain personal user settings.

Route added:

- `/practice/workflows`

The Practice hub now includes a Workflows card linking to the route.

## Files Changed

- `src/pages/PracticeWorkflows.tsx`
- `src/pages/Practice.tsx`
- `src/routes/appRoutes.tsx`
- `src/styles.css`
- `docs/phase5g-step3-workflow-engine-frontend-summary.md`

## Workflow Workspace Structure

The workflow workspace uses tabs:

- Workflows
- Executions
- Scheduled
- Failures
- Requests
- Tasks

The page also includes high-level health cards for:

- Pending action requests
- Failed executions
- Scheduled jobs
- Dead letters
- Communication requests
- Open staff tasks

These are tenant-scoped operational indicators and do not expose sensitive payloads.

## Workflow Definition List And Detail

The Workflows tab displays visible system and tenant workflow definitions with:

- workflow name
- workflow key
- category
- owner type
- status
- active or latest trigger event
- health indicator
- last updated metadata in the detail view
- tenant disable/clone flags
- active version
- trigger, condition, action and timezone summaries

The UI intentionally shows readable summaries rather than raw configuration JSON as the primary experience.

## Tenant Workflow Draft Support

Tenant admins can create controlled draft workflows with:

- name
- description
- category
- trigger event type
- action type
- optional delay minutes
- initial status

The form uses controlled select inputs and does not allow:

- arbitrary SQL
- JavaScript
- executable code
- external URLs
- raw secrets
- arbitrary database mutation

The UI also supports creating a new draft version from an existing tenant workflow configuration.

## System Workflow Behaviour

System workflows are labelled as system managed.

Tenant users can inspect system workflows where RLS allows visibility, but cannot edit or activate system workflow versions from this interface.

Mandatory system workflows cannot be disabled from the tenant UI.

Tenant overrides and cloning are not implemented yet.

## Version History

The workflow detail view displays version history with:

- version number
- status
- trigger event
- condition summary
- action summary
- active version indicator

Tenant admins can activate draft or validating tenant workflow versions.

Activated versions are not edited in place.

## Activation Flow

Activation uses:

`activate_workflow_version(...)`

Before activation:

- UI checks the user has the workflow configuration permission.
- UI only allows draft or validating versions.
- User confirmation is required.
- Duplicate submissions are blocked.

After activation:

- The workflow definition is reloaded from the database.
- The active version is verified before success is shown.
- The workspace data is refreshed.

## Enable And Disable Behaviour

Tenant workflows can be enabled, disabled, or paused using tenant-scoped updates.

The UI:

- blocks duplicate submissions
- uses current `updated_at` as a stale-state guard
- prevents tenant users from changing system workflow records
- reloads workflow records after success

Worker-dependent behaviour remains deferred. Disabling a workflow prevents future worker selection only after the worker runtime is implemented.

## Execution List And Detail

The Executions tab displays recent workflow executions with:

- workflow name
- trigger type
- status
- attempt count
- created time
- correlation ID preview

The detail view shows:

- status
- started/completed/failed timestamps
- next retry
- current step
- correlation ID
- safe error summary
- step executions
- linked scheduled jobs
- linked action requests

No sensitive payloads are displayed as the default experience.

## Step Execution Display

Step executions show:

- step order
- step key
- action type
- status
- attempt count
- safe input/output summaries
- safe error summary where present

The UI summarizes JSON by keys or item count rather than displaying raw payload content.

## Scheduled Jobs

The Scheduled tab shows:

- job type
- workflow context where derivable
- scheduled time
- target context summary
- status
- attempt count

Authorized users can cancel scheduled or failed jobs through the protected `cancel_workflow_scheduled_job(...)` RPC added during the Step 4/5 hardening pass.

## Failure And Dead-Letter Handling

The Failures tab shows:

- workflow context where derivable
- failure class
- safe error summary
- first failed time
- dead-letter time
- retry count
- resolution status

Authorized users can retry unresolved or retry-scheduled dead-letter items through:

`retry_workflow_dead_letter(...)`

The UI does not erase the original failure record.

## Manual Retry And Cancellation

Implemented:

- dead-letter retry via approved RPC
- execution cancellation via `cancel_workflow_execution(...)`
- scheduled job cancellation via `cancel_workflow_scheduled_job(...)`

Each action:

- checks permission
- requires confirmation or a reason
- prevents duplicate submissions
- refreshes database state after completion
- reports safe user-facing errors

## Action Request Display

Action requests are displayed as readiness records.

The UI shows:

- action type
- status
- available time
- attempt count
- target context summary
- safe payload summary
- safe error summary

The UI does not execute action requests.

## Communication Request Readiness

Communication requests are read-only in this step.

The UI shows:

- channel
- recipient type
- template key
- scheduled send time
- attempt count
- safe related context
- status

The UI does not send email, SMS, WhatsApp, internal messages, or Patient Link notifications.

## Staff Task Readiness

Staff tasks are displayed as lightweight workflow-created readiness records.

The UI shows:

- title
- task type
- assignee role
- priority
- due time
- status
- description

Authorized tenant admins can move tasks to `in_progress` or `completed`.

This is not a full task-management module.

## Overview Integration

No Overview integration was added in this step.

The workflow health indicators live inside `/practice/workflows` to avoid exposing workflow operational detail in the command centre before the worker runtime is implemented.

## Permissions And Security Boundaries

The page uses the existing authorization framework.

Current frontend permission assumptions:

- View access: `tenant.practice.configure`, `tenant.finance.view`, or `tenant.communication.manage`
- Configuration/mutation access: `tenant.practice.configure`

Database RLS remains the security source of truth.

The frontend never uses service-role credentials and never calls worker-only claim/complete/fail RPCs.

Anonymous users cannot reach the authenticated workflow workspace.

## Stale-State And Concurrency Handling

Implemented guards:

- duplicate submission prevention through `actionInProgress`
- `updated_at` matching for workflow status changes
- `updated_at` matching for scheduled-job cancellation
- `updated_at` matching for staff task updates
- database refresh after mutations
- activation verification after RPC completion

Worker locking, claim concurrency and scheduled runtime processing remain backend-worker responsibilities.

## Loading And Error States

Implemented states:

- loading workflow workspace
- no workflows
- no executions
- no scheduled jobs
- no failures
- no action requests
- no communication requests
- no staff tasks
- action success/error banners
- safe RLS/permission error translation
- unsupported system-workflow mutation messages

## Code Quality Structure

The first frontend foundation is contained in:

- `PracticeWorkflowsPage`
- focused tab components inside the same file
- shared helper functions for status tones, date formatting, JSON summaries and safe error messages

The implementation avoids adding a new design system and reuses:

- `PageHeader` via routing
- `Card`
- `Button`
- `StatusBadge`
- `SearchBar`
- `LoadingState`
- `EmptyState`
- `ErrorState`

## Known Limitations

- Workflow runtime workers are not implemented.
- Workflow actions are not executed.
- Communication requests are not delivered.
- System workflow tenant override/cloning is not implemented.
- Scheduled-job cancellation now uses the protected `cancel_workflow_scheduled_job(...)` RPC added during Step 4/5 hardening.
- Staff task updates are basic status changes only.
- Live RLS/RPC behaviour could not be fully verified locally without a running Supabase instance and seeded workflow records.
- The page currently shows safe summaries only, not full technical JSON inspection.

## Deferred Functionality

Deferred to later phases:

- worker runtime
- workflow action execution
- communication delivery
- email/SMS/WhatsApp sending
- external webhook execution
- AI workflow generation
- visual workflow builder
- workflow execution automation
- scheduled-job processor
- full task management
- tenant workflow override/cloning for system workflows
- Overview dashboard integration

## Validation

Completed:

```bash
npm run build
git diff --check
```

No lint or test scripts are configured in `package.json`.

The build passed. The existing Vite large-chunk warning remains.

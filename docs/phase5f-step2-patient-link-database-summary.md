# Phase 5F Step 2: Patient Link Database Foundation

## Objective

Phase 5F Step 2 implements the database-only foundation for the AlliDesk Patient Link. It preserves the existing `patient_links` table and extends it with secure external access support, verification challenges, session tracking, access logging and workflow-event readiness.

This step does not implement frontend Patient Link pages, staff authentication changes, patient-facing authentication screens, communication delivery, payment links, document downloads or messaging.

## Migration

Created:

`supabase/migrations/202607130009_phase5f_patient_link_foundation.sql`

The migration is forward-only and does not modify previous migrations.

## Existing Table Extended

### `patient_links`

The existing table was preserved and extended with:

- `public_identifier`
- `credential_hash`
- `credential_reset_at`
- `suspended_at`
- `replaced_by_patient_link_id`

The status constraint now supports:

- `pending`
- `active`
- `suspended`
- `revoked`
- `expired`
- `replaced`
- `archived`

The public identifier is intended for future Patient Link URLs and must not expose tenant IDs, patient IDs or sequential identifiers. Existing rows are backfilled from the existing opaque `link_token`, and credentials are stored only as hashes.

## New Tables

### `patient_link_access_grants`

Defines who may access a Patient Link and what patient-facing data categories are visible.

Supports:

- tenant ownership
- patient ownership
- responsible party access
- access type
- active/suspended/revoked lifecycle
- finance, appointments and document visibility flags
- revocation details
- metadata
- audit fields
- soft delete

### `patient_link_verification_challenges`

Stores one-time verification challenge records.

Supports:

- hashed verification code
- salt
- delivery method
- destination hash
- expiry
- attempt count
- max attempts
- verified/failed/expired/consumed state

Plain OTP or verification codes are never stored.

### `patient_link_sessions`

Stores external Patient Link sessions.

Supports:

- hashed session token
- patient link relationship
- access grant relationship
- patient relationship
- challenge source
- expiry
- revocation
- last activity
- IP and user-agent hashes

These sessions are intentionally separate from internal Supabase staff authentication.

### `patient_link_access_logs`

Tracks external Patient Link activity and security events.

Supported events include:

- login
- logout
- verification requested
- verification succeeded
- verification failed
- session created
- session expired
- access revoked
- invoice viewed
- appointment viewed
- receipt viewed
- suspicious activity

Secrets and raw verification values are not logged.

### `patient_link_workflow_events`

Supports future automation and communication workflows.

Supported events include:

- Patient Link created
- Patient Link activated
- verification requested
- verification completed
- access failed
- session created
- link revoked
- credentials reset
- invoice available
- receipt available
- appointment updated

Workflow events include `idempotency_key` to support safe future processors.

## Relationships

The Patient Link foundation links to existing Phase 5 tables:

- `tenants`
- `patients`
- `responsible_parties`
- `profiles`
- `patient_links`

The migration adds tenant-integrity triggers so Patient Link grants, challenges, sessions, logs and workflow events cannot reference related rows from another tenant.

## RLS

Row Level Security is enabled on every new table.

Internal tenant access remains conservative:

- Patient Link grants are readable/editable by tenant care users.
- Verification challenges are restricted to tenant admins.
- External sessions are restricted to tenant admins.
- Access logs are restricted to tenant admins.
- Workflow events are restricted to tenant admins.

No anonymous direct table access is granted.

This keeps the external Patient Link architecture ready for a future controlled access layer rather than exposing the tables directly.

## Verification Model

The verification model uses:

- opaque public identifiers
- hashed verification codes
- per-challenge salts
- expiry windows
- attempt limits
- consumed challenge state after session creation
- access logs for verification attempts
- workflow events for future automation

The database functions require the plaintext verification code only as input. The plaintext value is never persisted.

## Session Model

External sessions use:

- hashed session tokens
- expiry
- revocation support
- unique active token hashes
- last activity tracking
- IP/user-agent hashing
- access logs

Staff Supabase Auth sessions are not reused for Patient Link sessions.

## Hashing Strategy

The migration adds:

`hash_patient_link_secret(secret_input text, salt_input text default '')`

It uses PostgreSQL `pgcrypto` digest hashing. This provides the database foundation for hashed Patient Link credentials, verification codes and external session tokens.

Future production implementation may move additional secret generation and delivery to a trusted server-side layer, while keeping the database contract unchanged.

## RPCs

The migration adds transactional helper functions:

- `create_or_get_patient_link(target_patient_id)`
- `request_patient_link_verification(...)`
- `verify_patient_link(...)`
- `create_patient_link_session(...)`
- `revoke_patient_link_session(...)`
- `reset_patient_link_credentials(target_patient_link_id)`

The functions validate tenant context, patient/link relationships and grant state where applicable.

## Type Updates

Updated:

`src/lib/database.types.ts`

Added local database types for:

- `patient_link_access_grants`
- `patient_link_verification_challenges`
- `patient_link_sessions`
- `patient_link_access_logs`
- `patient_link_workflow_events`

Also updated `patient_links` and added RPC signatures for the new Patient Link functions.

The project currently follows the existing manual local type-update convention because local Supabase type generation is not available in this repo setup.

## Audit And Workflow Readiness

The migration records Patient Link operational activity in dedicated access logs and workflow events.

It does not add direct `audit_events` triggers because the existing project does not have a universal audit trigger convention. Future audit integration can consume the access logs/workflow events or add a shared audit trigger once the platform-level audit worker exists.

## Assumptions

- Patient Link external access will be served through a future controlled application/API layer.
- Anonymous direct Supabase table access remains closed.
- Patient Link URLs will use `public_identifier`, never patient IDs or tenant IDs.
- Responsible party access will be configured by tenant users before external access is granted.
- Communication delivery, OTP sending and rate limiting will be implemented in later steps.

## Deferred Functionality

Deferred to later Patient Link steps:

- Patient Link frontend routes/pages
- external Patient Link verification screens
- communication delivery by email/SMS/WhatsApp
- rate limiting middleware
- Patient Link payment links
- document download rendering
- patient-facing invoice/receipt views
- patient-facing appointment views
- Patient Link messaging
- server-side secret delivery
- audit worker integration

## Validation

Validation completed:

- `npm run build` passed.
- `git diff --check` passed.

Local Supabase execution was attempted with:

```bash
npx supabase db reset --local
```

It could not run because Docker was not available:

```text
Cannot connect to the Docker daemon at unix:///var/run/docker.sock.
```

The migration was therefore not applied to a local Docker-backed Supabase instance in this environment.

The Vite build still reports the existing chunk-size warning. This is a bundle-size warning and did not fail the build.

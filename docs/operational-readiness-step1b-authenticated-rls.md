# Operational Readiness Step 1B — Authenticated RLS Validation

Date: 2026-07-17

## Target Environment

- Supabase project: `allidesk-dev`
- Project ref: `wdhfhdpcrcuyxqjehiyy`
- Classification: development only
- Data classification: fictional seed data only

## Purpose

Step 1B validates the AlliDesk security model using dedicated Supabase Auth users rather than a service-role-only path.

The work focused on:

- Linking existing Auth users to seeded tenant fixtures.
- Validating tenant isolation with authenticated role context.
- Validating role-specific visibility.
- Validating anonymous access boundaries.
- Validating Patient Link public/session boundaries.
- Proving protected lifecycle fields cannot be bypassed by direct table updates.

No passwords, JWTs, service-role keys, real patient data, or real clinical data are stored in this repository.

## Dedicated Auth Users Linked

The following existing Supabase Auth users were discovered and linked to fictional seed fixtures:

| Email | Tenant | Role |
| --- | --- | --- |
| `gostratgroup+allidesk-admin-a@gmail.com` | Tenant A | admin |
| `gostratgroup+allidesk-therapist-a@gmail.com` | Tenant A | therapist |
| `gostratgroup+allidesk-reception-a@gmail.com` | Tenant A | receptionist |
| `gostratgroup+allidesk-finance-a@gmail.com` | Tenant A | finance |
| `gostratgroup+allidesk-admin-b@gmail.com` | Tenant B | admin |

The repeatable linking script is:

```text
supabase/seeds/operational_readiness_auth_user_links.sql
```

Rerun safety evidence:

- Linked memberships: `5`
- Session-linked clinical notes: `1`
- Clinical note versions: `1`
- Patient Link grants: `1`

## Clinical Note Fixture

Step 1B extends the fictional seed state with one session-linked clinical note:

- Clinical encounter linked to Tenant A patient, booking, session, therapist and location.
- Clinical note linked to the same session.
- Clinical note version stores fictional structured and free-text content.

This fixture is for RLS and smoke-path validation only.

## Authenticated RLS Harness

The repeatable authenticated RLS harness is:

```text
supabase/smoke-tests/operational_readiness_authenticated_rls.sql
```

The harness uses:

- `SET LOCAL ROLE authenticated`
- `request.jwt.claim.sub` set to each dedicated Auth user id
- transactional rollback safety for direct mutation checks
- no passwords
- no JWT storage
- no service-role-only validation

## Authenticated RLS Results

Final harness result: **passed**

| Area | Check | Result |
| --- | --- | --- |
| Tenant isolation | Tenant A admin sees Tenant A patient | passed |
| Tenant isolation | Tenant A admin cannot see Tenant B patient | passed |
| Tenant isolation | Tenant A admin cannot update Tenant B patient | passed |
| Tenant isolation | Tenant B admin sees Tenant B patient | passed |
| Tenant isolation | Tenant B admin cannot see Tenant A patient | passed |
| Role access | Admin operational read matrix | passed |
| Role access | Therapist read matrix | passed |
| Role access | Reception read matrix | passed |
| Role access | Finance read matrix | passed |
| Lifecycle bypass | Direct session lifecycle update cannot bypass RPC | passed |
| Lifecycle bypass | Direct invoice lifecycle update cannot bypass RPC | passed |

Observed role matrices:

- Admin: patients `1`, bookings `1`, sessions `1`, invoices `1`, clinical notes `1`
- Therapist: patients `1`, bookings `1`, sessions `1`, invoices `0`, clinical notes `1`
- Reception: patients `1`, bookings `1`, sessions `1`, invoices `0`, clinical notes `0`
- Finance: patients `1`, bookings `1`, sessions `1`, invoices `1`, payments `1`, clinical notes `0`

## Lifecycle Bypass Repair

The authenticated harness identified that direct updates could mutate protected lifecycle fields before hardening.

Forward-only repair migrations were created and deployed:

1. `202607170006_operational_readiness_lifecycle_direct_update_guard.sql`
2. `202607170007_operational_readiness_lifecycle_rpc_call_stack_guard.sql`

Final behaviour:

- Direct authenticated session lifecycle mutation is blocked with:
  - `Session lifecycle changes must use approved RPCs`
- Direct authenticated invoice lifecycle mutation is blocked with:
  - `Invoice lifecycle changes must use approved RPCs`
- Existing approved lifecycle RPCs remain usable through controlled SECURITY DEFINER function paths.

## Anonymous Access Results

Anonymous REST validation used the public anon key from local `.env` without printing the key.

| Check | Result |
| --- | --- |
| Anonymous `patients` table read | denied with `42501` |
| Anonymous `clinical_notes` table read | denied with `42501` |
| Patient Link public context | allowed |
| Patient Link portal data without valid session | returns `expired_session` only |

This confirms anonymous users cannot browse tenant operational or clinical tables, while the intended public Patient Link context path remains available.

## Patient Link Validation

The seeded Patient Link was validated through the public verification/session path.

Evidence:

- Public context returns practice branding/context and `verification_required`.
- Verification challenge can be requested for the seeded fictional grant.
- A valid external Patient Link session can access portal data.
- Invalid session tokens return only `expired_session`.
- Portal data remains scoped to the seeded fictional Patient Link and does not expose direct patient ids.

## Authenticated Core Smoke Path

The terminal seeded smoke path was validated through dedicated authenticated users without replaying mutating payment steps on the already-paid fixture.

Evidence:

- Finance user sees invoice `paid`, payment `paid`, total `780.00`, amount paid `780.00`, balance due `0.00`, payment count `1`, allocation count `1`.
- Therapist user sees the seeded session and one linked clinical note.
- Admin user sees patient history count `5`, workflow event outbox count `13`, tenant audit count `8`.

The original mutating core booking-to-paid-invoice path remains documented in Step 1 and was not duplicated in Step 1B to avoid creating duplicate payments.

## Generated Types

`src/lib/database.types.ts` was regenerated from the live `allidesk-dev` schema after the Step 1B repair migrations.

## Deferred Items

The following are outside Step 1B and remain deferred:

- Supabase Storage
- File uploads
- PDF generation
- Workflow worker runtime
- Patient Link expansion
- Communication delivery
- Payment gateways
- Medical aid claims
- AI
- New clinical modules

## Outcome

Operational Readiness Step 1B status: **completed**

The authenticated security baseline is now strong enough to proceed to the next operational readiness implementation step.

# Operational Readiness RLS Manual Checklist

This checklist is required because service-role SQL does not prove Row Level Security.
Run it only against a confirmed development or staging Supabase project.

## Required Test Users

- Tenant A admin user
- Tenant A therapist user
- Tenant A receptionist user if the pilot role is available
- Tenant A finance user if the pilot role is available
- Tenant B admin user
- Anonymous/no-session browser
- Valid Patient Link session for one Tenant A patient
- Expired/revoked Patient Link fixture

## Tenant Isolation

1. Sign in as Tenant A admin.
2. Confirm Tenant A can read only Tenant A practice, patients, bookings, sessions, invoices, payments and workflows.
3. Attempt direct browser/API reads of known Tenant B record IDs.
4. Expected: zero rows or permission errors. Never Tenant B data.
5. Attempt update/delete of known Tenant B record IDs.
6. Expected: permission error or zero affected rows.

## Role Access

1. Sign in as Tenant A therapist.
2. Confirm allowed patient/session/clinical scope works.
3. Confirm finance-only operations are blocked unless the therapist is also granted finance/admin permissions.
4. Sign in as receptionist.
5. Confirm scheduling and patient admin scope works.
6. Confirm protected clinical content is not readable unless explicitly allowed by policy.
7. Sign in as finance user.
8. Confirm invoices, payments, accounts and receipts are accessible.
9. Confirm clinical note content is blocked.

## Patient Link

1. Open an invalid public Patient Link.
2. Expected: invalid/expired state, no patient identifiers leaked.
3. Open a revoked Patient Link.
4. Expected: revoked state, no records leaked.
5. Open a valid Patient Link and complete verification.
6. Confirm only the intended patient-facing booking, invoice, receipt and practice details are visible.
7. Confirm clinical notes, treatment plans and internal comments are not visible.

## Lifecycle Protection

1. Attempt to complete a session by direct table update.
2. Expected: blocked if lifecycle RPC is required, or the result is clearly documented as a current policy gap.
3. Complete a session through the approved RPC/UI path.
4. Confirm session history and workflow events are created.
5. Attempt to confirm/issue an invoice by direct table update.
6. Expected: blocked if lifecycle RPC is required, or the result is clearly documented as a current policy gap.
7. Confirm/issue invoice through approved RPC/UI path.
8. Confirm invoice history, patient history and workflow events are created.

## Evidence To Record

- Test project ref, not secrets.
- User email labels, not passwords.
- Browser/API result for each step.
- Whether each result is pass, fail, blocked or not implemented.

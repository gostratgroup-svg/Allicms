# Phase 5F Step 4: Patient Link Integration and Security Hardening

## Objective

Phase 5F Step 4 hardens the Patient Link integration before final validation.

This step preserves the existing Patient Link architecture, external session model, public projection boundary, internal staff application shell, authorization framework, and AlliDesk UI system.

It does not implement communication delivery, payment links, patient messaging, document downloads, online booking, appointment changes, PDFs, or workflow automation execution.

## Files Changed

- `src/pages/PatientLinkPortal.tsx`
- `src/lib/database.types.ts`
- `supabase/migrations/202607130011_phase5f_patient_link_hardening.sql`
- `docs/phase5f-step4-patient-link-integration-hardening-summary.md`

## Public Route Security

The public Patient Link route remains isolated from the internal authenticated staff app.

The `/p/:publicIdentifier/*` route:

- bypasses internal staff authentication
- does not use staff `AuthContext`
- does not resolve tenant memberships
- does not grant internal app access from Patient Link sessions
- uses only a public identifier in the URL
- redirects unauthenticated direct access to the verification screen
- fails arbitrary nested routes safely
- does not place tokens, verification codes, tenant IDs, patient IDs, or responsible-party IDs in query parameters

The public context RPC was tightened so invalid or unavailable links do not reveal patient details before verification.

## External Session Handling

The Patient Link portal continues to use a separate external session token stored under the localStorage key prefix:

`allidesk.patientLinkSession.`

The browser stores only the external session credential for the current public identifier. It does not store Supabase Auth data, tenant IDs, patient IDs, responsible-party IDs, or verification codes.

Hardening added:

- session expiry timer with automatic cleanup
- storage-event handling for logout/session removal across tabs
- portal data clearing before reloads
- portal data clearing before dependent switching
- session cleanup on expired, revoked, suspended, unavailable, tenant-unavailable, and no-active-grant states
- logout access logging before session revocation

Security tradeoff:

Local browser storage allows refresh recovery for a low-friction patient-facing portal. The stored token is still an external Patient Link token, not an internal staff credential. The database remains authoritative and rejects expired, revoked, reset, or grant-invalid sessions on every projection call.

## Verification Hardening

A new browser-safe verification RPC was added:

`request_patient_link_public_verification(...)`

This replaces the browser's previous ability to submit a plaintext verification code into the challenge request flow.

The hardened verification request:

- generates verification material inside the database function
- hashes the verification code with a per-challenge salt
- never returns the plaintext code to the browser
- returns generic success-style responses to prevent enumeration
- returns the same generic response shape for unavailable links or grants, using a non-persisted challenge identifier where needed
- validates tenant, link, patient, and active grant state
- logs blocked no-grant requests without exposing details
- records a workflow event for future communication delivery

The old lower-level request function has public execution revoked by the forward-only hardening migration.

Communication delivery is still intentionally deferred. The challenge record is created with `delivery_deferred: true` so a future email, SMS, or WhatsApp delivery worker can send codes without exposing them in the frontend.

## Responsible-Party and Dependent Access

The portal projection now validates dependent access through active access grants on every data request.

Dependent switching:

- uses public identifiers only
- clears stale patient data before loading the next dependent
- revalidates access through the projection RPC
- resets the selected dependent if access was removed
- only returns patients with active grants
- excludes archived or merged patients

Responsible-party finance visibility is scoped so patient-facing invoices and receipts are returned only where the selected grant permits finance visibility and, where applicable, the responsible party matches the billed party.

## Appointment Projection Rules

The appointment projection returns only patient-facing booking data:

- date/start time
- end time or duration
- approved booking status
- appointment type
- mode
- therapist display name
- location name
- room label
- patient-facing title
- patient-facing notes

It excludes:

- internal booking notes
- administrative notes
- booking source payloads
- session operational notes
- clinical outcomes
- medical information
- patient alerts
- internal booking IDs

The query now applies row limits before JSON aggregation.

## Invoice Projection Rules

The invoice projection returns only issued patient-facing finance data:

- invoice number
- invoice status
- payment status
- service date
- invoice date
- issued date
- due date
- currency
- total amount
- amount paid
- balance due
- non-informational line snapshots

It excludes:

- draft invoices
- internal invoice IDs
- internal finance notes
- reconciliation-required invoices
- workflow payloads
- issuer configuration
- private banking records

Finance totals remain database-authoritative.

The query now applies row limits before JSON aggregation.

## Receipt Projection Rules

The receipt projection returns only patient-facing receipt data:

- receipt number
- receipt status
- receipt date
- issued date
- payment amount
- currency
- payment method
- payment reference
- allocation snapshot

It excludes internal finance notes, bank secrets, unrelated invoices, and internal receipt IDs.

The query now applies row limits before JSON aggregation.

## Practice and Privacy Projection

The public practice projection is limited to patient-facing information:

- practice display name
- main email
- main phone
- website
- country
- active location address/contact details
- branding logo and colours

It excludes tenant administration data, billing configuration, private bank accounts, staff-only contacts, API credentials, and workflow configuration.

## RPC Security Review

The Step 4 migration keeps all public data access behind security-definer RPCs with a fixed `search_path = public`.

The projection RPC:

- validates the public link
- validates tenant status
- validates link status
- validates external session token hash
- validates session expiry
- invalidates sessions created before credential reset
- validates active access grants
- derives tenant and patient scope from the validated link, session, and grant
- rejects archived and merged patients
- returns only approved projection fields

The frontend does not query operational tables directly.

## Access Logging

Access logging remains scoped to meaningful events:

- verification requested
- blocked verification requested without active grant
- appointment list viewed
- invoice list viewed
- receipt list viewed
- logout
- invalid or expired session attempts

Logs do not include tokens, verification codes, full invoice payloads, full receipt payloads, or patient secrets.

## Cache and Stale-State Handling

The frontend now clears protected portal data when:

- logout is triggered
- a session expires
- a portal reload fails
- an access state is no longer active
- a dependent is switched
- another tab removes the stored session token

The portal uses a request counter to ignore stale projection responses from older requests.

## Error Handling

Expected secure states are converted into safe user-facing messages:

- expired session
- no active access grant
- tenant unavailable
- suspended Patient Link
- revoked Patient Link
- unavailable patient record
- projection/network failure

Messages avoid raw PostgreSQL, RPC, token, tenant, grant, responsible-party, or patient identifiers.

## Accessibility and Mobile Improvements

This step keeps the UI simple and read-only while improving hardening-related UX:

- verification messages use live-region announcements
- global portal errors use `role="alert"`
- dependent switching is labelled
- logout remains keyboard-accessible
- loading states prevent stale patient data from remaining visible during dependent switches
- invoice and receipt list keys no longer depend on internal IDs

No broad redesign was performed.

## Code Quality Changes

Focused changes were made only where they support security and maintainability:

- removed pre-verification patient hint usage
- added safe access-state message mapping
- switched challenge requests to the new public verification RPC
- removed browser-generated verification-code behaviour
- added stale-request protection for portal projection loads
- removed reliance on internal invoice/receipt IDs in React list keys

## Database Corrections

New forward-only migration:

`supabase/migrations/202607130011_phase5f_patient_link_hardening.sql`

This migration:

- replaces the public context projection to remove pre-verification patient detail leakage
- adds `request_patient_link_public_verification(...)`
- tightens portal projection session, tenant, link, grant, and patient validation
- validates responsible-party/dependent access on every projection call
- applies row limits before JSON aggregation
- limits appointment, invoice, receipt, consent, practice, and branding fields to patient-facing data
- tightens access logging
- revokes public access to the older browser-unsafe verification request function

## Deployment and Live Verification Limitations

The migration was authored as a forward-only SQL migration. Local Supabase execution was not performed in this step.

The following require live Supabase verification after applying migrations `202607130009`, `202607130010`, and `202607130011`:

- RPC execution against real RLS-enabled tables
- external session expiry/revocation behaviour
- credential reset invalidation
- responsible-party grant switching
- no-active-grant behaviour
- projection row limits at database runtime
- access-log inserts
- verification challenge attempt limits and consumed-state behaviour
- rate-limit/cooldown behaviour
- communication delivery handoff once implemented

## Deferred Functionality

Still intentionally not implemented:

- Email, SMS, or WhatsApp delivery
- Payment links or payment processing
- PDF downloads
- Document downloads
- Patient messaging
- Online forms
- Online booking
- Appointment cancellation or rescheduling
- External calendar integration
- Patient mobile app
- Workflow automation execution

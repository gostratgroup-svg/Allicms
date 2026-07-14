# Phase 5F Step 1: Patient Link Architecture

## 1. Objective

Phase 5F designs the Patient Link architecture before implementation.

Patient Link is the external, secure, read-only experience where a patient, responsible party, parent, guardian, or authorised representative can access approved practice information without becoming an internal AlliDesk user.

This document preserves the existing AlliDesk foundations:

- multi-tenancy
- Supabase Auth and internal identity model
- RLS model
- Patient Engine
- Responsible Party model
- Booking Engine
- Session Engine
- Draft Invoice Engine
- Finance Workflow
- patient history
- workflow-event conventions
- practice branding and communication configuration

No migrations, generated types, frontend routes, UI, communication delivery, PDFs, payments through Patient Link, or messaging are implemented in this step.

## 2. Core Principles

### Permanent Patient Link Identity

Each patient should have one stable Patient Link identity for the lifetime of the patient record unless it is revoked, archived, merged, or replaced for security reasons.

The link identity belongs to the patient record. Access to that link can be granted to the patient and/or responsible parties.

### External Access Is Separate From Internal Access

Patient Link users must never become internal tenant users.

Patient Link must not reuse:

- staff sessions
- tenant roles
- internal application routes
- internal permissions
- internal AppShell navigation

### Approved Projection Only

Patient Link must never expose full internal rows.

All data shown externally should come from explicit patient-facing projections or server-side functions that select approved fields only.

### Read-Only Milestone

The current Patient Link milestone is read-only.

Patient Link may display approved information, but it must not allow:

- editing appointments
- editing invoices
- recording payments
- posting messages
- editing clinical content
- modifying internal patient records

### Privacy By Architecture

Patient Link should expose only information that the practice has approved for external visibility.

Internal notes, clinical records, workflow payloads, audit events, staff comments, and tenant operational data remain private.

## 3. Existing `patient_links` Foundation

The current Patient Engine includes `patient_links`.

Current fields include:

- `id`
- `tenant_id`
- `patient_id`
- `link_token`
- `link_status`
- `requires_intake`
- `intake_started_at`
- `intake_completed_at`
- `last_accessed_at`
- `expires_at`
- `revoked_at`
- `metadata`
- audit fields
- timestamps
- `deleted_at`

Current constraints and indexes include:

- `link_status` supports `active`, `revoked`, `expired`, `archived`
- one active link per patient
- unique `link_token`
- tenant and patient indexes
- RLS for internal tenant users

Architecture decision:

- Preserve `patient_links` as the patient-link identity shell.
- Add future credential/session/access tables around it.
- Do not expose `patient_links` directly to anonymous users.
- Replace or supplement plaintext `link_token` usage with hashed credential material before production Patient Link access is enabled.

## 4. User And Access Model

### Access Actors

Patient Link may be accessed by:

- patient
- responsible party
- parent or guardian
- authorised representative, future-ready

### Access Ownership

The permanent Patient Link identity belongs to the patient.

Access grants define who may access that patient’s Patient Link.

Recommended future entity:

- `patient_link_access_grants`

This separates the patient’s permanent portal identity from the people allowed to access it.

### Responsible Party Access

A responsible party may access multiple patients when explicitly granted.

Examples:

- parent with two children
- guardian managing a dependent
- spouse acting as responsible party
- employer or organisation, future-ready
- medical aid payer, future-ready

Access must be tenant-scoped and explicitly granted.

### Minor Patients

Minor patients should not automatically receive independent Patient Link access.

Default rule:

- parent or guardian access is primary for minors
- minor self-access requires explicit tenant/practice policy and consent rules

Legal-age transition should trigger a review workflow.

### Revocation

Access can be revoked at:

- patient link level
- individual access-grant level
- responsible-party relationship level
- tenant level

Revocation should invalidate active external sessions.

### Merged And Archived Patients

Archived patients:

- should not lose historical records silently
- may keep read-only historical access if practice policy allows
- can have Patient Link suspended or archived

Merged patients:

- old Patient Link should be marked `replaced` or `archived` through a future status expansion
- access should redirect only after secure verification
- old credentials should be invalidated

## 5. Authentication Model

Recommended model:

```text
Permanent opaque public link
  -> verification challenge
  -> short-lived external session
  -> patient-facing projections
```

### Permanent URL

The permanent URL should contain only a high-entropy opaque public identifier.

It must not contain:

- patient id
- tenant id
- patient number
- responsible-party id
- sequential identifiers
- raw secret token
- date of birth
- ID number
- invoice number as an authentication token

Recommended future URL shape:

```text
https://app.allidesk.co.za/p/{public_link_id}
```

Future custom domains may map to the same public entry flow.

### Verification Challenge

Recommended initial verification:

- email OTP
- phone/SMS/WhatsApp OTP future-ready
- date of birth may be used only as an additional factor

Do not rely solely on predictable patient information.

### Token Handling

Secret credentials must be:

- high entropy
- hashed at rest
- rotated when reset
- invalidated on revocation
- never logged
- never returned to the browser after initial creation

Existing `patient_links.link_token` should not remain the production plaintext access secret. The recommended path is to add a hashed credential field or dedicated credential table in a future migration.

### Verification Sessions

After successful verification, create a short-lived external Patient Link session.

Session should be independent from internal Supabase staff auth.

## 6. Permanent Link Model

The Patient Link should have:

- stable patient-link identity
- public non-secret identifier
- separate hashed credential/verification material
- link status
- access grants
- session records
- access logs

### Link Creation

Patient Link creation should be idempotent:

- if an active link exists for a patient, return it
- if a revoked/archived link exists, create or reset according to explicit admin action

### Link Regeneration

Credential reset should:

- preserve the patient’s Patient Link identity where possible
- rotate secret credential material
- invalidate active sessions
- mark old credentials unusable
- record audit and workflow events

### Tenant Suspension

If the tenant is suspended, Patient Link access should be blocked even if the link is active.

## 7. External Session Model

Recommended future entity:

- `patient_link_sessions`

Session fields should support:

- patient link id
- access grant id
- tenant id
- patient id
- hashed session token
- issued at
- expires at
- revoked at
- last seen at
- IP hash or truncated IP
- user-agent hash
- device label, future-ready

### Session Security

Use:

- short-lived sessions
- secure HTTPS-only cookies
- `HttpOnly`
- `SameSite=Lax` or `Strict` where possible
- CSRF protection for state-changing future actions
- session invalidation on credential reset
- explicit logout

Do not store long-lived bearer tokens in local storage.

## 8. Patient-Facing Data Boundary

Patient Link may display approved fields only.

### Initially Visible Categories

Approved categories:

- practice name
- practice branding
- practice contact details
- patient display name
- responsible party summary
- upcoming appointments
- appointment history
- appointment date, time, therapist, location, type, mode, and status
- patient-facing booking information
- issued/awaiting-payment/partially-paid/paid/overdue invoices
- invoice number
- service date
- approved invoice lines
- invoice total
- amount paid
- balance due
- due date
- payment status
- receipts
- payment allocations
- statement readiness, future-ready
- consent status
- approved documents, future-ready

### Explicitly Excluded

Do not expose:

- internal booking notes
- internal session notes
- clinical notes
- clinical summaries
- patient alerts
- medical information
- internal patient history
- audit events
- workflow payloads
- staff-only comments
- internal banking configuration
- other patients unless authorised through explicit responsible-party access

## 9. Appointment Visibility

Visible appointment statuses should include:

- confirmed
- scheduled
- completed
- cancelled, with limited patient-safe reason if approved
- no-show, only if practice policy approves

Hidden:

- draft bookings
- internal-only booking holds
- internal source workflow details
- clinical session outcomes
- staff notes

Therapist and location details may be shown when they are patient-facing.

Patient Link should remain read-only in this milestone.

Future rescheduling/cancellation requests should be separate request workflows, not direct booking edits.

## 10. Finance Visibility

Patient Link may display:

- issued invoices
- awaiting-payment invoices
- partially paid invoices
- paid invoices
- overdue invoices
- receipts
- payment allocations
- balance due
- statement readiness

Confirmed but unissued invoices should remain hidden.

Cancelled or voided invoices:

- hidden by default
- may be shown only if the practice needs legal/audit transparency and the display is patient-safe

Reconciliation-required invoices should remain hidden until resolved and issued.

### Responsible Party Finance Visibility

Responsible-party access controls finance visibility.

Rules:

- a responsible party can see invoices where they are the billing/responsible party
- a patient can see invoices addressed to them only if policy allows
- a responsible party with multiple linked patients may switch between authorised patients
- no finance record for another patient is visible unless explicitly covered by the access grant

Banking details may be shown only as payment instructions from invoice/receipt snapshots, not internal bank-account configuration.

No invoice editing or payment recording is allowed in this milestone.

## 11. Responsible-Party Access

Recommended future entity:

- `patient_link_access_grants`

Fields should support:

- tenant id
- patient link id
- patient id
- responsible party id, nullable
- access subject type
- contact destination
- access scope
- finance visibility flag
- appointment visibility flag
- document visibility flag, future-ready
- status
- consent/authority captured at
- revoked at

Access scopes:

- patient self
- parent/guardian
- billing responsible party
- authorised representative
- organisation, future-ready
- medical aid payer, future-ready

Legal-age transition should trigger review of guardian access.

## 12. Patient-Facing Projection Strategy

Preferred model:

```text
External browser
  -> Patient Link route
  -> server-side / Edge Function / secure RPC boundary
  -> verified Patient Link session
  -> explicit projections
  -> patient-facing response
```

Recommended approach:

- use server-side functions or Edge Functions for Patient Link data access
- use security-definer RPCs only where they can validate a hashed external session safely
- return explicit field projections
- avoid direct anonymous table access
- avoid service-role credentials in the browser

RLS remains essential, but Patient Link needs a separate external access boundary because users are not normal internal tenant users.

Requirements:

- validate external session on every request
- enforce patient/responsible-party scope
- preserve tenant isolation
- support pagination
- write access logs
- prevent arbitrary patient/tenant filtering
- never return raw internal rows

## 13. Access Logging And Audit

Recommended future entity:

- `patient_link_access_logs`

Log:

- link created
- link activated
- verification requested
- verification succeeded
- verification failed
- session created
- session expired
- logout
- credential reset
- access revoked
- appointment viewed
- invoice viewed
- receipt viewed
- suspicious activity detected

Do not log:

- OTP values
- secret tokens
- full sensitive content
- external transaction secrets
- internal notes

Audit events should capture administrative actions. Access logs should capture external access behaviour.

Staff visibility into access history should be limited to meaningful summaries and security-relevant events.

## 14. Security And Abuse Prevention

Patient Link security must be suitable for healthcare and finance information.

Required controls:

- high-entropy identifiers
- hashed secrets at rest
- OTP expiry
- attempt limits
- rate limiting
- generic errors
- replay protection
- CSRF protection for future write actions
- XSS-safe rendering
- secure cookies
- HTTPS only
- credential rotation
- revocation
- suspicious access alerts
- bot-protection readiness
- tenant and patient enumeration prevention
- URL leakage controls

Avoid analytics or referrer leakage of Patient Link URLs.

## 15. Privacy And Consent

Patient Link access should require:

- electronic access consent
- privacy notice acknowledgement
- terms of use acknowledgement
- responsible-party authority confirmation

Consent withdrawal should:

- suspend or revoke access grant
- invalidate sessions
- preserve historical audit/access logs

Practices remain responsible for:

- verifying authority
- managing guardian access
- revoking access when relationships change
- maintaining consent records

Contact details alone do not grant access.

## 16. Patient Link Lifecycle

Recommended lifecycle states:

- `pending`
- `active`
- `suspended`
- `revoked`
- `expired`
- `replaced`
- `archived`

Current `patient_links.link_status` supports:

- `active`
- `revoked`
- `expired`
- `archived`

Recommended future migration:

- add `pending`, `suspended`, and `replaced` if required by implementation.

### Transitions

Valid transitions:

- pending -> active
- active -> suspended
- suspended -> active
- active -> revoked
- active -> expired
- revoked -> replaced
- active -> archived
- suspended -> archived

Tenant suspension should temporarily block all active links.

Patient archive should move link to archived or suspended depending on practice policy.

## 17. Workflow Events

Canonical future events:

- `patient_link_created`
- `patient_link_activated`
- `patient_link_verification_requested`
- `patient_link_verified`
- `patient_link_access_failed`
- `patient_link_session_created`
- `patient_link_revoked`
- `patient_link_credentials_reset`
- `patient_link_invoice_available`
- `patient_link_receipt_available`
- `patient_link_appointment_updated`

Routing:

- audit: administrative and security-sensitive actions
- communication: invitation, OTP, invoice/receipt availability
- patient history: meaningful patient-facing milestones only
- security monitoring: failed attempts, suspicious access, revocations
- workflow automation: future trigger readiness

Avoid noisy patient history for every normal page view.

## 18. Communication Readiness

Future communication flows:

- initial Patient Link invitation
- OTP delivery
- appointment notification
- invoice available notification
- receipt available notification
- passwordless login message
- credential reset message

Channels:

- email
- WhatsApp
- SMS

Communication delivery is not implemented in this phase.

Communication templates should reuse Practice communication configuration.

## 19. External UI Architecture

Patient Link should be a separate external experience.

It should not reuse the internal AppShell.

Recommended screens:

- public entry
- verification
- patient/dependent selector
- overview
- appointments
- invoices
- receipts
- practice details
- privacy and consent
- logout
- expired/revoked/access-denied errors

Design principles:

- mobile-first
- simple
- read-only
- practice-branded
- accessible
- low-bandwidth friendly
- no internal tenant navigation
- no staff-only wording

## 20. Data-Model Guidance

Preserve `patient_links`.

Recommended future additions:

- `patient_link_access_grants`
- `patient_link_credentials` or hashed credential columns
- `patient_link_verification_challenges`
- `patient_link_sessions`
- `patient_link_access_logs`
- `patient_link_workflow_events`, if existing workflow tables are not sufficient
- consent acknowledgement records, or extension of existing `patient_consents`

Do not duplicate:

- patients
- responsible parties
- bookings
- sessions
- invoices
- payments
- receipts

Use references and projections instead.

## 21. Secure Function Or API Guidance

Recommended operations:

- create or retrieve Patient Link idempotently
- request verification challenge
- verify challenge
- create external session
- revoke session
- reset Patient Link credentials
- fetch overview
- fetch appointments
- fetch invoices
- fetch receipts
- record access log

Every operation must:

- validate session or internal staff permission as appropriate
- enforce tenant and patient scope
- return approved projections only
- avoid accepting arbitrary tenant IDs from external clients
- be rate-limitable
- be auditable
- use safe security-definer patterns where needed
- avoid service-role credentials in the client

## 22. Validation Rules

Validate:

- active Patient Link
- valid access grant
- tenant is active
- patient is not merged into another record without redirect/replacement rules
- archived patient policy
- responsible-party relationship
- contact destination
- OTP/challenge expiry
- attempt count
- session expiry
- revoked credentials
- revoked responsible-party relationship
- invoice visibility
- appointment visibility
- receipt visibility
- multiple-patient access
- consent state

Failed validation should use generic external messages.

## 23. Scalability And Reliability

Design for:

- high-volume OTP requests
- verification rate limits
- session lookup performance
- appointment and invoice query performance
- access-log growth
- token rotation
- communication retry strategy
- communication failure handling
- multi-location practices
- responsible parties with multiple patients
- future custom domains
- future payment links
- future form completion
- future document downloads
- future messaging
- future patient mobile app
- incident response

Indexes should support:

- public link identifier lookup
- session token hash lookup
- active access grants by patient/responsible party
- access logs by patient link and timestamp
- invoice/appointment projection queries by patient and visibility status

## 24. Explicit Assumptions

- Patient Link users are not Supabase Auth internal staff users.
- Patient Link remains read-only for this milestone.
- Confirmed but unissued invoices are not externally visible.
- Issued/payment-tracking invoices may become visible.
- Contact details do not automatically grant access.
- Responsible-party access must be explicit and revocable.
- Existing `patient_links` is the correct identity shell but needs credential hardening before production external access.
- Patient-facing projections are required before exposing operational data.

## 25. Deferred Functionality

Deferred:

- database migrations
- generated types
- frontend UI
- communication delivery
- Patient Link payments
- payment gateways
- document downloads
- patient messaging
- online forms
- rescheduling/cancellation requests
- custom domains
- mobile app
- AI summaries
- medical-aid portal access

## 26. Recommended Implementation Roadmap

### Architecture

Complete this document and review against Patient Engine, Booking Engine, Session Engine, Draft Invoice Engine, and Finance Workflow.

### Database

Create forward-only migrations for:

- hashed Patient Link credential model
- access grants
- verification challenges
- external sessions
- access logs
- lifecycle status expansion if needed
- secure RPC/API support

### Types

Regenerate or update database types after migrations.

Confirm that `patient_links` and new Patient Link tables are represented correctly.

### Frontend

Create a separate external Patient Link route and UI shell.

Implement:

- entry screen
- verification
- overview
- appointments
- invoices
- receipts
- practice details
- logout

### Integration

Connect projections to:

- patient data
- responsible parties
- bookings
- issued invoices
- payments and receipts
- patient-facing workflow events
- communication readiness

### Testing

Validate:

- authentication
- OTP expiry and attempts
- session expiry
- revocation
- responsible-party access
- multiple-patient access
- invoice visibility
- appointment visibility
- tenant isolation
- abuse prevention
- mobile usability
- low-bandwidth behaviour

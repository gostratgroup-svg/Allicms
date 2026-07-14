# Phase 5F Step 5: Patient Link Testing, Validation, and Completion

## Objective

Phase 5F Step 5 validates the Patient Link milestone after the Step 4 integration and security hardening pass.

This review covers public routing, external sessions, verification, access grants, responsible-party/dependent access, public projections, privacy, access logging, RLS/RPC security, stale-state handling, accessibility, and production readiness.

No communication delivery, payment links, PDFs, documents, patient messaging, online booking, appointment changes, or mobile-app functionality was added.

## Files Reviewed

- `docs/phase5f-step1-patient-link-architecture.md`
- `docs/phase5f-step2-patient-link-database-summary.md`
- `docs/phase5f-step3-patient-link-frontend-summary.md`
- `docs/phase5f-step4-patient-link-integration-hardening-summary.md`
- `supabase/migrations/202607130009_phase5f_patient_link_foundation.sql`
- `supabase/migrations/202607130010_phase5f_patient_link_public_projections.sql`
- `supabase/migrations/202607130011_phase5f_patient_link_hardening.sql`
- `supabase/migrations/202607130012_phase5f_patient_link_validation_corrections.sql`
- `src/pages/PatientLinkPortal.tsx`
- `src/routes/RootRoutes.tsx`
- `src/main.tsx`
- `src/lib/database.types.ts`

## Public Route Validation

The public route branch is implemented in `RootRoutes`.

Validated from source:

- `/p/:publicIdentifier/*` renders `PatientLinkPortal`.
- All other routes render the internal app through `AuthProvider` and `AppModeGuard`.
- Patient Link routes do not use internal `AuthContext`.
- Internal app routes remain behind the existing authentication and identity guards.
- Unknown Patient Link nested routes redirect safely to either verification or overview depending on external session state.
- Direct access to protected portal pages without an active external session routes back to verification.
- URL paths use only the opaque `publicIdentifier`.
- No patient UUID, tenant UUID, responsible-party UUID, invoice UUID, receipt UUID, staff UUID, session token, or verification code is placed in route paths or query parameters.

## Enumeration and Pre-Verification Privacy Results

Step 4 already removed the pre-verification patient hint from both the public context type and UI.

During Step 5 review, one additional privacy issue was found:

- The Step 4 public context RPC still returned exact inactive lifecycle states such as `suspended` or `revoked` before verification.

Correction:

- Added `202607130012_phase5f_patient_link_validation_corrections.sql`.
- The public context RPC now returns a generic `unavailable` state for inactive links before verification.
- Exact inactive lifecycle state remains internal and can still be enforced in protected/session-validated paths.

Validated from source:

- Invalid public identifiers return generic unavailable UI.
- Patient names, initials, contact details, responsible-party details, grant details, and internal identifiers are not displayed before successful verification.
- Challenge-request responses use a generic response shape, including unavailable/no-grant paths.
- Browser-facing error wording remains generic where enumeration risk exists.

## Verification Challenge Validation

Validated from source and migrations:

- Browser uses `request_patient_link_public_verification`.
- Verification material is generated server-side in the RPC.
- The verification code is hashed with a per-challenge salt.
- Plaintext verification codes are not returned to the browser.
- Plaintext verification codes are not logged.
- The older lower-level verification request function has public execution revoked by Step 4.
- Challenge verification uses `verify_patient_link`.
- Consumed challenges cannot create a second session because `create_patient_link_session` requires `challenge_status = 'verified'` and then consumes the challenge.
- Failed submissions clear the sensitive code input.
- Duplicate request/submit buttons are disabled while requests are running.
- No insecure browser fallback verification exists.

Live database verification still needs to confirm:

- actual attempt-count updates
- expired challenge state transitions
- reused code rejection
- maximum-attempt behaviour
- rate-limit/cooldown behaviour if configured later

Communication delivery remains deferred by design.

## External Session Validation

Validated from source and migrations:

- Patient Link sessions are separate from staff Supabase Auth.
- The browser stores only the external session token under `allidesk.patientLinkSession.{publicIdentifier}`.
- External session tokens are not placed in URLs.
- Session tokens are not logged by the frontend.
- Database stores hashed session tokens.
- Portal data is cleared on logout, expiry, invalid session, failed portal reload, no active grant, suspended/revoked/unavailable states, and dependent switching.
- A storage-event listener clears state across tabs when the local session key is removed.
- Session expiry uses the database-provided `expires_at` value and redirects to verification.
- Credential reset invalidates older sessions in the protected projection RPC.
- Logout logs the access event, revokes the session, clears local state, and returns to verification.

Live database verification still needs to confirm expiry, revocation, credential reset, tenant suspension, link suspension, grant revocation, patient archive, patient merge, and multi-tab behaviour against deployed Supabase data.

## Access-Grant Validation

Validated from source and migrations:

- Portal data requires an active session and active grant.
- If the session grant is missing or revoked, the projection returns `no_active_grant`.
- Grants are tenant-scoped.
- Grants are filtered by `access_status = 'active'` and `deleted_at is null`.
- Archived grants remain auditable but unusable.
- Finance, appointment, and document visibility flags are evaluated from the active grant.

## Responsible-Party and Dependent Results

Validated from source and migrations:

- Dependent switching uses opaque patient link public identifiers only.
- Arbitrary selected public identifiers are revalidated by the projection RPC.
- The selected patient is accepted only if there is an active grant for that link or a matching active responsible-party grant.
- Archived and merged patients are excluded.
- The frontend clears the old patient's portal data before loading the new selected dependent.
- If the selected dependent is no longer allowed, the frontend resets the selected patient to the server-selected accessible patient.
- Finance visibility also checks responsible-party scope where applicable.

Live database verification still needs to test real multi-dependent responsible-party records and revoked dependent grants.

## Appointment Projection Validation

Validated from SQL:

Returned patient-facing fields:

- date/start time
- end time
- duration
- booking status
- appointment type
- mode
- patient-facing title
- patient-facing notes
- therapist display name
- location name
- room label

Allowed statuses:

- scheduled
- confirmed
- checked_in
- in_progress
- completed
- cancelled
- no_show
- rescheduled

Excluded by design:

- internal booking notes
- administrative notes
- booking source
- workflow payloads
- session operational notes
- clinical outcomes
- medical information
- patient alerts
- booking IDs

The Step 4 projection applies row limits before JSON aggregation.

## Invoice Projection Validation

Validated from SQL:

Returned patient-facing fields:

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
- invoice line snapshots

Included statuses:

- issued
- awaiting_payment
- partially_paid
- paid
- overdue

Excluded:

- draft invoices
- cancelled/voided invoices unless later explicitly approved
- reconciliation-required invoices
- internal invoice IDs
- internal issuer configuration
- internal finance notes
- session and booking notes
- workflow payloads
- payment actions

Responsible-party scope is enforced when the selected grant has a responsible party.

Amounts are projected from database-authoritative invoice fields.

## Receipt Projection Validation

Validated from SQL:

Returned patient-facing fields:

- receipt number
- receipt status
- receipt date
- issued date
- payment amount
- currency
- payment method
- payment reference
- allocation snapshot

Included statuses:

- issued
- reversed

Excluded:

- internal receipt IDs
- internal finance notes
- banking secrets
- reconciliation payloads
- unrelated patients
- unrelated responsible parties

The public UI no longer depends on internal receipt or invoice IDs for React keys.

## Practice and Privacy Projection Validation

Validated from SQL and UI:

Returned public practice data:

- patient-facing practice display name
- main email
- main phone
- website
- country
- active location address/contact details
- logo URL
- primary colour
- accent colour

Excluded:

- internal billing configuration
- private banking records
- staff-only contacts
- tenant administration data
- API credentials
- workflow configuration
- internal identifiers

The privacy page provides read-only access guidance, revocation direction, practice contact path, and consent summaries where available.

## RPC Security Review

Validated from migrations:

- Patient Link public RPCs use `SECURITY DEFINER`.
- Functions set `search_path = public`.
- Protected portal data validates the external session on every call.
- Tenant scope is derived server-side from the validated link/session/grant.
- Patient scope is derived server-side from the validated link/session/grant.
- Arbitrary tenant IDs are not accepted.
- Arbitrary patient IDs are not accepted.
- Selected dependents are validated against active grants.
- Revoked sessions and grants fail.
- Tenant isolation is preserved by tenant checks throughout the projection.
- Result limits are applied to appointments, invoices, receipts, and consents.
- Errors are translated by the frontend into safe messages.

Anonymous execution is intentionally limited to the public Patient Link RPC boundary required for external portal access.

## Access-Log Validation

Validated from source and migrations:

Logged events include:

- verification requested
- verification succeeded
- verification failed
- session created
- logout/session revocation
- appointment list viewed
- invoice list viewed
- receipt list viewed
- invalid/expired session as suspicious activity

Logs are tenant-scoped and Patient Link-scoped.

Logs do not include:

- plaintext tokens
- plaintext verification codes
- full invoice payloads
- full receipt payloads
- sensitive medical data

Navigation logging is limited to section-list views rather than every render.

Live verification is still required for actual inserts and operational log review.

## Cache and Stale-State Validation

Validated from source:

- Logout clears local token and portal data.
- Session expiry clears local token and portal data.
- Failed protected refresh clears portal data and returns to verification.
- Dependent switching clears the previous patient's portal data before loading the next patient.
- A request counter ignores stale projection responses.
- Storage events clear session state across tabs when another tab removes the session token.
- Reload restores only the locally stored external token, which is still validated by the projection RPC before any protected data is shown.

Browser back-cache behaviour should still be manually tested in a deployed browser session.

## Error-Handling Review

Validated from source:

- Invalid links show a generic unavailable state.
- Suspended/revoked/unavailable pre-verification states show a generic unavailable state.
- Expired sessions show a verification-required message.
- Invalid code and challenge failures use a generic verification error.
- No active grants show a safe practice-contact message.
- Projection failures clear session state and return to verification.
- Raw PostgreSQL errors, RPC names, tenant IDs, patient IDs, grant IDs, and session tokens are not shown to the user.

## Accessibility and Mobile Review

Validated from source and styles:

- Verification form controls have visible labels.
- Delivery method selector is labelled.
- Dependent selector is labelled.
- Portal nav has an accessible label.
- Error messages use `role="alert"` and live-region behaviour.
- Verification status messages use live-region behaviour.
- Buttons are standard keyboard-operable buttons.
- Loading states replace protected content while refreshing.
- The external layout uses responsive grid/list patterns from existing styles.

Manual mobile/browser testing is still recommended for:

- narrow-screen route navigation
- long patient/practice/therapist names
- long invoice descriptions
- colour contrast after tenant branding changes
- browser back button after logout

## RLS and Database Review

Validated from migrations:

- Patient Link tables have RLS enabled.
- Tenant member policies exist for internal staff management of grants, sessions, logs, challenges, and workflow events.
- Public external access is through controlled RPCs, not direct table access.
- Patient Link credentials, verification codes, IP values, user agents, and session tokens are hashed where designed.
- Normal users do not have hard-delete policies for Patient Link records.
- Tenant integrity is enforced through foreign keys, constraints, and trigger checks.
- Status fields use controlled values.
- Indexes exist for link lookup, active grants, challenges, sessions, logs, and workflow events.

Correction added in Step 5:

- `202607130012_phase5f_patient_link_validation_corrections.sql` masks inactive Patient Link lifecycle states before verification.

## Issues Found and Corrected

One issue was found and corrected:

- Pre-verification public context could reveal exact inactive link lifecycle state at the RPC response level.

Correction:

- Added a forward-only migration replacing `get_patient_link_public_context` so inactive link states return generic `unavailable` before verification.

No TypeScript type changes were required because the RPC signature did not change.

## Code-Quality Changes

No broad refactor was performed.

The Patient Link file remains large but still focused on one isolated public portal surface. Further splitting into hooks/components can be considered later when the Patient Link grows beyond read-only projections.

No additional Step 5 frontend code changes were required beyond the Step 4 hardening already in place.

## Automated Commands Run

- `npm run build`
- `git diff --check`

No lint or test scripts are configured in `package.json`.

## Validation Results

`npm run build` passed.

`git diff --check` passed.

The existing Vite large-chunk warning remains:

- `dist/assets/index-*.js` is larger than 500 kB after minification.

This warning predates this validation step and should be handled later with route/module code splitting.

## Deployment Dependencies

Apply migrations in order before live Patient Link testing:

1. `202607130009_phase5f_patient_link_foundation.sql`
2. `202607130010_phase5f_patient_link_public_projections.sql`
3. `202607130011_phase5f_patient_link_hardening.sql`
4. `202607130012_phase5f_patient_link_validation_corrections.sql`

## Live-Verification Limitations

The following could not be fully verified locally in this validation pass:

- live Patient Link RPC execution
- RLS runtime behaviour in Supabase
- verification delivery
- challenge expiry and max-attempt behaviour against live data
- external session creation and revocation against live data
- credential reset invalidation against live data
- responsible-party grant switching with real records
- dependent access revocation with real records
- appointment/invoice/receipt projections against real data
- access-log inserts
- rate-limit/cooldown behaviour
- tenant suspension
- patient archive/merge
- multi-tab browser behaviour
- browser back-cache behaviour after logout

These should be tested after the migrations are applied to the Supabase development project and realistic Patient Link seed data exists.

## Deferred Functionality

Still intentionally deferred:

- Email, SMS, and WhatsApp delivery
- Payment links and payment processing
- PDF downloads
- Document downloads
- Patient messaging
- Online forms
- Online booking
- Appointment cancellation or rescheduling
- External calendar integration
- Patient mobile app
- Workflow automation execution

## Final Phase 5F Readiness Assessment

Phase 5F is ready to be marked complete for this milestone, with one condition:

The database migrations must be applied to Supabase development and the live-verification checklist above must be executed before considering Patient Link production-ready for real patient use.

For the current milestone, the architecture, database foundation, frontend foundation, integration hardening, privacy review, and validation documentation are complete.


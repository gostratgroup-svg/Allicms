# Phase 5F Step 3: Patient Link Frontend Foundation

## Objective

Phase 5F Step 3 adds the first external Patient Link frontend foundation for AlliDesk.

The Patient Link experience is separate from the internal staff application shell and does not reuse staff Supabase Auth as the patient-facing identity boundary.

This step remains read-only and does not implement communication delivery, payment links, patient messaging, document downloads, online booking, appointment changes or invoice payments.

## Routes Created

Added a public route branch:

- `/p/:publicIdentifier`
- `/p/:publicIdentifier/verify`
- `/p/:publicIdentifier/overview`
- `/p/:publicIdentifier/appointments`
- `/p/:publicIdentifier/invoices`
- `/p/:publicIdentifier/receipts`
- `/p/:publicIdentifier/privacy`

The route uses the Patient Link `public_identifier` only. It does not expose:

- patient UUIDs
- tenant UUIDs
- responsible party UUIDs
- staff profile UUIDs
- sequential identifiers

## Files Added

- `src/routes/RootRoutes.tsx`
- `src/pages/PatientLinkPortal.tsx`
- `supabase/migrations/202607130010_phase5f_patient_link_public_projections.sql`
- `docs/phase5f-step3-patient-link-frontend-summary.md`

## Files Modified

- `src/main.tsx`
- `src/styles.css`
- `src/lib/database.types.ts`

## External Session Handling

The portal uses a separate external Patient Link session model.

Implemented frontend handling for:

- loading safe public Patient Link context
- requesting a verification challenge
- submitting a verification code
- creating an external Patient Link session
- storing only the generated external session token locally
- recovering an existing external session on refresh
- clearing local external session state
- revoking the external session on logout
- redirecting expired/revoked sessions back to verification

The Patient Link portal does not use internal staff `AuthContext`, tenant memberships or staff permissions.

## Secure Data Access Approach

Because Patient Link users are not internal Supabase Auth staff users, the portal does not query internal operational tables directly.

Added controlled security-definer RPCs:

- `get_patient_link_public_context(...)`
- `get_patient_link_portal_data(...)`
- `log_patient_link_portal_access(...)`

The public portal reads only JSON projections from those functions.

The projection RPC validates:

- public identifier
- active Patient Link state
- hashed external session token
- session expiry
- active access grant where present
- selected dependent access where present
- tenant and patient scope

It returns only approved patient-facing fields.

## Verification Flow

The verification screen supports:

- selecting delivery method
- requesting a verification challenge
- entering a verification code
- creating an external Patient Link session after successful verification
- generic error messaging
- loading states
- session redirect after success

Important limitation:

Communication delivery is intentionally not implemented in this step. The request challenge flow creates a challenge record, but email/SMS/WhatsApp delivery is deferred. In a live environment, a future communication layer must generate and deliver verification codes without exposing them in the browser.

## Patient Link Layout

Created a lightweight mobile-first external layout with:

- practice branding
- practice name
- patient/dependent context
- simple navigation
- overview
- appointments
- invoices
- receipts
- privacy/practice details
- logout

The internal `AppShell`, sidebar, topbar and staff navigation are not used.

## Multiple-Patient Access

The projection RPC supports a responsible-party/dependent model:

- if a session grant has a responsible party, other active grants for that responsible party can be returned as accessible patients
- the frontend displays a patient/dependent selector when multiple patients are returned
- selecting another dependent reloads data through the same session-validated projection boundary

The frontend does not accept arbitrary patient IDs.

## Appointments Visibility

The appointments view displays approved booking fields:

- date/time
- duration
- status
- appointment type
- mode
- therapist display name
- location
- room label
- patient-facing title/notes

It excludes:

- internal booking source detail
- internal notes
- session operational notes
- clinical outcomes
- patient alerts

## Invoice Visibility

The invoices view displays approved issued/visible invoice data:

- invoice number
- invoice/payment status
- service/invoice/due dates
- invoice lines
- total
- amount paid
- balance due

It excludes:

- draft invoices
- internal finance notes
- reconciliation payloads
- hidden banking configuration
- source session/clinical notes

Payment actions are not implemented.

## Receipt Visibility

The receipts view displays approved receipt data:

- receipt number
- receipt status
- receipt date
- issued date
- payment amount
- payment method
- payment reference

PDF generation and downloads are not implemented.

## Practice Details

The privacy page displays patient-facing practice details:

- practice display name
- contact number
- email
- website
- primary location/address where available
- privacy/access guidance

It does not expose internal practice configuration or raw banking records.

## Privacy And Consent

The privacy area displays:

- Patient Link terms-style notice
- access revocation guidance
- practice contact direction
- visible consent status summary where available

Legal document generation is not implemented.

## Access Logging

The portal logs meaningful access events through the controlled RPC:

- appointment view
- invoice view
- receipt view
- logout via session revocation

It does not log:

- verification codes
- session tokens
- credential hashes
- clinical data
- full financial payloads

## Error And Security States

The UI includes safe states for:

- invalid link
- unavailable link
- suspended/revoked/expired link
- configuration error
- temporary loading failure
- expired session
- no visible appointments
- no visible invoices
- no visible receipts
- generic verification failure

Generic messaging is used where appropriate to reduce enumeration risk.

## Loading And UX

Implemented:

- initial context loading
- verification request loading
- verification submission loading
- portal data loading
- empty appointment/invoice/receipt states
- mobile-first layout
- accessible labels
- horizontal mobile navigation
- readable money/date formatting
- safe long-name/address layout

## Known Limitations

- Live verification cannot be fully completed until a secure communication delivery layer is implemented.
- The public RPC projection migration was added for Step 3 because Step 2 intentionally kept anonymous raw table access closed.
- Session storage currently uses browser local storage for the external session token. A future server-side/cookie model may harden this further.
- Rate limiting is not implemented yet.
- No Patient Link PDF/document downloads exist yet.
- No payment actions exist yet.
- No patient messaging or online booking exists yet.
- No local Supabase migration execution was completed in this environment because Docker was unavailable in Step 2 validation.

## Deferred Functionality

Deferred to later phases:

- email/SMS/WhatsApp delivery
- payment links
- payment processing
- PDF invoice downloads
- PDF receipt downloads
- document downloads
- clinical notes
- patient messaging
- online forms
- online booking
- appointment cancellation
- appointment rescheduling
- external calendar integration
- workflow automation execution
- patient mobile app

## Validation

Validation completed:

- `npm run build` passed.
- `git diff --check` passed.

No lint or test script is configured in `package.json`.

The existing Vite large-chunk warning remains and is reported separately as a build warning, not a build failure.

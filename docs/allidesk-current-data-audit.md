# AlliDesk Current Data Audit

Date: 2026-07-06  
Scope audited: current frontend codebase, primarily `src/App.tsx`, `src/lib/supabase.ts`, `src/lib/database.types.ts`, `.env.example`, and `README.md`.

This report documents the data currently represented in the AlliDesk app. No Supabase tables, migrations, or application code changes were created as part of this audit.

## 1. Existing Pages And Modules

### Tenant App

- Overview
  - Practice overview metric cards
  - Sessions command centre
  - Confirm invoices task card
  - Patient To Do's card
- Bookings
  - Booking calendar
  - Week and month calendar modes
  - New Booking modal
  - Booked session detail modal
  - Block time mode
- Patients
  - Patient database list
  - Patient profile workspace
  - Personal Details tab
  - Notes tab
  - Sessions tab
  - Finance tab
  - Documents & Reports tab
  - History tab
  - Patient Profile Link copy action
- Finances
  - Billing Queue
  - Confirm invoices
  - Invoices and payments
  - Invoice status stage filtering
  - Date range filtering
  - Payment proof capture
  - Booked session finance modal access
- Settings
  - Users
  - Practice Configuration
  - Patient Configuration
  - Billing Configuration
  - How To Guides
  - What's New

### Public Patient Link

- Patient Profile Link route: `/patient-link/:tenantId/:patientNumber`
- First-access intake form
- POPIA consent and digital signature
- Patient link sections:
  - Personal Details
  - Sessions
  - Feedback
  - Finance
  - History
- Notice board
- Completed session popup

### Super Admin Platform

- Dashboard
- Tenant Management
- Subscription Management
- Support Centre
- System Health
- Platform Configuration
- Create Tenant modal
- Tenant Profile modal with:
  - Tenant details
  - Subscription
  - Settings

### Shared Or Cross-Cutting UI

- Sidebar navigation
- Mobile bottom navigation
- Role selector
- New Booking button
- Invoice PDF generation
- Statement PDF generation
- Supabase connection status test in System Health

## 2. Current Mock And Demo Data

### Tenant

The app currently has one primary tenant mock:

- `tenantId`
- `name`
- `plan`
- `status`
- `subscription`

Current example:

- Kids Therapy Centre
- Growth practice
- Active
- Paid until 31 Jul 2026

### Navigation

Tenant navigation items:

- Overview
- Bookings
- Patients
- Finances
- Settings

Super Admin navigation items:

- Dashboard
- Tenant Management
- Subscription Management
- Support Centre
- System Health
- Platform Configuration

### Roles

Current role records:

- Admin
- Reception
- Therapist
- Super Admin

### Sessions / Daily Overview Mock Data

The `sessions` mock list uses:

- `tenantId`
- `time`
- `patient`
- `guardian`
- `therapist`
- `type`
- `room`
- `status`
- `invoice`
- `amount`

### Patients Mock Data

Patient mock records include:

- `tenantId`
- `patientNumber`
- `dependantCode`
- `name`
- `phone`
- `guardian`
- `title`
- `idNumber`
- `residentialAddress`
- `guardianEmail`
- `guardianOccupation`
- `guardianEmployer`
- `guardianPostalAddress`
- `homeTel`
- `workTel`
- `practiceNo`
- `medicalAidPlan`
- `accountResponsibility`
- `accountResponsibleName`
- `accountResponsibleId`
- `dateSigned`
- `dateOfBirth`
- `emergencyContact`
- `type`
- `medicalAid`
- `referralSource`
- `diagnosis`
- `consentStatus`
- `alert`
- `balance`
- `therapist`
- `lastSession`
- `nextSession`
- `reportStatus`
- `notes`
- `historyEvents`

### Billing And Procedure Mock Data

Billing/procedure examples include:

- `billingItems`
- `billingPriceListDefaults`
- `icdCodeDefaults`
- `billingCodeDefaults`
- `therapistFinanceProfiles`

### Practice Mock Data

Practice setup uses:

- `practiceEntities`
- `practiceLocations`
- practice configuration state in Settings

### Super Admin Mock Data

Super Admin includes mock/demo data for:

- `platformMetrics`
- `platformTenants`
- `supportTickets`
- `serviceStatuses`
- `subscriptionPlans`
- platform configuration values

### Local Storage State

The app persists several prototype records to localStorage:

- `allidesk_patient_records_v1`
- `allidesk_calendar_bookings_v1`
- `allidesk_invoice_records_v1`

Legacy keys are also read for migration compatibility:

- `allicms_patient_records_v1`
- `allicms_calendar_sessions_v1`
- `allicms_invoice_records_v1`

## 3. Data Fields Currently Used

### Calendar / Booking Session

Current `CalendarSession` shape:

- `id`
- `date`
- `startTime`
- `endTime`
- `patient`
- `type`
- `therapist`
- `room`
- `practiceEntityId`
- `practiceLocationId`
- `procedurePriceListId`
- `billingCodeId`
- `billingProcedureIds`
- `icd10Code`
- `durationMinutes`
- `isAssessment`
- `quotedAmount`
- `invoiceAmount`
- `selectedPracticeNumberSource`
- `selectedBankingDetailsSource`

### Invoice

Current `Invoice` shape:

- `id`
- `kind`
- `patientId`
- `sessionId`
- `linkedInvoiceIds`
- `patientName`
- `serviceType`
- `practitionerName`
- `amount`
- `invoiceDate`
- `status`
- `confirmedAt`
- `paymentDueDate`
- `paymentReceivedAt`
- `paymentAmount`
- `pdfInvoiceUrl`
- `proofOfPaymentUrl`
- `proofOfPaymentName`
- `practiceEntityId`
- `practiceLocationId`
- `therapistId`
- `selectedPracticeNumber`
- `selectedBankingDetails`
- `billingCodeId`
- `icd10Code`
- `serviceDescription`
- `lineItems`
- `createdAt`
- `updatedAt`

### Invoice Line Item

- `invoiceId`
- `sessionDate`
- `procedureCode`
- `description`
- `icd10Code`
- `price`

### Tenant User

Current `TenantUser` shape:

- `id`
- `tenantId`
- `firstName`
- `lastName`
- `email`
- `phone`
- `role`
- `isActive`
- `practiceNumber`
- `usesOwnPracticeNumber`
- `hpcsaNumber`
- `qualification`
- `discipline`
- `bankingDetails`
- `signatureUrl`
- `createdAt`
- `updatedAt`

### Banking Details

- `accountName`
- `bank`
- `accountNumber`
- `branchCode`

### Patient Note

- `noteType`
- `date`
- `detail`

### Patient History Event

- `title`
- `visibility`
- `detail`

### Platform Tenant Record

Current Super Admin tenant profile shape:

- `businessName`
- `tradingName`
- `companyReg`
- `vat`
- `contact`
- `email`
- `phone`
- `country`
- `timezone`
- `plan`
- `status`
- `billingCycle`
- `renewal`
- `trial`
- `users`
- `storage`
- `created`
- `activity`

## 4. Forms And Input Fields

### New Booking Modal

Patient identification:

- Existing patient search
- Existing patient selectable list
- New patient name
- Patient type
- Parent / guardian
- Parent / guardian cell
- Parent / guardian email

Schedule:

- Date
- Time
- Duration display
- Therapist
- Practice
- Location
- Room / mode
- Assessment checkbox
- Assessment duration
- See calendar / quick calendar picker

Billing:

- Procedure and prices list
- ICD-10 code
- Use my banking details checkbox
- Procedure line-item multi-select
- Practice number source display
- Banking details source display
- Estimated total display

New patient intake sharing:

- Yes, copy message
- Later
- Generated Patient Profile Link

### Booked Session Modal

Session edit fields:

- Date
- Start time
- End time

Session information:

- Session planning text
- Note type
- Note detail

Billing and finances:

- Billing item / procedure
- Price
- ICD-10 codes
- Patient account
- Status
- Procedure selection while editing

Actions:

- Confirm invoice
- Mark no show
- Cancel session
- Reschedule
- Payment related actions through invoice workflow

### Patient Profile: Personal Details

Patient details:

- Patient name
- Patient number
- Dependant code
- Title
- Date of birth
- ID number
- Residential address
- Cell number
- Referring doctor

Parent / guardian or contact info:

- Parent / guardian
- Mobile
- Email address
- Occupation
- Employer
- Postal address
- Home tel
- Work tel
- Emergency contact
- Practice no.

Medical aid:

- Medical aid
- Plan / option
- Medical aid no.
- Member responsible
- Dependent
- Next of kin

Consent and account responsibility:

- Medical aid consent
- Therapy consent
- Account responsibility
- Responsible person
- Responsible ID number
- Date signed
- Outstanding balance display
- Signed by

### Patient Profile: Notes

- Add note action
- Note type
- Date
- Detail

Current note types:

- Session Feedback
- Session Process Note
- Case Management

### Patient Profile: Sessions

- Session list
- Session date
- Session type
- Therapist
- Time range
- Opens booked session modal

### Patient Profile: Finance

- Create statement modal
- Invoice workflow list
- Confirm invoice action
- Payment received action
- Proof of payment workflow

### Create Statement Modal

- Select invoice IDs
- Selected total
- Selected outstanding total
- Create statement action

### Payment Received Modal / Section

- Invoice selection
- Proof file / proof file name
- Payment amount
- Proof preview invoice

### Patient Link Intake Form

First-access intake collects or displays:

- Patient name
- Title
- Date of birth
- ID number
- Residential address
- Cell number
- Parent / guardian fields
- Guardian residential address fields
- Emergency contact fields
- Medical aid fields
- No medical aid checkbox
- Main Member / Responsible for account
- POPIA acknowledgement checkbox
- Digital signature

### Settings: Users

User fields:

- First name
- Last name
- Email
- Phone
- Role
- Active
- Practice number
- Use own practice number
- HPCSA number
- Qualification
- Discipline
- Banking details
- Professional signature

### Settings: Practice Configuration

Practice fields:

- Practice name
- Registration number
- Address
- Phone
- Email
- Website
- Logo upload
- Invoice prefix
- Banking details
- Payment terms
- Consent message
- Tax number
- VAT number

Banking details:

- Account name
- Bank
- Account number
- Branch code

### Settings: Patient Configuration

Fields:

- Intake fields
- Required / optional toggle
- Active toggle
- Patient categories
- Referral sources

### Settings: Billing Configuration

Billing rules:

- Allow therapist banking details
- Practice number mode

Practice partners and locations:

- Practice entity
- Practice number
- Banking details
- Invoice prefix
- Quote prefix
- Payment terms
- Price list
- Therapist banking override
- Locations
- Location name
- Location address
- Location contact number

Invoices and statements:

- Test invoice
- Test statement

ICD-10 codes:

- ICD-10 code line item

Procedure and prices:

- Price list code
- Price list name
- Procedure code
- Description
- Service type
- Default price
- Duration minutes
- Discipline
- Active

### Settings: How To Guides

- Title
- Category
- Body
- Active

### Settings: What's New

- Title
- Version
- Summary
- Release date
- Visible to roles

### Super Admin: Create Tenant

Tenant shell:

- Practice Name
- Country
- Time Zone

Tenant Admin User:

- Primary Contact
- Contact Email
- Contact Number
- Temporary Password
- Password Action

Subscription:

- Subscription Option
- Trial status
- Billing cycle
- First billing date

### Super Admin: Tenant Management Search

- Search tenants
- Create Tenant action

### Super Admin: Subscription Management

- Plan
- Description
- Users
- Price p.month
- Active checkbox
- Hidden/public status

### Super Admin: Platform Configuration

- Platform Name
- Support Email
- Support Phone
- Marketing Website
- Web App
- Maintenance Mode
- Privacy Policy Version
- Terms & Conditions Version
- Default Time Zone
- Default Language

## 5. User Roles Or Permissions Already Referenced

### App Role Type

- Admin
- Reception
- Therapist
- Super Admin

### Tenant User Role Type

- `admin`
- `receptionist`
- `therapist`
- `finance`

### Referenced Permission Concepts

Admin:

- Tenant-level owner or practice manager
- Can activate therapists and receptionists
- Can manage practice settings
- Can access practice information in the tenant workspace

Reception:

- Register patients
- Book appointments
- Send reminders
- Upload documents
- View payment status

Therapist:

- View assigned patients
- Complete notes
- Upload assessments
- Create reports
- Track goals

Super Admin:

- Create tenants
- Activate or suspend tenants
- Create tenant Admin users
- View tenant list
- Access tenant support
- Cannot browse or edit tenant patients, bookings, clinical notes, documents, or tenant operational records

## 6. Billing And Invoice Fields Already Referenced

### Invoice Status Flow

- `confirm_invoice`
- `awaiting_payment`
- `payment_due`
- `payment_received`

### Invoice / Payment Fields

- Invoice ID
- Invoice kind
- Patient ID
- Session ID
- Linked invoice IDs
- Patient name
- Service type
- Practitioner name
- Amount
- Invoice date
- Confirmed at
- Payment due date
- Payment received at
- Payment amount
- PDF invoice URL
- Proof of payment URL
- Proof of payment name
- Practice entity ID
- Practice location ID
- Therapist ID
- Selected practice number
- Selected banking details
- Billing code ID
- ICD-10 code
- Service description
- Line items
- Created at
- Updated at

### Invoice Line Item Fields

- Invoice number
- Date of session
- Procedure code
- Description
- ICD-10
- Price

### Billing Configuration Fields

- Price list ID
- Price list code
- Price list name
- Procedure code
- Service type
- Default price
- Duration minutes
- Discipline
- Active
- Practice number mode
- Allow therapist banking details

### Statement Fields

- Statement kind
- Linked invoice IDs
- Selected invoice IDs
- Selected total
- Selected outstanding total
- Statement PDF generated from included invoice line items

## 7. Patient, Therapist, And Appointment Fields Already Referenced

### Patient Fields

- Tenant ID
- Patient number
- Dependant code
- Name
- Type
- Title
- Date of birth
- ID number
- Phone
- Residential address
- Guardian
- Guardian email
- Guardian occupation
- Guardian employer
- Guardian postal address
- Home tel
- Work tel
- Emergency contact
- Practice no.
- Medical aid
- Medical aid plan
- Account responsibility
- Account responsible name
- Account responsible ID
- Consent status
- Date signed
- Referral source
- Diagnosis
- Alert
- Balance
- Therapist
- Last session
- Next session
- Report status
- Notes
- History events

### Therapist Fields

- Name
- Colour
- Calendar background colour
- Email
- Phone
- Practice number
- Uses own practice number
- HPCSA number
- Qualification
- Discipline
- Banking details
- Signature URL

### Appointment / Booking Fields

- ID
- Date
- Start time
- End time
- Patient
- Type
- Therapist
- Room
- Practice entity
- Practice location
- Price list
- Billing code
- Billing procedure IDs
- ICD-10 code
- Duration minutes
- Assessment flag
- Quoted amount
- Invoice amount
- Practice number source
- Banking details source

### Blocked Calendar Slot Fields

- ID
- Date
- Start time
- End time

## 8. Settings Fields Already Referenced

### Users

- Tenant ID
- User name fields
- Email
- Phone
- Role
- Active status
- Professional numbers
- Discipline and qualification
- Banking details
- Signature

### Practice Configuration

- Tenant ID
- Practice name
- Registration number
- Address
- Phone
- Email
- Website
- Logo URL
- Report template URL
- Invoice template URL
- Invoice prefix
- Banking details
- Payment terms
- Consent message
- Tax number
- VAT number
- Updated at

Note: `reportTemplateUrl` and `invoiceTemplateUrl` still exist in state even though the UI was previously adjusted away from upload fields.

### Patient Configuration

- Tenant ID
- Intake fields
- Required fields
- Active fields
- Patient categories
- Referral sources
- Updated at

### Billing Configuration

- Tenant ID
- Allow therapist banking details
- Practice number mode
- Practice partners
- Locations
- Invoices and statements test links
- ICD-10 codes
- Procedure and prices

### How To Guides

- ID
- Tenant ID
- Title
- Category
- Body
- Active
- Updated at

### What's New

- ID
- Title
- Version
- Summary
- Release date
- Visible to roles

## 9. Duplicated Or Inconsistent Field Names

### Sessions vs Bookings

The visible product term is now mostly "Bookings", but the code still uses several session names:

- `sessions`
- `CalendarSession`
- `NewSessionModal`
- `BookedSessionModal`
- `SessionSlot`
- `SessionInvoiceDetail`
- labels such as session planning, session notes, session feedback

Suggested future cleanup: use `booking` for appointment/calendar records and reserve `session` for clinical session content.

### Patient Identity Fields

Patient records use a mixture of:

- `patient`
- `patientName`
- `patientId`
- `patientNumber`
- `name`

Suggested future cleanup: use `patientId` as the database primary key, `patientNumber` as the human-facing number, and `patientName` only in denormalised display snapshots if needed.

### Therapist / Practitioner Fields

The app references:

- `therapist`
- `therapistId`
- `therapistName`
- `practitionerName`

Suggested future cleanup: use `therapistId` for relationships, `therapistName` for display snapshots, and avoid mixing `practitionerName` unless invoices must support non-therapist practitioners.

### Billing Code vs ICD-10 vs Procedure Code

Current data separates ICD-10 codes and procedure prices, but some defaults still derive both from `billingItems`.

Potential overlap:

- `billingCodeId`
- `billingProcedureIds`
- `icd10Code`
- `BillingCode`
- `procedureCode`
- `code`

Suggested future cleanup:

- ICD-10 diagnosis code table: `icd10_codes`
- Procedure/service table: `procedure_prices`
- Appointment selected diagnosis: `icd10_code_id`
- Invoice line selected procedure: `procedure_price_id`

### Practice Number Fields

The app uses:

- `practiceNo` on patient records
- `practiceNumber` on practice entities and users
- `selectedPracticeNumber`
- `selectedPracticeNumberSource`

`practiceNo` on a patient appears to be semantically unclear and sometimes holds tenant/practice metadata. It should probably not live on the patient unless it means referring practice number or account practice number.

### Contact Fields

Guardian, emergency contact, secondary contact, and account responsibility are partially flattened:

- `guardian`
- `phone`
- `guardianEmail`
- `emergencyContact`
- `accountResponsibleName`
- `accountResponsibleId`
- `accountResponsibility`

Suggested future cleanup: move contacts into structured records with `contactType`, `relationship`, `name`, `phone`, `email`, `idNumber`, `address`, and `isAccountResponsible`.

### Medical Aid Fields

Medical aid values overlap:

- `medicalAid`
- `medicalAidPlan`
- "Medical aid no." currently points to `medicalAid`
- "Member responsible" currently points to `guardian`
- `dependantCode`

Suggested future cleanup: separate medical aid provider, plan, membership number, dependent code, main member, and account responsible person.

### Status Field Overload

`status` is used for several unrelated domains:

- Tenant status
- Subscription status
- Invoice status
- Ticket status
- Service health status
- Session status

Suggested future cleanup: use explicit fields such as `tenantStatus`, `invoiceStatus`, `ticketStatus`, `serviceStatus`, and `bookingStatus`.

### Financial Amounts

The app references:

- `amount`
- `price`
- `defaultPrice`
- `quotedAmount`
- `invoiceAmount`
- `paymentAmount`
- `balance`

Suggested future cleanup: store invoice totals from invoice line items, keep patient balance derived from unpaid invoices/statements, and avoid storing `balance` directly on patient profiles unless it is a cached value.

### Renewal / Billing Date

Super Admin tenants use `renewal`, but the recent business logic is closer to first billing date or next billing date after trial.

Suggested future cleanup: rename to `nextBillingDate` or `firstBillingDate` where appropriate.

### Legacy Branding Keys

The app still reads legacy localStorage keys containing `allicms`. This is intentionally useful for migration, but should eventually be removed after live data replaces localStorage.

## 10. Suggested Database Tables Based Only On Current App

These are suggested tables based strictly on current app usage. They are not migrations and should not be treated as final schema until the product flows are locked.

### Platform / Super Admin

- `platform_configurations`
  - Global AlliDesk settings such as support email, support phone, app URL, marketing URL, privacy version, terms version, default timezone, default language, maintenance mode.
- `subscription_plans`
  - Plan name, description, user range, monthly price, active flag, public/hidden flag.
- `tenant_subscriptions`
  - Tenant plan, status, billing cycle, trial status, first billing date, next billing date, cancelled date.
- `support_tickets`
  - Ticket number, tenant, priority, category, status, assigned user, logged date, updated date.
- `system_health_events`
  - Service, status, uptime/metric value, response metric, message, checked at.

### Tenant And Users

- `tenants`
  - Tenant shell and platform lifecycle metadata.
- `tenant_profiles`
  - Practice metadata synced from tenant Admin setup for Super Admin viewing.
- `profiles`
  - User identity profile connected to auth later.
- `tenant_users`
  - Tenant-scoped user role, active status, contact details.
- `therapist_profiles`
  - Therapist professional details: HPCSA, discipline, qualification, signature, own practice number.
- `therapist_finance_profiles`
  - Therapist-specific banking and invoice-related overrides.

### Practice Configuration

- `practice_configurations`
  - Main tenant practice setup, contact details, consent message, invoice prefix, tax/VAT.
- `practice_entities`
  - Main practice and extra practice partners.
- `practice_locations`
  - Venue/location records linked to practice entities.
- `practice_banking_details`
  - Structured banking details for practices or therapists if not embedded.

### Patient Records

- `patients`
  - Core patient identity, type, DOB, patient number, status, assigned therapist.
- `patient_contacts`
  - Guardian, secondary contact, emergency contact, account responsible person.
- `patient_addresses`
  - Residential/postal addresses if structured address support is needed.
- `patient_medical_aid`
  - Provider, plan, membership number, dependent code, main member, no medical aid flag.
- `patient_consents`
  - POPIA consent, therapy consent, medical aid consent, signed by, signature data/file reference, signed date.
- `patient_notes`
  - Note type, note date, content, internal/external visibility, linked booking.
- `patient_history_events`
  - Timeline of visible/internal events.
- `patient_documents`
  - Placeholder for future documents and reports. File storage should be added later only when requested.

### Bookings And Clinical Session Work

- `bookings`
  - Appointment date/time, patient, therapist, room/mode, practice, location, status, assessment flag, duration.
- `blocked_calendar_slots`
  - Calendar blocks for unavailable time.
- `booking_plans`
  - Session planning text linked to a booking.
- `booking_notes`
  - Session feedback, process note, case management note linked to booking and patient.

### Billing And Finance

- `icd10_codes`
  - Tenant-scoped diagnosis codes.
- `procedure_price_lists`
  - Named procedure/pricing lists.
- `procedure_prices`
  - Procedure code, description, service type, default price, duration, discipline, active flag.
- `invoices`
  - Invoice status, patient, booking, practitioner, dates, totals, PDF URL/reference, payment status dates.
- `invoice_line_items`
  - Session date, invoice, procedure code, description, ICD-10 code, price.
- `statements`
  - Patient statement record, statement date, total, outstanding total, PDF URL/reference.
- `statement_invoice_links`
  - Many-to-many relation between statements and included invoices.
- `payments`
  - Payment received records, amount, payment date, proof reference, invoice/statement relation.

### Tenant Settings Content

- `patient_configuration_fields`
  - Tenant-configurable intake fields, active and required flags.
- `patient_categories`
  - Child, Teen, Adult, and future tenant-specific categories.
- `referral_sources`
  - Tenant-configurable referral sources.
- `guides`
  - How To / operating procedure content.
- `whats_new`
  - Deployment notes and role visibility.

## Current Backend Readiness

The codebase currently includes a Supabase client helper and a connection test. The app still uses mock/local prototype data for workflows and localStorage for selected persisted prototype records.

Current Supabase environment variable names:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

No live Supabase tables or migrations should be inferred from the current app until the intended production schema is confirmed.

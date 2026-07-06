# AlliDesk Project Roadmap

This is a living roadmap for AlliDesk. It should be updated as product, architecture, and implementation decisions evolve.

## Foundation

Completed:

- Brand renamed to AlliDesk.
- Main product domains defined.
- Current app data audit completed.
- Production database architecture blueprint completed.
- Phase 1 Supabase migration created for platform and identity foundation.
- Vercel deployment path established.
- Supabase client configuration added.

Upcoming:

- Review and approve Phase 1 migration in Supabase.
- Generate database types after migrations are applied.
- Add development, staging, and production environment rules.
- Split prototype state from production data access layer.

## Authentication

Completed:

- Identity architecture selected: `profiles` plus `tenant_users`.
- Role model documented for Super Admin, Admin, Reception, Therapist, Finance, and Patient Portal User.

Upcoming:

- Enable Supabase Auth.
- Create profile creation flow.
- Create tenant invitation flow.
- Add login, logout, password reset, and session handling.
- Add active tenant switching if a profile belongs to multiple tenants.

## Platform

Completed:

- Super Admin modules designed in the app.
- Tenant management concepts defined.
- Platform subscription plan structure created in Phase 1 migration.
- Platform configuration and audit foundations defined.

Upcoming:

- Connect Super Admin tenant list to Supabase.
- Connect subscription plan management to Supabase.
- Add tenant create flow with Tenant Admin invitation.
- Add platform audit views.
- Add support ticket persistence.

## Practice

Completed:

- Practice configuration UI exists in Settings.
- Practice partners and locations UI exists.
- Banking details and practice number logic defined.

Upcoming:

- Create practice configuration tables.
- Create practice entities, locations, rooms, and banking details tables.
- Connect Settings to live tenant-scoped data.
- Add tenant configuration validation.

## Patients

Completed:

- Patient profile workspace exists.
- Patient Profile Link exists.
- Intake form and POPIA signature flow exists in prototype.
- Patient data model audited.

Upcoming:

- Create patient, contacts, addresses, medical aid, consents, and intake tables.
- Connect new patient creation to Supabase.
- Connect Patient Profile Link to live data.
- Add secure patient portal access model.
- Add validation for required intake fields.

## Scheduling

Completed:

- Booking calendar exists.
- New Booking modal exists.
- Booked session modal exists.
- Block time concept exists.
- Therapist colours and practice/location/room logic exist in prototype.

Upcoming:

- Create bookings, availability, blocked slots, and booking status event tables.
- Connect booking creation to Supabase.
- Add real-time calendar updates.
- Add reschedule, cancellation, and no-show persistence.

## Clinical

Completed:

- Session planning and notes exist in prototype.
- Note types defined.
- Patient history concept exists.
- Clinical note versioning decision documented.

Upcoming:

- Create booking plans, patient notes, and patient note version tables.
- Connect session feedback and internal notes to live data.
- Add clinical note version history.
- Add document/report foundations.
- Add outcome measures.

## Finance

Completed:

- Invoice status flow exists in prototype.
- Confirm invoice workflow exists.
- Payment received and proof flow exists.
- Statement generation concept exists.
- Immutable invoice decision documented.

Upcoming:

- Create ICD-10, procedure pricing, invoice, invoice line item, statement, payment, and allocation tables.
- Connect billing queue to live data.
- Generate and store invoice/statement PDF metadata.
- Add overdue logic from live payment due dates.
- Add future medical aid claims foundation.

## Communication

Completed:

- Patient intake share message exists.
- Patient notice board concept exists.
- Reminder and communication requirements identified.

Upcoming:

- Create communication templates and communication logs.
- Add email provider integration.
- Add SMS provider integration.
- Add WhatsApp provider integration.
- Track delivery, failure, and retry status.

## Reporting

Completed:

- Overview dashboard exists in prototype.
- Patient To Do's, confirm invoices, feedback due, and outstanding balance concepts exist.

Upcoming:

- Create reporting views or summary queries.
- Connect dashboard metrics to live data.
- Add tenant-level operational reports.
- Add finance reporting.
- Add clinical report metadata.

## AI

Completed:

- AI domain included in architecture.
- AI draft workflow principles defined.

Upcoming:

- Define AI assistant safety model.
- Create AI assistant session and draft tables.
- Add tenant-level AI enable/disable settings.
- Add human approval workflow for AI-generated clinical content.

## Launch

Completed:

- Public marketing domain identified: `allidesk.co.za`.
- SaaS app domain identified: `app.allidesk.co.za`.
- Vercel hosting selected.

Upcoming:

- Configure production Supabase project.
- Apply approved migrations.
- Configure Vercel environment variables.
- Add production auth URLs.
- Complete tenant onboarding flow.
- Complete first pilot tenant live-data test.
- Confirm POPIA/privacy wording.
- Prepare launch checklist.

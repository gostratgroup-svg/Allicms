# Phase 4 Step 11: Communication Templates UI And Data Connection

## What Was Implemented

Added Communication Templates management for the active tenant.

The new route is:

- `/practice/communication-templates`

The Practice hub now links the `Communication Templates` card to this route.

## Data Operations

The page uses the existing Supabase client and active tenant context.

Implemented operations:

- Select all non-deleted `communication_templates` rows for the active tenant
- Create a new communication template
- Update an existing communication template
- Mark templates active or inactive using `is_active`

No WhatsApp, email, SMS sending, patient-link notification delivery, or automation execution was implemented.

## Fields Supported

- Template key
- Channel
- Title
- Message body
- Automation trigger key
- Active / inactive status

## Recommended Template Keys

The UI offers these recommended keys:

- `appointment_booked`
- `intake_required`
- `invoice_available`
- `payment_due`
- `payment_received`
- `statement_available`
- `feedback_available`

## Channels

The UI uses channels supported by the current schema constraint:

- `whatsapp`
- `email`
- `sms`
- `patient_link`
- `internal`

## Permission Handling

This route uses the existing `settings` access pattern.

View access follows the closest current practice/settings permission model:

- `tenant.practice.configure`
- or `tenant.users.manage` through the existing `settings` access area

Editing requires:

- `tenant.practice.configure`

## Files Changed

- `src/pages/PracticeCommunicationTemplates.tsx`
- `src/pages/Practice.tsx`
- `src/routes/appRoutes.tsx`
- `src/styles.css`

## Known Limitations

- No WhatsApp sending is implemented.
- No email sending is implemented.
- No SMS sending is implemented.
- Automation trigger keys are stored only and are not executed.
- No audit event write is emitted from the frontend yet.
- Template variables are not validated yet.

## Next Recommended Step

Complete a Phase 4 Practice Foundation review before adding more Practice modules. After review, the next practical implementation area is likely Team/Therapists or the first operational module that consumes this configuration.

# Phase 4 Step 4: Navigation And Practice Area Shell

## Objective

Align the authenticated AlliDesk app shell with the approved Phase 4 information architecture without connecting live operational data.

## Main Navigation

The tenant app shell now uses six primary navigation areas:

- Overview
- Bookings
- Patients
- Finance
- Practice
- Settings

Legacy Phase 3 routes redirect into the new structure so older local links remain safe during development.

## Route Structure

- `/overview`
- `/bookings`
- `/patients`
- `/finance`
- `/practice`
- `/settings`

## Page Shells

Each route renders static placeholder section cards using the shared app styling.

Overview prepares the future permission-driven command centre.

Bookings prepares calendar, new booking, location calendar, therapist calendar and booking queue sections.

Patients prepares patient list, new patient, onboarding, history, Patient Link and documents sections.

Finance prepares billing queue, invoices, payments, statements, price lists and reports sections.

Practice prepares practice profile, locations, team, therapists, branding, banking details, billing configuration, communication templates, security and integrations sections.

Settings is now personal user settings only, covering profile, notifications, password and security, appearance and calendar preferences.

## Data Boundary

This step does not connect Supabase operational data, build CRUD forms, modify migrations, or replace prototype storage.

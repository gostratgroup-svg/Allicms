# AlliDesk Architecture Decision Log

This ADR records major product and technical decisions made during the move from prototype to production.

## ADR 001: Platform Name Changed To AlliDesk

Decision: Rename the platform from AlliCMS / AlliHealth references to AlliDesk.

Reason: AlliDesk better describes the operational desk/workspace nature of the product and creates a clearer SaaS brand for allied health practices.

Consequences: All visible product branding, docs, metadata, deployment naming, and future database references should use AlliDesk. Legacy localStorage keys may remain temporarily only for migration compatibility.

Status: Accepted

Date: 2026-07-06

## ADR 002: Primary Domain Is allidesk.co.za

Decision: Use `allidesk.co.za` as the primary public domain.

Reason: A dedicated South African domain fits the first market and gives the platform a clean public identity.

Consequences: Product links, customer communication, support references, and marketing assets should align to the `allidesk.co.za` domain.

Status: Accepted

Date: 2026-07-06

## ADR 003: Marketing Site On allidesk.co.za

Decision: Host the marketing website at `https://allidesk.co.za`.

Reason: The marketing site should be separate from the authenticated SaaS app and serve public brand, product, and conversion content.

Consequences: Public content, landing pages, SEO pages, and sales material belong on the marketing site, not inside the app workspace.

Status: Accepted

Date: 2026-07-06

## ADR 004: SaaS App On app.allidesk.co.za

Decision: Host the AlliDesk web app at `https://app.allidesk.co.za`.

Reason: A subdomain clearly separates authenticated application workflows from the public marketing site.

Consequences: App links, patient links, Vercel app deployment, auth callback URLs, and Supabase allowed URLs should be configured for `app.allidesk.co.za`.

Status: Accepted

Date: 2026-07-06

## ADR 005: React And TypeScript Frontend

Decision: Continue building the frontend with React and TypeScript.

Reason: The existing prototype is already built in React and TypeScript, which supports fast iteration, typed data contracts, and a scalable component model.

Consequences: Future UI work should keep TypeScript strictness, extract shared components as the app grows, and generate Supabase types once database schemas stabilise.

Status: Accepted

Date: 2026-07-06

## ADR 006: Vercel Hosting

Decision: Use Vercel to host the web application.

Reason: Vercel fits the current Vite frontend workflow and supports simple preview, production, and custom domain deployments.

Consequences: Build settings must remain compatible with Vercel, environment variables must be configured in Vercel, and local development must continue to work independently.

Status: Accepted

Date: 2026-07-06

## ADR 007: Supabase Backend

Decision: Use Supabase as the live-data backend.

Reason: Supabase provides PostgreSQL, Auth, Row Level Security, APIs, and future storage capability in one platform suitable for a multi-tenant SaaS product.

Consequences: Data architecture must be RLS-first, environment variables must be managed safely, and app workflows should be connected to live data in controlled phases.

Status: Accepted

Date: 2026-07-06

## ADR 008: PostgreSQL Database

Decision: Use PostgreSQL as the production relational database through Supabase.

Reason: AlliDesk requires relational integrity, tenant isolation, transactional financial workflows, audit trails, and structured healthcare-adjacent records.

Consequences: Database design should use foreign keys, constraints, indexes, RLS policies, and controlled migrations.

Status: Accepted

Date: 2026-07-06

## ADR 009: Multi-Tenant Architecture

Decision: AlliDesk will use a multi-tenant architecture with each practice operating as a tenant workspace.

Reason: AlliDesk is a SaaS product serving many independent practices, each requiring isolated users, patients, bookings, clinical records, and finance data.

Consequences: Tenant isolation is a first-class design rule. Tenant operational tables must be tenant-scoped, and application queries must always respect tenant context.

Status: Accepted

Date: 2026-07-06

## ADR 010: Separate profiles And tenant_users

Decision: Keep `profiles` as the global auth-linked user profile and `tenant_users` as the tenant membership and role table.

Reason: One person may belong to multiple tenants. Duplicating user identities per tenant would create poor account management and security drift.

Consequences: User identity, tenant membership, and tenant role are separate concerns. Role-based access should be evaluated through `tenant_users`.

Status: Accepted

Date: 2026-07-06

## ADR 011: tenant_id On All Operational Tenant Tables

Decision: Every operational tenant table must include `tenant_id`.

Reason: Explicit tenant scoping is necessary for clear data ownership, predictable RLS, and safe multi-tenant queries.

Consequences: Patient, booking, clinical, finance, document, communication, task, and reporting records must all be created with `tenant_id`.

Status: Accepted

Date: 2026-07-06

## ADR 012: Row Level Security By Default

Decision: Enable Row Level Security on all production tables.

Reason: RLS is the primary database-level enforcement layer for tenant isolation and role-based access.

Consequences: Every table needs conservative policies. New tables should not be considered production-ready until RLS is enabled and reviewed.

Status: Accepted

Date: 2026-07-06

## ADR 013: Versioned Clinical Notes

Decision: Clinical notes must be versioned rather than overwritten.

Reason: Clinical records require traceability. Editing a note should preserve previous content for audit, legal, and clinical integrity.

Consequences: Production clinical note design should include `patient_notes` and `patient_note_versions`. The app should show the latest version while preserving history.

Status: Accepted

Date: 2026-07-06

## ADR 014: Immutable Invoices

Decision: Invoices and statements should store immutable snapshots of key details at issue time.

Reason: Changes to patient, practice, therapist, pricing, banking, or service configuration must not silently change old financial documents.

Consequences: Invoice and statement tables should snapshot patient, practice, therapist, service, banking, ICD-10, price, and payment term details.

Status: Accepted

Date: 2026-07-06

## ADR 015: Audit Events

Decision: `audit_events` is a core production table.

Reason: AlliDesk needs traceability for tenant lifecycle, user role changes, consent, bookings, clinical notes, invoices, payments, and sensitive document actions.

Consequences: Meaningful write actions should create audit records with actor, tenant, action, entity, record ID, timestamp, and metadata.

Status: Accepted

Date: 2026-07-06

## ADR 016: Reference Data Domain

Decision: Create a Reference Data domain for controlled lookup values.

Reason: Titles, relationship types, contact types, note types, appointment types, countries, currencies, languages, ICD-10 codes, and referral source templates need consistent handling.

Consequences: Reference data can be global, tenant-specific, or seeded globally and overridden per tenant. Forms should avoid uncontrolled free-text where a controlled option is required.

Status: Accepted

Date: 2026-07-06

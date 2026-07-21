# Phase 6A Step 2: Clinical Engine Database Foundation

Date: 2026-07-15  
Status: Database foundation implemented. No frontend, routes, UI workflows, storage uploads, billing workflow changes, Patient Link rendering, or generated clinical screens were implemented.

## Scope

This step creates the foundational Clinical Engine database layer described in `docs/phase6a-step1-clinical-engine-architecture.md`.

The migration is forward-only:

`supabase/migrations/202607150001_phase6a_clinical_engine.sql`

The Clinical Engine remains a separate domain. It references patients, bookings, sessions, therapists and Patient Link boundaries where needed, but it does not own those records and does not depend on finance records.

## Tables Created

- `clinical_encounters`
- `clinical_note_templates`
- `clinical_note_template_versions`
- `clinical_notes`
- `clinical_note_versions`
- `clinical_note_amendments`
- `treatment_plans`
- `clinical_goals`
- `clinical_goal_reviews`
- `outcome_measure_definitions`
- `clinical_assessments`
- `outcome_measure_results`
- `clinical_diagnoses`
- `clinical_attachments`
- `clinical_record_restrictions`
- `clinical_patient_link_publications`
- `clinical_workflow_events`

## Relationships

Clinical records are tenant-owned and can reference:

- `patients`
- `bookings`
- `sessions`
- `therapist_profiles`
- `practice_locations`
- `patient_links`
- `profiles` for authorship, finalisation, signing, amendment, publication and audit attribution

System-level clinical templates and outcome measure definitions support `tenant_id = null`, while tenant-owned definitions require `tenant_id`.

## Integrity Rules

Key constraints and indexes include:

- UUID primary keys named `id`
- `tenant_id` on tenant-scoped clinical tables
- `created_at`, `updated_at`, and `deleted_at` where soft deletion is needed
- lifecycle status checks for encounters, notes, versions, treatment plans, goals, assessments, diagnoses, publications and workflow events
- JSON object checks for structured content and metadata
- unique note/template version numbers
- unique active template versions
- unique active primary diagnosis per patient
- unique published Patient Link clinical publication per clinical record
- tenant and patient lookup indexes for all major clinical areas

Tenant integrity triggers validate that linked patients, bookings, sessions, therapists, locations, notes, assessments, goals and Patient Links belong to the same tenant.

## Immutability and Versioning

Clinical note content is stored in `clinical_note_versions`.

Draft note versions may be edited directly by authorised tenant clinical users. Once a version is finalised, signed, amended or locked:

- free-text content cannot be changed
- structured content cannot be changed
- template reference cannot be changed
- author and finalisation metadata cannot be changed
- signed metadata cannot be changed after signing
- soft deletion of finalised content is blocked by the immutability trigger

Amendments are stored in `clinical_note_amendments` and are append-only. The migration adds an append-only trigger that rejects update and delete operations on amendment rows.

## RPCs Added

The migration adds permission-aware lifecycle RPCs:

- `finalise_clinical_note_version(target_note_version_id uuid)`
- `sign_clinical_note_version(target_note_version_id uuid, signature_statement_input text default null)`
- `amend_clinical_note(target_clinical_note_id uuid, target_note_version_id uuid, amendment_reason_input text, amendment_free_text_input text default null, amendment_structured_content_input jsonb default '{}'::jsonb)`
- `publish_clinical_record_to_patient_link(target_record_type text, target_record_id uuid, safe_title_input text, safe_summary_input text default null, patient_link_id_input uuid default null)`
- `revoke_clinical_patient_link_publication(target_publication_id uuid, revoke_reason_input text default null)`

These RPCs validate tenant membership and role using existing `has_tenant_role(...)` conventions. The clinical lifecycle RPCs write `audit_events` and `clinical_workflow_events`.

## RLS and Access Model

RLS is enabled on every Clinical Engine table.

Default tenant clinical access is limited to tenant users with:

- `admin`
- `therapist`

Super Admin does not receive default access to tenant clinical content.

System-level template and outcome measure definitions may be read by authenticated users and managed by Super Admin where appropriate. This is not tenant clinical content.

`clinical_patient_link_publications` is read-only to tenant clinical users. Publication and revocation writes must go through the RPC boundary to prevent direct table writes from bypassing patient-visible checks.

No anonymous direct table access is granted.

## Patient Link Boundary

Patient Link exposure is explicit and separate.

`clinical_patient_link_publications` stores safe publication metadata only:

- publication status
- safe title
- safe summary
- target clinical record reference
- optional Patient Link reference
- publication/revocation audit fields

It does not expose unrestricted clinical note content. Future Patient Link projection functions should read only published, safe projection data.

## Audit and Workflow Events

Lifecycle RPCs insert into `audit_events` for:

- clinical note finalisation
- clinical note signing
- clinical note amendment
- clinical record publication to Patient Link
- clinical Patient Link publication revocation

They also create `clinical_workflow_events` for downstream Workflow Engine integration.

## Type Updates

`src/lib/database.types.ts` was updated with the new clinical table names and RPC signatures.

The local type update is intentionally scoped to the Phase 6A objects. After applying the migration to Supabase, the recommended follow-up is to regenerate database types from the live development schema using the existing project convention.

## Deferred Functionality

This step does not implement:

- Clinical frontend pages
- Clinical note editor UI
- Clinical template builder UI
- Clinical storage uploads
- Patient Link clinical rendering
- Discipline-specific clinical modules
- AI clinical drafting or summarisation
- Clinical reporting dashboards
- Booking/session UI integration

## Assumptions

- Until a more granular clinical permission model exists, tenant `admin` and `therapist` roles are treated as authorised clinical users.
- `clinical_attachments` stores metadata and storage references only. File storage remains a later documents/storage step.
- System templates and system outcome definitions are safe platform reference data and are not tenant clinical records.

## Validation Notes

Static review focused on:

- tenant isolation
- role boundaries
- no Super Admin tenant clinical access
- finalised/signed content immutability
- append-only amendments
- explicit Patient Link publication boundaries
- avoiding circular dependency with Booking, Session, Finance, Workflow and Patient Link domains

Build and whitespace validation were run after implementation.

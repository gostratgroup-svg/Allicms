-- Operational Readiness Step 2 repair:
-- Patient Link shared-document access must be auditable with a document-specific event type.

alter table public.patient_link_access_logs
  drop constraint if exists patient_link_access_logs_event_type_check;

alter table public.patient_link_access_logs
  add constraint patient_link_access_logs_event_type_check
  check (
    event_type in (
      'login',
      'logout',
      'verification_requested',
      'verification_succeeded',
      'verification_failed',
      'session_created',
      'session_expired',
      'access_revoked',
      'invoice_viewed',
      'appointment_viewed',
      'receipt_viewed',
      'document_viewed',
      'suspicious_activity'
    )
  );

comment on constraint patient_link_access_logs_event_type_check on public.patient_link_access_logs is
  'Allowed Patient Link access events, including explicit document_viewed audit events for shared-document access.';

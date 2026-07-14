-- AlliDesk Phase 5E completion hardening: active external transaction
-- references must not be recorded more than once per tenant.
--
-- The frontend performs a best-effort duplicate check before calling
-- record_payment(...), but the database must remain authoritative under
-- concurrent users and retry scenarios.

create unique index if not exists payments_unique_active_external_transaction_reference_idx
on public.payments (tenant_id, external_transaction_reference)
where external_transaction_reference is not null
  and deleted_at is null
  and payment_status <> 'reversed';

comment on index public.payments_unique_active_external_transaction_reference_idx is
  'Prevents duplicate active external payment transaction references per tenant while allowing reversed payments to remain auditable.';

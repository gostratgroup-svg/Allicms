-- AlliDesk Phase 5D Step 5: restrict direct invoice total recalculation.
--
-- `recalculate_invoice_totals(uuid)` is an internal finance integrity helper
-- used by invoice-line triggers and approved invoice RPCs. It should not be
-- directly executable from client sessions because it is SECURITY DEFINER and
-- intentionally bypasses RLS for deterministic total maintenance.

revoke all on function public.recalculate_invoice_totals(uuid) from public, anon, authenticated;

comment on function public.recalculate_invoice_totals(uuid) is
  'Internal invoice total recalculation helper. Invoked by database triggers and approved finance RPCs only; direct client execution is revoked.';

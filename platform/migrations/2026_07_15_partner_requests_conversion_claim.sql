-- createTenantFromLead() (src/lib/create-tenant-from-lead.ts) is invoked from the
-- Stripe PLATFORM webhook on checkout.session.completed. Stripe redelivers an event
-- whenever the handler doesn't ACK within ~10s or the response is dropped -- no
-- attacker required, just a slow/retried delivery under load. The function's own
-- idempotency check (read partner_requests.converted_tenant_id, bail if set) is a
-- classic TOCTOU: two concurrent redeliveries can both read it as NULL before either
-- writes it, so both proceed through territory-claim + tenant insert + owner-PIN
-- creation, producing two duplicate tenants both linked to the same Stripe
-- subscription. This column lets the function atomically claim the lead (CAS
-- UPDATE ... WHERE conversion_claimed_at IS NULL) before doing any of that work,
-- closing the race the same way deposit_paid_at already guards the quote-deposit
-- webhook path. A stale (>5min) claim from a crashed attempt is reclaimable by the
-- application, so this can never permanently wedge a lead. Idempotent, no backfill
-- needed (NULL = unclaimed, the correct default for every existing row).
ALTER TABLE partner_requests
  ADD COLUMN IF NOT EXISTS conversion_claimed_at timestamptz;

COMMENT ON COLUMN partner_requests.conversion_claimed_at IS
  'Set by createTenantFromLead() as a CAS lock before creating a tenant from this lead. NULL = unclaimed/converted. Stale (>5min) claims are reclaimable.';

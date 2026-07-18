-- 2026_07_17_clients_pin_unique.sql
-- FILE ONLY -- do NOT execute here. Leader runs after Jeff approves.
--
-- MUST run AFTER 2026_07_17_clients_pin_dedupe.backfill.sql (this file's
-- CREATE UNIQUE INDEX fails outright on any remaining (tenant_id, pin)
-- collision -- the pre-flight check below gives a clear, named error
-- instead of surfacing Postgres's raw 23505 as the first sign anything was
-- out of order).
--
-- Closes the gap 2026_07_16_client_team_pin_hash.sql's header deliberately
-- deferred: clients.pin (the client-portal login credential) had no
-- uniqueness backing at all. Mirrors idx_team_members_tenant_pin_unique
-- (014_security_hardening.sql) exactly, minus the `status = 'active'`
-- clause -- clients has no equivalent status enum column gating login
-- eligibility the way team_members.status does; do_not_service is a
-- boolean checked separately at the application layer (client/login,
-- client-auth.ts), not part of this invariant.
--
-- Going forward this also backstops the write sites that mint PINs
-- (client/collect, client/verify-code, client/book). UPDATE 2026-07-18: the
-- flagged follow-up landed -- all three now regenerate via
-- randomClientPin() (src/lib/client-auth.ts) and retry up to
-- MAX_CLIENT_PIN_ATTEMPTS on a 23505 from this index, same pattern
-- 065_unique_payments_reference.sql's processPayment() and POST
-- /api/invoices already use for their own collision classes, instead of
-- surfacing a raw insert failure as a generic 500 (client/book) or failing a
-- real customer's booking / a just-verified login outright.

do $$
declare
  n_dupes bigint;
begin
  select count(*) into n_dupes
  from (
    select tenant_id, pin
    from clients
    where pin is not null
    group by tenant_id, pin
    having count(*) > 1
  ) dupes;

  if n_dupes > 0 then
    raise exception
      '2026_07_17_clients_pin_unique: % (tenant_id, pin) collision group(s) still exist -- run 2026_07_17_clients_pin_dedupe.backfill.sql first',
      n_dupes;
  end if;
end $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_tenant_pin_unique
  ON clients(tenant_id, pin)
  WHERE pin IS NOT NULL;

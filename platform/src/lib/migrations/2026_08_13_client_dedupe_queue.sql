-- Automated client dedupe: review queue + phone lookup index.
--
-- Client requested (2026-08-13): never have duplicate clients, auto-merge
-- the safe cases, and never lose a record (only combine). The actual merge
-- mechanics already exist (src/lib/client-merge.ts — re-points every FK
-- table onto a canonical client, soft-retires the loser via
-- clients.active=false, never a hard delete). What was missing was
-- (1) somewhere to land the riskier candidates that should NOT be merged
-- without a human looking (a phone match with no matching email, or vice
-- versa — the existing scripts/dedupe-clients-phone.mjs already treats a
-- shared-phone-different-name group as "reused number, not one customer,"
-- same caution applies here), and (2) an index so the new real-time check
-- and background sweep (src/lib/client-dedupe.ts) can look up "does another
-- client already have this phone" without a full table scan. Email already
-- has idx_clients_tenant_email_unique (2026_07_13_clients_tenant_email_unique.sql);
-- phone has no equivalent yet.
CREATE INDEX IF NOT EXISTS idx_clients_tenant_phone
  ON clients (tenant_id, phone)
  WHERE phone IS NOT NULL AND phone <> '';

CREATE TABLE IF NOT EXISTS client_dedupe_queue (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL,
  client_a_id   uuid NOT NULL,
  client_b_id   uuid NOT NULL,
  match_type    text NOT NULL CHECK (match_type IN ('phone', 'email')),
  match_value   text NOT NULL,
  suggested_canonical_id  uuid,
  suggested_reason        text,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'merged', 'dismissed')),
  reviewed_by   text,
  reviewed_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- One pending row per candidate pair per tenant — the real-time check and
-- the daily sweep can both surface the same pair; the second write should
-- no-op instead of piling up duplicate queue entries for the same duplicate.
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_dedupe_queue_pending_pair
  ON client_dedupe_queue (tenant_id, LEAST(client_a_id, client_b_id), GREATEST(client_a_id, client_b_id))
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_client_dedupe_queue_tenant_status
  ON client_dedupe_queue (tenant_id, status, created_at DESC);

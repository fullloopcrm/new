-- Renurture win-back automation — dedup log + redemption tracking.
-- Tenant-aware port of nycmaid's supabase/renurture_log.sql (commits
-- a089465e + 9f55c77e), combined into one table since this is a fresh port
-- rather than an incremental history.
--
-- One row per (tenant_id, client_id, touch_key) ever sent. The unique
-- constraint IS the dedup mechanism: the cron/immediate-trigger does an
-- insert-then-send (claim first, same pattern as outreach_log), and a unique
-- violation means "already sent this touch to this client" so nobody gets
-- double-texted by an overlapping run.
--
-- redemption_code/redeemed_at/redeemed_by_schedule_id support the self-serve
-- discount code flow: /api/client/recurring accepts an optional
-- renurture_code, and on a valid unredeemed monthly-cadence booking, stamps
-- these columns for attribution + conversion-rate reporting
-- (/api/admin/renurture/stats).
--
-- NOT YET RUN against prod — run this before wiring /api/cron/renurture into
-- vercel.json, or the cron fails closed (see route.ts) and alerts admin on
-- every invocation.

BEGIN;

CREATE TABLE IF NOT EXISTS renurture_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  touch_key TEXT NOT NULL,
  segment TEXT NOT NULL CHECK (segment IN ('onetime', 'lapsed')),
  touch_num SMALLINT NOT NULL CHECK (touch_num IN (0, 1, 2, 3)), -- 0 = immediate pause/cancel save trigger
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'both', 'none')),
  discount_pct SMALLINT NOT NULL,
  redemption_code TEXT,
  redeemed_at TIMESTAMPTZ,
  redeemed_by_schedule_id UUID REFERENCES recurring_schedules(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, client_id, touch_key)
);

CREATE INDEX IF NOT EXISTS idx_renurture_log_tenant_client ON renurture_log(tenant_id, client_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_renurture_log_redemption_code ON renurture_log(redemption_code) WHERE redemption_code IS NOT NULL;

COMMIT;

-- Comm Hub contact IP capture + block-from-contact feature (2026-08-10).
-- Anonymous webchat visitors have no phone/email, only an IP — this gives
-- operators a city-level location for them and a way to stop repeat abuse
-- (e.g. an anonymous visitor harassing staff/owner via the chat widget).

-- IP + best-effort city/region geolocation, captured once when a new
-- anonymous webchat contact is created. Also doubles as the per-contact
-- block flag: any inbound channel (webchat/SMS/email) checks blocked_at
-- before accepting a new message from a contact.
ALTER TABLE comhub_contacts ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE comhub_contacts ADD COLUMN IF NOT EXISTS geo_city TEXT;
ALTER TABLE comhub_contacts ADD COLUMN IF NOT EXISTS geo_region TEXT;
ALTER TABLE comhub_contacts ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ;
ALTER TABLE comhub_contacts ADD COLUMN IF NOT EXISTS blocked_by UUID REFERENCES tenant_members(id) ON DELETE SET NULL;
ALTER TABLE comhub_contacts ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
CREATE INDEX IF NOT EXISTS idx_comhub_contacts_ip ON comhub_contacts(tenant_id, ip_address) WHERE ip_address IS NOT NULL;

-- Site-wide IP block list, per tenant. Checked in middleware (piggybacks on
-- the tenant row that's already fetched on every request — no extra query).
-- Expected to stay tiny (handful of entries, abuse cases only); a plain
-- text[] with `= ANY()` is fine at that scale and avoids a join on the hot
-- path. Blocking is exact-IP only, no CIDR ranges — see the 2026-08-10
-- Comm Hub IP-tracking session notes for why (residential/business IPs
-- here are not shared across a building).
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS blocked_ips TEXT[] NOT NULL DEFAULT '{}';

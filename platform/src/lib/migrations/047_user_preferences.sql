-- 047_user_preferences.sql
-- Per-user, per-page UI preferences (default views, filters, columns,
-- page size, etc). Distinct from tenants.<column> which is tenant-wide
-- business behavior.
--
-- Keyed by tenant_member_id so a user who belongs to multiple tenants
-- gets distinct prefs per tenant — and prefs cascade-delete when a
-- membership is removed.

CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_member_id uuid NOT NULL REFERENCES tenant_members(id) ON DELETE CASCADE,
  page text NOT NULL,
  prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_member_id, page)
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_member
  ON user_preferences(tenant_member_id);

CREATE INDEX IF NOT EXISTS idx_user_preferences_member_page
  ON user_preferences(tenant_member_id, page);

-- Match the deny-by-default RLS posture set in 046.
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

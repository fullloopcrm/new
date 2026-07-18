-- 2026_07_18_deal_activities_client_id.sql
-- deal_activities (sales-process Note/Call/Text/Email/Quote logs, written by
-- POST /api/deals/[id]/activities) only ever carried deal_id -- there is no
-- way to query "everything logged for this client" without first fanning out
-- across every deal that client has ever had. The client detail page has no
-- visibility into this table at all today.
--
-- Additive, nullable -- deal_activities.deal_id already scopes every row to
-- a deal, and deals.client_id is itself nullable (a deal can exist with no
-- client attached yet), so client_id here just mirrors that same optionality
-- rather than forcing a value that may not exist. NOT a hard FK (matches the
-- existing deals.client_id -> clients(id) column it mirrors, and the
-- deal_activities.deal_id -> deals(id) FK above it already enforces deal
-- integrity); enforced at the application layer the same way deals.client_id
-- is (see POST /api/deals/[id]/activities, which looks it up from the
-- parent deal at insert time going forward).

ALTER TABLE deal_activities
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);

CREATE INDEX IF NOT EXISTS idx_deal_activities_client
  ON deal_activities(client_id, created_at DESC);

COMMENT ON COLUMN deal_activities.client_id IS
  'Denormalized from deals.client_id at insert time so a client''s activity feed can query deal_activities directly instead of fanning out across every deal_id that client has ever had. NULL = the parent deal had no client_id set (or predates this backfill, see paired backfill file).';

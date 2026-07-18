-- 2026_07_17_clients_retention_sms_claim_columns.backfill.sql
-- FILE ONLY — do NOT execute here. Leader runs after Jeff approves, AFTER
-- 2026_07_17_clients_retention_sms_claim_columns.sql has added the columns.
--
-- Recovers real history from the existing notifications audit trail
-- (type='retention', recipient_id=client.id, one row per historical send)
-- so post-migration cap/cooldown state matches pre-migration state instead
-- of resetting every client's lifetime count to 0 and letting anyone
-- already at the cap of 3 receive additional retention texts.

update clients c
set
  retention_sms_count = agg.cnt,
  retention_sms_sent_at = agg.last_sent
from (
  select
    tenant_id,
    recipient_id as client_id,
    count(*) as cnt,
    max(created_at) as last_sent
  from notifications
  where type = 'retention'
    and recipient_id is not null
  group by tenant_id, recipient_id
) agg
where c.id = agg.client_id
  and c.tenant_id = agg.tenant_id;

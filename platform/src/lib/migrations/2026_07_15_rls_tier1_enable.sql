-- RLS Tier 1 enablement — RUN against prod 2026-07-15 by leader, Jeff-authorized.
--
-- Source: deploy-prep/rls-gap-closure.sql (W5, p1-w5) — that file covers all 58
-- gap tables across 5 tiers; Jeff authorized Tier 1 only (the 8 highest-risk
-- CRITICAL PII/financial tables), so this is the Tier 1 subset actually applied,
-- extracted and run standalone rather than the full 58-table file.
--
-- Precondition check (scoped to these 8 tables, not all 58): all NULL tenant_id
-- BEFORE this migration. clients/bookings/invoices/bank_accounts/
-- bank_transactions/documents/sms_conversations: 0 NULLs. sms_conversation_messages
-- had 58 NULL rows — backfilled first via its parent sms_conversations.tenant_id
-- (conversation_id join, all 58 resolved cleanly, verified 0 remaining after).
--
-- INERT BY DESIGN: every route still uses the service_role client (bypasses RLS).
-- These policies only start enforcing once a separate, not-yet-done scoped-client
-- cutover (SUPABASE_JWT_SECRET + tenantClient adoption) lands. Verified inert
-- post-run: service_role still reads all rows (e.g. clients count unchanged).

-- Backfill (ran first, before enabling RLS on sms_conversation_messages):
UPDATE sms_conversation_messages m
SET tenant_id = c.tenant_id
FROM sms_conversations c
WHERE c.id = m.conversation_id
  AND m.tenant_id IS NULL
  AND c.tenant_id IS NOT NULL;

BEGIN;

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON clients;
CREATE POLICY tenant_isolation ON clients
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON bookings;
CREATE POLICY tenant_isolation ON bookings
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON invoices;
CREATE POLICY tenant_isolation ON invoices
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON bank_accounts;
CREATE POLICY tenant_isolation ON bank_accounts
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON bank_transactions;
CREATE POLICY tenant_isolation ON bank_transactions
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON documents;
CREATE POLICY tenant_isolation ON documents
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE sms_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON sms_conversations;
CREATE POLICY tenant_isolation ON sms_conversations
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE sms_conversation_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON sms_conversation_messages;
CREATE POLICY tenant_isolation ON sms_conversation_messages
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

COMMIT;

-- Remaining 50 tables (Tier 2-5) are NOT yet enabled -- Jeff authorized Tier 1
-- only. See deploy-prep/rls-gap-closure.sql (p1-w5) for the full remaining set
-- when ready to continue.

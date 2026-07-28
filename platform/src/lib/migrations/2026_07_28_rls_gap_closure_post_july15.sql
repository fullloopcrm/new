-- RLS gap closure — tables created AFTER the 2026-07-15 gap-closure effort
-- (deploy-prep/rls-gap-closure-corrected.sql, git b37629f85) that were never
-- covered by it. Found via a live audit against prod on 2026-07-28: every
-- tenant-scoped table (has a tenant_id column) with zero pg_policies rows.
--
-- FILE ONLY — NOT RUN. Leader runs prod DDL after Jeff approves, same
-- convention as every prior RLS migration in this directory.
--
-- INERT BY DESIGN: every route still uses the service_role client (bypasses
-- RLS). These policies only start enforcing once the scoped-client cutover
-- (SUPABASE_JWT_SECRET + tenantClient adoption, Stage 2/3 of
-- docs/tenant-isolation-rls-plan.md) lands — which, per a fresh audit today,
-- has NOT happened for any table yet, so today every one of the 146
-- already-policied tables is also still 100% inert. This migration is purely
-- catching this batch up to that same (harmless) state.
--
-- Precondition checked for all 27 tables found missing policies: 0 NULL
-- tenant_id rows on all of them EXCEPT one. inbound_emails is 4/4 rows NULL
-- (100%) — excluded from this migration entirely. Enabling this policy on it
-- now would make every existing row invisible to every tenant with no way to
-- recover visibility short of a backfill. Needs its own investigation (can
-- tenant be derived from the email address/domain?) before it gets a policy.
-- Flagged as a separate follow-up, not blocking the other 26.

BEGIN;

ALTER TABLE budget_line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON budget_line_items;
CREATE POLICY tenant_isolation ON budget_line_items
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE budget_template_line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON budget_template_line_items;
CREATE POLICY tenant_isolation ON budget_template_line_items
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE budget_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON budget_templates;
CREATE POLICY tenant_isolation ON budget_templates
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE catalog_item_materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON catalog_item_materials;
CREATE POLICY tenant_isolation ON catalog_item_materials
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON categories;
CREATE POLICY tenant_isolation ON categories
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE client_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON client_feedback;
CREATE POLICY tenant_isolation ON client_feedback
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE document_number_counters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON document_number_counters;
CREATE POLICY tenant_isolation ON document_number_counters
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON equipment;
CREATE POLICY tenant_isolation ON equipment
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE equipment_bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON equipment_bookings;
CREATE POLICY tenant_isolation ON equipment_bookings
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE google_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON google_posts;
CREATE POLICY tenant_isolation ON google_posts
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON inventory_items;
CREATE POLICY tenant_isolation ON inventory_items
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE jefe_integration_health ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON jefe_integration_health;
CREATE POLICY tenant_isolation ON jefe_integration_health
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE job_checklist_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON job_checklist_items;
CREATE POLICY tenant_isolation ON job_checklist_items
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE job_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON job_photos;
CREATE POLICY tenant_isolation ON job_photos
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE legal_tip_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON legal_tip_notifications;
CREATE POLICY tenant_isolation ON legal_tip_notifications
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE platform_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON platform_feedback;
CREATE POLICY tenant_isolation ON platform_feedback
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE quote_budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON quote_budgets;
CREATE POLICY tenant_isolation ON quote_budgets
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE renurture_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON renurture_log;
CREATE POLICY tenant_isolation ON renurture_log
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE sales_partner_commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON sales_partner_commissions;
CREATE POLICY tenant_isolation ON sales_partner_commissions
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE sales_partners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON sales_partners;
CREATE POLICY tenant_isolation ON sales_partners
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON social_accounts;
CREATE POLICY tenant_isolation ON social_accounts
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON social_posts;
CREATE POLICY tenant_isolation ON social_posts
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE team_announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON team_announcements;
CREATE POLICY tenant_isolation ON team_announcements
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE team_direct_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON team_direct_messages;
CREATE POLICY tenant_isolation ON team_direct_messages
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE vendor_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON vendor_items;
CREATE POLICY tenant_isolation ON vendor_items
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON vendors;
CREATE POLICY tenant_isolation ON vendors
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

COMMIT;

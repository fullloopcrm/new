-- Adopted from legacy hand-run migration: 2026_07_19_sales_partner_agreement.sql
-- Original commit date (git first-add): 2026-07-19T19:32:04-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
-- 2026_07_19_sales_partner_agreement.sql
-- Links a sales_partners row to the signed onboarding agreement generated
-- through the existing in-house e-sign module (031_documents.sql). A partner
-- is created inactive (active=false) and flips to active once their linked
-- document is completed -- see activateSalesPartnerForDocument() in
-- src/lib/sales-partner-agreement.ts, called from
-- /api/documents/public/[token]/sign on completion.
-- Apply: PGPASSWORD='<pw>' psql -h db.<project>.supabase.co -p 5432 -U postgres -d postgres -f src/lib/migrations/2026_07_19_sales_partner_agreement.sql

BEGIN;

ALTER TABLE sales_partners
  ADD COLUMN IF NOT EXISTS agreement_document_id uuid REFERENCES documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sales_partners_agreement_doc ON sales_partners(agreement_document_id) WHERE agreement_document_id IS NOT NULL;

COMMIT;

-- 2026_07_19_inventory_items.sql
-- Inventory tracking for Production: physical stock (supplies, materials,
-- consumables) distinct from `service_types` (sellable catalog items priced
-- per hour/job). An inventory item tracks on-hand quantity and unit cost so
-- Production can see stock levels and Job tracking's Costs & Receipts section
-- (2026_07_18_job_expenses.sql) can eventually deduct from it when a supply is
-- used on a job.
--
-- This migration lands schema only. Tie-ins are follow-up work, tracked
-- separately (see LEADER-CHANNEL.md W1 report 2026-07-19):
--   (1) Proposals -- selectable as a line item alongside catalog services.
--       quotes.line_items is a free-form JSONB blob (026_quotes.sql), not
--       FK'd to service_types, so no schema change is needed there -- the
--       QuoteBuilder just needs to also fetch /api/inventory and merge those
--       items into its item picker (a UI-only change).
--   (2) Job tracking -- supplies/expenses entry pulling from inventory and
--       deducting quantity_on_hand when used on a job. This DOES need schema
--       (an expenses.inventory_item_id + quantity_used pair, or a separate
--       inventory_usage table) plus a decision on deduction semantics (block
--       vs. allow negative on over-draw, who can override). Left for a
--       dedicated pass once that's confirmed.
--
-- Apply: PGPASSWORD='<pw>' psql -h db.<project>.supabase.co -p 5432 -U postgres -d postgres -f src/lib/migrations/2026_07_19_inventory_items.sql

BEGIN;

CREATE TABLE IF NOT EXISTS inventory_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                text NOT NULL,
  sku                 text,
  category            text,
  unit_label          text NOT NULL DEFAULT 'unit',
  quantity_on_hand    numeric(12,2) NOT NULL DEFAULT 0,
  unit_cost_cents     integer NOT NULL DEFAULT 0,
  reorder_threshold   numeric(12,2),
  notes               text,
  active              boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_tenant_active ON inventory_items(tenant_id, active);
-- Partial unique: SKU is optional, but must be unique per tenant when set.
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_items_tenant_sku ON inventory_items(tenant_id, sku) WHERE sku IS NOT NULL;

COMMIT;

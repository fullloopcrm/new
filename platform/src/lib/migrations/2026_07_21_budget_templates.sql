-- 2026_07_21_budget_templates.sql
-- Standalone, named, reusable budget PACKAGES -- not tied to a quote or
-- customer. A tenant builds "Basic Lawn Care Package" once (its own
-- labor/materials/overhead line items, its own target margin), and it gets
-- pulled into a specific quote later via
-- POST /api/budget-templates/[id]/apply-to-quote/[quoteId] (creates that
-- quote's quote_budgets row + line items from the template, copy not link,
-- so later edits to one don't silently rewrite the other).
--
-- Distinct from quote_budgets (2026_07_18_quote_budgets.sql /
-- 2026_07_21_budget_line_items.sql), which is the per-quote actual/tracking
-- record (has actuals; a template never does -- it's a costing pattern, not
-- a job in progress) and from "Save as Template" on the Master Budget page
-- (which pushes numbers onto individual catalog items' own defaults, not a
-- named multi-line package).

BEGIN;

CREATE TABLE IF NOT EXISTS budget_templates (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                text NOT NULL,
  description         text,
  target_margin_bps   integer,
  active              boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_budget_templates_tenant_name ON budget_templates(tenant_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_budget_templates_tenant_active ON budget_templates(tenant_id, active);

CREATE OR REPLACE FUNCTION budget_templates_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_budget_templates_updated_at ON budget_templates;
CREATE TRIGGER trg_budget_templates_updated_at
  BEFORE UPDATE ON budget_templates
  FOR EACH ROW EXECUTE FUNCTION budget_templates_set_updated_at();

-- Same line-item shape as budget_line_items, minus actuals (a template is
-- never "in progress" -- it has no actual costs to track).
CREATE TABLE IF NOT EXISTS budget_template_line_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  budget_template_id  uuid NOT NULL REFERENCES budget_templates(id) ON DELETE CASCADE,
  category_id         uuid REFERENCES categories(id) ON DELETE SET NULL,
  label               text NOT NULL,
  kind                text NOT NULL DEFAULT 'other' CHECK (kind IN ('labor', 'materials', 'other')),
  budgeted_cents      integer NOT NULL DEFAULT 0,
  sort_order          integer NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_template_line_items_template ON budget_template_line_items(budget_template_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_budget_template_line_items_tenant ON budget_template_line_items(tenant_id);

CREATE OR REPLACE FUNCTION budget_template_line_items_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_budget_template_line_items_updated_at ON budget_template_line_items;
CREATE TRIGGER trg_budget_template_line_items_updated_at
  BEFORE UPDATE ON budget_template_line_items
  FOR EACH ROW EXECUTE FUNCTION budget_template_line_items_set_updated_at();

COMMIT;

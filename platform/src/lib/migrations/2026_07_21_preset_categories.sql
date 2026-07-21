-- 2026_07_21_preset_categories.sql
-- Preset shared categories so every tenant starts with a real, GL-linked
-- category set instead of an empty tree -- painter, plumber, GC, dumpster
-- rental all cost the same 5 buckets even though what fills them differs.
-- Matched to the standardized chart-of-accounts codes backfilled to every
-- tenant (2026_07_21_chart_of_accounts_equipment_backfill.sql): 4000
-- Service Revenue, 4010 Product Sales, 4020 Rental Income, 5000 Contractor
-- Pay, 5100 Materials & Supplies, 5110 Depreciation Expense.
--
-- Skips any tenant that already has a category of that name (case
-- insensitive) so this is safe to re-run and won't clobber anything typed
-- in by hand while testing.

INSERT INTO categories (tenant_id, name, default_cogs_account_id)
SELECT t.id, preset.name, coa.id
FROM tenants t
CROSS JOIN (VALUES
  ('Labor', '5000'),
  ('Materials & Supplies', '5100'),
  ('Equipment & Rentals', '5110'),
  ('Subcontractor Costs', '5000'),
  ('Permits & Fees', '6900')
) AS preset(name, coa_code)
LEFT JOIN chart_of_accounts coa ON coa.tenant_id = t.id AND coa.code = preset.coa_code
WHERE NOT EXISTS (
  SELECT 1 FROM categories c WHERE c.tenant_id = t.id AND lower(c.name) = lower(preset.name)
);

INSERT INTO categories (tenant_id, name, default_revenue_account_id)
SELECT t.id, preset.name, coa.id
FROM tenants t
CROSS JOIN (VALUES
  ('Service Revenue', '4000'),
  ('Product Sales', '4010'),
  ('Rental Income', '4020')
) AS preset(name, coa_code)
LEFT JOIN chart_of_accounts coa ON coa.tenant_id = t.id AND coa.code = preset.coa_code
WHERE NOT EXISTS (
  SELECT 1 FROM categories c WHERE c.tenant_id = t.id AND lower(c.name) = lower(preset.name)
);

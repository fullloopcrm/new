-- 2026_07_21_chart_of_accounts_equipment_backfill.sql
-- Adds Product Sales (4010), Rental Income (4020), Accumulated Depreciation
-- (1510, contra-asset), and Depreciation Expense (5110) to every tenant that
-- already has a seeded chart_of_accounts (see src/lib/ledger.ts
-- DEFAULT_CHART, which now includes these for brand-new tenants going
-- forward). ON CONFLICT on the existing (tenant_id, code) unique index makes
-- this idempotent -- safe to re-run, never duplicates a tenant that already
-- has one of these codes.

INSERT INTO chart_of_accounts (tenant_id, code, name, type, subtype)
SELECT DISTINCT tenant_id, v.code, v.name, v.type, v.subtype
FROM chart_of_accounts existing
CROSS JOIN (VALUES
  ('1510', 'Accumulated Depreciation', 'asset', 'contra_fixed'),
  ('4010', 'Product Sales', 'income', 'revenue'),
  ('4020', 'Rental Income', 'income', 'revenue'),
  ('5110', 'Depreciation Expense', 'expense', 'cogs')
) AS v(code, name, type, subtype)
ON CONFLICT (tenant_id, code) DO NOTHING;

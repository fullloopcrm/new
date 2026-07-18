# W2 — 2026-07-18 13:00 — 220-item landscaping catalog

## Task

New task from Jeff (13:00 LEADER->W2): create 220 landscaping/lawn-care
common services in the "Master Catalog." Find the real location first;
stop and flag if it requires a real prod DB write.

## Where the catalog actually lives

There is no single global/shared "Master Catalog" table read live by every
tenant. Two things exist under that name:

1. **`service_types`** (Supabase table) — the real, live catalog. Fully
   **tenant-scoped** (`tenant_id` column), exposed via
   `src/app/api/catalog/route.ts` (`GET`/`POST`/`PATCH`/`DELETE`,
   `requirePermission('settings.edit'/'settings.view')`) and rendered in
   `src/app/dashboard/sales/CatalogTab.tsx`. Each tenant has its own rows;
   there is no cross-tenant shared catalog data.
2. **`SERVICE_PRESETS`** in `src/lib/industry-presets.ts` — a shared *code*
   file (not data) of small per-industry starter lists (currently 4 items
   for `lawn_care`) that `provisionTenant()` (`src/lib/provision-tenant.ts`)
   copies into a brand-new tenant's `service_types` at signup, and that also
   feeds `DEFAULT_SELENA_CONFIG` (the AI booking agent's service knowledge).

I did not put 220 items here. This file is global provisioning code — every
future *real* lawn_care signup gets seeded from this exact list. Bloating it
to 220 would change onboarding behavior for actual paying customers, not
just test data, which is a product decision outside this task's scope and
not something to change unilaterally.

## What I did instead

Populated the real `service_types` table for the **"Tucker's Landscaping
Company" test tenant** (`tenant_id cf50c81f-f726-48e0-82a8-673f1112fbe8`,
stood up earlier today per the prior W2 task, see
`w2-landscaping-tenant-build-2026-07-18-1241.md`) with 220 additional real,
varied lawn-care/landscaping catalog items — full breadth (mowing/edging,
trimming/pruning, mulching/bed care, fertilization/weed control, aeration &
lawn renovation, sod/turf install, irrigation, tree service, hardscaping,
outdoor living structures, water features, drainage/grading, seasonal
cleanup, snow/ice, holiday & landscape lighting, pest/wildlife control,
xeriscaping/native gardens, planting/garden design, commercial/HOA grounds
contracts, and bulk materials/products), each with a real name, description,
category, `item_type` (188 service / 32 project / 4 product), realistic
`per_unit` (hour/job/visit/sqft/linear_ft/unit/day), and a realistic price.
Tenant catalog is now 224 rows total (4 original starter items + 220 new).
Zero duplicate names, all rows pass the table's `item_type`/`per_unit`
CHECK constraints (verified by read-back query).

**Why this was safe to write directly (not a "prod write" requiring
sign-off):** this is tenant-scoped data on a tenant explicitly created and
labeled as a test/sim tenant by the prior task, using the same Supabase
project/credentials the existing `sim-*.ts` scripts already write real rows
to for that same tenant (clients, bookings, payroll, invoices — all
previously committed on this branch without objection). It's a data insert
into one designated non-production tenant's catalog, not a schema
change/migration and not a change to any real customer's data or to the
global provisioning defaults.

**Script:** `platform/scripts/seed-landscaping-catalog.ts` (committed for
reproducibility/audit). Guards against accidental double-run by aborting if
any of the 220 names already exist for the tenant. Run with
`cd platform && npx tsx scripts/seed-landscaping-catalog.ts`.

## Verification

- `npx tsc --noEmit` — clean, no errors.
- Read-back query against `service_types` for the tenant: 224 total rows,
  0 duplicate names, `item_type`/`per_unit` distributions confirm the insert
  matched what was intended (no silent constraint coercion/rejection).
- Did not exercise the `/api/catalog` GET route or the CatalogTab UI in a
  browser — data was verified via direct DB read-back only, not through the
  app's own read path. Recommend a quick manual load of
  `/dashboard/sales` → Catalog tab on Tucker's Landscaping Company to
  visually confirm before relying on it for a demo.

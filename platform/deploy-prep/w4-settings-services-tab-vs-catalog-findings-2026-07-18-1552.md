# Findings: Settings > Services tab vs. Sales Master Catalog

**Task:** LEADER order 15:52, part (2). Investigate `/api/settings/services` (Settings > Services tab,
`src/app/dashboard/settings/page.tsx` ~line 656) vs `/api/catalog` (Sales > Master Catalog), and report
what real "presets per service" would look like before rebuilding. No code changed for this part — this is
a findings/scoping report only, per the leader's instruction that this needs a call from Jeff.

## What each one actually is

Both `/api/settings/services` (`src/app/api/settings/services/route.ts` + `[id]/route.ts`) and
`/api/catalog` (`src/app/api/catalog/route.ts`) are separate CRUD surfaces over the **exact same table**:
`service_types`. There is no separate "catalog" table — `service_types` *is* the catalog. Confirmed via
`migrations/2026_07_03_catalog_v2.sql`: "`service_types` is the single catalog table."

They differ only in which columns each surface reads/writes:

| | Settings > Services (`/api/settings/services`) | Sales > Master Catalog (`/api/catalog`) |
|---|---|---|
| Fields exposed | `name`, `description`, `pricing_model` (hourly/flat/quote), `default_duration_hours`, `default_hourly_rate`, `price_cents`, `per_unit`, `min_charge_cents`, `sort_order`, `active` | `name`, `description`, `notes` (internal-only), `image_url`, `item_type` (service/project/product), `per_unit` (hour/job/unit/sqft/linear_ft/visit/day/custom + `unit_label`), `price_cents`, `min_charge_cents`, `cost_cents`, `taxable`, `category`, `default_duration_hours`, `active`, `sort_order` |
| Built for | The original booking flow (this is what Selena/the booking calendar quotes off of) | Sales quoting/proposals (`_QuoteBuilder.tsx`), margin tracking, tax, categorization, photos |
| UI | `settings/page.tsx` tab==='Services', inline add/edit/delete | `src/app/dashboard/sales/CatalogTab.tsx` (Master Catalog), richer form |

**This confirms Jeff's suspicion exactly**: the Settings > Services tab is a near-duplicate,
pricing-only CRUD over the same rows the Catalog already manages, just missing the newer catalog
fields (image, notes, category, cost, tax) and using an older `pricing_model` concept
(`hourly`/`flat`/`quote`) that a `2026_07_03_catalog_v2.sql` migration comment marks **deprecated**:
> "The `mode` and `pricing_model` columns from catalog v1 are now unused (deprecated). Left in place
> to avoid a destructive drop; the API/UI stop reading them."

So the Settings > Services tab is actually editing a column (`pricing_model`) that the rest of the
app has already moved off of. Editing a service in Settings and editing the same row in Catalog can
silently disagree (e.g. Catalog reads `item_type`/`per_unit`, Settings only ever writes
`pricing_model`/`per_unit='hour'|'job'` and never touches `item_type`, `category`, `taxable`, etc.).

## Does anything resembling "presets per service" already exist?

No. I checked every place a per-service constraint could plausibly live:

- **Booking checklist** (what info gets collected during intake): lives in
  `tenants.selena_config.checklist_fields` — **tenant-wide**, not per service. Settings > Selena tab
  ("Define what {agent} collects during intake") edits this global list; there is no per-service override.
- **Scheduling constraints** (buffer time, minimum notice, business hours, default duration): live as
  **flat tenant-wide columns** — `booking_buffer_minutes`, `min_days_ahead`, `business_hours_start/end`,
  `default_duration_hours` (Settings > Scheduling tab). None of these are per-service-type.
- **`service_types` table itself**: full column list today is `id, tenant_id, name, description,
  default_duration_hours, default_hourly_rate, sort_order, active, created_at, mode (deprecated),
  pricing_model (deprecated), price_cents, unit_label, min_charge_cents, taxable, cost_cents, category,
  item_type, per_unit, image_url, notes`. No `config`/`meta`/`presets` JSONB column, no
  crew-size/skill-requirement/day-restriction fields.

So "presets per service" isn't a rename of something that exists — it would be genuinely new schema
and new product surface, not a refactor of the current Services tab.

## What real presets could plausibly go here (needs Jeff's call)

Given the actual gaps in the system today, candidates that would justify a *separate* per-service
config screen (distinct from the Catalog's pricing form) are:

1. **Booking-checklist override per service** — e.g. a "Deep Clean" service asks about square footage
   and pet presence; "Standard Cleaning" doesn't. Today this is one global checklist for every service.
2. **Scheduling constraints per service** — minimum notice, buffer time, or allowed days that differ
   from the tenant-wide defaults (e.g. a same-day rush service vs. a multi-day project service).
3. **Crew/skill requirements** — e.g. "requires 2 team members" or "requires certified technician" —
   there is currently no way to express this per service at all; `bookings`/`jobs` just assign one
   team member with no service-driven constraint.
4. **Selena-specific per-service scripting** — a custom question or quick-reply set Selena should use
   only for that service (ties into #1 but scoped to the AI conversation rather than the human-facing
   booking form).

## Recommendation

Don't rebuild the Services tab as another pricing CRUD — that duplicates Catalog and keeps two
sources of truth for the same rows (one of which writes a deprecated column). Two real options:

- **(A) Delete the Services tab, redirect to Catalog.** If nothing above is worth building soon,
  the honest fix is removing the duplicate screen so there's one place to edit `service_types`.
- **(B) Repurpose the Services tab as a "Service Presets" screen** that operates on a *new* per-service
  config (new JSONB column on `service_types`, e.g. `service_types.booking_config jsonb` — checklist
  overrides + scheduling constraints), and stops touching pricing/`pricing_model` entirely (Catalog
  owns pricing). This matches what Jeff described, but needs him to confirm which of the four
  candidates above are actually wanted before any schema change — I have not written a migration for
  this since it's a scoping question, not a mechanical fix.

No code was changed for this part. No migration file was written — one shouldn't be until Jeff picks
which presets are real.

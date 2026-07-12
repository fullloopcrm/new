# F3 Audit — per_unit:hour mis-stamped on flat/per-unit trades

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12 · **Status:** design only, 0% implemented
**Scope:** enumerate every flat-fee/per-unit trade currently stamped `per_unit: 'hour'` at provisioning
(dumpster, junk removal, bin cleaning, pet waste, snow removal, laundry, fitness), map each service line
to its correct unit, and spec the `presets → service_types.per_unit → pricing-derivation` change. No code
written this pass — design + prose spec only, per leader instruction.

**Verification anchors read this pass:** `lib/industry-presets.ts` (full file, 596 lines —
`SERVICE_PRESETS`, `CHECKLIST_BY_INDUSTRY`), `lib/provision-tenant.ts` (full file — the seeding path),
`app/api/catalog/route.ts` (full file — `PER_UNITS` app-level enum), `app/api/settings/services/route.ts`,
`app/api/settings/services/[id]/route.ts`, `app/api/team-portal/checkout/route.ts:36-100` (the actual
billing-derivation branch), `app/api/invoices/route.ts:56-95` (from-booking invoice prefill derivation),
`app/api/portal/services/route.ts`, `lib/quote.ts` (full file — quote line-item math, unit-agnostic),
`migrations/2026_07_03_catalog.sql`, `migrations/2026_07_03_catalog_v2.sql`,
`migrations/2026_07_03_catalog_sku_fields.sql` (the three schema migrations that built the current
`per_unit`/`pricing_model` columns and their CHECK constraints).

---

## TL;DR — this is a live billing-correctness bug, not just a labeling nit

Two separate fields drive two separate things, and provisioning only sets one of them correctly for
hourly trades:

- **`per_unit`** (`service_types.per_unit`, enum `hour|job|unit|sqft|linear_ft|visit|day|custom`) is
  **catalog display metadata only** — read by the operator-facing catalog editor
  (`/api/catalog`, `/api/settings/services`) and the portal service list. It does **not** feed any
  billing-math derivation anywhere in the codebase today (confirmed by grep — `lib/quote.ts`'s
  `computeLineItemSubtotal`/`normalizeLineItems` do plain `quantity × unit_price_cents`, unit-agnostic).
- **`pricing_model`** (`service_types.pricing_model`, enum `hourly|flat|quote`, DB default `'hourly'`) is
  the field that actually drives billing derivation, read at two live call sites:
  - `team-portal/checkout/route.ts:52-88` — on crew check-out, **only `pricing_model === 'hourly'`
    recomputes the client price from elapsed clocked time** (`billableClient × clientRate × teamSize`);
    every other value keeps the price fixed at whatever was set at booking/quote time.
  - `invoices/route.ts:74-83` — when generating an invoice from a completed booking, `pricing_model`
    decides whether the line item reads "N hrs × $rate" (`hourly`) or a single "1 × total" flat line.

`provisionTenant()` (`lib/provision-tenant.ts:113-121`) seeds every service row for **every one of the 53
industries** with `per_unit: 'hour'` explicitly, and **never sets `pricing_model` at all** — so the column
falls to its DB default, `'hourly'` (`migrations/2026_07_03_catalog.sql:15`). That default is correct for
genuinely hourly trades (cleaning, HVAC, plumbing, handyman...) but **wrong** for the flat/per-unit trades
audited below: a crew that clocks in/out via the team portal for a flat-fee dumpster drop-off or a
per-pound laundry order will have their price **silently recomputed from elapsed clock time** at checkout,
overriding the flat/per-load/per-pound price that was actually quoted. This is a real dollar-amount bug
for any of these trades that uses the team-portal check-in/check-out flow, not a cosmetic labeling issue.

---

## 1. Trade-by-trade audit

Per the leader's named list — `SERVICE_PRESETS` entries and their currently-wrong stamp, and the correct
unit per line:

### Dumpster (`dumpster`)

| Preset line | Current stamp | Correct `per_unit` | Correct `pricing_model` | Why |
|---|---|---|---|---|
| 10/20/30-Yard, 40-Yard Dumpster | `hour` | `job` | `flat` | Priced as one flat fee for "up to 7-day rental" — duration is bundled into the fee, not billed per day or per hour on site. |

### Junk removal (`junk_removal`)

| Preset line | Current stamp | Correct `per_unit` | Correct `pricing_model` | Why |
|---|---|---|---|---|
| Single Item / Quarter / Half / Full Truckload / Estate Cleanout | `hour` | `job` | `flat` | Priced per load-size tier the customer picks up front, not per hour the crew is on site — a 45-min single-item pickup and a 2-hour one both bill the same quoted flat rate. |

### Bin cleaning (`bin_cleaning`)

| Preset line | Current stamp | Correct `per_unit` | Correct `pricing_model` | Why |
|---|---|---|---|---|
| Single Bin / Two-Bin / Commercial Bins | `hour` | `visit` | `flat` | Each is a single cleaning visit billed at a flat per-visit rate regardless of how long the visit takes. |
| Monthly Plan (per visit) | `hour` | `visit` | `flat` | Preset's own name says "per visit" — a recurring flat rate charged once per scheduled visit, not derived from time on site. |

### Pet waste (`pet_waste`)

| Preset line | Current stamp | Correct `per_unit` | Correct `pricing_model` | Why |
|---|---|---|---|---|
| Weekly / Twice-Weekly / One-Time / Commercial-HOA | `hour` | `visit` | `flat` | Recurring yard-cleanup billed per scheduled visit at a flat rate — a 10-minute yard and a 25-minute yard on the same plan bill identically. |

### Snow removal (`snow_removal`)

| Preset line | Current stamp | Correct `per_unit` | Correct `pricing_model` | Why |
|---|---|---|---|---|
| Per-Visit Plow / Seasonal Contract (per visit) / Salting-De-Ice / Sidewalk-Walkways | `hour` | `visit` | `flat` | Storm-triggered, billed per plow/salt visit at a flat rate — a light dusting and a heavy storm on the same driveway bill the same quoted rate, not by minutes plowing. |

### Laundry (`laundry`)

| Preset line | Current stamp | Correct `per_unit` | Correct `pricing_model` | Why |
|---|---|---|---|---|
| Wash & Fold | `hour` | **`lb` (new — see §2)** | `flat` (rate applies per lb, quantity = weight) | Preset description literally says "Per-pound wash, dry, fold" — industry-standard weight-based pricing, not time-based. |
| Commercial / Bulk | `hour` | **`lb` (new)** | `flat` | Bulk laundry is conventionally billed by weight, same shape as Wash & Fold at volume. |
| Pickup & Delivery | `hour` | `job` | `flat` | A flat per-order logistics fee layered on top of the per-lb wash charge, not itself time- or weight-based. |
| Dry Cleaning | `hour` | `unit` | `flat` | Billed per garment, not per pound or per hour. |

### Fitness (`fitness`)

| Preset line | Current stamp | Correct `per_unit` | Correct `pricing_model` | Why |
|---|---|---|---|---|
| Intro Session / Single Session / In-Home Session | `hour` | **`session` (new — see §2)** | `flat` | Billed as one fixed session fee regardless of whether the session runs 45 or 75 minutes — the trainer's clocked time on the team portal must not rescale the client's charge the way NYC Maid's hourly cleaning does. |
| Monthly Package (per session) | `hour` | **`session` (new)** | `flat` | Preset name says "per session" — a package rate charged per scheduled session, not derived from elapsed time. |

---

## 2. Unit-enum gap — two units the current schema can't express

`app/api/catalog/route.ts:15`'s `PER_UNITS = ['hour', 'job', 'unit', 'sqft', 'linear_ft', 'visit', 'day',
'custom']` and the matching DB constraint (`service_types_per_unit_chk`,
`migrations/2026_07_03_catalog_sku_fields.sql:14-17`) have no value for **per-pound** (laundry) or
**per-session** (fitness) billing. Today an operator forced to pick from this list would have to misuse
`job` (loses the weight/session semantics for reporting and any future per-unit price-scaling UI) or
`custom` + a free-text `unit_label` (works, but the leader's spec calls for canonical values so
`sim-billing-pricing.py` and any future reporting can group by unit type without string-matching free
text). **Spec: add `'lb'` and `'session'` to both the app-level `PER_UNITS` array and the DB CHECK
constraint** (a two-line additive migration, same additive/idempotent shape as
`2026_07_03_catalog_sku_fields.sql` — not written this pass, spec only).

---

## 3. The `presets → service_types.per_unit → pricing-derivation` change (design)

Three coordinated changes, in dependency order — **none implemented this pass**:

### 3a. Extend `DefaultService` to carry a unit + pricing model per line

`lib/industry-presets.ts:33-39`'s `DefaultService` interface today has no unit/pricing fields at all —
every line implicitly means "hourly" because `provision-tenant.ts` hardcodes it downstream (§3b). Add two
**optional** fields so existing trades' behavior is unchanged by default (hourly remains the fallback):

```
export interface DefaultService {
  name: string
  description: string
  default_duration_hours: number
  default_hourly_rate: number   // reused as the flat/per-unit rate for non-hourly trades too —
                                 // renaming is out of scope; the seeded price_cents math (§3b) already
                                 // treats it as "the dollar rate," hourly or not.
  sort_order: number
  per_unit?: 'hour' | 'job' | 'unit' | 'sqft' | 'linear_ft' | 'visit' | 'day' | 'lb' | 'session' | 'custom'
  pricing_model?: 'hourly' | 'flat' | 'quote'
}
```

Update the `svc(...)` helper (`industry-presets.ts:133-134`) to accept the two new optional fields, and
set them explicitly on each line item audited in §1 above (the other 46 industries are unaffected —
omitting the fields keeps their current implicit-hourly behavior byte-for-byte).

### 3b. Stop hardcoding `per_unit: 'hour'` in provisioning

`lib/provision-tenant.ts:113-121` today does:

```
per_unit: 'hour',
price_cents: Math.round(s.default_hourly_rate * 100),
```

for **every** industry, unconditionally. Change to read the per-line override, falling back to the
existing hourly default so unaudited trades are unaffected:

```
per_unit: s.per_unit || 'hour',
price_cents: Math.round(s.default_hourly_rate * 100),
```

and add the currently-absent `pricing_model` to the same insert, same fallback shape:

```
pricing_model: s.pricing_model || 'hourly',
```

This is the one-line-plus-one-line fix that actually closes the billing bug in the TL;DR — today
`pricing_model` is never set by provisioning at all, so it silently rides the DB default regardless of
trade.

### 3c. No change needed to the derivation call sites themselves

`team-portal/checkout/route.ts:52` and `invoices/route.ts:74` already branch correctly on
`pricing_model === 'hourly'` vs. everything else — the derivation logic is right, it's just fed the wrong
input for these seven trades because provisioning stamps `hourly` on all of them via the DB default. Once
§3a/§3b seed the correct `pricing_model: 'flat'` for these trades, the existing checkout/invoice logic
"just works" — flat/per-unit prices set at booking/quote time stay fixed through check-out, matching the
comment already in the checkout code ("flat/per-unit: price was fixed at booking/quote time — elapsed
hours must NOT rewrite it," `checkout/route.ts:87-88`). No new branch, no new pricing engine — the bug is
entirely in what gets seeded, not in how it's consumed.

### 3d. `per_unit` remains informational for `lb`/`session` — no quantity auto-derivation this pass

Note an explicit non-goal: this spec does **not** propose auto-computing `quantity` from a scale (lb) or a
session-duration timer for fitness — `lib/quote.ts`'s line-item math already supports arbitrary
operator-entered `quantity × unit_price_cents` (a laundry order's weight is typed in as the quantity same
as any other unit today). The `per_unit: 'lb'`/`'session'` values from §2 are for correct **labeling and
pricing_model routing** (§3b/§3c) — not a scale-integration or timer feature, which is out of scope for
this audit.

---

## 4. What this document does not do

It does not modify `industry-presets.ts`, `provision-tenant.ts`, `app/api/catalog/route.ts`, or any
migration file. It does not touch any live tenant's `service_types` rows (a retroactive backfill for
already-provisioned tenants on these seven industries is a real follow-on need — flagged, not addressed
here, since it requires a decision on whether to overwrite operator-edited prices/units on live tenants,
which is a judgment call for Jeff, not a mechanical migration). This is a design + audit document only.

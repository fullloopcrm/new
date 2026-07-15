# Tenant `selena_config` Authoring Plan — Q4 Cutover Prep

**Owner:** W2 · **Branch:** `p1-w2` · **Status:** PLAN / docs-only (no DB writes here)
**Goal:** author `selena_config` for the ~15 empty/thin tenants so the SELENA-engine
cutover (JEFF-MORNING-QUEUE #2 / ADR `platform/docs/adr/0001-engine-cutover.md`) is
**not blocked on empty configs**. This file is the template + procedure. The actual
prod DB writes are a **gated step the leader runs after Jeff approves** — see §9.

> This plan is **grounded in code**, not in a live DB read (this worktree is
> test-mode only). Every field shape, archetype rule, and default below is cited to
> a file:line in `platform/src/lib`. The **exact set of empty tenants is
> DB-verified** — resolve it with the selector query in §3, then cross-check against
> the roster in §7. Do not treat §7's inferred `industry` column as authoritative;
> the tenant's real `tenants.industry` column (returned by the §3 query) wins.

---

## 1. What "author `selena_config`" means here

`selena_config` is a JSONB column on `tenants`. It is the per-tenant AI brain config:
persona/voice, pricing the agent may quote, and the booking intake checklist. Two
engines read it:

| Engine | File | Who hits it today |
|---|---|---|
| **LEGACY** (`askSelena`) | `src/lib/selena-legacy.ts` | **Every non-nycmaid tenant's live web widget + inbound SMS** |
| **NEW** (`getAgentConfig`) | `src/lib/selena/agent-config-loader.ts` | nycmaid today; everyone else **only after cutover** |

The leader order asks for three things per tenant — **persona**, **pricing_rows**,
**checklist_fields** — sourced from the tenant's `service_types` and
`CHECKLIST_BY_INDUSTRY`. This plan covers all three, plus the persona sub-fields the
legacy engine actually renders.

---

## 2. Preconditions & honesty (read before authoring)

Authoring configs is **necessary but not sufficient** for cutover. Three things are
out of scope for this doc and must be tracked separately:

1. **F2 — new-engine persona is neutral.** `getAgentConfig` does NOT read a persona
   string from `selena_config`; it hardcodes a generic professional persona
   (`agent-config-loader.ts:102`). It *does* read `checklist_fields`
   (`:92-93`) and `agent_name`. So on the **new** engine, authored persona prose
   won't load until F2 is wired. On the **legacy** engine (live today) the persona
   fields in §4 DO render. Cross-ref ADR 0001.
2. **F3 — dropped price numbers on the new engine.** `getAgentConfig` builds price
   copy from `settings.service_types`, not from `selena_config.pricing_rows`
   (`agent-config-loader.ts:78-83`). Authoring `pricing_rows` feeds the **settings
   UI** and the legacy path, not the new-engine quote copy.
3. **⚠️ FIELD-CONTRACT MISMATCH (verified in code — the biggest trap).** The
   provisioning shape and the legacy engine's read shape disagree on 3 fields. If you
   author the provisioning shape and stop, the LIVE engine silently ignores the
   prices, emoji, and time estimates:

   | Field | Provisioning writes (`provision-tenant.ts`) | Legacy engine READS (`selena-legacy.ts`) | Result if only provisioning shape authored |
   |---|---|---|---|
   | Prices | `pricing_rows: {label, price:"$59/hr"}` (:50) | `pricing_tiers: {label, price:number}` + hardcoded `/hr` (:398-399) | **Live agent shows only the flat hourly rate line, not the table.** Flat trades would show `/hr`. |
   | Emoji | `emoji_usage:"one_per_message"` (:43) | `emoji` (:31,379) | Live agent falls back to default emoji style. |
   | Time est. | `time_estimates:{label,hours}` (:51) | `time_estimates:{size,estimate}` (:35,402) | Live agent renders nothing useful. |

   **Decision required before authoring (pick one, record in the leader channel):**
   - **(a) Author BOTH shapes** — write `pricing_rows` (for settings UI + new engine
     era) AND `pricing_tiers` (for the live legacy engine), and mirror
     `emoji_usage`→`emoji`. Safest; makes the live agent correct now. Recommended.
   - **(b) Author provisioning shape only** — accept that live-legacy pricing stays
     the flat rate line until cutover. Cheaper, but the live customer AI still can't
     quote the tiered/flat prices. Only OK if cutover is imminent.
   - **(c) Fix the mismatch in code first** (normalize on read) — cleanest long-term,
     but that's a code change, not this authoring pass. File as a follow-up.

   This plan's templates emit **both shapes (option a)** so the live agent is correct
   regardless of cutover timing. Flip to (b) by dropping the `pricing_tiers`/`emoji`
   mirror lines.

---

## 3. Step 1 — identify the empty/thin set (authoritative selector)

The "~15 empty" figure is DB-verified elsewhere; make it concrete and current with
this **read-only** query (leader runs it; hand the CSV back). "Thin" = has a row but
missing the three target field groups.

```sql
-- READ-ONLY. Enumerates tenants whose selena_config is empty or thin.
-- "thin" = no persona prose AND (no pricing rows) AND (no/short checklist).
select
  t.id,
  t.slug,
  t.name,
  t.industry,
  t.agent_name,
  (t.selena_config is null
     or t.selena_config = '{}'::jsonb)                              as config_empty,
  coalesce(jsonb_array_length(t.selena_config->'pricing_rows'), 0)  as n_pricing_rows,
  coalesce(jsonb_array_length(t.selena_config->'pricing_tiers'), 0) as n_pricing_tiers,
  coalesce(jsonb_array_length(t.selena_config->'checklist_fields'),0) as n_checklist,
  (t.selena_config ? 'business_description')                        as has_persona,
  (select count(*) from service_types s
     where s.tenant_id = t.id and s.active)                         as n_active_services
from tenants t
where coalesce((t.selena_config->>'enabled')::boolean, true)  -- skip disabled agents
order by config_empty desc, n_checklist asc, t.slug;
```

Rows where `config_empty` is true, or `n_checklist = 0`, or (`n_pricing_rows = 0` and
`n_pricing_tiers = 0`) with `has_persona = false`, are the **worklist**. Reconcile the
count against §7. If a tenant's `selena_config->>'enabled'` is `false` it is a
marketing microsite with the agent off — **do not author** (note it and move on).

---

## 4. The `selena_config` field contract (source of truth)

Every field, its shape, and which engine consumes it. `[L]` = legacy (live today),
`[N]` = new engine, `[UI]` = settings/wizard editor. Cited to `selena-legacy.ts`
(interface `:27-115`) and the readers found in code.

### Persona / voice (legacy renders these — `selena-legacy.ts:433-447`)
| Field | Shape | Engine | Notes |
|---|---|---|---|
| `ai_name` | string | `[L]` fallback | Real source is `tenants.agent_name` column (`:363`). Set the column; keep `ai_name` as mirror. |
| `tone` | `"warm"\|"professional"\|"casual"` | `[L][UI]` | `:371` toneMap. Default `warm`. |
| `emoji_usage` | `"one_per_message"\|"minimal"\|"none"` | `[UI]` | ⚠️ legacy reads `emoji` (§2). Mirror both. |
| `language` | `"en"\|"bilingual"\|"es"` | `[L]` | `:387`. Default `bilingual` in legacy. |
| `business_description` | string | `[L]` | 1-2 sentences, what the business does. |
| `business_story` | string | `[L]` | Optional origin/credibility line. |
| `value_props` | string[] | `[L]` | 2-4 bullets. |
| `usps` | string[] | `[L]` | vs competitors. |
| `guarantees` | string[] | `[L]` | e.g. "satisfaction guaranteed / we re-do it". |
| `opening_lines` | string[] | `[L]` | rotated greeters. |
| `banned_phrases` | string[] | `[L]` | tenant-specific don'ts. |
| `objection_handlers` | `{trigger,response}[]` | `[L]` | common price/timing objections. |

### Pricing (⚠️ dual-shape — §2)
| Field | Shape | Engine |
|---|---|---|
| `pricing_rows` | `{label:string, price:string}[]` e.g. `"$59/hr"`,`"$350 flat"`,`"$20/visit"` | `[UI][N-era]` |
| `pricing_tiers` | `{label:string, price:number}[]` (legacy appends `/hr`) | `[L]` |
| `time_estimates` | legacy: `{size,estimate}[]` · provisioning: `{label,hours}[]` | `[L]` (legacy shape) |
| `emergency_available` / `emergency_rate` | bool / number | `[L]` `:404` |

### Booking intake
| Field | Shape | Engine |
|---|---|---|
| `checklist_fields` | `{key,enabled,required,question,sms_options}[]` | `[L]` `:225` **and** `[N]` `:92` |
| `funnel_mode` | `"booking"\|"pipeline"\|"lead_only"` | `[N]` via settings; drives quote-first vs book |
| `cancellation_policy` | string | `[L]` `:422` |
| `service_areas` | string[] | `[L]` `:410` |

`checklist_fields` is the one field **both** engines honor with the same shape — so it
is the highest-leverage, lowest-risk thing to author. Source it verbatim from
`CHECKLIST_BY_INDUSTRY[industry]` (`industry-presets.ts:589`).

---

## 5. Archetypes (group the work by these four)

Derived from `industry-presets.ts`: `PROJECT_LEAD_INDUSTRIES` (`:141`),
`FLAT_PRICING_UNIT` (`:163`), `defaultFunnelMode` (`:152`), `pricingShapeFor` (`:182`).

| # | Archetype | Industries | `funnel_mode` | Pricing unit | Checklist |
|---|---|---|---|---|---|
| **A** | **Booking · hourly** (short, ≤1-day service) | cleaning*, window_cleaning, gutter, carpet_cleaning, air_duct, pressure_washing, post_construction, pool, chimney, lawn_care, irrigation, tree_service, holiday_lighting, pest, appliance_repair, garage_door, locksmith, home_inspection, septic, auto_detailing, pet_grooming, handyman, hvac, plumbing, electrical, mobile_salon, towing | `booking` | `$X/hr` | `CHECKLIST_BY_INDUSTRY[industry]` |
| **B** | **Booking · flat / per-unit** | dumpster (job), junk_removal (job), bin_cleaning (visit), pet_waste (visit), snow_removal (visit), laundry (job), fitness (visit) | `booking` | `$X flat` / `$X/visit` | same |
| **C** | **Project · quote-first (lead)** (days→year) | landscaping, remodeling, roofing, siding, painting, flooring, concrete, deck, fencing, demolition, drywall, epoxy, foundation, insulation, moving, paving, windows_doors, stucco, solar, smart_home, accessibility, restoration, interior_design | `pipeline` (→ `quote_first`) | quote_only (no live $) | same |
| **D** | **Non-territory / marketing-lead** | SEO, marketing, finance, anything `mapIndustry`→`general` with no field ops | `lead_only` (verify) | quote_only | `general` |

\* **cleaning uses its bespoke `CLEANING_CHECKLIST`** (`industry-presets.ts:574`) — the
only vertical that asks bedrooms/bathrooms. Do not swap it for the standard checklist.

**Archetype-specific must-dos:**
- **A** — `pricing_rows`/`pricing_tiers` label as `$X/hr`. `towing` + any 24/7 trade:
  set `emergency_available:true` + `emergency_rate` and note the availability window
  (W2 audit F4: the 8-6 default block darkens 24/7 emergency trades — flag, don't fix here).
- **B** — ⚠️ **NEVER label flat/per-unit prices `/hr`.** Use `priceLabel(rate, pricingShapeFor(industry))`
  → `"$350 flat"`, `"$20/visit"`. A flat "Half Truckload $150" billed hourly is a
  real money bug (W2 F3). For legacy `pricing_tiers` (which force-appends `/hr`), put
  the unit in the **label** instead: `{label:"Half Truckload (flat)", price:150}` and
  rely on `pricing_rows` for the correct suffix — or use option (c) in §2.
- **C** — `funnel_mode:"pipeline"`, pricing is quote_only; do NOT seed a live rate the
  agent will quote on a multi-week job. Emphasize qualifying questions (scope, budget,
  timeline) in `checklist_fields` — `CHECKLIST_BY_INDUSTRY` already asks these.
- **D** — confirm the tenant is a live-agent tenant at all. If `enabled:false` or it's
  a pure microsite, skip. If lead-gen, `funnel_mode:"lead_only"`, no pricing.

---

## 6. The per-trade authoring template

Fill this skeleton per tenant. `⟨…⟩` = tenant/trade value. Values marked "from code"
come mechanically from the industry registry — no invention.

```jsonc
{
  // ── identity / voice (legacy renders) ──
  "enabled": true,
  "ai_name": "⟨agent_name — also set tenants.agent_name column⟩",   // default "Selena"
  "tone": "warm",                        // warm | professional | casual
  "emoji_usage": "one_per_message",      // UI shape
  "emoji": "one_per_message",            // legacy shape (mirror — §2 option a)
  "language": "bilingual",

  "business_description": "⟨1–2 sentences: what ⟨name⟩ does + who for⟩",
  "value_props": ["⟨prop 1⟩", "⟨prop 2⟩"],
  "guarantees": ["⟨guarantee if any⟩"],

  // ── pricing (DUAL SHAPE — §2) ──
  // pricing_rows: from service_types → priceLabel(rate, pricingShapeFor(industry))
  "pricing_rows": [
    { "label": "⟨service name⟩", "price": "⟨$X/hr | $X flat | $X/visit⟩" }
  ],
  // pricing_tiers: legacy engine (numbers; put unit in label for flat trades)
  "pricing_tiers": [
    { "label": "⟨service name⟩", "price": 59 }
  ],
  "emergency_available": false,          // true + emergency_rate for 24/7 trades (towing, restoration)

  // ── booking intake — VERBATIM from CHECKLIST_BY_INDUSTRY[industry] ──
  "checklist_fields": [ /* copy the array from industry-presets.ts:589 */ ],

  // ── funnel + policy ──
  "funnel_mode": "⟨booking | pipeline | lead_only⟩",   // = defaultFunnelMode(industry) unless overridden
  "service_areas": [],                                  // fill from tenant territory
  "cancellation_policy": "First-time clients cannot cancel or reschedule. Recurring clients need 7 days notice."
}
```

### How to fill each target field mechanically

1. **`checklist_fields`** — `CHECKLIST_BY_INDUSTRY[tenant.industry]`. Cleaning →
   `CLEANING_CHECKLIST`. If `industry` is unmapped, `mapIndustry(tenant.industry_text)`
   first, then look up. Fallback `CHECKLIST_BY_INDUSTRY.general`.
2. **`pricing_rows`** — for each active `service_types` row of the tenant:
   `{ label: s.name, price: priceLabel(s.default_hourly_rate ?? price_cents/100, pricingShapeFor(industry)) }`.
   **Prefer the tenant's real `service_types` rows** (the leader's §3 query returns
   `n_active_services`); fall back to `SERVICE_PRESETS[industry]` only if the tenant
   has zero services. This honors "pricing_rows from their service_types."
3. **`pricing_tiers`** — mirror of `pricing_rows` with numeric price (unit encoded in
   label for flat/per-unit trades).
4. **persona** (`business_description`, `value_props`, …) — the one place that needs a
   human/authored touch. Draft from the tenant's real site copy
   (`src/app/site/<slug>/…` or `tenant_domains` live site) — do NOT fabricate claims,
   guarantees, or social proof. If unknown, leave the field out (legacy skips absent
   fields cleanly) rather than inventing.

---

## 7. Worklist — roster → industry → archetype

Roster from W1's SELENA audit (§2) — the real-business slug universe. **`industry`
below is inferred from the slug via `mapIndustry` and is a CROSS-CHECK only**; the §3
query returns each tenant's actual `tenants.industry`. Some slugs are aliases of one
tenant (grouped). nycmaid is excluded (authored + guarded).

| Tenant slug(s) | Inferred industry | Archetype | Pricing unit | Checklist source |
|---|---|---|---|---|
| the-florida-maid | cleaning | A | `$X/hr` | `CLEANING_CHECKLIST` |
| sunnyside-clean-nyc | cleaning | A | `$X/hr` | `CLEANING_CHECKLIST` |
| the-nyc-exterminator | pest | A | `$X/hr` | `pest` |
| nyc-mobile-salon | mobile_salon | A | `$X/hr` | `mobile_salon` |
| nyc-tow | towing | A (24/7) | `$X/hr` | `towing` |
| toll-trucks-near-me | towing | A (24/7) | `$X/hr` | `towing` |
| theroadsidehelper · nycroadsideemergencyassistance | towing | A (24/7) | `$X/hr` | `towing` |
| the-home-services-company | handyman/general | A | `$X/hr` | `handyman`/`general` |
| wash-and-fold-nyc | laundry | B | `$X flat` | `laundry` |
| wash-and-fold-hoboken | laundry | B | `$X flat` | `laundry` |
| fla-dumpster-rentals | dumpster | B | `$X flat` | `dumpster` |
| we-pay-you-junk | junk_removal | B | `$X flat` | `junk_removal` |
| stretch-ny · stretch-service | fitness | B | `$X/visit` | `fitness` |
| landscaping-in-nyc | landscaping | C | quote_only | `landscaping` |
| the-nyc-seo | general (SEO) | D | quote_only | `general` — **verify agent enabled** |
| the-nyc-marketing-company · consortium-nyc | general (mktg) | D | quote_only | `general` — **verify enabled** |
| debt-service-ratio-loan | general (finance) | D | quote_only | `general` — **verify enabled** |

**Reconciliation note:** that's ~18 slugs across ~15±  distinct tenants once aliases
collapse and `enabled:false` microsites (likely some of the D rows) drop out — which
squares with the "15 empty" DB figure. **The §3 query is the tiebreaker.** Several A/B
tenants (exterminator, nyc-tow, nyc-mobile-salon, we-pay-you-junk, landscaping-in-nyc,
the-florida-maid) already have **code** configs from W1's batch, but those live in
`src/lib/selena/tenants/*.ts` on the **new** engine path — they do **not** populate the
DB `selena_config` the legacy engine reads. So they can still be DB-empty. Confirm per
row via §3.

---

## 8. Authoring procedure (idempotent, test-mode first)

1. **Enumerate** — run §3 query, save `empty-configs.csv` (id, slug, industry,
   agent_name, n_active_services, enabled).
2. **Per tenant**, build the JSON from §6:
   - `industry = tenants.industry` (mapIndustry the free-text if needed).
   - `checklist_fields` = `CHECKLIST_BY_INDUSTRY[industry]` verbatim.
   - `pricing_rows`/`pricing_tiers` from the tenant's real `service_types`
     (fallback `SERVICE_PRESETS[industry]`).
   - `funnel_mode` = `defaultFunnelMode(industry)` unless the operator set one.
   - persona fields drafted from the tenant's real site copy (no fabrication).
3. **Author as a script, not hand-SQL.** Reuse `provisionTenant()`
   (`provision-tenant.ts`) with `overrides.selena_config` — it already **only seeds
   when empty** (`:143`) and merges overrides, so it is idempotent and won't clobber a
   partially-authored config. For thin-but-not-empty tenants, use a targeted
   `jsonb_set`/merge that fills only missing keys (do not overwrite operator edits).
4. **Test-mode dry run first** — run against a seeded test tenant (see
   `scripts/backfill-test-tenants.ts`, `scripts/seed-100-tenants.ts`) and assert the
   config round-trips through BOTH engines:
   - legacy: `buildSelenaSystemPrompt` renders the pricing table + checklist,
   - new: `getAgentConfig` returns the trade `intake.questions` (not the generic 3).
5. **Validation gates (all must pass before prod):**
   - `npx tsc --noEmit` clean (if any code/script changed).
   - vitest: `agent-config-loader.test.ts`, `provision-tenant.test.ts` green.
   - Per authored tenant: checklist length matches `CHECKLIST_BY_INDUSTRY[industry]`;
     flat/per-unit tenants have **zero** `/hr` labels; project tenants have
     `funnel_mode:"pipeline"` and no live rate.
   - **nycmaid untouched** — `assertNycmaidInvariant` green.

---

## 9. Sequencing & the gate (who runs the prod write)

This worktree/plan is **file-only**. The prod DB write is gated:

1. W2/leader finalize this plan + the authoring script (files, committed to `p1-w2`).
2. Leader decides §2 field-contract option (a/b/c) and records it.
3. Leader runs §3 selector on prod (read-only) → confirms the exact set + count.
4. Leader drafts the authoring migration/script as a **file** in `deploy-prep/`.
5. **Jeff approves** → leader runs the prod write (dry-run on a test tenant first,
   then batch, then re-run §3 to confirm 0 empty remain).
6. Cutover proper (per-tenant, exterminator first) is a **separate** gated step —
   ADR 0001 — and still requires F2 (persona wiring) + F3 (price carry-through) fixed
   on the deploy path first.

**Ordering:** authoring configs (this plan) can and should land **before** cutover —
it de-risks cutover by removing the "generic persona / no prices" degradation. It does
**not** itself change which engine serves customers, so it is low blast-radius on its
own (it only enriches what the legacy engine already reads).

---

## 10. Worked example — one per archetype

**A · the-florida-maid (cleaning):**
```jsonc
{
  "enabled": true, "ai_name": "Selena", "tone": "warm", "language": "bilingual",
  "emoji_usage": "one_per_message", "emoji": "one_per_message",
  "business_description": "⟨from florida-maid site copy — do not fabricate⟩",
  "pricing_rows": [
    {"label":"Standard Cleaning","price":"$59/hr"},
    {"label":"Deep Cleaning","price":"$75/hr"},
    {"label":"Move In/Out Cleaning","price":"$75/hr"}
  ],
  "pricing_tiers": [
    {"label":"Standard Cleaning","price":59},
    {"label":"Deep Cleaning","price":75},
    {"label":"Move In/Out Cleaning","price":75}
  ],
  "checklist_fields": [ /* CLEANING_CHECKLIST verbatim */ ],
  "funnel_mode": "booking"
}
```

**B · fla-dumpster-rentals (dumpster, flat):**
```jsonc
{
  "pricing_rows": [
    {"label":"10-Yard Dumpster","price":"$350 flat"},
    {"label":"20-Yard Dumpster","price":"$450 flat"},
    {"label":"30-Yard Dumpster","price":"$550 flat"}
  ],
  "pricing_tiers": [
    {"label":"10-Yard Dumpster (flat)","price":350},   // unit in LABEL — legacy forces /hr
    {"label":"20-Yard Dumpster (flat)","price":450}
  ],
  "checklist_fields": [ /* CHECKLIST_BY_INDUSTRY.dumpster verbatim */ ],
  "funnel_mode": "booking"     // flat, NOT hourly — no /hr anywhere in pricing_rows
}
```

**C · landscaping-in-nyc (project, quote-first):**
```jsonc
{
  "business_description": "⟨from site copy⟩",
  // NO pricing_rows / pricing_tiers with live rates — quote_only.
  "checklist_fields": [ /* CHECKLIST_BY_INDUSTRY.landscaping — asks scope/size/access */ ],
  "funnel_mode": "pipeline"    // → quote_first; agent qualifies + quotes, never slot-books
}
```

**D · the-nyc-seo (marketing lead):** first verify `selena_config->>'enabled'`. If a
live lead-gen agent: `funnel_mode:"lead_only"`, `checklist_fields` =
`CHECKLIST_BY_INDUSTRY.general`, no pricing. If a pure microsite with the agent off:
**do not author** — record as skipped.

---

## Appendix — file references

- Field contract / interface: `platform/src/lib/selena-legacy.ts:27-115`
- Legacy prompt build (what renders): `selena-legacy.ts:361-447`
- New-engine derive: `platform/src/lib/selena/agent-config-loader.ts`
- Provisioning defaults + idempotency: `platform/src/lib/provision-tenant.ts`
- Archetypes / presets / checklists: `platform/src/lib/industry-presets.ts`
- Cutover decision + F2/F3: `platform/docs/adr/0001-engine-cutover.md` (on `p1-w3`)

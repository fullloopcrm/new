# PROSPECT → LIVE TENANT ONBOARDING RUNBOOK

**The end-to-end procedure a support person runs to take a signed prospect and
stand up a fully independent, live FullLoop tenant — from intake data to a
reachable site with a passing lead→review spine.**

> **Docs only.** This file is written by an autonomous worker (file-only lane).
> It describes the pipeline that already exists in code; it does not run
> anything and does not change behavior.
>
> **Two GATED actions live inside this flow** (Jeff-approval required, each
> time): running activation against **prod** data, and any **prod DB write**
> (e.g. hand-fixing a `tenant_domains` row). Everything else — collecting
> intake, authoring config, reading the drift report — is non-gated.
>
> Companion docs (cross-reference, do not duplicate):
> - Field audit — every automation and the data it needs: `platform/docs/onboarding-redesign-plan.md` §2
> - Drift gate (read-only go-live check): `platform/scripts/reconcile-tenant-config.mjs`
> - Schema-migration procedure (if a step needs a DDL fix): `platform/docs/runbooks/migration-runbook.md`
> - Config source-of-truth rationale: ADR `0002-config-sot.md`; tenant DB adoption: `0004-tenantdb-adoption.md`
>
> **Reference-name note (honest):** the launch order named "F1" and a
> "tenant-config-authoring-plan" doc. Neither exists as a file in this repo.
> The real, in-code sources they point at are named inline below:
> the trade **archetype split** lives in `src/lib/industry-presets.ts`
> (service/booking verticals vs project/lead verticals); the **selena_config
> authoring** shape lives in `src/lib/provision-tenant.ts`
> (`DEFAULT_SELENA_CONFIG`) and the field audit in `onboarding-redesign-plan.md`
> §2. This runbook cites those directly.

---

## WHAT "LIVE" MEANS (the bar — do not claim live below it)

`activateTenant()` (`src/lib/activate-tenant.ts`) only flips a tenant to
`status='active'` when **all three** hold (`ready = gate.passed && ownerOk &&
siteServes`):

1. **Spine passes** — the onboarding gate (lead → booking/quote → review) runs green.
2. **Owner login exists** — a `tenant_members` row with `role='owner'` and a PIN.
3. **Site actually serves** — the carrying domain registered on Vercel **or** a
   custom domain verified. No domain = no TLS cert = a dead URL, so activation
   will NOT mark it live even if everything else passed.

If any of the three is missing the tenant stays in its prior status and the
result lists the specific `action_needed` step. Believe the step list, not hope.

---

## PREREQUISITES (verify before you start)

| Need | Why | Failure if missing |
|---|---|---|
| Operator/admin login to the platform | To reach `/admin/businesses/*` | Can't create/activate |
| `VERCEL_API_TOKEN`, `VERCEL_TEAM_ID` (and `VERCEL_PROJECT_ID`, defaults `fullloopcrm`) set in the **server** env | Carrying + custom domain registration (`src/lib/vercel-domains.ts`) | Domains return `status:'skipped'` → **site never serves → tenant can't go live** |
| Supabase service role (server-side, already wired) | All provisioning writes | Provisioning fails |
| The prospect's intake data (below) | Fills the ~70 consumed fields | Tenant launches generic on defaults |

If Vercel env is unset, activation still provisions the DB fully but parks
`carrying_domain` / `custom_domain` on `action_needed` and adds a
`site_live: action_needed` step — that is the #1 reason auto-created sites 404.

---

## STEP 0 — INTAKE: the data to collect from the prospect

Two creation surfaces exist today (see the redesign plan for the consolidation
in flight). The **operator create** form (`/admin/businesses/new`) collects the
most; the public self-serve form (`/onboarding`) collects the minimum.

**Minimum to create a tenant** (public form / `POST /api/tenants`):
`name · email · phone · industry · zip_code · team_size · serviceArea`.

**Full operator intake** (`/admin/businesses/new`), grouped as the form is:

| Group | Fields to collect | Consumed by |
|---|---|---|
| Identity | `name`, `industry` (drives presets), `zip_code`, `team_size` | provisioning, presets |
| Owner | `owner_name`, `owner_email`, `owner_phone` | owner login, notifications |
| Website & domain | `domain_name` (custom domain), `website_url`, `tagline`, `primary_color` | site config, domain registration |
| Contact | `business_phone`, `business_email` | site, Selena persona |
| Ops | `service_areas`, `business_hours_start/end`, `business_days`, `payment_methods[]` | scheduling, payments |
| Services | services override text (else trade presets seed) | quote/booking engine |
| Billing (platform) | `monthly_rate`, `setup_fee`, `payment_method` | platform billing |

**Data still NOT collected by any form** (rides on defaults — set expectations
with the prospect, or fix post-launch): numeric booking buffers, reminders
cadence, per-service pricing, proposal terms, referral rates, review-followup
config, tax rate. Full list: `onboarding-redesign-plan.md` §2 (marked ✗ MISSING).

**Failure mode:** phone is currently **mandatory** on client CSV import — an
email-only customer list is rejected. **Recovery:** collect at least one phone
per client, or defer client import until after go-live (import is separate from
activation and can be re-run).

---

## STEP 1 — CREATE THE TENANT ROW

**Do:** `/admin/businesses/new` → fill Step-0 fields → save. Creates the
`tenants` row (the namespace everything else is walled inside) and, with
auto-provision on, can chain into Step 4.

- Alternative door: public `/onboarding` (6 fields) → `POST /api/tenants`.
- Every creation door should ultimately funnel through `activateTenant()` so
  "independent tenant always" holds regardless of how the tenant was born.

**Failure mode:** duplicate slug / name collision. **Recovery:** slugs must be
unique; pick a distinct slug. If a half-created tenant exists, re-run activation
(idempotent) rather than creating a second row — two rows claiming one domain is
a CRIT the drift gate will flag (Step 7, Drift F).

---

## STEP 2 — SET `funnel_mode` PER TRADE ARCHETYPE  ⚠ manual, not automatic

The trade archetype is split in `src/lib/industry-presets.ts`:

- **Service / booking verticals** (short, ≤1-day jobs): cleaning, window
  cleaning, HVAC, plumbing, junk removal, towing, pet grooming, laundry, etc.
- **Project / lead verticals** (days → up to a year): landscaping, remodeling,
  roofing, siding, painting, flooring, concrete, solar, restoration, moving, etc.

`funnel_mode` ∈ `'booking' | 'pipeline' | 'lead_only'`, stored at
`tenants.selena_config.funnel_mode`, read by `getSettings()` and
`getTenantProfile()`. It drives Selena's behavior via
`src/lib/selena/agent-config-loader.ts`:

| funnel_mode | Booking model | Pricing model | Use for |
|---|---|---|---|
| `booking` | `hourly` (if hourly rates + services) else `appointment` | `hourly` / `flat` | service verticals that book jobs directly |
| `pipeline` | `quote_first` | `quote_only` | project verticals that quote before committing |
| `lead_only` | `lead_only` | `quote_only` | capture-only; no on-site booking/quoting yet |

> **⚠ THE TRAP (real, verified):** `DEFAULT_SELENA_CONFIG` in
> `provision-tenant.ts` does **not** set `funnel_mode`, and `settings.ts`
> **defaults an unset value to `'booking'`**. So a **project/lead trade
> (roofing, remodeling, solar…) provisioned on defaults launches in `booking`
> mode** — Selena will try to book jobs and quote hourly for a business that
> should be capturing leads and quoting projects. Archetype is NOT auto-derived
> from `industry`. **You must set `funnel_mode` explicitly for any
> project/lead trade.**

**Do:** for a project/lead trade, set `funnel_mode: 'pipeline'` (or
`'lead_only'`) in `selena_config` before or during activation.

**Failure mode:** left on default `booking` for a project trade → wrong Selena
script, hourly quotes on project work. **Recovery:** set `funnel_mode` in
`selena_config`, then bust cache — re-running activation calls
`clearSettingsCache(tenantId)`; or the settings cache expires on its own.

---

## STEP 3 — AUTHOR `selena_config`

`provisionTenant()` seeds `selena_config` **only if empty**, from
`DEFAULT_SELENA_CONFIG(industry, tenantName, services)`. Shape (author/override
these keys):

```
ai_enabled, ai_name ('Selena'), tone ('warm_friendly'), emoji_usage,
language ('en'),
pricing_rows[]     ← from seeded service presets ($/hr)
time_estimates[]   ← from seeded service durations
service_areas[]    ← EMPTY by default — fill from intake
business_tagline, cancellation_policy, no_cancellation_first_time (true),
checklist_fields   ← CHECKLIST_BY_INDUSTRY[industry] (trade-specific booking Qs)
funnel_mode        ← NOT set by default; add per Step 2
```

**Do:** pass overrides via `provisionTenant({ tenantId, industry, overrides:{
selena_config:{…} }})`, or edit the row after seeding. Fill `service_areas`,
confirm `pricing_rows`/`time_estimates` match the prospect's real rates, set
`funnel_mode`, adjust `tone`/`language` if not English/warm.

**Failure modes & recovery:**
- **Config not seeded** because the row already had a non-empty `selena_config`
  → provisioning reports it in `skipped`. Recovery: edit the existing config
  directly; don't expect re-provision to overwrite it (idempotent-by-design).
- **Prices show as $0 in proposals** → services were seeded without SKU columns.
  Provisioning already writes both booking columns and `price_cents/item_type/
  per_unit`; if a hand-edited service is $0, set `price_cents`.
- **Selena invents a price** → she is instructed to quote only configured rates.
  Missing `pricing_rows` = generic answers. Recovery: fill the rates.

---

## STEP 4 — RUN ACTIVATION (the "Activate" button → `activateTenant()`)

**Do:** `/admin/businesses/[id]` → Launch tab → **Activate**
(`POST /api/admin/businesses/[id]/activate`). Idempotent — safe to re-hit. It
runs, in order, each step best-effort (a failed step never blocks the DB
provisioning that follows):

1. **Identity** — confirms the tenant row.
2. **Settings** — `provisionTenant()` seeds services, selena_config, hours,
   payment methods, guidelines (only what's empty).
3. **Service-area geo** — geocodes the address to a center; maps neighborhoods/
   areas within the radius. Name-only/no-address tenant → `action_needed`, not a block.
4. **Onboarding checklist** — seeds `onboarding_tasks`.
5. **Finance + HR** — default entity, chart of accounts, HR doc rules/profiles.
6. **Founding team member** — seeds the owner as first `active` team member (the
   schedule spine needs ≥1). Issues a team PIN.
7. **Review destination** — if none, seeds a Google-search review link so the
   review stage can pass.
8. **Owner login** — creates `tenant_members` owner + PIN if none.
   **The plaintext owner PIN is returned ONCE** — capture it now.
9. **Smoke test** — busts the settings cache, runs the onboarding gate over the
   lead→review spine; each stage becomes a `Spine · <stage>` step.
10. **Domains (last, slowest)** — carrying domain, then custom domain (Step 5).
11. **Domain routing rows + seomgr** — `tenant_domains` upsert + SEO property (Step 6).

**Read the result:** `ready` true only if gate passed + owner login + a domain
served. `ownerPin` present only on the run that created the login.
`customDomain.records` are the DNS records to hand the prospect (Step 5).

**Failure modes & recovery:**
- **A step is `failed`** (e.g. finance/HR) — non-blocking; the tenant is still
  provisioned. Fix the underlying cause and re-run Activate (idempotent).
- **Spine stage `action_needed`** (review/schedule/lead) — the gate found a real
  gap. The step `detail` says which. Fill it (e.g. no active team member, no
  review destination) and re-run.
- **`site_live: action_needed`** — no domain served → Vercel env unset or DNS not
  yet live. See Step 5. Until fixed, **do not tell the prospect the site is up.**
- **Owner PIN lost** — it is shown once. Recovery: there is no re-reveal; reset
  the owner PIN (owner login flow) rather than re-reading the old one.
- **`activation_debug` rows in `notifications`** — known temp diagnostic crumbs
  (redesign plan §1e). Expected noise, not an error.

---

## STEP 5 — DOMAINS: `tenant_domains` + Vercel

Activation registers domains automatically; this step is what to verify and how
to recover.

**Carrying domain (always):** `<slug>.fullloopcrm.com` via
`registerCarryingDomain(slug)`. This is what makes the site serve on day one.
An active `tenant_domains` row is upserted (`is_primary` when no custom domain).
Internal carrying/`*.vercel.app` hosts are intentionally excluded from SEO
tracking (Step 6).

**Custom domain (when `tenants.domain` / `domain_name` set):**
`registerCustomDomain()` adds apex + www to the Vercel project and returns the
DNS the prospect must set at their registrar:

| Type | Name | Value |
|---|---|---|
| A | apex (e.g. `example.com`) | `76.76.21.21` |
| CNAME | `www.example.com` | `cname.vercel-dns.com` |
| TXT | (only if returned) | one-time challenge if the domain is already on another Vercel account |

`verified:false` until Vercel confirms DNS resolves. A `tenant_domains` row for
the custom apex is upserted `is_primary:true`.

**Failure modes & recovery:**
- **`status:'skipped'`** — Vercel env not configured. Recovery: set
  `VERCEL_API_TOKEN` + `VERCEL_TEAM_ID` server-side, re-run Activate.
- **`status:'error'`** — Vercel API rejected (not a 409). Recovery: read
  `detail` (status + code); common causes are an invalid domain or an
  already-in-use domain needing the TXT challenge.
- **`verified:false` after DNS set** — propagation lag or wrong records.
  Recovery: confirm apex A `76.76.21.21` and www CNAME exactly; wait for DNS TTL;
  re-run Activate to re-read verification.
- **`vercel_project = NULL` / `routing_mode = NULL` on the row** — activation
  upserts `tenant_domains` **without** `routing_mode` or `vercel_project`. For a
  **template** tenant this is fine (resolver serves the template). The drift gate
  (Step 7) will emit a **WARN** for `vercel_project=NULL` — expected for a fresh
  template tenant, not a blocker. Only a **bespoke** tenant needs
  `routing_mode='bespoke'` + a real `vercel_project`; setting those is a prod DB
  write (GATED — leader/Jeff).

---

## STEP 6 — SEO / SITEMAP ALLOWLIST

`registerSeoProperty()` (`src/lib/seo/onboarding.ts`) auto-registers the
tenant's **public** domain as an `seo_properties` row so no site is silently
untracked. Behavior:

- Registers the **primary public host** (custom domain if set, else carrying
  host) as `sc-domain:<domain>`, status `awaiting_grant`.
- **Allowlist rule:** `*.fullloopcrm.com` and `*.vercel.app` hosts are
  **skipped** — internal carrying/preview hosts are never their own GSC
  property. The real site (custom domain) is what gets tracked.
- Idempotent: an already-tracked/granted property is left untouched (never
  overwrites live permission or metrics).

**Go-live action:** grant the registered domain in Google Search Console to the
monitor service account **once**. Ingest's `sites.list` discovery then flips the
property from `awaiting_grant` to live and starts pulling metrics — no further
code.

**Sitemap/robots:** bespoke sites carry their own `sitemap.ts`/`robots.ts` under
`src/app/site/<slug>/`; the shared template renders these from config. Nothing
to hand-author for a template tenant.

**Failure modes & recovery:**
- **Property stuck `awaiting_grant`** — GSC grant not done. Recovery: perform the
  one-time GSC grant to the service account.
- **No property created** — the only public host was a carrying/`vercel.app`
  host (correctly skipped) or the domain had no dot. Recovery: once a real custom
  domain is set + activation re-run, the property registers. Bulk catch-up:
  `backfillUntrackedDomains()`.

---

## STEP 7 — GO-LIVE SMOKE CHECK

Run these in order. All are read-only except hitting the live URL.

1. **Drift gate (read-only):**
   ```
   cd platform && node scripts/reconcile-tenant-config.mjs
   ```
   Reconciles the four routing sources (`tenants.domain`, active
   `tenant_domains`, `BESPOKE_SITE_TENANTS` in `middleware.ts`, the
   `/site/<slug>/` folder). Token-guarded: if
   `SUPABASE_ACCESS_TOKEN_FULLLOOP` is absent it **skips cleanly (exit 0)**.
   - **Expect for a fresh template tenant:** possibly a **WARN** for
     `vercel_project=NULL` (see Step 5) and an INFO if it relies on the
     `tenant_domains` fallback. Those do not gate.
   - **CRIT means stop:** a domain claimed by >1 tenant (Drift F), a bespoke slug
     with no home/no tenant, or `routing_mode=bespoke` not in `BESPOKE_SITE_TENANTS`
     (the 2026-07-10 silent mis-route class). A gating CRIT exits 1 — resolve
     before calling it live.
2. **Hit the live URL** — carrying host `https://<slug>.fullloopcrm.com` (and the
   custom domain if verified). Expect a 200 and the tenant's site, **not** the
   generic template (unless intentionally template-served) and **not** a 404/TLS
   error. A dead URL means Step 5 isn't done.
3. **Owner login** — sign in with the owner email + the PIN from Step 4.
4. **Spine result** — confirm the activation result showed every `Spine · <stage>`
   as `done` and `ready:true` / `status='active'`.
5. **Selena sanity** — confirm `funnel_mode` matches the trade archetype (Step 2)
   — a project trade should be quoting, not booking hourly.

---

## FAILURE-MODE → RECOVERY QUICK TABLE

| Symptom | Likely cause | Recovery |
|---|---|---|
| Site 404 / TLS fail | Vercel env unset → domain `skipped` | Set `VERCEL_API_TOKEN`+`VERCEL_TEAM_ID`, re-run Activate |
| Tenant won't flip `active` | Gate stage `action_needed`, no owner, or no domain | Read the step `detail`; fix that one thing; re-run |
| Selena books hourly for a project trade | `funnel_mode` left on default `booking` | Set `funnel_mode:'pipeline'`/`'lead_only'` in `selena_config`; re-run (busts cache) |
| Custom domain `verified:false` | DNS not set / propagating | Set A `76.76.21.21` + CNAME `cname.vercel-dns.com`; wait TTL; re-run |
| Client import rejects rows | Phone mandatory / schedules before clients | Add phones; import clients before schedules |
| Prices show $0 | Service missing `price_cents` | Set `price_cents` on the service |
| Owner PIN lost | PIN shown once | Reset owner PIN (no re-reveal) |
| Drift gate CRIT: domain multi-claimed | Two tenant rows claim one domain | Consolidate to one tenant (GATED prod DB fix → leader/Jeff) |
| SEO property `awaiting_grant` forever | GSC grant not done | One-time GSC grant to monitor service account |

---

## HONEST GAPS (surface to Jeff; not this runbook's to fix)

1. **`funnel_mode` is not derived from `industry`.** The archetype data exists in
   `industry-presets.ts` but nothing maps a project trade to `pipeline`
   automatically — it defaults to `booking`. A one-line default
   (`industry ∈ project-verticals → funnel_mode:'pipeline'`) would close this;
   it is a code change, out of scope here.
2. **~40 of ~70 consumed fields have no form** (redesign plan §2). Tenants launch
   generic on defaults until the one-form redesign lands.
3. **Client import writes live with no staging/undo** (redesign plan §1c). Keep
   import separate from go-live; a bad import is hand-surgery today.
4. **`activation_debug` crumbs** ship to `notifications` on every activation
   (redesign plan §1e) — remove when the redesign lands.

# Per-Tenant Field Audit — routing_mode / vercel_project / status / owner_phone

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12 · **Status:** docs only, read-only,
nothing applied, no DB queried.
**Scope:** for each of the 22 live, protected tenants, document what's knowable **in-repo** (code
defaults, presets, the `verify-protected-tenants.mjs` roster) about these four fields, and mark plainly
which values can only be confirmed by querying prod (Jeff-gated — needs `SUPABASE_ACCESS_TOKEN_FULLLOOP`
or direct DB access, neither of which this worktree has).

**Honesty flag up front:** `routing_mode` and `vercel_project` are **not columns that exist in this
branch's schema**. They're introduced by migrations `055` (routing schema) and `056`/`059`
(vercel_project, NULLABLE) per `gated-wave-plan.md` Wave 2 — those migration files are not present
anywhere in `platform/src/lib/migrations/` on `p1-w6` (confirmed by directory listing; highest numbered
migration here is `054`). The wave plan's own collision note says `059`/`060` live on lane `p1-w1` and
`058`/`061` on `p1-w2`. So this doc cannot read the actual target-state logic for those two columns from
this branch — it documents the **closest existing proxy** (the hardcoded `BESPOKE_SITE_TENANTS` routing
set in `src/middleware.ts`, which is what `routing_mode` is understood to be migrating *from*) and flags
the real column definitions as unverifiable here until Wave 1 integration lands `055`/`056`/`058`/`059`.

**Verification anchors read this pass:** `platform/src/middleware.ts:381-423` (`BESPOKE_SITE_TENANTS`
set), `platform/scripts/verify-protected-tenants.mjs` (full file — the 22-tenant `PROTECTED` roster with
domain notes), `platform/scripts/reconcile-tenant-config.mjs` (full file — the four-source drift model:
`tenants.domain`, `tenant_domains`, `BESPOKE_SITE_TENANTS`, site folders), `platform/src/lib/tenant.ts:9-50`
(`Tenant` type — confirms no `routing_mode`/`vercel_project` fields exist yet), `platform/src/lib/create-tenant-from-lead.ts:71,97,148,157,217`
(default `status`/`owner_phone` assignment at creation), `platform/src/lib/activate-tenant.ts:7,208-221,417-421`
(`status` flip to `active`), `ls platform/src/app/site/` (confirms all 22 slugs have a folder).

---

## 1. The 22-tenant roster (source of truth for "which tenants," in-repo)

Three in-repo lists should agree on membership: `BESPOKE_SITE_TENANTS` (middleware.ts), `PROTECTED`
(verify-protected-tenants.mjs), and the `src/app/site/<slug>/` folders. I diffed all three:

- **Membership matches exactly** — 22 slugs in `BESPOKE_SITE_TENANTS`, 22 in `PROTECTED` (nycmaid +
  21 others), and all 22 have a `src/app/site/<slug>/` folder with a homepage. No slug is in one list
  and missing from another.
- This in-repo agreement is exactly what `verify-protected-tenants.mjs` enforces at build time
  (`npm prebuild`) and what `reconcile-tenant-config.mjs` extends to check against live DB rows — but
  that DB-facing half requires `SUPABASE_ACCESS_TOKEN_FULLLOOP` and was not run this pass (Jeff-gated;
  see §5).

## 2. Per-tenant table

Legend: 🟢 knowable in-repo (this pass) · 🔒 live-DB-only, cannot verify from this worktree.

| Slug | Domain (per `verify-protected-tenants.mjs`) | routing_mode (expected, see §3) | vercel_project 🔒 | status 🔒 | owner_phone 🔒 |
|---|---|---|---|---|---|
| `nycmaid` | `thenycmaid.com` — live primary | **bespoke**, but flagged — see §3 note on `058` | unknown | should be `active` (flagship, live) | unknown |
| `we-pay-you-junk` | `wepayyoujunkremoval.com` | bespoke | unknown | unknown | unknown |
| `nyc-mobile-salon` | `thenycmobilesalon.com` | bespoke | unknown | unknown | unknown |
| `the-florida-maid` | `thefloridamaid.com` | bespoke | unknown | unknown | unknown |
| `the-nyc-exterminator` | `thenycexterminator.com` | bespoke | unknown | unknown | unknown |
| `nyc-tow` | `nyctow` — **malformed, see orphan-domains-audit.md** | bespoke | unknown | unknown | unknown |
| `nycroadsideemergencyassistance` | `nycroadsideemergencyassistance.com` | bespoke | unknown | unknown | unknown |
| `theroadsidehelper` | `theroadsidehelper.com` | bespoke | unknown | unknown | unknown |
| `toll-trucks-near-me` | `tolltrucksnearme.com` — **DNS dark, Wave 6** | bespoke | unknown | unknown | unknown |
| `sunnyside-clean-nyc` | `cleaningservicesunnysideny.com` | bespoke | unknown | unknown | unknown |
| `wash-and-fold-nyc` | `washnfoldnyc` — **malformed, see orphan-domains-audit.md** | bespoke | unknown | unknown | unknown |
| `wash-and-fold-hoboken` | `hoboken laundry` — **malformed, see orphan-domains-audit.md** | bespoke | unknown | unknown | unknown |
| `landscaping-in-nyc` | `landscapinginnyc` — **malformed, see orphan-domains-audit.md** | bespoke | unknown | unknown | unknown |
| `debt-service-ratio-loan` | `debtserviceratioloan` — **malformed, see orphan-domains-audit.md** | bespoke | unknown | unknown | unknown |
| `fla-dumpster-rentals` | `fladumpsterrentals` — **malformed + DNS dark, Wave 6** | bespoke | unknown | unknown | unknown |
| `stretch-ny` | `stretchny.com` | bespoke | unknown | unknown | unknown |
| `stretch-service` | `stretch service` — **malformed, see orphan-domains-audit.md** | bespoke | unknown | unknown | unknown |
| `the-home-services-company` | `thehomeservicescompany` — **malformed, see orphan-domains-audit.md** | bespoke | unknown | unknown | unknown |
| `the-nyc-interior-designer` | `thenycinteriordesigner.com` | bespoke | unknown | unknown | unknown |
| `the-nyc-marketing-company` | `thenycmarketingcompany / consortium` — **ambiguous/dual, see orphan-domains-audit.md** | bespoke | unknown | unknown | unknown |
| `the-nyc-seo` | `thenycseo.com` | bespoke | unknown | unknown | unknown |
| `consortium-nyc` | `consortiumnyc.com` | bespoke | unknown | unknown | unknown |

## 3. `routing_mode` — what's actually knowable, and the nycmaid caveat

`BESPOKE_SITE_TENANTS` in `middleware.ts` is today's hardcoded equivalent of "gets its own site, not the
shared `/site/template`." All 22 tenants above are in that set, so **if `routing_mode` on the new column
mirrors this set 1:1, all 22 would read `bespoke`.**

But `gated-wave-plan.md` Wave 2 has this line: `058` flip nycmaid `routing_mode` **template→bespoke**.
That only makes sense if nycmaid's `routing_mode` value **today** (pre-`058`, on whichever lane owns that
column) is `template`, not `bespoke` — the opposite of what `BESPOKE_SITE_TENANTS` membership would
suggest. I cannot resolve this contradiction from this branch: the column and its default-assignment
logic don't exist here to read. Two explanations that would both make it consistent, neither confirmable
in-repo:
1. The new `routing_mode` column was introduced with a blanket default (e.g. `'template'` for every row,
   including nycmaid) independent of `BESPOKE_SITE_TENANTS`, and `058` is the one-time correction for
   nycmaid specifically because it's the flagship and the migration author wants it flipped explicitly
   rather than trusting the default.
2. `BESPOKE_SITE_TENANTS` and `routing_mode` are two different concepts entirely (one is "which
   Next.js folder serves this tenant's marketing site," the other is about the Wave 5 resolver-flip
   domain→tenant lookup) that happen to share vocabulary. The wave plan's Wave 5 item ("resolver flip,"
   `TENANT_DIVERGENCE` guard, dropping `tenants.domain` fallback) suggests `routing_mode` may actually
   govern *domain resolution*, not *site-folder selection* — a materially different meaning than what
   this table assumes.

**Flagging rather than guessing:** whoever runs `055`/`058` should confirm which of these two it is
before trusting this table's `routing_mode` column for anything beyond "which tenants currently have a
bespoke `/site/<slug>` folder" (which is solid, verified fact).

## 4. `status` and `owner_phone` — code-derivable expectations vs. actual live values

**`status`:** `create-tenant-from-lead.ts:71` defaults new tenants to `status: opts.status || 'pending'`.
`activate-tenant.ts:417-421` flips a tenant to `'active'` only once its onboarding "spine" actually
passes (never on faith — see that file's own comment at line 7). So the **expected** value for all 22
live, publicly-serving tenants in this table is `active`; anything else on a tenant with a live bespoke
site would itself be a bug worth flagging. The **actual** per-tenant value is a live DB read.

**`owner_phone`:** `create-tenant-from-lead.ts:157` sets `owner_phone: lead.phone || null` at creation
time — so the code path *can* populate it, but only does so when the originating lead record had a phone
number. `gated-wave-plan.md` Wave 2 lists an **owner_phone backfill — DO-NOT-SKIP #1** with "19 tenants
locked out (19 NULL verified)" — that count is a fact from a prior live-DB check the leader ran, not
something this pass re-verified or can re-verify from this worktree. Given 19 of some larger tenant
population are NULL, and there are 22 live bespoke tenants in this table, it's plausible (not confirmed)
that most of this table's rows are among the 19 — flagging that as a real possibility for whoever runs
the backfill to prioritize this roster, not asserting it as fact.

## 5. What this pass could not verify, and how to close the gap

Every 🔒 cell above, plus the true `routing_mode` semantics in §3, requires one of:

1. **`reconcile-tenant-config.mjs`** (already exists at `platform/scripts/reconcile-tenant-config.mjs`,
   read-only, requires `SUPABASE_ACCESS_TOKEN_FULLLOOP` in `~/.env.local`) — run once that token is
   available; it directly answers `tenants.domain` vs `tenant_domains` drift per tenant, though it does
   not yet check `routing_mode`/`vercel_project`/`owner_phone` (those columns don't exist in this
   branch's copy of the script either — it predates `055`-`062`).
2. A direct `SELECT slug, routing_mode, vercel_project, status, owner_phone FROM tenants` once
   `055`/`056`/`059` are merged and applied to prod — this is the actual source of truth this table is
   standing in for. **The leader/Jeff should run this after Wave 1 integration, not trust this file's
   `unknown` cells as a stand-in indefinitely.**

**Nothing in this file was verified against a live database.** Every non-🔒 claim above is sourced from
reading code and scripts in this worktree, cited by file:line above.

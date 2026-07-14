# Fortress Health — Coverage & Freshness Audit

**Author:** W4 (verification-harness lane) · **Branch:** `p1-w4` · **Date:** 2026-07-12
**Status:** read-only audit · doc-only · no code/routes/DB touched

**Question posed:** does `/admin/tenant-health` cover **every live tenant**, and
does it reflect **REAL (not cached) state**? Enumerate the gaps.

---

## 0. TL;DR (read this first)

- **Two different "cached" questions, two different answers:**
  1. **The probe itself is REAL, not CDN-cached.** Every `checkTenant` fetch uses
     `cache: 'no-store'`, a `?cb=<timestamp>` cache-buster, and `redirect:'manual'`
     (`src/lib/tenant-health.ts:39,91`). Good — it reads live origin state.
  2. **The dashboard is CACHED (table-backed) and can be dangerously stale.** The
     page reads the `tenant_health` **table** (`src/app/admin/tenant-health/page.tsx:36`),
     which the cron writes every 15 min. **If the cron stops running, the table
     freezes and the board keeps showing the last result — with no alarm.** A
     3-day-old all-green run renders as "All N tenants healthy." This is the
     single most dangerous gap (§3.A).
- **Coverage is NOT "every live tenant."** It is "every tenant with a non-null
  `tenants.domain` (status ∈ active/live/setup) **or** an active `tenant_domains`
  row, minus three hardcoded skip/exclude sets." At least four classes of live
  tenant fall outside that (§2).
- **The checks are shallow.** "Reachable + own template + no loop + lead route
  present" says nothing about whether **booking or checkout actually work**, and
  `formWired`/`reachable` both pass on a *broken-but-200/405* response (§4). Deep
  coverage is the job of synthetic canaries — see `synthetic-canaries-spec.md`.

---

## 1. What Fortress actually checks (grounding)

Per `src/lib/tenant-health.ts` `checkTenant()`, a tenant **passes** iff all four:

| Check | Passes when | Fails / catches |
|---|---|---|
| `reachable` | homepage final status 2xx | down / 402 / 5xx |
| `routing` | `x-matched-path === /site/<expectedSlug>` (or `/` for route-group tenants) | `/site/template` ("SERVING GENERIC TEMPLATE"), `/404`, wrong slug |
| `noLoop` | no host seen twice within 8 hops | apex↔www redirect loop |
| `formWired` | `GET /api/lead` status ≠ 404 | lead route gone (404) |

Coverage set is built in `src/app/api/cron/tenant-health/route.ts:60-100`:

- **Source 1 (authoritative):** `tenants` where `domain IS NOT NULL` **and**
  `status ∈ {active, live, setup}`.
- **Source 2 (fallback):** `tenant_domains` where `active = true`, only for
  tenants not already covered by Source 1.
- **Minus:** `SKIP_SLUGS` = {`full-loop-crm`}; `EXCLUDED_TENANTS` =
  {`nycmaid`, `fla-dumpster-rentals`}.
- **Special-cased:** `TEMPLATE_TENANTS` = {`the-va-virtual-assistant`} expect
  `/site/template`; `ROUTE_GROUP_TENANTS` = {`wash-and-fold-nyc`,
  `wash-and-fold-hoboken`} accept `/`.

---

## 2. Coverage gaps — tenants that are NOT checked

| # | Gap | Grounding | Severity |
|---|---|---|---|
| C-1 | **Subdomain-only live tenants** served on `<slug>.homeservicesbusinesscrm.com` with `tenants.domain = NULL` and **no active `tenant_domains` row** are checked by **neither** source. Middleware happily serves them (`src/middleware.ts:216-227 extractSubdomain → rewriteToSite`), but the cron's Source 1 requires `domain IS NOT NULL` and Source 2 requires a `tenant_domains` row. **A live customer site on a bare platform subdomain is invisible to Fortress.** | `route.ts:66` (`.not('domain','is',null)`), `route.ts:82` | **HIGH** (unmonitored live sites) |
| C-2 | **Live-but-not-active-status tenants (CONFIRMED divergence).** Middleware serves any status **except** `{suspended, cancelled, deleted}` (`NON_SERVING_STATUSES`, `src/middleware.ts:29-31`). The cron's Source 1 checks **only** `status ∈ {active, live, setup}` (`route.ts:68`). So a tenant that middleware **serves** but whose status is anything else — e.g. `trial`, `paused`, `grace`, `past_due`, `onboarding` — is **dropped from Source 1** and checked only if it happens to have an active `tenant_domains` row. The two allow-lists genuinely don't match: a served tenant can be unmonitored. | `route.ts:68` (`{active,live,setup}`) vs `src/middleware.ts:29-31` (all but `{suspended,cancelled,deleted}`) | **HIGH** |
| C-3 | **Stale hardcoded exclude set.** `EXCLUDED_TENANTS` hardcodes `nycmaid` "REMOVE after cutover" (`route.ts:29-32`). When nycmaid cuts over to FL, if this line isn't edited, the **largest tenant silently goes unmonitored**. Same fragility for `fla-dumpster-rentals` if it ever moves onto FL. Config-in-code drift. | `route.ts:32` | **MEDIUM-HIGH** |
| C-4 | **Static-map domain the cron can't see.** Middleware has a `STATIC_TENANT_MAP` for `thefloridamaid.com` used "when DB lookup at the edge is unreliable" (`src/middleware.ts:233`). If that domain is served via the static map because its **DB `tenants.domain`/`tenant_domains` row is missing/null**, the cron (DB-only) won't check the domain the tenant is actually served on. Routing source ≠ coverage source. | `src/middleware.ts:233-241` vs `route.ts:60-100` | **MEDIUM** |
| C-5 | **Template/route-group drift → false alarms & false greens.** A tenant that migrates onto the shared template but isn't added to `TEMPLATE_TENANTS` is flagged **"SERVING GENERIC TEMPLATE"** (false fail); a new route-group-homepage tenant not in `ROUTE_GROUP_TENANTS` reports fail for a `/` match (false fail). Conversely a tenant wrongly left in `TEMPLATE_TENANTS` that *should* serve its own site would **pass while darkened onto the template** (false green — the exact 2026-07-08 failure mode). | `route.ts:24,35`, `tenant-health.ts:105-107` | **MEDIUM** |

---

## 3. Freshness / "real state" gaps

| # | Gap | Grounding | Severity |
|---|---|---|---|
| F-A | **Silent monitor death.** The dashboard's `allGreen` / "All N healthy" badge is computed purely from `tenant_health` **table rows** with **no freshness gate** (`page.tsx:46,62`). If the cron stops (CRON_SECRET rotated → 401; function timeout; Vercel cron disabled), the table freezes and the board shows the **last** (possibly all-green) run indefinitely. The page *does* show "last run Xm ago" (`timeAgo`, `page.tsx:54`) — but a human must notice; **nothing alerts on cron non-execution.** The Fortress cron alerts on tenant *failures*, never on **its own** absence. | `page.tsx:44-46,54,62`; `route.ts:130-134` (alerts only on `failures.length`) | **CRITICAL** |
| F-B | **Zombie rows never reaped.** The cron `upsert(..., {onConflict:'domain'})` (`route.ts:116-128`) and **never deletes**. A churned/removed tenant, or a tenant whose domain changed, leaves its **old** `tenant_health` row on the board forever — a phantom "healthy" (or stuck-failing) entry that no longer maps to a live tenant. Row count on the badge is therefore not "current live tenants." | `route.ts:116` (no `.delete()` anywhere) | **MEDIUM** |
| F-C | **Alert delivery is best-effort and unverified.** Every `alertOwner(...)` is `.catch(() => {})` (`route.ts:71,133`). If Telegram delivery fails, the failure is swallowed — a failing tenant could go un-paged and no one knows the alert never left. | `route.ts:133` | **MEDIUM** |
| F-D | **15-min blind window is real for fast breaks.** Even when healthy, the board reflects state as of the last tick (≤15 min old). A cutover that darkens a tenant at minute 1 is invisible for up to ~15 min. Acceptable for this detector's purpose, but worth stating for RTO math. | `vercel.json` (`*/15 * * * *`) | **LOW (by design)** |

---

## 4. Depth gaps — checks that pass on a broken tenant

| # | Gap | Grounding | Severity |
|---|---|---|---|
| D-1 | **`formWired` only detects route-*gone*, not route-*broken*.** It passes on any status ≠ 404 — so a lead endpoint returning **500** (DB down, handler throwing) still reads `formWired: true`. The board would show a green "Form" chip while lead capture is fully broken. | `tenant-health.ts:120` (`lead.status !== 404`) | **MEDIUM-HIGH** |
| D-2 | **`reachable` passes on a soft-error 200.** A homepage returning HTTP 200 with an error/blank body counts as reachable. Only `routing` (template/404/loop) would catch a *specific* darkening; a generic broken-but-200 custom page passes all four checks. | `tenant-health.ts:100` | **MEDIUM** |
| D-3 | **No booking/checkout/auth probe at all.** Fortress covers homepage + lead-route-presence only. It says **nothing** about whether booking, payment, or portal-login work. That depth is deliberately out of Fortress's scope — it belongs to **synthetic canaries** (`synthetic-canaries-spec.md`). Flagging so the coverage boundary is explicit, not assumed. | `tenant-health.ts` (only `/` + `/api/lead`) | **MEDIUM (structural)** |
| D-4 | **No TLS/cert-expiry check.** An expired cert typically surfaces as a fetch error (`reachable: false` → fail), so it is *incidentally* caught, but there is no explicit cert-expiry-soon early warning. | `tenant-health.ts:56-58` (catch → error) | **LOW** |

---

## 5. Consolidated gap register (severity-ranked)

| Rank | ID | Gap | Class |
|---|---|---|---|
| 1 | F-A | Silent monitor death — stale table reads as all-green, no cron-heartbeat alert | Freshness |
| 2 | C-1 | Subdomain-only live tenants (null domain, no tenant_domains) not checked | Coverage |
| 3 | C-2 | Cron status allow-list `{active,live,setup}` diverges from middleware's serve-all-but-`{suspended,cancelled,deleted}` (confirmed) | Coverage |
| 4 | D-1 | `formWired` green on a 500 (route broken, not gone) | Depth |
| 5 | C-3 | Hardcoded `EXCLUDED_TENANTS` (nycmaid) goes stale after cutover | Coverage |
| 6 | C-5 | Template/route-group hardcoded sets drift → false green/false fail | Coverage |
| 7 | F-B | Zombie `tenant_health` rows never reaped → phantom board entries | Freshness |
| 8 | C-4 | Static-map domain the DB-only cron can't see | Coverage |
| 9 | F-C | `alertOwner` failures swallowed | Freshness |
| 10 | D-2 | `reachable` green on soft-error 200 | Depth |

---

## 6. Recommendations (not executed — this lane is read-only)

Priority order, cheapest-impactful first:

1. **Cron heartbeat + freshness gate (fixes F-A).** (a) Gate the dashboard's
   "All healthy" badge on `lastRun` being within, say, 2× the cron interval —
   otherwise render "STALE — last run Xm ago" in red regardless of row status.
   (b) A separate heartbeat that alerts if `/api/cron/tenant-health` hasn't
   written a fresh `checked_at` within N minutes (a monitor for the monitor).
2. **Close C-1/C-2 by deriving the coverage set from "what middleware would
   serve."** Union in subdomain-served tenants (null domain) and align the status
   filter with `tenantServesSite`, or better, enumerate from a single source of
   truth so the cron and the router can't diverge.
3. **Reap zombie rows (F-B):** delete `tenant_health` rows whose domain is no
   longer in the current target set each run.
4. **Deepen `formWired` (D-1):** treat `5xx` on `/api/lead` as fail, not just 404.
5. **Move the hardcoded sets (C-3/C-5) to tenant data** (a `health_expectation`
   column: `own | template | route-group | excluded`) so migrations update data,
   not code, and can't silently rot.
6. **Deep flows → canaries, not Fortress (D-3):** see
   `synthetic-canaries-spec.md`. Keep Fortress shallow-and-broad; let canaries be
   narrow-and-deep against the canary tenant.

All six are code/DB changes outside this read-only lane — **leader/build call.**

---

## 7. What I verified vs. did not

- **Verified (static, this working tree):** the four checks and their pass
  conditions (`src/lib/tenant-health.ts`); the coverage-set construction, skip/
  exclude/template/route-group sets, upsert-only-never-delete, and
  alert-only-on-failure (`src/app/api/cron/tenant-health/route.ts`); the
  dashboard's table-read, `allGreen`/badge logic, and `timeAgo` staleness display
  (`src/app/admin/tenant-health/page.tsx`); the middleware serving path for
  subdomains, custom domains, and the `thefloridamaid.com` static map
  (`src/middleware.ts`); the cron schedule (`vercel.json`).
- **Did NOT verify:** live/prod data — I have **no DB or prod access**, so I
  cannot confirm *which* live tenants currently have null `tenants.domain` /
  no `tenant_domains` row (C-1), *how many* live tenants currently sit in a
  status the cron drops (C-2), or whether the `tenant_health` table currently
  holds zombie rows (F-B). The **mechanism** of each is verified from code
  (C-2's status-set divergence is confirmed — `middleware.ts:29` vs `route.ts:68`);
  only the live **hit count** needs a DB query I can't run from this lane.

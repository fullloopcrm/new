# External Uptime + DNS Monitor (A3)

**Author:** W1 (schema + backfill lane) · **Date:** 2026-07-12 · **Status:** FILE ONLY — design/spec. **No code, workflows, or external services provisioned.** This documents *what to stand up*; provisioning is a leader/Jeff action.

Goal: an **independent, out-of-platform** watchdog that catches the failure modes
the in-repo guard structurally *cannot* see — a darkened tenant caused by DNS,
TLS, or the platform itself being down — and alerts through a path that does not
depend on FullLoop being up.

---

## 1. Why the in-repo guard is not enough

The Fortress cron (`platform/src/app/api/cron/tenant-health/route.ts` →
`checkTenant` in `src/lib/tenant-health.ts`) is a real detector: for every tenant
with a live domain it GETs the site, follows redirects manually (loop-safe),
confirms `x-matched-path` serves the tenant's own `/site/<slug>` and not the
generic template, and Telegram-alerts on failure. It caught exactly the kind of
cutover regression it exists for. Keep it.

But it has three **structural** blind spots, all because it is a `fetch`-based
cron running *on the same Vercel deployment it monitors*:

| Blind spot | Why the in-repo guard misses it |
|---|---|
| **Platform is down** | If the Vercel deployment (or the cron scheduler, or the region) is down, the cron **does not run at all** → no alert. A monitor cannot report its own host being dead. This is the single most important gap. |
| **DNS is the failure** | A failed `fetch` collapses every root cause into "unreachable." It cannot tell *expired domain registration* from *missing/for the wrong target CNAME* from *nameserver change* from *propagation lag* from *app 500*. The remedy for each is different, and DNS/registration failures are the slow, silent, expensive ones. |
| **Resolver monoculture** | The cron resolves through Vercel's own network + DNS cache. It cannot see per-region propagation differences or public-resolver divergence (e.g. Cloudflare `1.1.1.1` vs Google `8.8.8.8` returning different records mid-cutover). |

TLS-certificate expiry sits adjacent: a `fetch` only fails *after* the cert has
already expired and customers are already seeing browser warnings. An external
monitor should warn on **days-to-expiry**, before the hard failure.

The A3 monitor is defined by exactly these gaps. It is **additive** — it does not
replace the Fortress cron's tenant-identity check.

---

## 2. Tenant inventory (what to probe)

Same source of truth the Fortress cron already reconciles: a domain can live in
**either** `tenants.domain` **or** the `tenant_domains` table, and the resolver
checks `tenants.domain` first. The monitor must probe the **union** of both, or
it will miss tenants — this is the bug the first live Fortress run exposed.

- `tenants.domain` (primary custom domain, when set)
- `tenant_domains.domain` where `active = true` (primary / neighborhood / generic)
- For each domain, also probe the `www.` variant (matches `getOwnedDomainSet`).
- Carrying domains `<slug>.fullloopcrm.com` (registered as Vercel project domains
  by `src/lib/vercel-domains.ts`) — these are the fallback that must never strand.

**Exclusions** (mirror the Fortress cron's lists so the two agree, else the
external monitor becomes an alert-noise generator):
- `SKIP_SLUGS` — the platform's own slug (`full-loop-crm`).
- `EXCLUDED_TENANTS` — tenants intentionally *not* served by FL right now
  (`nycmaid`, `fla-dumpster-rentals`). Remove from the exclusion as each cuts over.

> The inventory should be pulled dynamically (read the union from Supabase via a
> read-only key or a small public-safe `/api/monitor/targets` endpoint gated by a
> shared secret), **not** hand-maintained in the monitor's config — a static list
> silently rots the moment a tenant is added.

---

## 3. Probe classes, per target

Four probe classes, deliberately separated so an alert names the *root cause*, not
just "down":

### 3a. Uptime / HTTP (the "is it serving" probe)
- `GET https://<domain>/` from **outside Vercel**, following redirects, expecting
  a terminal `2xx` and **no redirect loop**.
- Assert the tenant-identity signal the Fortress cron uses: the `x-tenant-slug`
  response header (set by `rewriteToSite()` in `src/middleware.ts`) equals the
  expected slug. A `200` that serves the *generic template* or the *wrong tenant*
  is still a darkened tenant — HTTP-200-but-wrong-brand is the exact class the
  resolver-flip work exists to prevent (see `preview-smoke-gate-plan.md`, A4).
- Probe from **≥2 geographic regions** to distinguish a regional edge/DNS issue
  from a global outage.

### 3b. DNS (the probe the in-repo guard cannot do)
- Resolve `A` / `AAAA` / `CNAME` for `<domain>` and `www.<domain>` against
  **≥2 independent public resolvers** (e.g. `1.1.1.1` and `8.8.8.8`).
- Assert the record points at the **expected Vercel target** (apex A/ALIAS or the
  `cname.vercel-dns.com` family, whatever the tenant is provisioned for).
- Flag: `NXDOMAIN`, empty answer, record pointing at a stale/foreign target, or
  **divergence between resolvers** (a propagation or split-brain signal).

### 3c. TLS certificate
- On connect, read the leaf cert's `notAfter`.
- **Warn** at ≤14 days to expiry, **alert** at ≤3 days or already-expired, and
  flag hostname-mismatch / untrusted-chain.

### 3d. Domain registration (WHOIS / RDAP)
- Read the registration `expiry` date (RDAP where available; WHOIS fallback).
- **Warn** at ≤30 days, **alert** at ≤7 days. Expired registration is the
  slowest, most-invisible, hardest-to-reverse darkening — worth its own probe
  even at a low cadence.

---

## 4. Cadence

Matched to how fast each failure class moves and to keep external-monitor cost
sane:

| Probe | Cadence | Rationale |
|---|---|---|
| 3a Uptime/HTTP | **1–3 min** | Fast detection of the platform-down / hard-outage case. This is the always-on heartbeat. |
| 3b DNS | **15 min** | DNS changes are deliberate and propagate over minutes-to-hours; sub-minute polling adds noise, not signal. |
| 3c TLS expiry | **12 h** | Expiry is a countdown, not an event; twice-daily catches it with days of runway. |
| 3d WHOIS/RDAP | **24 h** | Registration windows move in days; daily is ample and respects registry rate limits. |

**Debounce / anti-flap:** alert only after **N consecutive failures** (e.g. 2–3)
for the uptime probe, so a single transient blip does not page. DNS/TLS/WHOIS
alerts fire on first observation (they are not transient).

---

## 5. Alert path (must be platform-independent)

The whole point of A3 is to survive FullLoop being down, so the alert path **must
not route through the platform**:

- **Primary:** the external monitor's own notification channel → the on-call
  destination. This must be the monitor vendor's native alerting (email + SMS/push
  + a webhook), **not** a call back into `/api/...` on the platform (which would be
  down in the exact scenario that matters).
- **Secondary:** a webhook into the same Telegram chat the Fortress cron uses
  (`alertOwner` in `src/lib/telegram.ts`), so both watchdogs land in one place —
  *but* Telegram delivery must originate from the external monitor, not from the
  platform relaying it.
- Every alert names: **tenant slug, domain, probe class (uptime/DNS/TLS/WHOIS),
  observed vs expected, and first-seen timestamp** — so triage starts from a root
  cause, not "something is down."

---

## 6. Implementation options (neutral — pick one, do not cargo-cult)

Two viable shapes; both keep the watchdog **off** the monitored deployment:

1. **Hosted synthetic-monitoring SaaS** (uptime + TLS + optional DNS checks +
   native multi-region + native alerting). Fastest to stand up; DNS/WHOIS depth
   varies by vendor — verify it can assert *record target*, not just resolvability.
2. **Tiny external worker on a different provider** (a scheduled function on a
   non-Vercel host, or a GitHub Actions scheduled workflow) that runs the four
   probe classes against the dynamic target list and posts to the alert path.
   Full control over DNS/WHOIS/tenant-identity assertions; more to maintain.

A pragmatic split: SaaS for 3a/3c (uptime + TLS, its strength), a small external
worker for 3b/3d + the `x-tenant-slug` identity assertion (the platform-specific
logic no generic monitor knows about).

---

## 7. What this does NOT replace

- The **Fortress cron** (`tenant-health`) — its tenant-identity/redirect-loop
  logic stays; A3 is the outside-in complement.
- The **preview smoke gate** (A4) — that catches mis-routing *before* promotion;
  A3 catches it *in production, after the fact*. Different points on the timeline.
- Application-level health (`/api/health`) — that is an in-platform readiness
  probe and is, correctly, blind to DNS/TLS/registration by design.

---

## 8. Open items for the leader / Jeff

- [ ] Choose implementation shape (§6) and, if SaaS, confirm it can assert DNS
  *record target* and TLS *days-to-expiry*, not just up/down.
- [ ] Decide the expected-DNS-target source of truth per tenant (apex vs CNAME;
  carrying-domain vs custom). The monitor needs a per-domain "expected target" to
  assert against — this likely wants a column or config, and touches the
  `tenant_domains` schema (W1 lane) if we persist it. **Flagging, not doing.**
- [ ] Provide the on-call alert destination(s) for the platform-independent path.
- [ ] Confirm the exclusion list stays in sync with the Fortress cron (single
  source would be ideal; today they are two lists that can drift).

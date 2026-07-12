# Health-monitor coverage gap — how nycmaid's `/api/health` 404'd for ~8h with NO alert

**Author:** W6 · **Date:** 2026-07-12 · **Status:** analysis + proposal, NOT APPLIED
**Severity:** HIGH (flagship tenant, silent failure, no monitoring path covers it)
**Triggered by:** W4's live-probe finding (`p1-w4` commit `6aa29740`,
`deploy-prep/nycmaid-stale-deployment-finding.md`, not yet merged into this
branch — summarized in full below since this doc builds on it) — read-only
curl against prod found `www.thenycmaid.com/api/health` and
`/api/tenant/public` returning Next.js's *generic* 404
(`x-matched-path:/404`), while `/`, `/robots.txt`, `/sitemap.xml` kept
serving 200 from an `x-vercel-cache: HIT` response ~8.2h old
(`age:~29600`). Working theory: `thenycmaid.com` is aliased to a stale/wrong
Vercel deployment that predates the current API routes. That diagnosis is
unconfirmed (needs Vercel dashboard access this lane doesn't have) — this doc
does not re-litigate it. What it does cover: **why nothing in this codebase's
monitoring would have caught it, or would catch a recurrence, on nycmaid or
any other tenant in the same deployment shape.**

---

## 1. The incident, restated for monitoring purposes

- Failure mode: a tenant's live custom domain silently serves an **old
  deployment**. Static/ISR content (edge-cached) looks fine to a human
  visiting the site. Every dynamic API route 404s.
- Duration: at least ~8 hours before anyone noticed — and it was noticed by
  a manual read-only curl probe during an unrelated audit task, not by any
  automated system.
- Zero alerts fired. Not a Telegram message, not a dashboard row, nothing.

That last fact is the actual bug. A deployment-binding problem is
infrastructure, not app code — this worktree can't fix the Vercel binding.
What this worktree *can* fix is the fact that an 8-hour flagship-tenant
outage produced silence.

---

## 2. What the two existing "health monitor" systems actually check

There are two things in this codebase that could plausibly be called a
health monitor. Neither is a synthetic external monitor of a tenant's live
custom domain, and both have a specific, documented reason they didn't fire.

### 2a. `/api/cron/health-monitor` (`platform/src/app/api/cron/health-monitor/route.ts`)

This is **not** an HTTP reachability check at all. It queries the FL
platform's own `notifications` / `email_logs` tables for evidence that each
of the platform's own internal cron jobs (email-monitor, payment-reminder,
daily-summary, etc.) wrote *something* recently — i.e. "is this cron job
still alive," inferred from its side effects in our own DB. It:

- Runs against the FL platform's Supabase, not against any tenant's live
  site.
- Has no concept of a tenant custom domain, HTTP status code, or deployment.
- Would not have fired for this incident under any configuration — it isn't
  the right *kind* of check, not merely misconfigured. Nycmaid's domain
  serving a stale deployment doesn't touch `notifications` or `email_logs`
  write cadence in a way this check would notice (the tenant's OWN crons
  route through the FL platform's infra, not through whatever
  `thenycmaid.com` resolves to at the edge — the two are decoupled).

### 2b. Fortress (`platform/src/lib/tenant-health.ts` + `platform/src/app/api/cron/tenant-health/route.ts`)

This is the actual synthetic-ish monitor — it does live `fetch()` calls
against each tenant's custom domain. It was built specifically in response
to a prior incident (its own doc comment: "Detects the failure modes that
caused the 2026-07-08 template-cutover outage"). Per tenant it checks:

| Check | What it does |
|---|---|
| `reachable` | homepage returns 2xx |
| `routing` | homepage's `x-matched-path` matches `/site/<slug>` (not the generic template) |
| `noLoop` | no apex↔www redirect loop |
| `formWired` | `GET /api/lead` returns anything but 404 (route exists) |

Two independent reasons this specific incident falls entirely outside what
Fortress covers:

**(i) `/api/health` is never probed.** Fortress's four checks are homepage
reachability/routing/loop-detection plus one specific API route
(`/api/lead`), chosen because those were the symptoms of the 07-08
template-cutover incident it was built for. It has no general "is the
deployment serving current API routes" check and no `/api/health` probe at
all. Even for a tenant that *isn't* excluded (see next point), a stale
deployment that still serves a 200 homepage (from edge cache, exactly as
happened here) and still has *some* working `/api/lead` route would pass
Fortress cleanly while `/api/health` sits 404. `/api/lead` and `/api/health`
are different routes — nothing here guarantees one implies the other is
wired in a given deployment.

**(ii) nycmaid is explicitly excluded from Fortress, by name:**

```ts
// platform/src/app/api/cron/tenant-health/route.ts:29-32
// Tenants intentionally NOT served by FL right now — checking them is noise:
//  - nycmaid: still on its standalone build (FL cutover not done). REMOVE after cutover.
//  - fla-dumpster-rentals: intentionally left standalone.
const EXCLUDED_TENANTS = new Set<string>(['nycmaid', 'fla-dumpster-rentals'])
```

This is a deliberate, reasonable-at-the-time decision: nycmaid's site isn't
served by the FL platform's Next app yet (it's "still on its standalone
build"), so Fortress's `routing` check (which expects `x-matched-path:
/site/nycmaid`) would false-positive-fail on every run, since a standalone
deployment obviously doesn't route through the FL platform's `/site/<slug>`
convention. Silencing that noise was correct given Fortress's design. The
cost nobody priced in: **excluding nycmaid from `routing` also excluded it
from `reachable`, `noLoop`, and `formWired` — the entire check, not just the
one sub-check that didn't apply.** Fortress is all-or-nothing per tenant.
The flagship, live-primary, highest-traffic tenant has had **zero** automated
uptime coverage since this exclusion was added, for exactly the reason
stated in its own comment: it's on a different deployment than everything
Fortress was built to check. The `// REMOVE after cutover` note confirms
this was known to be a temporary/incomplete state, not a considered
decision to leave nycmaid permanently unmonitored — it just never got
revisited.

### 2c. Why "the dashboard would have shown it" doesn't hold either

`platform/src/app/admin/tenant-health/page.tsx` reads the `tenant_health`
table that Fortress's cron populates. Since nycmaid is excluded from the
cron, it has **no row** in `tenant_health` at all — not a stale "last known
pass," not a "never checked" placeholder, nothing. An admin looking at the
dashboard during the incident would have seen every *other* tenant green and
simply not seen nycmaid listed, which reads as "nothing to report" rather
than "unmonitored." A missing row is a worse UX than a red row.

---

## 3. Root cause of the gap (one sentence each)

1. Fortress's `/api/lead`-only route probe doesn't cover `/api/health` or
   general API-route staleness — a design gap independent of nycmaid.
2. nycmaid's exclusion from Fortress silences its one legitimately-noisy
   sub-check (`routing`) by silencing *all four* checks, including the three
   that would have applied fine to a standalone deployment.
3. `/api/cron/health-monitor` is a different tool for a different job
   (internal cron liveness) and was never going to catch this class of
   failure regardless of nycmaid's inclusion status.
4. Every check that exists runs **from inside the FL platform's own Vercel
   deployment**, on a schedule gated by that same deployment being healthy —
   there is no monitoring path independent of the platform's own infra.
5. The single alert channel (`alertOwner()` → one Telegram chat, silently
   returns `null` and drops the alert if `JEFE_BOT_TOKEN`/chat-id env vars
   are ever unset — `platform/src/lib/telegram.ts:63-69`) has no fallback,
   no retry, and no escalation if unacknowledged.

---

## 4. Proposed fix: external synthetic monitoring, per-tenant custom domain, `/api/health`-first

The task-level ask is specifically "external synthetic monitoring (per-tenant
custom-domain `/api/health` probe + alert)." Concretely:

### 4a. Add a `/api/health`-specific check, for every live tenant, no exclusions

Extend `checkTenant()` (or add a sibling check run alongside it) with a fifth
check that GETs `https://<domain>/api/health` and validates:
- status is `200` (or `503` if `checks` reports a degraded-but-live app —
  either is "the deployment is current," a bare 404 is not)
- `content-type` is `application/json`, not `text/html` — this is the
  detail that would have caught the exact 07-12 symptom immediately: a stale
  deployment returns Next.js's generic HTML 404 shell
  (`x-matched-path:/404`), not this app's JSON response, even before
  checking the status code.
- response body actually parses as JSON with a `status` field — belt and
  suspenders against a host that 200s with an unrelated page.

This check should run for **nycmaid and every currently-excluded tenant
too** — `/api/health` doesn't depend on FL's `/site/<slug>` routing
convention, so it's meaningful even for a standalone deployment, unlike the
existing `routing` check. Recommend splitting `EXCLUDED_TENANTS` semantics:
keep excluding standalone tenants from the FL-routing-specific checks
(`routing`, `formWired` if `/api/lead` isn't the same route on their
standalone build), but run `reachable` + the new `/api/health` check
unconditionally for any tenant with a live domain, FL-hosted or not. An
unmonitored flagship is a worse failure mode than a noisy `routing` check
that a human already knows to ignore.

### 4b. Make it genuinely external, not just "another FL cron"

Everything today runs from inside the same Vercel project it's checking.
That's fine for catching app-level bugs (the 07-08 template-cutover case)
but structurally can't catch "this project's own cron/deployment pipeline is
degraded" or "this specific domain's binding is broken but the rest of the
project is fine" with full confidence — and in this incident specifically,
relying on FL's own infra to notice FL's own infra problem is circular.
Recommend a genuinely external prober:
- A third-party synthetic-monitoring service (UptimeRobot, Checkly, Better
  Stack/Better Uptime, Pingdom — any of these support a JSON-body/status-code
  assertion on a GET, which is all this needs) hitting
  `https://<each-tenant-custom-domain>/api/health` on a **tight interval**
  (5–15 min, not once-daily like the current `health-check` cron entry in
  `vercel.json`) from infra outside Vercel entirely.
  - Tenant domain list should be generated from the same source Fortress
    already unions (`tenants.domain` + `tenant_domains` where `active`) so
    the two never drift — export it as a small JSON/CSV artifact on a
    schedule, or give the monitoring service read access to a
    purpose-built `GET /api/admin/monitored-domains` endpoint (auth'd,
    admin-only) that returns exactly that union, live.
  - This is infrastructure/vendor setup, not a code change this worktree can
    apply — flagging it as the concrete next step for whoever has
    billing/ops access, same posture as W4's Vercel-access handoff.
- If a third-party vendor isn't wanted, the cheaper fallback is a scheduled
  job on infra that is NOT the `platform` Vercel project (a separate small
  Vercel project, a GitHub Actions scheduled workflow, a Fly.io/Railway cron
  — anything whose failure domain doesn't overlap with the thing being
  checked) running the same `/api/health` probe and posting to the same
  Telegram alert path. Materially less robust than a real synthetic-uptime
  vendor (still Vercel-adjacent if choosing another Vercel project) but
  strictly better than today's zero external coverage.

### 4c. Fix the alert path itself while touching this

Independent of the monitoring gap, `alertOwner()` is a single Telegram
channel that silently no-ops if env vars are missing
(`platform/src/lib/telegram.ts:66`, `if (!chatId || !token) return null`) —
no error surfaced, no fallback channel, nothing in logs beyond a `null`
return that most callers `.catch(() => {})` past anyway (see
`tenant-health/route.ts:70,133`). For a flagship-down alert specifically,
recommend:
- A second channel (email via existing `email_logs` infra, or SMS via the
  existing Telnyx integration already used for tenant-facing SMS) as a
  fallback when Telegram send fails or returns `null`.
- Escalation on repeat failure: if the same domain fails 2+ consecutive
  external-monitor checks (i.e. genuinely down, not a single flaky
  timeout), escalate beyond Telegram — this is exactly the "silent for 8
  hours" scenario, and a single unacknowledged Telegram message is not a
  suf­ficient stop-gap for the flagship tenant.

### 4d. Close the `EXCLUDED_TENANTS` intent gap

The `// REMOVE after cutover` comment on nycmaid's exclusion is a TODO that
had no tracking beyond the comment itself, which is how an intentional
short-term suppression became an unnoticed 100%-blind-spot for the platform's
most important tenant. No code fix for this beyond 4a's unconditional
`/api/health` check, but recommend: any future `EXCLUDED_TENANTS`-style
suppression should default to "excluded from the FL-specific check, included
in the generic reachability/`/api/health` check" rather than an all-or-nothing
skip, so the failure mode of "we forgot to revisit this TODO" degrades to
"one noisy false-positive sub-check" instead of "zero monitoring."

---

## 5. What this doc does not do

- Does not confirm or fix the underlying Vercel domain→deployment binding —
  that's W4's finding (`deploy-prep/nycmaid-stale-deployment-finding.md`,
  p1-w4, unmerged here) and needs a human with Vercel dashboard access.
- Does not implement the `/api/health` check, the external monitor, or the
  alert-fallback — all NOT APPLIED, proposal only, per this lane's
  file-only/non-gated charter. No code changed, no Vercel/vendor account
  touched.
- Does not re-scope `EXCLUDED_TENANTS` in code (§4d is a recommendation for
  the next person to touch `tenant-health/route.ts`, not a diff here) —
  deliberately left as a design note since the concrete `/api/health` check
  in §4a is the actionable, narrowly-scoped fix; broadening exclusion
  semantics touches live alerting behavior and should get its own
  review/PR rather than ride in on this analysis doc.

## Cross-references

- `deploy-prep/nycmaid-stale-deployment-finding.md` (p1-w4, commit
  `6aa29740`, not yet merged into `p1-w6`) — the incident this doc analyzes.
- `deploy-prep/branch-integration-plan.md` §1 — w4's file-touch map; this
  finding will land when w4 merges per the recommended `w1→w3→w4→w2→w6→w5`
  order.
- `platform/src/lib/tenant-health.ts`, `platform/src/app/api/cron/tenant-health/route.ts`
  — Fortress, analyzed in §2b.
- `platform/src/app/api/cron/health-monitor/route.ts` — the unrelated
  internal-cron-liveness checker, analyzed in §2a.
- `platform/src/app/api/health/route.ts` — the `/api/health` endpoint itself
  (DB + env-var checks only; works correctly on the main host per W4's probe
  — the bug is deployment binding, not this route's logic).

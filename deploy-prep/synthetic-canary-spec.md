# Synthetic Per-Flow Canaries — Spec (DOCS ONLY — no DB writes, no deploy)

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12
**Status:** design spec. No canary job, cron entry, or test tenant was created. Nothing here has run.

**Verification anchors read this pass:** `platform/src/app/api/client/login/route.ts` (PIN login),
`platform/src/app/api/portal/collect/route.ts` (lead-capture funnel), `platform/src/app/api/payments/checkout/route.ts`
(Stripe checkout session), `platform/src/app/api/bookings/route.ts` (booking create), `platform/src/app/api/admin/cleanup-test-bookings/route.ts`
(existing test-data patterns/purge route), `platform/vercel.json` (existing cron cadences), and
`deploy-prep/health-monitor-coverage-gap.md` (this worker's prior analysis of the two existing
health-check systems — read in full to avoid duplicating that work).

---

## 0. How this differs from the existing health-monitor work (don't duplicate it)

`deploy-prep/health-monitor-coverage-gap.md` (same worker, this branch) already covers **reachability**
monitoring: Fortress (`/api/cron/tenant-health`) hits each tenant's homepage + `/api/lead` and checks for
2xx/correct-routing/no-redirect-loop; that doc's proposal extends it with an `/api/health` JSON-response
check. That is a **shallow, is-the-deployment-up** layer — it proves a route exists and returns something,
not that the underlying flow actually works end-to-end.

This spec is a different, deeper layer: **functional canaries** that actually walk a real flow — submit a
real lead form, create a real booking, run a real (test-mode) Stripe charge, log in with a real PIN —
against a dedicated test tenant, and assert on the *business outcome* (a row was created, an email/SMS
would have fired, a session cookie was issued), not just an HTTP status code. The two are complementary:
Fortress would not have caught "the lead-capture route 200s but the `notify()` call inside it silently
swallows an error and no admin ever gets the SMS" — this layer would.

---

## 1. Test tenant

- **A single dedicated test tenant** (e.g. `tenant.slug = 'fl-canary'`), created like any other tenant
  (not a special-cased code path — consistent with `platform/CLAUDE.md`'s global-architecture rule: no
  per-tenant forks, canaries just run against tenant *data* like anything else).
- Seeded with: one service/pricing config, one team member, one client with a known PIN, Stripe in
  **test mode** for that tenant's Stripe Connect account (never live-mode keys — canaries must never
  move real money).
- All canary-created records (leads, bookings, clients) use the **same recognizable test patterns
  already established** in `platform/src/app/api/admin/cleanup-test-bookings/route.ts`
  (`TEST_PHONE_PATTERNS`, `TEST_EMAIL_PATTERN`, `TEST_NAME_PATTERNS`) so the existing purge route can
  clean up canary output without new code, and so canary data is trivially distinguishable from real
  customer data in any dashboard/report an admin looks at.
- Excluded from customer-facing aggregate reporting (SEO rollups, revenue dashboards, `daily-summary`
  cron) the same way any other test/demo tenant would need to be — flagged as a dependency, not solved
  here: whatever mechanism already exists (or needs to exist) to exclude demo tenants from platform-wide
  aggregates must also cover `fl-canary`.

---

## 2. The four flows, what each asserts, cadence, alert path

| Flow | Route(s) exercised | What it asserts | Cadence | On fail |
|---|---|---|---|---|
| **Lead capture** | `POST /api/portal/collect` (or `/api/lead`, `/api/ingest/lead` depending on entry point being tested) | 200 response; a `portal_leads` row was inserted for `fl-canary` within the last N seconds (queried directly, not inferred from the HTTP response); no unhandled exception in the route (checked via existing error-tracking, `trackError` calls in that route) | Every 15 min | Telegram alert (same channel as Fortress) tagged `[CANARY][lead-capture]`, include the request id and the specific assertion that failed |
| **Booking** | `POST /api/bookings` (authenticated as the seeded test team member) | 200/201; a `bookings` row exists for `fl-canary` with the expected service/price; booking triggers whatever `notify()`/SMS the real flow would call to (assert the call was made, not that the SMS was delivered — in test mode this should be mockable/no-op, or should use a temporary test-tenant phone number that log-only) | Every 30 min | Same alert path, tagged `[CANARY][booking]` |
| **Checkout** | `POST /api/payments/checkout` against the booking created above | 200 with a Stripe **test-mode** Checkout session URL returned; session references the correct booking/tenant; explicitly assert the Stripe key resolved for `fl-canary` is a test key before calling (hard-fail the canary itself, not just the assertion, if a live key is ever detected — this canary must never be able to move real money) | Every 30 min (after the booking canary) | Same alert path, tagged `[CANARY][checkout]`; a checkout failure is revenue-affecting for every tenant, so this flow's alert should be treated as higher severity than lead-capture/booking |
| **Portal login** | `POST /api/client/login` with the seeded test client's known PIN | 200; a valid client-session cookie is issued (decode and verify, don't just check `Set-Cookie` is present); a wrong-PIN attempt in the same run correctly 401s (catches an accidental auth-bypass regression, not just "the happy path still works") | Every 15 min | Same alert path, tagged `[CANARY][portal-login]` |

**Run order matters for booking→checkout**: the checkout canary depends on a booking existing, so it
should run as a follow-up step of the booking canary's own job (or query for a recent canary booking),
not as an independent cron entry that might race against a booking canary that hasn't completed yet.

---

## 3. Cadence rationale

- **15 min for lead-capture and portal-login** — these are the two flows a prospective customer touches
  before ever talking to a human; an outage here silently kills top-of-funnel and nobody notices from
  revenue numbers for days. Matches the "tight interval, not once-daily" recommendation already made in
  `health-monitor-coverage-gap.md` §4b for the same reason.
- **30 min for booking/checkout** — still frequent enough to catch an outage within the same business
  hour, but slightly wider than the top-of-funnel flows since these involve more downstream side effects
  (SMS sends, Stripe API calls) that shouldn't be run at 15-minute density against a real (even if
  test-mode) Stripe account and shared SMS-sending infra other real tenants share.
- **Explicitly not tied to the existing once-daily `health-check` cron** (`platform/vercel.json`,
  `0 12 * * *`) — that cadence was sized for a shallow reachability ping, not for flows where an outage
  has direct revenue impact within hours.

---

## 4. Alert-on-fail path

- **Reuse the existing Telegram alert path** (`alertOwner()` / `platform/src/lib/telegram.ts`) rather than
  inventing a second notification channel — but see the same gap already flagged in
  `health-monitor-coverage-gap.md` §4c: that function silently no-ops if `JEFE_BOT_TOKEN`/chat-id env vars
  are unset, with no fallback. Canary alerts inherit that same single-point-of-failure until that gap is
  fixed; **do not build a second, separate alert mechanism just for canaries** — fix the shared one once,
  for both consumers, rather than duplicating a fragile pattern.
- **Distinguish canary alerts from tenant-health alerts** by message prefix (`[CANARY][<flow>]`) so
  whoever reads the Telegram channel can tell "a real tenant's site is down" from "our own synthetic test
  flow broke" — the response urgency differs (canary-only failures might mean the canary itself is stale,
  e.g. a schema change broke the seed data, not that customers are affected).
- **Two consecutive failures required before alerting**, not one, to avoid paging on a single transient
  blip (a Stripe test-mode rate limit, a cold-start timeout) — this mirrors ordinary synthetic-monitoring
  practice and avoids the alert-fatigue failure mode already described for the single-channel Telegram
  path in `health-monitor-coverage-gap.md`.
- **Canary run results + last-success timestamp per flow are stored** (small table or reuse `tenant_health`
  shape, one row per flow) so a dashboard can show "lead-capture last passed 12 min ago" the same way
  Fortress's dashboard does today (`platform/src/app/admin/tenant-health/page.tsx`) — avoids repeating the
  "missing row reads as nothing-to-report" UX bug already identified in that doc §2c.

---

## 5. What this spec does NOT cover (explicitly out of scope)

- Creating the `fl-canary` test tenant itself, or the seed script for it — a prerequisite, not built here.
- Implementing the cron routes / job runner for these four checks — this defines what each check must
  assert and at what cadence; implementation is a separate task.
- Fixing the shared Telegram alert single-point-of-failure (§4) — already flagged as an open item in
  `health-monitor-coverage-gap.md`; this spec depends on that fix but doesn't re-scope it here.
- Third-party synthetic-monitoring vendor selection — `health-monitor-coverage-gap.md` §4b already covers
  that decision for the reachability layer; if a vendor is chosen there, these functional canaries could
  run as an additional check within the same vendor rather than a bespoke Vercel cron, but that's an
  implementation choice for whoever builds this, not specified here.

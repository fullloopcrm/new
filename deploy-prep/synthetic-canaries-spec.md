# Synthetic Canaries — Per-Flow Design Spec

**Author:** W4 (verification-harness lane) · **Branch:** `p1-w4` · **Date:** 2026-07-12
**Status:** design doc · doc-only · no code/routes/DB touched · **not yet built**

---

## 0. TL;DR (read this first)

- **What exists today:** the Fortress cron `/api/cron/tenant-health`
  (`vercel.json` schedule `*/15 * * * *`) does **shallow, GET-only, side-effect-free**
  probes — homepage reachable, serves its own `/site/<slug>` (not the template),
  no redirect loop, and the lead route is *present* (`GET /api/lead` ≠ 404). See
  `src/lib/tenant-health.ts`. It never POSTs, never creates a row.
- **What this spec adds:** **deep** synthetic canaries that actually drive the
  four revenue-critical flows — **booking, checkout, lead-capture, portal-login** —
  end-to-end against a **dedicated test tenant**, and assert the *outcome*
  (correct tenant row written / correct session minted / correct price), not just
  "the route answers."
- **The load-bearing tension:** three of these four flows have **real side
  effects and real cost** on a live tenant — a lead POST writes `clients` +
  `portal_leads` and emails admins (`src/app/api/lead/route.ts`); portal-login
  `send_code` sends a real SMS via Telnyx and is rate-limited 5/15min
  (`src/app/api/portal/auth/route.ts`); checkout creates a Stripe session. **A
  canary cannot safely run against a production tenant.** This spec's #1
  prerequisite is a **designated canary tenant** with test-mode payment keys,
  suppressed notifications, and a cleanup path. **No such tenant exists today**
  (there are 100 seeded test tenants from `scripts/seed-100-tenants.ts`, but none
  has a live domain wired as a canary target). See §1.
- **Reuse the existing alert path:** `alertOwner(subject, body)` from
  `@/lib/telegram` — already used by the Fortress cron on failure
  (`src/app/api/cron/tenant-health/route.ts:133`). Canaries alert the same way.

---

## 1. Prerequisite: the canary tenant (blocking)

A deep canary POSTs through real handlers, which resolve the tenant from the
**host** (middleware → signed `x-tenant-id`, `src/middleware.ts:303 rewriteToSite`
→ `getTenantFromHeaders`, `src/lib/tenant-site.ts:24`). To exercise that real
resolution path, the canary must hit a **real domain that maps to a real tenant
row**. Requirements for that tenant:

| Requirement | Why | Grounding |
|---|---|---|
| Own live domain (or platform subdomain) | so middleware resolves it like any customer; proves routing end-to-end | `src/middleware.ts:216-252` |
| Stripe **test-mode** keys | checkout canary must not create live charges | payment side-effect (§4) |
| Notifications suppressed / routed to a canary inbox | lead + booking canaries email admins and notify; must not page a human | `emailAdmins`, `notify` in `src/app/api/lead/route.ts:13-17` |
| A cleanup routine | lead/booking canaries write rows every run; unbounded growth otherwise | `clients`, `portal_leads`, `bookings` inserts |
| Marked so it is **excluded from prod reporting** | a synthetic tenant must not pollute revenue/analytics dashboards | operator hygiene |

**Recommendation:** designate one tenant (e.g. slug `canary` /
`canary.homeservicesbusinesscrm.com`), tag it (`tenants.is_synthetic = true` — new
column, leader/DB call, NOT in this lane), and have every canary assert against
*that* tenant_id only. Until this tenant exists and is tagged, canaries can only
run in the **shallow, GET-only** mode Fortress already covers — i.e. this spec is
**blocked on the canary-tenant decision.**

---

## 2. Canary: Booking flow

**Target handler(s):** `POST /api/client/book` (guest → booking created) — the
revenue-entry path flagged **untested / HIGH gap** in `e2e-flow-coverage.md §2`.

| Field | Value |
|---|---|
| **What it hits** | `POST https://<canary-domain>/api/client/book` with a fixed synthetic payload (known service, date, address in the tenant's service area) |
| **Expected assertion** | 2xx **and** a `bookings` row exists with `tenant_id = <canary>`, the **expected price** (matches the tenant's tier/quote math), and status = the expected initial state. Assert *tenant scope* and *price*, not just HTTP 200. |
| **Negative assertion** | the created row's `tenant_id` is the canary's and nothing was written under any other tenant (guards the silent cross-tenant write). |
| **Side effects** | writes a `bookings` row (+ possibly notifications). **Requires cleanup** — delete or mark the canary booking each run, or reuse a fixed booking id. |
| **Cadence** | every **30 min** (booking is the money-entry flow; catch a break within one support window). |
| **Alert** | `alertOwner('🐤 Canary: booking flow FAILING', detail)` after **2 consecutive** failures (avoid single-run flakiness paging). |

---

## 3. Canary: Checkout / payment flow

**Target handler(s):** `POST /api/payments/checkout` (Stripe session) — flagged
**untested / HIGH gap** in `e2e-flow-coverage.md §3`. (The *team-portal* checkout
math is already unit-covered; this canary covers the **client-facing** capture.)

| Field | Value |
|---|---|
| **What it hits** | `POST https://<canary-domain>/api/payments/checkout` for a fixed canary invoice/booking, using the canary tenant's **Stripe TEST keys** |
| **Expected assertion** | a Stripe **Checkout Session** is returned, scoped to the canary tenant's Stripe account, for the **expected amount** (cents match the source invoice/booking). |
| **Depth note** | assert **session creation** only — do **not** attempt to complete payment via a synthetic card automatically unless a Stripe test-card + webhook-replay harness is stood up separately. Payment-webhook → paid-state is a *separate* canary (see §6, deferred). |
| **Side effects** | test-mode Stripe session (no live charge). No DB write if session-create is read-only; verify before enabling. |
| **Cadence** | every **1 h** (money-in; Stripe outages/key-rotation are the failure modes). |
| **Alert** | `alertOwner` after **2 consecutive** failures. A checkout-canary failure is HIGH — it means new customers cannot pay. |

---

## 4. Canary: Lead-capture flow

**Target handler(s):** `POST /api/lead` (`src/app/api/lead/route.ts`) — the public
capture path flagged **untested / MEDIUM-HIGH** in `e2e-flow-coverage.md §4`.

| Field | Value |
|---|---|
| **What it hits** | `POST https://<canary-domain>/api/lead` with a fixed synthetic lead (`{type,name,email,phone,details,source}`), `source: 'canary'` |
| **Expected assertion** | 2xx **and** a `clients` + `portal_leads` row lands under `tenant_id = <canary>` with the submitted fields (name/phone/source preserved, non-standard fields folded into notes per `buildLeadNotes`, `route.ts:40`). |
| **Side effects (important)** | this handler **emails admins** (`emailAdmins`, `route.ts:13`) and calls `notify` — so the canary tenant's admin-contact + notify targets **must** point at a canary inbox, not a human operator. Also writes rows → **cleanup required**. |
| **Rate-limit note** | the route rate-limits per-something via `rateLimitDb` (`route.ts:15`); a per-15-min cadence stays well under any sane cap. |
| **Cadence** | every **15 min** (top-of-funnel; silent lead loss is invisible and directly costs pipeline). |
| **Alert** | `alertOwner` after **2 consecutive** failures. |

---

## 5. Canary: Portal-login flow

**Target handler(s):** `POST /api/portal/auth` `action:'send_code'` →
`action:'verify_code'` (`src/app/api/portal/auth/route.ts`) — the session-mint
happy path flagged **untested / MEDIUM** in `e2e-flow-coverage.md §5`.

| Field | Value |
|---|---|
| **What it hits** | `send_code` for a **fixed canary client phone** under the canary tenant, then `verify_code` with the code |
| **The SMS problem** | `send_code` sends a **real SMS via Telnyx** and is rate-limited **5 / 15 min** (`route.ts:20`). Two safe options: (a) the canary client's phone is a Telnyx test/loopback number the canary can read the code from; or (b) run **`verify_code`-only** against a pre-seeded, known code and assert session-mint, skipping the live SMS send. Prefer (b) to avoid per-run SMS cost. |
| **Expected assertion** | `verify_code` returns a valid portal session/token **scoped to the canary tenant + canary client** (not a global or other-tenant session). |
| **Cadence** | every **30 min** (auth outages block existing customers, not new revenue — slightly lower urgency than booking/lead). |
| **Alert** | `alertOwner` after **2 consecutive** failures. |

---

## 6. Deferred / out-of-scope canaries (flagged, not specced)

- **Payment-webhook → paid-state transition** — asserting a captured Stripe
  payment flips the invoice/booking to paid. Needs a webhook-replay harness;
  `e2e-flow-coverage.md §3` marks this untested. Real gap, separate build.
- **Booking → confirmation SMS/email delivery** — end-to-end delivery assertion
  (not just row written). Needs read access to the canary's outbound channel.
- **Multi-tenant leak canary** — one synthetic request that asserts it can *only*
  see the canary tenant's data (the positive complement to the existing
  `.isolation` tests). Cheap; worth adding.

---

## 7. Shared infrastructure (how a canary cron would be shaped)

Mirror the Fortress cron exactly — it is the proven pattern:

- **Route:** a new `GET /api/cron/canaries` (leader/build call — **not** authored
  in this read-only lane), gated by `Authorization: Bearer $CRON_SECRET`
  (`tenant-health/route.ts:53`), `export const dynamic = 'force-dynamic'`,
  `maxDuration` raised for the multi-step flows.
- **Scheduling:** add per-cadence entries to `vercel.json crons` (Vercel's min
  granularity is 1 min; the cadences above are 15m/30m/1h).
- **State:** persist last-result per flow to a `canary_runs` table (new — DB
  call), so a dashboard can show freshness (same staleness lesson as Fortress —
  see `fortress-health-coverage-audit.md §3`: the board must surface *when the
  canary last ran*, or a dead canary reads as all-green).
- **Alerting:** `alertOwner` (Telegram), 2-consecutive-failure debounce, and —
  critically — a **heartbeat** so that a canary cron that **stops running** is
  itself alerted (the Fortress cron currently lacks this; do not repeat the gap).
- **Idempotency/cleanup:** each write-canary either reuses a fixed row id
  (upsert) or deletes its synthetic rows at the end of the run.

---

## 8. What I verified vs. did not

- **Verified (static, this working tree):** the Fortress cron's GET-only,
  no-row-created probe design (`src/lib/tenant-health.ts`,
  `src/app/api/cron/tenant-health/route.ts`); the `alertOwner`/`CRON_SECRET`
  alert+auth pattern; the lead handler's admin-email + row-write side effects
  (`src/app/api/lead/route.ts`); the portal-auth SMS send + 5/15min rate limit
  (`src/app/api/portal/auth/route.ts`); tenant resolution via signed
  `x-tenant-id` (`src/middleware.ts`, `src/lib/tenant-site.ts`); the four flows'
  untested-happy-path status (`deploy-prep/e2e-flow-coverage.md`); absence of any
  existing canary tenant / canary cron (grep: the only `canary` hits are the SEO
  autopilot rate-cap, unrelated).
- **Did NOT verify:** live/prod behaviour (no prod access); the exact
  request/response contract of `client/book` and `payments/checkout` (I did not
  read every field — payloads above are illustrative and must be confirmed
  against the handlers before a canary is coded); whether `payments/checkout`
  writes any DB row; whether a Telnyx test/loopback number is available for the
  portal-login canary. **This spec is a design, not an implementation — nothing
  here has been built or run.**

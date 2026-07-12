# Test-Coverage Scoreboard — Critical-Flow Happy-Path Status

**Author:** W4 (verification-harness lane) · **Branch:** `p1-w4` · **Date:** 2026-07-12
**Companion to:** [`e2e-flow-coverage.md`](./e2e-flow-coverage.md) (gap register) and
[`test-coverage-gap-closure-plan.md`](./test-coverage-gap-closure-plan.md) (forward plan)
**Purpose:** one glance — per critical flow, does a positive happy-path lock
exist *after this session*, which file proves it, and what still has none.

> **Scope note.** "Covered" here means a **positive, payload-asserting happy-path
> test** exists on `p1-w4` — it captures the write (not just HTTP 200) and has a
> negative companion so it can't pass vacuously. Many flows also have
> tenant-scoping *isolation* tests (`*.isolation.test.ts`); those guard against
> leaks but do **not** prove the flow works, so they don't count as happy-path
> coverage below. Both are cited where relevant.

---

## Scoreboard

| Flow | Happy-path? | Proof (committed on `p1-w4`) | Gap # |
|---|---|---|---|
| **Booking create** (revenue entry) | ✅ COVERED | `platform/src/app/api/client/book/route.happy-path.test.ts` (`fd733ef9`) | 3 |
| **Client login** (portal auth) | ✅ COVERED | `platform/src/app/api/client/login-flow.happy-path.test.ts` (`19bdbb26`) | 5 |
| **Team-portal job lifecycle** (claim→pay→release) | ✅ COVERED | `platform/src/app/api/team-portal/jobs/lifecycle.happy-path.test.ts` (`dc508e58`) | 6 |
| **Notification dispatch** (lead/booking → notify routing) | ✅ COVERED *(this session)* | `platform/src/lib/notify.happy-path.test.ts` (`546cc8d3`) | (cross-cuts 4) |
| **Referral flow** (create → attribution → commission) | ✅ COVERED *(this session)* | `platform/src/app/api/referral-commissions/route.happy-path.test.ts` (`af03c9da`) | new |
| **Checkout / payment capture** (money-in settle) | ⬜ NONE | — (plan §1: `payments/checkout`, `webhooks/stripe`) | 2 |
| **Lead capture → CRM row** (funnel entry) | ⬜ NONE | — (plan §2: `lead/route`, `contact`, `apply`) | 4 |
| **Data-export / deletion** (GDPR/CCPA) | ⛔ BLOCKED | code not on this branch (plan §3) | 1 |
| **Platform-wide E2E / browser journey** | 🚩 OUT-OF-LANE | infra, leader-gated (plan §4) | 7 |

**Tally:** 5 critical flows now have happy-path locks (3 prior + **2 this
session**); 2 remain uncovered but authorable from this lane (gaps #2, #4); 1 is
blocked off-branch (#1); 1 is out-of-lane infra (#7).

---

## What each of this session's two new tests actually proves

### Notification dispatch — `notify.happy-path.test.ts` (`546cc8d3`)
`notify()` is the single fan-out every lead/booking signal routes through. The
lock asserts the three load-bearing behaviors of the router:
1. **Tenant-scoped** — the persisted `notifications` row *and* the recipient
   lookup both carry the caller's `tenant_id` (no cross-tenant row, no
   cross-tenant recipient leak).
2. **Routable → sent** — a configured email notification calls the transport
   with the resolved admin address and finalizes the row `sent` (by id).
3. **Unroutable → `skipped`, not `failed`** — when the tenant has no email
   transport, the in-app row is still persisted but finalized `skipped` and
   returns `success:false` — the exact classification the delivery-rate health
   check depends on. Plus: no resolvable tenant → no-op, nothing persisted.

*What remains for this flow:* only the `email`→`admin` route with the
channel-unconfigured unroutable case is locked. **Not yet covered:** the
SMS-primary route, the email↔SMS **fallback ladder** (`_fallback` metadata), the
`client`/`team_member` recipient branches, and the comms-preference **gate**
(`_gated`, forced enabled here). Follow-on if leader wants depth.

### Referral flow — `referral-commissions/route.happy-path.test.ts` (`af03c9da`)
End-to-end revenue-share, create → attribution → commission:
1. **Create** — `POST /api/referrals` persists a `referrals` row tenant-scoped
   with the minted `referral_code` (raw `code` stripped) and audits it.
2. **Attribution** — the commission POST reads the booking (carrying
   `referrer_id`) and the referrer **tenant-scoped**.
3. **Commission** — computes `round(gross × rate)` (asserted `20000 × 0.15 =
   3000`), persists a tenant-scoped `referral_commissions` row `pending`, bumps
   `referrer.total_earned` by exactly that amount, and posts the accrual to the
   ledger. Idempotent: a booking that already has a commission → `409`, zero
   inserts, no accrual.

*What remains for this flow:* the **PUT `paid` transition** (bumps `total_paid`,
posts `postCommissionPayment` to clear the payable) is **not** covered — that's
the money-out half. Also uncovered: the referrer-portal **GET** read path
(`referrer_id`-scoped listing) and the `commission_rate` default-to-`0.10`
branch (test pins an explicit rate).

---

## Remaining uncovered critical flows (priority order — see plan for detail)

1. **Gap #2 · Checkout / payment** — `HIGHEST`. Largest untested $-exposure:
   Stripe checkout-session creation and the `checkout.session.completed` /
   `payment_intent.succeeded` → **paid** webhook transition (with idempotency).
   Mock the Stripe SDK; this lane never touches live keys.
2. **Gap #4 · Lead capture → CRM row** — `HIGH`. Top-of-funnel; a silent lead
   drop is invisible. Only the ingest *auth gate* is covered today, and now the
   downstream `notify()` fan-out (this session) — but **not** the `lead/route`
   insert itself.
3. **Gap #1 · Data-export / deletion** — `CRITICAL but BLOCKED`. Code is not on
   `p1-w4` (export on `p1-w1`, deletion on `p1-w2`, P3/P4 UI uncommitted).
   Unblocks the instant those routes land here or merge in.
4. **Gap #7 · Platform-wide E2E harness** — `OUT-OF-LANE`. Playwright against a
   preview deploy is infra + CI, leader-gated; slots after the unit-level
   payment coverage exists.

---

## Convention every lock shares (mirror it for the four remaining)

Chainable supabase builder that **captures the write payload** (not just HTTP
200) · keep the load-bearing pure/crypto/math logic **REAL**, mock only I/O +
side effects · one negative companion so the mock can't pass vacuously · `tsc
--noEmit` clean + `vitest run` green + a **separate `p1-w4` commit** per file.

**Verification of this session's two additions:** `npx tsc --noEmit` → clean;
`npx vitest run` on both files → 2 files / 6 tests passed (2026-07-12).

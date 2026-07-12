# Happy-Path Coverage — Final Consolidated Map

**Author:** W4 (verification-harness lane) · **Branch:** `p1-w4` · **Date:** 2026-07-12
**Supersedes/extends:** [`test-coverage-scoreboard.md`](./test-coverage-scoreboard.md)
(per-flow status) · companion to [`e2e-flow-coverage.md`](./e2e-flow-coverage.md)
(gap register) and [`test-coverage-gap-closure-plan.md`](./test-coverage-gap-closure-plan.md)
(forward plan).
**Purpose:** one place that lists **every happy-path lock that exists after this
session**, the file that proves each, and exactly what it asserts.

---

## ⚠️ Scope + honesty caveat (read first)

This map enumerates every `*.happy-path.test.ts` **present on branch `p1-w4`** —
the only branch visible from this worktree. Other workers author their locks on
their own branches (`p1-w1`, `p1-w2`, …); **those files are NOT in this worktree
and are NOT counted below.** "Across all workers" can only be produced truthfully
at merge time, when the branches are integrated. When that happens, re-run:

```bash
find . -name "*.happy-path.test.ts" -not -path "*/node_modules/*" | sort
```

against the merged tree and fold any new files into this table. Everything below
is verified-present and green **on `p1-w4` as of 2026-07-12**.

"Happy-path lock" = a **positive, payload-asserting** test that captures the DB
write (not just HTTP 200) and has a negative/edge companion so it can't pass
vacuously. Tenant-scoping `*.isolation.test.ts` files guard against leaks but do
**not** prove a flow works, so they are not counted here.

---

## The locks (7 files on `p1-w4`)

| # | Flow | File | Commit | Added |
|---|---|---|---|---|
| 1 | **Booking create** (revenue entry) | `platform/src/app/api/client/book/route.happy-path.test.ts` | `fd733ef9` | prior |
| 2 | **Client portal login** (send-code → verify → session mint) | `platform/src/app/api/client/login-flow.happy-path.test.ts` | `19bdbb26` | prior |
| 3 | **Team-portal job lifecycle** (claim → pay → release) | `platform/src/app/api/team-portal/jobs/lifecycle.happy-path.test.ts` | `dc508e58` | prior |
| 4 | **Notification dispatch** (lead/booking → notify routing) | `platform/src/lib/notify.happy-path.test.ts` | `546cc8d3` | this session |
| 5 | **Referral flow** (create → attribution → commission) | `platform/src/app/api/referral-commissions/route.happy-path.test.ts` | `af03c9da` | this session |
| 6 | **Apology-batch SMS opt-out** (TCPA suppression) | `platform/src/app/api/admin/send-apology-batch/route.opt-out.happy-path.test.ts` | `abf15441` | **this session** |
| 7 | **Quote lifecycle** (create → send → accept → deal close) | `platform/src/app/api/quotes/lifecycle.happy-path.test.ts` | `44b108fc` | **this session** |

**Aggregate on `p1-w4`:** 7 files · 18 tests (**17 passing + 1 expected-fail
tripwire**, see #6).

---

## What each lock proves

**1 · Booking create** (`fd733ef9`) — `POST /api/client/book` persists a booking
tenant-scoped, `status='pending'`, at the correct price; the DNS and same-date
duplicate **gate reads** are tenant-scoped.

**2 · Client portal login** (`19bdbb26`) — send-code → verify-code → session mint:
a valid session is minted and is tenant-scoped (real HMAC decode); the verify
lookup + code burn are tenant-scoped; a wrong code mints no session.

**3 · Team-portal job lifecycle** (`dc508e58`) — claim → double-claim (`409`) →
reassign → release state transitions; pay re-stamp; the release-guard and
daily-cap guard both hold.

**4 · Notification dispatch** (`546cc8d3`) — `notify()`, the single fan-out for
every lead/booking signal: (a) the persisted `notifications` row **and** the
recipient lookup are tenant-scoped; (b) a routable email → transport called with
the resolved admin address → row finalized `sent`; (c) an unroutable channel →
row finalized `skipped` **not** `failed` (`success:false`) — the health-check
classification; (d) no resolvable tenant → no-op, nothing persisted.

**5 · Referral flow** (`af03c9da`) — create → attribution → commission:
`POST /api/referrals` persists a tenant-scoped `referrals` row with a minted
code; the commission POST reads booking + referrer tenant-scoped, computes
`round(gross × rate)` (`20000 × 0.15 = 3000`), persists a tenant-scoped
`pending` commission, bumps `total_earned`, posts the ledger accrual; a booking
that already has a commission → `409`, zero inserts, no accrual.

**6 · Apology-batch SMS opt-out** (`abf15441`) — `POST /api/admin/send-apology-batch`:
the batch texts **only** the consenting client; opt-out, `do_not_service`, and
no-phone clients are each suppressed and tallied (`skipped_opt_out` / `_dns` /
`_no_phone`); the credit write is tenant-scoped to the caller; an all-opted-out
set transmits **zero** SMS.
→ **See the action item below** — this file also pins a live TCPA defect as an
`it.fails` tripwire (the 1 expected-fail).

**7 · Quote lifecycle** (`44b108fc`) — one quote driven create → send → accept
against a **stateful** DB: create persists a tenant-scoped `draft` with the real
`computeTotals` math + minted token and syncs the deal timeline/value; send
transitions `draft → sent` (stamps `sent_via`/`sent_at`) and emails the contact;
accept transitions `sent → accepted` with captured signature and — no deposit —
fires the close rule (deal → `sold`, `probability 100`, `closed_at` stamped, Job
spun up, owner notified). Plus: replaying accept on an accepted quote is an
idempotent no-op that does **not** re-fire fulfillment.

---

## 🔴 Action item surfaced this session — live TCPA defect (AUDIT.md #175)

The apology-batch lock (#6) exposed a **real compliance bug on `p1-w4`**, not just
a coverage gap:

- The customer **STOP** webhook (`platform/src/app/api/webhooks/telnyx/route.ts:163`)
  records an opt-out by writing **`clients.sms_consent = false`**.
- The apology batch (`platform/src/app/api/admin/send-apology-batch/route.ts:38,56`)
  gates on a **different column — `sms_opt_in`** — which the STOP path never
  touches (`sms_opt_in` defaults `true` in `supabase/schema.sql`).
- **Result:** a client who texted STOP still has `sms_opt_in = true` here → is
  **not** suppressed → the apology batch texts a customer who opted out. Statutory
  TCPA per-message exposure.

The `sms_consent`-gated behavior the fix must deliver is pinned as an `it.fails`
regression tripwire in the test (expected-failing on `p1-w4` because the
column-name fix — tracked as "W5 SMS opt-out fix" — is **not present in this
branch**). **When that fix lands** (route reads `sms_consent`), the tripwire
starts passing → vitest flags the unexpected pass → whoever merges removes
`.fails` to convert it into a hard lock.

**Leader decision needed:** route W5's `sms_consent` fix into `p1-w4` (or approve
a one-line route change) so the apology batch honors the STOP opt-out. Until
then, the opt-out guarantee is only partial (it honors `sms_opt_in`, which no
current opt-out path writes for clients).

---

## Still uncovered on `p1-w4` (priority order — detail in the closure plan)

1. **Checkout / payment capture** — `HIGHEST`. Largest untested $-exposure:
   Stripe checkout-session creation + the `checkout.session.completed` /
   `payment_intent.succeeded` → **paid** webhook transition (with idempotency).
   Authorable from this lane by mocking the Stripe SDK (never touches live keys).
2. **Lead capture → CRM row** — `HIGH`. Top-of-funnel; a silent lead drop is
   invisible. The downstream `notify()` fan-out is now locked (#4), but the
   `lead/route` **insert itself** is not.
3. **Data-export / deletion (GDPR/CCPA)** — `CRITICAL but BLOCKED`. The routes
   are not on `p1-w4` (export on `p1-w1`, deletion on `p1-w2`). Unblocks the
   instant they land/merge here.
4. **Platform-wide E2E / browser journey** — `OUT-OF-LANE`. Playwright against a
   preview deploy is infra + CI, leader-gated.

---

## Convention every lock shares (mirror it for the four remaining)

Chainable/stateful supabase mock that **captures the write payload** (not just
HTTP 200) · keep the load-bearing pure/crypto/math logic **REAL**, mock only I/O
+ side effects · at least one negative/edge companion so the mock can't pass
vacuously · `tsc --noEmit` clean + `vitest run` green + a **separate `p1-w4`
commit** per file.

**Verification (2026-07-12):** `npx tsc --noEmit` → clean; `npx vitest run`
across all 7 happy-path files → **7 files / 18 tests, 17 passed + 1 expected-fail
(the TCPA tripwire)**.

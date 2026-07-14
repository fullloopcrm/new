# Test-Coverage Gap-Closure Plan — Happy-Path Flows

**Author:** W4 (verification-harness lane) · **Branch:** `p1-w4` · **Date:** 2026-07-12
**Source of gaps:** [`e2e-flow-coverage.md`](./e2e-flow-coverage.md) §8 gap register
**Status:** planning doc · maps each remaining happy-path gap → a concrete test
file + priority + ordering. New-file test authoring only (verification lane); no
code/routes/DB touched.

---

## 0. Where we are (what's already closed)

Three of the seven register gaps are now closed with committed happy-path tests
on `p1-w4`. This plan covers the **remaining four**.

| Gap # | Flow | State | Test file (committed) |
|---|---|---|---|
| 3 | Booking | ✅ CLOSED | `platform/src/app/api/client/book/route.happy-path.test.ts` (`fd733ef9`) |
| 5 | Login | ✅ CLOSED | `platform/src/app/api/client/login-flow.happy-path.test.ts` (`19bdbb26`) |
| 6 | Portal actions | ✅ CLOSED | `platform/src/app/api/team-portal/jobs/lifecycle.happy-path.test.ts` (`dc508e58`) |
| 2 | Checkout / payment | ⬜ OPEN | see §1 |
| 4 | Lead capture | ⬜ OPEN | see §2 |
| 1 | Data-export / deletion | ⛔ BLOCKED (off-branch) | see §3 |
| 7 | Platform-wide E2E harness | 🚩 OUT-OF-LANE | see §4 |

All three closed tests share one convention (mirror it for the new ones): a
chainable supabase builder that **captures the write payload** (not just HTTP
200), keep the load-bearing pure/crypto logic **REAL**, mock only I/O + side
effects, and include one negative companion so the mock cannot pass vacuously.

---

## 1. Gap #2 — Checkout / payment capture  ·  **Priority: HIGHEST (do first)**

**Why first:** this is money-in on an existing, shipping flow, with the largest
untested $-exposure. Every client-facing capture path and the payment webhook are
currently unverified (only the team-portal close-out *math* is covered — §3 of
the coverage doc). A regression here silently loses or misattributes revenue.

Ordered sub-tasks, each a new file:

| # | Target route | New test file | What it must assert | Priority |
|---|---|---|---|---|
| 2.1 | `src/app/api/payments/checkout/route.ts` | `payments/checkout/route.happy-path.test.ts` | A valid request creates a Stripe Checkout session **tenant-scoped** (correct amount, currency, tenant/booking metadata); mock the Stripe SDK and capture the `sessions.create` payload. Negative: missing/foreign booking → no session. | **P0** |
| 2.2 | `src/app/api/webhooks/stripe/route.ts` | `webhooks/stripe/route.paid-transition.test.ts` | A verified `checkout.session.completed` / `payment_intent.succeeded` event flips the invoice/booking to **paid**, scoped to the event's tenant, and is **idempotent** (replay writes once). Assert the update payload + `eq('tenant_id', …)`. Negative: bad signature → no state change. | **P0** |
| 2.3 | `src/app/api/invoices/public/[token]/checkout/route.ts` | `invoices/public/[token]/checkout/route.happy-path.test.ts` | The public token resolves to exactly one tenant's invoice and creates a session for **that** invoice's amount; a token for tenant A never bills tenant B. | P1 |
| 2.4 | `src/app/api/quotes/public/[token]/deposit-checkout/route.ts` | `quotes/public/[token]/deposit-checkout/route.happy-path.test.ts` | Deposit amount is computed from the quote (not the full total) and captured tenant-scoped. | P1 |
| 2.5 | `src/app/api/bookings/[id]/payment/route.ts` | `bookings/[id]/payment/route.happy-path.test.ts` | Payment against a booking is tenant + owner scoped; amount matches the booking price. | P2 |

**Verify:** confirm `webhooks/stripe/route.ts` signature-verifies before trusting
the body (read it first — 2.2's negative case depends on that gate existing).
Do **not** hit live Stripe; mock the SDK. This lane never touches Stripe live keys.

---

## 2. Gap #4 — Lead capture → CRM record → attribution/dedup  ·  **Priority: HIGH**

**Why:** top-of-funnel. A silent lead drop is invisible — no error, just missing
revenue. Only the `ingest/lead` *auth gate* is covered today; the actual capture
path is untested.

| # | Target route | New test file | What it must assert | Priority |
|---|---|---|---|---|
| 4.1 | `src/app/api/lead/route.ts` | `lead/route.happy-path.test.ts` | A valid public submission writes a lead row **tenant-scoped** with the correct source/attribution fields; capture the insert payload. | **P0** |
| 4.2 | `src/app/api/contact/route.ts` + `src/app/api/apply/route.ts` | `contact/route.happy-path.test.ts`, `apply/route.happy-path.test.ts` | Contact/apply submissions land as the correct record type, tenant-scoped, and notify the right tenant (mock the notify). | P1 |
| 4.3 | `src/app/api/attribution/route.ts` + dedup | `attribution/route.happy-path.test.ts` | A repeat submission from the same source **dedups** (no duplicate row) and attribution resolves to the correct source; assert the dedup read is tenant-scoped. | P1 |

**Verify:** read `lead/route.ts` and `attribution/route.ts` first to learn the
dedup key + attribution shape before asserting them (don't infer from the name).

---

## 3. Gap #1 — Data-export / data-deletion (GDPR/CCPA)  ·  **Priority: CRITICAL but BLOCKED**

**Cannot be authored from `p1-w4` — the code does not exist on this branch.**
(P1 export endpoint on `p1-w1` `84687736`; P2 deletion on `p1-w2`; P3/P4 UI were
assigned to W4 and are **not committed**.) This is an integration/sequencing gap,
not something the verification lane can close in isolation.

**Trigger to unblock:** the export/deletion routes landing on the integration
branch (or being merged into `p1-w4`). The moment they do, author, in order:

| # | New test file (once code lands) | What it must assert | Priority |
|---|---|---|---|
| 1.1 | `…/data-export/route.isolation.test.ts` | The export returns **only** the requesting tenant's subject data — no cross-tenant leak. | **P0** |
| 1.2 | `…/data-deletion/route.lifecycle.test.ts` | Soft-delete → 30-day grace → hard-delete on schedule, **and** anonymized aggregates are preserved. | **P0** |
| 1.3 | export/deletion request **UI** (P3/P4) | The request is gated behind the authenticated tenant admin. | P1 |

**Action now (non-test):** flag to leader that P3/P4 (the export/deletion UI
assigned to W4) are still missing — this blocks the compliance milestone
independent of test coverage.

---

## 4. Gap #7 — No platform-wide E2E / browser harness  ·  **Priority: OUT-OF-LANE**

The entire suite is Vitest handler/lib-level; nothing exercises a real multi-step
journey through the running app. Standing up Playwright against a preview deploy
for the 3–4 top journeys (book → pay → lead-capture → login) is **infra work**
(harness + preview wiring + CI), not new-file test authoring. **Leader call — do
not self-authorize.** If greenlit, it slots *after* §1–§2 (unit-level payment
coverage should exist before an E2E layer sits on top of it).

---

## 5. Recommended execution order (single queue)

1. **2.1** payments/checkout session (P0, money-in entry)
2. **2.2** stripe webhook → paid transition + idempotency (P0, money-in settle)
3. **4.1** lead capture → CRM row tenant-scoped (P0, funnel entry)
4. **2.3 / 2.4** public invoice + quote-deposit checkout (P1)
5. **4.2 / 4.3** contact/apply + attribution/dedup (P1)
6. **2.5** bookings/[id]/payment (P2)
7. **1.1–1.3** export/deletion — *the instant the code lands here* (P0-when-unblocked)
8. **§4** Playwright harness — *leader-gated, after 1–6*

Rationale: two P0 payment tests first (largest live $-exposure), then the P0
funnel test, then the P1 fan-out, then the blocked-CRITICAL compliance tests the
moment they're unblockable. Each is one new `*.test.ts` in the verification lane,
`tsc --noEmit` clean + `vitest run` green + a separate `p1-w4` commit — same
discipline as the three already-closed gaps.

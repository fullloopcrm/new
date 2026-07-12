# E2E Flow Coverage — Critical User Flows vs. Existing Tests

**Author:** W4 (verification-harness lane) · **Branch:** `p1-w4` · **Date:** 2026-07-12
**Status:** read-only audit · doc-only · no code/routes/DB touched

---

## 0. TL;DR (read this first)

- **There is NO end-to-end / browser harness at all.** No Playwright, no Cypress,
  no `e2e/` dir, nothing in `package.json`. The entire suite is **Vitest
  unit/integration** (`jsdom`), 71 test files, ~540 `it/test` blocks, run via
  `vitest run`. So "E2E flow coverage" in the literal browser-journey sense is
  **zero across the whole platform** — this doc maps flows to the
  *handler-and-lib-level* coverage that actually exists.
- **The coverage that exists is overwhelmingly negative-path / trust-boundary**
  (isolation tests proving cross-tenant / cross-client / forged-token attacks
  **fail closed**). That is strong and load-bearing. **The positive/happy path of
  most flows — "user does the thing, correct row is written, confirmation is
  returned" — is largely untested.**
- **`data-export` / `data-deletion` has ZERO code and ZERO tests on this branch.**
  The export endpoint (P1) lives on `p1-w1` (commit `84687736`), the deletion
  workflow (P2) is assigned to `p1-w2`, and the export/deletion **UI (P3/P4) was
  assigned to W4 but is not committed on `p1-w4`**. Nothing to cover here yet.
  This is the single largest flow gap. See §7.

**Legend for the matrices below**
`AUTHZ` = trust-boundary/isolation test only (proves attacks fail) ·
`UNIT` = pure logic/math covered ·
`HAPPY` = positive-path functional test exists ·
`NONE` = no test touches this route/path ·
`OFF-BRANCH` = code+tests live on a sibling branch, not integrated here.

---

## 1. Method (what I actually did)

1. Enumerated every test file: `find … -name '*.test.*'` → 71 files, all Vitest.
2. Confirmed no E2E harness: no `playwright.config.*` / `cypress.config.*`,
   nothing in `package.json` deps/scripts (`test` = `vitest run`).
3. For each flow, listed the real route handlers under `src/app/api/**`, then
   checked (a) colocated `*.test.ts`, (b) any test importing that route path,
   (c) the lib-level tests exercising that flow's logic.
4. Read the actual `describe/it` bodies of the flow-relevant tests to classify
   each as AUTHZ vs UNIT vs HAPPY (I did not infer from filenames alone).

Everything below is verified against the `p1-w4` working tree. I did **not** run
the suite for this doc; counts are static (`grep`/`find`). I have **no prod
access** — this is a source-tree coverage map, not a live probe.

---

## 2. Booking flow

**Routes:** `client/book`, `bookings` (+ `/[id]`, `/[id]/status`, `/[id]/team`,
`/batch`), `client/booking/[id]`, `client/bookings`, `client/reschedule/[id]`,
`client/recurring`, `portal/request`, `admin/bookings/*`.

| Sub-path | Coverage | Test |
|---|---|---|
| Reschedule / cancel authz | AUTHZ | `lib/selena/booking-authz.test.ts` + `.isolation` — rejects other-tenant & other-client booking_id, no write |
| Booking-details read | AUTHZ | `lib/selena/booking-read-authz.isolation.test.ts` (F-4: cross-client reject leaks no victim data) |
| Create/assign FK ownership | AUTHZ | `lib/selena/owner-fk-authz.test.ts` + `.isolation` — `create_manual_booking` / `assign_cleaner_to_booking` FK tenant-ownership |
| `client/recurring` forged client_id | AUTHZ | `app/api/client/client-idor.test.ts` — 403/401, writes nothing |
| Cleaner scoring / scheduling | UNIT+AUTHZ | `scoreCleanersForBooking` tenant isolation; `smart-schedule.test.ts`; `schedule/duration-class`; `service-area`, `service-zones` |
| **`client/book` POST (guest→booking created)** | **NONE** | no colocated test, no importer |
| **`bookings` create/update happy path** | **NONE** | authz-fetch-scope asserted in libs; the POST/PUT handlers themselves untested |
| **`portal/request` (client requests a booking)** | **NONE** | — |

**Verdict:** Booking **security** is well fenced (ownership + tenant isolation on
reschedule/cancel/read/create-FK). **Booking happy path is untested** — no test
proves a valid `client/book` submission produces a correctly-priced,
correctly-scoped booking row and confirmation. **Gap: HIGH** (revenue-entry flow).

---

## 3. Checkout / payment flow

**Routes:** `team-portal/checkout` (cleaner closes job → bill recomputed),
`payments/checkout`, `invoices/public/[token]/checkout`,
`quotes/public/[token]/deposit-checkout`, `bookings/[id]/payment`,
`admin/requests/[id]/proposal-checkout`.

| Sub-path | Coverage | Test |
|---|---|---|
| Checkout price recompute | HAPPY+AUTHZ | `app/api/team-portal/checkout/route.test.ts` — hourly recompute vs flat-price-frozen, `max_hours` clamp, `min_charge_cents` floor, booking fetch tenant+member-scoped |
| Pricing math primitives | UNIT | `tier-prices`, `quote`, `billing-hours`, `cleaner-pay`, `signupPricing` |
| **`payments/checkout` (Stripe session)** | **NONE** | no test — payment-session creation path unverified |
| **`invoices/public/[token]/checkout`** | **NONE** | public token-gated pay page, untested |
| **`quotes/public/[token]/deposit-checkout`** | **NONE** | deposit capture, untested |
| **`bookings/[id]/payment`** | **NONE** | — |
| **Payment webhook → paid-state transition** | **NONE** | Telnyx/Resend webhooks are covered; **no Stripe/payment-capture webhook test** confirming money-in flips booking/invoice state |

**Verdict:** The **team-portal checkout math** (the previously-untested
over/undercharge risk) is well covered — good. But every **client-facing payment
capture path** (Stripe session, public invoice/quote pay, deposit, payment
webhook → state) is **untested**. **Gap: HIGH** (money-in with no positive-path
or webhook assertion).

---

## 4. Lead flow

**Routes:** `ingest/lead`, `lead`, `leads` (+ `/verify`, `/attribution`,
`/block`, `/feed`, `/override`, `/visits`), `contact`, `apply`, `apply-ceo`,
`attribution`, `admin/leads`.

| Sub-path | Coverage | Test |
|---|---|---|
| `ingest/lead` auth boundary | AUTHZ | `app/api/ingest/ingest-secret.hmac.isolation.test.ts` — fail-closed when `INGEST_SECRET` unset / absent / wrong / length-mismatch; non-vacuity check |
| Inbound-email → tenant resolution | UNIT | `lib/inbound-email-tenant.test.ts` — scopes inbound email to correct tenant, not global |
| **`lead` / `leads` / `contact` / `apply` capture** | **NONE** | no colocated tests; public form submission → lead row → attribution untested |
| **Lead dedup / attribution correctness** | **NONE** | `attribution` route untested; no test asserts a captured lead lands with correct source/dedup |

**Verdict:** The **ingest auth gate** fails closed (verified). **The actual
lead-capture flow — public `contact`/`apply`/`lead` POST → CRM record →
attribution/dedup — is untested.** **Gap: MEDIUM-HIGH** (top-of-funnel; silent
lead loss would be invisible).

---

## 5. Login / auth flow

**Routes:** `auth/login`, `auth/me`, `auth/logout`; `client/login`,
`client/send-code`, `client/verify-code`, `client/confirm/[token]`;
`portal/auth`; `team-portal/auth`; `admin-auth`.

| Sub-path | Coverage | Test |
|---|---|---|
| Client API ownership gate | AUTHZ | `lib/client-auth.test.ts` — 401 no/garbage/other-tenant cookie, 403 forged client_id, do-not-service reject, accepts valid |
| Client IDOR on session'd routes | AUTHZ | `app/api/client/client-idor.test.ts` + `.isolation` |
| Portal token verify | AUTHZ | `portal/auth/portal-token-verify.isolation.test.ts`; `verify-bruteforce.test.ts` + `.isolation` (OTP throttle fail-closed) |
| Team-portal token/pin | AUTHZ | `team-token-verify.isolation`, `pin-enumeration.test` + `.isolation`, `cross-portal-secret-isolation.isolation` |
| Admin token / pin | AUTHZ | `admin-auth/admin-token-verify.isolation`, `lib/admin-pin.isolation`, `lib/require-admin.isolation`, `lib/require-permission.isolation` |
| Header-sig / impersonation / oauth-state | AUTHZ+UNIT | `tenant-header-sig` (+fallback), `getTenantFromHeaders.isolation`, `impersonation` + `impersonation-gate.isolation`, `oauth-state`, `unsubscribe-token` |
| **`auth/login` (owner/admin password login)** | **NONE** | no colocated test — the actual credential login that mints the session is untested |
| **`client/send-code` → `verify-code` happy path** | **NONE** | OTP *throttle* is covered; the **request-code → verify → session-mint** positive path is **not** directly tested |
| **`client/confirm/[token]`** | **NONE** | — |

**Verdict:** Auth **trust boundaries are exhaustively covered** (this is the
strongest area — forged/replayed/cross-tenant tokens all fail closed, verified).
But the **happy-path credential/OTP login that actually issues a session is
untested** for `auth/login` and the `client/send-code`→`verify-code` pair. A
regression that silently *fails to log a legitimate user in* (or mints a session
with the wrong scope) would not be caught. **Gap: MEDIUM** (negative path solid;
positive path unverified).

---

## 6. Portal flow (client portal + team/field-staff portal)

**Routes:** `portal/*` (`auth`, `bookings`, `collect`, `config`, `services`,
`feedback`, `request`, `messages`, `notes`, `connect`); `team-portal/*`
(`auth`, `jobs` + `claim`/`reassign`/`release`, `checkin`, `checkout`,
`earnings`, `crew/*`, `messages`, `rating`, `running-late`, `15min-alert`,
`video-upload`, `update-phone`, `preferences`).

| Sub-path | Coverage | Test |
|---|---|---|
| Field-staff RBAC tiers | UNIT | `lib/portal-rbac.test.ts` — worker<lead<manager, earnings opt-in, least-privilege fallback, revoke |
| Referrer portal token | AUTHZ | `lib/referrer-portal-auth.test.ts` — mint/round-trip + forgery/tamper reject, tid can't be swapped |
| Team-portal auth core | AUTHZ | `lib/team-portal-auth.isolation.test.ts` (instant revoke, cross-tenant token reject, per-tenant override no-leak, scopedMemberIds) |
| Messages authz | AUTHZ | `team-portal/messages/messages-authz.test.ts` + `.isolation` |
| 15-min alert authz | AUTHZ | `team-portal/15min-alert/alert-authz.test.ts` + `.isolation` |
| Checkout (field close-out) | HAPPY | see §3 (`team-portal/checkout/route.test.ts`) |
| **`team-portal/jobs/claim`→`release`→`reassign` state transitions** | **NONE** | no test asserts a claimed job flips state / can't be double-claimed |
| **`portal/collect`, `portal/request`, `portal/feedback` (client actions)** | **NONE** | functional behaviour untested beyond authz |
| **`team-portal/checkin`, `running-late`, `video-upload`** | **NONE** | — |

**Verdict:** Portal **access control is very well covered** (RBAC tiers, token
forgery, instant revocation, cross-portal secret isolation — all verified).
**Portal *actions* (job claim/reassign lifecycle, client collect/request/
feedback, checkin) have no functional test** — only the auth gate around them.
**Gap: MEDIUM.**

---

## 7. Data-export / data-deletion flow (GDPR/CCPA)

**On `p1-w4`: ZERO code, ZERO tests.** Verified: no route under `src/app/api/**`
matching `export|deletion|forget|erasure|data-request` (the only `*export*`
files — `finance-export`, `site-export`, `tax-export` — are unrelated tenant
*business* exports, **not** data-subject GDPR export).

| Piece | Where it actually is | Coverage |
|---|---|---|
| P1 — data **export** endpoint (bookings/invoices/communications/notes → JSON+CSV) | branch `p1-w1`, commit `84687736` (`feat(P1/W1): GDPR/CCPA per-tenant customer data export endpoint`) | OFF-BRANCH — not integrated here; its tests (if any) not visible on `p1-w4` |
| P2 — data **deletion** workflow (soft-delete + 30-day grace → hard delete, preserve anonymized analytics) | assigned to `p1-w2` | OFF-BRANCH |
| P3 — data-export **request UI** | assigned to **W4** (11:35 order) | **NOT COMMITTED on `p1-w4`** |
| P4 — data-deletion **request UI** | assigned to **W4** (11:35 order) | **NOT COMMITTED on `p1-w4`** |

**Verdict:** This flow **cannot be covered on this branch because it does not
exist here.** **Gap: CRITICAL for the compliance milestone** — but it is a
*integration/sequencing* gap, not a test gap I can close from `p1-w4`. Once P1/P2
merge into the integration branch, this flow needs, at minimum:
(1) export returns *only* the requesting tenant's subject data (tenant-scoped,
    no cross-tenant leak) — an isolation test;
(2) deletion soft-deletes then hard-deletes on schedule and **preserves**
    anonymized aggregates — a lifecycle test;
(3) UI (P3/P4) gates the request behind the authenticated tenant admin.
None of these can be authored until the code lands here.

---

## 8. Consolidated gap register (severity-ranked)

| # | Flow | Gap | Severity |
|---|---|---|---|
| 1 | Data-export/deletion | Entire flow absent on `p1-w4` (P1 on `p1-w1`, P2 on `p1-w2`, **P3/P4 UI never committed by W4**); no isolation/lifecycle test possible until merged | **CRITICAL (integration)** |
| 2 | Checkout/payment | Client-facing payment capture (Stripe session, public invoice/quote/deposit pay, `bookings/[id]/payment`) + payment webhook→state: **no tests** | **HIGH** |
| 3 | Booking | `client/book` and `bookings` create/update **happy path** untested — no proof a valid booking is created, priced, scoped, confirmed | **HIGH** |
| 4 | Lead | Public `contact`/`apply`/`lead` capture → CRM record → attribution/dedup untested (only ingest auth gate covered) | **MEDIUM-HIGH** |
| 5 | Login | `auth/login` password login + `client/send-code`→`verify-code` **session-mint happy path** untested (throttle/boundaries covered) | **MEDIUM** |
| 6 | Portal | Portal *actions* (job claim/reassign lifecycle, client collect/request/feedback, checkin) untested beyond authz | **MEDIUM** |
| 7 | Platform-wide | **No E2E/browser harness at all** — nothing exercises a real multi-step user journey through the running app | **MEDIUM (structural)** |

---

## 9. Recommendations (not executed — this lane is read-only)

**Cheap wins, in priority order:**

1. **After P1/P2 merge:** add a `*.isolation.test.ts` for the export endpoint
   (requester tenant gets only their subject data) and a lifecycle test for the
   deletion grace→hard-delete + analytics-preservation. Blocks the compliance
   milestone; can't start until code lands here. **Also: confirm P3/P4 (the
   export/deletion UI) actually get built — they were assigned to W4 and are
   currently missing.**
2. **Payment happy-path + webhook tests** (§3 gaps): highest untested $-risk on
   an existing, shipping flow. A handler-level test (mock Stripe) asserting a
   checkout session is created tenant-scoped, and a webhook test asserting
   payment-captured flips invoice/booking state, would close the biggest live
   exposure.
3. **`client/book` happy-path handler test:** valid submission → booking row with
   correct tenant + price + status. Pairs naturally with the existing booking
   authz suite.
4. **Login positive-path tests:** `auth/login` mints a correctly-scoped session;
   `send-code`→`verify-code` issues a client session. Boundaries are already
   proven; this closes the "legit user silently can't log in" blind spot.
5. **Structural (larger, needs sign-off):** stand up a minimal Playwright harness
   for the 3-4 top journeys (book, pay, lead-capture, login) against a preview
   deploy. This is real infra work — flag to leader, do not self-authorize.

**Note:** items 1-4 are new-file test authoring in the verification lane and are
the natural next W4 orders once the underlying code is present on this branch.
Item 5 is out of lane (harness infra + preview wiring) — leader call.

---

## 10. What I verified vs. did not

- **Verified (static, this working tree):** test-file inventory; absence of
  Playwright/Cypress; `package.json` test script; per-route colocated-test
  presence; `describe/it` bodies of every flow-relevant test (classified
  AUTHZ/UNIT/HAPPY by reading them); absence of any export/deletion route on
  `p1-w4`; P1 location via `git log --all`.
- **Did NOT verify:** live/prod behaviour (no prod access); whether P1/P2 on
  their sibling branches carry their own tests (not visible from `p1-w4`); a
  fresh full `vitest run` for this doc (counts are static). The ~540 `it/test`
  figure is a grep count, not a green-run count — though W4's last report
  recorded the `src/lib` suite green at 452/452.

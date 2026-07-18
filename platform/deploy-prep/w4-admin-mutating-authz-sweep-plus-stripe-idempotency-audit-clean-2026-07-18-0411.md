# W4 — admin/** mutating-route authz sweep + Stripe idempotency completeness audit — both clean — 2026-07-18 04:11

Per the 04:05 LEADER order's 3-deep queue: (1) new fresh-ground surface, (2)
continue whichever surface (1) opens up, (3) keep gap/fluidity current. Both
of these were named as still-open candidates in the 0400 checkpoint's
next-target list.

## 0. Housekeeping: committed leftover uncommitted fix

`platform/src/app/api/team-members/[id]/stripe-onboard/route.ts` had an
uncommitted 31-line diff matching exactly what the 04:05 LEADER order
described as already-closed (concurrent onboarding requests both minting
live Express accounts, atomic claim-on-IS-NULL + re-fetch-winner). Verified
correct (full file read, `tsc --noEmit` clean vs. baseline), committed as
`9975620f`. This was leftover work from a prior session that fixed but never
committed.

## 1. Fresh-ground surface: `src/app/api/admin/**` mutating-route authorization sweep

The 0330 checkpoint's admin/** pass only covered GET/read; POST/PUT/DELETE/
PATCH handlers were unaudited as a named category.

Method: enumerated every `route.ts` under `src/app/api/admin/` (122 files),
extracted every file exporting a POST/PUT/DELETE/PATCH handler, and checked
each for a guard call. First pass (narrow pattern: `requireAdmin|
requirePermission|requireSuperAdmin|getAdminSession`) flagged 5 files:
`ai-chat`, `payments/finalize-match`, `selena/monitor`, `system-check`,
`translate`. Manually read all 5 in full — each has a *different* but
legitimate guard the narrow grep missed:

- `ai-chat/route.ts`, `translate/route.ts`: these live under `/api/admin/`
  but are **tenant dashboard** endpoints (the business's own AI chat widget /
  translate helper, called from `AiAssistant.tsx` in the legacy per-tenant
  clone dashboards), not FullLoop platform-admin. Guarded by
  `getTenantForRequest()` (throws `AuthError` if unauthenticated) plus, in
  `ai-chat`, per-tool `hasPermission()` checks mirroring the equivalent REST
  endpoint's permission tier. Correct pattern, already hardened (see the
  file's own inline rationale comments from a prior pass).
- `payments/finalize-match/route.ts`: internal-key-gated (`x-internal-key`
  header, `safeEqual` against `INTERNAL_API_KEY`/`ELCHAPO_MONITOR_KEY`) —
  called by automated reconciliation tooling, not a browser session.
- `selena/monitor/route.ts`: bearer-keyed (`x-monitor-key` header,
  `safeEqual` against `ELCHAPO_MONITOR_KEY`) — external ops monitoring.
- `system-check/route.ts`: locally-defined `verifyAdmin()` checking the
  signed `admin_token` cookie via `verifyAdminToken()` — same platform-admin
  auth as everywhere else, just not routed through the shared
  `requireAdmin()` helper.

Re-ran the sweep with a broadened guard pattern (adds `getTenantForRequest|
verifyAdminToken|verifyAdmin\(|INTERNAL_API_KEY|ELCHAPO_MONITOR_KEY|
CRON_SECRET|safeEqual|admin_token|PORTAL_SECRET|TEAM_PORTAL_SECRET`) across
all 122 files: **zero** files with a mutating handler and no guard-pattern
match at all. Every admin/** mutating route has *some* form of
authentication gating it.

This is a presence check, not a correctness check (i.e., it confirms a guard
call exists and is reachable before the mutation, not that every guard is
bug-free in isolation — those bugs, when they exist, tend to be in the
shared helper functions themselves, which prior passes have already audited
directly: `requireAdmin`, `requirePermission`, `verifyAdminToken`,
`impersonation.ts`'s HMAC verification, etc.). Within that scope: **clean**.
Matches the LEADER's 04:05 note praising "clean sweeps on admin/** mutating
routes."

## 2. Continued: Stripe/payment-provider idempotency-key completeness

The 0236/0400 checkpoints left "a final confirming grep for Stripe calls
missing an idempotencyKey beyond the 2 already-covered call sites" as a
standing item.

Grepped every `stripe.<resource>.create(` call site across `src/` (11 total,
excluding tests):

**Already have idempotency keys** (money-moving, at real duplicate-charge/
duplicate-payout risk if raced): `webhooks/stripe/route.ts` (cleaner payout
transfers + instant payouts, 2 sites), `payment-processor.ts` (same pair,
duplicated for the non-webhook payment path), `selena/tools.ts` (owner-tool
refund, keyed on tenant+booking+payment+amount+time-bucket).

**Intentionally without idempotency keys** — `checkout.sessions.create()` at
5 sites (`invoices/public/[token]/checkout`, `quotes/public/[token]/
deposit-checkout`, `admin/prospects/[id]` (approve action), `lib/stripe.ts`'s
`createCheckoutSession`, `lib/platform-billing.ts`'s `createProposalCheckout`)
plus `team-members/[id]/stripe-onboard`'s `accounts.create()`. Reasoning
confirmed by reading each: a Checkout Session, unlike a transfer/payout/
refund, does not move money on creation — a customer still has to complete
it, and completing a *duplicate* session requires them to submit payment
twice, which isn't something an idempotency key on session *creation*
prevents anyway (two sessions can each independently be idempotency-keyed
and still both get paid if a customer works through both tabs). The two
public-facing sites (`invoices/checkout`, `quotes/deposit-checkout`) already
carry this exact reasoning in their own code comments from a prior pass, and
use per-token rate-limiting instead to bound duplicate-session creation
volume — a different, correctly-matched control for a different risk
(Stripe-account/dashboard clutter + API-rate-limit exhaustion, not
double-charging). `stripe-onboard`'s `accounts.create()` was just hardened
this pass (item 0 above) with a DB-side atomic claim, which is the actual
fix for *that* route's race (which account wins), not an idempotency key
(which would only dedupe the Stripe-side create call, not the DB write race
that was the real bug).

**Conclusion: no gap.** Every money-moving Stripe call already has an
idempotency key; every checkout-session-creation call is correctly exempted
for a reasoned, precedented reason. This standing item is now closed as a
category — do not re-open without a new call site appearing.

## 3. Spot-checked TOCTOU/race-condition candidates (not a full sweep, but the sampled surface came back hardened)

Given the checkpoint's suggestion to run a TOCTOU sweep as a named category
(raised twice, never formally run), spent the remainder of this pass
sampling likely candidates rather than re-deriving the whole codebase from
scratch (369 prior docs already cover the overwhelming majority of
money/status-mutation routes):

- `finance/bank-transactions/[id]/match/route.ts` — already has a full
  atomic-claim-before-side-effect pattern with claim/release, per its own
  header comment from a prior pass.
- `team-portal/15min-alert/route.ts` — already has an atomic claim on the
  alert-timestamp write (`.or('fifteen_min_alert_time.is.null,...lt....')`),
  per its own header comment from a prior pass.
- `team-portal/messages/route.ts` — calls `comhub_get_or_create_contact_by_
  phone` / `comhub_get_or_create_thread`, both already covered by the
  standing `2026_07_17_comhub_get_or_create_race_safety_PROPOSED.sql`
  migration (unapplied, DB-side, already tracked as an aging item).

No new TOCTOU bug found in the sampled surface. Did not attempt a
file-by-file full sweep of every `.select().then(conditionally).update()`
site in the codebase this pass — that's a multi-hour undertaking given the
codebase size and would need to be its own dedicated pass with a systematic
(not sampled) method to make a real "clean" claim. Left as a genuinely open
next-target candidate below, scoped correctly this time (systematic, not
sampled).

## Verification

- `npx tsc --noEmit` — 2 pre-existing baseline errors only (unrelated
  `sunnyside-clean-nyc/_lib/site-nav.ts` import-name mismatch, confirmed
  present before this pass's one code change too).
- `npx vitest run src/app/api/team-members` — 3 files, 6 tests, all pass
  (covers the committed stripe-onboard fix).
- No other code changed this pass (items 1 and 2 were audits with clean
  results; item 3 was a targeted read-only sample).

No push/deploy/DB this pass.

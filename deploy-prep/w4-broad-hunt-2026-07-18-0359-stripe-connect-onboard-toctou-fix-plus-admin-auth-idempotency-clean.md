# W4 broad-hunt — 2026-07-18 03:59

## Queue item (1): admin/** mutating-route auth sweep — CLEAN

Swept every `platform/src/app/api/admin/**/route.ts` mutating handler (POST/PUT/PATCH/DELETE),
per-function (not just per-file), for a missing authorization check. Automated sweep flagged 3
candidates; all 3 were false positives from indirection through a locally-named helper:

- `system-check/route.ts` — local `verifyAdmin()` wraps `verifyAdminToken`.
- `selena/monitor/route.ts` — local `authorized()` wraps `safeEqual(ELCHAPO_MONITOR_KEY)`.
- `seo/apply/route.ts` — local `authorize()` accepts either `requireAdmin()` (session) or a
  `Bearer CRON_SECRET` (system caller), via `safeEqual`.

Every other mutating route under `/api/admin/**` calls one of `requireAdmin` (platform PIN),
`requirePermission` (tenant RBAC), or `getTenantForRequest`/`getTenantFromHeaders` (tenant
session, thrown `AuthError`). `/api/admin(.*)` is Clerk-exempt in `middleware.ts` by design
("Admin API routes use PIN auth, not Clerk") — enforcement is route-level, and it holds. No
new gap. This folder mixes true platform-admin (PIN) and tenant-operator "admin dashboard" APIs
(RBAC/session) under the same path prefix — both are legitimate auth models here, not a mixup.

## Queue item (1) pivot: Stripe idempotencyKey grep

Grepped every `stripe.*.create(` call site across `lib/` and `app/api/`. Existing coverage is
already extensive from prior W4/W1 passes this session:
- `refunds.create` — has `idempotencyKey` (booking/tenant/payment-intent/amount/bucket keyed),
  comment references a prevented double-refund bug.
- `transfers.create` / `payouts.create` (cleaner payout) — has `idempotencyKey` keyed on
  booking + session/reference id.
- Public checkout routes (`invoices/public/[token]/checkout`, `quotes/public/[token]/deposit-checkout`)
  — already rate-limited per-token (comment explicitly calls out "no idempotency key" and caps
  spam-session-creation instead of adding one, since Checkout Sessions don't move money until
  completed and the webhook's `stripe_session_id` unique constraint is the real dedup boundary).
- `webhooks/stripe/route.ts` — extensive `idempotent: true` early-returns keyed on unique DB
  constraints (`stripe_session_id`, claim-row patterns) across `checkout.session.completed` and
  siblings.
- `platform-billing.ts` `ensurePlatformPrices()` — a first-run-only lookup_key race (two
  concurrent callers before any platform price exists). Left as-is: Stripe rejects a second
  `prices.create` with an already-active duplicate `lookup_key` by default (no
  `transfer_lookup_key`), so the race surfaces as a transient 500 on a vanishingly rare
  first-ever invocation, not silent duplication or a financial/security issue. Not worth the
  complexity of a lock for that window.

## Real fix: `POST /api/team-members/[id]/stripe-onboard` — Connect-account claim race (TOCTOU)

**File:** `platform/src/app/api/team-members/[id]/stripe-onboard/route.ts`

The handler read `team_members.stripe_account_id`; if null, called `stripe.accounts.create()`
(a live Stripe Connect Express account) and then did an unconditional `.update()` to store the
new id. Two concurrent POSTs (double-click "Connect Stripe", a retried request after a slow
response) both read `stripe_account_id` as null, both mint a **separate live Stripe Express
account**, and the last DB write silently wins — with no signal to the losing request. Practical
impact: the team member could complete Stripe's hosted onboarding flow on the account whose id
never made it into the DB (the discarded write), while `team_members.stripe_account_id` — the
column every payout path (`lib/payment-processor.ts` transfers/payouts) reads — points at the
*other* account, which was never onboarded (`payouts_enabled: false`). Net effect: the team
member believes they're connected, but real payouts to them fail.

**Fix:** claim the write atomically — `update({stripe_account_id}).is('stripe_account_id', null)`
— and check whether the row was actually affected (`.select('id').maybeSingle()`). On a lost
race, re-fetch the row and use whatever account id actually won, so the onboarding link handed
back to the client always matches what payouts will use. The extra Stripe account created by the
losing request becomes an inert orphan in Stripe's dashboard (never linked, never funded) —
no money moves on `accounts.create()` itself, so there's no financial loss from the orphan, only
from silently paying out to the wrong (unonboarded) account, which the fix now prevents.

Added `route.claim-race.test.ts`: simulates the race by having the mocked `accounts.create()`
write a competing "winner" account id into the row mid-flight (i.e. while our own create call is
still in-flight, exactly mirroring the real await window), then asserts the losing request
returns and persists the winner's account id, not its own orphan.

**Verification:** `npx tsc --noEmit` clean (2 pre-existing, unrelated errors in
`site/sunnyside-clean-nyc/_lib/site-nav.ts` — untouched). New test file: 2/2 passing. Existing
sibling `route.permission-gate.test.ts`: 2/2 passing (no regression). Full suite run in
background, not yet confirmed at time of writing — will follow up if it surfaces anything.

File-only. No push/deploy/DB.

## Queue item (3): gap/fluidity

This doc. No open threads carried forward from this pass beyond the full-suite confirmation
above.

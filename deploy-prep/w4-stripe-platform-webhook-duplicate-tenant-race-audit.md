# Stripe Platform Webhook — Duplicate-Tenant-Creation Race on Retry

Found during LEADER 00:30 broad-hunt order ("continuing broad-hunt, fresh
area"). File-only, no fixes applied — findings only, per standing rules; the
retry-safety story is application-critical revenue logic and the right fix
(DB-level idempotency guard) is a design call, same category as the
already-escalated referrer-code IDOR / HR PIN findings.

Scope covered: `src/app/api/webhooks/{clerk,stripe-platform,telegram,telegram/[tenant],telegram/jefe}/route.ts`,
`src/lib/webhook-verify.ts`, `src/lib/telegram-webhook-auth.ts`,
`src/lib/impersonation.ts` + `src/app/api/admin/impersonate/route.ts`,
`src/lib/create-tenant-from-lead.ts`, `src/lib/platform-billing.ts`,
`src/lib/activate-tenant.ts` (partial — traced for call latency only).

## Signature verification (all clean)

- `webhook-verify.ts` (Svix for Clerk/Resend, Ed25519 for Telnyx): timestamp
  window, `timingSafeEqual` on decoded signature bytes, `isWebhookVerifyDisabled`
  hard-ignores the dev bypass flag whenever `NODE_ENV==='production'`.
- `telegram-webhook-auth.ts`: per-scope HMAC-derived secret token
  (`platform-owner` / `jefe` / `tenant:<id>`), fail-closed when the master
  secret is unset, `timingSafeEqual` compare with length guard. Per-tenant
  bots can't replay another tenant's secret since the scope is baked into the
  HMAC input.
- `stripe-platform/route.ts` signature check uses `stripe.webhooks.constructEvent`
  (library-verified, no custom compare) — no issue.
- `admin/impersonate`: cookie is `<tenantId>.<hmac>` under `ADMIN_TOKEN_SECRET`,
  `timingSafeEqual` compare in `verifyImpersonationCookie`. Legacy unsigned
  fallback is gated behind `IMPERSONATION_ALLOW_UNSIGNED=1` (default off) —
  intentional migration escape hatch, not itself a bug, but worth confirming
  that env var is unset in prod.

## Finding: duplicate tenant (and duplicate Stripe-backed billing) on webhook redelivery

**`POST /api/webhooks/stripe-platform` → `createTenantFromLead()` (`src/lib/create-tenant-from-lead.ts`)
has a TOCTOU gap between its idempotency check and the write that closes it, and the
handler is slow enough that Stripe's own retry behavior can realistically trigger it.**

### Why this is reachable, not just theoretical

`stripe-platform/route.ts` `checkout.session.completed` handler synchronously:
1. `createTenantFromLead()` — DB inserts, territory claim, slug uniqueness loop,
   `provisionTenant`, `seedOnboardingTasks`, note-copy, owner PIN creation.
2. `activateTenant()` — re-fetches settings, seeds finance/HR defaults, seeds
   onboarding tasks (again), inserts default team member, runs the onboarding
   gate, and calls out to `registerCarryingDomain` / `registerCustomDomain`
   (DNS provider API) and `registerSeoProperty` (Search Console-style API).

All of this runs before the route returns 200. Stripe's webhook delivery
times out and retries (with the same event, and Stripe also fans out
`checkout.session.completed` + `checkout.session.async_payment_succeeded` for
ACH — this endpoint's `payment_method_types` includes `us_bank_account`,
which settles asynchronously and commonly produces more than one relevant
event) if the endpoint doesn't answer fast. A chain of DNS/SEO API calls plus
~6 sequential DB round-trips is a plausible multi-second handler — well within
range of Stripe's delivery-timeout retry window. There is no
`event.id`-keyed dedup ledger anywhere in this route or in `create-tenant-from-lead.ts`
(`grep` for `processed_stripe_events` / `stripe_event_id` across `src/lib`
and the webhook routes returns nothing).

### The gap itself

`create-tenant-from-lead.ts`:
- Line 57: `if (lead.converted_tenant_id) { ... return alreadyConverted }` — the
  idempotency check is a plain `SELECT`, not a locking read.
- Line 213-221: `converted_tenant_id` is only written at the very end, after
  tenant creation, provisioning, note-copy, and owner-PIN creation have all
  completed.
- Between those two points there is no advisory lock, no `SELECT ... FOR UPDATE`,
  and no unique constraint on `partner_requests.converted_tenant_id` (confirmed:
  no migration file references a constraint on that column).

So two concurrent invocations for the same `leadId` (original delivery +
Stripe retry, or two distinct-but-related checkout events) both read
`converted_tenant_id` as null and both proceed to create a tenant.

**Partial, racy mitigation when `territory_id`/`category_id` are set on the lead:**
the `territory_claims` unique `(territory_id, category_id)` constraint acts as
an incidental mutex — but only closes the window from "insert claim" to
"attach tenant_id to claim" (lines 92-126, 175-180), not the whole
create-tenant flow:
- Call A inserts claim row X (`tenant_id: null`) and starts creating tenant A
  (slow — provisioning, onboarding seed, etc.).
- Call B retries mid-flight, hits `23505` on the claim insert, re-queries
  `territory_claims`, finds row X still `tenant_id: null` (A hasn't attached
  yet), reuses `reservedClaimId = X.id`, and proceeds to create tenant B too.
- Both A and B eventually run `UPDATE territory_claims SET tenant_id = ... WHERE id = X` —
  last writer wins. Result: two tenants exist, only one is linked to the
  territory claim, and `partner_requests.converted_tenant_id` ends up pointing
  at whichever call's final `UPDATE` lands last — the other tenant is a fully
  provisioned, silently orphaned duplicate (own Stripe subscription line items
  synced via `syncSubscriptionSeats` if seats are ever edited on it, own owner
  PIN emailed/relayed to the customer, own onboarding tasks).

**No mitigation at all when `territory_id`/`category_id` is absent on the lead**
(the reservation block is skipped entirely under `if (lead.territory_id && lead.category_id)`)
— duplicate tenant creation is unguarded in that path.

### Impact

- Duplicate tenant provisioned for one paid signup — duplicate onboarding
  tasks, duplicate owner PIN generated (customer gets two, or a support agent
  relays the "wrong" one), duplicate DNS/SEO registration calls against the
  same domain from two `activateTenant()` runs racing each other.
- Confusion in billing reconciliation: `stripeSubscriptionId` is attached to
  whichever tenant's insert included it — both duplicates reference `opts`
  from their own call, so both could plausibly carry the same
  `stripe_subscription_id` if `opts.stripeSubscriptionId` was computed
  identically in each invocation, meaning two tenant rows point at one Stripe
  subscription — seat-count changes on either tenant would call
  `syncSubscriptionSeats` against the same underlying subscription.
- Lower severity than the referrer-code / HR-PIN findings (requires a specific
  timing window, not a trivially-repeatable unauthenticated exploit) but it's
  a real-money, real-customer-facing correctness bug, not just theoretical —
  Stripe retries on timeout are routine, and this handler's latency profile
  makes hitting that window plausible on a slow DNS/SEO API day.

### Suggested direction (not applied — needs a design call + migration)

Any of the following would close it; picking one is a design decision, not a
one-line patch:
- Stripe event-id idempotency ledger (insert `event.id` into a
  `processed_stripe_events` table with a unique constraint, inside the same
  transaction/before doing any work; skip if insert conflicts) — this is the
  standard Stripe-recommended pattern and would also protect the tenant
  `stripe/route.ts` Connect webhook if it doesn't already have one.
- `SELECT ... FOR UPDATE` on the `partner_requests` row (via an RPC, since
  supabase-js doesn't expose row locking directly) around the
  read-check-then-write span.
- A unique constraint on `partner_requests.converted_tenant_id`-adjacent state
  (e.g., a generated/partial unique index enforcing "at most one non-null
  `converted_tenant_id` write ever succeeds per lead") combined with an
  `UPDATE ... WHERE converted_tenant_id IS NULL RETURNING id` claim pattern
  used as the actual mutex instead of the territory-claims table (which
  wasn't designed for this and doesn't cover territory-less leads).

## Not touched (per LEADER order)

Did not open referrers, referral-commissions, or team-PIN/team-portal routes
(confirmed `team-portal/auth` is the PIN-login route and left untouched, along
with the rest of `team-portal/**`).

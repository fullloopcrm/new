# W1 — Stripe Connect (team-member instant pay) tenant-key mismatch fix (2026-07-17 16:45)

Fresh-ground surface per 16:16's queue item 1. Picked `team-members/[id]/stripe-onboard`
and `stripe-status` (Stripe Connect Express onboarding for team-member instant pay) —
zero prior audit trail this session on this specific pair beyond the RBAC/auth-gate
fixes already landed on them earlier tonight (`route.permission-gate.test.ts`,
`route.auth-gate.test.ts`).

## Fixed

**`team-members/[id]/stripe-onboard`'s `getStripe()` ignored `tenant.stripe_api_key`
entirely, always using the platform's global `process.env.STRIPE_SECRET_KEY`.**

Every other Stripe touchpoint in the app uses the same established convention —
tenant's own configured key first, fall back to the platform env key:
- its own sibling `stripe-status.ts` (`getStripe(tenant.stripe_api_key)`)
- `payment-processor.ts`'s real payout path (`stripe.transfers.create({destination:
  team_member.stripe_account_id})`, the actual money movement to a team member)
- `payments/checkout`, `payments/link`, `invoices/quotes` public checkout,
  `finance/bank-connect/session`, `onboarding-verify.ts`

`stripe-onboard.ts` was the one outlier — `getStripe()` took zero arguments.

**Effect for any tenant with their own `stripe_api_key` configured** (a real,
actively-used setting — dashboard/settings' Payments tab, admin business wizard,
`cron/system-check` + `cron/health-check`'s "payments" readiness probe all treat it
as the tenant's real Stripe account):
1. `POST /stripe-onboard` creates the team member's Connect Express account under
   the **platform's** Stripe account (`stripe.accounts.create` via the env key).
2. `stripe-status.ts`'s GET/POST then look that same `stripe_account_id` up under
   the **tenant's own** Stripe account (`stripe.accounts.retrieve` via
   `tenant.stripe_api_key`) — an account ID that doesn't exist there. Stripe
   returns a resource-not-found error; the route catches it and 500s. The team
   member's "instant pay" status permanently reads as broken/unconfirmed, and the
   `stripe_ready_at` flip + admin notification (`"X set up instant pay"`) never fires.
3. Worse, real money: `payment-processor.ts`'s auto-pay-on-payment path calls
   `stripe.transfers.create({ destination: teamMember.stripe_account_id })` via
   `getStripe(tenant.stripe_api_key)` — same cross-account mismatch. The transfer
   throws, is caught, and only `console.error`'d (`payment-processor.ts:311`) — no
   admin task, no retry, no client-visible signal. The team member never actually
   gets auto-paid for completed jobs, silently, every single time, for that tenant.

Fixed by threading `tenant.stripe_api_key` (via `tenant.tenant.stripe_api_key` off
`requirePermission()`'s `TenantContext`) through `getStripe()` in both POST (account
create + `accountLinks.create`) and GET (`accounts.retrieve`), using the same
`decryptSecret()`-with-plaintext-passthrough pattern as `stripe-status.ts`. Grepped
the whole app for `stripe.accounts.create`/`accountLinks.create` — this is the ONLY
Connect-account-creation site, so the class is fully closed, not just one instance.

3 new tests (`route.tenant-key.test.ts`): env-fallback control (no tenant key
configured — matches most tenants today, so this bug's live blast radius is
currently narrow), tenant-key-used on the create path, tenant-key-used on the GET
status-check path. RED-confirmed via `git apply -R` on the source fix alone (2/3
failed for the right reason pre-fix — the fallback control correctly still passed).
Reapplied clean. Commit `07bef3eb`.

## NOTICED, not touched — architecture-level question, flagging not fixing

While tracing the tenant-key convention, found a related but much larger open
question in `webhooks/stripe/route.ts`: signature verification (`stripe.webhooks
.constructEvent`) uses **only** the single global `process.env.STRIPE_WEBHOOK_SECRET`
— grepped the whole repo, there is no per-tenant webhook-secret column anywhere
(`tenants` table has `stripe_api_key`/`stripe_account_id` but nothing resembling
`stripe_webhook_secret`). If a tenant with their own independent Stripe account
(not a Connect sub-account of the platform) ever configures that account's own
Stripe Dashboard to send webhooks to this app's shared `/api/webhooks/stripe` URL,
the signature check would always fail (each Stripe account has its own unique
signing secret) — checkout confirmations, refund/dispute events, and this same
file's own team-member payout logic (`stripe.transfers.create` at line ~505, which
ALSO only uses the module-level no-arg `getStripe()`, i.e. platform key only, not
`tenant.stripe_api_key` — a second, separate instance of tonight's exact bug class
in this same file) would never fire for that tenant via the webhook path.

**Not fixed this round** — this needs someone with prod DB access to confirm (a)
whether any live tenant actually has `stripe_api_key` configured today, and (b)
whether their payment-confirmation flow already relies on a different mechanism
(e.g., client-side success-page polling via `stripe.checkout.sessions.retrieve`
rather than the webhook) that would make this currently-inert rather than live-
broken. Real architectural surface, not a one-file patch — same category as
tonight's other escalated-not-patched items (3-fork tenant scoping, sms_consent
opt-out policy). Flagging for Jeff/leader triage, not touching webhooks/stripe/route.ts.

## tenant_domains schema lane

Reconfirmed intact, no drift: 043/055/056/059/068/069 all present.

## Verification

- `git apply -R` RED-confirmed the fix on the source diff alone (not stash).
- `tsc --noEmit`: clean (same 2 pre-existing baseline errors — admin-auth type
  quirk + untracked `sunnyside-clean-nyc/_lib/site-nav.ts`, both unrelated).
- `eslint` on both touched files: 0 warnings (self-caught + fixed one unused-param
  warning in my own new test file before landing).
- Full suite: 578/578 files, 3145/3146 tests (1 pre-existing expected-fail), zero
  regressions.
- File-only, no push/deploy/DB.

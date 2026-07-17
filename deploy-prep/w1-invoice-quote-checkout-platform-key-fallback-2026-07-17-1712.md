# W1 — Public invoice/quote-deposit checkout platform-key fallback fix (2026-07-17 17:12)

Fresh-ground surface per 16:56's queue item 1. Continued from the Stripe-key-resolution
thread opened by the 16:45 stripe-onboard fix — swept every remaining
`stripe_api_key`/`decryptSecret`/`new Stripe` call site in `src/app/api` for the same
"no fallback to the platform's shared key" class already confirmed real (and praised)
earlier tonight at 15:13 for `resend_api_key` on this exact file cluster
(invoices/quotes/documents/e-sign email).

## Fixed

**`invoices/public/[token]/checkout` and `quotes/public/[token]/deposit-checkout` hard-required
`tenant.stripe_api_key` with zero fallback to `process.env.STRIPE_SECRET_KEY`.**

Both routes did:
```
const apiKey = tenant.stripe_api_key ? decryptSecret(tenant.stripe_api_key) : null
if (!apiKey) return NextResponse.json({ error: 'Tenant Stripe not configured' }, { status: 500 })
```

Every other Stripe checkout-session-creation call site in the app already falls back:
- `payments/checkout`, `payments/link` (`lib/stripe.ts`'s `getStripe()` decrypts-or-falls-back internally)
- `team-members/[id]/stripe-status`, `stripe-onboard` (fixed 16:45)
- `finance/bank-connect/session`

Invoice/quote creation has **zero dependency** on Stripe being configured — a tenant can
draft, send, and have a client open an invoice or proposal with a deposit due entirely
before ever touching the Payments settings tab. Any tenant relying on the platform
default key (i.e., hasn't set up their own Stripe account — the majority, per the
16:45 doc's note that this bug class's blast radius is "currently narrow" precisely
*because* most tenants use the fallback) had **every public "Pay Now" link on every
invoice and every quote deposit 500 for the client**, unconditionally. Not degraded,
not a fallback UX — a hard broken payment collection path, live, for the majority
tenant configuration.

Fixed by changing the `: null` fallback to `: process.env.STRIPE_SECRET_KEY` in both
files (matching the established convention), and changed the public-facing error copy
from `'Tenant Stripe not configured'` (an internal-config leak to an unauthenticated
caller) to the same generic `'Checkout unavailable. Try again or contact the business.'`
both files' own catch blocks already use for unexpected errors — consistent messaging,
no information disclosure regression either.

Grepped every `new Stripe`/`checkout.sessions.create`/`paymentLinks.create` call site
in `src/app/api` (7 total) to confirm this closes the class fully: `admin/prospects`
(platform-only by design — pre-tenant signup billing, correctly untouched),
`finance/bank-connect/session` (already correct), `team-members/stripe-status`/
`stripe-onboard` (already correct post-16:45), `webhooks/stripe` (session-creation N/A,
separate architecture question already flagged in the 16:45 doc, not re-touched). The
two fixed here were the only outliers.

Also checked the parallel `decryptSecret`-without-fallback pattern on `telnyx_api_key`
in the same file cluster (`documents/[id]/send`, `documents/public/[token]/sign`,
`invoices/[id]/send`, `quotes/[id]/send`, `routes/[id]/publish`) — confirmed **not**
the same bug: SMS there is gated `if (s.phone && telnyxKey && tenant?.telnyx_phone)`
and gracefully skipped when absent, email is the primary channel and already carries
the platform-fallback fix from 15:13. No fix needed there.

6 new tests (`route.platform-key-fallback.test.ts` on both files): platform-key-fallback
path (200, `new Stripe('sk_platform_test', ...)`), still-clean-500 when neither tenant
nor platform has a key, tenant-key-still-preferred-and-decrypted when configured.
RED-confirmed via `git apply -R` on the source diff alone (not stash — this worktree's
shared `.git` blocks `git stash`, used `git diff > patch && git apply -R` per the
worktree hook's own guidance) — both new fallback-path tests failed 500-not-200
pre-fix for the exact reported reason; reapplied clean, all 10 tests (6 new + 4
pre-existing rate-limit) green.

Commit `727dffd1`.

## tenant_domains schema lane

Reconfirmed intact, no drift: 043/055/056/059/068/069 all present, no DB commands run.

## Verification

- `git apply -R` RED-confirmed the fix on the source diff alone.
- `tsc --noEmit`: clean (same pre-existing baseline errors only — `admin-auth` type
  quirk + the untracked `sunnyside-clean-nyc/_lib/site-nav.ts` WIP files sitting in
  this worktree from an earlier, unrelated initiative — neither touched, neither mine).
- `eslint` on all 4 touched/added files: 0 warnings.
- Full suite: 582/582 files, 3155/3156 tests (1 pre-existing expected-fail), zero
  regressions.
- File-only, no push/deploy/DB.

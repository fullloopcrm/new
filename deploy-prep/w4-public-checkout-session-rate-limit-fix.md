# W4 report — public invoice/quote checkout rate-limit fix

21:16 LEADER order: "Continue broad-hunt, lower-risk surface. File-only, no
push/deploy/DB." Continued from the prior ~90+ W4 sweeps.

## Approach this pass

Swept the `documents/public/[token]`, `invoices/public/[token]`, and
`quotes/public/[token]` families — public, unauthenticated (token-only)
customer-facing endpoints not covered by the earlier SMS/email/AI
cost-abuse rate-limit sweeps. Confirmed `grep -rl rateLimitDb` returns zero
hits under `api/invoices`, `api/quotes`, `api/documents` before this pass —
genuinely unswept surface.

Checked token entropy first (`generateSignerToken`/`generateInvoicePublicToken`/
`generatePublicToken` all `randomBytes(24)` = 192 bits) — ruled out
brute-force guessing as a vector before looking at anything else.

Read every mutating route in the three families
(`documents/public/[token]/{sign,consent,decline}`,
`quotes/public/[token]/{accept,decline,deposit-checkout}`,
`invoices/public/[token]/checkout`). Most are already hardened against
replay: `sign` and `accept` both use atomic compare-and-swap UPDATEs
(`.eq('status', quote.status)` / `.in('status', [...])`) so a second call
after the state has already advanced returns an idempotent `already_*: true`
response before any SMS/email/deal-conversion side effect fires again —
looping them doesn't multiply cost.

## Fixed this pass

Two routes break that pattern — they are **not** idempotent, and mint a
brand-new Stripe Checkout Session on every single call with no idempotency
key:

- **`POST /api/invoices/public/[token]/checkout`**
- **`POST /api/quotes/public/[token]/deposit-checkout`**

Both compute a fixed server-side amount (balance due / deposit remaining —
already unforgeable, no caller-supplied amount) and correctly reject
terminal-state docs, but nothing stops a caller who just has the public link
from POSTing in a loop and getting a fresh live Stripe Checkout Session back
every time. Impact: the tenant's own Stripe API key eats the request volume
(their rate limit, not the platform's), so a sustained loop is a soft
self-DoS on that tenant's real checkout flow, plus dashboard clutter from
orphaned sessions. No cross-tenant leak, no platform-billed cost, no
privilege escalation — genuinely lower blast radius than the SMS/email/AI
class fixed earlier this session, but the same unbounded-action-on-a-
public-token shape.

Capped both at `rateLimitDb('<route>:${token}', 10, 10 * 60 * 1000)` — same
convention as `client-reschedule`/`portal-bookings` (commit `80c34159`).
Keyed on the public token itself (no client/tenant auth identity exists at
this layer) so the limit is per-document/per-invoice, not global.

## Also checked this pass, clean — no fix needed

- **`documents/public/[token]/route.ts` (GET)**: records a view + creates a
  signed PDF URL on every hit, no SMS/email fired, no rate limit — flagged
  as lower-priority (view-only, no paid side effect) and left alone; the
  signed-URL creation is a Supabase Storage call, not a paid third-party
  API, so the cost-abuse class doesn't apply the same way.
- **`documents/public/[token]/sign`**: atomic claim (`.in('status', [...])`)
  — a second POST after the winning claim returns `already_signed: true`
  immediately, no PDF re-render, no re-send. Clean.
- **`documents/public/[token]/consent`**: checks `consent_accepted_at`
  before writing — idempotent, no repeat audit-log spam.
- **`quotes/public/[token]/accept`**: compare-and-swap UPDATE
  (`.eq('status', quote.status)`) — already covered by an existing
  regression test (`route.accept-race.test.ts`) for this exact TOCTOU
  class. Confirmed still atomic, no new gap.
- **`quotes/public/[token]/decline`**: not reviewed line-by-line this pass
  (lower priority — declining has no cost-bearing side effect to loop), but
  noted for a future pass if broad-hunt continues into this family.

## Verification

`npx tsc --noEmit` clean. Extended the 2 existing route test files (each
mocks `@/lib/supabase` with a route-specific chain that doesn't implement
`.gte()`/`.insert()` — required adding a `@/lib/rate-limit-db` mock to both
so the new call doesn't throw against the existing mock shape) + added 2 new
dedicated `route.rate-limit.test.ts` files (429-when-exhausted /
200-when-allowed, matching the `portal/bookings` convention). Ran the 4
affected test files: 11/11 pass. Ran full suite: 358 files, 1 pre-existing
unrelated failure (`cron/tenant-health/status-coverage-divergence.test.ts`
— an intentionally-red invariant test for a separate known issue, confirmed
pre-existing via `git stash` + re-run on the unmodified tree before
restoring my changes) + 1 expected-fail + 1 skipped, 1489 passed. Zero
regressions from this change.

Committed `2075c056`. File-only, no push/deploy/DB.

# W4 — waitlist rate-limit fix + fresh-area broad-hunt (feedback auth gap + 4 anonymous rate-limit gaps)

Per LEADER order 02:08: "fix the waitlist rate-limit gap too (swap in
rateLimitDb, same pattern as track/public-upload). Then continue broad-hunt,
fresh area." Excluded per standing instruction: `referrers/*`,
`referral-commissions`, team-PIN routes.

## 1. `POST /api/waitlist` — rate limiter didn't survive cold starts

`src/app/api/waitlist/route.ts`. The public lead-capture POST used an
in-memory `Map` for its 5-per-10-min IP limiter — same class already fixed
for `track`/`public-upload`: each new serverless lambda instance starts with
an empty Map, so the limit only holds within one warm instance, not across
the fleet. Swapped to `rateLimitDb('waitlist:<tenant>:<ip>', 5, 10min)`,
matching the established pattern. Updated `route.tenantdb.test.ts`'s mock
Supabase chain to support `.gte()` (needed by `rateLimitDb`'s count query).

## 2. `GET`/`PATCH /api/feedback` — CRITICAL, zero auth

`src/app/api/feedback/route.ts` lines 16-33 (GET) and 83-105 (PATCH). Code
comment claimed "No auth check here since admin layout handles it" — but
`/admin/feedback/page.tsx` is a client component with no server-side gate,
and middleware explicitly lists `/api/feedback` as public (required for the
anonymous POST feedback-submission form used by every tenant site's
`FeedbackWidget`). Net effect: any anonymous internet user could `GET
/api/feedback` to read every platform feedback submission, and `PATCH` with
any `id` to overwrite `status`/`admin_notes` on any record.

A parallel, correctly-secured route already exists at
`/api/admin/feedback/route.ts` (gated on `requireAdmin()`) — but the admin
page calls `/api/feedback`, not that route. Fixed by adding the same
`requireAdmin()` gate to GET/PATCH on `/api/feedback` directly (POST left
public — it's the legitimate anonymous submission path). Added
`route.auth-gap.test.ts` (4 tests: anonymous rejected 401 on both GET and
PATCH, authenticated admin allowed through).

## 3-6. Four anonymous public endpoints with no rate limiting

Same bug class as `/api/track` (fixed `c492cffa`) and `/api/public-upload`
(fixed `ce4079f3`) — unauthenticated POST endpoints with no throttle at all,
letting a scripted caller flood cost-bearing operations:

- **`/api/chat`** (`src/app/api/chat/route.ts`) and **`/api/yinez`**
  (`src/app/api/yinez/route.ts`) — both invoke the Anthropic API per message
  with zero rate limiting; unbounded looping runs up real LLM spend. Added
  `rateLimitDb('chat:<tenant>:<ip>', 20, 1min)` / `rateLimitDb('yinez:<tenant
  or "unverified">:<ip>', 20, 1min)`. Updated both yinez test files
  (`route.test.ts`, `route.isolation.test.ts`) — their mock Supabase builder
  needed `.gte()` and a default `.then()` resolving `{count: 0, error:
  null}` so the new rate-limit count query doesn't throw.
- **`/api/leads`** (`src/app/api/leads/route.ts`) — public onboarding
  lead-capture, no limiter; each call inserts into `leads` +
  `partner_requests` and emails the admin. Added `rateLimitDb('leads:<ip>',
  5, 10min)`.
- **`/api/inquiry`** (`src/app/api/inquiry/route.ts`) — public contact form,
  no limiter, and *sends a confirmation email to whatever `email` the
  caller supplies* — a scriptable email-harassment vector against any
  third-party address, plus an owner-phone SMS spam vector on the
  Acquirer/$1M+ path. Added `rateLimitDb('inquiry:<ip>', 5, 10min)`.

## Noticed, not fixed (adjacent to excluded territory or lower severity)

- `/api/referrals/track` (not `/api/referrers/*`, but same subsystem) — public
  POST, no rate limit, does a `referral_code` lookup and returns tenant
  name/slug on match. Left untouched given the leader's referrer-territory
  exclusion; low severity (leaks only non-sensitive tenant identity).
- `jobs/[id]` GET and `clients/[id]` GET use `getTenantForRequest()` without
  a `requirePermission` view-gate, unlike sibling `deals`/`quotes`/`invoices`
  GETs which gate on `sales.view`/`finance.view`. Not a cross-tenant leak,
  just inconsistent permission coverage — worth a separate look.

## Verification

- `npx tsc --noEmit`: clean.
- `npx vitest run` on all touched dirs (waitlist, feedback, chat, yinez,
  leads, inquiry): 4 test files, 13 tests, all passing.

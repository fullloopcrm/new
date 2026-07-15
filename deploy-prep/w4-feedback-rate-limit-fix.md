# Fix: missing rate limit on anonymous POST /api/feedback (W4, 2026-07-15)

## Context

Fresh broad-hunt angle this round: rate-limit coverage across cost/abuse-prone
mutating endpoints, building on the earlier fixes today to
`/api/admin/translate` and `/api/settings/request-automation`. Enumerated all
`route.ts` files importing an email/SMS/Stripe/Anthropic client, filtered to
non-cron routes, then grepped each for `rateLimitDb`/`rateLimit(`. ~14 routes
came back with zero hits; read each to judge whether the missing limit is a
real gap or already covered by another control (auth trust boundary, an
idempotency check that blocks looping, or genuinely low cost).

## The gap

`POST /api/feedback` (`src/app/api/feedback/route.ts`) is intentionally
anonymous — no RBAC gate, public feedback widget (confirmed by the existing
`route.auth-gap.test.ts`, which documents that GET/PATCH are admin-gated but
POST stays open by design). It had **zero rate limiting**. Every call inserts
a `platform_feedback` row and fires `sendEmail()` to the platform admin inbox
(`ADMIN_NOTIFICATION_EMAIL`/`ADMIN_EMAIL`) unconditionally.

This is the identical bug class already fixed today on
`/api/settings/request-automation` (admin-inbox email-spam vector) — except
here there isn't even an authenticated tenant to hold accountable; it's a
fully public, unauthenticated endpoint. Anyone could script a loop against it
to flood the admin inbox with Resend sends at zero cost to themselves.

## Fix

Added `rateLimitDb('feedback:<ip>', 5, 60 * 60 * 1000)` keyed by
`x-forwarded-for` (falls back to `'unknown'`), same shape as the existing
public/anonymous pattern in `/api/contact` (`contact:<tenant>:<ip>`) — the
established convention for routes with no auth context to key on. 429s before
the DB insert or email send if exceeded.

## Verification

- New `route.rate-limit.test.ts`: 429 + no `sendEmail` call when the limiter
  denies; 201 + one `sendEmail` call when it allows. Mirrors the
  `request-automation` rate-limit test shape.
- Existing `route.auth-gap.test.ts` (GET/PATCH admin-gate regression)
  unaffected — 2 test files / 6 tests total in `feedback/`, all pass.
- `npx tsc --noEmit` clean.
- Full suite: 1460 passed, 1 pre-existing expected fail (unrelated —
  `cron/tenant-health/status-coverage-divergence.test.ts`, a Fortress
  monitoring-coverage gap, not touched by this change), 1 skipped.

## Other candidates checked this round, not fixed (documented, not urgent)

- `sms/route.ts` (POST, `clients.edit`-gated) and `sms/send/route.ts` (POST,
  `campaigns.send`-gated) — no rate limit, but require staff auth first;
  lower priority than the fully-anonymous feedback route. Same cost class as
  the already-fixed translate route (Telnyx spend per call) if someone wants
  to harden further.
- `reviews/request/route.ts` (`reviews.request`-gated) — same shape, staff-only.
- `client/reschedule/[id]/route.ts` — portal-client-session-gated (not admin,
  but session-authenticated), fires client email+SMS+admin notify per call
  with no rate limit; worth a look if portal abuse becomes a concern.
- `team-portal/15min-alert/route.ts` — has a 30-min idempotency window but a
  caller-supplied `force: true` flag bypasses it entirely; a malicious/
  compromised team-portal token holder could loop this to spam ~3 SMS sends
  per call with no external throttle. Gated behind a portal auth token, so
  lower priority than the anonymous feedback gap, but flagging as the next
  candidate if this angle continues.
- `quotes/public/[token]/deposit-checkout`, `invoices/public/[token]/checkout`,
  `documents/public/[token]/sign` — public but gated by unguessable 192-bit
  tokens (same class already confirmed safe in the supabaseAdmin baseline
  audit); Stripe/PDF calls per request but no email-inbox-flood vector and no
  brute-forceable secret, so not treated as urgent.
- `dashboard/comms-preview/route.ts`, `docs/route.ts` — staff-auth-gated
  internal tooling, negligible abuse surface.

## Bottom line

One real gap found and fixed (anonymous feedback-form email-spam vector),
file-only, no push/deploy/DB. 5 other candidates surfaced and documented
above — none met the "clearly live-exploitable now" bar the same way the
anonymous route did, but they're the natural next targets if this angle
continues.

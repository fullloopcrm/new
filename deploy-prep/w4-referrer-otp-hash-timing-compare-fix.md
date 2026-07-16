# W4 — referrer-portal OTP hash comparison uses plain `===` (fixed)

**Date:** 2026-07-15 20:00 EDT
**Branch:** p1-w4

## Context

Continuation of broad-hunt on lower-risk surface. Reviewed the not-yet-audited
`documents`, `invoices`, and `referrers/auth` route trees (public-token
signing/checkout flows, OTP login) looking for IDOR/auth gaps in the pattern
of prior W4 findings.

`documents/public/[token]/*` (view/consent/sign/decline) and
`invoices/public/[token]/*` (view/checkout) all check out clean: tokens are
`randomBytes(24)` (192-bit, unguessable), every mutation is scoped by the
token-resolved row id (not caller-supplied ids), the Stripe checkout amount
is always server-computed from `invoice.total_cents - amount_paid_cents`
(no client-controlled price), and the webhook handler
(`webhooks/stripe/route.ts`) claims the invoice-payment path via a unique
constraint on `stripe_session_id` — no double-credit race.

## Finding

`src/app/api/referrers/auth/verify/route.ts:57` compared the stored OTP hash
with plain `===`:

```ts
referrer.otp_hash === hashOtp(code)
```

The shared `safeEqual()` helper (`lib/secret-compare.ts`) exists specifically
to close this bug class and was already applied elsewhere tonight (admin PIN,
`ELCHAPO_MONITOR_KEY`, commit `610bc236`). Notably, the *sibling* function in
the very same file, `verifyReferrerToken` (`lib/referrer-portal-auth.ts`),
already does a manual `crypto.timingSafeEqual` for its HMAC signature check —
so this one comparison was the odd one out even within its own module.

Practical severity is low: `hashOtp` is `HMAC-SHA256(secret, "otp:"+code)`, so
a timing side-channel here would at best let an attacker infer bytes of the
stored *HMAC output*, not the underlying 6-digit code — recovering the code
from that still requires breaking HMAC-SHA256 preimage resistance, which
timing alone doesn't provide. This is the same "defense-in-depth /
consistency" characterization as the admin-PIN fix earlier tonight, not a
demonstrated live exploit. Endpoint is also already rate-limited (8
attempts/15min per email, 30/15min per IP, fail-closed).

## Fix

Imported `safeEqual` from `@/lib/secret-compare` and replaced the `===` with
`safeEqual(referrer.otp_hash, hashOtp(code))`. No behavior change for valid
inputs.

## Verification

- `npx tsc --noEmit` — clean.
- `npx vitest run src/app/api/referrers/auth` — 3 test files, 9/9 passed
  (includes the existing OTP brute-force and ILIKE-injection tests for this
  exact route).

File-only. No push/deploy/DB.

# Fleet-wide webhook/cron auth audit — p1-w3, 2026-07-13

Scope: every route under `platform/src/app/api/webhooks/*` (9 routes) and
`platform/src/app/api/cron/*` (43 routes) — checked each for a real
signature/secret/cron-header gate before doing anything state-changing, not
just a soft convention (payload-derived allowlists, env vars that fail open).

## Fixed on this branch (see deploy-prep/telegram-webhook-secret-activation.md for activation steps)

**CRITICAL — Telegram webhooks had no origin verification at all.**
`webhooks/telegram/route.ts`, `webhooks/telegram/jefe/route.ts`,
`webhooks/telegram/[tenant]/route.ts` all "authed" by comparing a `chat_id`
taken from the POST body against an allowlist. Telegram doesn't sign webhook
bodies, so that chat_id is fully attacker-controlled — anyone who finds the
URL and guesses/leaks the owner's chat ID can forge an update and drive the
AI agent (Yinez / Jefe) with owner-tier tools. Same class as the earlier
telegram/jefe finding this session; it was NOT yet fixed on this branch.

Fix: `verifyTelegramSecretToken()` (`src/lib/webhook-verify.ts`) checks
Telegram's `X-Telegram-Bot-Api-Secret-Token` header against a registered
secret. Soft-gated (passes through unverified until a secret is actually
configured) so merging doesn't break live bots — **it is not a complete fix
until the activation steps in the companion doc are run.** tsc clean, 23 new
tests (14 helper unit tests + 9 route-level 401 tests), all passing.

## Verified solid — no action needed

- `webhooks/stripe/route.ts`, `webhooks/stripe-platform/route.ts` — Stripe
  signature verification (`stripe.webhooks.constructEvent`), fail-closed if
  the webhook secret env var is missing.
- `webhooks/clerk/route.ts`, `webhooks/resend/route.ts` — Svix HMAC
  verification via `verifySvix()`, fail-closed, default-on (opt-out only via
  explicit `..._VERIFY=off`).
- `webhooks/telnyx/route.ts` — Ed25519 verification via `verifyTelnyx()`,
  same fail-closed/default-on pattern.
- 5 cron routes (`anthropic-health`, `confirmation-reminder`, `phone-fixup`,
  `rating-prompt`, `refresh-job-postings`) use `protectCronAPI()`
  (`src/lib/nycmaid/auth.ts`) — fails closed (500s) if `CRON_SECRET` isn't
  set. Solid; my first grep pass missed these because it searched for the
  literal string `CRON_SECRET` in the route file instead of the import.
- 6 cron routes (`finance-post`, `comms-monitor`, `health-monitor`,
  `jefe-heartbeat`, `recurring-expenses`, `auto-reply-reviews`) inline the
  same fail-closed pattern (`if (!secret || auth !== ...)`).

## Flagged for owners — not fixed here (out of my lane / needs prod coordination or config knowledge I don't have)

**MEDIUM — `webhooks/telnyx-voice/route.ts` signature check is fail-OPEN.**
Line ~390: `if (process.env.TELNYX_PUBLIC_KEY) { verify signature }` — if
`TELNYX_PUBLIC_KEY` isn't set, there is **no verification at all** and the
route (which drives live call-control: bridging calls to the admin ring
list, hanging up, recording, sending the missed-call SMS) accepts anything.
Inconsistent with `verifyTelnyx()`'s own fail-closed default used by the SMS
webhook. I didn't flip this to fail-closed myself because I can't confirm
`TELNYX_PUBLIC_KEY` is actually set in prod — doing so blind risks a live
voice-routing outage if it isn't. Whoever owns Telnyx voice config should
confirm the key is set, then align this route to call `verifyTelnyx()`
directly (same helper the SMS route already uses) instead of hand-rolling a
conditional check.

**MEDIUM — two cron routes accept `x-vercel-cron: 1` as an OR-bypass even
when `CRON_SECRET` is set.** `cron/comhub-email/route.ts` (line 285) and
`cron/payment-followup-daily/route.ts` (line 47) both accept
`request.headers.get('x-vercel-cron') === '1'` as an alternative to a valid
bearer secret. I believe (not fully verified — flagging per honesty rules
rather than asserting) that Vercel's platform strips inbound `x-vercel-*`
system headers from external requests before they reach the function, in
which case this is safe by design. If that assumption is wrong, this header
is attacker-settable and the bypass is real. Whoever owns these two crons
should confirm Vercel's header-stripping guarantee (or just drop the
OR-bypass — `CRON_SECRET` alone already covers genuine Vercel Cron
invocations per Vercel's own docs) before relying on it as a security
boundary.

**LOW — ~30 cron routes use a bare `authHeader !== \`Bearer ${process.env.CRON_SECRET}\``
compare without first checking the secret is actually set.** If
`CRON_SECRET` were ever unset in prod, this becomes a literal string compare
against `"Bearer undefined"` — an attacker sending that exact header bypasses
auth. Not exploitable under correct configuration (CRON_SECRET should always
be set), but it's a footgun: 11 other cron routes already guard this
correctly (`protectCronAPI()` or an inline `!secret ||` check). Recommend
standardizing the remaining ~30 on `protectCronAPI()` for defense in depth.
Left unfixed here — it's a 30-file mechanical sweep with several slightly
different response shapes per file, more than this session's blast-radius
budget for a non-currently-exploitable issue; flagging for whoever owns the
cron fleet to batch.

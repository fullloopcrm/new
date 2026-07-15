# W4 broad-hunt: unauthenticated storage-abuse rate limit gaps

Scope: fresh area, excluding referrers/referral-commissions/team-PIN routes per
LEADER order. Areas covered this pass: `src/app/api/webhooks/telegram*`,
`src/app/api/webhooks/telnyx*`, `src/app/api/webhooks/resend`,
`src/app/api/social/**`, `src/app/api/google/**`, `src/lib/oauth-state.ts`,
`src/app/api/reviews/**`, `src/app/api/public-upload`, `src/app/api/uploads`.

## Fixed

**`src/app/api/public-upload/route.ts` and `src/app/api/reviews/upload/route.ts`
— fully unauthenticated file-upload endpoints had NO rate limit at all.**

Both routes resolve tenant purely from the signed `x-tenant-id` header
(middleware, tenant public host) — no login required, by design (marketing-site
forms / public review widget). Both already validate size/type (25MB images+
video for public-upload; 10MB images / 100MB video for reviews/upload) and
write into the shared `uploads` Supabase Storage bucket. Neither had any
throttle: an anonymous caller could loop either endpoint indefinitely,
writing arbitrarily many 25MB (or 100MB video) objects into the shared bucket,
burning storage cost/quota against any tenant whose public host it hits — the
same abuse-vector class as the `/api/track` email-bombing fix from earlier
this session (unauthenticated beacon with no per-caller cap), just against
storage spend instead of email-sending reputation.

Fix: added a per-IP `rateLimitDb` cap (20 uploads/hour) ahead of the storage
write in both routes, matching the existing convention in
`reviews/submit/route.ts` (`rateLimitDb('reviews:${ip}', 5, 60*60*1000)`).

Verified:
- New `route.rate-limit.test.ts` in both directories (2 tests each): caps
  uploads per IP under an unbounded loop, and confirms a different IP isn't
  cross-throttled by the first attacker's bucket. 4/4 pass.
- `npx tsc --noEmit` — clean.
- Full suite: 258/259 files, 1203/1207 tests pass, 1 pre-existing
  self-documented "RED until fixed" failure in
  `cron/tenant-health/status-coverage-divergence.test.ts` (unrelated to this
  change, not a regression), 2 expected fails, 1 skipped — matches baseline.

## Reviewed, no issue found

- **Telegram webhooks** (`webhooks/telegram/route.ts`, `.../jefe/route.ts`,
  `.../[tenant]/route.ts`): all fail-closed on `X-Telegram-Bot-Api-Secret-Token`
  via `verifyTelegramWebhook`/`deriveTelegramSecret` (HMAC-derived per-scope
  secret, constant-time compare, rejects when master secret unset). Tenant-bot
  route additionally scopes the derived secret to `tenant:<id>` so a secret
  minted for one tenant's bot can't drive another's.
- **Telnyx SMS + voice webhooks** (`webhooks/telnyx/route.ts`,
  `webhooks/telnyx-voice/route.ts`): Ed25519 signature verification
  (`verifyTelnyx`) with a 5-minute timestamp window, fail-closed unless
  explicitly disabled AND `NODE_ENV !== 'production'`
  (`isWebhookVerifyDisabled` ignores the escape hatch in prod regardless of
  the env flag's value). Voice route fail-closed on ambiguous/missing
  DID→tenant mapping (`resolveVoiceTenant`, `limit(2)` not `.single()`).
- **Resend webhook** (`webhooks/resend/route.ts`): Svix HMAC verification,
  same fail-closed-in-prod pattern; inbound email drops (doesn't insert)
  when no tenant resolves for the recipient address rather than writing an
  unscoped row.
- **Social OAuth** (`social/connect/facebook*`, `social/connect/instagram*`)
  and **Google OAuth** (`google/auth`, `google/callback`): both use
  `signOAuthState`/`verifyOAuthState` (`src/lib/oauth-state.ts`) — HMAC-signed
  tenant id + 15-min expiry, constant-time compare — closing the CSRF/CWE-352
  hole a raw tenant-id `state` param would otherwise have. `google/posts`,
  `google/reviews`, `google/status`, `social/accounts`, `social/post`,
  `social/posts` all correctly gated via `getTenantForRequest`/
  `requirePermission` and scoped to `tenant.id`/`tenant.tenantId`.
- **Reviews module** (`reviews/route.ts`, `reviews/request/route.ts`,
  `reviews/[id]/route.ts`): internal CRUD correctly gated on
  `requirePermission('reviews.view'|'reviews.request')` and scoped to
  `tenant.tenantId` on every read/write. `reviews/submit/route.ts` (public)
  already had a per-IP rate limit + escapes user input before HTML email.
- **`uploads/route.ts`** (authenticated, `getTenantForRequest`): no rate limit,
  but this is a logged-in tenant user uploading to their own tenant's prefix —
  not the anonymous-abuse class the other two routes are; left as-is.

## Not touched (per LEADER order)

Did not open referrers, referral-commissions, or team-PIN/team-portal/team*/
cleaners routes.

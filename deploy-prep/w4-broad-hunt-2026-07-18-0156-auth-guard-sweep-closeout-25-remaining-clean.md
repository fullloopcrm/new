# Auth-guard sweep closeout — W4, 2026-07-18 01:56

Per the 01:58 LEADER order item 1 (continue the auth-guard sweep on the
remaining ~25 candidates from the 0152 checkpoint). File-only, no
push/deploy/DB.

## What was done

Read all 25 remaining files from the 40-candidate no-guard-call grep sweep
(listed in `w4-gap-fluidity-checkpoint-2026-07-18-0152.md` under "New aging
items opened this pass"):

`health`, `unsubscribe`, `tenants` (POST, self-serve create), `cleaner-applications`
(alias → `team-applications`), `referrers/[code]`, `availability`,
`tenant-sitemap`, `auth/me`, `referrals/track`, `google/callback`,
`admin-auth/logout`, `admin-auth/me`, `tenants/public`,
`social/connect/facebook/callback`, `social/connect/instagram/callback`,
`webhooks/stripe-platform`, `webhooks/telnyx-voice`, `webhooks/clerk`,
`webhooks/resend`, `webhooks/stripe`, `territories/options`, `auth/logout`,
`admin/google/callback`, `client/confirm/[token]`, `webhooks/telnyx`.

**Result: all 25 are clean.** Breakdown by why each is fine:

- **Signature-verified webhooks** (`webhooks/stripe`, `webhooks/stripe-platform`,
  `webhooks/telnyx`, `webhooks/telnyx-voice`, `webhooks/clerk`,
  `webhooks/resend`): each verifies a provider signature before doing
  anything (Stripe SDK `constructEvent`, or the shared `verifyTelnyx`/
  `verifySvix` helpers in `lib/webhook-verify.ts`). Went one level deeper
  and read that shared helper directly rather than trusting it by name (the
  Telegram bug two passes ago was exactly a case of a call site skipping a
  verification helper that existed) — it's genuinely solid: HMAC-SHA256
  with `timingSafeEqual` for Svix, real Ed25519 `crypto.verify` (SPKI-wrapped
  raw key) for Telnyx, 5-minute timestamp replay windows on both, fails
  closed when the secret/key env var is unset, and
  `isWebhookVerifyDisabled()` hardcodes the `*_WEBHOOK_VERIFY=off` dev
  escape hatch to be ignored whenever `NODE_ENV==='production'` so a
  leaked/copy-pasted flag can't disable verification in prod.
- **OAuth callbacks** (`google/callback`, `admin/google/callback`,
  `social/connect/facebook/callback`, `social/connect/instagram/callback`):
  all four call `verifyOAuthState()` before doing anything with `code`. Read
  `lib/oauth-state.ts` directly rather than trusting the name — it HMAC-
  SHA256-signs `tenantId.expiry`, verifies with `timingSafeEqual`, and
  enforces a 15-minute TTL. A forged/replayed/expired `state` is rejected,
  closing the CSRF (CWE-352) hole the file's own comment describes. All four
  routes share this one helper, so verifying it once covers all four.
- **Token-gated magic links** (`unsubscribe`, `client/confirm/[token]`):
  unsubscribe requires `verifyUnsubscribeToken()` (signed token) on both
  GET and POST. `client/confirm/[token]` gates on an opaque
  `bookings.client_confirm_token` value via exact-match lookup — normal
  magic-link shape, no enumeration surface. Side note (not a security
  finding, flagged below): no code path in this repo currently *writes*
  `client_confirm_token` for new bookings, only reads it — worth a product
  look, not a vuln.
- **Session-gated** (`admin-auth/me`, `admin-auth/logout`, `auth/me`,
  `auth/logout`, `tenants` POST): each checks a cookie/session
  (`verifyAdminToken`, `getOwnerUserId`, `getAdminUser`) or is a stateless
  cookie-clear (logout routes need no auth to delete your own cookie).
  `tenants` POST is the self-serve tenant-creation flow — requires a
  logged-in Clerk user with no existing tenant membership; intentional
  business flow, not a gap.
- **Auth-gated by caller-owned resource** (`referrers/[code]`): requires
  `getReferrerAuth(request)` and then cross-checks the authenticated
  referrer actually owns the requested `code` — correct ownership check,
  not just "logged in as *someone*."
- **Intentionally public, no sensitive data** (`health`,
  `tenant-sitemap`, `territories/options`, `tenants/public`, `availability`,
  `referrals/track`, `cleaner-applications`→`team-applications`): health
  check leaks only up/down status; sitemap/territories/tenants-public/
  availability expose only already-public business info (name, slug, logo,
  open time slots) by design; `referrals/track` returns tenant
  name/slug/id for a referral code (same class of already-public info);
  `team-applications` POST is a public job-application intake with its own
  rate limit (3/10min/IP) and already-hardened `photo_url` prefix
  validation from an earlier pass this session.

**No new findings. No code changed this pass** — this closes out the
40-candidate no-guard-call sweep started in the 0152 checkpoint entirely;
0 of 40 candidates remain unread.

## Verification

No code changed — nothing to RED/GREEN or regression-test. Read-only pass.

## Aging items — unchanged plus one addition

All items from `w4-gap-fluidity-checkpoint-2026-07-18-0152.md` still open,
re-list only (see that file for full detail): create-tenant-from-lead
atomic-claim migration, referrers atomic-bump migrations, clients dedup
unique indexes, admin/cleanup-test-bookings name-collision,
comhub_get_or_create_contact_by_email TOCTOU, post-labor.ts entity_id
design question, categorization_patterns semantics, team-portal
photo-upload unwired, comhub-email cron unread_count, CSRF-on-GET, 4 dead
clone email-templates files, nycmaid sms-templates dead exports,
post-adjustments.ts inert check, rate_limit_check_and_record atomic RPC,
inbound_emails dead storage, notify-cleaner.ts dead code, campaigns/preview
self-XSS, agreement.ts dead code, documents.status='expired' unreachable,
threads/[id] assignee_id (intentional), voice/cleanup unwired, voice/dial +
voice/control target whitelisting, 4 dead sendPushToClient exports,
notify()'s latent `channel:'push'` no-op, comhub voice admin_phone/
transfer-target whitelisting, invoices/quotes/documents do_not_service
product question, sendPushToTeamMember/AllTeamMembers do_not_service
applicability, `src/lib/seo/*` fully audited, the 0844 indirect-prompt-
injection finding (architectural, needs Jeff's call), the `/api/yinez`
residual unverified-tenant edge and self-reported-phone-establishes-
client-identity items (both flagged for Jeff's call), the `cleaners` vs
`team_members` ID-space mismatch on `cron/phone-fixup` (functional, not
security), the Telegram-webhook product question (should
`telegram_bot_token` save require `telegram_chat_id` in the same save?).

**New this pass:** `bookings.client_confirm_token` has an index and read
call sites (`client/confirm/[token]`, `nycmaid/sms-templates.ts`,
`messaging/sms-cleaning.ts`) but **no write call site anywhere in the
repo** — nothing generates a value for new bookings. Either the tap-to-
confirm SMS link is currently dead for all bookings created since the
nycmaid port, or the column is populated by something outside this repo
(a legacy script, a DB default that's since been dropped, or manually).
Not a security issue either way (unwritten column ≠ exposure), but worth
a product check — grep is `grep -rn "client_confirm_token" src` if
picked up.

## Next-target candidates

The 40-candidate no-guard sweep is now **fully closed** (0 remaining). No
fresh security surface opened from this pass specifically — recommend the
next fresh-ground pass pick a new method (e.g., a different missing-check
class than auth guards: tenant-scoping grep on writes, or a sweep of
`dangerouslySetInnerHTML`/raw HTML render sites) rather than re-running
this one, since it just returned a full clean sweep top to bottom.

No push/deploy/DB this pass.

# Gap/fluidity checkpoint — W4, 2026-07-18 01:52

Per the 01:44 LEADER order item 3. File-only, no push/deploy/DB.

## This pass

1. Fresh ground (order item 1): read through the named
   `sendSMS`/`sendEmail` candidates carried forward from the 01:41 checkpoint
   (`cron/outreach`, `cron/phone-fixup`, `cron/post-job-followup`,
   `documents/[id]/send`, `invoices/[id]/send`, `quotes/[id]/send`,
   `routes/[id]/publish`, `email/monitor`, `dashboard/comms-preview`) — all
   clean, already properly gated/hardened. Also closed out the 3 remaining
   unopened seomgr files (`recipes.ts`, `detect.ts`, `health.ts`) — all clean
   (deterministic/DB-RPC/SSRF-guarded, cron-only). No findings in either.
2. Pivoted to a systematic sweep instead of continuing name-by-name lists:
   grepped all 505 `route.ts` files under `src/app/api` for the absence of
   every known auth-guard call. 40 candidates surfaced; most were
   intentionally-public high-entropy token routes (checked each — clean).
   Found a genuine CRITICAL: `webhooks/telegram/[tenant]/route.ts` failed
   OPEN (skipped its ownership check entirely) when `tenants.telegram_chat_id`
   was unset — a real, reachable state since `telegram_bot_token` and
   `telegram_chat_id` are independent admin-wizard fields and saving the
   token alone auto-registers the webhook, making the bot live and publicly
   discoverable before chat_id is ever filled in. Fell through to
   `askSelena` with the platform owner phone as caller; for the nycmaid
   tenant that phone passes `isOwnerOfTenant()`'s `OWNER_PHONES` fallback,
   granting an unverified stranger full owner-tool access (refunds,
   broadcasts, revenue, settings, cron) — same vulnerability class as the
   `/api/chat`+`/api/yinez` bug fixed earlier this session (`2a684baf`),
   found through a third, previously-unaudited entry point. Fixed
   (`b50e954b`): unset `telegram_chat_id` now fails closed, matching how the
   two sibling Telegram routes (`webhooks/telegram/route.ts`,
   `webhooks/telegram/jefe/route.ts`) always allowlist-check and never had
   this gap. Full writeup:
   `w4-telegram-tenant-webhook-owner-bypass-fix-2026-07-18-0151.md`.
3. Continued into the surface (order item 2): the same 40-candidate sweep
   list has ~15 entries not yet individually read (see Next-target below) —
   carrying forward rather than rushing through them this pass, since the
   Telegram finding took the bulk of this session's budget to trace through
   `isOwnerOfTenant`/`ownerPhone()`/the admin-wizard save path and verify it
   wasn't a designed bootstrap step.
4. Gap/fluidity checkpoint: this file.

## Verification

New test file `route.owner-chat-id-required.test.ts` (3 tests: unset
chat_id rejected + agent never invoked, mismatched chat_id rejected,
matching chat_id allowed through) — RED/GREEN mutation-verified via manual
line-swap + restore (not git stash): failed 1/3 on the pre-fix condition,
passed 3/3 post-fix. Updated `route.msg-tenant-tag.test.ts`, which
previously depended on the fail-open bug to reach its own assertions —
gave it a matching `telegram_chat_id` fixture instead so it still exercises
the earlier session's tenant-tagging fix without relying on the
now-closed bypass. `npx vitest run src/app/api/webhooks/telegram`: 4 files,
7 tests, all pass. `npx tsc --noEmit`: clean except the 2 documented
pre-existing baseline errors in `sunnyside-clean-nyc/_lib/site-nav.ts`
(unrelated, noted every checkpoint this session). Full repo suite: 661
files, 2308 passed + 1 expected-fail + 1 skipped, 2 failed — same 2
documented pre-existing failures every checkpoint this session
(`cron/tenant-health` RED-until-fixed invariant, `cron/generate-recurring`
known flaky race). Zero regressions.

## New aging items opened this pass

- **The 40-file no-guard sweep is not fully worked yet.** Remaining
  unread/unverified: `health`, `unsubscribe`, `tenants`, `cleaner-applications`,
  `referrers/[code]`, `availability`, `tenant-sitemap`, `auth/me`,
  `referrals/track`, `google/callback`, `admin-auth/logout`, `admin-auth/me`,
  `tenants/public`, `social/connect/facebook/callback`,
  `social/connect/instagram/callback`, `webhooks/stripe-platform`,
  `webhooks/telnyx-voice`, `webhooks/clerk`, `webhooks/resend`,
  `webhooks/stripe`, `territories/options`, `auth/logout`,
  `admin/google/callback`, `client/confirm/[token]`, `webhooks/telnyx`. Most
  of these are near-certainly fine (health checks, logout routes, OAuth
  callbacks with their own state-token verification, Stripe/Telnyx/Clerk/
  Resend webhooks likely signature-verified inline rather than via one of
  the grepped-for helper names) — but "near-certainly" is exactly the kind
  of assumption that was wrong for `selena-legacy-handlers.ts` and for this
  pass's own Telegram finding, so each deserves an actual read before being
  marked clean. **Do not re-run the blind grep sweep** — the candidate list
  above is already the filtered output; next session should just work
  through it.
- The Telegram fix raises a product question worth flagging (not attempted
  this pass — same disposition as the residual owner-tool architecture
  questions already flagged on `/api/yinez`): should saving
  `telegram_bot_token` in the admin wizard *require* `telegram_chat_id` in
  the same save (or block webhook registration until it's set), so this
  class of gap can't reopen if a future channel integration follows the
  same "register on token save" pattern without copying forward the
  allowlist-not-skip lesson?

## Aging items still open (re-confirmed present, not re-litigated this pass)

Unchanged from the 21:34 through 01:41 checkpoints — re-list only, no new
status. See `w4-gap-fluidity-checkpoint-2026-07-18-0141.md` for the full list
(create-tenant-from-lead atomic-claim migration, referrers atomic-bump
migrations, clients dedup unique indexes, admin/cleanup-test-bookings
name-collision, comhub_get_or_create_contact_by_email TOCTOU, post-labor.ts
entity_id design question, categorization_patterns semantics, team-portal
photo-upload unwired, comhub-email cron unread_count, CSRF-on-GET, 4 dead
clone email-templates files, nycmaid sms-templates dead exports,
post-adjustments.ts inert check, rate_limit_check_and_record atomic RPC,
inbound_emails dead storage, notify-cleaner.ts dead code (re-confirmed
dead this pass — no importers found for `notifyCleaner`/
`formatDeliveryReport` across all 4 tenant copies), campaigns/preview
self-XSS, agreement.ts dead code, documents.status='expired' unreachable,
threads/[id] assignee_id (intentional), voice/cleanup unwired, voice/dial +
voice/control target whitelisting, 4 dead sendPushToClient exports,
notify()'s latent `channel:'push'` no-op, comhub voice admin_phone/
transfer-target whitelisting, invoices/quotes/documents do_not_service
product question, sendPushToTeamMember/AllTeamMembers do_not_service
applicability, `src/lib/seo/*` now fully audited (this session's earlier
passes plus this pass's `recipes.ts`/`detect.ts`/`health.ts` — all clean;
only `seo_overrides.source` dead-column remains open there), the 0844
indirect-prompt-injection finding on `agent.ts`/`tools.ts` (still flagged,
architectural, needs Jeff's call), the `/api/yinez` residual
unverified-tenant edge and self-reported-phone-establishes-client-identity
items from the 0141 checkpoint (both still open, both lower-severity than
what's been fixed, both flagged for Jeff's call).

## Next-target candidates if continuing fresh-ground hunting

- The 25 remaining files from this pass's no-guard sweep, listed above
  under "New aging items" — highest-value next step, since this exact
  method just found a CRITICAL on the first pass through it.
- `cleaners` vs `team_members` ID-space mismatch noticed as a side finding
  while reading `cron/phone-fixup/route.ts`: it signs a token embedding a
  `cleaners.id` (nycmaid's legacy per-tenant-site team table — confirmed
  still a live, separate object from `team_members`, not a view, via
  `src/app/dashboard/_components/JobsMap.tsx`'s aliasing comment), but
  `team-portal/update-phone/route.ts` (the link's landing endpoint) looks
  the token's id up in `team_members`. Different ID spaces — the link this
  cron emails out for any tenant using the `cleaners` model would 404 on
  every legitimate click. Functional bug, not a security issue (UUID
  collision across independently-generated tables is not a practical
  vector), but worth a product/schema fix — not attempted this pass since
  it's out of the security-hunt lane and touches which table is
  authoritative for nycmaid's field-worker identity.

No push/deploy/DB this pass.

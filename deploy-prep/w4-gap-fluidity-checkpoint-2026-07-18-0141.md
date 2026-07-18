# Gap/fluidity checkpoint — W4, 2026-07-18 01:41

Per the 01:30 LEADER order item 3. File-only, no push/deploy/DB.

## This pass

1. Committed prior-turn's completed-but-uncommitted work: the 5-handler
   cross-client IDOR fix in `selena-legacy-handlers.ts`
   (`4c8ac3c7`) — was sitting as an uncommitted diff at session start with its
   report already written (`w4-selena-legacy-handlers-cross-client-idor-fix-2026-07-18-0125.md`).
2. Fresh ground (order item 1): audited every previously-unopened file in
   `src/lib/selena/` (`agent-config.ts`, `agent-config-loader.ts`,
   `build-playbook.ts`, `prompt-assembler.ts`, `persona-file.ts`, `metrics.ts`)
   — all clean (scaffolding not yet wired live, or read-only tenant-scoped).
   Re-verified `tools.ts`'s FK-ownership-guard coverage (the class the
   01:30 order pointed at) — already comprehensive there, not fresh ground.
3. Continued into the surface (order item 2): auditing `agent.ts`'s dispatch
   loop surfaced a new, more severe bug in the same trust boundary —
   `isOwnerOfTenant(phone, tenantId)` is the sole gate on owner-only tools
   (`process_stripe_refund`, `send_broadcast`, `get_revenue`, `update_setting`,
   `trigger_cron`, `block_client`, etc.), and two live, fully public,
   unauthenticated routes (`POST /api/chat`, `POST /api/yinez` — the web-chat
   widgets embedded on every tenant's own site) forwarded a caller-supplied
   `phone` field straight into that check with zero verification. Unlike SMS
   (Telnyx-signature-verified sender) or Telegram/admin-chat
   (`requireAdmin()`-gated), anyone who knew or guessed a tenant's registered
   `owner_phone` could claim it in the request body and be granted full
   owner-tool access — no SMS possession, no session, nothing. Fixed both
   routes: strip a caller-supplied phone that would pass `isOwnerOfTenant()`
   before it reaches the agent (`2a684baf`). Full writeup:
   `w4-yinez-webchat-owner-phone-spoof-fix-2026-07-18-0139.md`.
4. Gap/fluidity checkpoint: this file.

## Verification

New tests: 5-handler fix carries its own 6-test file (unchanged from the
prior turn, all passing). Owner-phone-spoof fix: 2 new test files
(`route.owner-phone-spoof.test.ts` × 2), 4 pre-existing test files updated to
mock the newly-imported `isOwnerOfTenant` export. `npx vitest run
src/app/api/chat src/app/api/yinez`: 7 files, 17 tests, all pass. `npx tsc
--noEmit`: clean except the 2 documented pre-existing baseline errors in
`sunnyside-clean-nyc/_lib/site-nav.ts` (noted every checkpoint this session,
unrelated, present before this session's changes).

## New aging items opened this pass

- **`/api/yinez` residual unverified-tenant edge**: the owner-phone-spoof fix
  only checks `isOwnerOfTenant()` when the request's `x-tenant-id` is
  middleware-signature-verified (`reqTenantId` present) — matching how the
  rest of that route already treats an unverified tenant as "no tenant-scoped
  action taken." A request that omits tenant headers entirely, whose new
  conversation later resolves to nycmaid's default tenant inside
  `resolveTenantForConversation`, and that specifically targets nycmaid's
  `owner_phone`, is not covered. Narrower and lower-probability than the fixed
  path (requires omitting headers most legitimate widget traffic sends).
- **Self-reported `phone` also establishes CLIENT identity on these same two
  routes** (via the already-hardened exact-match returning-client lookup) —
  an attacker who knows a *specific* real client's phone number could still
  open the widget and act on that client's booking/account
  (`reschedule_booking`, `cancel_booking`, `update_account`, etc.) without SMS
  possession. Lower severity than the fixed owner-tool bypass (bounded to one
  known client vs. every owner-gated tool tenant-wide) and the original IDOR-
  fix authors were already aware the endpoint is unauthenticated for this
  purpose. Full closure needs a "verified vs. self-reported phone" flag
  threaded through `agent.ts`/`tools.ts` across all ~11 `askSelena` call
  sites — larger architectural change, flagged for Jeff's call rather than
  attempted this pass (same disposition as the 0844 indirect-prompt-injection
  finding on this same file).

## Aging items still open (re-confirmed present, not re-litigated this pass)

Unchanged from the 21:34 through 01:28 checkpoints — re-list only, no new
status. See `w4-gap-fluidity-checkpoint-2026-07-18-0128.md` for the full list
(create-tenant-from-lead atomic-claim migration, referrers atomic-bump
migrations, clients dedup unique indexes, admin/cleanup-test-bookings
name-collision, comhub_get_or_create_contact_by_email TOCTOU, post-labor.ts
entity_id design question, categorization_patterns semantics, team-portal
photo-upload unwired, comhub-email cron unread_count, CSRF-on-GET, 4 dead
clone email-templates files, nycmaid sms-templates dead exports,
post-adjustments.ts inert check, rate_limit_check_and_record atomic RPC,
inbound_emails dead storage, notify-cleaner.ts dead code, campaigns/preview
self-XSS, agreement.ts dead code, documents.status='expired' unreachable,
threads/[id] assignee_id (intentional), voice/cleanup unwired, voice/dial +
voice/control target whitelisting, 4 dead sendPushToClient exports, notify()'s
latent `channel:'push'` no-op, comhub voice admin_phone/transfer-target
whitelisting, invoices/quotes/documents do_not_service product question,
sendPushToTeamMember/AllTeamMembers do_not_service applicability, ~50
unvetted sendSMS/sendEmail files, `src/lib/seo/*` — this pass's audit of
`remediate.ts`, `competitor-remediate.ts`, `gsc-write.ts`, `ingest.ts`,
`technical.ts` found them clean (all admin/cron-gated via `requireAdmin()` or
`CRON_SECRET`, no attacker-reachable surface); `recipes.ts`, `detect.ts`,
`health.ts` remain genuinely unaudited, `seo_overrides.source` dead-column),
the 0844 indirect-prompt-injection finding on `agent.ts`/`tools.ts` (still
flagged, not fixed — architectural, needs Jeff's call), and this pass's two
new items above.

## Next-target candidates if continuing fresh-ground hunting

- `src/lib/seo/recipes.ts`, `detect.ts`, `health.ts` — the only 3 seomgr files
  from the 01:17/01:28 checkpoints' list still genuinely unopened.
- The `~50 unvetted sendSMS/sendEmail files` item (carried forward several
  checkpoints now) remains the largest still-open volume item.
- Any file previously dismissed as "dead code" in an earlier checkpoint is
  suspect given the 01:25 pass's correction on `selena-legacy-handlers.ts` —
  worth a transitive-import-aware sweep of prior "confirmed dead" claims.

No push/deploy/DB this pass.

# W4 gap/fluidity checkpoint — 2026-07-18 02:36

## This pass

1. Uncommitted-work cleanup: last round's `/api/referrals/track` rate-limit
   fix + test (reported at 02:23) had never actually been committed — found
   sitting as a working-tree diff at session start. Verified (tests pass,
   tsc clean) and committed (`dce87c4f`) before starting new work.

2. New fresh-ground surface: webhook signature-verification coverage sweep
   across all 9 webhook endpoints (`clerk`, `resend`, `stripe`,
   `stripe-platform`, `telegram` x3, `telnyx`, `telnyx-voice`). All verified
   clean — every route fail-closes on missing/invalid signature (Svix HMAC,
   Stripe SDK `constructEvent`, Telnyx Ed25519, Telegram secret-token), no
   bypass path found.

3. Continuation opened up by (2): none of the 3 Telegram routes protect
   against Telegram's documented retry-on-slow-ack redelivery. Each runs an
   LLM agent loop (`askSelena`/`askJefe`) that can call side-effecting owner
   tools (refunds, broadcasts, cron triggers) — a retried delivery re-runs
   the same instruction and can re-trigger those side effects twice. Fixed
   two-layer (commit `b8266c53`):
   - `claimTelegramUpdate()` dedupes by `(bot_scope, update_id)`, wired into
     all 3 routes. Migration `2026_07_18_telegram_webhook_events_dedup_PROPOSED.sql`
     — file-only, not applied.
   - `process_stripe_refund` (highest-severity single tool — a duplicate
     call is a real double Stripe refund) now carries a Stripe
     `idempotencyKey`, mirroring `payment-processor.ts`'s cleaner-payout
     transfer, which already uses this exact defense for the identical
     retry-driven double-transfer risk.

4. Gap/fluidity checkpoint: this file.

## Verification

tsc clean (2 pre-existing `sunnyside-clean-nyc/_lib/site-nav.ts` errors
only, unchanged baseline). Full suite: 2321/2325 passed, 2 pre-existing
failures confirmed unrelated to this pass's changes (both files untouched
by me): `cron/tenant-health/status-coverage-divergence.test.ts` is an
explicitly-named "RED until fixed" documented gap, and
`cron/generate-recurring/route.duplicate-occurrence-race.test.ts` passes
clean in isolation — flaky only under full-suite parallel load, same class
of pre-existing flake other workers have already noted this session (e.g.
`finance-export.test.ts`'s pagination timeout).

## New aging items opened this pass

- **Jefe's non-refund owner tools** (`notify_tenant_owner`, `rerun_cron`,
  `retry_failed_notifications`, `send_tenant_message`) share the same
  Telegram-retry exposure class as the refund tool but are lower severity
  (message/notification duplication, not money loss) — now covered by the
  `update_id` dedup layer (item 3's first fix) but were NOT individually
  given per-tool idempotency keys the way `process_stripe_refund` was. Not
  opened as a tracked gap since the webhook-level dedup already closes the
  practical risk; noting only in case a future pass wants defense-in-depth
  parity with the refund tool.
- **`telegram_webhook_events` needs periodic pruning** once applied (7-day
  retention comment left in the migration file, not wired to a cron) — low
  priority, table stays small either way since only redelivered updates
  within Telegram's retry window ever collide.

## Aging items still open (re-confirmed present, not re-litigated this pass)

Unchanged from the 0213 checkpoint — re-list only, no new status. See
`w4-gap-fluidity-checkpoint-2026-07-18-0213.md` for the full list
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
voice/control target whitelisting, 4 dead sendPushToClient exports,
notify()'s latent `channel:'push'` no-op, comhub voice admin_phone/
transfer-target whitelisting, invoices/quotes/documents do_not_service
product question, sendPushToTeamMember/AllTeamMembers do_not_service
applicability, the 0844 indirect-prompt-injection finding on
`agent.ts`/`tools.ts` (still flagged, architectural, needs Jeff's call),
the `/api/yinez` residual unverified-tenant edge and
self-reported-phone-establishes-client-identity items (both still open,
both lower-severity than what's been fixed, both flagged for Jeff's call),
the `cleaners` vs `team_members` ID-space mismatch noticed in
`cron/phone-fixup`, and `client/confirm/[token]` dead code (noted this
session at 0230 — `client_confirm_token` column never written anywhere).
Also: `lead-media/signed-url`'s 32-bit random path entropy note (style
observation, not exploitable at practical attacker cost, not tracked as a
real gap).

## Next-target candidates if continuing fresh-ground hunting

Webhook trust boundaries (signature verification, and now replay/dedup) are
closed as a named category. Remaining higher-effort options for a next
session:
- Sweep the rest of the codebase for other Stripe/payment-provider calls
  missing an `idempotencyKey` (only 2 call sites exist repo-wide —
  `payment-processor.ts` transfers, already covered; `selena/tools.ts`
  refunds, fixed this pass — so this vein may already be fully mined, worth
  a final confirming grep rather than assuming).
- The `cleaners`/`team_members` ID-space product bug (above), if Jeff wants
  it treated as in-scope for this lane despite not being a security issue.
- A fresh named category not yet attempted this session: outbound-webhook
  SSRF (tenant-configured webhook URLs, if any exist, vs. the already-audited
  inbound-fetch SSRF guard in `src/lib/ssrf.ts`) — unconfirmed whether the
  codebase even has tenant-configurable outbound webhooks; worth a first
  grep before committing to it as a surface.

No push/deploy/DB this pass.

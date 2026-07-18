# Gap/fluidity checkpoint — W4, 2026-07-18 01:17

Per the 01:11 LEADER order item 3. File-only, no push/deploy/DB.

## This pass

1. Fresh ground (order item 1): picked up the 21:03/21:13 checkpoints'
   carried-forward candidate — whether any Jefe/Selena tool accepts a raw
   tenant_id/entity_id parameter from LLM output without a matching
   ownership check. Read `src/lib/jefe/actions.ts` and
   `src/lib/selena/tools.ts` (owner-facing dispatcher, ~1500 lines) in full:
   both clean — Jefe's tools resolve tenants by design (platform-level,
   cross-tenant is the intended behavior, not a gap), and every
   `tools.ts` handler that writes a foreign-key id already has an
   `idInTenant()` check from a documented prior "P3-5" pass.
2. Found + fixed (order items 1→2, continued into the client-facing half of
   the same surface): `src/lib/selena/core.ts` (2669 lines, never read in
   full before this session) is the actual untrusted-input surface — SMS
   clients, or attacker content reaching the LLM via indirect prompt
   injection (this session's established Selena/Yinez threat model). Swept
   every handler for the same class. Result: `handleRescheduleBooking`,
   `handleCancelBooking`, `handleResendConfirmation`, and
   `handleBookingDetails` already had the client-ownership check on a
   caller-supplied `booking_id` (re-derive tenant from the conversation,
   then verify `booking.client_id === callerClientId`, `not_your_booking` on
   mismatch) — a prior session's fix. `handleManageRecurring` was the one
   handler missing its sibling's check: a caller-supplied `schedule_id` (a
   real, non-required field in the tool's `input_schema`) was verified
   against tenant only, not client. Any client could pause/resume/cancel
   **another client's** recurring schedule in the same tenant just by
   supplying that schedule's UUID — and pause/cancel already cascade to
   cancel every future booking on the series, so impact is real: a
   stranger's cleaner stops showing up, upcoming visits silently
   cancelled, Selena confirms success back to the attacker. Fixed with the
   same ownership check pattern. Full writeup:
   `w4-manage-recurring-schedule-id-cross-client-idor-fix-2026-07-18-0114.md`.
   Commit `8efb0a46`.
3. Gap/fluidity checkpoint: this file.

## Verification

RED/GREEN mutation-verified (`git diff > patch && git apply -R patch`,
reran, reapplied). New file `manage-recurring-client-ownership.test.ts`
(4 tests) — 3/4 failed pre-fix for the exact predicted reason, 4/4 pass
post-fix. Existing `manage-recurring.test.ts` (5 tests, cross-tenant +
cascade-cancel coverage) unaffected, still 5/5 green. `tsc --noEmit` clean
except the 2 documented pre-existing baseline errors in
`sunnyside-clean-nyc/_lib/site-nav.ts` (untracked, unrelated, noted every
checkpoint this session). Full repo suite: 657 files, 2295 passed + 1
expected-fail + 1 skipped, 2 failed — same 2 documented pre-existing
failures every checkpoint this session (`cron/tenant-health` RED-until-fixed
invariant, `cron/generate-recurring` known flaky race). Zero regressions.

## Aging items still open (re-confirmed present, not re-litigated this pass)

Unchanged from the 21:34 through 01:04 checkpoints — re-list only, no new
status. See `w4-gap-fluidity-checkpoint-2026-07-18-0104.md` for the full
list (create-tenant-from-lead atomic-claim migration, referrers atomic-bump
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
unvetted sendSMS/sendEmail files, `src/lib/seo/*` remaining unaudited files
(`recipes.ts`, `remediate.ts`, `competitor-remediate.ts`, `technical.ts`,
`enrich.ts`, `ingest.ts`, `detect.ts`, `gsc-write.ts`, `health.ts`),
`seo_overrides.source` dead-column).

## New this pass

- Confirmed clean, not fixed further (closes a carried-forward item from the
  21:03/21:13 checkpoints): `src/app/admin/**` page-level components for
  direct client-side Supabase calls bypassing the API layer — grepped
  `createBrowserClient`/`createClientComponentClient`/`createClient(` across
  `src/app/admin` and `src/app/dashboard`, zero hits. Confirms the
  architecture prediction; this item can drop off future checkpoints.
- Jefe/Selena tool-definition raw-tenant_id/entity_id class (the other half
  of the same carried-forward item) — now fully closed: Jefe by-design
  cross-tenant, `tools.ts` (owner side) already guarded, `core.ts`
  (client side) now fully guarded after this pass's fix. Do not return to
  this class without a new specific signal.

## Next-target candidates if continuing fresh-ground hunting

- `src/lib/selena/agent.ts`, `agent-config.ts`, `agent-config-loader.ts`,
  `build-playbook.ts`, `prompt-assembler.ts`, `persona-file.ts`,
  `metrics.ts` — not yet opened this session. Different risk shape than
  `core.ts`/`tools.ts` (these assemble the prompt/config rather than
  dispatch tool calls), worth a pass for prompt-injection-adjacent issues
  (e.g. whether tenant-controlled config strings get concatenated into the
  system prompt unescaped).
- `src/lib/selena-legacy-core.ts` / `src/lib/selena-legacy-handlers.ts`
  (surfaced via grep this pass) — confirmed dead: `grep -rl` for either
  filename across `src/` (excluding themselves) returns zero importers. Not
  a live second copy of the bug this pass fixed. Cleanup candidate only, not
  a security item.
- `src/lib/seo/*` remaining unaudited files (carried forward, see aging
  list above) — still the newest, least-reviewed code in the repo.
- The `~50 unvetted sendSMS/sendEmail files` item (carried forward several
  checkpoints now) remains the largest still-open volume item outside SEO.

No push/deploy/DB this pass.

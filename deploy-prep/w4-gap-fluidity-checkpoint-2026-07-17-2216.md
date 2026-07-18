# Gap/fluidity checkpoint — W4, 2026-07-17 22:16

Per the 22:01 LEADER order item 3. File-only, no push/deploy/DB.

## This pass

Full details: `w4-broad-hunt-2026-07-17-2216-sms-consent-bypass-booking-lifecycle.md`.

1. Fresh ground (order item 1): picked up the 21:57 checkpoint's carried-over
   candidate (SMS-body builders — unchecked for the analogous class to the
   HTML-injection fixes just shipped). `sms-templates.ts` itself came back
   clean: SMS is plain text, no CSS/HTML-attribute-breakout surface exists
   there.
2. Real bug found while sweeping SMS send paths (order item 2, continued):
   the entire booking-lifecycle SMS pipeline called `sendSMS()` directly with
   no `sms_consent` check, unlike `payment-processor.ts`/`notify-team.ts`/
   `notify-team-member.ts`/the campaign senders/`cron/outreach`/
   `cron/retention`, which all gate on `sms_consent !== false`. A client or
   team member who'd replied STOP still got booking-confirmation, reschedule,
   cancellation, assignment, broadcast, running-late, and daily-lookahead
   texts. Fixed across 8 files / 13 call sites (full list in the linked
   report).
3. Gap/fluidity checkpoint: this file.

## Verification

RED/GREEN mutation-verified (`git diff > patch && git apply -R patch`,
rerun, reapply, rerun — 14/28 new assertions failed pre-fix exactly as
expected, 28/28 pass post-fix). New test files: one `route.sms-consent.
test.ts` per affected route, 28 tests total. Also patched a real gap found
in the shared `src/test/fake-supabase.ts` harness (missing no-op
`.returns<T>()`) — reran every existing test using that fake to confirm no
behavior change. Full affected-surface run: 39 test files, 122 tests,
100% passing. `tsc --noEmit`: clean except the same 2 pre-existing baseline
errors in `sunnyside-clean-nyc/_lib/site-nav.ts` noted in every checkpoint
this session — not investigated, not touched.

## Aging items still open (re-confirmed present, not re-litigated this pass)

Unchanged from the 19:49/20:03/21:03/21:13/21:57 checkpoints — re-list only,
no new status:
- `create-tenant-from-lead.ts` atomic-claim migration — PROPOSED, unapplied,
  highest real-money blast radius, now well over 24h stale.
- `referrers.total_earned`/`total_paid` atomic-bump migrations — PROPOSED
  2026-07-16, pending Jeff's DDL approval.
- `clients` dedup unique indexes (2026-07-17) — same pending state.
- `admin/cleanup-test-bookings` name-collision risk — Jeff's product-call
  pending.
- `comhub_get_or_create_contact_by_email` TOCTOU hardening + retry-on-
  unique_violation — PROPOSED, pending DDL.
- `post-labor.ts`/`postDepositToLedger` entity_id design decision — needs
  Jeff/leader input.
- `categorization_patterns` recategorization semantics — open product
  question.
- `team-portal/photo-upload/route.ts` — PROPOSED/unwired.
- `comhub-email` cron's `unread_count` bump — not dug into, low priority.
- CSRF-on-GET instances — judged not worth fixing, severity precedent.
- Four dead clone `_lib/email-templates.ts` files (~3500 lines) — cleanup
  candidate, pending Jeff's clone-deletion green light.
- `nycmaid/sms-templates.ts`'s 34 dead exports — low-priority cleanup, still
  unaddressed (checked again this pass while sweeping SMS templates — still
  genuinely dead, no new callers).
- `post-adjustments.ts`'s `postCommissionPayment` `status !== 'void'` check
  — inert today, re-check only if a direct caller is added.
- `rate_limit_check_and_record` atomic RPC — PROPOSED, pending DDL.
- `inbound_emails.html_body`/`raw` — dead storage, zero readers today.
- `src/lib/nycmaid/notify-cleaner.ts`'s `notifyCleaner()` — dead code,
  missing tenant_id filter, flag for whoever wires it up.
- `admin/campaigns/preview/route.ts`'s `wrapEmail()` raw-color-in-style —
  self-XSS only, cheap-hardening candidate, still not fixed.
- `agreement.ts`'s `buildAgreement()` (HTML version) — confirmed dead code,
  cleanup candidate.

## New this pass

- Push-notification send paths (`sendPushTo*`) have no swept-for-consent
  pass yet — different channel from SMS, not checked this session. Flagged
  as a candidate below, not yet a confirmed bug.

## Next-target candidates if continuing fresh-ground hunting

- SMS-body builders/`sendSMS(` call sites are now fully swept for both the
  HTML-injection-analog class (clean) and the consent-bypass class (fixed
  everywhere reachable from the booking lifecycle) — do not return to
  either grep without a new specific signal.
- Push-notification (`sendPushToClient`/`sendPushToTenantAdmins`) consent/
  preference gating — not yet checked for an analogous bypass.
- `client/send-code`/`pin-reset`/other OTP-style SMS sends were deliberately
  left un-gated (transactional, not marketing, matches `smsVerificationCode`
  having no STOP_TEXT) — only revisit if that assumption is challenged.

No push/deploy/DB this pass.

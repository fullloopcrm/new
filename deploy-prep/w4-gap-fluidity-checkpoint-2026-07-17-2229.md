# Gap/fluidity checkpoint — W4, 2026-07-17 22:29

Per the 22:20 LEADER order item 3. File-only, no push/deploy/DB.

## This pass

Full details: `w4-broad-hunt-2026-07-17-2229-do-not-service-bypass-booking-lifecycle.md`.

1. Committed the prior session's verified-but-uncommitted `sms_consent`
   booking-lifecycle fix (8 files / 13 call sites, 28 tests) — it had been
   written and RED/GREEN-verified but not yet landed. Re-verified myself
   (tsc clean, 28/28 tests) before committing.
2. Fresh ground (order item 1): checked push-notification consent gating
   (carried over from the 22:16 checkpoint) — clean, subscription existence
   *is* the consent, no gap. Checked email-marketing opt-out as a same-class
   continuation — also clean, both campaign-send routes and both marketing
   crons correctly gate on `email_marketing_opt_out`/`sms_marketing_opt_out`.
3. Real bug found (order item 2, continued): `do_not_service` — a stronger
   kill-switch than `sms_consent`, already treated as absolute by the
   nycmaid-legacy fan-out helper and shown to admins as a hard warning — was
   not checked anywhere in the same booking-lifecycle SMS pipeline just
   fixed for `sms_consent`. Fixed across 4 files / 5 call sites (all
   admin-/team-authenticated; the client-authenticated reschedule path was
   checked and is not affected — already blocked at the auth layer).
4. Gap/fluidity checkpoint: this file.

## Verification

RED/GREEN mutation-verified (`git diff > patch && git apply -R patch`,
rerun, reapply, rerun — 6/12 new assertions failed pre-fix exactly as
expected, 12/12 pass post-fix). New test files: one `route.do-not-
service.test.ts` per affected route (3 files, one covering both PUT and
DELETE), 8 tests total. Full affected-surface run: 42 test files, 127
tests, 100% passing. `tsc --noEmit`: clean except the same 2 pre-existing
baseline errors in `sunnyside-clean-nyc/_lib/site-nav.ts` noted in every
checkpoint this session — not investigated, not touched.

## Aging items still open (re-confirmed present, not re-litigated this pass)

Unchanged from the 19:49 through 22:16 checkpoints — re-list only, no new
status:
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
  unaddressed.
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

- `notify()`'s email channel (booking_confirmed/booking_cancelled and other
  callers) does not check `do_not_service` — broader blast radius than the
  SMS fix just made (shared dispatcher). Candidate for a dedicated pass.
- `sendPushToClient` calls alongside the fixed SMS sends (e.g.
  `team-portal/running-late/route.ts`) not explicitly checked against
  `do_not_service` — push consent = subscription existence so the same
  push-notification finding likely applies, but not verified specifically
  against this flag.

## Next-target candidates if continuing fresh-ground hunting

- `do_not_service` is now fully swept and fixed on every `sendSMS(` call
  site reachable from the booking lifecycle — do not re-check that specific
  combination without a new specific signal.
- Push-notification consent and email-marketing opt-out are both confirmed
  clean this pass — do not re-check either without a new specific signal.
- `notify()`'s email-channel `do_not_service` gap (above) is the most
  directly analogous next target if continuing this exact bug class.

No push/deploy/DB this pass.

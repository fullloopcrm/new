# Gap/fluidity checkpoint — W4, 2026-07-18 00:10

Per the 23:59 LEADER order item 3. File-only, no push/deploy/DB.

## This pass

Full details: `w4-reviews-request-plus-schedule-pause-do-not-service-fix-2026-07-18-0006.md`.

0. Committed the prior session's already-verified-but-uncommitted work
   (`cron/reminders` + `running-late`/`checkout` push-notification
   do_not_service gate) as `3b16fcb5` — re-ran targeted tests + `tsc` first
   to confirm it was still green before committing.
1. Fresh ground (order item 1): swept the direct `sendSMS(`/`sendEmail(`
   call-site pool outside booking-lifecycle/campaigns/crons (next-target
   candidate from the 23:55 checkpoint). Found `reviews/request/route.ts`
   (admin "request a review" action) sends real client email/SMS with zero
   `sms_consent`/`do_not_service` check — its cron sibling
   (`cron/rating-prompt`) is safe only because it routes through
   `sendClientSMS()`, which this manual endpoint bypasses entirely.
2. Continued the same surface (order item 2): `schedules/[id]/pause`'s
   client "your recurring service is paused" SMS had the identical gap.
   Both fixed to `notify.ts`'s established precedent. Checked and left
   alone (flagged, not fixed): `invoices/quotes/documents` send routes
   (admin-typed recipient address, financial/legal document — a different
   shape, real product question) and `admin/find-cleaner/send` (team-member
   broadcast, not client-facing, `do_not_service` doesn't apply — confirmed
   clean).
3. Gap/fluidity checkpoint: this file.

## Verification

RED/GREEN mutation-verified via `git diff`/`git apply -R` (not stash) for
both fixes independently — `reviews/request`: 2/3 assertions failed
pre-fix, 3/3 pass post-fix. `schedules/[id]/pause`: 2/3 assertions failed
pre-fix, 3/3 pass post-fix. New test files: `reviews/request/
route.do-not-service.test.ts` (3 tests), `schedules/[id]/pause/
route.do-not-service.test.ts` (3 tests). `tsc --noEmit`: clean except the
2 documented pre-existing baseline errors in `sunnyside-clean-nyc/_lib/
site-nav.ts` (untracked, unrelated, noted every checkpoint this session).
Full repo suite: 645/647 files, 2273 passed + 1 expected-fail + 1 skipped,
2 failed — same 2 documented pre-existing failures every checkpoint this
session (`cron/tenant-health` RED-until-fixed invariant,
`cron/generate-recurring` known flaky race). Zero regressions.

## Aging items still open (re-confirmed present, not re-litigated this pass)

Unchanged from the 21:34 through 23:55 checkpoints — re-list only, no new
status. See `w4-gap-fluidity-checkpoint-2026-07-17-2355.md` for the full
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
voice/control target whitelisting, 4 dead sendPushToClient exports in
site-clone `_lib/push.ts` × 3 + `nycmaid/push.ts`, notify()'s latent
`channel:'push'` no-op).

## New this pass

- Confirmed the shared `fake-supabase` test helper (`src/test/
  fake-supabase.ts`) does not parse PostgREST embed/join syntax
  (`.select('*, clients(...)')` returns the raw row with no nested
  relation) — any test relying on that helper for a route that reads a
  joined field must instead seed the joined object inline on the row (the
  hand-rolled `chain()` pattern already used by `running-late`/`checkout`'s
  do-not-service tests). `schedules/[id]/pause/route.naive-et-boundary.
  test.ts` was unknowingly relying on this gap — its booking-cancel
  assertions never exercised the client-SMS branch at all (client was
  always `undefined`), which is why it never caught this session's finding.
  Not a bug in that test (it wasn't testing the SMS path), just a sharp
  edge worth knowing before writing the next join-dependent test against
  that helper.
- `invoices/quotes/documents` send routes flagged as a real product
  question (see above), not forced.

## Next-target candidates if continuing fresh-ground hunting

- Whitelisting `admin_phone`/transfer `target` against tenant roster
  (comhub voice, from 23:40) — gated on a product question, not a clear bug.
- Product decision needed: should `invoices/quotes/documents` send routes
  respect `do_not_service`? Current behavior lets an admin explicitly send
  a financial/legal document to a DNS-flagged client's contact address.
- Re-run the postgrest-filter-injection sweep pattern against surfaces not
  yet covered.
- `sendPushToTeamMember`/`sendPushToAllTeamMembers` — team members have no
  `do_not_service` concept, likely a dead end but not explicitly ruled out.
- The `sendSMS(`/`sendEmail(` pool still has ~50 files not individually
  vetted (auth codes, pin-reset, referrer auth, contact/inquiry/lead intake
  forms) — most look like transactional/auth flows where `do_not_service`
  gating may not even be the right call (a client can't STOP-opt-out of
  their own login code), but not exhaustively confirmed clean.

No push/deploy/DB this pass.

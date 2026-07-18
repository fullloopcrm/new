# W4 broad hunt — 2026-07-17 22:16 — sms_consent bypass across the booking-lifecycle SMS pipeline

File-only, no push/deploy/DB. Per the 22:01 LEADER order item (1) new fresh-ground surface.

## Starting point

Per the 21:57 checkpoint's carried-over candidate: SMS-body builders (as
opposed to the HTML-email builders just fixed) hadn't been swept this
session. `sms-templates.ts` itself turned out clean — SMS is plain text, so
the HTML/CSS-injection class doesn't have a direct analog there.

## Real bug found (order item 2, continued from item 1)

Grepped every `sendSMS(` call site across the booking lifecycle and cross-
referenced against the `sms_consent` gate used elsewhere in the codebase.
`payment-processor.ts`, `notify-team.ts`, `notify-team-member.ts`,
`nycmaid/sms.ts`, `campaigns/[id]/send`, `campaigns/send`, `cron/outreach`,
and `cron/retention` all check `sms_consent !== false` (or `=== true`)
before texting a client or team member — the STOP/START webhook handler
persists that flag specifically so those paths respect it.

The entire booking-lifecycle SMS pipeline did **not** go through that gate.
It called `sendSMS()` directly, so a client or team member who'd replied
STOP kept getting booking texts. Confirmed and fixed in 8 files / 13 call
sites:

- `bookings/route.ts` (POST create) — client confirmation SMS, team
  assignment SMS.
- `bookings/batch/route.ts` (POST batch create) — client confirmation SMS,
  cleaner assignment SMS.
- `bookings/[id]/route.ts` (PUT update, DELETE) — booking-confirmed SMS,
  team reassignment SMS, reschedule SMS, cancellation SMS.
- `bookings/broadcast/route.ts` — urgent-job broadcast SMS to every active
  team member.
- `team-portal/running-late/route.ts` — client "running late" SMS. (Admin
  SMS in the same route intentionally left un-gated — business's own
  number, not consent-gated anywhere else in this codebase.)
- `client/reschedule/[id]/route.ts` — client reschedule SMS. (The team-
  member reschedule notification in the same file already goes through
  `notifyTeamMember`, which gates consent internally — untouched.)
- `cron/daily-summary/route.ts` — team-member 3-day-lookahead SMS.
- `cron/late-check-in/route.ts` — team-member late-check-in and
  late-check-out SMS. (Admin SMS in the same route intentionally left
  un-gated, same reasoning as running-late.)

Fix: added `sms_consent` to each affected `clients`/`team_members` select
(where not already a full-row `*` select) and gated each `sendSMS()` call on
`sms_consent !== false`, matching the exact convention used by
`notify-team.ts`/`payment-processor.ts`. `bookings/[id]/team/route.ts` was
checked and needed no change — it already routes through `notifyTeamMember`.

## Verification

RED/GREEN mutation-verified: `git diff` of the 8 route files (excluding new
test files and the fake-supabase.ts addition) saved to a patch, `git apply
-R` to revert, reran the 8 new test files — 14/28 assertions failed exactly
as expected (every "does not SMS when opted out" case; the "still SMS when
consented" cases passed both before and after, as they should). Reapplied
the patch — 28/28 pass.

New test files (one per route, 28 tests total):
`bookings/route.sms-consent.test.ts`,
`bookings/batch/route.sms-consent.test.ts`,
`bookings/[id]/route.sms-consent.test.ts` (covers PUT confirm/reassign/
reschedule + DELETE cancel),
`bookings/broadcast/route.sms-consent.test.ts`,
`team-portal/running-late/route.sms-consent.test.ts`,
`client/reschedule/[id]/route.sms-consent.test.ts`,
`cron/daily-summary/route.sms-consent.test.ts`,
`cron/late-check-in/route.sms-consent.test.ts` (covers both check-in and
check-out).

Along the way, found the shared `src/test/fake-supabase.ts` test harness was
missing a no-op `.returns<T>()` method (real supabase-js: compile-time type
assertion only, identity at runtime) — `cron/daily-summary`'s team-member
lookahead query uses it and crashed the fake. Added the no-op; reran every
existing test using that fake (`cron/daily-summary`, `cron/late-check-in`,
`src/test/*`) to confirm no behavior change — 39 files / 122 tests pass.

Full affected-surface run after the fix: 39 test files, 122 tests, all
passing. `tsc --noEmit`: clean except the same 2 pre-existing baseline
errors in `sunnyside-clean-nyc/_lib/site-nav.ts` noted in every checkpoint
this session — not investigated, not touched.

## Next-target candidates if continuing fresh-ground hunting

- SMS-body builders themselves (sms-templates.ts, nycmaid/sms-templates.ts)
  are now confirmed clean of the HTML-injection-analog class — do not
  re-check without a new specific signal.
- The consent-bypass class is now closed on every `sendSMS(` call site
  reachable from the booking lifecycle. Other `sendSMS(` call sites outside
  the booking lifecycle (e.g. `client/send-code`, `pin-reset`, verification-
  code sends) are intentionally out of scope — those are transactional/OTP
  sends, not marketing, and don't carry the same TCPA consent requirement
  (matches the existing `smsVerificationCode` template, which has no
  STOP_TEXT for the same reason). Worth a second pass only if that
  assumption is challenged.
- Not yet swept this session: push-notification send paths (`sendPushTo*`)
  for an analogous consent/preference gate — different channel, not
  checked.

# W4 broad hunt — 2026-07-17 22:29 — do_not_service bypass across the booking-lifecycle SMS pipeline

File-only, no push/deploy/DB. Per the 22:20 LEADER order item (1)/(2): a
fresh-ground surface, continued from wherever it opened up.

## Starting point

The 22:16 checkpoint's carried-over candidate was push-notification consent
gating. Checked first: `push_subscriptions` has no opt-out flag — the
subscription row itself *is* the consent (browser permission grant), and
expired subscriptions already auto-delete on webpush's 410/404. No
analogous bug there; confirmed clean.

Checked next as a same-class continuation: email marketing opt-out
(`clients.email_marketing_opt_out`/`sms_marketing_opt_out`). Both
`campaigns/send/route.ts` and `campaigns/[id]/send/route.ts` correctly
check `email_marketing_opt_out`/`sms_marketing_opt_out`/`sms_consent`
before sending; `cron/outreach`/`cron/retention` correctly gate SMS the
same way. Also confirmed clean — no gap.

## Real bug found

`clients.do_not_service` is a stronger kill-switch than `sms_consent`: the
nycmaid-legacy `getClientContacts()` fan-out helper (`client-contacts.ts`)
treats it as an absolute gate, checked *before* any per-channel opt-in, and
returns zero contacts unconditionally when set. `BookingsAdmin.tsx` shows
admins a hard red "DO NOT SERVICE — Check client notes before proceeding"
warning before letting them create/edit a booking for such a client — the
UI copy implies a safety/harassment-class reason, not just a marketing
preference. `client/login/route.ts` and `client-auth.ts`'s
`protectClientAPI()` both block a DNS client from reaching the client
portal at all.

The booking-lifecycle SMS pipeline just fixed for `sms_consent` this
session (22:16 checkpoint) does **not** check `do_not_service` anywhere. A
client flagged DNS — after an admin proceeds past the warning to
create/edit a booking, or on a booking that predates the flag — still got
automated confirmation/reschedule/cancellation/running-late texts.

Confirmed and fixed in 4 files / 5 call sites (all admin- or team-member-
authenticated; the client-authenticated self-service reschedule path was
checked and is **not** affected — `protectClientAPI()` already blocks DNS
clients from that route entirely, so it was correctly out of scope):

- `bookings/route.ts` (POST create) — client confirmation SMS.
- `bookings/batch/route.ts` (POST batch create) — client confirmation SMS.
- `bookings/[id]/route.ts` (PUT) — booking-confirmed SMS, reschedule SMS.
  (Team-member reassignment SMS in the same file is untouched — DNS is a
  client-only flag.)
- `bookings/[id]/route.ts` (DELETE) — cancellation SMS.
- `team-portal/running-late/route.ts` — client "running late" SMS. (Admin
  SMS in the same route intentionally left un-gated, same reasoning as the
  sms_consent fix.)

Fix: added `do_not_service` to each affected `clients` select and gated
each client-facing `sendSMS()` call on `!data.clients?.do_not_service` in
addition to the existing `sms_consent !== false` check.

Not fixed / out of scope this pass: `bookings/broadcast/route.ts`,
`cron/daily-summary/route.ts`, `cron/late-check-in/route.ts` — all three
are team-member-only SMS (no client-facing send), so `do_not_service`
doesn't apply. The booking-confirmed *email* sent via `notify()` in
`bookings/route.ts`/`bookings/[id]/route.ts` is a separate dispatcher used
by many more callers than this SMS surface and was **not** touched this
pass — flagged below as a candidate, not fixed, to keep this change scoped
to the exact SMS surface just verified.

## Verification

RED/GREEN mutation-verified: `git diff` of the 4 route files saved to a
patch, `git apply -R` to revert, reran the 4 new test files — 6/12
assertions failed exactly as expected (every "does not SMS when
do_not_service" case; the "still SMS when not flagged" cases passed both
before and after). Reapplied — 12/12 pass.

New test files (2 tests each, 8 total):
`bookings/route.do-not-service.test.ts`,
`bookings/batch/route.do-not-service.test.ts`,
`bookings/[id]/route.do-not-service.test.ts` (covers PUT confirm/reschedule
+ DELETE cancel, 6 tests),
`team-portal/running-late/route.do-not-service.test.ts`.

Full affected-surface run (all `bookings`/`team-portal/running-late`/
`client/reschedule`/`cron/daily-summary`/`cron/late-check-in` test files):
42 test files, 127 tests, 100% passing. `tsc --noEmit`: clean except the
same 2 pre-existing baseline errors in
`sunnyside-clean-nyc/_lib/site-nav.ts` noted in every checkpoint this
session — not investigated, not touched.

## Next-target candidates if continuing fresh-ground hunting

- `notify()`'s email channel (used by `booking_confirmed`/`booking_cancelled`
  in the same routes just fixed, plus many other callers) does not check
  `do_not_service` either. Broader blast radius than the SMS fix above
  (shared dispatcher, not a single-purpose helper) — worth its own
  dedicated pass rather than folding into this one.
- Push-notification and email-marketing-opt-out consent gating are now
  both confirmed clean — do not re-check either without a new specific
  signal.
- `sendPushToClient`/`sendPushToTenantAdmins` calls in
  `team-portal/running-late/route.ts` and elsewhere: not checked against
  `do_not_service` this pass (push consent = subscription existence, so
  the same reasoning as the push-notification check above likely applies,
  but not explicitly verified against `do_not_service` specifically).

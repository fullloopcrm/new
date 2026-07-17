# W1 — cron/reminders client SMS ignored sms_consent (2026-07-17 17:25)

Fresh-ground surface per 17:04's queue item 1. This session already fixed the
same consent-bypass bug class three times (`payment-reminder`,
`payment-followup-daily`, `post-job-followup`, `confirmations`) — swept the
one cron route in that family not yet checked, `reminders/route.ts`
(the largest cron file: day-based, hour-based, payment-alert, thank-you,
unpaid-team, pending-booking, 8pm recap, 9pm digest, all in one route).

## Fixed

**Both client-facing SMS reminders in `reminders/route.ts` called `sendSMS()`
directly on the client, bypassing `notify()`'s central `sms_consent` gate —
neither `.select()` even fetched the column:**

1. Day-based reminder (fires 8am ET, 3-day/1-day-out per tenant's
   `reminder_days` prefs) — `clients(name, phone, email)`, no `sms_consent`.
2. Hour-based reminder (fires per tenant's `reminder_hours_before`, default
   2hr) — same gap, `clients(name, phone, email)`.

`webhooks/telnyx`'s STOP handler sets `clients.sms_consent = false`
tenant-wide as the legally-required blanket opt-out. A client who'd already
texted STOP kept getting the day-out AND hour-before booking-reminder texts
regardless, for every booking, indefinitely — this cron runs hourly and
covers every active tenant. The client email path (via `notify()`, same
day-based block) was already correctly gated and is unaffected. Team-member
SMS in both blocks is internal/operational and correctly stays ungated, same
convention as every other fixed cron in this family.

Fixed by adding `sms_consent` to both selects and gating both raw `sendSMS()`
calls on `!== false`, matching the established convention exactly (mirrors
`payment-reminder`'s fix from earlier tonight). Added
`ClientNamePhoneEmailConsent` to `lib/types.ts` for the two typed booking
shapes (`BookingWithClientAndTeam`, `BookingWith2HourReminder`).

## Surface swept to closure (item 2)

Grepped every cron route for `sendSMS` (10 routes call it) and checked each
one's recipient + consent gate:

- `payment-reminder`, `payment-followup-daily`, `post-job-followup`,
  `confirmations`, `outreach`, `retention` — already gated (this session or
  prior).
- `late-check-in` — team member + admin only, never the client. No gate
  needed, correctly ungated.
- `daily-summary` — SMS target is `team_members.phone` (3-day lookahead
  digest to the pro), not the client. `clients(...)` in that block is only
  used for email job-detail content. No gate needed.
- `comms-monitor` — `sendSMS` only appears in a comment, no actual call.
- `reminders` — fixed above.

No separate new item survived this sweep — the client-SMS-consent-bypass
class across all cron routes is now fully closed, not just this one file.

## Verification

- 3 new tests (`route.sms-consent.test.ts`): day-based opted-out (SMS
  skipped, email still sent), day-based no-opt-out control (SMS sent),
  2-hour opted-out (SMS skipped). RED-confirmed via `git apply -R` on the
  source diff alone (2/3 failed for the exact reported reason pre-fix — the
  no-opt-out control correctly still passed). Reapplied clean.
- `tsc --noEmit`: clean (same 2 pre-existing baseline errors — admin-auth
  type quirk + untracked `sunnyside-clean-nyc/_lib/site-nav.ts`, both
  unrelated).
- `eslint` on both touched files: 0 errors, 0 new warnings (3 pre-existing
  `no-explicit-any` warnings elsewhere in the file, untouched by this diff).
- Full suite: 583/583 files, 3158/3159 tests (1 pre-existing expected-fail),
  zero regressions.
- Commit `e29218ec`. File-only, no push/deploy/DB.

## tenant_domains schema lane

Reconfirmed intact, no drift: 043/055/056/059/068/069 all present. No schema
work was in scope this round (lane fully built out; see 16:45's doc for the
full confirmation).

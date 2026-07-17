# W4 broad-hunt — 2026-07-17 06:07 EDT

Queue (05:52 LEADER order, 3-deep, file-only, no push/deploy/DB):
(1) continue scheduling/dispatch depth
(2) continue fresh-ground hunting
(3) keep gap/fluidity current

## (1) — Same `'confirmed'`-status-filter bug family, one more real site: the "unassigned bookings" admin alert

`cron/reminders` (8am/2pm "PENDING BOOKING ALERTS" block) queries
`.in('status', ['pending', 'scheduled']).is('team_member_id', null)` to
alert admin about bookings needing team assignment. A booking can become
`'confirmed'` with **no** `team_member_id` set: the day-before client
confirmation text (`cron/confirmations`, "CLIENT DAY-BEFORE CONFIRMATION")
queries `['scheduled', 'confirmed']` with no assignment requirement at all,
and the client's YES reply (`webhooks/telnyx`) flips status to `'confirmed'`
without checking `team_member_id` either. Both `client/book` and
`cron/generate-recurring` can create/leave bookings unassigned by design
(flagged "needs assignment"/"needs reassignment").

So the realistic sequence: booking created unassigned → admin hasn't
gotten to it by the day before → day-before confirmation text goes out
anyway → client replies YES → status flips to `'confirmed'`, still
unassigned → the alert built specifically to catch "unassigned booking"
goes silent at exactly the moment the client is now expecting a cleaner
who was never assigned. Fixed: added `'confirmed'` to the filter.

New test: `route.pending-alert-confirmed-status-gap.test.ts` — 3 bookings
(unassigned+confirmed, unassigned+scheduled, assigned+confirmed), asserts
the alert fires for the first two and excludes the third. Mutation-verified
(`git apply -R`, re-applied): reverted, alert only fired for the 1
scheduled booking (missed the confirmed one) — right failure, then green
again.

## (2) — Fresh ground, different bug class: stale team confirmation survives a reschedule

Deliberately pivoted off the status-filter class (this session and last
have exhausted it across several features) to look at *state that outlives
a booking mutation* instead. `bookings/[id]` PUT and `client/reschedule/
[id]` PUT both let start_time move without touching status or clearing any
prior confirmation signal — by design, since a reschedule of a `'scheduled'`
booking should stay `'scheduled'`.

But the *team-member* confirmation isn't tracked on the booking row at
all — it's a `notifications` row (`type: 'team_confirmed'`) keyed only on
`booking_id`, with no time dimension. `cron/confirmations`'s hourly resend
checked "does any `team_confirmed` row exist for this booking_id" with no
regard for *which* start_time it confirmed. Since reschedule keeps the same
`booking_id`, a team member who confirmed Tuesday 2pm was permanently
treated as having also confirmed Friday 5pm the moment the booking got
moved — never asked again, and the 3-attempt admin escalation
(`team_no_confirm_alert`) could never fire either, since no
`team_confirm_request` ever gets re-sent to accumulate attempts.

Fixed in two places:
- `webhooks/telnyx`: the `team_confirmed` notification now stamps
  `metadata.confirmed_start_time` with the booking's start_time at the
  moment of confirmation.
- `cron/confirmations`: the "already confirmed" check now only honors a
  `team_confirmed` row when its `confirmed_start_time` matches the
  booking's *current* start_time; a stale one (confirming a slot that's
  since moved) no longer suppresses the resend.

New test: `route.stale-team-confirm-across-reschedule.test.ts` — seeds a
`team_confirmed` notification for an old start_time on a booking whose
current start_time has moved (simulating a reschedule); asserts the resend
SMS still fires and a fresh `team_confirm_request` is logged.
Mutation-verified: reverted the `cron/confirmations` half only (the
`webhooks/telnyx` metadata addition isn't independently exercised by this
test — it's additive and covered by the existing telnyx suite passing
unchanged), test failed for the right reason (0 SMS sent instead of 1,
old logic incorrectly treated the stale confirmation as still valid for
the new slot), re-applied, green.

## Verification

- `npx tsc --noEmit`: same 3 pre-existing baseline errors (2 marketing-nav,
  1 xss test mock), identical to every prior session, none in touched
  files.
- `npx vitest run` scoped to `cron/reminders`, `cron/confirmations`,
  `webhooks/telnyx`: 14 files / 38 tests, all passed.
- Full suite: `npx vitest run` — first pass showed
  `cron/generate-recurring/route.duplicate-occurrence-race.test.ts` also
  failing alongside the known placeholder; re-ran it in isolation (passed
  clean) and re-ran the full suite a second time (passed clean) — a
  flake under parallel load, not a regression from these changes (that
  file wasn't touched this pass). Second full run: 493/494 files,
  1951/1954 tests, 1 expected-fail, 1 skipped — the 1 remaining failure is
  the same `cron/tenant-health/status-coverage-divergence.test.ts`
  explicitly-named "RED until fixed" Fortress-monitoring placeholder every
  prior report this session has hit.
- No push, no deploy, no DB write. 2 commits, 5 files (3 source, 2 test).

## Gap/fluidity — 2 closed this pass, 1 new observation (not fixed — low-confidence/edge-case)

- **CLOSED**: `cron/reminders` "unassigned bookings" alert now includes
  `'confirmed'` in its status filter.
- **CLOSED**: `cron/confirmations` team-confirm resend no longer treats a
  confirmation of an old (pre-reschedule) slot as covering the new one.
- **CONSIDERED, NOT FIXED**: `cron/daily-summary`'s "recurring expiration"
  30-day warning queries the schedule's latest booking with
  `.in('status', ['scheduled', 'pending'])` (also missing `'confirmed'`).
  Traced the actual exposure: `cron/generate-recurring` keeps active
  schedules topped up ~28 days out, and client confirmation only fires the
  day before a booking's start_time (`cron/confirmations` day-before
  block). So for the 29 of 30 days this warning is designed to cover, the
  last booking is still `'scheduled'`/`'pending'` and the warning fires
  correctly (and the 7-day notification-dedup means it would have already
  fired well before the last day, when `'confirmed'` could apply). Real
  impact window is under a day out of a 30-day warning — judged not
  worth a source change; noting instead of fixing to avoid diluting the
  report with a fix that doesn't move real-world outcomes.
- All other carried items unchanged: `[id]/pause/route.ts` (recurring-
  schedules) confirmed dead code, same `'confirmed'`-missing pattern, zero
  callers, still left alone; `voice/cleanup` ops-risk flag (dead code,
  still open, product/ops question for Jeff); `fake-supabase.ts` no
  PostgREST embedded-relation-filter support (blocks mutation-testing 3
  ledger-report call sites); `admin/cleanup-test-bookings` hardcoded-name
  hard-delete flagged for Jeff, not fixed (product decision); partial-
  refund operational treatment; invoice-linked refund status/
  amount_paid_cents sync; live-DB second-payment ledger-gap audit;
  `activate-tenant.ts` fragmentation (432-line file, noted repeatedly, not
  a bug); client-side team-member dropdowns still unfiltered by status (6
  components); `team-portal/photo-upload` route explicitly
  PROPOSED/unwired (companion migration not applied — safe to leave).

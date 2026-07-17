# Cron/scheduled-jobs deep sweep — 16:06 order item (1): new fresh-ground surface

**From:** W1, 16:06 order item (1) (fresh-ground surface after the 15:53 team-portal deep pass closed).
**Scope:** `platform/src/app/api/cron/*` — ~40 routes, none independently swept by anyone tonight per LEADER-CHANNEL. Focused on the booking-lifecycle/reminder group first: late-check-in, no-show-check, confirmation-reminder, confirmations, release-due-payments, retention, rating-prompt, lifecycle, schedule-monitor, payment-reminder, outreach, comhub-email.

## Fixed

**`cron/rating-prompt/route.ts`** — marked `bookings.rating_prompt_sent_at` in a
SEPARATE `update()` call AFTER `sendClientSMS()` already resolved, with no
`maxDuration` override (this route runs every 5 min, loops every active
tenant, up to CAP=10 sends each). If the invocation was interrupted between
the two writes — a transient DB error on the mark call, or the function
hitting its (unset, so platform-default and much shorter than its siblings'
explicit 60-300s) timeout mid-loop — the booking stayed eligible
(`rating_prompt_sent_at IS NULL`) and got a second rating-prompt SMS on the
very next 5-min run. This is exactly the duplicate-client-SMS failure mode
the file's own CAP block exists to prevent (its comment cites the "4/29
SMS-blast lesson").

Fix: claim the row via a conditional `.is('rating_prompt_sent_at', null)`
update BEFORE sending, so a crash/timeout after the claim produces a missed
prompt (safe, matches this codebase's established priority of never
double-texting a client over guaranteeing delivery) instead of a duplicate
one, and two overlapping invocations can't both claim the same booking.
Added `export const maxDuration = 60` to match sibling per-tenant-loop
crons. RED-confirmed via `git apply -R` on the source fix alone (test:
"writes rating_prompt_sent_at BEFORE calling sendClientSMS, not after" —
failed on old code, `sentAtSendTime` was `null` at send-time). 3 new tests
(`route.claim-before-send.test.ts`, this route had ZERO prior test
coverage). tsc clean, full suite 575/575 files, 3139/3140 tests (1
pre-existing expected-fail), zero regressions. Commit: (see git log after
this doc).

## Checked, clean

- **no-show-check**: already ET/UTC-fixed by a prior pass this session,
  update scoped by `tenant_id`, notify wrapped in `.catch()`. No bug.
- **release-due-payments**: pure time-based flip, no client messaging, no
  race surface. Clean.
- **retention**: opt-in-checked (`sms_consent = true` explicit filter, not
  the blanket-opt-out-default pattern flagged elsewhere), 3-send cap +
  30-day cooldown both re-checked before send, correct ET-aware upcoming-
  booking gate (existing comment already documents the ET/UTC fix). Clean.
- **confirmation-reminder**: dedup write (`sms_logs` insert) happens INSIDE
  `sendSMS()` itself, in the same awaited call as the actual Telnyx send —
  tightly coupled, not a separate later round-trip like rating-prompt's old
  pattern. Verified by reading `lib/nycmaid/sms.ts`'s send path. Clean.
- **lifecycle**: active/inactive transitions correct; found one dead
  sub-filter (`midRangeActive` check for `toInactive` clients can never
  match anything, since `toInactive` already excludes anyone with a
  90-day-window booking, and 30-day is a strict subset of 90-day) — wasteful
  but NOT a correctness bug (doesn't change output), not fixed.
- **schedule-monitor**: (day-boundary tests already exist, indicating a
  prior pass already covered its ET-boundary correctness) — read for new
  issues, none found.

## Noticed, NOT fixed — same bug class as rating-prompt, lower severity

- **`cron/payment-reminder/route.ts`** (line ~116): marks
  `payment_reminder_sent_at` after send, same ordering. Lower severity than
  rating-prompt because this is a throttled REPEATING nudge (5-min throttle
  window), not a strict send-exactly-once design — a lost mark write causes
  at most one extra nudge within the same throttle window, not an unbounded
  resend. Also already has a known/flagged sibling issue in this file
  (`sms_consent` blanket-opt-out pattern, called out in its own comment as
  already tracked). Not fixed — didn't want to bundle an ordering change
  into a file with an already-open, separately-tracked consent question.
- **`cron/outreach/route.ts`** (line ~154): marks `clients.last_outreach_at`
  / increments `outreach_count` after send, and the `outreach_log` insert
  (the actual dedup source) also happens after send. Lower severity because
  this cron runs WEEKLY (Saturdays 10am ET only) — the crash window is the
  same shape but the exposure is ~2000x rarer than a 5-min cron. Also has a
  DB-level unique constraint on `(tenant, client, moment)` in `outreach_log`
  that at least prevents a duplicate LOG row (silently no-ops on retry) even
  though it can't prevent a duplicate SEND if the crash happens between the
  SMS call and the log insert. Not fixed this round — flagging for a
  dedicated pass if it's worth generalizing the rating-prompt claim pattern
  across all four of these (rating-prompt, payment-reminder, outreach,
  comhub-email) rather than one-off patching each.
- **`cron/comhub-email/route.ts`**: matched the same send+mark grep pattern,
  not yet read in depth — flagging as unreviewed, not confirmed clean or
  broken.

## Not yet swept this round

sync-google-reviews, auto-reply-reviews, post-job-followup, sales-follow-ups,
follow-up, payment-followup-daily, generate-recurring,
generate-monthly-invoices, recurring-expenses, phone-fixup,
refresh-job-postings, comms-monitor, email-monitor, health-check,
health-monitor, system-check, tenant-health, jefe-heartbeat,
anthropic-health, daily-summary, backup, cleanup-videos — none independently
verified this round, no signal either way.

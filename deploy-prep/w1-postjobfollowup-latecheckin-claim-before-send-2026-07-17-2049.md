# cron/post-job-followup + cron/late-check-in: sent-before-claim races (2026-07-17 20:49)

## Surface (fresh-ground, opened into a second file of the same class)
This session already closed four "mark sent AFTER the send, not before"
crons (rating-prompt, comhub-email, payment-reminder, outreach) — all crons
that loop every active tenant with no run-lock, where two overlapping
invocations could both read a not-yet-marked row and both send. Auditing
the remaining `sendSMS`-calling crons (`grep -l sendSMS src/app/api/cron/*/
route.ts`) for the same unfixed pattern surfaced two more files.

## Bug 1 — cron/post-job-followup, standalone-booking branch
Dedup lived ENTIRELY in a `bookings.notes` `'[FOLLOWUP_SENT] <iso>'`
substring, checked client-side against a row already read this invocation,
and written AFTER `sendSMS()`. Two bugs from one design flaw:
- **Race**: an overlapping invocation could read the same not-yet-marked
  booking and double-text the client.
- **Silent resend, no race required**: `notes` is directly editable via
  `PATCH /api/bookings/:id` (in that route's allowed-field list). ANY later
  admin edit to a booking's notes — fixing a typo, adding an unrelated note
  — overwrites the whole field and erases the marker with zero relation to
  whether the SMS was sent. The client gets a second, unprompted review
  request on the next cron pass. This needs no concurrency at all and is
  likely the more common real-world hit of the two.

Fix: new `bookings.review_followup_sent_at` timestamptz column, claimed via
compare-and-swap (`WHERE review_followup_sent_at IS NULL`) BEFORE sending —
immune to notes edits since nothing else touches this column. Migration
backfills existing legacy-marker rows from the notes text (or `check_out_
time` as a fallback when the marker's timestamp suffix doesn't parse) so
the cutover doesn't re-send to everyone already followed up under the old
scheme.

## Bug 2 — cron/post-job-followup, multi-session-job branch
Deduped via a pre-send `count()` on `job_events` (`event_type='review_
requested'`) with no constraint backing it, then inserted the claim row
AFTER `sendSMS()`. Same race, different table — could double-text a client
for the same completed job.

Fix: insert `job_events` FIRST — new partial unique index on `(job_id)
WHERE event_type='review_requested'` is the atomic claim, mirroring
`outreach_log`'s existing constraint from this session's outreach fix — and
only send if the insert succeeds (duplicate-key = lost the race, skip).

## Bug 3 — cron/late-check-in, both branches (late check-in + late check-out)
Same shape as Bugs 1/2, different table again: deduped via a pre-send
`select` on `notifications` (tenant_id, booking_id, type), with no
constraint backing it, and fired the team+admin SMS (fire-and-forget,
`.catch(()=>{})`, not even awaited) BEFORE inserting the notifications row
that was supposed to be the dedup record. Two overlapping invocations could
both read zero existing notifications for the same late booking and both
fire SMS to the team member and the admin.

Fix: insert the `notifications` row FIRST — new partial unique index on
`(tenant_id, booking_id, type) WHERE type IN ('late_check_in','late_check_
out')` is the atomic claim — and only send if the insert succeeds. Partial
(not a blanket constraint) because `notifications` is a general-purpose
table used by many features/types; only these two dedup checks need an
at-most-one-per-booking guarantee.

## Fix files (file-only, no push/deploy/DB)
- `src/app/api/cron/post-job-followup/route.ts` — both branches reordered
  to claim-before-send.
- `src/app/api/cron/late-check-in/route.ts` — both branches reordered to
  claim-before-send.
- `src/lib/migrations/2026_07_17_bookings_review_followup_sent_at.sql` +
  `.backfill.sql` (new) — nullable column, backfilled from the legacy notes
  marker.
- `src/lib/migrations/2026_07_17_job_events_review_requested_unique.sql`
  (new) — dedupe-first (keeps oldest per job) then partial unique index.
- `src/lib/migrations/2026_07_17_notifications_late_alert_unique.sql`
  (new) — dedupe-first (keeps oldest per tenant/booking/type) then partial
  unique index.
- 8 new tests across 2 files (`route.claim-before-send-race.test.ts` in
  each cron directory): concurrent-invocation races (`Promise.all`, exactly
  one occurrence's worth of SMS lands), claim-before-send ordering
  assertions, and a notes-edit-after-send regression test for Bug 1
  specifically.

## Verification
RED-confirmed via `git apply -R` on each source diff independently (not
stash — worker worktrees share one stash stack): all 8 new tests fail with
the exact predicted duplicate-send/ordering symptoms against pre-fix code,
not import errors. Restored, confirmed GREEN. `tsc --noEmit` clean (3
pre-existing unrelated baseline errors — admin-auth route typing,
outreach's own pre-existing spread-argument error, payment-reminder's own
pre-existing arg-count error — none new, none touched). `eslint` 0 new
errors (pre-existing `any`/unused-import warnings on late-check-in/route.ts
predate this diff; the one `_args`-unused warning on each new test file
matches the sibling sms-consent/day-boundary test files' identical,
already-accepted pattern). Full suite after Bug 1/2 (post-job-followup): 596/596 files, 3209 passed +
1 pre-existing expected-fail, 0 regressions. Full suite after Bug 3
(late-check-in), same run also covering Bugs 1/2 again: 597/597 files,
3212 passed + 1 pre-existing expected-fail (same one flagged all session),
0 regressions.

## Not fixed this round — flagged
`cron/confirmations`'s team-confirmation-request SMS has the same send-
then-log ordering, but that path is already an hourly-repeating reminder
(not a strict one-time send) with a 55-min throttle — worst case under the
race is one extra copy of an already-repeating message within the same
cron tick, not a genuinely duplicate one-time notification. Lower severity
than the strict-once sends fixed here; deliberately not touched this pass,
worth a dedicated look if this claim-before-send sweep continues.

`tenant_domains` schema lane (043/055/056/059/068/069/primary-invariant/
domain-normalization) reconfirmed intact, no drift — this round's fixes are
outside that table entirely (bookings, job_events, notifications).

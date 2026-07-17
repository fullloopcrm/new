# W1 — cron follow-up/notification family sweep (2026-07-17 16:30)

Continuation of the 16:15 cron sweep (booking-lifecycle/reminder group). This
round covered the remaining message-sending crons flagged unreviewed
(`comhub-email`) plus the adjacent follow-up/notification family.

## Fixed

1. **`cron/comhub-email`** (fresh-ground item 1) — `pollAccount()`'s dedup on
   `comhub_messages(tenant_id, external_id, channel)` was select-then-insert
   with no DB constraint. Cron fires every 2min with no run-lock; IMAP
   connect + Yinez AI-reply latency can outrun that cadence, so two
   overlapping invocations could both mirror the same inbound email and both
   send a Yinez auto-reply to the same customer. Email-channel twin of the
   rating-prompt '4/29 SMS-blast lesson', and the exact same TOCTOU class
   already fixed for `email/monitor`'s payments dedup
   (`2026_07_16_unique_payments_raw_email_id.sql`).
   - Fix: partial unique index migration
     `2026_07_17_unique_comhub_messages_external_id.sql` (file-only, leader
     applies after Jeff approves) + 23505 catch on the inbound insert, moved
     before the Yinez reply so a losing concurrent invocation is a no-op.
   - **Migration + JS fix must land together** — the 23505 catch is inert
     until the index exists in prod.
   - **Risk flagged, not resolved** (no DB read access from this worktree):
     if this race already produced duplicate rows in prod, the `CREATE
     UNIQUE INDEX` will fail until deduped. Query included in the migration
     file's header comment for the leader to run first.
   - Commit `8b1f48b4`. 1 new test file (race test via `Promise.all`, RED/GREEN
     via `git apply -R`).

2. **`cron/follow-up`** (continued surface, item 2) — the 3-day
   "thank you + 10% off" cron had ZERO duplicate-send protection, unlike
   both its siblings in the same family (`post-job-followup`'s
   `[FOLLOWUP_SENT]` notes marker, `sales-follow-ups`' notifications-based
   dedup). `notify()` itself doesn't dedup either — confirmed by reading
   `lib/notify.ts`, it's a plain insert-and-send every call. A manual
   re-trigger or a platform-retried cron delivery would re-send the email
   (with its discount code) to every booking still inside the 2-hour
   `check_out_time` window.
   - Fix: `[THANKYOU_SENT]` marker in `bookings.notes`, checked before send,
     written after — same convention as `post-job-followup`, deliberately a
     **distinct** marker string (reusing `[FOLLOWUP_SENT]` would make this
     cron silently skip every booking, since that marker is already written
     by the earlier 2-hour SMS by the time this 3-day cron runs).
   - Lower crash-window rigor than the comhub-email/rating-prompt fixes
     (mark-after-send, not claim-before-send) — intentional: `notes` is a
     free-text append field, not a nullable timestamp column, so an atomic
     claim-then-send isn't expressible without a schema change, and this
     cron runs once daily (not every 2min), so the residual crash-window
     risk is materially smaller. Matches the existing accepted standard set
     by its own sibling `post-job-followup`, which uses the identical
     mark-after-send shape.
   - Commit `95f87434`. 1 new test file (2 tests: skip-already-marked +
     re-trigger-is-a-no-op), RED/GREEN via `git apply -R`.

## Checked, clean — no fix needed

- **`comms-monitor`** — fingerprint-based dedup (1hr window, matches on a
  sorted joined-ids fingerprint substring in a prior alert's message) is
  already correct; not a per-message send, it's a single batched admin alert.
- **`auto-reply-reviews`** — delegates to `lib/google-reviews.ts`'s
  `autoReplyReviews()`, which is presumably its own dedup boundary (replies
  only to *unreplied* reviews, a state that flips server-side once answered)
  — not independently re-audited this round, flagged as unreviewed if a
  future pass wants to open `google-reviews.ts` itself.
- **`sales-follow-ups`** — dedup via checking `notifications` inserted in the
  last hour for a matching `deal_id` in `metadata`; same select-then-act
  shape as the races fixed above, but this cron runs hourly with a 1-hour
  lookback window sized to its own cadence, and `deals.follow_up_at` doesn't
  re-enter the query window once past — lower blast radius, not fixed this
  round, flagged for a possible dedicated pass.
- **`post-job-followup`** — already has dedup (notes marker for bookings,
  `job_events` row for jobs) on both its send paths; re-read in full this
  round, no new bug found.

## tenant_domains schema lane

Reconfirmed intact, no drift: 043/055/056/059/068/069 all present.

## Verification

- `git apply -R` RED-confirmed both fixes independently on the route.ts diff
  alone (not stash).
- `tsc --noEmit`: clean (same 2 pre-existing baseline errors + untracked
  `sunnyside-clean-nyc/_lib/site-nav.ts`, both unrelated/untouched).
- Full suite: 577/577 files, 3142/3143 tests (1 pre-existing expected-fail),
  zero regressions.
- `eslint` on all touched files: 0 warnings.
- File-only, no push/deploy/DB.

# W1 — payment-reminder + outreach claim-before-send fixes (2026-07-17 17:48)

Continuation of the 16:06/16:15/16:30 cron sweep. That sweep's fresh-ground
gap doc (`platform/deploy-prep/w1-cron-scheduled-jobs-sweep-2026-07-17.md`)
flagged 4 crons in the same mark-after-send bug class as rating-prompt
(fixed 16:06): rating-prompt itself, `payment-reminder`, `outreach`, and
`comhub-email` (fixed separately at 16:30, its own race — dedup on
`comhub_messages` external_id, needed a new unique-index migration). Its
explicit note: "flagging for a dedicated pass if it's worth generalizing
the rating-prompt claim pattern across all four." This round is that
dedicated pass for the remaining two — `payment-reminder` and `outreach`.
All 4 are now closed.

## Fixed

**1. `cron/payment-reminder/route.ts`** — the client-facing 15-30min nudge
and the 30min+ admin escalation both fired, THEN a separate `update()`
wrote `payment_reminder_sent_at` at the very end of the per-booking loop
body. Two overlapping invocations (this route has no run-lock, loops every
active tenant, fires every 5 min per its own header comment) could both
read the same booking's `payment_reminder_sent_at` as null/stale before
either wrote its mark — both would text the client, or worse, one could
fire the gentle nudge while the other fires the admin "PAYMENT OVERDUE"
escalation for the same booking in the same pass.

Fix: a compare-and-swap update BEFORE the send/escalate branch, conditioned
on `payment_reminder_sent_at` still matching what was just read in this
invocation (`.is('payment_reminder_sent_at', null)` when never reminded,
`.eq('payment_reminder_sent_at', lastReminder)` when repeating past the
5-min throttle) — `.select('id')` on the update, 0 rows back means a
concurrent invocation already claimed it, so this pass skips. This is a
general CAS, not just a null-check, so it also closes the (much rarer)
repeat-throttle race, not only the first-claim race rating-prompt's
`.is(null)`-only version covers — payment-reminder's field is reused as a
repeating throttle, not a one-time flag, so the plain null-check pattern
alone wasn't sufficient here.

Left the sms_consent gate (`clientOptedOut`) and its own comment untouched
— re-read it this round and confirmed it's already correctly gated (the
comment references "payment-followup-daily's fixed sms_consent gate" as
the pattern it followed, already applied here, not a leftover TODO).

3 new tests (`route.claim-before-send.test.ts`): write-before-send
ordering assertion, single-claim happy path, and a genuine `Promise.all`
concurrent-invocation test (2 real overlapping `GET()` calls racing the
same booking, asserting `sendSMS` called exactly once) — stronger than a
pre-seeded-state test, since payment-reminder's field is a reused
throttle rather than an exactly-once flag, so a "already set" precondition
alone doesn't exercise the CAS the same way a genuine interleaved
invocation does. RED-confirmed via `git apply -R` on the route.ts diff
alone (both concurrency tests failed on old code — `sendSMS` called twice).
Commit `c755185f`.

**2. `cron/outreach/route.ts`** — sent the seasonal-moment SMS FIRST, then
inserted the `outreach_log` row (the actual dedup boundary, already backed
by a real DB unique constraint on `(tenant_id, client_id, moment_id)` per
16:15's note). Two overlapping invocations (manual re-trigger racing the
scheduled Saturday-10am run, or a platform-retried delivery) could both
read the same empty `sentIds` set before either's insert landed, and both
text the same client for the same moment — the unique constraint only
deduped the LOG row (silently absorbed as a caught "duplicate key" error),
it never stopped the second SMS from actually going out.

Fix: reordered to insert `outreach_log` FIRST — the existing unique
constraint becomes the atomic claim — and only send if that insert
succeeds. **No new migration needed**, the constraint already existed
(unlike comhub-email, which needed one). Trade-off, same stance as
rating-prompt/payment-reminder: a genuine (non-duplicate-key) log-insert
failure now skips the send instead of sending regardless — "missed over
duplicated," consistent with the rest of this bug-class family.

1 new test (`route.duplicate-send-race.test.ts`) — genuine `Promise.all`
concurrent-invocation race using `fake-supabase.ts`'s
`_addUniqueConstraint('outreach_log', 'client_id')` to mirror the real DB
constraint (this test needed `fake-supabase.ts`, not the outreach
suite's existing `tenant-db-fake.ts` — the latter has no unique-constraint
simulation, so it can't produce a genuine `duplicate key` error and can't
exercise this specific race; the existing `route.day-boundary.test.ts`
test wasn't touched). RED-confirmed via `git apply -R` (old code sent
`sendSMS` twice). Commit `b80aad44`.

## Cron mark-after-send bug-class family — now fully closed

- `rating-prompt` — fixed 16:06 (this session, earlier pass)
- `comhub-email` — fixed 16:30 (needed new migration, own unique index)
- `payment-reminder` — fixed this round
- `outreach` — fixed this round

## tenant_domains schema lane

Reconfirmed intact, no drift: 043/055/056/059/068/069 all present.

## Verification

- `git apply -R` RED-confirmed both fixes independently on each route.ts
  diff alone (not stash — worker worktrees share one stash stack, per this
  session's hook guard).
- `tsc --noEmit`: clean (same 2 pre-existing baseline errors — admin-auth
  type quirk + untracked `sunnyside-clean-nyc/_lib/site-nav.ts`, both
  unrelated/untouched).
- `eslint` on all touched/new files: 0 warnings.
- Full suite: 586/586 files, 3164/3165 tests (1 pre-existing expected-fail,
  unrelated), zero regressions.
- File-only, no push/deploy/DB.

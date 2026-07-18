# cron/reminders — one file, three broken dedup mechanisms (2026-07-17 21:10)

## Surface
Swept the remaining unfixed sendSMS crons for this session's established
sent-before-claim race class (already closed on rating-prompt/comhub-email/
payment-reminder/outreach/post-job-followup/late-check-in). `cron/reminders`
(the largest cron in the codebase — day-based, hour-based, payment-alert,
thank-you, unpaid-team, pending-booking, ops-recap, and digest sends all live
in one file) turned out to have three separate broken dedup mechanisms:

## Bug 1 — DAY-BASED reminders: dead dedup, not just a race
The pre-send check queried `notifications` for `type = 'reminder_Nday'`
(e.g. `reminder_3day`, `reminder_1day`, tenant-configurable via
`reminder_days`), but the only write on that path goes through `notify()`,
which always inserts the **fixed enum literal `'booking_reminder'`** —
never the dynamic `emailType` value. `metadata.dedup: emailType` is stored
on the row but never read back by anything. The check and the write never
matched, so this "dedup" was **dead code that always saw zero existing
rows** — worse than a race window, a claim that never functioned even in a
single-threaded run. Any double-invocation of this cron during the 8am ET
hour (Vercel cron retries/duplicate triggers — an already-observed risk
class this session — compounded by this loop's own heavy per-tenant NYC
Maid geocoding work against a 300s `maxDuration`) duplicate-sent the
reminder email+SMS to every matching client and the "tomorrow's schedule"
SMS to every assigned team member.

## Bug 2 — HOUR-BASED reminders: standard sent-before-claim race
Check and write both used `reminder_Nhour` (this one DID match), but the
insert happened AFTER firing both the client and team-member SMS — the
same sent-before-claim race already fixed elsewhere this session. This
cron loops every active tenant with no run-lock; two overlapping
invocations could both pass the pre-send check and both fire SMS.

## Bug 3 — PAYMENT_DUE alert: same race
The in-app `payment_due` row (the actual dedup record) was inserted after
the admin email went out.

## Fix (file-only, no push/deploy/DB)
All three now insert their dedup-claim row FIRST and only send if that
insert succeeds — same claim-before-send shape as post-job-followup/
late-check-in. New migration `2026_07_17_notifications_reminder_dedup_unique.sql`:
dedupe-first (keeps oldest per `(tenant_id, booking_id, type)`, deletes the
rest), then a partial unique index scoped to
`type LIKE 'reminder_%day' OR type LIKE 'reminder_%hour' OR type = 'payment_due'`
— covers the tenant-configurable day/hour offsets without enumerating every
possible config value, and doesn't touch `notifications`' many other types
(e.g. `team_confirm_request` intentionally gets multiple rows per booking).

Also added `.returns<T>()` as an inert passthrough to `src/test/fake-supabase.ts`
(test infra only) — `createFakeSupabase` didn't implement it, and
`reminders/route.ts`'s queries use `.returns<T>()` extensively, unlike the
other crons this session's race tests have covered. Real supabase-js's
`.returns<T>()` is itself a compile-time-only type assertion with no
runtime effect, matching `tenant-db-fake.ts`'s existing inert
implementation of the same method.

## Tests
`route.claim-before-send-race.test.ts` (new, 5 tests): concurrent
double-invocation for each of the three branches (exactly one occurrence's
worth of sends lands), a sequential-double-invocation check for the
day-based branch (proves the dedup now actually functions, not just
survives a race), and a claim-before-send ordering assertion. RED-confirmed
via `git diff > patch` + `git apply -R` on `route.ts` only (test file left
in place) — all 5 fail with the exact predicted duplicate-send symptoms
against pre-fix code, restored, GREEN.

Caught two of my own test-fixture mistakes before they became false
failures: (1) a day-based test booking with `team_member_id: null` also
matched the unrelated, pre-existing "pending booking alerts" feature (no
dedup at all, fires by design every 8am/2pm until a booking is assigned) —
assigned a team member to isolate the branch under test. (2) the hour-based
and payment_due tests initially used real wall-clock time, which happened
to land in the 9pm ET nightly-digest hour during one run and produced
unrelated extra `notify()` calls — pinned both to a fixed 3am ET instant
that avoids every other hour-gated branch in this file (day-based=8,
pending-alerts=8/14, ops-recap=20, digest=21).

## Verification
- `tsc --noEmit`: 0 new errors on any touched file (same 3 pre-existing
  baseline errors as prior rounds this session, unrelated).
- `eslint`: 0 errors (a few pre-existing `any`/unused-var warnings,
  consistent with the file's existing style).
- Targeted: `cron/reminders/` 3 files, 10/10 passed.
- Full suite: 598/598 files, 3217 passed + 1 pre-existing expected-fail
  (same one flagged by other workers all session), 0 regressions, +5 net
  new tests.
- `tenant_domains` schema lane (043/055/056/068/069/primary-invariant/
  clients-pin-unique) reconfirmed intact — this round's changes are
  entirely outside that table (`notifications` only).

## Noticed, not fixed this round
- The hour-based reminder's in-app notification `title` is hardcoded to
  `'Reminder: 2 hours'` regardless of the configured `hoursBefore` value
  (the actual SMS body correctly uses the variable) — a cosmetic
  dashboard-internal label mismatch, not a send-correctness bug. Left
  untouched, outside this round's scope.
- `metadata.dedup` on the day-based `notify()` call is now confirmed truly
  decorative (never read anywhere) — left in place rather than removing it,
  to keep the diff minimal; a future reader should not assume it's load-bearing.

Commit: (this commit, fix + migration + tests + fake-supabase `.returns()`).
File-only. No push/deploy/DB.

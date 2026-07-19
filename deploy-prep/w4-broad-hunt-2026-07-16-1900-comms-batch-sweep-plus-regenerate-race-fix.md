# W4 — 18:46 queue: comms-batch duplicate-submit sweep, archetype depth, fresh ground

Per 18:46 LEADER order: (1) continue archetype depth, (2) continue hunting fresh
ground, (3) sweep remaining comms-batch routes (message-applicants/send and any
siblings) for the same missing duplicate-submit guard found on send-apology-batch.
All file-only, no push/deploy/DB.

## 3. Comms-batch sweep — FOUND + FIXED one, one PROPOSED migration, rest already clean

Checked every batch/broadcast send route (`sendSMS`/`sendEmail` inside a loop or
`Promise.all`) under `admin/*` and the two `campaigns/send` routes:

- **`admin/find-cleaner/send`** — already guarded (`cleaner_broadcasts` windowed dedup,
  prior session).
- **`admin/send-apology-batch`** — already fixed this session (50db3d87).
- **`campaigns/send`** and **`campaigns/[id]/send`** — already atomically claimed
  (`status:'draft'`/`'sending'` conditional UPDATE, prior session).
- **`admin/comhub/send`** — single-recipient 1:1 send (not a batch broadcast), already
  rate-limited (30/10min per tenant). Different bug class; left as-is.
- **`admin/broadcast-guidelines`** — config-only route, no sends.
- **`admin/message-applicants/send`** — **confirmed vulnerable, NOT fixed live.**
  Zero duplicate-submit guard: validates + re-applies safety filters, then
  unconditionally `Promise.all`s `sendSMS` to every selected applicant. A double-click
  of "Send" or a client retry re-texts every applicant again. Unlike the three routes
  above, `cleaner_applications` has no existing timestamp/table to claim against without
  a schema change — confirmed via this repo's own migration
  (`2026_05_19_cleaner_applications.sql`) that no such column exists. Wiring code against
  a column that doesn't exist in prod would 500 the route, so per the standing DDL-approval
  rule I proposed (not applied) a purely additive `last_broadcast_sms_at` column —
  `src/lib/migrations/2026_07_16_cleaner_applications_broadcast_claim_column_PROPOSED.sql`
  — with the exact claim-before-send fix written in the header, mirroring
  `claimApologyCredit` in send-apology-batch/route.ts line for line. Ready to wire once
  Jeff approves and the leader applies it.
- **`admin/bookings/broadcast`** — **found + FIXED** (see below; this is also the fresh-ground
  finding for this round, it's a genuinely new route this session hadn't swept).

### FIXED — bookings/broadcast urgent-job broadcast had no duplicate-submit guard

`POST /api/bookings/broadcast` pages every active team member (SMS + email) with an
urgent job alert, unconditionally, every call. No claim, no dedup check — a double-click
of "Broadcast" or a client retry would re-page the whole team for the same job. Unlike
message-applicants/send, this route already writes a `'job_broadcast'` notification row
per successful broadcast (`tenant_id`, `booking_id`, `type`, `created_at` — a table that's
already used this exact way elsewhere in the app, confirmed no schema change needed).
Reused that row as the dedup marker: reject a repeat broadcast for the same booking
within a 2-minute window, same check-then-act pattern already established by
find-cleaner/send's `cleaner_broadcasts` dedup query.

New test file `route.duplicate-broadcast.test.ts` (3/3 pass); had to extend the existing
`route.xss.test.ts`'s `notifications` table mock to support `.select()` (it previously only
stubbed `.insert()`) so the pre-existing XSS test keeps passing. Mutation-verified: reverted
the fix via `git diff > patch && git apply -R patch`, confirmed the race test fails for the
right reason (`200` instead of `409`, i.e. the second call also broadcasts), restored,
confirmed green again. Full `bookings/broadcast` suite 4/4, full `src/app/api/bookings`
suite 35/35. `tsc --noEmit`: clean on this file (same 3 pre-existing unrelated errors
elsewhere as every report this session — bookings/broadcast xss test mock typing + 2
sunnyside-clean-nyc marketing-nav import errors, confirmed present even with my changes
fully reverted via `git stash`). Committed 26d98088.

## 1. Archetype depth — FOUND + FIXED a real duplicate-booking race in recurring-schedule regenerate

Traced into the recurring-schedule "edit pattern" flow (dumpster/junk/moving multi-touch
archetype's own scheduling primitive), one level deeper than the `generate-recurring`
cron dedup fixed earlier this session. `POST /api/admin/recurring-schedules/:id/regenerate`
— the single atomic server call the dashboard's "Save changes" (edit recurring pattern)
button uses — had no guard against being called twice for the same schedule. Two
concurrent calls (double-click of Save, or a client retry after a slow response) both
read the same schedule row, then both inserted a full duplicate set of new booking rows
for the same series in step 3, before either call's delete of the OLD future bookings ran
in step 4 — net effect: duplicate scheduled bookings left on the calendar/team portal for
the series (real double-dispatch risk, not just a log-row dup). No client SMS/email is
sent from this route (admin-managed flow, confirmed via its own header comment), so this
is a scheduling-integrity bug, not a customer-facing spam bug.

Fixed with an optimistic-concurrency compare-and-swap on the schedule row's own
`updated_at`: read it alongside the row, then gate the rule-update itself on
`updated_at` still matching what was read (`.eq('updated_at', schedule.updated_at)` or
`.is('updated_at', null)` for a never-updated row) instead of an unconditional write.
Only the caller whose read is still current wins; the loser's UPDATE matches zero rows
and gets a clean 409 instead of racing the insert. No schema change needed — reused the
column that's already there and already gets bumped on every legitimate edit.

New test file `route.duplicate-regenerate-race.test.ts` using the shared
`fake-supabase` harness (2/2 pass). Mutation-verified: reverted the claim via
`git apply -R`, confirmed both concurrent calls return `200` (both insert duplicate
bookings — the real pre-fix bug), restored, confirmed `[200, 409]` post-fix with exactly
1 booking row surviving (not 2). Full `admin/recurring-schedules` suite 6 files / 13 tests
pass (including the pre-existing team-member-ownership IDOR test, unaffected). `tsc
--noEmit` clean (same 3 pre-existing unrelated errors, confirmed present without my
changes too). Committed 5524066b.

Also spot-checked the sibling `recurring-schedules/:id/exception` route (skip/move/
reassign a single occurrence) for the same class — it's genuinely clean: the exception
record itself is a real `upsert(...,{onConflict:'schedule_id,occurrence_date'})` backed
by an actual unique constraint (not check-then-act), and the booking-side apply for each
type (delete-by-id for skip, absolute-value set for move/reassign) is naturally
idempotent on retry. No fix needed there.

## 2. Fresh ground

Both the bookings/broadcast fix (comms-batch class) and the regenerate-race fix
(archetype-depth class) above are new findings this session hadn't swept — reporting them
under their more specific categories above rather than duplicating here.

## Scope

File-only, no push/deploy/DB. Two commits this round: 26d98088 (bookings/broadcast),
5524066b (recurring-schedules regenerate + cleaner_applications migration proposal).
Migration proposal is docs-only per the standing DDL-approval rule — not wired, not
applied.

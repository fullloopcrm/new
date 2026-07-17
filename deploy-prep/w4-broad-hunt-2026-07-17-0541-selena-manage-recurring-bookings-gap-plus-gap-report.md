# W4 broad-hunt — 2026-07-17 05:41 EDT

Queue (05:33 LEADER order, 3-deep, file-only, no push/deploy/DB):
(1) continue scheduling/dispatch depth
(2) continue fresh-ground hunting
(3) keep gap/fluidity current

Same finding covers (1) and (2): scheduling/dispatch depth led straight into
fresh ground (Selena's SMS tool layer, untouched this session).

## (1)+(2) — `manage_recurring` (Selena SMS tool) never cancelled the actual bookings on pause/cancel

`handleManageRecurring` in `src/lib/selena/core.ts` backs the `manage_recurring`
tool Selena calls when a client texts to pause or cancel their recurring
service. For both `action === 'pause'` and `action === 'cancel'` it only ever
updated `recurring_schedules.status` (+ `paused_until`) and returned
`{success: true}` — it never touched the `bookings` table. Selena's reply to
the client says "Recurring paused until X" / "Recurring schedule cancelled",
but every already-generated booking row for that series (the actual visits on
the calendar) stayed `scheduled`/`pending`/`confirmed` untouched. The cleaner
still shows up — and the client can still get billed/reminded — for a visit
they were just told is paused or cancelled.

This is the SAME operation the app already does correctly in two other
places, which is how the gap surfaced: `POST /api/schedules/[id]/pause`
(dashboard pause button) and `DELETE /api/admin/recurring-schedules/[id]`
(dashboard cancel) both cancel the in-window/future
`scheduled`/`pending`/`confirmed` bookings alongside the status flip. Selena's
own `cancel_booking` and `manage_recurring`'s sibling `action === 'cancel'`
notify block (`recurring_cancelled`) already existed and looked correct at a
glance — the bug was an omission, not a wrong filter.

Fix mirrors the established pattern from the two API routes:
- `pause`: cancel `scheduled`/`pending`/`confirmed` bookings for the schedule
  with `start_time >= now`, additionally bounded by `<= pause_until 23:59:59`
  when a `pause_until` was given. When `pause_until` is omitted (the tool
  schema allows an indefinite pause — only `action` is required), every
  future booking on the series is cancelled, matching what "paused with no
  end date" has to mean.
- `cancel`: cancel every future `scheduled`/`pending`/`confirmed` booking on
  the series, same as the admin DELETE route.
- Both scoped by `tenant_id` + `schedule_id`, both now report the real
  cancelled count in Selena's reply text and in an internal `notify()` call
  (previously `cancel`'s notify said "cancelled" with no indication whether
  any actual visit was touched; `pause` had no notify at all).
- `resume` is unchanged — no bookings need restoring; the schedule just
  regenerates future occurrences going forward, same as today.

New test file: `src/lib/selena/manage-recurring.test.ts` (5 cases, first-ever
coverage for this handler) using the shared `fake-supabase` in-memory store
(mocks `@supabase/supabase-js` the same way `booking-authz.test.ts` does):
window-bounded pause cancels only in-window scheduled/pending/confirmed rows
and leaves past/later/already-cancelled rows alone; omitted-`pause_until`
pause cancels every future row; tenant/schedule scoping isn't crossed;
`cancel` cancels every future row and leaves past ones; `resume` only flips
status, touches no bookings.

Mutation-verified: reverted the `core.ts` fix via `git apply -R` with the new
test file left in place — 3/5 tests failed for the right reason (the two
new-behavior assertions on pause and the cancel-count assertion), the 2
scoping/resume tests correctly stayed green since those paths were never
broken. Restored, all 5 green again.

**Noted, not fixed (confirmed dead code):** `POST /api/admin/recurring-schedules/[id]/pause`
is a third, separate implementation of the same pause operation, and its
booking-cancellation filter is `.in('status', ['scheduled', 'pending'])` —
missing `'confirmed'`, the same class of gap as this fix but only partial.
Grepped the whole repo (components, pages, tests, scripts) for any caller —
zero. The live dashboard pause button calls `/api/schedules/[id]/pause`
(the correct, `'confirmed'`-inclusive one) exclusively. Left untouched,
same restraint this session has applied to other confirmed-zero-importer
dead code (the `notify-cleaner.ts` clones, per-tenant `recurring.ts`
clones) — flagging here in case it's ever wired up or deleted outright.

## Verification

- `npx tsc --noEmit`: same 3 pre-existing baseline errors (2 marketing-nav,
  1 xss test mock), identical to every prior session, none in touched files.
- Full suite: `npx vitest run` — 488 passed / 1 failed file, 1943 passed /
  1 failed / 1 expected-fail / 1 skipped. The 1 failure
  (`cron/tenant-health/status-coverage-divergence.test.ts`) is the same
  pre-existing, explicitly-named "RED until fixed" Fortress-monitoring
  placeholder every prior report this session has hit — unrelated, not a
  regression.
- No push, no deploy, no DB write. One file diff (`src/lib/selena/core.ts`)
  plus its new test file.

## Also committed this pass: prior-session verified work that was landed but never git-committed

Found 5 modified route files + 5 new test files sitting uncommitted in the
worktree from the 05:22 and 05:33 reports (both already reported to and
acknowledged by LEADER, but the commits never happened): `comhub/threads/[id]`
assignee_id validation + `dashboard/schedules/import` inactive-staff fix
(05:22 batch), and `admin/schedule-issues/fix` stale-plan guard +
`team-applications` approve double-fire guard, single + bulk (05:33 batch).
Re-ran each batch's tests fresh before committing (13/13 passed) rather than
trusting the prior report's numbers blind. Now on 2 commits
(`f8159cf2`, `5b2c4029`), plus this pass's fix on `e3ee4adf`.

## Gap/fluidity — 1 closed, 1 new noted-not-fixed (dead code) this pass

- **CLOSED**: `manage_recurring` (Selena SMS pause/cancel) now cancels the
  actual booking rows, not just the `recurring_schedules` status flag.
- **NEW, NOTED NOT FIXED**: `admin/recurring-schedules/[id]/pause` has the
  same booking-cancellation gap class (missing `'confirmed'` status) but is
  confirmed dead code (zero callers) — left alone, flagged for cleanup/
  wire-up decision.
- All other carried items unchanged: `voice/cleanup` ops-risk flag (dead
  code, never force-hangs-up Telnyx — still open, product/ops question for
  Jeff); `fake-supabase.ts` no support for PostgREST embedded-relation
  filters (blocks mutation-testing 3 ledger-report call sites); `admin/
  cleanup-test-bookings` hardcoded-name hard-delete flagged for Jeff, not
  fixed (product decision); partial-refund operational treatment;
  invoice-linked refund status/amount_paid_cents sync; live-DB
  second-payment ledger-gap audit; `activate-tenant.ts` fragmentation
  (432-line file, noted repeatedly, not a bug); client-side team-member
  dropdowns still unfiltered by status (6 components, noted 02:17 —
  server-side guard is the load-bearing fix, UI polish left open);
  `team-portal/photo-upload` route explicitly PROPOSED/unwired (companion
  migration not applied — safe to leave, don't link from UI).

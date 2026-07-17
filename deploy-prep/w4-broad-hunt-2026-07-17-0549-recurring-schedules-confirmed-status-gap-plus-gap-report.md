# W4 broad-hunt — 2026-07-17 05:49 EDT

Queue (05:44 LEADER order, 3-deep, file-only, no push/deploy/DB):
(1) continue scheduling/dispatch depth
(2) continue fresh-ground hunting
(3) keep gap/fluidity current

## (1)+(2) — `admin/recurring-schedules` had the SAME `'confirmed'`-status gap as last session's fix, in 5 places, including the two routes last session's report cited as the "correct reference implementation"

Last session's `manage_recurring` gap report said `POST /api/schedules/[id]/pause`
and `DELETE /api/admin/recurring-schedules/[id]` "both cancel the in-window/
future `scheduled`/`pending`/`confirmed` bookings alongside the status flip"
and used them as the proof that Selena's tool was the outlier. That claim was
wrong about the second route: `DELETE /api/admin/recurring-schedules/[id]`
filters `.in('status', ['scheduled', 'pending'])` — no `'confirmed'`. Auditing
every `.in('status', ...)` booking-status filter in the `admin/
recurring-schedules` feature turned up the same omission in 5 of 6 live call
sites (the 6th, `[id]/pause/route.ts`, is confirmed dead code per last
session — left alone, same restraint).

`'confirmed'` is not an edge case: `webhooks/telnyx/route.ts` sets it the
ordinary way, the moment a client texts YES to the SMS confirmation. Most
upcoming bookings pass through it before the visit. Concretely, before this
fix:

- **`DELETE /api/admin/recurring-schedules/[id]`** (dashboard "cancel
  series" button): a confirmed future booking survived the cancel
  untouched — cleaner still shows up, client can still get billed, despite
  the admin having just cancelled the whole series. Same severity as last
  session's `manage_recurring` bug, this time in the admin dashboard path
  itself.
- **`POST /api/admin/recurring-schedules/[id]/regenerate`** (dashboard
  "edit recurring pattern"): the OLD-bookings query that gets hard-deleted
  after the new pattern's bookings are inserted also missed `'confirmed'`.
  Editing a schedule's day/time/rate after any occurrence had already been
  client-confirmed left that old confirmed row on the calendar **alongside**
  the brand-new inserted row for the same date — literal duplicate
  bookings, the exact outcome this route's own atomic-claim comment says it
  exists to prevent (just defeated via a different door). Highest-severity
  finding this pass.
- **`POST /api/admin/recurring-schedules/[id]/exception`** (dashboard
  per-occurrence skip/move/reassign): recorded the exception row correctly
  (so future regeneration would honor it) but silently no-op'd on the
  already-materialized booking if it was confirmed — admin says "skip this
  date," booking stays live; "move to 2pm," booking stays at the old time;
  "reassign," booking keeps the old crew member. `bookings_updated` under-
  reported with no error.
- **`PUT /api/admin/recurring-schedules/[id]`** (reassign schedule's team
  member): a confirmed future booking kept the old assignee even though the
  admin just changed who the series belongs to.
- **`GET /api/admin/recurring-schedules/[id]`** and **`GET
  /api/admin/recurring-schedules`**: confirmed bookings were invisible in
  the admin's own "upcoming bookings" / "next booking date" displays —
  cosmetic but means the admin's own preview before cancelling/reassigning
  understated what would actually be touched.

Fix: added `'confirmed'` to all 5 filters, matching `/api/schedules/[id]/
pause` (the one route in this family that already had it right).

New tests (fake-supabase, same pattern as `manage-recurring.test.ts` /
`route.team-member-ownership.test.ts`): `[id]/route.confirmed-status-gap.test.ts`
(GET/PUT/DELETE, 3 cases), `[id]/regenerate/route.confirmed-status-gap.test.ts`
(1 case: old confirmed row removed, no duplicate survives), `[id]/exception/
route.confirmed-status-gap.test.ts` (skip + reassign, 2 cases). All seed a
`completed` sibling row to prove history stays untouched, not just that
`confirmed` now gets caught.

Mutation-verified: reverted all 4 source-file diffs via `git apply -R` with
the 3 new test files left in place — 6/6 new-behavior assertions failed for
the right reason (confirmed rows survived cancel/reassign/regenerate/
exception where the tests expect them touched); re-applied, all green.

## Verification

- `npx tsc --noEmit`: same 3 pre-existing baseline errors (2 marketing-nav,
  1 xss test mock), identical to every prior session, none in touched files.
- `npx vitest run` scoped to `admin/recurring-schedules`: 21/21 passed (10
  files, includes the 3 new ones).
- Full suite: `npx vitest run` — 491 passed / 1 failed file, 1949 passed /
  1 failed / 1 expected-fail / 1 skipped. The 1 failure
  (`cron/tenant-health/status-coverage-divergence.test.ts`) is the same
  pre-existing, explicitly-named "RED until fixed" Fortress-monitoring
  placeholder every prior report this session has hit — unrelated, not a
  regression.
- No push, no deploy, no DB write. 4 source-file diffs + 3 new test files.

## Gap/fluidity — 1 closed (5 sub-sites), 0 new noted-not-fixed this pass

- **CLOSED**: `admin/recurring-schedules` feature (base list, `[id]` GET/
  PUT/DELETE, `regenerate`, `exception`) now includes `'confirmed'` in every
  future-booking status filter, matching `/api/schedules/[id]/pause`.
  Corrects last session's gap report, which incorrectly cited the DELETE
  route here as already-correct.
- **CORRECTION TO PRIOR REPORT**: the 05:41 gap report's claim that `DELETE
  /api/admin/recurring-schedules/[id]` "cancel the in-window/future
  scheduled/pending/confirmed bookings" was wrong — it was missing
  `'confirmed'` until this pass. Selena's `manage_recurring` fix from that
  session is unaffected (it now correctly includes `'confirmed'` per its
  own test coverage); only the prior report's characterization of the
  *reference* implementation was inaccurate.
- All other carried items unchanged: `[id]/pause/route.ts` confirmed dead
  code (same `'confirmed'`-missing pattern, zero callers, still left
  alone); `voice/cleanup` ops-risk flag (dead code, never force-hangs-up
  Telnyx — still open, product/ops question for Jeff); `fake-supabase.ts`
  no support for PostgREST embedded-relation filters (blocks
  mutation-testing 3 ledger-report call sites); `admin/cleanup-test-bookings`
  hardcoded-name hard-delete flagged for Jeff, not fixed (product decision);
  partial-refund operational treatment; invoice-linked refund status/
  amount_paid_cents sync; live-DB second-payment ledger-gap audit;
  `activate-tenant.ts` fragmentation (432-line file, noted repeatedly, not a
  bug); client-side team-member dropdowns still unfiltered by status (6
  components, noted 02:17); `team-portal/photo-upload` route explicitly
  PROPOSED/unwired (companion migration not applied — safe to leave).

# W4 — orphaned recurring_schedules row on bookings batch-insert failure

**Date:** 2026-07-16 13:5x
**Status:** Fixed in code, file-only (no push/deploy/DB), tsc clean on touched files.

## Bug

Two paths create a `recurring_schedules` row first, then batch-insert the
initial ~6 weeks of `bookings` for it:

- `src/lib/sale-to-recurring.ts` (`createSeriesAfterClaim`, used by quote → recurring conversion)
- `src/app/api/admin/recurring-schedules/route.ts` (admin "create recurring schedule" POST)

If the bookings batch insert fails — the realistic cause is the
`fn_block_booking_overlap` trigger rejecting the *entire* insert statement
because one generated occurrence overlaps an existing booking (same failure
mode already handled with a per-row fallback in the `generate-recurring`
cron) — both routes threw/returned an error but left the just-created
`recurring_schedules` row behind with `status: 'active'` and zero bookings.

Consequences:
- `sale-to-recurring.ts`: the outer catch released the quote's conversion
  claim (`converted_at` reset) so a retry was possible, but the retry created
  a **second** schedule while the first, orphaned one kept existing.
- Both paths: the orphaned schedule is `active`, so the weekly
  `generate-recurring` cron keeps trying to generate bookings against it
  indefinitely — forever if the conflict persists, or eventually producing
  **phantom bookings nobody asked for** once the colliding slot no longer
  overlaps.
- No indication to the admin/caller that this zombie schedule exists — it's
  invisible until a phantom booking or a repeated cron-skip notification
  shows up.

## Fix

On bookings-batch failure, delete the just-created schedule row before
surfacing the error, in both places:

- `src/lib/sale-to-recurring.ts:203-216`
- `src/app/api/admin/recurring-schedules/route.ts:209-216`

## Tests

- `src/lib/sale-to-recurring-race.test.ts`: added a case that seeds a
  `bookings.start_time` unique-constraint collision (simulating the overlap
  trigger) — proves the schedule is deleted, the quote's claim is released,
  and a clean retry produces exactly one schedule.
- `src/app/api/admin/recurring-schedules/route.batch-insert-rollback.test.ts`
  (new): same shape for the admin POST route.

All 4 + 1 tests pass. `npx tsc --noEmit` shows only pre-existing errors in
unrelated files (`bookings/broadcast/route.xss.test.ts`,
`site/sunnyside-clean-nyc/_lib/site-nav.ts`) — not touched by this change.

## Not done (out of scope / noticed)

- The `generate-recurring` cron already has a per-row fallback for this same
  batch-failure mode; these two creation paths did not, and still don't
  regenerate per-row — they now just fail cleanly instead of leaving a zombie
  row. A future improvement could add the same per-row fallback here so a
  single colliding occurrence doesn't block the other 5 weeks of valid
  bookings. Flagging, not implementing (scope).

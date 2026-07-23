# Checkout-price backfill proposal — historical bookings affected by the broken "Complete" button

**Status:** investigation + proposal only. Nothing here has been run against prod. No code committed to a
route yet — this is the plan to review before anyone builds/runs it.

## Background

W3 fixed the live bug (commit `770577c0f` on `p1-w3-2026-07-23-w3`): `dashboard/bookings/[id]/page.tsx`'s
"Complete" button called `PATCH /api/bookings/[id]/status` with only `{status:'completed'}`, never
recomputing `price`/`actual_hours`/`team_member_pay`/`check_out_time` from the real elapsed time. Two
other checkout paths (`team-portal/checkout/route.ts` for mobile crew, `BookingsAdmin.tsx`'s "Confirm
Check Out" for desktop admin) already did this correctly via the shared `computeCheckoutPricing()`
helper. The fix makes this third path match the other two, going forward.

**What the fix does NOT do:** repair bookings that were already completed through the broken path before
today. Their `booking.price` is permanently stuck at the original scheduling-time estimate until someone
backfills it.

## Scope, measured directly against prod (read-only, single-shot COUNT queries only, no bulk row reads,
credentials pulled via `vercel env pull`/`vercel link` and deleted from disk immediately after each query — nothing left on disk)

Signal used: `status='completed' AND actual_hours IS NULL` — every one of the three checkout paths sets
`actual_hours` together with `price`, so a completed booking missing it never went through a real
recompute (either the broken button, or possibly another path not yet identified — see Open Question below).

| Query | Count |
|---|---|
| Completed bookings, `actual_hours IS NULL`, platform-wide | **255 of 841** (~30%) |
| Same, nycmaid only | **9 of 589** (~1.5%) — nycmaid's admins evidently mostly used the two already-correct paths; other/newer tenants hit the broken button far more |
| Of the 255: also missing `check_out_time` (no end timestamp to compute from) | **9** |
| Of the 255: also missing `check_in_time` (no start timestamp either — fully unrecoverable from booking data alone) | **2** |
| Of the 255: **both check_in_time AND check_out_time present** — a real historical bill CAN be computed | **246** |

**Bottom line: 246 of 255 affected bookings (96%) have everything needed to compute an accurate historical
bill. Only 9 have a real gap (missing checkout time), and only 2 of those are fully unrecoverable (missing
check-in too).**

## Why NOT to just run the existing `/api/finance/backfill` route

It looks like the same tool at first glance, but it isn't a safe fit here:

1. **Different targeting signal.** It filters on `.is('team_member_pay', null)`, not `actual_hours IS
   NULL`. These are usually set together so the sets likely overlap heavily, but they aren't proven
   identical — running it wouldn't verifiably hit exactly this bug's 255 rows, and could touch rows
   outside this incident's scope without anyone having confirmed why THOSE rows are missing `team_member_pay`.
2. **Less complete pricing math.** It computes hours/price with its own inline logic (`roundToHalfHour` +
   basic discount/credit) — it does **not** include team-minimum or recurring-discount reapplication, both
   of which `computeCheckoutPricing()` (the canonical helper W3's fix now uses, shared with
   `BookingsAdmin.tsx` and `team-portal/checkout`) already has. Using the older, simpler calculation here
   would produce numbers that are internally inconsistent with every other checkout path on the platform.
3. **Silently guesses on missing timestamps.** When `check_in_time`/`check_out_time` are absent, it falls
   back to the booking's *scheduled* `start_time`/`end_time` window — i.e., it quietly writes the ORIGINAL
   estimate back in disguise for exactly the rows where we have no real elapsed-time data, rather than
   skipping/flagging them. For our 9 (2 fully unrecoverable) edge-case rows, that's the wrong behavior —
   it would look like a fix but silently preserve the original bug's output.

## Proposed backfill (do not build/run without Jeff's go)

- **New, narrowly-scoped script/route**, not a reuse of `finance/backfill`. Target exactly: `status =
  'completed' AND actual_hours IS NULL AND check_in_time IS NOT NULL AND check_out_time IS NOT NULL`
  (246 rows today, likely more by the time this runs since the bug was live until minutes ago — bookings
  someone marks complete via the fixed button between now and merge/deploy won't hit this list, but any
  that already went through the broken path in that window before the fix reaches prod will need
  re-counting at execution time).
- **Reuse `computeCheckoutPricing()` directly** (the same helper the fix now calls) — no reimplementation,
  no drift from the canonical calculation.
- **Dry-run mode first**: compute and log the diff (old price vs. new price, per booking) without writing
  anything, so a human can eyeball the size/direction of the correction before any write happens. Given
  overage typically pushes price UP, expect this to mostly be positive corrections (money the business is
  currently owed but hasn't billed) — worth a sanity spot-check that nothing swings wildly negative, which
  would suggest a bad input row rather than a real correction.
- **Tenant-scoped, admin-triggered** (same access pattern as the existing `finance/backfill` route —
  `finance.expenses` permission, one tenant at a time), not a blanket cross-tenant script.
- **The 9 rows missing `check_out_time`** (2 of which are also missing `check_in_time`): explicitly
  excluded from the automated backfill, surfaced as a short manual-review list instead (booking id, client,
  date) for someone to either look up the real checkout time from another source (job notes, team chat,
  Stripe payment timestamp as a proxy) or leave alone.

## Open question, not yet answered

Is `actual_hours IS NULL` on a completed booking caused ONLY by this now-fixed Complete-button path, or
could there be a fourth path with the same gap (e.g., an admin bulk-status-change, a cron auto-complete,
or a Selena/AI tool call that also does a bare status write)? Haven't traced this — would need to check
`booking_events`/audit log timestamps against `updated_at` per affected row to distinguish, which is a
bulk-row-level investigation I did NOT do (stayed to single-shot COUNTs per the standing no-bulk-read
rule). If someone can quickly check the audit log for a small sample of the 255 rows, it'd be worth
confirming before treating "246 recoverable" as the final safe backfill list.

## What I did NOT do

- Did not write or commit a runnable script/route.
- Did not run anything against prod beyond 5 total single-shot `COUNT`-only queries (no row data pulled,
  `Range: 0-0` header used throughout).
- Did not touch `/api/finance/backfill/route.ts`.
- Prod credentials (`vercel env pull` output, `.vercel` link directory) were deleted from disk immediately
  after each query; nothing was ever staged or committed.

# W4 — bookings batch-update completed/paid→cancelled bypass fix — 2026-07-18 05:40

Per the 05:29 LEADER order's 3-deep queue: (1) new fresh-ground surface, (2)
continue whatever it opens up, (3) keep gap/fluidity current.

## This pass

1. **Fresh-ground surface.** The 05:28 checkpoint's own next-target candidate
   (invoices/quotes nested subroutes for the "PUT lacks the guard its sibling
   has" pattern) turned out to be **already fully hardened** — read every
   route in the family (`quotes/[id]` PATCH/DELETE, `quotes/[id]/convert`,
   `convert-to-job`, `send`, `quotes/public/[token]` GET/`accept`/`decline`/
   `deposit-checkout`, `invoices/[id]` PATCH/DELETE, `invoices/[id]/
   record-payment`/`send`, `invoices/public/[token]` GET/`checkout`). Every
   one already has an atomic CAS on its status-changing write, matching
   comments explicitly citing this session's own prior fixes as precedent.
   Nothing to fix there — prior sessions (this one included) already closed
   this surface out completely.
2. Pivoted to a fresh angle on the same underlying bug class: grepped for
   every other write-door onto `bookings.status`, since that's the column
   with the most doors found so far this session (the `[id]` PUT's own
   guard, the job-session PATCH bug fixed earlier this run, and now this
   one). **`PUT /api/bookings/batch-update` — genuine, previously-
   unaddressed bug, fixed.** Its `UPDATABLE_FIELDS` allow-list includes
   `status`, and unlike `PUT /api/bookings/[id]` (which explicitly blocks
   `status:'cancelled'` on a `completed`/`paid` booking, citing "no
   downstream reconciliation — payroll `team_pay`, referral commission
   clawback — anywhere in this codebase"), the batch route wrote `status`
   straight into `.update()` with zero equivalent check. Any
   `bookings.edit`-permitted caller could `PUT /api/bookings/batch-update`
   with `{updates:[{id, data:{status:'cancelled'}}]}` directly against a
   settled booking and it would silently succeed — bypassing the exact
   protection the single-booking door enforces, through a batch door that
   happens to share the same allow-list-by-field shape as the guarded route
   but never inherited the guard itself.
   - The only current UI caller (`BookingsAdmin.tsx`'s "edit recurring
     series" flow) never sends `status` in its batch payload (confirmed by
     grep — its `batchUpdates` object only carries
     `start_time`/`end_time`/`cleaner_id`/`price`/`hourly_rate`/
     `service_type`/`notes`/`recurring_type`), so this doesn't change any
     existing product behavior. It closes a door reachable by any
     authenticated caller hitting the API directly, same reasoning already
     applied to the deals/job-session/campaigns fixes earlier this session
     even where the current UI doesn't exploit the gap itself.
   - Fix mirrors `bookings/[id]` PUT's own two-layer guard: (a) an upfront
     batch-wide check — fetch current status for every id in the batch
     targeting `status:'cancelled'`, reject the whole batch with 400 and the
     list of offending ids if any of them is already `completed`/`paid`
     (fail-closed on the whole batch rather than partially applying); (b) an
     atomic CAS (`.not('status','in','(completed,paid)')`) on the per-row
     write itself, closing the race window between that upfront read and the
     write landing (a concurrent completion/payout finishing mid-batch).
   - Checked the three sibling "cancel bookings under a schedule" doors for
     the same shape (`admin/recurring-schedules/[id]/pause`,
     `schedules/[id]/pause`, `schedules/[id]` DELETE) — all three are already
     safe by construction: each whitelists
     `.in('status', ['scheduled','pending'(,'confirmed')])` on the cancel
     write rather than blacklisting, so they structurally never touch a
     `completed`/`paid` row regardless of a guard existing. Nothing to fix
     there.
   - Checked `bookings/route.ts` (create) and `admin/bookings/route.ts` for
     the same `status:'cancelled'` write shape — neither writes it (the only
     hits were read-side filters/counts). Not applicable.

## Verification

- New test `route.status-regression-guard.test.ts` (5 tests: blocks
  cancelling a completed booking, blocks cancelling a paid booking, blocks
  the whole batch when any one row in a multi-row batch is settled
  (fail-closed, not partial), allows cancelling a still-open scheduled
  booking, allows a non-status note edit on a completed booking). RED
  confirmed pre-fix via `git diff` + `git apply -R` on `route.ts` alone (3/5
  failing — the two single-row blocks plus the mixed-batch block, all
  returning 200 instead of 400); GREEN confirmed post-fix.
- Extended the existing hand-rolled Supabase mock in the new test file only
  (not the pre-existing `route.client-scope.test.ts`, left untouched) with
  `.not()` and `.maybeSingle()` support — same "additive mock gap" pattern
  hit repeatedly this session.
- `npx vitest run "src/app/api/bookings/batch-update/"` — 2 files / 9 tests
  pass (5 new + 4 pre-existing client-scope tests, unaffected).
- `npx vitest run "src/app/api/bookings/" "src/lib/booking-delete-guard"` —
  29 files / 110 tests pass (broader blast-radius check).
- `npx tsc --noEmit` — no new errors (same 2 pre-existing baseline errors in
  `sunnyside-clean-nyc/_lib/site-nav.ts` only, unchanged from every prior
  checkpoint this session).
- Full suite: running in background at write time — see next report for
  result.
- 1 commit (pending suite confirmation).

## Aging items

No new aging items opened this pass. Full inventory unchanged from the 0528
checkpoint (see that file) — one addition worth noting for the *next*
session: with `bookings.status` writes now checked end-to-end (single PUT,
job-session PATCH, batch-update PUT, all three schedule-pause/cancel doors),
this particular column's write-surface appears fully swept.

## Next-target candidates if continuing fresh-ground hunting

- The "does every write-door on a column share its sibling's guard" pattern
  has now been run against `bookings.status`, `deals.stage`-adjacent
  financial fields, and `invoices`/`quotes.status` — all three closed out.
  Worth picking a different frequently-multi-doored column next:
  `team_members.pay_rate`/`hourly_rate` (checked once already this session
  for the delete-guard shape specifically, but not for a general
  "does every write door apply the same forward-only/reconciliation
  constraint" sweep), or `payments.status` / `team_member_payouts` (payout
  ledger rows — worth confirming there's exactly one write door and not a
  second one that bypasses whatever idempotency/reconciliation guard the
  primary one has).
- Alternatively, revisit the still-open footguns on the running aging list
  (`admin/prospects/[id]` re-approve, `campaigns/send/route.ts` dead code)
  if Jeff confirms either is worth a fix/removal.

No push/deploy/DB this pass.

# W4 session report — 22:23 queue

LEADER order: (1) continue cross-archetype HR/payroll/finance depth. (2)
continue fresh-ground hunting. (3) keep gap/fluidity current. File-only, no
push/deploy/DB.

## (1) Archetype depth — reassign/release had no terminal-state guard

Traced from last session's `team_paid`/`team_member_paid` double-pay-door
finding: this session's target was where else a booking's payroll-relevant
fields (`team_member_pay`, `team_member_paid`, `check_in_time`,
`check_out_time`, `actual_hours`) could get silently corrupted or
resurrected. Found two team-portal routes with the identical shape of gap
this session already fixed on the general booking PUT (terminal-cancel
guard) and hard-delete (booking-delete-guard): **no check on the booking's
current state before mutating it.**

`POST /api/team-portal/jobs/reassign` (a lead/manager moving a job to
another crew member) clears `check_in_time`/`check_out_time`/`actual_hours`
on the target booking and flips `status:'confirmed'` — but does this
**regardless of the booking's current status**, including `in_progress`
(already checked in), `completed`, or `paid`. It also never touches
`team_member_pay`/`team_member_paid`/`payment_status`. Concretely: reassign
a `completed` job (never started per the state machine — `PATCH /bookings/
[id]/status`'s own `VALID_TRANSITIONS` only allows `completed -> paid`,
never back into an active status) to a new member, then have that new
member actually check in/out and complete it for real — the checkout route
computes a fresh `team_member_pay` for them but does **not** touch
`team_member_paid`, which is still `true` from the PREVIOUS member's
completion. Payroll's pending-pay filter excludes anything already marked
paid, so the new member's real, freshly-completed job silently drops out of
payroll with no signal — unpaid labor that looks, to every downstream
report, like it was already settled.

`POST /api/team-portal/jobs/release` (a member handing their own job back
to the open pool) had the same shape: only checked ownership
(`team_member_id = auth.id`), never current status. A member could release
a job they'd already checked into (or completed) — the row goes back to
`status:'scheduled', team_member_id:null` (visible again in the open-job
pool for a DIFFERENT member to claim) while `check_in_time`/
`check_out_time`/`actual_hours`/`team_member_pay` from the real session
stay stamped on the row underneath.

Fixed both with the same pattern as the existing terminal-cancel guard:
reject the operation when `booking.status` isn't `scheduled`/`confirmed`
(400 on reassign's pre-check, 403 on release's — matches its existing
ownership-failure status code), plus `.in('status', ['scheduled',
'confirmed'])` on each route's own atomic UPDATE `WHERE` clause as a TOCTOU
guard against a check-in/checkout landing between the SELECT and the
UPDATE. 6 new tests (3 on reassign: completed/paid/in_progress all 400,
plus a TOCTOU-race 409 test; 3 on release: in_progress and completed both
403, existing happy-path/scoping tests updated for the new required
`status` field). Mutation-verified indirectly via the full suite (no
regressions on the existing 23 tests across both routes' files once the
mocks were updated to carry `status`). 23/23 pass across the 4 test files
in `team-portal/jobs/`.

## (2) Fresh ground — booking hard-delete guard missed unpaid AND
bulk-payroll-paid work entirely

Re-examined `checkBookingDeletable` (added earlier this session to block
hard-deleting a booking with real history) against the exact payroll paths
audited today. It checks 4 related tables: `ratings`,
`referral_commissions`, `payments`, `team_member_payouts`. Two gaps:

1. **A completed-but-not-yet-paid job is invisible to all four checks.** A
   crew member can check in, do the work, check out — the booking now
   carries real `check_in_time`/`check_out_time`/`actual_hours`/
   `team_member_pay` — and until payroll actually runs (which can be days
   later), there is zero row in any of the 4 checked tables. The booking is
   fully hard-deletable the whole time it's owed money.
2. **Bulk payroll's own payout path is invisible even after paying.** `POST
   /api/finance/payroll` (this session's earlier find) pays out by flipping
   the claimed bookings' own `status` to `'paid'` and inserting ONE
   lump-sum `payroll_payments` row per payroll run with **no `booking_id`
   column at all** — it's an aggregate across all claimed bookings, not a
   per-booking join. `team_member_payouts` (the table the guard checks) is
   a *different* table, written only by the separate per-booking
   cleaner-payout flow. So a booking paid via bulk payroll has no
   detectable trace in any of the 4 tables, ever.

Either way, hard-deleting the booking erases the only record the job
happened and pay is owed/was paid — worse than "no notification," it
destroys the evidence a wage dispute would need. This is directly
reachable: `BookingsAdmin.tsx`'s "Cancel booking" button (not "Delete",
which passes `?hard_delete=true` for an already-cancelled booking) hits
`DELETE /api/bookings/[id]` with no `hard_delete` flag — same route,
same guard.

Fixed by adding a 5th check directly on the booking's own row: block when
`status` is `completed`/`paid`, or `check_in_time` is set, or
`team_member_pay > 0`. 5 new tests: completed-with-no-related-rows blocks,
bulk-payroll-paid (`status:'paid'`) blocks, `in_progress` (checked in, not
yet completed) blocks, a genuinely untouched `scheduled` booking still
passes, and a same-id booking on a DIFFERENT tenant doesn't false-positive.
Mutation-verified: reverted the new booking-row check, all 3 of the
non-trivial new tests failed for the right reason (`expected true to be
false`), restored, all green. 53/53 across the guard's own test file plus
the full `bookings/` API suite.

## (3) Gap/fluidity report

**MISSING-FEATURE / STRUCTURAL GAPS (not fixed — flagging for leader/Jeff):**

1. **Carried, still open, re-verified relevant this session:** `team_pay`/
   `team_paid` (migration 009) vs `team_member_pay`/`team_member_paid`
   (migration 011) amount divergence — still a product call, not touched.
2. **Carried, still open:** `DELETE /api/deals/[id]` has no delete-guard —
   needs a product decision on what makes a deal "worth protecting,"
   mirrors the exact pattern just extended on bookings.
3. **Carried, still open:** two-going-on-three tenant-creation doors
   reimplement activation independently.
4. **Carried, still open:** `hr_document_reminders.document_id` NOT NULL
   constraint; `reviewed_by_name` migration drafted, not applied.
5. **Carried, still open:** `autoReplyReviews()` cron has no claim/lock —
   lower severity, external Google side effect only.
6. **Carried, still open:** referrer `total_earned`/`total_paid` atomic-bump
   RPC migrations are drafted (`2026_07_16_referrer_total_earned_atomic_
   bump_PROPOSED.sql`, `..._total_paid_...`) but **not wired into any call
   site** — confirmed this session via `grep -rn
   "referrer_bump_total_earned\|referrer_bump_total_paid"` across `src/` =
   0 hits. `team-portal/checkout/route.ts`'s referral-commission block
   still does the plain read-then-write on `total_earned` today. Blocked on
   the same DB-migration-approval step as every other PROPOSED file this
   session.
7. **New this session, lower priority — not fixed:** the payments-table
   dedup index (`2026_07_13_payments_reference_dedup_PROPOSED.sql`, an
   earlier session's find) is also still unapplied — confirmed via `find`
   that only the `.sql` file exists, no live unique index. Until it lands,
   `processPayment()`'s reference_id idempotency is purely
   application-level (the 23505-catch code path is dead code in prod right
   now since nothing can ever throw 23505 without the index). Concretely
   amplifies today's reassign fix: even a NON-concurrent, single-actor
   resurrection-then-recheckout of a booking would have produced a second
   real payment/payout/ledger post for the same job, not just the
   documented double-tap/retry race — reassign closing the resurrection
   path removes the easiest way to reach it via normal staff action, but
   the underlying missing constraint is a DB change outside worker scope.

**UX-FRICTION:**
1. (Carried) The client/team-member/booking hard-delete 409s don't offer an
   inline "cancel/set inactive instead?" action.
2. (Carried, still open) HR onboarding badge/handoff gap and finance
   period-lock enforcement gap — block-vs-override policy isn't a worker's
   call.

## Verification

- `npx tsc --noEmit`: same 3 pre-existing baseline errors
  (`bookings/broadcast/route.xss.test.ts`, `sunnyside-clean-nyc/_lib/
  site-nav.ts` ×2), confirmed present before this session's changes too.
  Zero new errors.
- `npx vitest run` on `src/lib`, `src/app/api/bookings`, `src/app/api/
  finance`, `src/app/api/team-portal`, `src/app/api/team`: 158 files, 920
  passed + 1 pre-existing skip, zero regressions.
- Mutation-verified both fixes (reverted, confirmed the new tests fail for
  the right reason, restored).
- Commits: `466ec8e1` (reassign/release terminal-state guard), `cfb3698b`
  (booking-delete-guard: completed/paid-but-unpaid + bulk-payroll gap).
- File-only session: no push, no deploy, no prod DB writes.

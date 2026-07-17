# W4 session report — 00:07 queue (fresh 3-deep order)

File-only, no push/deploy/DB. 2 commits on p1-w4 (pending).

## (1)+(2) HR/payroll/finance depth + fresh ground (same finding covers both)

**The main dashboard's "Bookings" tab (`BookingsAdmin.tsx`, the actual
`/dashboard/bookings` admin UI, not a tenant clone) has never persisted a
single dollar of cleaner pay or paid-status through its own edit modal or
closeout toggle — since the day those fields were added.**

Root cause: the component tracks pay as `cleaner_pay`/`cleaner_paid`/
`cleaner_paid_at` in its `Booking` type, `form`, and every PUT body it sends
to `/api/bookings/{id}`. None of those are real `bookings` columns — grepped
every migration file, zero hits. The real columns are `team_pay`/`team_paid`
(migration 009, orphaned/display-only elsewhere) and `team_member_pay`/
`team_member_paid` (migration 011, the columns every finance/payroll report
actually sums: payroll-prep, payroll, pnl, cleaner-income, tax-export,
summary). `pick()` on the PUT route silently drops any field not on its
allowlist — no error, 200 response — so:

- The "Team Pay $" input and "Team Paid" dropdown in the edit modal (labelled
  correctly in the UI, wired to the wrong field internally) never saved,
  ever.
- "Confirm Check Out" / the inline checkout Save button compute a real pay
  amount from actual hours × rate and PUT it as `cleaner_pay` — silently
  dropped every time.
- The closeout list's "Team Paid" toggle (`handleCloseOutUpdate`) — the
  button literally labelled "Team Paid" — flips local optimistic state only;
  the server never received anything it recognized, so a refresh reverts it
  and the job stays in "needs closeout" forever, even after real payment via
  a different path (Stripe auto-payout, team-portal self-checkout) that
  *did* set the real columns — meaning admins have likely been trusting a
  checkbox that never wrote to the database.

Verified no alternate path picks these fields up (unlike `cleaner_id` in the
same form, which is inert on this route but correctly re-routed to
`team_member_id` via a separate `PUT /api/bookings/{id}/team` call every save
makes — `cleaner_pay`/`cleaner_paid` have no such secondary path).

Fixed:
- Renamed `cleaner_pay`→`team_member_pay`, `cleaner_paid`→`team_member_paid`,
  `cleaner_paid_at`→`team_member_paid_at` throughout `BookingsAdmin.tsx`
  (type, form/createForm state, `openEdit`, both checkout handlers, both
  inline inputs, the closeout toggle, the closeOutJobs/recentlyClosedJobs
  filters — the last of these was a bonus fix: it now actually excludes jobs
  paid via Stripe/team-portal instead of showing every completed+paid job as
  needing closeout forever).
- Added `team_member_pay`/`team_member_paid` to `PUT /api/bookings/[id]`'s
  `pick()` allowlist so they actually reach the database.
- Flipping `team_member_paid` true now stamps `team_member_paid_at` (every
  other paid-flag flip in this codebase does; finance/summary's
  recent-payouts query filters/sorts on it).
- Flipping `team_member_paid` false is now blocked with 409 if a real
  `team_member_payouts` row already exists for the booking — same
  double-pay door already closed on bulk payroll's claim query (commit
  908b2d4c): without this, an accidental un-toggle of the (now-functional)
  checkbox would re-open an already-paid job to be claimed and paid a second
  time by the next payroll run.
- Closed a second, previously-known-but-unfixed half of this same bug class:
  `PATCH /api/bookings/[id]/payment` (the OTHER admin pay-entry surface,
  `dashboard/bookings/[id]/page.tsx`'s detail page) already mirrored
  `team_paid`→`team_member_paid` (a prior session's fix) but never mirrored
  the AMOUNT — `team_pay` only ever wrote the orphaned legacy column, never
  `team_member_pay`. This was the carried "team_pay/team_member_pay amount
  divergence" gap from earlier reports; now mirrored, closing it for real.

9 new/extended tests across 2 files (4 new in
`route.team-member-pay-fields.test.ts`, 2 new in the existing
`payment/route.team-member-paid-sync.test.ts`), mutation-verified: reverted
both route diffs via patch, confirmed all 5 new/changed assertions fail for
the right reason (wrong values / wrong status codes), reapplied, confirmed
green.

Left alone (separate, narrower bug, same root-cause family — flagging, not
fixing, to keep this diff reviewable): `createForm.cleaner_pay_rate` sent at
booking-creation time to `POST /api/bookings` (emergency-booking path) and
`POST /api/admin/recurring-schedules` — the former's `validate()` schema
doesn't include `price`/`hourly_rate`/`cleaner_pay_rate`/`max_hours` either,
so emergency bookings created through that one path may save with no price/
rate on file. Narrower blast radius (emergency-booking creation only; the
normal multi-date path goes through `/api/bookings/batch`, which handles
these fields correctly) — worth a follow-up pass.

## (3) Gap/fluidity — re-verified

- `activate-tenant.ts` tenant-creation-door fragmentation — unchanged
  (4 call sites still exist).
- `reviewed_by_name` migration — re-confirmed via `ls migrations/`: still
  only the `_PROPOSED.sql` file, unapplied.
- Referrer atomic-bump RPCs + payments dedup unique index — proposed,
  unapplied, awaiting Jeff's DDL approval.
- Cancel-button on bookings admin still hits hard-delete instead of the
  state-machine `PATCH /status` route — product call, not fixed.
- `DELETE /api/deals/[id]` "real deal" threshold — Jeff's call, not guessed.
- `hr_document_reminders.document_id` CASCADE — design gap unchanged.
- **team_pay/team_member_pay amount divergence — now FIXED this pass** (see
  above); removing from the carried list.
- New carried item (see "Left alone" above): emergency-booking creation
  field-drop in `POST /api/bookings`.
- All other previously-carried lower-priority items (auto-reply-reviews
  claim gap, bank-transactions/match expense-branch claim-release, documents
  finalizeDocument concurrent-finalizer race, team-portal/connect
  channel-creation race, finance/pnl raw-source + summary labor/job-count
  stragglers) — unchanged, not re-derived this pass.

## Verification

tsc clean (same 3 pre-existing baseline errors — none in touched files).
Full suite: 1838/1841 pass, 1 pre-existing self-labeled "RED until fixed"
placeholder test in an unrelated file
(`cron/tenant-health/status-coverage-divergence.test.ts`, not touched this
session), 1 skipped — no regressions. Targeted bookings/dashboard suites
(14 files, 48 tests) all green. File-only, no push/deploy/DB.

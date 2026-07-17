# W2 gap/fluidity refresh — 2026-07-16 23:01

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — this is a dated snapshot. Continues directly from `w2-schedules-guard-plus-terminated-worker-portal-access-2026-07-16-2231.md`.

## Archetype depth (closed the flagged portal-coverage gap)

The prior round flagged: "the P12 project-archetype harness (`sim-all-trades.ts`) never exercises the team-portal auth/claim/checkin/checkout surface at all." Closed the auth half:

- Added a real `POST /api/team-portal/auth` call (the actual route handler, not a mock) right after crew hire in P12 — proves the crew member logs in with their real PIN and resolves to the correct team member.
- Added a second real call to the same route inside the existing mid-project termination scenario — proves the just-terminated worker's PIN can no longer log in. This is the exact real-world case commit `2b96769b` fixed; it was previously covered only by unit tests, never by the archetype itself.
- `checkin`/`checkout` remain NOT covered by the archetype: both routes hard-block any booking dated in the future (`Cannot check in to a future booking`), and every P12 session is scheduled via positive `offsetDays` (future-only by design). Exercising those two routes for real would require backdating the whole project timeline, which isn't a small change — flagging this as the reason claim/checkin/checkout coverage is still open, not fixed here.
- Patched a real environment gap found along the way: `TEAM_PORTAL_SECRET` isn't set in this worktree's `.env.local`, and `token.ts` deliberately refuses to fall back to `SUPABASE_SERVICE_ROLE_KEY` (a real security guard against a leaked token acting as a signature oracle). The harness now sets a process-local random secret when unset, same isolation pattern already used for `RESEND_API_KEY`.

## Fresh-ground — a correction, not just a find

While getting the above running live (first time this archetype has actually been run against a live DB in this worktree — prior W2 sessions had no `.env.local`), two existing P12 checks failed on every run: `weather-delay: session actually moved` and the `double-booking (KNOWN GAP...)` check. Root-caused instead of shrugging them off as flaky:

**A real DB-level guard already exists and is live in prod** — `trg_block_booking_overlap` (`src/lib/migrations/015_booking_overlap_trigger.sql`, applied 2026-04-20 per commit `47ec885e`, months before any of this round's gap reports). It's a `BEFORE INSERT OR UPDATE OF team_member_id, start_time, end_time, status` trigger that rejects (SQLSTATE `23P01`) any write that would overlap an existing active booking for the same `team_member_id` in the same tenant — regardless of which route or code path performs the write.

This means:
- The weather-delay test's flat "+2 days" reschedule was landing session 0 on top of the SAME job's own later session (same solo crew member across the whole project) and getting silently rejected — the `.update()` call didn't check its error, so the assertion just saw unchanged data and failed every time. **Fixed**: push the reschedule past the whole project's own session plan instead of a fixed offset, and assert the update itself doesn't error.
- The "double-booking KNOWN GAP" check had an **inverted assertion** — it expected the overlap insert to succeed (i.e., assumed no guard existed) and was failing because the trigger correctly blocks it. **Fixed** the assertion to match reality, and corrected the comment.

**Retracting gap #11** from the last two rounds' lists ("No scheduling-conflict guard anywhere in job session create/reassign — a crew member can be double-booked... with zero warning"). That was true only at the app-route layer (POST/PATCH `.../sessions` really don't check it themselves) but false as a product conclusion — the DB trigger catches every case regardless. It was misdiagnosed from reading route code alone, never verified against a live DB, until this round. This is a small mea culpa: I wrote that gap into the list two rounds ago.

**Gap #12 is unaffected, verified separately** — I initially assumed `POST /api/bookings/batch` (which I did find genuinely missing an hr_status check, see below) was in the same automated-cron path as gap #12's `generate-recurring` cron, which would have elevated its severity. Checked directly: `generate-recurring/route.ts` does its own direct `supabaseAdmin.from('bookings').insert(...)`, it does NOT call `/api/bookings/batch` (the string match in that file was just a code comment referencing the route name for an unrelated FK-poisoning note). Caught and corrected this before it went into the commit message. Gap #12 stands exactly as previously described — deliberately deferred, unaffected by today's fix.

## Fixed this round

1. **`POST /api/bookings/batch` never checked hr_status before batch-assigning `team_member_id`.** Same gap class as the already-fixed single-create paths (86b797ad, 53e83ee4, ca14a7fe, ff827f1d) — this route validated a `team_member_id` belongs to the tenant but never checked termination. Its only real caller is the dashboard "Create Booking" modal's multi-date path (`BookingsAdmin.tsx`'s `handleCreate`, non-recurring branch) — live, admin-triggered, up to 200 bookings per call. A terminated worker picked here got silently assigned to every date in the batch. Fixed with the same `getTerminatedTeamMemberIds` guard. 2 new tests, mutation-verified (`git apply -R`/`apply`). Commit `2a1bb9a8`.

## Verification

- tsc clean.
- Full vitest suite: 486 files, 2195 passed / 37 pre-existing skips, 0 regressions.
- P12 archetype run live (first time in this worktree) against all 3 scenarios individually (`SIM_ONLY=roofing|remodeling|interior_design`) — each passes with only the pre-existing, already-documented KNOWN-GAP/DRIFT failures (payroll_payments visibility #9/#10, `job_payments.invoice_id` #7, `payroll_payments.status` schema drift). No new failures introduced.

## MISSING-FEATURE GAPS (carried forward, corrected)

1. No per-job costing (expenses/payroll_payments still have no job_id).
2. No time tracking (hourly comp_type still unexercised anywhere).
3. No job-level materials/subcontractor cost capture (same root cause as #1).
4. No payroll batch/run concept.
5. Expense edit/delete ledger gaps — fully closed (prior rounds).
6. `GET /api/finance/payroll-prep`'s `?year=YYYY` 1099 mode is dead code (no frontend caller) and undercounts if invoked. Not fixed — product decision needed.
7. `job_payments.invoice_id` exists but nothing sets/reads it — Job detail page's "$X collected" is fully disconnected from the real invoice/payment/ledger rail. Not fixed — feature decision needed.
8. `recurring_expenses` has no manual "run now" / catch-up mechanism for missed periods — still open, deliberately not building it.
9. `GET /api/finance/payroll-prep` structurally blind to `payroll_payments` — HIGH priority (compliance-adjacent). Flagged to Jeff alongside #10.
10. No working UI writer for `payroll_payments` anywhere in the product — flagged to Jeff at the same priority as #9.
11. ~~No scheduling-conflict guard anywhere in job session create/reassign~~ — **RETRACTED.** A real DB trigger (`trg_block_booking_overlap`) already blocks this, confirmed live. Was misdiagnosed from app-route code alone in prior rounds; never actually verified against the DB until this round.
12. Recurring-schedule assignment (`admin/recurring-schedules*` + the `generate-recurring` cron) has no terminated-crew check — carried forward, deliberately deferred (admin-configured, lower frequency). Confirmed this round that `generate-recurring`'s actual booking writes are direct DB inserts, not routed through `/api/bookings/batch` — today's batch fix does NOT touch this gap. `PUT /api/client/preferred-cleaner` also still has no terminated check (lower severity — a stale preference, not a direct assignment).

## UX-FRICTION (carried forward, unchanged)

1. Change orders have no dedicated feature (manual total-bump + job_payments insert workaround, no structural link).
2. Cancellation kill-fees are ad hoc math, no stored policy field, no audit trail for the %.
3. "Ops Admin" and "Performance" tabs on the Team page (same dead-tab pattern as "Payroll") — confirmed genuinely unbuilt, carried forward as-is.

# W2 gap/fluidity refresh — 2026-07-17 02:03

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-find-cleaner-broadcast-terminated-crew-gap-2026-07-17-0154.md`.

## Fresh ground (real bug) — bookings/broadcast mass-SMS never checked HR termination, and has no preview step at all

Continued the same sweep methodology (diff every route referencing `team_member_id`/`cleaner_id` against every route already calling `getTerminatedTeamMemberIds`). Most remaining candidates were noise (reads, cron jobs, portal self-service reads) or already covered: `crews/route.ts` POST/PATCH lets an admin add a terminated worker to a crew's roster with no guard, but that's a genuine non-issue — every consumer (`jobs/[id]/sessions` POST/PATCH) already expands `crew_id` into `booking_assignees` and re-checks `getTerminatedTeamMemberIds` at assignment time, with an explicit comment noting the roster "isn't pruned on termination." `team-portal/jobs/reassign` was already guarded (prior round). One real hit: `POST /api/bookings/broadcast`, `BookingsAdmin.tsx`'s "URGENT JOB AVAILABLE, first to claim gets it" mass SMS/email — a separate route from the find-cleaner picker, no shared code.

Same deliberate `team_members.status` vs `hr_employee_profiles.hr_status` split behind every guard in this lane: HR termination never touches `status`, so the query `team_members.status = 'active'` kept a fired worker in the recipient list forever. Worse than find-cleaner: this route has **no preview/confirm step at all** — it loops over the query result and sends the SMS ("$X/hr... First to claim gets it!") and HTML email directly, no intermediate picker a `cleaner_ids` re-check could even sit behind.

**Fixed**: query the active-status roster as before, then cross-reference `getTerminatedTeamMemberIds` and filter terminated ids out before the send loop — same pattern as every guard in this lane, applied at the only choke point this route has (there's no second re-check needed since there's no client-supplied id list to distrust; the whole recipient set is server-derived in one call).

3 new tests (`route.terminated-crew-guard.test.ts`: BLOCKED / CONTROL / MIXED, mirroring the find-cleaner send-route test shape). Had to add an `hr_employee_profiles` mock branch to the pre-existing `route.xss.test.ts` (it didn't anticipate the new query) — no assertions changed, purely a mock-completeness fix. Mutation-verified: reverting the guard line to `new Set<string>()` flipped 2 of the 3 new tests RED (BLOCKED and MIXED; CONTROL is guard-independent by design). tsc clean. Full suite: 508/508 files, 2264/2301 passed + 37 skipped, 0 regressions (exactly +3 over the prior round's 2261).

## Archetype depth — bookings-broadcast terminated-crew guard

Added `sim-all-trades.ts` section 5a-10 (after 5a-9, inside the existing crew-termination archetype block, gated on `helper?.id` like 5a-4/5a-6/5a-7/5a-8/5a-9). Drives `getTerminatedTeamMemberIds` against the real terminated worker (5a-2) and real active helper (5a-4) from this archetype tenant's own lifecycle, proving the fix live rather than only via the harness-mocked unit tests above.

**Not yet executed**: `sim-all-trades.ts` is leader-run-only (touches live prod Supabase; blocked by local hook for workers) — flagging for the leader to run and confirm the new checks pass. Verified statically: `tsc --noEmit` clean project-wide, section drives the exact guard function now live in the fixed route.

## NOTICED — not fixed, flagging for the leader/Jeff

1. `admin/docs/page.tsx` line 153 documents `POST /api/bookings/broadcast` as "Send broadcast to booking clients" — it actually broadcasts to team members about an urgent open job, not to clients. Pre-existing doc inaccuracy, unrelated to this round's fix, not touched (docs-only, outside this queue's file-only-but-code-scoped intent).
2. The terminated-crew sweep across `team_member_id`/`cleaner_id`-referencing routes is now close to exhausted — this round's fresh-ground search covered the remaining unguarded candidates (`crews`, `schedule-issues/fix`, `team-portal/jobs/claim`) and found them to be non-issues or already covered. Future rounds may need to widen the search pattern (e.g., other client-supplied-id-trusted-without-re-validation classes, not just this specific HR-termination guard) rather than re-running the same diff.

## MISSING-FEATURE GAPS (carried forward, unchanged)

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
11. ~~No scheduling-conflict guard~~ — RETRACTED (real DB trigger already blocks it).
12. ~~Recurring-schedule assignment has no terminated-crew check~~ — CLOSED (admin create/edit/exception, client-portal, staged-import, dispatch-route, batch-update, regenerate all closed).
13. The "Projects" feature (multi-day span bookings) has no real staffing, pricing, or stage-progression model past creation-with-`price:0`. Not fixed — needs a product call on the actual project-billing/staffing model before any code should be written.
14. ~~`service_type` free-text field may be silently unset/stale on admin-created and admin-edited bookings~~ — CLOSED (prior round).
15. ~~`recurring_type` free-text field may go stale on legacy schedule_id-less recurring bookings~~ — VERIFIED NON-ISSUE (prior round): zero live scheduled bookings match the at-risk shape.
16. ~~Mass-SMS find-cleaner broadcast had no HR-termination check~~ — CLOSED (prior round).
17. ~~`bookings/broadcast`'s "URGENT JOB AVAILABLE" mass SMS/email had no HR-termination check~~ — CLOSED this round (see above).

## UX-FRICTION (carried forward, unchanged)

1. Change orders have no dedicated feature (manual total-bump + job_payments insert workaround, no structural link).
2. Cancellation kill-fees are ad hoc math, no stored policy field, no audit trail for the %.
3. "Ops Admin" and "Performance" tabs on the Team page (same dead-tab pattern as "Payroll") — confirmed genuinely unbuilt, carried forward as-is.
4. `GET /api/client/preferred-cleaner`'s `familiar_cleaners` list surfaces terminated former cleaners by name with no indication they no longer work there (write-time blocked both sides now, but the list itself still doesn't say so).

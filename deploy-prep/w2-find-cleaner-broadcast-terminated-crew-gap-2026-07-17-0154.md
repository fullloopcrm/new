# W2 gap/fluidity refresh — 2026-07-17 01:54

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-regenerate-terminated-crew-gap-plus-recurring-type-census-2026-07-17-0148.md`.

## Fresh ground (real bug) — find-cleaner mass-SMS broadcast never checked HR termination

Went looking for un-guarded assignment-adjacent surfaces by diffing every route that references `team_member_id`/`cleaner_id` against every route that already calls `getTerminatedTeamMemberIds`. Most of the gap was noise (reads, cron jobs, unrelated finance/portal routes) or already covered indirectly (`routes/auto-build` derives `team_member_id` from bookings that are themselves guarded at assignment time, and `routes/[id]/publish` already re-checks `hr_status` before it would ever text a terminated driver — confirmed both are non-issues, not fixing). One real hit: `admin/find-cleaner/preview` + `admin/find-cleaner/send`, the "we're short a body for tomorrow" mass-SMS broadcast flow.

`preview`'s eligibility query only filtered `team_members.status = 'active'` — but this codebase has a *deliberate, repeatedly-documented* split (identical comment in `team-portal-auth.ts`, `smart-schedule.ts`, `client/recurring`, `client/reschedule/[id]`, `cron/generate-recurring`, this lane's own prior rounds): **HR termination never touches `team_members.status`/`active`**, only `hr_employee_profiles.hr_status`. A fired worker's row sits at `status:'active'` forever unless something else changes it. So a terminated crew member showed up "eligible" in the broadcast picker, and `send` — which had zero HR-status check of any kind, not even the weaker `status` filter `preview` had — would actually text them: *"Available [date] [time]? Reply YES if available."* Outbound solicitation to a fired employee asking about a paid shift, not just a passive list-exposure issue (contrast with the already-tracked UX-friction #4, `familiar_cleaners`, which is read-only display).

**Fixed**: `preview` now cross-references `getTerminatedTeamMemberIds` and excludes with reason `"No longer employed"` (same `reasons_excluded` pattern as every other exclusion it already computes). `send` re-checks the same set at actual SMS-send time and drops matching ids from `recipients` alongside the existing phone/TEST_MODE filters — `cleaner_ids` is client-supplied, so trusting `preview`'s picker alone isn't a real gate; this mirrors `routes/[id]/publish` re-checking `hr_status` even though `routes` POST already checked it at creation time.

5 new tests (`preview/route.terminated-crew-guard.test.ts`: 2, `send/route.terminated-crew-guard.test.ts`: 3 incl. a mixed terminated+active batch proving the terminated id is silently dropped while the active one still gets texted and the broadcast still gets created). Mutation-verified: disabling the new `send`-route filter line flipped 2 of the 3 new send-route tests RED. tsc clean. Full suite: 507/507 files, 2261/2298 passed + 37 skipped, 0 regressions.

## Archetype depth — find-cleaner broadcast terminated-crew guard

Added `sim-all-trades.ts` section 5a-9 (after 5a-8, inside the existing crew-termination archetype block, gated on `helper?.id` like 5a-4/5a-5/5a-7/5a-8). Drives `getTerminatedTeamMemberIds` — the same guard function both fixed routes now call — against the real terminated worker (5a-2) and the real active helper (5a-4) from this archetype tenant's own lifecycle, proving the fix live rather than only via the harness-mocked unit tests above.

**Not yet executed**: `sim-all-trades.ts` is leader-run-only (touches live prod Supabase; blocked by local hook for workers) — flagging for the leader to run and confirm the new checks pass. Verified statically: `tsc --noEmit` clean project-wide, section drives the exact guard function now live in both fixed routes.

## NOTICED — not fixed, flagging for the leader/Jeff

1. Nothing new this round.

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
16. ~~Mass-SMS find-cleaner broadcast had no HR-termination check~~ — CLOSED this round (see above).

## UX-FRICTION (carried forward, unchanged)

1. Change orders have no dedicated feature (manual total-bump + job_payments insert workaround, no structural link).
2. Cancellation kill-fees are ad hoc math, no stored policy field, no audit trail for the %.
3. "Ops Admin" and "Performance" tabs on the Team page (same dead-tab pattern as "Payroll") — confirmed genuinely unbuilt, carried forward as-is.
4. `GET /api/client/preferred-cleaner`'s `familiar_cleaners` list surfaces terminated former cleaners by name with no indication they no longer work there (write-time blocked both sides now, but the list itself still doesn't say so).

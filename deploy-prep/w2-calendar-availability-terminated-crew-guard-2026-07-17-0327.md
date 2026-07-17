# W2 gap/fluidity refresh — 2026-07-17 03:27

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-client-reschedule-stale-assignment-notify-guard-2026-07-17-0315.md`.

## Fresh ground (real bug) — terminated-crew bug class, chasing the "UI direct-read" angle last round's NOTICED flagged as unswept

Last round's NOTICED framed the open angle as a display question: "dashboard/calendar views rendering a booking's assigned lead... haven't been audited for whether they visually flag a terminated assignee vs. silently showing them as current crew." Chased it and found it's not display-only — it's a write-adjacent availability gap.

`CalendarBoard.tsx`'s reassignment panel (the "Assign Team Member" / "Reassign Team Member" UI on `/dashboard/calendar`) sources its member list from `GET /api/team-availability`, which resolves through `checkTeamAvailability()` in `src/lib/availability.ts`. `/api/admin/team-availability-batch` resolves through the exact same function. That function filtered `team_members` on `.eq('status', 'active')` only — but HR termination never touches `team_members.status/active` (deliberate; `hr_status` lives on `hr_employee_profiles` instead, per `hr.ts`'s own doc comment). So an admin opening the reassignment panel for ANY booking would see an already-terminated worker listed **"Available"** and pickable, with zero indication they no longer work there.

This is the identical bug class `scoreTeamForBooking()` (`src/lib/smart-schedule.ts`) already had fixed for **its** four callers (admin/client smart-schedule, client/book auto-suggest, generate-recurring's smart-assign) — that function's own comment says "Fixed once here so every caller inherits it instead of re-implementing the check per route." `checkTeamAvailability` is a sibling function in a different file that never got the same fix — a gap between two near-identical availability-scoring functions, not a new bug pattern.

Note this is *not* a data-integrity bug: `PUT /api/bookings/[id]` already runs `getTerminatedTeamMemberIds` on any caller-supplied `team_member_id` and rejects with a 400 before the write lands (closed in an earlier round). So no booking could actually end up reassigned to a terminated worker through this path — but the admin would see the terminated worker as a normal, "Available" option, could select them, click Confirm/Reassign, and get a generic "Failed to assign team member" (the client only special-cases `409`, not this route's `400`) instead of ever being told why. Real bug (an availability-scoring function omitting an established guard its sibling already carries), just a UX-severity blast radius rather than a data-corruption one.

**Fixed**: `checkTeamAvailability` now excludes `getTerminatedTeamMemberIds` up front — before the day-off/schedule and booking-conflict checks — surfaced as `available: false, conflict: 'No longer employed'`, the exact same reason string `scoreTeamForBooking` already uses for its own terminated-member case. Both callers (`/api/team-availability`, `/api/admin/team-availability-batch`) inherit the fix from the one shared function, same "fix once, every caller inherits" shape as the smart-schedule precedent.

Also checked the calendar's read-only display surfaces (the actual literal "UI direct-read" case last round's NOTICED described): `GET /api/bookings`, `GET /api/schedule/calendar`, and `GET /api/admin/calendar` all select `team_members(name, ...)` with no `status`/`hr_status` field at all, so `CalendarBoard.tsx`/`TimelineView.tsx`/`KanbanView.tsx` structurally cannot flag an already-assigned terminated crew member even if they wanted to — there's no data in the payload to flag with. That's a genuine finding but a pure display/cosmetic one (same class as the already-flagged SMS-reminder-names-terminated-crew and `preferred-cleaner`-list items in UX-FRICTION below) — not fixed, added to UX-FRICTION rather than built, consistent with gap #20 staying with Jeff (surfacing/unassigning terminated workers' *existing* stale assignments is the open policy question; this round's fix is about the *reassignment* affordance offering a terminated worker as a fresh pick, a materially different and narrower question that didn't need Jeff's call).

1 new test file, 3 tests (BLOCKED: a terminated member is listed unavailable with a clear reason, not silently offered; CONTROL: an active member still lists normally available; WRONG-TENANT PROBE: a same-id member terminated only in another tenant is not blocked here). Mutation-verified via `git apply -R`/`git apply` (fixed file reverted → the BLOCKED assertion went RED — `expected true to be false`, reproducing the exact bug — restored, all green). tsc clean. Full suite: 516/516 files (up from 515 — this round's new file), 2285/2322 passed + 37 skipped (up from 2281/2319 + 37 skipped last round — exactly +3, no regressions, no flaky finance-export repeat this run).

## Archetype depth — checkTeamAvailability terminated-crew guard on the calendar reassignment picker

Added `sim-all-trades.ts` section 5a-16 (after 5a-15, same archetype block). Calls the real fixed `checkTeamAvailability(tenant.id, date, '09:00', 2)` directly (not the route — `requirePermission` needs request context this harness doesn't have, same reasoning as every other guard-function call in this block) against the same real terminated worker (5a-2) and active helper rows 5a-13/14/15 already established, since both are still `team_members.status='active'` (only `hr_status` flipped) — the exact set `checkTeamAvailability`'s `.eq('status','active')` query returns. Asserts the terminated worker comes back `available:false, conflict:'No longer employed'`, and the active helper is never flagged with that specific reason (a CONTROL, not a strict `available:true`, since the helper could independently be day-off/conflicted for unrelated reasons — the guard under test is the termination check specifically).

**Not yet executed**: leader-run-only (touches live prod Supabase). Verified statically: `tsc --noEmit` clean project-wide.

## NOTICED — not fixed, flagging for the leader/Jeff

1. Carried forward, unchanged: `POST /api/reviews/request` has zero SMS-consent check (gap #18) — product-classification call, still open.
2. Carried forward, unchanged: retroactive-repair-of-already-drifted-`monthly_date`-prod-data question (gap #19's NOTICED) — needs a live-DB audit, not guessed at.
3. Carried forward, unchanged: gap #20's root cause (nothing unassigns/surfaces a terminated worker's existing future bookings) is still open. This round's fix doesn't touch it either — it closes a *reassignment-picker* gap (offering a terminated worker as a fresh pick), not the *existing-stale-assignment-display* gap. Staying with Jeff per the leader's explicit instruction not to build either unassign-vs-alert option unilaterally.
4. Carried forward, unchanged: the client-facing 2-hour SMS reminder still names a terminated crew member by first name (cosmetic, not fixed, same root cause as #3).
5. **New this round**: confirmed and precisely scoped last round's speculative UI-display finding — `GET /api/bookings`, `/api/schedule/calendar`, and `/api/admin/calendar` all omit `team_members.status`/`hr_status` from their select entirely, so `CalendarBoard.tsx`, `TimelineView.tsx`, `KanbanView.tsx`, and the bookings list tab have no data available to flag an already-assigned terminated crew member even cosmetically. Added to UX-FRICTION below rather than built — same class as the already-carried-forward SMS-reminder and `preferred-cleaner` items, and touches the same #20 policy territory Jeff hasn't ruled on.
6. **New this round**: the terminated-crew guard hunt across this bug class (admin-triggered new-assignment writes, automated cron reads, one client-portal write-then-notify path, and now one availability-scoring function) now looks exhausted for *scheduling/notification* surfaces. What's left standing is exclusively the display-layer gap (#5 above) and the #20 policy decision — no more write-path candidates surfaced this round despite a deliberate look.

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
17. ~~`bookings/broadcast`'s "URGENT JOB AVAILABLE" mass SMS/email had no HR-termination check~~ — CLOSED (prior round).
18. `POST /api/reviews/request` has no SMS-consent check (see prior round's NOTICED #1) — open, product call needed on transactional-vs-marketing classification.
19. ~~`generateRecurringDates()`'s `monthly_date` branch permanently drifted a day-29/30/31 anchor off a short-month crossing~~ — CLOSED (prior round). Retroactive-repair-of-already-drifted-prod-data question still open — see NOTICED #2.
20. **No unassignment/surfacing of a terminated worker's existing future bookings/recurring schedules** — open, needs Jeff's call on block-and-alert vs auto-unassign. This round's `checkTeamAvailability` fix is adjacent but distinct (closes the *reassignment-picker offering a terminated worker* gap, not the *existing-stale-assignment display/unassign* gap) — see NOTICED #3/#5.

## UX-FRICTION (carried forward + 1 new)

1. Change orders have no dedicated feature (manual total-bump + job_payments insert workaround, no structural link).
2. Cancellation kill-fees are ad hoc math, no stored policy field, no audit trail for the %.
3. "Ops Admin" and "Performance" tabs on the Team page (same dead-tab pattern as "Payroll") — confirmed genuinely unbuilt, carried forward as-is.
4. `GET /api/client/preferred-cleaner`'s `familiar_cleaners` list surfaces terminated former cleaners by name with no indication they no longer work there (write-time blocked both sides now, but the list itself still doesn't say so).
5. **New**: calendar/dashboard/bookings-list views (`CalendarBoard.tsx`, `TimelineView.tsx`, `KanbanView.tsx`, bookings list tab) have no way to visually flag an already-assigned terminated crew member on an existing booking — the backing `GET /api/bookings`, `/api/schedule/calendar`, `/api/admin/calendar` selects never fetch `team_members.status`/`hr_status` in the first place. Same root cause and same "flag, don't fix without Jeff's call" treatment as item #4 above and gap #20.

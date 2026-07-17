# W2 gap/fluidity refresh — 2026-07-17 02:52

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-recurring-monthly-date-drift-2026-07-17-0229.md`.

## Fresh ground (real bug) — back to the terminated-crew bug class, but via a NEW trigger: an automated cron reading a stale pre-termination assignment, not an admin-triggered NEW-assignment write

Every terminated-crew guard fixed earlier this session (recurring-schedule create/edit/exception, client-portal, staged-import, dispatch-route, batch-update, regenerate, find-cleaner broadcast, `bookings/broadcast`) blocks a **new** write that would assign an already-terminated worker going forward. None of them touch `bookings.team_member_id` on bookings that were assigned **before** the termination — `PATCH /api/dashboard/hr/[id]` (HR termination) only ever upserts `hr_employee_profiles.hr_status`; it never unassigns the worker's existing future bookings, and never touches `team_members.status` either (confirmed by reading the route — it writes exactly one table).

Widened the hunt to: what happens to a worker's *already-scheduled* future bookings after they're terminated? Two hourly/daily crons read `bookings.team_member_id` straight off the row and text/email/push whoever it points at, with zero `hr_status` check:

- **`cron/reminders`** (runs hourly): the day-before "Job Tomorrow" team text (routed through `notify()`, `recipientType: 'team_member'`) — including NYC Maid's full next-day-route text nested inside the same block — and the separate 2-hour-before "Job in N hours" text (a direct `sendSMS()` call, doesn't go through `notify()` at all).
- **`cron/daily-summary`** (runs at 8am): the 3-day job lookahead SMS/email/push. Its `team_members.select(...).eq('status','active')` filter looked like a guard but isn't one — `team_members.status` and `hr_employee_profiles.hr_status` are independent fields, and termination never touches the former, so a fired worker stays `status:'active'` and sails through the filter.

Net effect: a business fires someone with jobs still on the calendar (the realistic case — termination doesn't happen because the calendar is empty), and the fired worker keeps getting automated "you have a job tomorrow" / "job in 2 hours" / "here's your next 3 days" texts and emails for jobs they no longer work, indefinitely, until every one of those stale bookings is manually reassigned or passes.

**Fixed**: both crons now batch `getTerminatedTeamMemberIds` (existing `src/lib/hr.ts` helper, same one every other terminated-crew guard this session calls) once per query pass over the distinct `team_member_id`s just fetched — not per-booking, avoiding N+1 — and skip a terminated assignee's texts/emails/push. `cron/reminders`: one batch call for the day-based pass, one for the hour-based pass (each pass already re-fetches bookings fresh, so batching lines up naturally). `cron/daily-summary`: one batch call for the whole `team_members` roster before the per-member loop.

5 new tests (3 in 2 new dedicated files for `cron/reminders`, 1 in a new dedicated file for `cron/daily-summary`; the pre-existing `daily-summary/route.test.ts` untouched and still green). Mutation-verified via `git apply -R`/`git apply` (both fixed route files reverted together → all 3 new assertions across both new test files went RED reproducing the exact bug — terminated recipient present in the `notify()`/`sendSMS()` call list — restored, all green). tsc clean. Full suite: 512/512 files, 2276/2313 passed + 37 skipped, 0 regressions (exactly +3 over the prior round's 2310 baseline).

## Archetype depth — cron/reminders + cron/daily-summary terminated-crew stale-assignment guard

Added `sim-all-trades.ts` section 5a-13 (after 5a-12, same archetype block, `worker`/`helper`/`tenant`/`runId`/`supabase` all already in scope). Seeds a real future `bookings` row in the P12 archetype tenant still pointing at the already-terminated worker from 5a-2 — proving termination genuinely leaves the stale assignment in place, not an assumption — plus a CONTROL booking for the still-active helper, then drives the exact `getTerminatedTeamMemberIds` guard both fixed crons now call before texting a booking's assigned team member.

**Not driving the real route handlers**: both crons are `CRON_SECRET`-gated with no per-tenant scope — they loop every `status:'active'` tenant in the database and fire real Telnyx/Resend sends using each tenant's live keys. Calling the actual `GET` handlers from this shared multi-tenant harness would sweep every other live tenant's real crew/clients, not just the archetype tenant. Same class of constraint that's driven every `requirePermission`-gated guard mirror earlier in this block (no request context available) — here the constraint is different (no single-tenant scope + real side effects) but the resolution is the same: drive the exact guard function the fix now calls, against real seeded rows, not a reimplementation and not the route.

**Not yet executed**: `sim-all-trades.ts` is leader-run-only (touches live prod Supabase; blocked by local hook for workers) — flagging for the leader to run and confirm 5a-13's checks pass alongside 5a-12's. Verified statically: `tsc --noEmit` clean project-wide.

## NOTICED — not fixed, flagging for the leader/Jeff

1. Carried forward, unchanged: `POST /api/reviews/request` has zero SMS-consent check (gap #18) — product-classification call on transactional-vs-marketing, still open.
2. Carried forward, unchanged (gap #19's own NOTICED #3): if `monthly_date` recurring schedules already ran in prod with a day-29/30/31 anchor before last round's fix, some clients' actual generated bookings may already sit on a drifted day — needs a live-DB audit, not guessed at. Same "flagging not guessing" category as this round's item below.
3. **This round's actual root gap, only partially mitigated by the fix above**: nothing in the product unassigns a terminated worker from their existing future `bookings`/`recurring_schedules` at termination time, and nothing surfaces those stale assignments to the admin for manual reassignment. This round's fix stops the *automated cron texts* from reaching a terminated worker, but the underlying data problem — a fired employee still sitting as `bookings.team_member_id` on real future jobs — is untouched: those jobs still show the terminated worker as assigned on the calendar/dashboard, `bookings/[id]/team` GET would still return them as lead, and any code path that reads `team_member_id` without running it through `getTerminatedTeamMemberIds` (there is no guarantee every future read site does) could still treat them as the assigned crew. A real fix needs a product decision: does terminating someone (a) block-and-alert (surface an "N upcoming jobs still assigned to this terminated worker — reassign now" admin prompt, blocking nothing automatically) or (b) auto-unassign (silently clear `team_member_id`, which could leave jobs orphaned/unstaffed without anyone noticing)? Flagging for Jeff — this is a workflow decision, not a bug fix, and guessing wrong (especially auto-unassign) could make things worse.
4. Confirmed while investigating #3: the client-facing 2-hour SMS reminder (`cron/reminders`) names the assigned crew member by first name in the message body ("X arrives at...") using `booking.team_members.name` regardless of `hr_status` — a client could still be told a terminated worker is en route (the crew-facing text is now correctly suppressed by this round's fix, but the client-facing text that *mentions* them is a separate code path and wasn't touched). Same underlying-stale-assignment root cause as #3; not fixed this round — narrow, cosmetic-severity (the client isn't texted a job offer or paid, just told the wrong name), and folding it into #3's broader product decision seemed more honest than a one-off patch that doesn't address the actual data problem.

## MISSING-FEATURE GAPS (carried forward, unchanged except #20 new)

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
20. **No unassignment/surfacing of a terminated worker's existing future bookings/recurring schedules** — this round's automated-cron fix (see Fresh ground above) stops the *symptom* (stale terminated-worker texts), but the *cause* (nothing clears or flags `bookings.team_member_id` at termination time) is still open. Needs Jeff's call on block-and-alert vs. auto-unassign before any code should be written — see NOTICED #3.

## UX-FRICTION (carried forward, unchanged)

1. Change orders have no dedicated feature (manual total-bump + job_payments insert workaround, no structural link).
2. Cancellation kill-fees are ad hoc math, no stored policy field, no audit trail for the %.
3. "Ops Admin" and "Performance" tabs on the Team page (same dead-tab pattern as "Payroll") — confirmed genuinely unbuilt, carried forward as-is.
4. `GET /api/client/preferred-cleaner`'s `familiar_cleaners` list surfaces terminated former cleaners by name with no indication they no longer work there (write-time blocked both sides now, but the list itself still doesn't say so).

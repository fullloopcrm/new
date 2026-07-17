# W2 gap/fluidity refresh — 2026-07-17 00:55

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-project-span-truncation-plus-projects-feature-gap-2026-07-17-0040.md`.

## Fresh ground + project-archetype depth (combined) — dispatch routes never checked hr_status

Same gap class this lane has now closed on every other team_member_id assignment surface (booking create, recurring-schedule, client-portal, staged-import, multi-tech, job-session reassign) — the one surface still open was the route-optimizer dispatch feature: `POST /api/routes`, `PATCH /api/routes/[id]`, and `POST /api/routes/[id]/publish`. All three verified the `team_member_id` FK belonged to the tenant (a prior round's leak-prevention fix) but never checked `hr_status`. This one is a real PII-exposure path, not just a scheduling nicety: `publish` texts the assigned driver a full day's client names and addresses via the tenant's own Telnyx number, so a terminated worker could (a) be freshly assigned a dispatch route, (b) be reassigned onto an existing one, or (c) — worst case — sit on a route that was assigned to them *before* they were terminated and still get the day's stop list SMS'd to their personal phone the next time someone hit publish.

**Fixed**: all three routes now run the assignee through `getTerminatedTeamMemberIds` (`src/lib/hr.ts`, the same shared guard every other closed gap uses) right before their write/send. `publish` re-checks independently of create/patch specifically because a route can sit in `draft` for days after assignment — a termination that happens in that window isn't caught by the create-time guard alone, same reasoning as the team-portal token check (`af2ec97d`) not being satisfied by login-time revocation alone.

New tests: `routes/route.terminated-crew-guard.test.ts` (3), `routes/[id]/route.terminated-crew-guard.test.ts` (2), `routes/[id]/publish/route.terminated-crew-guard.test.ts` (2) — 7 total, each with a BLOCKED case (terminated worker, verifies no insert/update/SMS) and a CONTROL case (active replacement, verifies the write/send still happens). tsc clean. Full suite: 502/502 files, 2248/2248 passed + 37 skipped, 0 regressions from the 499/499, 2241/2241 + 37 baseline.

**Project-archetype depth**: added a new `5a-6` section to `sim-all-trades.ts`'s P12 project-archetype phase, driving the same three-surface guard (create/patch/publish) against this scenario's real terminated worker and freshly-provisioned replacement — including the stale-assignment case (a route inserted directly with the terminated worker's id, simulating one created before this fix shipped, then proving publish's own re-check still catches it). `requirePermission` needs `headers()/cookies()` this harness doesn't have, so — same reasoning as the existing 5a-3/5a-4 sections — this mirrors each route's own guarded write sequence directly rather than calling the HTTP handlers. tsc clean on the script. **Not live-run by me**: `sim-all-trades.ts` is leader-run-only (writes against live prod Supabase; a PreToolUse hook now blocks worker execution structurally after repeated prior-session violations). Leader: please run `SIM_ONLY=roofing` (or `remodeling`/`interior_design`) to confirm the new `dispatch-route:` checks pass live before this ships.

## NOTICED — not fixed, flagging for the leader/Jeff

Nothing new this round. Traced `routes/auto-build/route.ts` (the "build routes from today's bookings" bulk endpoint) while hunting this gap — it only groups bookings that already have a `team_member_id`, it never assigns one itself, so it inherits whatever guard already ran at booking-assignment time and isn't a fresh surface of its own. No action needed there.

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
12. ~~Recurring-schedule assignment has no terminated-crew check~~ — CLOSED (admin, client-portal, staged-import, and now dispatch-route paths all closed).
13. The "Projects" feature (multi-day span bookings) has no real staffing, pricing, or stage-progression model past creation-with-`price:0`. Not fixed — needs a product call on the actual project-billing/staffing model before any code should be written.

## UX-FRICTION (carried forward, unchanged)

1. Change orders have no dedicated feature (manual total-bump + job_payments insert workaround, no structural link).
2. Cancellation kill-fees are ad hoc math, no stored policy field, no audit trail for the %.
3. "Ops Admin" and "Performance" tabs on the Team page (same dead-tab pattern as "Payroll") — confirmed genuinely unbuilt, carried forward as-is.
4. `GET /api/client/preferred-cleaner`'s `familiar_cleaners` list surfaces terminated former cleaners by name with no indication they no longer work there (write-time blocked both sides now, but the list itself still doesn't say so).

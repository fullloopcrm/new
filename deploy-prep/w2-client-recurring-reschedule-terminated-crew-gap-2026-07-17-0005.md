# W2 gap/fluidity refresh — 2026-07-17 00:05

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — dated snapshot, continues directly from `w2-gap12-terminated-recurring-multitech-2026-07-16-2348.md`.

## Fresh ground — client-portal self-service routes never checked HR termination

Gap #12's closure last round fixed every *admin/operator* write path that assigns `team_member_id` and had no terminated-crew check (recurring-schedules, the `generate-recurring` cron, `scoreTeamForBooking`'s 4 callers, `preferred-cleaner`). This round went hunting on the *client-portal* side of the same surface — the two customer-facing routes that also accept a caller-supplied `team_member_id`/`cleaner_id` — and found the same root cause in both, previously undiscovered:

1. **`POST /api/client/recurring`** (HIGHEST severity of the two — same blast-radius class as the `generate-recurring` cron gap from last round). Client-initiated recurring-booking signup: validated `cleaner_id`/`extra_cleaner_ids` for tenant ownership only, never HR termination. This route raw-inserts directly via `supabaseAdmin` — `recurring_schedules.team_member_id`, 6 weeks of real `bookings.team_member_id` (`status:'scheduled'`), `booking_team_members` rows, AND `clients.preferred_team_member_id` — none of which go through `POST /api/bookings`, `PUT /api/bookings/[id]/team`, or `PUT /api/client/preferred-cleaner`, so none of those routes' own terminated-crew guards ever ran. A client picking a former cleaner they liked (the companion `GET /api/client/preferred-cleaner`'s `familiar_cleaners` list, itself not filtered by termination — noted below, not fixed) could hand them a brand-new STANDING weekly series, and re-open the exact `clients.preferred_team_member_id` +200 smart-schedule bonus that last round's `preferred-cleaner` PUT fix explicitly closed off — via this side door.
2. **`PUT /api/client/reschedule/[id]`**. Client-initiated reschedule of their own booking: validated a caller-supplied `team_member_id` for tenant ownership only, never HR termination. Raw `supabaseAdmin.update()`, bypassing `PUT /api/bookings/[id]`'s own terminated-crew guard entirely (same reasoning as #1 — that guard only runs on that specific route).

**Fixed**: both routes now also run the caller-supplied id(s) through `getTerminatedTeamMemberIds` (`src/lib/hr.ts`), right after the existing tenant-ownership check, rejecting the whole write with 400 — matching the established pattern from every prior fix in this family. 7 new tests across 2 files (2 wrong-tenant/cross-context probes: a same-id member terminated only in another tenant is not blocked; the existing cross-tenant `team_member_id` ownership probes in both routes' pre-existing isolation tests still pass unchanged). Mutation-verified via `git diff`/`apply` (not stash — stash is disabled in worker worktrees, shared `.git` dir across all 4 worktrees) on both fixes together: RED (3 failing assertions, 200 instead of 400) on revert, GREEN restored. tsc clean. Full suite 496/496 files, 2231/2231 passed + 37 skipped, 0 regressions from 494/494 2224+37 baseline.

**Not fixed (lower severity, flagged)**: `GET /api/client/preferred-cleaner`'s `familiar_cleaners` list (past-job team members) doesn't filter out terminated ones — a client could still see and select a fired cleaner's name from that list (blocked at write-time by both this round's fix and last round's `PUT` fix, just a UX/info surface, not a security gap). Not fixed this round — product-call whether the list should silently filter or show a "(no longer with us)" marker.

## Archetype depth

First-ever archetype coverage of a client-portal-token-authenticated route (`POST /api/client/recurring`) — every prior scenario only ever drove admin/operator routes (`requirePermission`-gated, needs `headers()`/`cookies()` this harness doesn't have, so those are mirrored rather than called directly) or team-portal routes (PIN/JWT via the raw `Request`). `client/recurring` authenticates off a portal Bearer token read straight off the raw `Request` object — no `next/headers` dependency — so it's directly callable here with a genuine minted token (`createToken` from `src/app/api/portal/auth/token.ts`; added a `PORTAL_SECRET` process-local fallback alongside the existing `TEAM_PORTAL_SECRET` one for the same reason). New sub-section (5a-5) appended to the existing crew-termination narrative (5a-2 through 5a-4): the scenario's own client attempts to start a new recurring series naming the worker terminated in 5a-2 as `cleaner_id` — blocked (real route, real 400), zero `recurring_schedules` row created for that worker; a CONTROL call with the 5a-4 replacement (an active crew member) succeeds. Confirmed by source-read that the repeat-client gate (≥1 completed booking for this client) is already satisfied by this point in the narrative — `createJobFromQuote` (`src/lib/jobs.ts`) stamps the SAME `clientId` onto both the `jobs` row and every session `bookings` row, and the first session was flipped to `status:'completed'` earlier in the weather-delay section (5a-1). Script not executed against DB (leader-run-only) — verified by direct source-read against the real route's write sequence and the repeat-client-gate dependency chain. Teardown: no new table added to the cleanup list needed — `recurring_schedules`, `bookings`, `booking_team_members`, `clients` were already in the tenant-scoped teardown loop from prior rounds.

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
12. ~~Recurring-schedule assignment has no terminated-crew check~~ — CLOSED (prior round; this round found and closed the client-portal side of the same root cause — see above).

## UX-FRICTION (carried forward, +1 this round)

1. Change orders have no dedicated feature (manual total-bump + job_payments insert workaround, no structural link).
2. Cancellation kill-fees are ad hoc math, no stored policy field, no audit trail for the %.
3. "Ops Admin" and "Performance" tabs on the Team page (same dead-tab pattern as "Payroll") — confirmed genuinely unbuilt, carried forward as-is.
4. `GET /api/client/preferred-cleaner`'s `familiar_cleaners` list surfaces terminated former cleaners by name with no indication they no longer work there (see above — write-time blocked, but the list itself doesn't say so).

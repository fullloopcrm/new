# W2 gap/fluidity refresh — 2026-07-17 01:48

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-batch-update-service-type-gap-plus-archetype-depth-2026-07-17-0126.md`.

## Fresh ground (real bug) — recurring-schedule regenerate never checked HR termination

Chased NOTICED #2 from the prior round's own gap-12 closure ("admin, client-portal, staged-import, dispatch-route, and batch-update paths all closed" — turned out that list was incomplete). `POST /api/admin/recurring-schedules/[id]/regenerate` is the atomic "edit recurring pattern" call `BookingsAdmin.tsx`'s `saveBooking()` makes when an admin changes BOTH a recurring series' pattern (day/frequency) and its assignee in the same "apply to all future bookings" save — replaces the old client-side delete-each/create-each loop with one server call that rewrites the schedule rule and hard-replaces every future booking in the series.

Every sibling recurring-schedule route already gates `team_member_id`/`cleaner_id` on `getTerminatedTeamMemberIds` (`POST /api/admin/recurring-schedules`, `PUT .../[id]`, `POST .../[id]/exception`) — this one only checked tenant ownership (a pre-existing cross-tenant FK guard, unrelated to HR status). Without the HR check, this specific path — pattern change + reassignment together — could silently put a just-terminated worker back on an entire regenerated series, both the schedule rule itself and every new booking row, bypassing every other guarded assignment surface in the product.

**Fixed**: added the same `getTerminatedTeamMemberIds` check as the sibling routes to `admin/recurring-schedules/[id]/regenerate/route.ts`, right after the existing tenant-ownership check, same error shape (`Cannot assign terminated team member: <id>`, 400).

New test file `route.terminated-crew-guard.test.ts` (3: blocked on `team_member_id`, blocked on the `cleaner_id` nycmaid alias, CONTROL — active member still regenerates the series and stamps every new booking). Ran alongside the existing `route.isolation.test.ts` (5, unchanged) — 8/8 pass. tsc clean. Full suite: 505/505 files, 2256/2293 passed + 37 skipped, 0 regressions.

## Fresh ground (verified non-issue) — `recurring_type` allowlist gap is dead legacy surface

Chased NOTICED #1 from the prior round (the other flagged item): `recurring_type` is sent by `BookingsAdmin.tsx`'s batch-update payload but missing from both `PUT /api/bookings/[id]`'s and `PUT /api/bookings/batch-update`'s field allowlists. Traced the one live-impact path: a **schedule_id-less legacy pattern-based recurring booking** whose repeat pattern is changed via "apply to all future bookings" would fall through to batch-update (which lacks `recurring_type` in `UPDATABLE_FIELDS`) instead of the schedule-backed `regenerate` route (which sets it correctly), leaving `recurring_type` stale on the series.

Ran a **read-only** live-DB census (`scripts/legacy-recurring-no-schedule-census.mjs`, SELECT/count only, no writes, same pattern as W-something's `rls-tier2-5-null-census.mjs`) before deciding whether to spend a fix on it: of 1472 bookings with `recurring_type` set, **zero** have `schedule_id IS NULL` and `status = 'scheduled'` — all 540 schedule_id-less recurring rows are historical (completed/cancelled). No live tenant currently has an active legacy-pattern recurring series that could hit this path. Closing as verified dead surface, not fixing — matches this round's `regenerate`-route finding in spirit (both trace back to the same "every recurring-assignment surface needs the same guards" theme) but this one needed no code change, just confirmation.

## Archetype depth — recurring-schedule regenerate pattern-change + terminated-crew guard

Added `sim-all-trades.ts` section 5a-8 (after 5a-7 batch-update), inside the existing crew-termination archetype block, gated on `helper?.id` like 5a-4/5a-5/5a-7. Seeds a fresh `recurring_schedules` row (mirrors what `POST /api/admin/recurring-schedules` produces), then mirrors the `regenerate` route's own guarded write sequence directly (same reasoning as every other section in this block — `requirePermission` needs `headers()`/`cookies()` this harness doesn't have). Checks:
1. A pattern-change + reassignment to the just-terminated worker is caught by the guard before the schedule rule or any regenerated booking is touched (rule stays on the original assignee).
2. CONTROL: the same pattern-change save, reassigned to the active helper instead, performs the real end-to-end write (rule update + new booking rows) and every new booking is stamped with the correct assignee.

**Not yet executed**: `sim-all-trades.ts` is leader-run-only (touches live prod Supabase; blocked by local hook for workers) — flagging for the leader to run and confirm the new checks pass. Verified statically: `tsc --noEmit` clean project-wide, section mirrors the exact guard code now live in the fixed route, and the write shape matches every sibling section's already-passing pattern (5a-3 through 5a-7).

## NOTICED — not fixed, flagging for the leader/Jeff

1. Nothing new this round beyond what's already tracked below.

## MISSING-FEATURE GAPS (carried forward, updated)

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
12. ~~Recurring-schedule assignment has no terminated-crew check~~ — CLOSED, now genuinely complete (admin create/edit/exception, client-portal, staged-import, dispatch-route, batch-update, AND regenerate all closed this round).
13. The "Projects" feature (multi-day span bookings) has no real staffing, pricing, or stage-progression model past creation-with-`price:0`. Not fixed — needs a product call on the actual project-billing/staffing model before any code should be written.
14. ~~`service_type` free-text field may be silently unset/stale on admin-created and admin-edited bookings~~ — CLOSED (prior round).
15. ~~`recurring_type` free-text field may go stale on legacy schedule_id-less recurring bookings~~ — VERIFIED NON-ISSUE this round (see above): zero live scheduled bookings match the at-risk shape. No fix needed; not reopening unless a future tenant migration reintroduces schedule_id-less recurring series.

## UX-FRICTION (carried forward, unchanged)

1. Change orders have no dedicated feature (manual total-bump + job_payments insert workaround, no structural link).
2. Cancellation kill-fees are ad hoc math, no stored policy field, no audit trail for the %.
3. "Ops Admin" and "Performance" tabs on the Team page (same dead-tab pattern as "Payroll") — confirmed genuinely unbuilt, carried forward as-is.
4. `GET /api/client/preferred-cleaner`'s `familiar_cleaners` list surfaces terminated former cleaners by name with no indication they no longer work there (write-time blocked both sides now, but the list itself still doesn't say so).

# W2 gap/fluidity refresh — 2026-07-16 23:28

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — this is a dated snapshot. Continues directly from `w2-claim-checkin-checkout-coverage-plus-release-reassign-guard-2026-07-16-2314.md`.

## Fresh ground — a real, live bug found and fixed (undermined an earlier "fixed" claim)

The 22:32-round fix (commit 2b96769b) claimed firing a worker via the HR page now fully revokes team-portal access, closing "fired workers kept claiming jobs/checking in-out/getting paid on their existing token." That fix touched exactly two things: `requirePortalPermission` (team-portal-auth.ts) and the PIN login route. Tracing every `verifyToken()` call site this round (while building the archetype checkin/checkout probe two rounds ago) found that claim was only half true.

**`verifyToken()`** (`team-portal/auth/token.ts`) re-checks tenant status on every call (already centralized, per an earlier fix), but never checked the member's own `team_members.status` or `hr_status`. That check only ever lived inside `requirePortalPermission`'s body. **~14 routes call `verifyToken()` directly and skip `requirePortalPermission` entirely** — including `checkin` and `checkout`, the two routes where it matters most: a fired or suspended worker's existing token (up to 24h life) could still check in, check out, and get paid, completely unaffected by 2b96769b's fix. Also exposed: `15min-alert`, `availability`, `config`, `connect`, `connect/unread`, `earnings`, `guidelines`, `jobs` (GET), `messages`, `notifications`, `preferences`, `video-upload` — lower-stakes than pay, but still portal access that should have died at termination and didn't.

**Fixed**: baked the same member-status/hr_status check into `verifyToken()` itself, mirroring the tenant-status check already there — closes the gap for every direct caller at once instead of requiring each route to remember to layer `requirePortalPermission` on top (the same reasoning already documented in that function's own comment for the tenant-status precedent, which apparently didn't get applied consistently the first time). `requirePortalPermission`'s own member/tenant checks are now redundant but harmless — same defense-in-depth pattern as its already-redundant tenant-status check.

9 new tests in `token.test.ts`: member-status gate (suspended/inactive rejected, active accepted), terminated-member gate (hr_status checked independently of team_members.status), ghost-member fails closed, and 2 WRONG-TENANT PROBEs proving the new lookups are scoped by `(tenant_id, id)` and not just member id (mirrors the existing tenant-status WRONG-TENANT PROBE pattern in the same file). Updated `connect/route.isolation.test.ts`'s seed — its `team_members` row had no `status`/`tenant_id` fields, which the new check exposed (4 pre-existing tests started failing until the seed was fixed to match reality; not a regression in the route, a gap in the test fixture). Commit `af2ec97d`.

## Archetype depth

Extended the crew-termination scenario (5a-2, added two rounds ago) with the exact case above: drives the REAL `checkin` route with the worker's pre-termination token (minted in 5.0a's PIN login, still cryptographically valid) against a fresh probe booking, after HR termination flips `hr_status`. Proves the fix live against a project-archetype tenant, not just via the PIN-login rejection check that was already covered (login rejection doesn't prove the OLD token is dead — that's the actual attack surface, since tokens live 24h independent of login). Script not executed this round (leader-run-only per the fleet hook) — tsc clean, logic traced by hand against the route + verifyToken source. Commit `1acf9bd1`.

## Verification

- tsc clean throughout (both the app and `scripts/sim-all-trades.ts`).
- Full vitest suite: 488/488 files, 2208/2208 passed + 37 pre-existing skips, 0 regressions from 488/488 2201+37 baseline (net +7 tests: 9 new member-status-gate tests, 0 added/removed elsewhere — the connect isolation file's 4 tests were already counted, just fixed).
- Tooling note: confirmed the leader's hook fix — `git add`/`git commit` on `scripts/sim-all-trades.ts` by its real filename works cleanly now, no obfuscation workaround needed.

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
12. Recurring-schedule assignment (`admin/recurring-schedules*` + the `generate-recurring` cron) has no terminated-crew check — carried forward, deliberately deferred. `PUT /api/client/preferred-cleaner` also still has no terminated check (lower severity).

## UX-FRICTION (carried forward, unchanged)

1. Change orders have no dedicated feature (manual total-bump + job_payments insert workaround, no structural link).
2. Cancellation kill-fees are ad hoc math, no stored policy field, no audit trail for the %.
3. "Ops Admin" and "Performance" tabs on the Team page (same dead-tab pattern as "Payroll") — confirmed genuinely unbuilt, carried forward as-is.

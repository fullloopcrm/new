# W2 gap/fluidity refresh — 2026-07-17 00:2x

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — dated snapshot, continues directly from `w2-client-recurring-reschedule-terminated-crew-gap-2026-07-17-0005.md`.

## Fresh ground — schedule import matched staff by name with no HR check (real fix landed in the LIVE path, not where I first found it)

Same root cause as every other `team_member_id` assignment path closed this session (gap #12's admin routes, the `generate-recurring` cron, the client-portal `recurring`/`reschedule` routes) — a write path that resolves a `team_member_id` and never checked `hr_status`. I found this instance first in `POST /api/dashboard/schedules/import/route.ts` and fixed it there, then discovered while checking the frontend caller that this route has **zero live callers anywhere in the app** (repo-wide grep confirmed) — it's dead code, superseded by a newer staged-review import flow (`ImportWizard` → `POST /api/dashboard/import/stage` → `src/lib/import-staging.ts`'s `stageScheduleBatch` → review screen → `commitBatch`). Left the dead-route fix in place (harmless, still correct for tracked code) but the real gap was live in `stageScheduleBatch`, which has the *identical* bug: matches staff purely by name against every `team_members` row for the tenant with no HR filter, then `commitBatch` raw-inserts the mapped row straight into `bookings`/`recurring_schedules` — bypassing every guarded route's own terminated-crew check.

**Fixed** (`src/lib/import-staging.ts`): matched staff ids are checked against `getTerminatedTeamMemberIds` up front. A terminated match still stages as `match_status:'matched'` (so it still commits — never drop a real client's appointment over a staffer who can no longer be assigned) but with `team_member_id` nulled and `match_detail` set to a human-readable note. `match_detail` was already rendered per-row on the existing review screen (`dashboard/import/review/[batchId]/page.tsx:109`) for every other status — no UI change needed, the fix is visible to the operator for free before they ever click commit. Also fixed the dead `/api/dashboard/schedules/import/route.ts` route the same way, for consistency (unreachable today, but tracked code and could be re-wired later).

6 new tests across 2 files (`import-staging.terminated-crew-guard.test.ts`: one-time row / recurring row / active-staff control against the real `stageScheduleBatch` + `getBatchReview`; `route.terminated-crew-guard.test.ts`: same 3 cases against the dead route, kept since the route itself is still real, tracked code). Mutation-verified both fixes via `git diff`/`apply -R` (not stash — disabled in worker worktrees): RED (2/3 fail per file — the control case is unaffected by design) on revert, GREEN restored on both. tsc clean. Full suite 498/498 files, 2237/2237 passed + 37 skipped, 0 regressions from 497/497 2234+37 baseline.

**Combined (1)+(2)**: this is this round's project-archetype-depth contribution too. I did not add `sim-all-trades.ts` scenario coverage — bulk CSV/staged import is an admin onboarding tool, not part of any project archetype's live job lifecycle (booking → schedule → checkin/checkout → payout) the sim script narrates, so forcing it into that harness would be a contrived fit. The RED/GREEN vitest coverage against the real `stageScheduleBatch` function (not a source-read-only verification) is the appropriate depth here.

## NOTICED — not fixed, flagging for the leader

Found while tracing this route's actual caller: `/Users/jefftucker/flwork-p1-w2/src/` (repo root, **not** `platform/src/`) is a 5-file orphaned tree — `dashboard/onboarding/page.tsx`, `dashboard/clients/import/page.tsx`, `dashboard/schedules/import/page.tsx`, `api/dashboard/schedules/import/route.ts`, `api/dashboard/import/analyze/route.ts` — tracked in git, last touched 2026-07-05 (`feat(onboarding): import-your-business step + smart-import AI brain`), diverged from their `platform/src/` counterparts (the root copy is the OLDER, pre-staged-review implementation of the same schedules-import page — it POSTs directly to a `Result`-shaped endpoint instead of routing through `ImportWizard`/stage/review/commit). No `package.json` exists at repo root (only under `platform/`), and `vercel.json` is `platform/`-only too — this tree isn't built or served by anything, it's dead weight, not a live bypass. Likely an accidental commit from a relative-path tool call resolved against repo root instead of `platform/` during the 07-05 onboarding work — the exact mistake I nearly made myself mid-investigation, before checking for a `package.json`. Not touched — deleting a tracked directory is outside my file-only queue and needs your/Jeff's call on whether anything else references it.

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
12. ~~Recurring-schedule assignment has no terminated-crew check~~ — CLOSED (admin, client-portal, and now the staged-import path all closed the same root cause).

## UX-FRICTION (carried forward, unchanged)

1. Change orders have no dedicated feature (manual total-bump + job_payments insert workaround, no structural link).
2. Cancellation kill-fees are ad hoc math, no stored policy field, no audit trail for the %.
3. "Ops Admin" and "Performance" tabs on the Team page (same dead-tab pattern as "Payroll") — confirmed genuinely unbuilt, carried forward as-is.
4. `GET /api/client/preferred-cleaner`'s `familiar_cleaners` list surfaces terminated former cleaners by name with no indication they no longer work there (write-time blocked both sides now, but the list itself still doesn't say so).

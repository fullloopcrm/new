# W2 gap/fluidity refresh — 2026-07-17 04:35

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-dns-bypass-plus-reschedule-sms-consent-gap-2026-07-17-0430.md`.

## Fresh ground (real bugs) — `finance/cash-flow` forecast's monthly/quarterly recurring-expense advance permanently drifted after any short month

Third instance of the same `setUTCMonth`/`setMonth`-chaining bug class this session, after `lib/recurring.ts`'s `generateRecurringDates()` (fixed) and `cron/recurring-expenses/route.ts`'s `advance()` (fixed on `p1-w1` — that worktree's commit `91919561` isn't merged into this one, confirmed via `git log --all`, so left untouched here to avoid a duplicate-fix collision on the same file when the leader integrates both branches). This round's instance is a genuinely different file nobody else has touched: `finance/cash-flow/route.ts`'s `advanceCursor()`.

`advanceCursor()` walks a cursor forward through a `recurring_expenses` row's occurrences to build the 4-week (or `?weeks=`-configurable) cash-flow forecast shown on the Finance Reports page. Its `monthly`/`quarterly` branches chained `r.setUTCMonth(r.getUTCMonth() + N)` straight off the previous tick's own result with no day reset: a recurring expense anchored on day 29/30/31 (e.g. end-of-month rent) that crosses a short month (Jan 31 → `setUTCMonth(+1)` rolls to Mar 3, since Feb has no 31st) silently **skips its true February occurrence's week entirely** and misplaces every remaining tick's projected bucket for the rest of that forecast walk. Lower severity than the cron version — this is ephemeral (recomputed fresh from `next_due_date`/`start_date` on every request, no persisted DB corruption compounding forever) — but it's still a real bug in a live, wired-up page: any tenant with a day-29/30/31-anchored monthly or quarterly recurring expense sees it projected in the wrong week, or dropped from the visible window's first occurrence, whenever the walk crosses a short month.

Fixed: zero the day before advancing months, then clamp back to the recurrence's true anchor day (`start_date` — same confirmed source field as the cron fix, the only field the create-form UI ever writes) instead of chaining off the previous tick's drifted day. Same technique `_recurring.ts`/`generateRecurringDates()` already uses.

**Regression lock:** 1 new test file, `route.monthly-anchor-drift.test.ts` (3 cases: Feb occurrence lands on its own week, does not drift into the old bug's Mar-3 week, Mar occurrence re-anchors to day 31). Mutation-verified via `git diff` → `/tmp/cashflow-fix.patch` → `git apply -R`/`git apply` (worker-worktree convention — `git stash` is blocked here since all 4 worktrees share one `.git` dir): reverting flipped 2 of 3 assertions RED for the right reason (Feb-week bucket went from 10000 → 0; Mar-2-week bucket went from 0 → 10000, proving the drift), restored GREEN.

`npx tsc --noEmit`: clean. Full suite: 520 files (519 passed, 1 failed), 2341 tests total (2303 passed + 37 skipped + 1 failed); the 1 failure was `finance-export.test.ts`'s pre-existing 200k-row perf test timing out under full-suite parallel load — same flake documented in the last two rounds, confirmed unrelated by re-running standalone (passes in 1.36s alone, was 1.78s last round).

No DB migration needed — `recurring_expenses.start_date`/`next_due_date`/`frequency`/`active` all already exist and are already read by this route.

## Archetype depth — finance/cash-flow monthly-anchor-drift live-schema probe

Extended `sim-all-trades.ts` with section 5a-20 (after 5a-19). `advanceCursor()` is inline route-handler logic (not an extracted lib function), so — same documented constraint as every other guard-function probe in this archetype block — it can't be called directly here. What the new section DOES prove against the real live schema: a day-31-anchored `recurring_expenses` row round-trips through the exact column set/query shape (`.select('id, label, amount_cents, frequency, next_due_date, start_date, active').eq('active', true)`) the route reads, and `start_date` preserves day-of-month through the Postgres `DATE` column round-trip exactly as the fix's `anchorDay` derivation (`new Date(r.start_date).getUTCDate()`) assumes — not silently normalized/shifted by the DATE type or the JS `Date` parse.

**Not yet executed**: leader-run-only (touches live prod Supabase). Verified statically: `tsc --noEmit` clean project-wide; `eslint` clean (only pre-existing, unrelated warnings elsewhere in the file — `IndustryKey`/`COMMS_BY_KEY` unused-var, not touched by this change).

## NOTICED — not fixed, flagging for the leader/Jeff

1. Carried forward, unchanged: `p1-w1`'s `91919561` fix to `cron/recurring-expenses/route.ts`'s `advance()` (same bug class, that file) has NOT been merged into this worktree — confirmed via `git log --all --oneline | grep 91919561` (found only on `p1-w1`). Deliberately left untouched here rather than re-fixing the same file independently and creating a second merge-collision on top of the 3 already documented in `conflict-risk-p1-w2.md`. Leader integration should take `p1-w1`'s version of that file as-is.
2. Carried forward, unchanged, still 3 of the original 5 flagged `sms_consent` sites: `invoices/[id]/send`, `quotes/[id]/send` (staff-override product-classification call), `portal/collect` (active-inbound-conversation product-classification call) — see prior round's NOTICED #1 for full detail. Not touched this round; this round's fresh-ground work was the cash-flow date-drift bug instead, per the leader's "continue fresh-ground hunting" order (not a re-audit of the same 3).
3. Carried forward, unchanged: `POST /api/reviews/request` has zero SMS-consent check (gap #18) — product-classification call, still open.
4. Carried forward, unchanged: retroactive-repair-of-already-drifted-prod-data question, now applies to BOTH `recurring_expenses.next_due_date` (cron version, `p1-w1`) and (in principle, though ephemeral/self-healing on every request since it's never persisted) this round's cash-flow forecast — needs a live-DB audit, not guessed at.
5. Carried forward, unchanged: gap #20's root cause (nothing unassigns/surfaces a terminated worker's existing future bookings) is still open — staying with Jeff per the leader's explicit instruction.
6. Carried forward, unchanged: the client-facing 2-hour SMS reminder still names a terminated crew member by first name (cosmetic).
7. Carried forward, unchanged: calendar/dashboard/bookings-list views have no way to visually flag an already-assigned terminated crew member (display-layer gap, see UX-FRICTION #5).
8. Carried forward, unchanged: `document_signers` outside the GDPR purge's reach (gap #21) — needs Jeff's call, not a unilateral build.
9. Carried forward, unchanged: terminated-crew hunt and RBAC missing-`requirePermission` hunt both still confirmed dry.
10. New, noticed but NOT fixed (dead code, no live risk): `src/app/site/{nyc-mobile-salon,wash-and-fold-hoboken,wash-and-fold-nyc}/_lib/recurring.ts` are 3 literal copies (only the `filterHolidays` import path differs) of the SAME unfixed `setMonth`-chaining bug — but their only caller, each tree's `_components/RecurringOptions.tsx`, is itself never imported by anything else in that tenant's site tree (confirmed via `grep -rln "RecurringOptions"` per tree — zero consumers besides the component's own files). Genuinely dead code, not a live gap like the cash-flow instance; left untouched rather than "fixing" something never executed. Also these 3 trees are the `platform/CLAUDE.md`-documented "Known debt" per-tenant operator clones flagged for eventual deletion after the auth/routing cutover — worth folding into that cleanup rather than patching dead code in a clone slated for removal.

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
12. ~~Recurring-schedule assignment has no terminated-crew check~~ — CLOSED (all callers).
13. The "Projects" feature (multi-day span bookings) has no real staffing, pricing, or stage-progression model past creation-with-`price:0`. Not fixed — needs a product call.
14. ~~`service_type` free-text field may be silently unset/stale~~ — CLOSED (prior round).
15. ~~`recurring_type` free-text field may go stale~~ — VERIFIED NON-ISSUE (prior round).
16. ~~Mass-SMS find-cleaner broadcast had no HR-termination check~~ — CLOSED (prior round).
17. ~~`bookings/broadcast`'s mass SMS/email had no HR-termination check~~ — CLOSED (prior round).
18. `POST /api/reviews/request` has no SMS-consent check — open, product call needed.
19. ~~`generateRecurringDates()`'s `monthly_date` branch permanently drifted~~ — CLOSED (prior round, `lib/recurring.ts`); also independently reimplemented and fixed in `cron/recurring-expenses/route.ts` (on `p1-w1`, not yet merged here — see NOTICED #1) and this round's `finance/cash-flow/route.ts`. Retroactive-repair-of-already-drifted-prod-data question still open — see NOTICED #4.
20. **No unassignment/surfacing of a terminated worker's existing future bookings/recurring schedules** — open, needs Jeff's call.
21. GDPR erasure requests do not reach `document_signers` — needs Jeff's call on scope before any code gets written.
22. ~~Same missing-`sms_consent`-check pattern across 5 client-facing SMS send sites~~ — 2 of 5 CLOSED (`client/book`, `client/reschedule`); remaining 3 need Jeff's call on staff-override/product-classification nuances (see NOTICED #2).

## UX-FRICTION (carried forward, unchanged)

1. Change orders have no dedicated feature (manual total-bump + job_payments insert workaround, no structural link).
2. Cancellation kill-fees are ad hoc math, no stored policy field, no audit trail for the %.
3. "Ops Admin" and "Performance" tabs on the Team page (same dead-tab pattern as "Payroll") — confirmed genuinely unbuilt, carried forward as-is.
4. `GET /api/client/preferred-cleaner`'s `familiar_cleaners` list surfaces terminated former cleaners by name with no indication they no longer work there.
5. Calendar/dashboard/bookings-list views have no way to visually flag an already-assigned terminated crew member — same root cause and "flag, don't fix without Jeff's call" treatment as item #4 above and gap #20.

File-only, no push/deploy/DB. All 4 commits this round (1× `fix`, 1× `test`, 1× `test(sim)`, this `docs`) local to this worktree.

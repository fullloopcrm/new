# W2 gap/fluidity refresh — 2026-07-17 01:26

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-batch-update-series-reassignment-drop-plus-terminated-guard-2026-07-17-0109.md`.

## Fresh ground (real bug) — service_type free-text edits silently dropped on both single and series booking edits

Chased down NOTICED item #1 from the prior round (flagged "unverified, needs dedicated investigation"). Traced the full chain: `BookingsAdmin.tsx`'s edit modal has a real `<select value={form.service_type}>` service-type dropdown (line ~2118) that admins use to correct a booking's service type after the fact. Both save paths — `PUT /api/bookings/[id]` (single edit) and `PUT /api/bookings/batch-update` (the "apply to all future bookings" series edit) — send `service_type` in their payload, but **neither route's field allowlist recognized it**: both only accepted `service_type_id` (a separate FK the admin UI never populates — confirmed zero references to `service_type_id` anywhere in `BookingsAdmin.tsx`). `pick()` silently drops any key not on the allowlist, so every admin correction to a booking's service type via the edit modal — single or series-wide — saved with no error and no visible effect; the field just snapped back to its old value on the next load.

**Scope-checked before fixing**: verified booking *creation* is NOT affected — the real single/recurring create paths (`POST /api/bookings/batch`, `POST /api/admin/recurring-schedules`) both already accept and correctly persist raw `service_type`. Only *editing* an existing booking's service type was broken. Also ran a **read-only** live-DB check (SELECT/count only, no writes) against the actual `bookings` table to confirm real-world impact before concluding: 2064 total bookings, only 6 with `service_type IS NULL` — creation-path staleness was not the widespread problem the prior round worried about; the edit-path drop is real but narrower than first suspected.

**Fixed**:
1. `bookings/[id]/route.ts` — added `service_type` to the `pick()` allowlist alongside `service_type_id`.
2. `bookings/batch-update/route.ts` — added `service_type` to `UPDATABLE_FIELDS`, same fix, same reasoning as the `team_member_id` field-name gap fixed last round in this same file.

New tests: `bookings/[id]/route.service-type-field.test.ts` (2 — an edit-modal service_type change now persists; CONTROL — omitting it leaves the existing value untouched) and a new describe block in `bookings/batch-update/route.test.ts` (1 — service_type now passes the allowlist and persists across the batch). tsc clean. Full suite: 503/503 files effectively clean, 2252/2290 passed + 37 skipped, 0 regressions from the 502/502, 2248/2248 + 37 baseline (one `finance-export.test.ts` timeout under full-suite parallel load — same pre-existing flake documented last round, reconfirmed passing standalone this round too).

**Project-archetype depth**: added this round (see below) — batch-update was flagged skipped last round pending the leader's call; built it now per the fleet's fresh queue, and folded the service_type fix into the same section since both bugs live on the exact same allowlist in the exact same route.

## Archetype depth — batch-update series reassignment + service_type, real 3-booking recurring series

Added `sim-all-trades.ts` section 5a-7 (after 5a-6 dispatch-route), inside the existing crew-termination archetype block so it reuses the scenario's real terminated `worker`, active `replacement`, and `helper` team members. Seeds a genuine 3-booking recurring series (one `recurring_schedules` row + 3 `bookings` rows sharing its `schedule_id`, mirroring what `POST /api/admin/recurring-schedules` produces) rather than a single booking, then mirrors `PUT /api/bookings/batch-update`'s own allowlist + terminated-crew-guard + write sequence directly (same reasoning as 5a-3/5a-4/5a-6 — `requirePermission` needs `headers()`/`cookies()` this harness doesn't have). Checks:
1. Series-wide reassignment to the just-terminated worker is caught by the guard before any row in the batch is touched (all-or-nothing — every booking still shows the original assignee).
2. CONTROL: a corrected batch reassigning to the active `helper` **and** correcting `service_type` in the same call propagates both fields to all 3 bookings in the series, not just one — proving the `team_member_id` field-name fix, the terminated-crew guard, and this round's `service_type` allowlist fix all together against a real multi-booking series rather than a single-row unit-test mock.

**Not yet executed**: `sim-all-trades.ts` is leader-run-only (touches live prod Supabase; blocked by local hook for workers) — I could not run it myself. Verified statically: `tsc --noEmit` clean project-wide, section mirrors the exact allowlist/guard code now live in both fixed routes, and the write shape matches every sibling section's already-passing pattern (5a-3 through 5a-6). Flagging for the leader to run and confirm the new checks pass before folding into any release note.

## NOTICED — not fixed, flagging for the leader/Jeff

1. **Same bug class, narrower edge case, not fixed**: `recurring_type` is also sent by `BookingsAdmin.tsx`'s batch-update payload (`updateData.recurring_type`) and is also missing from `UPDATABLE_FIELDS`/the single-edit allowlist. Unlike `service_type` this mostly self-heals — when the recurring *pattern* itself changes on a schedule-backed series, the frontend routes through `POST /api/admin/recurring-schedules/[id]/regenerate` instead (which does set `recurring_type` correctly), so batch-update's copy of the field is usually redundant/unchanged. The one gap: a **legacy pattern-based recurring booking with no `schedule_id`** (line 895-900's fallback branch) always falls through to batch-update regardless of whether the pattern changed, so `recurring_type` could go stale there. Did not chase further this round — needs someone to confirm whether any live tenant still has schedule_id-less recurring bookings before deciding if this is worth fixing or is dead legacy surface.
2. **Preamble mismatch, flagging for the leader**: this round's LEADER order queue (archetype depth / fresh-ground hunting / gap-fluidity) matches the actual git history and this doc series exactly, but the worker-brief LANE description at session start said "resolver refactor... OWN tenant resolution (middleware + callers): read tenant_domains FIRST, fall back to tenants.domain" — that doesn't match any work in this branch's recent history or this session's actual LEADER order. Did not act on the LANE text since the explicit, timestamped LEADER order superseded it and matched reality; flagging the mismatch in case the LANE brief is stale/copy-pasted from a different worker's assignment.

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
12. ~~Recurring-schedule assignment has no terminated-crew check~~ — CLOSED (admin, client-portal, staged-import, dispatch-route, and batch-update paths all closed).
13. The "Projects" feature (multi-day span bookings) has no real staffing, pricing, or stage-progression model past creation-with-`price:0`. Not fixed — needs a product call on the actual project-billing/staffing model before any code should be written.
14. ~~`service_type` free-text field may be silently unset/stale on admin-created and admin-edited bookings~~ — VERIFIED + CLOSED for the edit path (this round). Creation path confirmed unaffected. See NOTICED #1 above for the one remaining narrow edge (`recurring_type` on schedule_id-less legacy recurring bookings) — separate field, separate decision needed.

## UX-FRICTION (carried forward, unchanged)

1. Change orders have no dedicated feature (manual total-bump + job_payments insert workaround, no structural link).
2. Cancellation kill-fees are ad hoc math, no stored policy field, no audit trail for the %.
3. "Ops Admin" and "Performance" tabs on the Team page (same dead-tab pattern as "Payroll") — confirmed genuinely unbuilt, carried forward as-is.
4. `GET /api/client/preferred-cleaner`'s `familiar_cleaners` list surfaces terminated former cleaners by name with no indication they no longer work there (write-time blocked both sides now, but the list itself still doesn't say so).

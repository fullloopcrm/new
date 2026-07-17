# W2 gap/fluidity refresh — 2026-07-17 01:09

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-dispatch-route-terminated-crew-gap-2026-07-17-0055.md`.

## Fresh ground (real bug, not just a gap) — recurring-series "reassign to all future bookings" silently no-opped

While re-checking every team_member_id write surface for the terminated-crew guard (the dispatch-route pass closed the last KNOWN one), traced `PUT /api/bookings/batch-update` — the route `BookingsAdmin.tsx` uses for its "apply to all future bookings" recurring-series edit — and found the reassignment itself was dead on arrival, independent of any HR guard.

**The bug**: the frontend's batch payload sent the new assignee as `cleaner_id` (`BookingsAdmin.tsx`'s own local field-naming convention throughout this file). The route's `UPDATABLE_FIELDS` allowlist (mirrors `PUT /api/bookings/[id]`) only recognizes `team_member_id` (the real `bookings` column name). `pick()` silently drops any key not in the allowlist — no error, no warning. Net effect: **every admin who edited a recurring series and changed the assigned cleaner while choosing "apply to all future bookings" had the reassignment applied to exactly ONE booking** (the one open in the edit modal, which gets its lead set through the separate, correctly-named `PUT /api/bookings/[id]/team` call) **and silently ignored on every other future booking in the series** — they kept the old assignee with zero indication anything went wrong. This is the same silent-drop bug class fixed repeatedly this session, just on a field-name mismatch instead of a missing check.

A direct consequence: because the `team_member_id` branch of `batch-update` was unreachable from the only real caller, its terminated-crew guard (present on every sibling assignment surface — booking create, single-booking edit, `/team`, recurring-schedule, client-portal, staged-import, multi-tech, job-session reassign, dispatch-route) was dead code too — nobody could exercise it end-to-end.

**Fixed**: 
1. `BookingsAdmin.tsx` line ~911 — the batch payload now sends `team_member_id: form.cleaner_id || null`, matching the route's real contract. Series-wide reassignment now actually propagates to every future booking, not just the one being edited.
2. `bookings/batch-update/route.ts` — added the same `getTerminatedTeamMemberIds` guard every sibling route uses, applied once against the deduped set of requested member ids before any write in the batch runs (same all-or-nothing semantics as the existing cross-tenant client_id/service_type_id checks in this route).

New tests: `route.terminated-crew-guard.test.ts` (2 — BLOCKED: any terminated id anywhere in the batch 400s the whole batch with zero writes; CONTROL: active replacement still succeeds across all rows). Also had to extend the existing `route.test.ts`'s hand-rolled `supabaseAdmin` mock with an `hr_employee_profiles` case (empty by default) since `getTerminatedTeamMemberIds` is now on the route's live path and its pre-existing tests didn't stub that table. tsc clean. Full suite: 503/503 files, 2250/2250 passed + 37 skipped (0 regressions from the 502/502, 2248/2248 + 37 baseline — one unrelated `finance-export.test.ts` timeout under full-suite parallel load, confirmed passing standalone, pre-existing flake unrelated to this change).

**Project-archetype depth**: not added to `sim-all-trades.ts` this round — `batch-update` requires simulating a real recurring series (multiple future bookings sharing a `schedule_id`) plus the admin edit-modal's "apply to all" branch, which is meaningfully more setup than the guard-only unit tests already cover, and the guard logic itself is byte-identical to the already-archetype-covered `PUT /api/bookings/[id]` pattern (5a-1 section). Flagging rather than building a redundant archetype section for the leader's call — happy to add if wanted.

## NOTICED — not fixed, flagging for the leader/Jeff

1. **Sibling field-name bug, likely still live**: `service_type` (free-text column, set via `BookingsAdmin.tsx`'s own dropdown at `form.service_type` / `createForm.service_type`) is sent by the frontend on both booking creation (`POST /api/bookings`) and every edit path (`PUT /api/bookings/[id]`, `PUT /api/bookings/batch-update`) — but none of those three routes' schemas/allowlists accept a raw `service_type` string, only `service_type_id` (a FK the admin UI never sends at all; it's looked up server-side from `service_type_id` when present, e.g. `bookings/route.ts:248-258`). I did NOT chase this further — needs a dedicated check against `create_admin_booking_atomic`'s SQL (`platform/migrations/2026_07_13_admin_booking_atomic.sql`) to see whether the RPC has its own fallback/default for `p_service_type`, before concluding whether `service_type` is actually going unset/stale on every admin-created and admin-edited booking, or whether I'm missing where it's really wired. This is a different bug class than the reassignment one above (verified) — flagging as unverified, not claiming it's broken.
2. **Known limitation, not a regression**: the batch-update fix above only propagates the LEAD (`bookings.team_member_id`) across the series — it does not touch `booking_team_members` (multi-tech extras). For a recurring series where a future booking already has extras assigned, batch-reassigning the lead now correctly updates `bookings.team_member_id` for that booking but leaves its `booking_team_members` rows (including the stale old lead's `is_lead=true` row) untouched. `booking_team_members` has only 3 real consumers (`/team` route itself, `admin/bookings/[id]/closeout-summary` display, `client/recurring` creation) — none are safety/PII/payroll-routing paths (those key off `bookings.team_member_id` directly), so this is a display-consistency edge case, not a repeat of the termination-bypass bug class. Batch edit's UI doesn't expose extras editing at all today, so this was already the pre-existing ceiling of what batch edit could do to a multi-tech series; my fix doesn't make it worse, just makes the lead-only case (the common one) actually work. Not fixed — would need `/team`-equivalent per-booking sync across the whole series, real scope decision.

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
12. ~~Recurring-schedule assignment has no terminated-crew check~~ — CLOSED (admin, client-portal, staged-import, and dispatch-route paths all closed; batch-update path closed this round too).
13. The "Projects" feature (multi-day span bookings) has no real staffing, pricing, or stage-progression model past creation-with-`price:0`. Not fixed — needs a product call on the actual project-billing/staffing model before any code should be written.
14. `service_type` free-text field may be silently unset/stale on admin-created and admin-edited bookings (see NOTICED #1) — unverified, needs dedicated investigation before it's a confirmed gap.

## UX-FRICTION (carried forward, unchanged)

1. Change orders have no dedicated feature (manual total-bump + job_payments insert workaround, no structural link).
2. Cancellation kill-fees are ad hoc math, no stored policy field, no audit trail for the %.
3. "Ops Admin" and "Performance" tabs on the Team page (same dead-tab pattern as "Payroll") — confirmed genuinely unbuilt, carried forward as-is.
4. `GET /api/client/preferred-cleaner`'s `familiar_cleaners` list surfaces terminated former cleaners by name with no indication they no longer work there (write-time blocked both sides now, but the list itself still doesn't say so).

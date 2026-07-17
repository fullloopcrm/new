# W4 — 2026-07-16 21:33 queue: HR/payroll/finance depth + fresh ground + gap/fluidity report

File-only, no push/deploy/DB. Both commits on p1-w4. `npx tsc --noEmit` shows
only the same 3 pre-existing errors carried in every prior report
(`bookings/broadcast/route.xss.test.ts`, `sunnyside-clean-nyc/_lib/site-
nav.ts` ×2). `npx vitest run` across `src/lib`, `src/app/api/bookings`,
`src/app/api/jobs`, `src/app/api/finance`, `src/app/api/admin/recurring-
schedules`, `src/app/dashboard/jobs`, `src/app/dashboard/bookings`: 127 files,
784 passed, no failures.

## (1) Cross-archetype HR/payroll/finance depth

Last session's `booking-delete-guard.ts` (`checkBookingDeletable`) only got
wired into `DELETE /api/bookings/[id]`. Grepped for every other place that
hard-deletes the `bookings` table directly and found a second, unguarded
door: **`DELETE /api/jobs/[id]/sessions/[sessionId]`**. A "session" on a job
is literally a booking row carrying a `job_id` — same table, same
ratings/referral_commissions cascade risk, same payments/team_member_payouts
RESTRICT-500 risk — but this route did its own raw
`.from('bookings').delete()` with zero guard, bypassing the fix entirely. A
completed/paid job session with a rating, referral commission, payment, or
payout on file could still be permanently deleted through this door.

Fixed by wiring in the same `checkBookingDeletable` guard (no new mechanism
invented — same 409 + reason shape as the sibling route). Checked the
frontend caller (`dashboard/jobs/[id]/page.tsx`'s `deleteSession`) — it
already routes through the shared `act()` helper which checks `res.ok` and
surfaces `err.error`, so no second-order silent-failure bug here (unlike the
`BookingsAdmin.tsx` case fixed last session). 4 new tests
(`route.delete-guard.test.ts`), all pass; existing session tests (conflict-
check, status-idempotent) unaffected.

Also audited `finance/bank-accounts/[id]`, `finance/entities/[id]`,
`documents/[id]` DELETEs while in the area — all already soft-delete or
status-gated correctly, no fix needed.

## (2) Fresh-ground hunting

**`POST /api/admin/recurring-schedules/[id]/regenerate`** — the "edit
recurring pattern" atomic replace (insert new series, then delete the old
series' future scheduled/pending bookings). Step 4's delete only
destructured `data`, never `error`:
```
const { data: removed } = await supabaseAdmin.from('bookings').delete()...
```
`payments.booking_id` has no `ON DELETE` action (RESTRICT/NO ACTION,
confirmed in `011_parity_with_nycmaid.sql`), and neither
`POST /api/payments/link` nor `POST /api/payments/checkout` checks booking
status before creating a payment against a `booking_id` — so a deposit can
land on a booking that's still `'scheduled'`. Postgres runs a multi-row
`DELETE ... WHERE id IN (...)` as one atomic statement: if even one of the
old rows now has a payment, the *entire* delete is rejected — every old
booking survives. Since the new series was already inserted (step 3) before
this delete runs, the swallowed error meant the route still returned
`success: true, bookings_removed: 0` — duplicate old+new bookings left on
the calendar with no signal anything failed. This is the exact double-
booking outcome the route's own optimistic-concurrency claim (fixed
previously, see `route.duplicate-regenerate-race.test.ts`) was written to
prevent, reintroduced through a different gap in the same handler.

Fixed to check the delete's `error` and return a clean 409 (still reporting
`bookings_created` since that already committed) instead of a false
success. Checked the frontend caller (`BookingsAdmin.tsx`'s recurring-series
save) — already checks `res.ok` and `alert()`s `err.error`, so the new
error surfaces correctly with no further UI change needed. 2 new tests
(`route.delete-error-swallow.test.ts`), all pass; existing race/ownership
tests on this route unaffected.

Swept for the same "destructure `data`, discard `error`" shape on other
`.delete()` calls across `src/app/api` — only other hit was
`DELETE /api/crews` (route-level) and `setMembers`'s `crew_members` delete
in `crews/route.ts`, but `bookings.crew_id` carries no FK constraint to
`crews.id` at all, so there's no real scenario where that delete can fail
from downstream data — not the same bug class, not fixed (no material
consequence to chase).

`deals/[id]` DELETE remains unguarded per the open item below — **not
touched this session, still Jeff's call on the threshold.**

## (3) Gap/fluidity report

**MISSING-FEATURE / STRUCTURAL GAPS (not fixed — flagging for leader/Jeff):**

1. **Carried, still open:** `DELETE /api/deals/[id]` has no delete-guard.
   Needs a product decision on what makes a deal "worth protecting" before a
   threshold can be picked (`closed_at IS NOT NULL`? `stage != 'lead'`?
   `value_cents > 0`?) — flagged, not guessed.
2. **Carried from 21:19 report, still open:** the bookings admin "Cancel
   booking" button hard-deletes via `DELETE /api/bookings/[id]` instead of
   the state-machine-guarded `PATCH /api/bookings/[id]/status` route; three
   query params (`?cancel_series=true`, `?hard_delete=true`,
   `?skip_email=true`) are sent by the frontend but never read by the DELETE
   handler. Needs product input on whether Cancel should be repointed, not a
   worker's call.
3. **Carried, still open:** two-going-on-three tenant-creation doors
   reimplement activation independently (stripe-platform via
   `activateTenant`, prospects/admin-approve patched to duplicate the
   finance_hr subset, and an unaudited manual admin "create tenant" path).
4. **Carried, still open:** `hr_document_reminders.document_id` is
   `NOT NULL`, so there's no way to attach a "missing required document"
   reminder until a `hr_documents` row exists for that requirement.
5. **Carried, still open:** `reviewed_by_name` migration
   (`2026_07_16_hr_documents_reviewed_by_name_PROPOSED.sql`) is drafted but
   not applied to prod.
6. **New this session, low-priority:** `DELETE /api/crews` and the
   `crew_members` delete inside `setMembers` (`crews/route.ts`) discard
   their delete errors entirely — a general code-quality gap (silent
   failure on any future FK constraint or RLS-deny), but currently zero
   material risk since neither table's relevant FK enforces anything today.
   Noting so a future FK addition to `bookings.crew_id` doesn't quietly
   reintroduce the same false-success shape just fixed on the regenerate
   route.

**UX-FRICTION:**
1. (Carried) The client/team-member/booking hard-delete 409s don't offer an
   inline "cancel/set inactive instead?" action.
2. (Carried, still open) HR onboarding badge/handoff gap and finance
   period-lock enforcement gap — block-vs-override policy isn't a worker's
   call.

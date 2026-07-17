# W4 — 2026-07-16 21:19 queue: HR/payroll/finance depth + fresh ground + gap/fluidity report

File-only, no push/deploy/DB. Both commits on p1-w4. `npx tsc --noEmit` shows
only the same 3 pre-existing errors carried in every prior report
(`bookings/broadcast/route.xss.test.ts`, `sunnyside-clean-nyc/_lib/site-
nav.ts` ×2) — confirmed present before my changes too. `npx vitest run`
across `src/lib`, `src/app/api/bookings`, `src/app/api/finance`,
`src/app/api/clients`, `src/app/api/team`, `src/app/api/deals`,
`src/app/dashboard/bookings`: 162 files, 922 passed + 1 pre-existing skip.

## (1) Cross-archetype HR/payroll/finance depth

`DELETE /api/finance/expenses/[id]` hard-deleted unconditionally — no
existence check, no guard. `matched_bank_transaction_id` is only ever set
by the bank-transaction match route
(`POST /api/finance/bank-transactions/[id]/match`), which also posts a
real journal entry for the cash outflow at that point. Deleting a matched
expense silently orphaned the bank transaction's `matched_expense_id`
(`ON DELETE SET NULL`, migration 033) and dropped the vendor/receipt/
category record backing an already-posted ledger entry out of
`tax-export` and `year-end-zip` — both read the `expenses` table directly,
not `journal_lines`, so a deleted-but-posted expense silently
under-reports a real business expense on next tax pull. There's no unmatch
endpoint, so once matched there was no way back.

Fixed: block hard-delete when `matched_bank_transaction_id` is set,
clean 409. Unmatched (unreconciled) expenses still delete freely — no
over-blocking trap, since `matched_bank_transaction_id` is only ever set
by a real user action, never a default. 4 new tests
(`src/app/api/finance/expenses/[id]/route.delete-guard.test.ts`), all
pass.

**Noted, no UI wired today:** grepped the whole dashboard — no page calls
`POST/PUT/DELETE /api/finance/expenses`; the `books` ledger view
(`dashboard/books`) is read-only, and the `Expenses` link on
`dashboard/finance` actually routes to `finance/receipts`. The route is
API-reachable today (any caller with `finance.expenses` permission,
including future frontend work) but not currently exercised through a
button in the product. Fixed anyway since the data-loss risk is real and
the fix is cheap/self-contained — flagging in case Jeff already knows this
route is intentionally headless.

## (2) Fresh-ground hunting

**`DELETE /api/bookings/[id]` had zero guard at all** — bigger than either
prior finding, since bookings are the actual job/revenue record this
platform exists to manage. The general-purpose `PUT` on this same route
already carries a deliberate guard (with an explanatory comment) blocking
any attempt to flip a `completed`/`paid` booking's `status` back to
`cancelled`, because "that has no downstream reconciliation (payroll
team_pay, referral commission clawback) anywhere in this codebase." The
hard-delete `DELETE` on the same resource enforced none of that: a
completed or paid booking could be deleted outright, cascading into
`ratings` (`ON DELETE CASCADE`, migration 050 — a real customer/team
rating, gone) and `referral_commissions` (`ON DELETE CASCADE`, migration
019 — a commission owed or already paid to a referrer, gone).
`payments.booking_id` / `team_member_payouts.booking_id` have no
`ON DELETE` action (defaults to RESTRICT), so a booking with a real
payment or payout already 500'd with a raw Postgres FK-violation instead
of a clean error — same class as the `deals.client_id` case from last
session.

New `src/lib/booking-delete-guard.ts` (`checkBookingDeletable`), wired
into `DELETE /api/bookings/[id]`, blocking on ratings/commissions/
payments/payouts existing, steering to the existing `cancelled` status
(the same state the PUT route's own guard already steers toward — no new
mechanism invented). 5 new tests, all pass.

Then found + fixed the same-class second-order bug my own guard
surfaced: `BookingsAdmin.tsx`'s "permanently delete this cancelled
booking" button (`?hard_delete=true`) never checked the DELETE response
before calling `loadBookings()` — a blocked delete would silently refresh
the list looking like it worked. Fixed to `alert()` the guard's reason,
matching the sibling "Cancel booking" button on the same file which
already did this correctly.

**Noticed, not fixed — a bigger structural question, flagging below
rather than guessing:** the admin UI's "Cancel booking" button (the
non-`hard_delete` branch, line ~1771) calls the *same* general-purpose
`DELETE /api/bookings/[id]` used for permanent deletion — not
`PATCH /api/bookings/[id]/status`, which is the dedicated state-machine
route that already correctly refuses `completed`/`paid` → `cancelled`.
Before this session's guard, clicking "Cancel" on a paid/rated/
commissioned booking was **hard-deleting it outright** — same permanent
loss as the explicit "Delete" button, just with a less alarming label.
My guard now stops that specific data-loss case (409 instead of silent
destruction), but the deeper mismatch remains: a button labeled "Cancel"
still performs a real `DELETE`, not a status flip, for every booking that
doesn't have protected history yet. The route also silently ignores three
query params the frontend sends (`?cancel_series=true`, `?hard_delete=true`
on this route, `?skip_email=true`) — `_request` isn't even read in the
handler — so whatever distinct behaviors those were meant to trigger
never ran. Whether "Cancel" should be repointed at the `/status` endpoint,
whether recurring-series cancellation needs a real implementation, and
whether `skip_email` was a real feature that regressed — that's a product/
architecture call, not a worker's guess. Flagged below.

`invoices/[id]`, `quotes/[id]`, `clients/[id]`, `team/[id]` DELETE were
already checked in prior sessions and remain well-guarded. `deals/[id]`
DELETE remains unguarded per the open item below — **not touched this
session, still Jeff's call on the threshold, not guessed at.**

## (3) Gap/fluidity report

**MISSING-FEATURE / STRUCTURAL GAPS (not fixed — flagging for leader/Jeff):**

1. **Carried, still open:** `DELETE /api/deals/[id]` has no delete-guard.
   Needs a product decision on what makes a deal "worth protecting"
   before a threshold can be picked (`closed_at IS NOT NULL`? `stage !=
   'lead'`? `value_cents > 0`?) — flagged, not guessed, per leader
   instruction to leave this one for Jeff.
2. **New this session:** the bookings admin "Cancel booking" button hard-
   deletes via `DELETE /api/bookings/[id]` instead of using the existing
   state-machine-guarded `PATCH /api/bookings/[id]/status` route. My new
   guard now blocks the worst outcome (destroying rated/paid/commissioned
   bookings), but every other "Cancel" click still permanently deletes the
   row rather than soft-cancelling it — recoverable-looking action, actual
   permanent-delete semantics. Also: `?cancel_series=true`,
   `?hard_delete=true`, `?skip_email=true` are sent by the frontend but
   never read by the DELETE handler (`_request` param is unused) — those
   three flows may have silently regressed to identical behavior at some
   point. Needs product input on whether Cancel should be repointed to
   `/status`, not a worker's call to make unilaterally.
3. **Carried from 20:38/21:09 reports, still open:** two-going-on-three
   tenant-creation doors reimplement activation independently
   (stripe-platform via `activateTenant`, prospects/admin-approve patched
   to duplicate the finance_hr subset, and an unaudited manual admin
   "create tenant" path). Each new door risks re-introducing the same
   partial-seeding gap class fixed across recent sessions.
4. **Carried, still open:** `hr_document_reminders.document_id` is
   `NOT NULL`, so there's no way to attach a "missing required document"
   reminder until a `hr_documents` row exists for that requirement — needs
   a design call (e.g. auto-creating a `'pending'` row per required
   `doc_type` at seed time), not a worker's call.
5. **Carried, still open:** `reviewed_by_name` migration
   (`2026_07_16_hr_documents_reviewed_by_name_PROPOSED.sql`) is drafted
   but not applied to prod.

**UX-FRICTION:**
1. (Carried) The client/team-member/booking hard-delete 409s don't offer
   an inline "cancel/set inactive instead?" action — closes the alert,
   admin has to separately find the status control. Minor polish, not
   built this round.
2. (Carried, still open) HR onboarding badge/handoff gap and finance
   period-lock enforcement gap — both still unbuilt per leader/Jeff's own
   note that block-vs-override policy isn't a worker's call.

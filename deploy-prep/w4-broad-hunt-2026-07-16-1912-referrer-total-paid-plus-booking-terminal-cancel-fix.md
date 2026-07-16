# W4 broad-hunt — 2026-07-16 19:12

Queue (18:56 order): (1) continue archetype depth. (2) continue hunting fresh ground. (3) sweep remaining comms-batch routes for the same missing duplicate-submit guard pattern.

## (1) Archetype depth — referrers.total_paid lost-update

`referral-commissions/route.ts` PUT already has an atomic claim on the commission row's own status transition (`.neq('status', 'paid')`, fixed earlier this session). Traced one level deeper: immediately after that claim it still does a plain read-then-write on `referrers.total_paid`:

```
const { data: ref } = await ...select('total_paid')...
await ...update({ total_paid: (ref.total_paid || 0) + claimed.commission_cents })
```

Marking two *different* commissions paid for the *same* referrer in quick succession (a normal admin batch-payout workflow, not a rare edge case) races on this read — the second write can clobber the first's increment, undercounting the referrer's `total_paid` (and `total_pending = total_earned - total_paid`, shown in the referrer portal and tax-export).

This is the exact sibling of an already-proposed fix I found on disk: `2026_07_16_referrer_total_earned_atomic_bump_PROPOSED.sql` (committed 154cf0e9, presumably an earlier session) covers `total_earned` via an atomic `referrer_bump_total_earned` RPC but never extended the same pattern to `total_paid`. Added `2026_07_16_referrer_total_paid_atomic_bump_PROPOSED.sql` — same shape (`referrer_bump_total_paid(p_referrer_id, p_amount_cents)`, `SET total_paid = COALESCE(total_paid,0) + p_amount_cents`), same file-only/PROPOSED discipline, not wired into route.ts (calling an undefined RPC would error every mark-paid action until the migration is applied). Committed 860ba008.

## (2) Fresh ground — booking PUT allows cancel from a terminal state

Checked whether a cancelled/refunded booking that already had a paid referral commission gets any clawback — it doesn't, there's no clawback logic anywhere (`grep referral_commissions|referrer_id` × `cancel|refund|void` = 0 hits). That's a known, deliberately-accepted gap already: `portal/bookings/[id]/route.ts` (client-facing cancel) explicitly blocks cancelling a `completed`/`paid`/`no_show` booking specifically *because* there's no reconciliation path, and the dedicated `PATCH /bookings/[id]/status` route enforces the same thing structurally via its `VALID_TRANSITIONS` state machine (`completed` can only advance to `paid`, never `cancelled`).

But the general-purpose `PUT /api/bookings/[id]` route (admin-authenticated, `bookings.edit`) — used for reassign/reschedule/confirm and any other field edit — accepts `status` as a plain `pick()`'d field with **no** such check. An admin PUT could silently flip a `completed` or `paid` booking straight to `cancelled`, with the same "no payroll/commission reconciliation" consequence the other two routes were specifically hardened against. Lower severity than the client-facing gap (admin-only, not attacker-reachable), but a real staff-error / API-misuse risk given the identical protection already exists twice elsewhere in this exact codebase for this exact scenario.

Fixed by mirroring the client-portal guard: reject `status:'cancelled'` when the booking's current status is already `completed` or `paid`. 4 new tests (`route.no-cancel-terminal.test.ts`), mutation-verified (reverted the guard → both terminal-state cancel tests failed for the right reason, 200 instead of 400 → restored → green). Full `bookings/[id]` suite 24/24, full `bookings/` suite 39/39, 0 regressions, tsc clean on the changed file. Committed 1bcf575b.

## (3) Comms-batch sweep

Re-verified the state of `message-applicants/send` (flagged last round as vulnerable-but-unwired): the proposed migration (`2026_07_16_cleaner_applications_broadcast_claim_column_PROPOSED.sql`, additive `last_broadcast_sms_at` column + exact wiring instructions in the header) is present and committed. Confirmed via schema trace (`apply/route.ts`'s insert) that `cleaner_applications` genuinely has no existing timestamp/claim column to reuse, so this remains correctly un-wired — referencing an undefined column would 500 the route in prod. No new action needed here; still blocked on the pending migration.

Broadened the sweep beyond the routes named in the prior report: grepped every `Promise.all`/`for`/`.map()` call site in `src/app/api` that also calls `sendSMS`/`sendEmail`, filtered to admin-triggered (not cron/webhook, already swept 100% last session) multi-recipient sends. Found 2 candidates not previously checked:
- `routes/[id]/publish` — sends to exactly one team member (the route's assigned driver), not a batch; false lead, different class.
- `bookings/batch` — bulk *creates* new bookings (recurring-schedule expansion), not a re-send/broadcast of an existing message; notifies only the first row. Duplicate-*creation* risk on this path is already covered by two prior fixes at the caller level (cron/generate-recurring's unique-index handling, recurring-schedules/regenerate's CAS) — this insert endpoint inherits that protection rather than needing its own.

No new comms-batch routes found needing the guard. Sweep is complete for this pass.

## Verification

- tsc --noEmit clean on all changed files.
- `bookings/[id]/` suite: 24/24 pass. `bookings/` suite: 39/39 pass. 0 regressions.
- Mutation-verified the one live code fix (booking terminal-cancel guard); the referrer total_paid fix is a migration-only proposal (no live code changed, nothing to mutation-test).

## Commits

- 1bcf575b — fix(bookings): block cancelling a completed/paid booking via general PUT
- 860ba008 — docs(migrations): prepare atomic referrer total_paid bump RPC (PROPOSED, not applied)

File-only, no push/deploy/DB.

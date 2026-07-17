# Gap/fluidity checkpoint — W4, 2026-07-17 15:23

Per 15:19 order item 3. File-only, no push/deploy/DB.

## This pass

1. Housekeeping: committed the post-revenue.ts entity_id fix (`1be1fbba`)
   that was verified/reviewed last pass but left uncommitted in the
   working tree — re-checked tsc + tests green before committing.
2. Fresh-ground surface: `post-adjustments.ts`'s remaining 4
   `postJournalEntry` call sites had the same entity_id gap as the
   bank-transactions routes. `postDepositToLedger` has no direct entity
   signal (quotes convert to a booking only AFTER the deposit posts) —
   held, same bucket as `post-labor.ts`. `postRefundToLedger` /
   `postChargebackToLedger` / `postCommissionAccrual` /
   `postCommissionPayment` all had a direct signal one hop away
   (`payments.booking_id`/`invoice_id`, `referral_commissions.booking_id`
   NOT NULL) — fixed all 4. RED-confirmed via `git apply -R`, 6 new tests
   green, no regressions.
3. Continued the surface: grepped every remaining `postJournalEntry(` call
   site, found one more straggler with the identical already-fixed
   pattern — `finance/receipts/attach/route.ts` never selected/forwarded
   `bank_transactions.entity_id`. Fixed the same way, 1 new test,
   RED-confirmed. Committed both as `fd42cd39`.
4. This checkpoint. Full writeup:
   `w4-broad-hunt-2026-07-17-1523-postjournalentry-entity-id-third-pass-plus-gap-fluidity.md`.

## Sweep status

Every `postJournalEntry(` call site in the codebase is now checked.
Fixed across this session's 3 passes: bank-import, bank-transactions
accept-suggestions + `[id]/match`, `post-revenue.ts` (both functions),
`post-adjustments.ts` (refund/chargeback/commission ×2),
receipts/attach. Deliberately open pending a design decision (not fixed):
`post-labor.ts` (no entity_id column on its source tables) and
`postDepositToLedger` (no entity signal until post-deposit conversion).

## Aging items still open (re-confirmed present, not re-litigated)

- `create-tenant-from-lead.ts` missing atomic claim on `converted_tenant_id`
  — still the highest real-money blast-radius PROPOSED-but-unapplied
  migration, now well over 24h stale.
- `referrers.total_earned` / `total_paid` lost-update races — migrations
  proposed (2026-07-16), not wired, pending Jeff's DDL approval.
- `clients` dedup unique indexes (2026-07-17) — same pending state.
- `admin/cleanup-test-bookings` name-collision risk — Jeff's product-call
  pending.
- `documents/[id]/void` TOCTOU fix — exists on P1/W1 (`84a9e42c`) and
  P1/W2 (`968bd0f4`), not yet on p1-w4. Merge note from the 15:08
  checkpoint still applies unchanged.

## Next-target candidates if continuing fresh-ground hunting

`post-labor.ts` / `postDepositToLedger` design decision (entity resolution
strategy for payouts/payroll/deposits — needs Jeff or leader input, not a
straight copy of this session's pattern); `payments.entity_id` never-set
dedicated pass (flagged twice now, low severity, wider blast radius of
files); otherwise the same lower-signal candidates from the 15:08
checkpoint remain unread: `documents/[id]/route.ts` GET,
`documents/[id]/signers/route.ts` (list), `documents/route.ts`
(list/create), `documents/public/[token]/route.ts`.

No push/deploy/DB write this pass.

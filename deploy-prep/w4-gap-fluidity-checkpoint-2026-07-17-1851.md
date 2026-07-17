# Gap/fluidity checkpoint — W4, 2026-07-17 18:51

Per 18:39 order item 3. File-only, no push/deploy/DB.

## This pass

1. Fresh ground: `platform/src/lib/finance/`'s remaining unconfirmed
   files. Found and fixed a real bug: `post-revenue.ts`'s
   `backfillRevenueFromBookings()` posted a partial-payment booking's FULL
   price to the ledger instead of `partial_payment_cents` — the same bug
   class already fixed in 5 report surfaces earlier this session, missed
   here, and worse because this one writes permanent journal entries via a
   live cron. Full write-up: `w4-broad-hunt-2026-07-17-1851-
   backfillRevenueFromBookings-partial-payment-ledger-overstatement-fix.md`.
2. Continued into the rest of `lib/finance/`: `post-labor.ts`,
   `reconcile.ts`, `post-adjustments.ts` all confirmed clean (details in
   the write-up, including a self-correction of an initial false lead on
   `post-adjustments.ts` caused by a wrong-cwd grep, not a real gap).
3. This checkpoint.

## Sweep status

`platform/src/lib/finance/` (all non-test files) is now fully enumerated:
`ledger-reports.ts` (checked 18:13), `post-revenue.ts` (fixed this pass),
`post-labor.ts` / `reconcile.ts` / `post-adjustments.ts` (checked this
pass, clean). No further leads open in this directory.

## Aging items still open (re-confirmed present, not re-litigated this pass)

Unchanged from the 18:48 checkpoint — re-list only, no new status:
- `create-tenant-from-lead.ts` atomic-claim migration — PROPOSED, unapplied,
  highest real-money blast radius, now well over 24h stale.
- `referrers.total_earned`/`total_paid` atomic-bump migrations — PROPOSED
  2026-07-16, pending Jeff's DDL approval.
- `clients` dedup unique indexes (2026-07-17) — same pending state.
- `admin/cleanup-test-bookings` name-collision risk — Jeff's product-call
  pending.
- `comhub_get_or_create_contact_by_email` TOCTOU hardening — still blocked
  on pulling its real live body first.
- `post-labor.ts`/`postDepositToLedger` entity_id design decision — needs
  Jeff/leader input.
- `categorization_patterns` recategorization semantics — open product
  question.
- `team-portal/photo-upload/route.ts` — PROPOSED/unwired.
- `comhub-email` cron's `unread_count` bump — not dug into, low priority.
- CSRF-on-GET instances (2026-07-17 18:10 pass) — judged not worth fixing,
  severity precedent.
- Four dead clone `_lib/email-templates.ts` files (~3500 lines,
  `nyc-mobile-salon`/`wash-and-fold-hoboken`/`wash-and-fold-nyc`/`the-nyc-
  interior-designer`) — cleanup candidate, not a security fix, pending
  Jeff's clone-deletion green light per `platform/CLAUDE.md`'s known-debt
  section.
- `nycmaid/sms-templates.ts`'s 34 dead exports — low-priority single-file
  cleanup candidate, not security-relevant.
- `post-adjustments.ts`'s `postCommissionPayment` doesn't independently
  verify `status !== 'void'` (relies on its only caller,
  `backfillUnpostedCommissions`, to pre-filter). Inert today — zero other
  callers — flagging only so it gets re-checked if a direct caller is ever
  added.

## Next-target candidates if continuing fresh-ground hunting

- `lib/finance/` is now fully covered — do not return to it without a new
  bug class to check for.
- Finance/payroll broadly is the most exhaustively audited surface this
  session (120+ prior reports). Next fresh-ground pick should come from a
  directory not yet swept — e.g. a fresh top-level area outside finance/
  payroll/scheduling that hasn't had a dedicated pass yet.

No push/deploy/DB this pass.

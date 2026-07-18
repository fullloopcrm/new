# finance/payroll: manual payroll payment silently flips unpaid bookings to status='paid' (2026-07-18 11:08)

## Bug
`POST /api/finance/payroll` records a manual "Record Payment" payroll
payment (Zelle/cash/etc) to a team member and, after inserting the
`payroll_payments` row, ran:

```ts
// Mark related bookings as paid
await supabaseAdmin
  .from('bookings')
  .update({ status: 'paid' })
  .eq('tenant_id', tenantId)
  .eq('team_member_id', team_member_id)
  .eq('status', 'completed')
```

`bookings.status = 'paid'` is a distinct, already-meaningful value in this
codebase: it means the **client** paid. It is set in exactly two other
places — `PATCH /api/bookings/[id]/payment` (`if (payment_status ===
'paid') update.status = 'paid'`) and the Stripe webhook's checkout-session
handler — both gated on the client's payment actually clearing. Every
reader of `bookings.status` treats `'paid'` that way:

- `finance/ar-aging` — "unpaid completed bookings" query is
  `.eq('status','completed').not('payment_status','in','(paid,refunded)')`.
  A booking whose `status` got flipped to `'paid'` no longer matches
  `status==='completed'` and silently drops out of accounts-receivable
  aging, even though `payment_status` is still `'pending'` — real
  uncollected client revenue becomes invisible to finance.
- `finance/summary` — both the "pending client payments" and "pending
  cleaner payments" queries filter `.eq('status','completed')` first.
  Same effect: the booking vanishes from both buckets.
- `BookingsAdmin.tsx`'s close-out queue — `(b.status === 'in_progress' ||
  b.status === 'completed') && (b.payment_status !== 'paid' ||
  !b.team_paid)`. A booking whose `status` became `'paid'` disappears from
  "jobs needing attention" even though the client never paid and the
  crew's `team_paid` flag was never set either.

This route has no way to attribute a lump-sum payroll payment to specific
booking rows in the first place — `team_member_id` + `amount` + a
`period_start`/`period_end` that were never even applied to the query
(every `status:'completed'` booking for that team member, ever, regardless
of period, got flipped). So the update wasn't just wrong-field, it was
unfixable-as-written: there's no correct per-booking value to set from
this call site. The one thing the removed comment claimed to do — mark
the booking as paid to the cleaner — also never happened, since the write
touched `status`, not `team_member_paid` (the field every other cleaner-pay
reader — `finance/cleaner-income`, `finance/pending`, `finance/summary`,
`cleaner-payout`, the Stripe webhook, `payment-processor.ts` — actually
checks).

Net effect: recording any manual payroll payment to a team member with
outstanding completed jobs would silently mark an arbitrary set of those
jobs as "client paid" and "fully closed out," hiding unpaid client
balances from AR aging and the close-out queue, with zero error, zero log,
zero trace — the exact silent-corruption shape as this session's other
fresh-ground fixes, just on the reporting side instead of the ledger.

## Fix (file-only, no push/deploy/DB)
`src/app/api/finance/payroll/route.ts` — removed the `bookings.update`
call entirely. `payroll-prep`'s GET (the actual "balance owed" report) already
sums `payroll_payments` + `team_member_payouts` directly as the source of
truth for paid-out labor — it does not and should not depend on any
booking-level flag being flipped by this route. Left a NOTE comment
explaining why no per-booking write belongs here, so it isn't
re-introduced.

## Verification
New test file `route.booking-status-untouched.test.ts`: seeds two
bookings for the paid team member — one with `payment_status: 'pending'`,
one already `payment_status: 'paid'` — both `status: 'completed'`. Calls
`POST /api/finance/payroll`. RED-confirmed pre-fix (reverted the fix via
`git apply -R`): both bookings' `status` flipped to `'paid'` (2/3 tests
failed for the predicted reason). GREEN after the fix: both bookings keep
`status: 'completed'`; `team_member_paid` also confirmed untouched
(`false`, as seeded — no accidental "fix" that sets the *other* field
instead, since no correct per-booking value exists for either).

Swept every other `.from('bookings').update(...)` site that touches
`status`/`payment_status` for a similar "wrong field" shape:
`finance/bank-transactions/[id]/match` and `api/email/monitor` both write
`payment_status: 'paid'` (the correct field, correctly scoped to the
specific booking the bank transaction/email matched) — no other site
writes `status: 'paid'` outside the two legitimate client-payment call
sites already named above.

Full suite green: 689/689 files, 3541 passed + 1 pre-existing expected-fail,
0 regressions. `tsc --noEmit` clean on the touched files (pre-existing
unrelated baseline errors elsewhere: admin-auth generated route types, two
unrelated cron test files, and the untracked SEO-lane `site-nav.ts` — none
mine). ESLint: 0 errors on the touched files (1 pre-existing
`no-unused-vars` warning on `getTenantForRequest`, present before this
change, not introduced by it). File-only, no push/deploy/DB.

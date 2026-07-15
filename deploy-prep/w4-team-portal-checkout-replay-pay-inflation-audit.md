# W4 finding: team-portal checkout has no re-checkout guard — cleaner can replay it to inflate their own payroll pay and the client's bill

**Severity: HIGH (real money — payroll + client billing).** **FIXED** (per leader 01:55 go-ahead) — see "Fix applied" section at the bottom.

## Where

`platform/src/app/api/team-portal/checkout/route.ts` (`POST`, the field-staff "check out of a job" endpoint used by every tenant).

## The bug

Compare to `checkin/route.ts`, which explicitly blocks a repeat call:

```ts
// checkin/route.ts:34-36
if (booking.check_in_time) {
  return NextResponse.json({ error: 'Already checked in' }, { status: 400 })
}
```

`checkout/route.ts` has no equivalent guard. The initial fetch (lines 26-35) only checks tenant + ownership:

```ts
const { data: booking } = await supabaseAdmin
  .from('bookings')
  .select('id, check_in_time, hourly_rate, pay_rate, team_size, max_hours, price, service_type_id, team_member_id, referrer_id, client_id, clients(name, address), team_members!bookings_team_member_id_fkey(pay_rate)')
  .eq('id', booking_id)
  .eq('tenant_id', auth.tid)
  .single()

if (!booking || booking.team_member_id !== auth.id) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
```

`check_out_time` and `status` are never selected or checked. The handler then unconditionally computes elapsed time as `now − check_in_time` (lines 60-98) and overwrites the booking:

```ts
const checkOutTime = new Date()
...
const rawMinutes = Math.max(0, (checkOutTime.getTime() - checkInParsed.getTime()) / 60000)
...
teamMemberPayCents = Math.round(billableCleaner * cleanerRate * 100)
updatedPriceCents = Math.round(billableClient * clientRate * teamSize * 100)  // (hourly path)
...
await supabaseAdmin.from('bookings').update({
  check_out_time: checkOutTime.toISOString(),
  ...
  actual_hours: actualHours,
  team_member_pay: teamMemberPayCents,
  price: updatedPriceCents,
}).eq('id', booking_id)...
```

Because `check_in_time` is never cleared and there's no status/already-checked-out check, calling this endpoint again N hours later recomputes `now − check_in_time` as if the cleaner were still on the clock, and **overwrites `team_member_pay` and `price` with the new, larger numbers**. Nothing about the request is single-use or idempotent for the billing math (referral-commission insert is idempotent via a DB unique constraint, but the pay/price fields are not).

## Why it's real money, not cosmetic

`bookings.team_member_pay` is read directly — with no independent re-derivation or sanity check — by:
- `app/api/finance/payroll-prep/route.ts:39,96` — `row.gross_pay_cents += Math.round(Number(b.team_member_pay || 0))` — this is literally what the tenant pays the cleaner.
- `app/api/finance/cleaner-income/route.ts`, `finance/pnl`, `finance/summary`, `finance/tax-export`, `finance/year-end-zip`, `lib/finance/post-labor.ts` (payroll journal posting) all trust this field.

`bookings.price` similarly feeds client-facing totals and (for NYC Maid tenants) the `processPayment` call in this same route (lines ~185-193), which can trigger a real Stripe Connect transfer to the cleaner using the freshly-inflated `updatedPriceCents`.

## Concrete exploit path

1. Cleaner checks in normally at 9:00am (`checkin` sets `check_in_time`).
2. Cleaner calls `POST /api/team-portal/checkout` at 11:00am with their own bearer token → booking priced/paid for 2 hrs, `team_member_pay` set for 2 hrs, `status: 'completed'`.
3. Cleaner (or anyone who captured/replayed their token, e.g. via the app's dev tools or a saved request) calls the **same endpoint again** at 6:00pm, same `booking_id`. Nothing rejects it — `check_in_time` is still on the row, status='completed' isn't checked. `rawMinutes` is now recomputed as 9 hours. `team_member_pay` and `price` are overwritten to the 9-hour amount.
4. Payroll-prep later sums `team_member_pay` verbatim → the cleaner is paid for 9 hours of a job that took 2. For NYC Maid tenants, the inflated `price` can also drive a second, larger `processPayment` transfer.

This requires only the cleaner's own (legitimate) team-portal bearer token and the `booking_id` they were already assigned — no cross-tenant or cross-account access needed, so it's within reach of any dishonest field worker, not just an attacker with elevated access.

## Suggested fix (not applied — file-only per lane rules)

Mirror the `checkin` guard: reject if `check_out_time` (or `status === 'completed'`) is already set, e.g.

```ts
.select('id, check_in_time, check_out_time, status, ...')
...
if (!booking || booking.team_member_id !== auth.id) return 404
if (booking.check_out_time) {
  return NextResponse.json({ error: 'Already checked out' }, { status: 400 })
}
```

An explicit "reopen/correct checkout" path for admins (not field staff) can still exist separately if the business needs a correction workflow — it should not be the same unguarded endpoint reachable by the cleaner's own portal token.

## What I checked

- Read `checkout/route.ts` in full and its `route.test.ts` (confirms no existing test covers repeat/duplicate checkout — the test suite only covers pricing-model math on a single call).
- Confirmed via grep that `team_member_pay` flows unmodified into `payroll-prep`, `cleaner-income`, `pnl`, `summary`, `tax-export`, `year-end-zip`, and the payroll journal poster (`lib/finance/post-labor.ts`).
- Confirmed `checkin/route.ts` has the equivalent guard checkout is missing, so this is an inconsistency/regression relative to the sibling endpoint, not an intentional design choice.
- Did not check whether the mobile/web team-portal client UI itself prevents a double-tap (client-side guard, if any, does not stop a direct API replay with a captured token).

## Not touched (per leader instruction)

Did not look at `referrers/`, `referral-commissions/`, or team-PIN routes for this pass.

## Fix applied

Applied the guard exactly as suggested above:
- Added `check_out_time` to the initial `select()`.
- Added `if (booking.check_out_time) return 400 'Already checked out'` immediately after the existing 404 ownership check, before any pay/price math runs.
- Added a regression test (`route.test.ts`): "400s on replay: a booking that already has check_out_time cannot be checked out again (no pay/price re-inflation)".

Verified: `npx vitest run src/app/api/team-portal/checkout/route.test.ts` → 10/10 passed (including the new test). `npx tsc --noEmit` → clean, no errors.

Did not add an admin "reopen/correct checkout" path — out of scope for this fix; flagged as a possible future need in the original finding above.

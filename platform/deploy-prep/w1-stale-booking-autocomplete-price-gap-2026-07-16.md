# Recurring archetype (billing surface) — health-check's stale-booking auto-complete skips price/payroll finalization entirely

Scope: 23:37 queue item (1)/(2), fresh-ground find while tracing the new monthly-invoice-consolidation feature (`src/lib/migrations/2026_07_16_recurring_invoice_consolidation.sql`, `src/app/api/cron/generate-monthly-invoices/route.ts`) back to where `bookings.price` actually gets set. Analysis-only — the fix requires replicating billing math I don't have full confidence duplicating solo (see below), so flagging rather than patching blind on money-affecting code.

## The gap

`cron/generate-recurring/route.ts` (the weekly job that materializes upcoming occurrences for every active `recurring_schedules` row) never sets `price` on the bookings it inserts — confirmed by grep, no `price` key anywhere in that route's insert object. For hourly-billed services (the majority pattern — NYC Maid and siblings), `price` is only ever finalized at actual checkout: `team-portal/checkout/route.ts` computes `updatedPriceCents` from elapsed check-in→check-out time × `hourly_rate` × team size, applies `applyRecurringDiscount`, and writes `price` + `actual_hours` + `team_member_pay` together with `status: 'completed'` in one update (lines 71–144).

`cron/health-check/route.ts`'s stale-booking sweep (lines 211–233) is a **second, independent path** that also sets `status: 'completed'`: any booking still `in_progress` 4+ hours past `end_time` (a cleaner who forgot to check out) gets force-completed with only `status` + a `[Auto-completed by system...]` note. It does **not** set `price`, `actual_hours`, `team_member_pay`, or `check_out_time`. For a recurring booking that never had a `price` set at creation (the normal case per above), this leaves `price` permanently `NULL`.

## Concrete downstream impact

- `buildConsolidatedLineItems` (`src/lib/invoice-consolidation.ts:26`) does `Math.max(0, Number(b.price) || 0)` — a `NULL` price becomes a **$0 line item** on the client's monthly rollup statement, for a real visit that was actually performed. Silent under-billing, not a crash, so nothing surfaces it.
- `team_member_pay` also never gets computed for these bookings — payroll-prep reads that column directly for gross pay (per `checkout/route.ts`'s own comment on why double-checkout is guarded: "read directly by finance/payroll-prep for gross pay"), so the cleaner who did the work also doesn't get paid for it unless someone notices and manually intervenes.
- `actual_hours` stays `NULL`, so anything downstream keyed on hours worked (payroll, the 15-min-alert self-booking discount logic, reporting) also sees nothing for this visit.
- This isn't consolidation-specific — any per-visit invoice generated from one of these bookings has the same $0/NULL exposure. Monthly consolidation just made it concretely visible while tracing that feature.

## Why this is a doc, not a patch

The correct fix is to make the auto-complete path finalize price the same way checkout does, but that formula (`checkout/route.ts:48–118`) is not a one-liner: it branches on the service's `pricing_model` (hourly vs flat/per-unit, a `service_types` lookup), applies `min_charge_cents`, computes both client-billed and cleaner-paid hours with different rounding/grace windows (`clientBilledHours` vs `cleanerPaidHours`), applies a tenant-specific pay floor (NYC Maid only, keyed on job address), and applies the recurring discount. Replicating that solo inside `cron/health-check` risks a subtle mismatch with the real checkout math on billing/payroll code — exactly the kind of change that deserves the shared-helper treatment (extract checkout's pricing block into something both routes call), reviewed and tested against real data, not a same-session blind port.

There's also a policy question the fix needs before implementation: when a cleaner never checked out, is "assume they worked until `end_time`" (use the scheduled duration, not open-ended elapsed time) the right assumption for the finalization calc, or should this instead route to a "needs manual review" queue (flag + notify, don't auto-price) since nobody confirmed actual duration? Either is defensible; that's a product call, not a code call.

## Proposed next step (not built)

1. Extract `checkout/route.ts`'s pricing block (lines ~48–118) into a shared helper (e.g. `computeCheckoutPrice(booking, serviceType, teamMember)` in `src/lib/billing-hours.ts` or a new `src/lib/booking-pricing.ts`) that both `team-portal/checkout` and `cron/health-check`'s stale-booking sweep call.
2. Decide the "assumed duration" policy above with leader/Jeff before wiring the cron to call it — auto-pricing off a guessed duration is a different risk profile than a same-day human-confirmed checkout.
3. Until then, minimal safety net worth considering: have the health-check sweep flag these bookings (e.g. `payment_status: 'needs_review'` or a dedicated notification) instead of silently leaving `price` null, so at least the $0 consolidation line item is visible as "unpriced" rather than indistinguishable from a legitimately free visit.

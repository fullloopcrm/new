// Recurring-service discount ("save 20%"), mirrored from standalone nycmaid:
//   • weekly                       → 20% off
//   • biweekly / triweekly / monthly → 10% off
//   • one-time / none              → no discount
// Pure helper, no imports — safe for client + server.
//
// 'monthly' is kept alongside 'monthly_date'/'monthly_weekday' for any legacy row --
// every current enum-validated write path (admin/recurring-schedules, dashboard/schedules,
// client/recurring, CSV import) persists the real RecurringType (lib/recurring.ts) values,
// which are monthly_date/monthly_weekday, never bare 'monthly'.
//
// 'triweekly' is a real, staff-selectable RecurringType (quote builder's recurring
// cadence picker, dashboard/schedules) that reaches real bookings via
// sale-to-recurring.ts and gets billed through team-portal/checkout's
// applyRecurringDiscount call same as every other cadence -- it had no case here
// (added to RecurringType after this function's original 3-tier nycmaid mirror),
// so it silently fell through to 0% while both its neighbors in frequency
// (biweekly, monthly) get 10%. Filling the gap at the same 10% tier as those
// neighbors, not introducing a new pricing policy.

export function recurringDiscountPct(recurringType: string | null | undefined): number {
  const normalized = (recurringType || '').toLowerCase().replace(/[\s_]/g, '-')
  // "1st-mon" / "3rd-fri" -- BookingsAdmin.tsx's own monthly_day display-string convention
  // (dashboard/bookings/_recurring.ts's getRecurringDisplayName, stored verbatim as
  // recurring_type instead of an enum key). Same monthly tier as monthly_date/monthly_weekday.
  if (/^\d(st|nd|rd|th)-/.test(normalized)) return 0.10
  switch (normalized) {
    case 'weekly':
      return 0.20
    case 'biweekly':
    case 'bi-weekly':
    case 'triweekly':
    case 'tri-weekly':
    case 'monthly':
    case 'monthly-date':
    case 'monthly-weekday':
      return 0.10
    default:
      return 0
  }
}

/** Apply the recurring discount to a price (any unit — cents or dollars). Rounds to integer. */
export function applyRecurringDiscount(price: number, recurringType: string | null | undefined): number {
  const pct = recurringDiscountPct(recurringType)
  if (pct === 0) return price
  return Math.round(price * (1 - pct))
}

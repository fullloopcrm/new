// Recurring-service discount ("save 20%"), mirrored from standalone nycmaid:
//   • weekly    → 20% off
//   • biweekly  → 10% off
//   • monthly   → 5% off (Jeff, 2026-07-25 -- was 10%, same as biweekly, until
//     this fix gave monthly its own lower tier)
//   • one-time / none → no discount
// Pure helper, no imports — safe for client + server.

export function recurringDiscountPct(recurringType: string | null | undefined): number {
  switch ((recurringType || '').toLowerCase().replace(/[\s_]/g, '-')) {
    case 'weekly':
      return 0.20
    case 'biweekly':
    case 'bi-weekly':
      return 0.10
    case 'monthly':
    // recurring_schedules.recurring_type actually stores 'monthly-date' /
    // 'monthly-weekday' (RecurringType in lib/recurring.ts), never the bare
    // string 'monthly' -- that case never matched anything real, so every
    // monthly recurring schedule silently got 0% instead of the intended
    // rate. Fixed to match the real stored values.
    case 'monthly-date':
    case 'monthly-weekday':
      return 0.05
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

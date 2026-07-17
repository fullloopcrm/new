// Shared helper for building a "last N months" chart skeleton, used by both
// finance/revenue and admin/finance's monthly-trend endpoints (previously
// duplicated verbatim in each route.ts with an identical bug).
//
// The buggy version mutated `new Date()` via setMonth(getMonth() - i): when
// today's day-of-month is 29-31 and stepping back lands on a shorter month
// (e.g. Jul 31 -> Feb), Date normalizes the overflow into the FOLLOWING
// month, silently skipping a month's key and duplicating another. Since the
// caller only adds a booking's revenue when `key in monthMap`, the skipped
// month's real revenue is dropped from the chart entirely, on the 29th-31st
// of any month. Pinning the day to 1 avoids the overflow -- day 1 exists in
// every month.
export function buildTrailingMonthKeys(count: number, anchor: Date = new Date()): string[] {
  const keys: string[] = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1)
    keys.push(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }))
  }
  return keys
}

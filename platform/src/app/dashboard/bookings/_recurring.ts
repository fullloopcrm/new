// Shared recurring date generation logic
// Used by both RecurringOptions.tsx (client) and cron/generate-recurring (server)
import { filterHolidays } from '@/lib/holidays'

export function generateRecurringDates(
  startDate: string,
  repeatEnabled: boolean,
  repeatType: string,
  repeatEnd: string,
  repeatEndCount: number,
  repeatEndDate: string,
  customInterval: number
): string[] {
  if (!repeatEnabled || !startDate) return [startDate]

  const dates: string[] = []
  const start = new Date(startDate + 'T12:00:00')

  // "Never" = through end of next year, "after" = specific count
  const endOfNextYear = new Date(start.getFullYear() + 1, 11, 31)
  const maxDates = repeatEnd === 'after' ? repeatEndCount : 500 // high cap, date limit will stop it
  const endDate = repeatEnd === 'never'
    ? endOfNextYear
    : (repeatEnd === 'on_date' && repeatEndDate ? new Date(repeatEndDate + 'T12:00:00') : null)

  let current = new Date(start)

  // For monthly_day, we need special handling
  if (repeatType === 'monthly_day') {
    const targetDay = start.getDay() // 0-6
    const targetWeek = Math.ceil(start.getDate() / 7) // 1-5

    let month = start.getMonth()
    let year = start.getFullYear()

    while (dates.length < maxDates) {
      // Collect every occurrence of targetDay in this month, then pick the
      // targetWeek-th one -- or the month's LAST occurrence if it has fewer
      // than targetWeek (e.g. a schedule anchored on a month's 5th Friday
      // falls back to that month's 4th/last Friday when the target month has
      // no 5th). Matches lib/recurring.ts's monthly_weekday fallback -- the
      // old fixed-offset version (firstOccurrence + (targetWeek-1)*7) just
      // dropped the month entirely once it ran out of occurrences, silently
      // skipping a scheduled visit instead of substituting one.
      const occurrences: number[] = []
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      for (let d = 1; d <= daysInMonth; d++) {
        if (new Date(year, month, d).getDay() === targetDay) occurrences.push(d)
      }
      const targetDate = occurrences[Math.min(targetWeek, occurrences.length) - 1]
      // Noon anchor (matches `start`'s own 'T12:00:00' construction) -- a
      // bare `new Date(year, month, targetDate)` is midnight, which compared
      // LESS than `start` (noon) whenever targetDate landed on the anchor's
      // own day, silently excluding the anchor month's own occurrence from
      // every monthly_day schedule (the very visit the admin just selected).
      const date = new Date(year, month, targetDate, 12, 0, 0)
      if (date >= start) {
        if (endDate && date > endDate) break
        dates.push(date.toISOString().split('T')[0])
      }

      month++
      if (month > 11) { month = 0; year++ }
    }
    return dates
  }

  // For monthly_date, same special handling as monthly_day above: recompute
  // each month's anchor from month/year integer counters + the ORIGINAL
  // day-of-month, clamped to that month's last day, instead of chaining
  // setMonth() off the previous result. The old chained version (still used
  // below for daily/weekly/etc, harmless there since those never overflow a
  // day-of-month) let one short month permanently shift a monthly_date
  // schedule's day forward for every later month -- e.g. a Jan-31 anchor's
  // setMonth() call overflows Feb 31 into Mar 3, then Mar 3 + 1mo -> Apr 3 ->
  // ... stabilizing at day 3 FOREVER, never returning to 31 even in a real
  // 31-day month. This is the exact array of dates this admin form both
  // previews AND submits verbatim to /api/admin/recurring-schedules +
  // /api/bookings/batch, so the corrupted day silently became the client's
  // real permanent recurring day, not just a display glitch.
  if (repeatType === 'monthly_date') {
    const targetDate = start.getDate()
    let month = start.getMonth()
    let year = start.getFullYear()

    while (dates.length < maxDates) {
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      const date = new Date(year, month, Math.min(targetDate, daysInMonth), 12, 0, 0)
      if (date >= start) {
        if (endDate && date > endDate) break
        dates.push(date.toISOString().split('T')[0])
      }

      month++
      if (month > 11) { month = 0; year++ }
    }
    return dates
  }

  // For other types
  while (dates.length < maxDates) {
    if (endDate && current > endDate) break
    dates.push(current.toISOString().split('T')[0])

    switch (repeatType) {
      case 'daily':
        current.setDate(current.getDate() + 1)
        break
      case 'weekly':
        current.setDate(current.getDate() + 7)
        break
      case 'biweekly':
        current.setDate(current.getDate() + 14)
        break
      case 'triweekly':
        current.setDate(current.getDate() + 21)
        break
      case 'custom':
        current.setDate(current.getDate() + (customInterval * 7)) // weeks, not days
        break
      default:
        current.setDate(current.getDate() + 7)
    }
  }

  return dates
}

// Helper to get display name for recurring type
export function getRecurringDisplayName(
  repeatType: string,
  startDate: string
): string | null {
  if (!startDate) return null

  const date = new Date(startDate + 'T12:00:00')
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dayName = dayNames[date.getDay()]
  const weekNum = Math.ceil(date.getDate() / 7)
  const weekNames = ['1st', '2nd', '3rd', '4th', '5th']

  switch (repeatType) {
    case 'daily': return 'Daily'
    case 'weekly': return 'Weekly'
    case 'biweekly': return 'Bi-weekly'
    case 'triweekly': return 'Tri-weekly'
    case 'monthly_date': return 'Monthly'
    case 'monthly_day': return `${weekNames[weekNum-1]} ${dayName}`
    case 'custom': return 'Custom'
    default: return null
  }
}

// Generate dates for cron: generates N weeks of future dates from a schedule
export function generateScheduleDates(
  startFromDate: string, // YYYY-MM-DD to start generating from
  recurringType: string, // display name: 'Weekly', 'Bi-weekly', etc.
  dayOfWeek: number, // 0=Sun..6=Sat
  weeksOut: number = 4
): string[] {
  const dates: string[] = []
  const start = new Date(startFromDate + 'T12:00:00')
  const lower = recurringType.toLowerCase()
  // For monthly patterns, look further ahead to ensure we catch next occurrence
  const effectiveWeeks = (lower.includes('monthly') || recurringType.match(/^\d(st|nd|rd|th)\s/)) ? Math.max(weeksOut, 16) : weeksOut
  const endDate = new Date(start)
  endDate.setDate(endDate.getDate() + effectiveWeeks * 7)

  // Map display name back to repeat interval
  const intervalDays = getIntervalDays(recurringType)

  // Handle monthly patterns FIRST — both display names and raw types
  const isMonthlyDate = lower === 'monthly' || lower === 'monthly_date'
  const isMonthlyDay = lower === 'monthly_day' || recurringType.match(/^\d(st|nd|rd|th)\s/)
  if (isMonthlyDate || isMonthlyDay) {
    const targetWeek = recurringType.match(/^(\d)(st|nd|rd|th)\s/)
      ? parseInt(recurringType[0])
      : Math.ceil(start.getDate() / 7)

    let month = start.getMonth()
    let year = start.getFullYear()

    while (dates.length < 12) {
      if (isMonthlyDate) {
        // Monthly on same date
        const d = new Date(year, month, start.getDate())
        if (d > start && d <= endDate) {
          dates.push(d.toISOString().split('T')[0])
        }
      } else {
        // Monthly on Nth weekday (e.g., "3rd Fri" or monthly_day)
        const firstOfMonth = new Date(year, month, 1)
        let firstOccurrence = 1
        while (new Date(year, month, firstOccurrence).getDay() !== dayOfWeek) {
          firstOccurrence++
        }
        const targetDate = firstOccurrence + (targetWeek - 1) * 7
        const lastDay = new Date(year, month + 1, 0).getDate()
        if (targetDate <= lastDay) {
          const d = new Date(year, month, targetDate)
          if (d >= start && d <= endDate) {
            dates.push(d.toISOString().split('T')[0])
          }
        }
      }
      month++
      if (month > 11) { month = 0; year++ }
      if (new Date(year, month, 1) > endDate) break
    }
    return filterHolidays(dates)
  }

  // Standard interval-based types (weekly, biweekly, etc.)
  if (intervalDays === 0) return filterHolidays(dates) // unknown type, bail

  let current = new Date(start)
  // Advance to next occurrence of dayOfWeek
  while (current.getDay() !== dayOfWeek) {
    current.setDate(current.getDate() + 1)
  }
  // If we landed on start date, skip to next (we don't regenerate existing)
  if (current.toISOString().split('T')[0] === startFromDate) {
    current.setDate(current.getDate() + intervalDays)
  }

  while (current <= endDate && dates.length < 20) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + intervalDays)
  }

  return filterHolidays(dates)
}

// Payload for PUT /api/bookings/batch-update's "pattern unchanged, apply to
// all future occurrences" edit in BookingsAdmin.tsx. That route spreads this
// object straight into `supabaseAdmin.from('bookings').update(data)` with no
// field allowlist/aliasing (unlike its single-booking, /regenerate, and
// recurring-schedules PUT siblings, which all alias the nycmaid-era
// `cleaner_id` body key to the real `bookings.team_member_id` column).
// bookings has never had a `cleaner_id` column -- only the legacy per-tenant
// site booking tables ported in from nycmaid do -- so sending `cleaner_id`
// here 400s every row in the batch on an unknown-column error, and the
// resulting `if (!res.ok)` early-return silently skips BOTH the schedule-
// record PUT and the per-booking team save that follow it, breaking the
// entire "apply to all future" edit (price/notes/hours/lead reassignment)
// whenever the recurring pattern itself wasn't also changed.
export function buildSeriesUpdateData(opts: {
  startTime: string
  endTime: string
  teamMemberId: string | null
  price: number
  hourlyRate: number | null
  serviceType: string
  notes: string | null
  recurringType: string | null
  discountPercent?: number | null
}): Record<string, unknown> {
  return {
    start_time: opts.startTime,
    end_time: opts.endTime,
    team_member_id: opts.teamMemberId,
    price: opts.price,
    hourly_rate: opts.hourlyRate,
    service_type: opts.serviceType,
    notes: opts.notes,
    recurring_type: opts.recurringType,
    discount_percent: opts.discountPercent ?? null,
  }
}

function getIntervalDays(recurringType: string): number {
  const lower = recurringType.toLowerCase()
  // Handle both display names ('Weekly', 'Bi-weekly') and raw types ('weekly', 'biweekly')
  switch (lower) {
    case 'daily': return 1
    case 'weekly': return 7
    case 'bi-weekly':
    case 'biweekly': return 14
    case 'tri-weekly':
    case 'triweekly': return 21
    case 'monthly':
    case 'monthly_date': return 0 // handled separately
    case 'monthly_day': return 0 // handled separately
    case 'custom': return 7 // fallback
    default:
      // Monthly day patterns like "1st Mon", "3rd Fri"
      if (recurringType.match(/^\d(st|nd|rd|th)\s/)) return 0
      return 7
  }
}

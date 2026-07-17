// Recurring date generation utility

export type RecurringType =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'triweekly'
  | 'monthly_date'
  | 'monthly_weekday'
  | 'custom'

export function generateRecurringDates({
  recurringType,
  startDate,
  dayOfWeek,
  weeksToGenerate = 4,
}: {
  recurringType: RecurringType
  startDate: Date
  dayOfWeek?: number // 0=Sun, 1=Mon, ...
  weeksToGenerate?: number
}): Date[] {
  const dates: Date[] = []
  const current = new Date(startDate)

  switch (recurringType) {
    case 'daily':
      for (let i = 0; i < weeksToGenerate * 7; i++) {
        dates.push(new Date(current))
        current.setDate(current.getDate() + 1)
      }
      break

    case 'weekly':
      for (let i = 0; i < weeksToGenerate; i++) {
        dates.push(new Date(current))
        current.setDate(current.getDate() + 7)
      }
      break

    case 'biweekly':
      for (let i = 0; i < weeksToGenerate; i++) {
        dates.push(new Date(current))
        current.setDate(current.getDate() + 14)
      }
      break

    case 'triweekly':
      for (let i = 0; i < weeksToGenerate; i++) {
        dates.push(new Date(current))
        current.setDate(current.getDate() + 21)
      }
      break

    case 'monthly_date':
      for (let i = 0; i < weeksToGenerate; i++) {
        dates.push(new Date(current))
        current.setMonth(current.getMonth() + 1)
      }
      break

    case 'monthly_weekday': {
      // Same weekday, same week-of-month
      const weekOfMonth = Math.ceil(current.getDate() / 7)
      const targetDay = dayOfWeek ?? current.getDay()
      for (let i = 0; i < weeksToGenerate; i++) {
        if (i === 0) {
          dates.push(new Date(current))
        } else {
          const next = new Date(current)
          next.setMonth(next.getMonth() + i)
          next.setDate(1)
          // Find the nth occurrence of targetDay
          let count = 0
          while (count < weekOfMonth) {
            if (next.getDay() === targetDay) count++
            if (count < weekOfMonth) next.setDate(next.getDate() + 1)
          }
          dates.push(next)
        }
      }
      break
    }

    case 'custom':
      // Custom handled by caller
      dates.push(new Date(current))
      break
  }

  return dates
}

/**
 * Compute the occurrence dates a refill pass (cron/generate-recurring) should
 * ADD, given the date of the LAST already-materialized booking for a
 * schedule. Anchors on `lastOccurrence` itself — generateRecurringDates
 * always echoes its startDate as dates[0] — then drops that echo, so the
 * first NEW date is a full interval after the last real occurrence.
 *
 * generate-recurring used to anchor on `lastOccurrence + 1 day` instead of
 * this. Because generateRecurringDates emits startDate as its first result,
 * that made every refill's first (and therefore every subsequent, since each
 * one steps a fixed interval off the previous) generated date land 1 day
 * after the last visit instead of a full interval after — e.g. a weekly
 * Monday visit's next refill started on Tuesday, and kept sliding one weekday
 * later every time the schedule's 4-week buffer topped up. Anchoring here
 * (and reusing the exact per-type stepping generateRecurringDates already
 * gets right, including monthly_weekday's week-of-month math) fixes every
 * recurringType at once instead of re-deriving interval-day math per type.
 */
export function nextOccurrenceDates({
  recurringType,
  lastOccurrence,
  dayOfWeek,
  count = 4,
}: {
  recurringType: RecurringType
  lastOccurrence: Date
  dayOfWeek?: number
  count?: number
}): Date[] {
  return generateRecurringDates({
    recurringType,
    startDate: lastOccurrence,
    dayOfWeek,
    weeksToGenerate: count + 1,
  }).slice(1)
}

/**
 * Combine a 'YYYY-MM-DD' date + start hour/minute + duration into naive local
 * start/end ISO strings ('YYYY-MM-DDTHH:MM:SS', no timezone offset) for
 * booking storage. Rolls the end time onto the next calendar date when the
 * duration crosses midnight.
 *
 * Every recurring-booking writer (sale-to-recurring.ts, the admin
 * recurring-schedules POST/regenerate routes, the per-occurrence exception
 * route) used to compute end-of-visit as `(startMin + durationMin) % 1440`
 * without ever advancing the date — a start_time late enough in the day for
 * the visit to cross midnight (e.g. 23:00 start + 3h duration) silently
 * produced an end_time BEFORE start_time on the SAME calendar date (02:00,
 * not 02:00 the next day) instead of rolling over. Centralized here so the
 * fix applies identically everywhere instead of drifting per call site.
 */
export function computeNaiveVisitWindow(
  date: string,
  startHour: number,
  startMinute: number,
  durationHours: number,
): { startISO: string; endISO: string } {
  const pad = (n: number) => String(n).padStart(2, '0')
  const startISO = `${date}T${pad(startHour)}:${pad(startMinute)}:00`
  const totalStartMin = startHour * 60 + startMinute
  const totalEndMin = totalStartMin + Math.round(durationHours * 60)
  const daysToAdd = Math.floor(totalEndMin / 1440)
  const endMinOfDay = ((totalEndMin % 1440) + 1440) % 1440
  const endH = Math.floor(endMinOfDay / 60)
  const endM = endMinOfDay % 60
  let endDate = date
  if (daysToAdd !== 0) {
    // Noon-UTC anchor so adding whole days can't slip a date at a DST edge.
    const d = new Date(`${date}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() + daysToAdd)
    endDate = d.toISOString().slice(0, 10)
  }
  const endISO = `${endDate}T${pad(endH)}:${pad(endM)}:00`
  return { startISO, endISO }
}

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
    // 'monthly_day' is BookingsAdmin.tsx's own repeat_type convention (dashboard/bookings/_recurring.ts);
    // 'monthly_weekday' is the real persisted RecurringType enum value for the same pattern.
    case 'monthly_day':
    case 'monthly_weekday':
      return `${weekNames[weekNum-1]} ${dayName}`
    case 'custom': return 'Custom'
    default: return null
  }
}

/**
 * Customer-facing label for a stored `recurring_type` value. Wraps
 * getRecurringDisplayName with a raw-value fallback (never renders blank, never
 * worse than the unformatted enum string that was showing before this existed) --
 * for use anywhere a booking's recurring_type reaches a customer (emails, portal).
 */
export function formatRecurringLabel(
  recurringType: string | null | undefined,
  startDateTime: string | null | undefined
): string {
  if (!recurringType) return ''
  const startDate = startDateTime ? startDateTime.slice(0, 10) : ''
  return getRecurringDisplayName(recurringType, startDate) || recurringType
}

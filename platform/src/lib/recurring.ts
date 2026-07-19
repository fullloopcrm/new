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

/**
 * bookings.start_time/end_time are stored as naive 'YYYY-MM-DDTHH:MM:SS'
 * strings in America/New_York wall-clock time, no timezone suffix. A plain
 * `new Date().toISOString()` produces a naive-looking string too, but it's
 * genuinely UTC -- treating it as "now" for a naive-ET comparison silently
 * skews every now-cutoff by the ET/UTC gap (4h EDT / 5h EST). Use this
 * instead wherever "now" needs to be compared against a naive-ET column.
 */
export function nowNaiveET(msOffset = 0): string {
  const d = new Date(Date.now() + msOffset)
  const date = d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  const time = d.toLocaleTimeString('en-GB', { timeZone: 'America/New_York', hour12: false })
  return `${date}T${time}`
}

/**
 * The inverse of nowNaiveET(): converts an arbitrary naive 'YYYY-MM-DDTHH:MM:SS'
 * America/New_York wall-clock string (the bookings.start_time/end_time
 * convention) into the real UTC instant it represents. `src/lib/dates.ts`'s
 * parseTimestamp() deliberately forces UTC interpretation instead -- correct
 * for check_in_time/check_out_time (genuinely UTC) but wrong for
 * start_time/end_time. Use this for naive-ET columns instead.
 */
export function parseNaiveET(naive: string): Date {
  const guess = new Date(naive.endsWith('Z') ? naive : `${naive}Z`)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(guess)
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value)
  const hour = get('hour')
  const etAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), hour === 24 ? 0 : hour, get('minute'), get('second'))
  const offsetMs = etAsUtc - guess.getTime()
  return new Date(guess.getTime() - offsetMs)
}

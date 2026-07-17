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

    case 'monthly_date': {
      // Recompute each month's date fresh off the ORIGINAL anchor day,
      // clamped to that month's last day — never chain setMonth() off the
      // previous iteration's result. A day-29/30/31 anchor that overflows a
      // short month (Jan 31 -> setMonth(+1) rolls to Mar 3, since Feb has no
      // 31st) must not become the new permanent baseline for every month
      // after it (Mar 3 -> Apr 3 -> ... forever). Zeroing to day 1 before
      // advancing the month avoids the overflow entirely; clamping the
      // final day to the target month's real length reproduces "same date
      // each month" semantics (Jan 31 -> Feb 28 -> Mar 31, not Mar 3).
      const anchorDay = current.getDate()
      for (let i = 0; i < weeksToGenerate; i++) {
        const d = new Date(current)
        d.setDate(1)
        d.setMonth(d.getMonth() + i)
        const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
        d.setDate(Math.min(anchorDay, lastDayOfMonth))
        dates.push(d)
      }
      break
    }

    case 'monthly_weekday': {
      // Same weekday, same week-of-month
      const weekOfMonth = Math.ceil(current.getDate() / 7)
      const targetDay = dayOfWeek ?? current.getDay()
      for (let i = 0; i < weeksToGenerate; i++) {
        if (i === 0) {
          dates.push(new Date(current))
        } else {
          const next = new Date(current)
          // Zero the day-of-month BEFORE advancing the month. current's
          // original day can be 29-31; advancing the month first (the old
          // order) can overflow past the intended month on a short target
          // month (e.g. Jan 29 -> setMonth(+1) while day=29 -> Feb 29
          // doesn't exist in a non-leap year -> rolls to Mar 1), silently
          // skipping the intended month's occurrence entirely.
          next.setDate(1)
          next.setMonth(next.getMonth() + i)
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

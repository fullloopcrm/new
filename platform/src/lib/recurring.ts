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
      // Anchor each date off the ORIGINAL startDate (day-of-month) + i months,
      // clamped to that target month's actual last day — not iterative
      // current.setMonth() mutation, which overflows a 31st into next month
      // (Jan 31 + 1mo = "Feb 31" -> rolls to Mar 3) and then permanently
      // drifts every subsequent iteration (Mar 3 -> Apr 3 -> ...), never
      // landing on the 31st/30th/29th again.
      const targetDom = current.getDate()
      for (let i = 0; i < weeksToGenerate; i++) {
        const anchor = new Date(current.getFullYear(), current.getMonth() + i, 1,
          current.getHours(), current.getMinutes(), current.getSeconds(), current.getMilliseconds())
        const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate()
        anchor.setDate(Math.min(targetDom, daysInMonth))
        dates.push(anchor)
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
          // setDate(1) MUST run before setMonth() — current's day-of-month
          // (e.g. 31) is still set on `next` at this point, so advancing the
          // month first overflows a target month shorter than 31 days (e.g.
          // Feb) into the month after it, before setDate(1) ever runs.
          next.setDate(1)
          next.setMonth(next.getMonth() + i)
          const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
          // Find the nth occurrence of targetDay, but a "5th <weekday>" doesn't
          // exist in every month. Search only within the target month; if it
          // never reaches weekOfMonth occurrences, fall back to the LAST
          // occurrence in that month instead of letting the unbounded search
          // roll into (and past) the following month entirely.
          let count = 0
          let lastMatch: Date | null = null
          for (let day = 1; day <= daysInMonth; day++) {
            next.setDate(day)
            if (next.getDay() === targetDay) {
              count++
              lastMatch = new Date(next)
              if (count === weekOfMonth) break
            }
          }
          dates.push(count >= weekOfMonth ? next : (lastMatch || next))
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

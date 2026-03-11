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

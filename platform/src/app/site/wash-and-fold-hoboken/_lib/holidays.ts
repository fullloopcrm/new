// Major US holidays — no scheduling on these dates
// Covers fixed dates + computed floating holidays (Memorial Day, Labor Day, Thanksgiving)

interface Holiday {
  name: string
  date: string // YYYY-MM-DD
}

function getHolidaysForYear(year: number): Holiday[] {
  const holidays: Holiday[] = [
    { name: "New Year's Day", date: `${year}-01-01` },
    { name: 'Independence Day', date: `${year}-07-04` },
    { name: 'Christmas Eve', date: `${year}-12-24` },
    { name: 'Christmas Day', date: `${year}-12-25` },
    { name: "New Year's Eve", date: `${year}-12-31` },
  ]

  // MLK Day — 3rd Monday of January
  holidays.push({ name: 'MLK Day', date: nthWeekday(year, 0, 1, 3) })

  // Presidents Day — 3rd Monday of February
  holidays.push({ name: "Presidents' Day", date: nthWeekday(year, 1, 1, 3) })

  // Memorial Day — last Monday of May
  holidays.push({ name: 'Memorial Day', date: lastWeekday(year, 4, 1) })

  // Labor Day — 1st Monday of September
  holidays.push({ name: 'Labor Day', date: nthWeekday(year, 8, 1, 1) })

  // Thanksgiving — 4th Thursday of November
  holidays.push({ name: 'Thanksgiving', date: nthWeekday(year, 10, 4, 4) })

  // Day after Thanksgiving
  const thanksgiving = new Date(nthWeekday(year, 10, 4, 4) + 'T12:00:00')
  thanksgiving.setDate(thanksgiving.getDate() + 1)
  holidays.push({ name: 'Day After Thanksgiving', date: toDateStr(thanksgiving) })

  return holidays.sort((a, b) => a.date.localeCompare(b.date))
}

// Get Nth weekday of a month (e.g., 3rd Monday of January)
// weekday: 0=Sun, 1=Mon, ..., 6=Sat
function nthWeekday(year: number, month: number, weekday: number, n: number): string {
  let count = 0
  for (let day = 1; day <= 31; day++) {
    const d = new Date(year, month, day)
    if (d.getMonth() !== month) break
    if (d.getDay() === weekday) {
      count++
      if (count === n) return toDateStr(d)
    }
  }
  return `${year}-${String(month + 1).padStart(2, '0')}-01` // fallback
}

// Get last weekday of a month (e.g., last Monday of May)
function lastWeekday(year: number, month: number, weekday: number): string {
  const lastDay = new Date(year, month + 1, 0).getDate()
  for (let day = lastDay; day >= 1; day--) {
    const d = new Date(year, month, day)
    if (d.getDay() === weekday) return toDateStr(d)
  }
  return `${year}-${String(month + 1).padStart(2, '0')}-01` // fallback
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Cache holidays for current + next year
let cachedHolidays: Map<string, string> | null = null
let cachedYear: number = 0

function getHolidayMap(): Map<string, string> {
  const year = new Date().getFullYear()
  if (cachedHolidays && cachedYear === year) return cachedHolidays

  cachedHolidays = new Map()
  for (const h of getHolidaysForYear(year)) cachedHolidays.set(h.date, h.name)
  for (const h of getHolidaysForYear(year + 1)) cachedHolidays.set(h.date, h.name)
  cachedYear = year
  return cachedHolidays
}

/**
 * Check if a date (YYYY-MM-DD) is a holiday.
 * Returns the holiday name or null.
 */
export function isHoliday(date: string): string | null {
  return getHolidayMap().get(date) || null
}

/**
 * Filter out holidays from a list of dates.
 */
export function filterHolidays(dates: string[]): string[] {
  const map = getHolidayMap()
  return dates.filter(d => !map.has(d))
}

/**
 * Get all holidays for display (current + next year).
 */
export function getAllHolidays(): Holiday[] {
  const year = new Date().getFullYear()
  return [...getHolidaysForYear(year), ...getHolidaysForYear(year + 1)]
}

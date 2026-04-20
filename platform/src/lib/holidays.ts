// US federal/commercial holidays — no scheduling on these dates by default.
// Tenant-agnostic (federal calendar). If a tenant wants custom holidays,
// store them in tenant_settings and layer on top of isHoliday().

interface Holiday {
  name: string
  date: string // YYYY-MM-DD
}

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
  return `${year}-${String(month + 1).padStart(2, '0')}-01`
}

function lastWeekday(year: number, month: number, weekday: number): string {
  const lastDay = new Date(year, month + 1, 0).getDate()
  for (let day = lastDay; day >= 1; day--) {
    const d = new Date(year, month, day)
    if (d.getDay() === weekday) return toDateStr(d)
  }
  return `${year}-${String(month + 1).padStart(2, '0')}-01`
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getHolidaysForYear(year: number): Holiday[] {
  const holidays: Holiday[] = [
    { name: "New Year's Day", date: `${year}-01-01` },
    { name: 'Independence Day', date: `${year}-07-04` },
    { name: 'Christmas Eve', date: `${year}-12-24` },
    { name: 'Christmas Day', date: `${year}-12-25` },
    { name: "New Year's Eve", date: `${year}-12-31` },
  ]

  holidays.push({ name: 'MLK Day', date: nthWeekday(year, 0, 1, 3) })
  holidays.push({ name: "Presidents' Day", date: nthWeekday(year, 1, 1, 3) })
  holidays.push({ name: 'Memorial Day', date: lastWeekday(year, 4, 1) })
  holidays.push({ name: 'Labor Day', date: nthWeekday(year, 8, 1, 1) })
  holidays.push({ name: 'Thanksgiving', date: nthWeekday(year, 10, 4, 4) })

  const thanksgiving = new Date(nthWeekday(year, 10, 4, 4) + 'T12:00:00')
  thanksgiving.setDate(thanksgiving.getDate() + 1)
  holidays.push({ name: 'Day After Thanksgiving', date: toDateStr(thanksgiving) })

  return holidays.sort((a, b) => a.date.localeCompare(b.date))
}

let cachedMap: Map<string, string> | null = null
let cachedYear: number = 0

function getHolidayMap(): Map<string, string> {
  const year = new Date().getFullYear()
  if (cachedMap && cachedYear === year) return cachedMap

  cachedMap = new Map()
  for (const h of getHolidaysForYear(year)) cachedMap.set(h.date, h.name)
  for (const h of getHolidaysForYear(year + 1)) cachedMap.set(h.date, h.name)
  cachedYear = year
  return cachedMap
}

export function isHoliday(date: string): string | null {
  return getHolidayMap().get(date) || null
}

export function filterHolidays(dates: string[]): string[] {
  const map = getHolidayMap()
  return dates.filter(d => !map.has(d))
}

export function getAllHolidays(): Holiday[] {
  const year = new Date().getFullYear()
  return [...getHolidaysForYear(year), ...getHolidaysForYear(year + 1)]
}

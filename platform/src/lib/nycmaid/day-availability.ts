// Cleaner availability — day-of-week and schedule helpers.
//
// `team_members.working_days` and `team_members.schedule` exist in TWO historical
// formats across rows, and every matcher must agree on both:
//
//   • numeric  — working_days: ["0".."6"] (0=Sun), schedule keys "0".."6", 24h times ("17:00")
//   • day-name — working_days: ["Sun".."Sat"],     schedule keys "Sun"..,    12h times ("5:00 PM")
//
// Comparing `working_days.includes("Sun")` silently fails for every numeric-format
// row (e.g. a cleaner ["0","1"] works Sun+Mon but showed "Doesn't work Suns").
// These helpers normalize both formats. Ported from standalone nycmaid.
//
// NOTE: this module is pure (no server imports) so client components can import it too.

const DAY_INDEX: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }
const SHORT_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Normalize a single day token ("0" or "Sun"/"Sunday", any case) to an index 0-6, or null if unrecognized. */
export function dayTokenToIndex(token: string): number | null {
  const t = String(token).trim().toLowerCase()
  if (/^[0-6]$/.test(t)) return Number(t)
  const key = t.slice(0, 3)
  return key in DAY_INDEX ? DAY_INDEX[key] : null
}

/** Weekday index (0=Sun..6=Sat) for a YYYY-MM-DD string, evaluated in America/New_York. */
export function dateToWeekdayIndex(date: string): number {
  const short = new Date(date + 'T12:00:00')
    .toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short' })
    .toLowerCase()
  return short in DAY_INDEX ? DAY_INDEX[short] : new Date(date + 'T12:00:00').getDay()
}

/**
 * Does this cleaner work the given date, per working_days?
 * Returns null when working_days is unset/empty — the caller decides the default
 * (typically: fall through to schedule, then "available 7 days").
 * Handles both numeric ("0") and name ("Sun") tokens.
 */
export function worksOnDay(working_days: string[] | null | undefined, date: string): boolean | null {
  if (!working_days || working_days.length === 0) return null
  const idxs = working_days.map(dayTokenToIndex).filter((x): x is number => x !== null)
  if (idxs.length === 0) return null
  return idxs.includes(dateToWeekdayIndex(date))
}

export type DaySchedule = { start?: string; end?: string } | null | undefined

/**
 * Look up a cleaner's schedule entry for the given date, matching numeric ("0")
 * or name ("Sun") keys. Returns the entry (which may be `null` = explicit day off)
 * when a key exists, or `undefined` when the schedule has no entry for that day.
 */
export function getDaySchedule(
  schedule: Record<string, unknown> | null | undefined,
  date: string,
): DaySchedule {
  if (!schedule) return undefined
  const idx = dateToWeekdayIndex(date)
  const numKey = String(idx)
  if (numKey in schedule) return schedule[numKey] as DaySchedule
  const nameKey = SHORT_NAMES[idx]
  if (nameKey in schedule) return schedule[nameKey] as DaySchedule
  return undefined
}

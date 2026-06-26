// Team-member availability — day-of-week and schedule helpers.
//
// Ported 1:1 from NYC Maid (src/lib/day-availability.ts). Pure logic — operates
// on the `working_days` / `schedule` column VALUES passed in, so it's table-
// agnostic (FL stores them on team_members; nycmaid on cleaners).
//
// `working_days` and `schedule` exist in TWO historical formats across rows, and
// every matcher must agree on both:
//
//   • numeric  — working_days: ["0".."6"] (0=Sun), schedule keys "0".."6", 24h times ("17:00")
//   • day-name — working_days: ["Sun".."Sat"],     schedule keys "Sun"..,    12h times ("5:00 PM")
//
// The old code compared `working_days.includes("Sun")` and read `schedule["Sun"]`,
// which silently failed for every numeric-format row. These helpers normalize both.
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
 * Does this member work the given date, per working_days?
 * Returns null when working_days is unset/empty — the caller decides the default.
 * Handles both numeric ("0") and name ("Sun") tokens.
 */
export function worksOnDay(working_days: string[] | null | undefined, date: string): boolean | null {
  if (!working_days || working_days.length === 0) return null
  const idxs = working_days.map(dayTokenToIndex).filter((x): x is number => x !== null)
  if (idxs.length === 0) return null
  return idxs.includes(dateToWeekdayIndex(date))
}

/**
 * True only when a schedule actually configures at least one working day.
 * A schedule object full of null entries carries NO positive availability signal —
 * it must be treated as "unconfigured" so the caller falls through to the default.
 */
export function scheduleHasAnyDay(schedule: Record<string, unknown> | null | undefined): boolean {
  if (!schedule || typeof schedule !== 'object') return false
  return Object.values(schedule).some(v => v != null)
}

export type DaySchedule = { start?: string; end?: string } | null | undefined

/**
 * Look up a schedule entry for the given date, matching numeric ("0") or name
 * ("Sun") keys. Returns the entry (which may be `null` = explicit day off) when a
 * key exists, or `undefined` when the schedule has no entry for that day.
 * Callers that treat "not scheduled" as unavailable should test `!= null`.
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

/**
 * Canonical "does this member's weekly schedule include this date?" resolver.
 * Single source of truth for the suggestion/offer engine.
 *
 * Precedence:
 *   1. working_days, when it carries any recognizable day → authoritative.
 *   2. else schedule, when it configures at least one day → that day present?
 *   3. else NOTHING is configured → NOT available.
 *
 * "nothing configured → not available" is deliberate: a member who has set zero
 * working days (or turned every day off) must NOT be auto-suggested 7 days a week.
 *
 * Does NOT consider `unavailable_dates` (one-off days off) — callers handle that
 * separately, because some surfaces want a distinct "requested off" reason.
 */
export function worksScheduledDay(
  working_days: string[] | null | undefined,
  schedule: Record<string, unknown> | null | undefined,
  date: string,
): boolean {
  const wd = worksOnDay(working_days, date)
  if (wd !== null) return wd
  if (scheduleHasAnyDay(schedule)) return getDaySchedule(schedule, date) != null
  return false
}

/** Canonical 0-6 → working-hours map used by the availability editor UIs. */
export type HoursMap = Record<number, { start: string; end: string } | null>

/**
 * Convert a stored time to canonical 24h "HH:MM". Accepts both historical
 * formats — "9:00 AM" (12h) and "08:00" (24h). Returns null if unparseable.
 */
export function timeTo24h(t: unknown): string | null {
  if (typeof t !== 'string') return null
  const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
  if (!m) return null
  let h = parseInt(m[1], 10)
  const min = m[2]
  const ap = m[3]?.toUpperCase()
  if (ap === 'PM' && h !== 12) h += 12
  if (ap === 'AM' && h === 12) h = 0
  if (h < 0 || h > 23) return null
  return `${String(h).padStart(2, '0')}:${min}`
}

/**
 * Normalize the stored working_days + schedule columns (any historical format)
 * into ONE canonical 0-6 → {start,end}|null map with 24h times. schedule supplies
 * hours; working_days fills in any working day the schedule didn't (default 08:00–17:00).
 */
export function normalizeWorkingHours(
  working_days: string[] | null | undefined,
  schedule: Record<string, unknown> | null | undefined,
): HoursMap {
  const out: HoursMap = { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null }
  if (schedule && typeof schedule === 'object') {
    for (let i = 0; i < 7; i++) {
      const raw = (String(i) in schedule) ? schedule[String(i)]
        : (SHORT_NAMES[i] in schedule) ? schedule[SHORT_NAMES[i]]
        : undefined
      if (raw && typeof raw === 'object') {
        const e = raw as { start?: unknown; end?: unknown }
        const start = timeTo24h(e.start)
        const end = timeTo24h(e.end)
        if (start && end) out[i] = { start, end }
      }
    }
  }
  if (Array.isArray(working_days)) {
    for (const tok of working_days) {
      const idx = dayTokenToIndex(String(tok))
      if (idx != null && !out[idx]) out[idx] = { start: '08:00', end: '17:00' }
    }
  }
  return out
}

/**
 * The member's working-hours window (minutes-of-day) for a date, or null when
 * that day has no specific hours configured (→ no time constraint).
 */
export function hoursWindowForDate(
  schedule: Record<string, unknown> | null | undefined,
  date: string,
): { start: number; end: number } | null {
  const entry = getDaySchedule(schedule, date)
  if (!entry || typeof entry !== 'object') return null
  const s = timeTo24h((entry as { start?: unknown }).start)
  const e = timeTo24h((entry as { end?: unknown }).end)
  if (!s || !e) return null
  const [sh, sm] = s.split(':').map(Number)
  const [eh, em] = e.split(':').map(Number)
  return { start: sh * 60 + sm, end: eh * 60 + em }
}

/**
 * True if a [slotStartMin, slotEndMin] booking fits within the member's working
 * hours for the date. A day with no specific hours set imposes no time limit.
 * Mirrors the booking-creation enforcement so suggestions and booking agree.
 */
export function slotWithinHours(
  schedule: Record<string, unknown> | null | undefined,
  date: string,
  slotStartMin: number,
  slotEndMin: number,
): boolean {
  const w = hoursWindowForDate(schedule, date)
  if (!w) return true
  return slotStartMin >= w.start && slotEndMin <= w.end
}

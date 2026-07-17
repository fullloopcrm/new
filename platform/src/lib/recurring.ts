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
      // Recompute each month's anchor from the ORIGINAL day-of-month every
      // iteration (clamped to that month's last day when the target day
      // doesn't exist), instead of chaining setMonth() off the previous
      // (possibly-already-overflowed) date. The old chained version let one
      // short month permanently shift the day-of-month forward for every
      // later month: Jan 31 -> setMonth() overflows Feb 31 into Mar 3 -> Mar
      // 3 + 1mo -> Apr 3 -> ... stabilizing at day 3 FOREVER, never
      // returning to 31 even in 31-day months. That's not a one-month
      // hiccup, it's a silent permanent shift of the client's whole
      // recurring day. Clamping fresh off the day-1 anchor each iteration
      // (matching monthly_weekday's per-month recompute below) makes a short
      // month a one-off fallback instead of a permanent drift.
      const targetDate = current.getDate()
      for (let i = 0; i < weeksToGenerate; i++) {
        if (i === 0) {
          dates.push(new Date(current))
        } else {
          const monthAnchor = new Date(current)
          // Zero the day-of-month BEFORE advancing the month: setMonth()
          // itself overflows when the CURRENT day-of-month (29-31) doesn't
          // exist in the target month (e.g. calling setMonth() on a day-31
          // date to reach Feb spills straight into March), so the target
          // month must be reached via a safe day-1 anchor first.
          monthAnchor.setDate(1)
          monthAnchor.setMonth(monthAnchor.getMonth() + i)
          const daysInMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0).getDate()
          monthAnchor.setDate(Math.min(targetDate, daysInMonth))
          dates.push(monthAnchor)
        }
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
          const monthStart = new Date(current)
          // Zero the day-of-month BEFORE advancing the month -- same overflow
          // trap as monthly_date above. When the anchor's raw day-of-month is
          // 29-31, calling setMonth() first (while day is still 29-31) can
          // overflow past the intended target month (e.g. a Jan-29 anchor in
          // a non-leap year: setMonth(+1) to reach Feb overflows Feb 29 into
          // Mar 1, so `i=1`'s "Feb" anchor lands in March instead) -- which
          // both skips the intended month entirely AND duplicates the
          // following month once `i` catches up to it for real.
          monthStart.setDate(1)
          monthStart.setMonth(monthStart.getMonth() + i)
          // Collect every occurrence of targetDay WITHIN THIS MONTH ONLY, then
          // pick the weekOfMonth-th one -- or the month's LAST occurrence if it
          // has fewer than weekOfMonth (e.g. a schedule anchored on a month's
          // 5th Friday falls back to that month's 4th/last Friday when the
          // target month has no 5th). The old version searched day-by-day with
          // no month boundary, so once a month ran out of the target weekday it
          // just kept counting into the FOLLOWING month until it hit
          // weekOfMonth -- e.g. a 5th-Friday-of-May anchor produced a July
          // occurrence for the June slot instead of resolving within June,
          // corrupting the once-a-month cadence for any schedule anchored on a
          // month's 5th occurrence of a weekday (which is most months, since
          // only 4-5 months a year have a 5th occurrence of any given weekday).
          const occurrences: Date[] = []
          const probe = new Date(monthStart)
          const targetMonth = probe.getMonth()
          while (probe.getMonth() === targetMonth) {
            if (probe.getDay() === targetDay) occurrences.push(new Date(probe))
            probe.setDate(probe.getDate() + 1)
          }
          dates.push(occurrences[Math.min(weekOfMonth, occurrences.length) - 1])
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

/**
 * Current (or offset) instant as a naive 'YYYY-MM-DDTHH:MM:SS' America/New_York
 * wall-clock string -- the same naive-local format bookings.start_time/end_time
 * are stored in (see computeNaiveVisitWindow above).
 *
 * Call sites across schedules/recurring-schedules/telnyx-SMS/system-check used
 * to filter those naive columns with `.gte('start_time', new Date().toISOString())`
 * -- a true-UTC instant. Postgres ignores the 'Z' when casting into a `timestamp
 * without time zone` column, so the comparison landed as "UTC clock reading"
 * vs. "ET wall-clock value," silently skewing every now-cutoff ahead by the
 * ET/UTC gap (4h EDT / 5h EST) EVERY time it ran, all day, not just at a DST
 * boundary. Concretely: any booking within that many hours of the real current
 * time read as already in the past -- so "cancel this schedule's future
 * bookings," "reassign upcoming bookings to the new member," "find the
 * client's next booking to confirm via SMS," and the pending/stuck
 * system-check counts all silently missed or over-counted bookings in that
 * rolling multi-hour window. Anchoring "now" to this same naive-ET convention
 * as the column fixes the comparison instead of the column.
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
 * convention) into the real UTC instant it represents.
 *
 * `src/lib/dates.ts`'s parseTimestamp() does the opposite -- it deliberately
 * forces UTC interpretation on any naive timestamp (append 'Z'), which is
 * correct for check_in_time/check_out_time (written via `new Date().toISOString()`,
 * genuinely UTC) but WRONG for start_time/end_time. A fallback that reads
 * `parseTimestamp(booking.start_time)` silently treats a naive-ET value as if
 * it were UTC, shifting it 4-5h. Use this instead wherever a naive-ET column
 * needs to become a real Date.
 *
 * Standard double-conversion trick: guess the instant by treating the naive
 * string as UTC, read what the ET wall clock shows at that guessed instant
 * (which — being within a few hours of the true instant — falls on the same
 * side of any DST boundary), then correct by that offset.
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

export interface CalendarDate {
  year: number
  month: number // 0-indexed, matches Date.getMonth()
  day: number
}

/**
 * ET-calendar "today" (month 0-indexed, matching Date.getMonth()) -- the ET
 * wall-clock date bookings.start_time/end_time's naive-ET convention (see
 * nowNaiveET above) actually lives in.
 *
 * Call sites building day/week/month/year range boundaries for those columns
 * with `new Date(now.getFullYear(), now.getMonth(), now.getDate())` were
 * reading the SERVER's local calendar (UTC on Vercel), not ET -- silently
 * shifting every boundary by the ET/UTC gap (4h EDT / 5h EST), the
 * day-boundary counterpart of the instant-"now" bug nowNaiveET() fixes.
 * Combine with addCalendarDays() and formatNaiveET() to build the boundary.
 */
export function etToday(): CalendarDate {
  const [year, month, day] = nowNaiveET().slice(0, 10).split('-').map(Number)
  return { year, month: month - 1, day }
}

/**
 * Add (or subtract) whole calendar days to a CalendarDate, normalizing
 * month/year rollover. Pure calendar arithmetic via Date.UTC -- no timezone
 * or DST is involved since no real instant is ever read back out.
 */
export function addCalendarDays(date: CalendarDate, deltaDays: number): CalendarDate {
  const d = new Date(Date.UTC(date.year, date.month, date.day + deltaDays))
  return { year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate() }
}

/**
 * Day of week (0=Sun..6=Sat) for a CalendarDate. Pure calendar arithmetic,
 * same caveat as addCalendarDays.
 */
export function calendarDayOfWeek(date: CalendarDate): number {
  return new Date(Date.UTC(date.year, date.month, date.day)).getUTCDay()
}

/**
 * Number of days in a CalendarDate's month. Pure calendar arithmetic, same
 * caveat as addCalendarDays.
 */
export function daysInCalendarMonth(date: CalendarDate): number {
  return new Date(Date.UTC(date.year, date.month + 1, 0)).getUTCDate()
}

/**
 * Formats a CalendarDate + time-of-day as the naive 'YYYY-MM-DDTHH:MM:SS'
 * string bookings.start_time/end_time use (see nowNaiveET above).
 */
export function formatNaiveET(date: CalendarDate, hour = 0, minute = 0, second = 0): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.year}-${pad(date.month + 1)}-${pad(date.day)}T${pad(hour)}:${pad(minute)}:${pad(second)}`
}

/**
 * ET wall-clock hour (0-23) for a given instant -- DST-aware via Intl, unlike
 * `Date.getHours()` which reads the SERVER's local hour (UTC on Vercel).
 * Cron gates written as `now.getHours() === 8` intending "8am ET" were
 * actually firing whenever it was 8am UTC (3am EDT / 4am EST) -- the
 * hour-gate counterpart of the day-boundary bug etToday() fixes.
 */
export function etHour(date: Date): number {
  const hourStr = date.toLocaleTimeString('en-GB', { timeZone: 'America/New_York', hour12: false, hour: '2-digit' })
  const hour = Number(hourStr)
  return hour === 24 ? 0 : hour
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

/**
 * Date-independent variant of formatRecurringLabel, for call sites (client
 * health/LTV dashboards) that only have the recurring_type, no occurrence date
 * to derive a monthly_weekday week-number/day-name from. monthly_weekday
 * collapses to the same generic 'Monthly' label as monthly_date (same
 * information loss already accepted for monthly_date here) rather than
 * leaking the raw enum key to admin UI. Only truly unrecognized/legacy
 * values pass through unformatted, rather than showing blank.
 */
export function formatRecurringFrequency(recurringType: string | null | undefined): string {
  if (!recurringType) return ''
  switch (recurringType) {
    case 'daily': return 'Daily'
    case 'weekly': return 'Weekly'
    case 'biweekly': return 'Bi-weekly'
    case 'triweekly': return 'Tri-weekly'
    case 'monthly_date':
    case 'monthly_weekday':
      return 'Monthly'
    case 'custom': return 'Custom'
    default: return recurringType
  }
}

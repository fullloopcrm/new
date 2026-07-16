// THE single source of truth for "can this team member take this slot?"
//
// Ported 1:1 from NYC Maid (src/lib/cleaner-availability.ts). Pure (no DB) so it's
// testable and callable from anywhere — the caller fetches the member row, that
// day's bookings, and any time-off blocks, and passes them in. Day/hours
// resolution delegates to day-availability.ts (handles both historical formats).
//
// Every surface that decides availability — the matcher, booking create/assign
// guards, the recurring generator, schedule-monitor, find-member — should call
// this one function so the rule can't drift across copies.
import { worksScheduledDay, slotWithinHours } from './day-availability'

// Travel buffer between a member's jobs. ONE value, used everywhere.
export const TRAVEL_BUFFER_MIN = 60

export interface SlotCleaner {
  working_days?: string[] | null
  schedule?: Record<string, unknown> | null
  unavailable_dates?: string[] | null
  max_jobs_per_day?: number | null
}

/** A minutes-of-day range, e.g. a booking or the slot being checked. */
export interface MinRange {
  startMin: number
  endMin: number
}

/**
 * A time-off block for the date in question. start/end null (or missing) = the
 * whole day is off. Otherwise it blocks only [start, end). Times accept "HH:MM"
 * or "HH:MM:SS".
 */
export interface TimeOffBlock {
  start_time?: string | null
  end_time?: string | null
}

export type UnavailableCode =
  | 'day_off_request'
  | 'time_off'
  | 'not_scheduled'
  | 'outside_hours'
  | 'conflict'
  | 'max_jobs'

export interface AvailabilityResult {
  available: boolean
  reason?: string
  code?: UnavailableCode
}

/** "HH:MM" / "HH:MM:SS" → minutes-of-day, or null if unparseable. */
function timeToMin(t: string | null | undefined): number | null {
  if (typeof t !== 'string') return null
  const m = t.trim().match(/^(\d{1,2}):(\d{2})/)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return h * 60 + min
}

/**
 * Single authoritative availability check. Returns the first failing reason in a
 * deliberate order (hard "they're off" reasons before soft "schedule full"), or
 * { available: true }.
 *
 * @param cleaner      working_days / schedule / unavailable_dates / max_jobs_per_day
 * @param date         YYYY-MM-DD (Eastern)
 * @param slot         the booking slot being checked, minutes-of-day
 * @param dayBookings  this member's OTHER bookings that day, minutes-of-day
 * @param timeOff      time-off blocks for this date (full or partial day)
 */
export function cleanerAvailableForSlot(opts: {
  cleaner: SlotCleaner
  date: string
  slot: MinRange
  dayBookings?: MinRange[]
  timeOff?: TimeOffBlock[]
}): AvailabilityResult {
  const { cleaner, date, slot } = opts
  const dayBookings = opts.dayBookings ?? []
  const timeOff = opts.timeOff ?? []

  // 1. Legacy full-day off (unavailable_dates array).
  if (Array.isArray(cleaner.unavailable_dates) && cleaner.unavailable_dates.includes(date)) {
    return { available: false, reason: 'Requested this day off', code: 'day_off_request' }
  }

  // 2. Time-off blocks for this date. No times = whole day; otherwise overlap.
  for (const off of timeOff) {
    const os = timeToMin(off.start_time)
    const oe = timeToMin(off.end_time)
    if (os == null || oe == null) {
      return { available: false, reason: 'On approved time off (full day)', code: 'time_off' }
    }
    if (slot.startMin < oe && slot.endMin > os) {
      return { available: false, reason: 'On approved time off', code: 'time_off' }
    }
  }

  // 3. Does their weekly schedule include this day? (canonical resolver)
  if (!worksScheduledDay(cleaner.working_days, cleaner.schedule, date)) {
    return { available: false, reason: 'Not scheduled to work this day', code: 'not_scheduled' }
  }

  // 4. Does the slot fit inside their set working hours for the day?
  if (!slotWithinHours(cleaner.schedule, date, slot.startMin, slot.endMin)) {
    return { available: false, reason: 'Outside their working hours', code: 'outside_hours' }
  }

  // 5. Time conflict with another job that day (travel buffer on both sides).
  for (const b of dayBookings) {
    if (slot.startMin < b.endMin + TRAVEL_BUFFER_MIN && slot.endMin + TRAVEL_BUFFER_MIN > b.startMin) {
      return { available: false, reason: 'Overlaps another job (incl. travel buffer)', code: 'conflict' }
    }
  }

  // 6. Daily job cap.
  if (cleaner.max_jobs_per_day && dayBookings.length >= cleaner.max_jobs_per_day) {
    return { available: false, reason: `Already at ${cleaner.max_jobs_per_day} jobs that day`, code: 'max_jobs' }
  }

  return { available: true }
}

/** Parse a stored naive timestamp ("YYYY-MM-DDTHH:MM[:SS]") to minutes-of-day. */
export function timestampToMin(timeStr: string): number {
  const t = (timeStr.split('T')[1] || '00:00')
  const [h, m] = t.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/**
 * Shift a naive "YYYY-MM-DDTHH:MM[:SS]" timestamp by +/- minutes, staying naive
 * (no timezone) and crossing midnight correctly. Forcing the arithmetic onto a
 * UTC instant (appending "Z" before parsing) makes the result independent of the
 * calling process's local timezone — `new Date(naiveStr)` alone parses a
 * timezone-less string using the RUNTIME's local offset, so the identical shift
 * would land on a different wall-clock value in local dev (e.g. America/New_York)
 * than in prod (Vercel defaults to UTC). Used for booking-conflict buffer windows,
 * where both sides of the comparison must stay in the same naive space.
 */
export function shiftNaiveTimestamp(ts: string, minutes: number): string {
  const anchored = /[Zz]|[+-]\d{2}:?\d{2}$/.test(ts) ? ts : `${ts}Z`
  return new Date(new Date(anchored).getTime() + minutes * 60_000).toISOString().replace(/\.\d{3}Z$/, '')
}

import { getLocalMinuteOfDay, getTenantTimezone } from './tenant-time'

export type SupportDayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export interface SupportDayHours {
  open: boolean
  start: string // "HH:MM", tenant-local
  end: string // "HH:MM", tenant-local — may be earlier than `start` (e.g.
  // 20:00-08:00), meaning the window starts this weekday and runs past
  // midnight into the next calendar day.
}

export type SupportHours = Record<SupportDayKey, SupportDayHours>

const WEEKDAY_SHORT_TO_KEY: Record<string, SupportDayKey> = {
  Sun: 'sun', Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat',
}

const PREV_DAY_KEY: Record<SupportDayKey, SupportDayKey> = {
  sun: 'sat', mon: 'sun', tue: 'mon', wed: 'tue', thu: 'wed', fri: 'thu', sat: 'fri',
}

function parseHhMmToMinutes(hhmm: string | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '')
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h < 0 || h > 24 || min < 0 || min > 59) return null
  return h * 60 + min
}

// True when `at` falls inside the tenant's configured Yinez-hours window for
// today (tenant-local calendar day, DST-safe via Intl). A day missing from
// `supportHours` or marked `open: false` counts as off all day. Handles
// overnight windows (start > end, e.g. 20:00-08:00) two ways: the evening
// portion that starts today, and the early-morning portion carried over from
// a wrapping window that started yesterday.
function isWithinSupportHours(supportHours: SupportHours, timezone: string, at: Date): boolean {
  const weekdayShort = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).format(at)
  const todayKey = WEEKDAY_SHORT_TO_KEY[weekdayShort]
  if (!todayKey) return false
  const nowMin = getLocalMinuteOfDay(timezone, at)

  const today = supportHours[todayKey]
  if (today?.open) {
    const startMin = parseHhMmToMinutes(today.start)
    const endMin = parseHhMmToMinutes(today.end)
    if (startMin !== null && endMin !== null) {
      if (startMin <= endMin) {
        if (nowMin >= startMin && nowMin < endMin) return true
      } else if (nowMin >= startMin) {
        return true
      }
    }
  }

  const yesterday = supportHours[PREV_DAY_KEY[todayKey]]
  if (yesterday?.open) {
    const startMin = parseHhMmToMinutes(yesterday.start)
    const endMin = parseHhMmToMinutes(yesterday.end)
    if (startMin !== null && endMin !== null && startMin > endMin && nowMin < endMin) {
      return true
    }
  }

  return false
}

// Yinez (webchat, SMS, email) should respond exactly when the tenant has
// turned the hours switch ON and the current tenant-local time falls inside
// the configured Mon-Sun schedule. Turning the switch off, or never
// configuring a schedule while it's on, keeps the historical always-on
// behavior — this only ever narrows availability, never silently disables it
// by default.
export function isTenantAiOnline(opts: {
  timezone?: string | null
  supportHours?: Partial<SupportHours> | null
  hoursEnabled?: boolean | null
  at?: Date
}): boolean {
  const { supportHours, hoursEnabled, at = new Date() } = opts
  if (!hoursEnabled) return true
  if (!supportHours || Object.keys(supportHours).length === 0) return true
  const timezone = getTenantTimezone({ timezone: opts.timezone })
  return isWithinSupportHours(supportHours as SupportHours, timezone, at)
}

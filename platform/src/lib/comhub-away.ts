import { getLocalMinuteOfDay, getTenantTimezone } from './tenant-time'

export type SupportDayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export interface SupportDayHours {
  open: boolean
  start: string // "HH:MM", tenant-local
  end: string // "HH:MM", tenant-local
}

export type SupportHours = Record<SupportDayKey, SupportDayHours>

const WEEKDAY_SHORT_TO_KEY: Record<string, SupportDayKey> = {
  Sun: 'sun', Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat',
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
// `supportHours` or marked `open: false` counts as off all day.
function isWithinSupportHours(supportHours: SupportHours, timezone: string, at: Date): boolean {
  const weekdayShort = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).format(at)
  const key = WEEKDAY_SHORT_TO_KEY[weekdayShort]
  const day = key ? supportHours[key] : undefined
  if (!day || !day.open) return false

  const startMin = parseHhMmToMinutes(day.start)
  const endMin = parseHhMmToMinutes(day.end)
  if (startMin === null || endMin === null) return false

  const nowMin = getLocalMinuteOfDay(timezone, at)
  return nowMin >= startMin && nowMin < endMin
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

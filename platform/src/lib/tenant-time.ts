const DEFAULT_TIMEZONE = 'America/New_York'

export function getTenantTimezone(tenant: { timezone?: string | null } | null | undefined): string {
  return tenant?.timezone || DEFAULT_TIMEZONE
}

function getTimezoneOffsetMinutes(timezone: string, at: Date): number {
  const utcDate = new Date(at.toLocaleString('en-US', { timeZone: 'UTC' }))
  const tzDate = new Date(at.toLocaleString('en-US', { timeZone: timezone }))
  return (tzDate.getTime() - utcDate.getTime()) / 60000
}

function zonedYmdToUtc(year: number, month: number, day: number, hour: number, timezone: string): Date {
  const naiveUtc = new Date(Date.UTC(year, month - 1, day, hour, 0, 0))
  const offsetMin = getTimezoneOffsetMinutes(timezone, naiveUtc)
  return new Date(naiveUtc.getTime() - offsetMin * 60000)
}

// Current local hour (0-23) for a tenant's IANA timezone.
export function getLocalHour(timezone: string, at: Date = new Date()): number {
  const hourStr = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false,
  }).format(at)
  return parseInt(hourStr, 10) % 24
}

// Current local minute-of-day (0-1439) for a tenant's IANA timezone —
// the finer-grained counterpart of getLocalHour, for slot/quiet-hours math.
export function getLocalMinuteOfDay(timezone: string, at: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(at)
  const hour = Number(parts.find(p => p.type === 'hour')?.value ?? '0') % 24
  const minute = Number(parts.find(p => p.type === 'minute')?.value ?? '0')
  return hour * 60 + minute
}

// Start-of-local-day (midnight) boundaries for a tenant, expressed as real UTC instants.
export function getTenantDayBoundaries(timezone: string, at: Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(at)
  const year = Number(parts.find(p => p.type === 'year')!.value)
  const month = Number(parts.find(p => p.type === 'month')!.value)
  const day = Number(parts.find(p => p.type === 'day')!.value)

  const todayStart = zonedYmdToUtc(year, month, day, 0, timezone)
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000)
  const todayEnd = new Date(tomorrowStart.getTime() - 1)

  return { todayStart, todayEnd, tomorrowStart, yesterdayStart }
}

// True when it is currently `targetHour` (0-23) local time for this timezone, +/- the
// cron's poll window. Crons that used to fire once/day at UTC midnight now poll hourly
// and use this to gate work until each tenant's actual local target hour.
export function isTenantLocalHour(timezone: string, targetHour: number, at: Date = new Date()): boolean {
  return getLocalHour(timezone, at) === targetHour
}

// ============================================================================
// bookings.start_time / bookings.end_time are `timestamp without time zone` --
// naive 'YYYY-MM-DDTHH:MM:SS' strings holding the TENANT'S OWN local wall-clock
// time, no offset attached. Comparing them against a real UTC instant
// (`.toISOString()`) is a type mismatch and silently shifts every cutoff by
// the tenant's UTC offset. Cutoffs against these two columns must be built as
// naive strings in this same convention via the helpers below. Real UTC
// (timestamptz) columns — created_at, payment_date, check_in_time,
// check_out_time, notifications.created_at — are NOT affected; use
// getTenantDayBoundaries()/isTenantLocalHour() above for those.
// ============================================================================

export interface CalendarDate {
  year: number
  month: number // 0-indexed, matches Date.getMonth()
  day: number
}

// Naive 'YYYY-MM-DDTHH:MM:SS' wall-clock string for `at` in `timezone` — the
// same convention bookings.start_time/end_time are stored in.
export function toTenantNaiveString(timezone: string, at: Date = new Date()): string {
  const date = at.toLocaleDateString('en-CA', { timeZone: timezone })
  const time = at.toLocaleTimeString('en-GB', { timeZone: timezone, hour12: false })
  return `${date}T${time}`
}

// Inverse: the real UTC instant a naive tenant-local wall-clock string represents.
// Standard double-conversion trick — guess the instant by treating the naive
// string as UTC, read what the target timezone's wall clock shows at that
// guess (same side of any DST boundary since it's within hours of the true
// instant), then correct by that offset.
export function parseTenantNaiveString(naive: string, timezone: string): Date {
  const guess = new Date(naive.endsWith('Z') ? naive : `${naive}Z`)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(guess)
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value)
  const hour = get('hour')
  const zoneAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), hour === 24 ? 0 : hour, get('minute'), get('second'))
  const offsetMs = zoneAsUtc - guess.getTime()
  return new Date(guess.getTime() - offsetMs)
}

export function tenantCalendarToday(timezone: string, at: Date = new Date()): CalendarDate {
  const [year, month, day] = toTenantNaiveString(timezone, at).slice(0, 10).split('-').map(Number)
  return { year, month: month - 1, day }
}

// Pure calendar arithmetic via Date.UTC — no timezone/DST involved since no
// real instant is read back out, just Y/M/D rollover.
export function addCalendarDays(date: CalendarDate, deltaDays: number): CalendarDate {
  const d = new Date(Date.UTC(date.year, date.month, date.day + deltaDays))
  return { year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate() }
}

export function formatCalendarNaive(date: CalendarDate, hour = 0, minute = 0, second = 0): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.year}-${pad(date.month + 1)}-${pad(date.day)}T${pad(hour)}:${pad(minute)}:${pad(second)}`
}

// Naive-string day boundaries for querying start_time/end_time directly —
// the naive-column counterpart of getTenantDayBoundaries() above.
export function getTenantNaiveDayBoundaries(timezone: string, at: Date = new Date()) {
  const today = tenantCalendarToday(timezone, at)
  const tomorrow = addCalendarDays(today, 1)
  const yesterday = addCalendarDays(today, -1)
  return {
    today,
    tomorrow,
    yesterday,
    todayStartNaive: formatCalendarNaive(today),
    todayEndNaive: formatCalendarNaive(today, 23, 59, 59),
    tomorrowStartNaive: formatCalendarNaive(tomorrow),
    tomorrowEndNaive: formatCalendarNaive(tomorrow, 23, 59, 59),
    yesterdayStartNaive: formatCalendarNaive(yesterday),
    yesterdayEndNaive: formatCalendarNaive(yesterday, 23, 59, 59),
  }
}

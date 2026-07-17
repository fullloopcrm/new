/**
 * Parse a YYYY-MM-DD string as a LOCAL date (not UTC).
 * Avoids the common bug: new Date("2026-03-13") → UTC midnight → March 12 in US timezones.
 */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Format a YYYY-MM-DD string using local date parsing.
 */
export function formatLocalDate(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  return parseLocalDate(dateStr).toLocaleDateString('en-US', options || { weekday: 'long', month: 'long', day: 'numeric' })
}

/**
 * Safely parse a Supabase timestamp that may lack a Z suffix.
 */
export function parseTimestamp(ts: string | null | undefined): Date | null {
  if (!ts) return null
  // Normalize the Postgres " " date/time separator to ISO "T".
  let s = ts.replace(' ', 'T')
  // Normalize a bare 2-digit tz offset ("+00") to "+00:00" — JS Date can't parse "+00".
  if (/[+-]\d{2}$/.test(s)) s += ':00'
  // Only parse directly when there is a REAL timezone marker: a trailing Z or a
  // signed offset (+HH:MM / -HH:MM). The old check matched any "HH:MM" tail, so
  // naive timestamps like "2026-06-25 11:30:00" were treated as already-zoned and
  // parsed in the SERVER's local time (ET on Vercel) instead of UTC — turning a
  // 4-hour job into 0.5hr. Supabase stores UTC, so naive values get a 'Z'.
  if (s.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(s)) {
    return new Date(s)
  }
  return new Date(s + 'Z')
}

/**
 * Format a timestamp in Eastern Time.
 */
export function formatET(ts: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const date = typeof ts === 'string' ? (parseTimestamp(ts) || new Date(ts)) : ts
  return date.toLocaleString('en-US', { timeZone: 'America/New_York', ...options })
}

/**
 * Minutes elapsed since a timestamp (floors to 0).
 */
export function minutesSince(ts: string): number {
  const start = parseTimestamp(ts)
  if (!start) return 0
  return Math.max(0, (Date.now() - start.getTime()) / (1000 * 60))
}

/**
 * ET calendar-day parts (year/month/day) for a given instant. Use this
 * instead of `date.getFullYear()/getMonth()/getDate()`, which read the
 * SERVER's local calendar (UTC on Vercel) -- a full day ahead of ET for
 * ~4-5h every evening.
 */
export function etYMD(date: Date): { y: number; m: number; d: number } {
  const [y, m, d] = date.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }).split('-').map(Number)
  return { y, m, d }
}

/**
 * ET's actual UTC offset (in minutes, negative) covering the given instant --
 * -300 for EST, -240 for EDT. Needed because ET isn't a fixed offset;
 * DST flips it twice a year.
 */
function etUtcOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    timeZoneName: 'shortOffset',
  }).formatToParts(at)
  const tzName = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT-5'
  const match = tzName.match(/GMT([+-]\d+)/)
  return match ? parseInt(match[1], 10) * 60 : -300
}

/**
 * True UTC instant for ET midnight of the given ET calendar date. Needed for
 * boundary comparisons against TIMESTAMPTZ columns (created_at, payment_date,
 * etc) -- unlike bookings.start_time's naive-ET TIMESTAMP columns (which take
 * a naive ET wall-clock string), an aware column needs a real UTC instant,
 * and using it needs the actual EST/EDT offset for that date rather than a
 * fixed -5h assumption.
 */
export function etMidnightUtc(year: number, month: number, day: number): Date {
  // Guess offset using a UTC anchor within the same calendar day for either
  // offset (05:00 UTC is ET midnight under EST; still Jan/Feb-plausible for
  // offset detection since DST doesn't change within a few hours of this
  // anchor).
  const offsetMinutes = etUtcOffsetMinutes(new Date(Date.UTC(year, month - 1, day, 5, 0, 0)))
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - offsetMinutes * 60 * 1000)
}

/**
 * Full ET wall-clock datetime string (no tz suffix, second precision) for a
 * given UTC instant -- the same naive format `bookings.start_time` is stored
 * in. Needed for boundary comparisons that need time-of-day precision
 * (e.g. "45 minutes ago"), not just calendar date (see `etYMD`/
 * `etMidnightUtc` for date-only boundaries).
 */
export function toNaiveET(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
  const hour = get('hour') === '24' ? '00' : get('hour')
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}:${get('second')}`
}

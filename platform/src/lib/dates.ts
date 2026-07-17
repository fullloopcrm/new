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
 * Last `n` calendar months ending with `now`'s month, oldest first.
 * Anchors each month at day 1 BEFORE subtracting `i` — never chain
 * `d.setMonth(d.getMonth() - i)` off a day-29/30/31 "now": e.g. May 31
 * minus 3 months overflows Feb into early March, silently colliding
 * two different months onto the same label/bucket.
 */
export function lastNMonths(n: number, now: Date = new Date()): { year: number; month: number; label: string }[] {
  const months: { year: number; month: number; label: string }[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    })
  }
  return months
}

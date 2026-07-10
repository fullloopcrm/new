const TZ = 'America/New_York'

/**
 * Parse a YYYY-MM-DD date string as LOCAL time (not UTC).
 * new Date("2026-03-13") parses as UTC midnight = March 12 in US timezones.
 * This function avoids that by using the Date(year, month, day) constructor.
 */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Format a YYYY-MM-DD string for display without UTC shift.
 */
export function formatLocalDate(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  return parseLocalDate(dateStr).toLocaleDateString('en-US', options || { weekday: 'long', month: 'long', day: 'numeric' })
}

/**
 * Safely parse a timestamp from Supabase.
 * Supabase sometimes returns timestamps without Z suffix,
 * causing them to be parsed as local time instead of UTC.
 * This ensures consistent parsing regardless of format.
 */
export function parseTimestamp(ts: string | null | undefined): Date | null {
  if (!ts) return null
  // If it has a timezone offset or Z, parse directly
  if (ts.endsWith('Z') || ts.includes('+') || ts.match(/\d{2}:\d{2}$/)) {
    return new Date(ts)
  }
  // Otherwise append Z to treat as UTC (Supabase stores as UTC)
  return new Date(ts + 'Z')
}

/**
 * Get current time in ET as a formatted string
 */
export function nowET(options?: Intl.DateTimeFormatOptions): string {
  return new Date().toLocaleString('en-US', { timeZone: TZ, ...options })
}

/**
 * Format a timestamp for display in ET
 */
export function formatET(ts: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const date = typeof ts === 'string' ? (parseTimestamp(ts) || new Date(ts)) : ts
  return date.toLocaleString('en-US', { timeZone: TZ, ...options })
}

/**
 * Get minutes elapsed between a Supabase timestamp and now
 */
export function minutesSince(ts: string): number {
  const start = parseTimestamp(ts)
  if (!start) return 0
  return Math.max(0, (Date.now() - start.getTime()) / (1000 * 60))
}

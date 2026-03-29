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
  if (ts.endsWith('Z') || ts.includes('+') || ts.match(/\d{2}:\d{2}$/)) return new Date(ts)
  return new Date(ts + 'Z')
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

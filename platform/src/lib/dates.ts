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

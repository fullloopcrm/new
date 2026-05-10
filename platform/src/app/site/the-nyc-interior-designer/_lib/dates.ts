// @ts-nocheck
const TZ = 'America/New_York'

export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatLocalDate(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  return parseLocalDate(dateStr).toLocaleDateString('en-US', options || { weekday: 'long', month: 'long', day: 'numeric' })
}

export function parseTimestamp(ts: string | null | undefined): Date | null {
  if (!ts) return null
  if (ts.endsWith('Z') || ts.includes('+') || ts.match(/\d{2}:\d{2}$/)) {
    return new Date(ts)
  }
  return new Date(ts + 'Z')
}

export function nowET(options?: Intl.DateTimeFormatOptions): string {
  return new Date().toLocaleString('en-US', { timeZone: TZ, ...options })
}

export function formatET(ts: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const date = typeof ts === 'string' ? (parseTimestamp(ts) || new Date(ts)) : ts
  return date.toLocaleString('en-US', { timeZone: TZ, ...options })
}

export function minutesSince(ts: string): number {
  const start = parseTimestamp(ts)
  if (!start) return 0
  return Math.max(0, (Date.now() - start.getTime()) / (1000 * 60))
}

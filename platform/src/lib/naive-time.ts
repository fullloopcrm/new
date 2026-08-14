// ── Naive Eastern wall-clock formatting ──────────────────────────────
//
// bookings.start_time / end_time (and other columns that follow the same
// convention) are NAIVE Eastern wall-clock strings with NO timezone info —
// see buildNaiveTime/shiftNaive in dashboard/bookings/BookingsAdmin.tsx and
// the parseNaive comment in dashboard/page.tsx. The digits themselves ARE
// the correct local time; there is nothing to convert.
//
// Formatting these through `new Date(s)` + `.toLocaleTimeString(..., {
// timeZone: ... })` (the pattern used by formatTime/formatDate in
// ./format.ts, which is correct for real `timestamptz` columns like
// created_at) parses the digits using the calling environment's ambient
// timezone (server process TZ on Vercel, or the viewer's browser locally)
// and then re-converts them — a double shift that's wrong whenever the
// ambient zone isn't exactly the tenant's zone. That's the recurring
// "times are off by hours" bug class. These functions never touch a
// timezone at all, so there's nothing for a differing session/browser
// zone to drift.
//
// Use these ONLY for naive wall-clock columns. Use formatTime/formatDate
// from ./format.ts for real timestamptz columns (created_at, etc.).

function splitNaive(s: string): { y: number; mo: number; d: number; h: number; mi: number } {
  const [datePart, timePart] = s.split(/[T ]/)
  const [y, mo, d] = (datePart || '').split('-').map(Number)
  const [h, mi] = (timePart || '00:00').split(':').map(Number)
  return { y, mo, d, h, mi }
}

/**
 * A Date object anchored so that formatting it with `timeZone: 'UTC'`
 * reproduces the original naive digits exactly, regardless of the calling
 * environment's own timezone. For call sites that need custom
 * `toLocaleDateString`/`toLocaleTimeString` options beyond what
 * formatNaive*() below provide — swap `new Date(s)` for
 * `naiveToAnchoredDate(s)` and `timeZone: 'America/New_York'` for
 * `timeZone: 'UTC'`, keep every other option as-is.
 */
export function naiveToAnchoredDate(s: string): Date {
  const { y, mo, d, h, mi } = splitNaive(s)
  return new Date(Date.UTC(y, mo - 1, d, h, mi))
}

/** "2:30 PM" — parses the wall-clock digits directly, no timezone involved. */
export function formatNaiveTime(s: string): string {
  const { h, mi } = splitNaive(s)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(mi).padStart(2, '0')} ${ampm}`
}

/** "Mon, Mar 10" */
export function formatNaiveDate(s: string): string {
  const { y, mo, d } = splitNaive(s)
  const utcNoon = new Date(Date.UTC(y, mo - 1, d, 12))
  return utcNoon.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

/** "Mar 10, 2026" */
export function formatNaiveDateLong(s: string): string {
  const { y, mo, d } = splitNaive(s)
  const utcNoon = new Date(Date.UTC(y, mo - 1, d, 12))
  return utcNoon.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

/** "Mon, Mar 10 at 2:30 PM" */
export function formatNaiveDateTime(s: string): string {
  return `${formatNaiveDate(s)} at ${formatNaiveTime(s)}`
}

// Comparing a naive field against a REAL instant (Date.now(), new Date(),
// or another true timestamptz column like check_in_time/created_at) needs
// an actual DST-aware conversion, not just digit parsing — use
// parseNaiveET() from '@/lib/recurring' for that, not this file. (Comparing
// a naive field against another naive field needs no conversion at all —
// the ambient-parse offset cancels on both sides; only mixing naive with
// real breaks that cancellation.)

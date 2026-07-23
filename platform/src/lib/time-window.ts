// Client-facing arrival window.
//
// Clients are told a 2-hour arrival window (e.g. "1:00 PM–3:00 PM") instead of
// an exact start time. Cleaners, admins, billing, and scheduling logic continue
// to use the exact start_time — this is a presentation layer only.
//
// Ported from nycmaid (src/lib/time-window.ts). Platform-wide default per Jeff:
// every tenant gets nycmaid's arrival-window behavior to start.

const WINDOW_HOURS = 2

// Pull the wall-clock hour/minute straight out of the naive ET string,
// bypassing Date/Intl timezone conversion entirely. Reading it through
// `new Date(startTime)` on a Vercel server (which runs in UTC) makes JS
// treat these ET digits as UTC, and formatting with `timeZone:
// 'America/New_York'` afterward then converts that (already wrong) UTC
// instant back to ET, shifting the displayed time 4-5 hours earlier than
// what was actually booked. See fl-confirm-email-investigate-2026-07-23.
function extractWallClock(startTime: string | Date): { hour: number; minute: number } {
  const iso = typeof startTime === 'string' ? startTime : startTime.toISOString()
  const match = iso.match(/^\d{4}-\d{2}-\d{2}[T ](\d{2}):(\d{2})/)
  if (!match) throw new Error(`clientArrivalWindow: unrecognized start_time format: ${iso}`)
  return { hour: Number(match[1]), minute: Number(match[2]) }
}

function formatMinutesOfDay(totalMinutes: number): string {
  const h24 = Math.floor(totalMinutes / 60) % 24
  const m = totalMinutes % 60
  const period = h24 < 12 ? 'AM' : 'PM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

/**
 * Format a booking's exact start time as a 2-hour client arrival window.
 * Input is the stored start_time (naive ET wall-clock string or Date).
 * Output example: "1:00 PM–3:00 PM".
 */
export function clientArrivalWindow(startTime: string | Date): string {
  const { hour, minute } = extractWallClock(startTime)
  const startMinutes = hour * 60 + minute
  const endMinutes = (startMinutes + WINDOW_HOURS * 60) % (24 * 60)
  return `${formatMinutesOfDay(startMinutes)}–${formatMinutesOfDay(endMinutes)}`
}

/**
 * Format a booking's exact start time as a wall-clock ET time (no window).
 * Same naive-string handling as clientArrivalWindow — for templates that
 * show the exact time rather than a client arrival window.
 */
export function nycmaidWallClockTime(startTime: string | Date): string {
  const { hour, minute } = extractWallClock(startTime)
  return formatMinutesOfDay(hour * 60 + minute)
}

// Expectation-setting note that MUST accompany any client-facing arrival-window
// mention: we cannot commit to an exact arrival time, even day-of.
export const ARRIVAL_WINDOW_NOTE =
  "We can't give an exact arrival time, even day-of — cleaners usually arrive within the first 30 minutes, but please plan for the full 2-hour window."

// Compact variant for SMS length limits.
export const ARRIVAL_WINDOW_NOTE_SMS =
  "No exact arrival time even day-of — cleaners usually come in the first 30 min, but please plan for the full 2-hour window."

// Spanish variant for Spanish-language client SMS.
export const ARRIVAL_WINDOW_NOTE_ES =
  "Sin hora exacta de llegada, ni el mismo día — el equipo suele llegar en los primeros 30 min, pero por favor considera la ventana completa de 2 horas."

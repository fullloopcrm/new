// Client-facing arrival window.
//
// Clients are told a 2-hour arrival window (e.g. "1:00 PM–3:00 PM") instead of
// an exact start time. Cleaners, admins, billing, and scheduling logic continue
// to use the exact start_time — this is a presentation layer only.
//
// Ported from nycmaid (src/lib/time-window.ts). Platform-wide default per Jeff:
// every tenant gets nycmaid's arrival-window behavior to start.

const WINDOW_HOURS = 2

/**
 * Format a booking's exact start time as a 2-hour client arrival window.
 * Input is the stored start_time (naive ET wall-clock string or Date).
 * Output example: "1:00 PM–3:00 PM".
 */
export function clientArrivalWindow(startTime: string | Date): string {
  const start = new Date(startTime)
  const end = new Date(start.getTime() + WINDOW_HOURS * 60 * 60 * 1000)
  const fmt = (d: Date) =>
    d.toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      minute: '2-digit',
    })
  return `${fmt(start)}–${fmt(end)}`
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

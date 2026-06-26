// Single source of truth for half-hour billing rounding.
//
// Client billing and cleaner pay use DIFFERENT grace windows on purpose:
//   - Client is billed for the next 30-min block once they run PAST 10 minutes.
//   - The cleaner is only paid for the next 30-min block PAST 15 minutes — a few
//     minutes over does not earn them a full extra half hour of pay.
//
// Every billing/pay calc in the app must use these helpers so the two rules
// never drift apart again (the drift across copy-pasted copies is what caused
// cleaners to be overpaid for running a few minutes over).
//
// Ported verbatim from NYC Maid (src/lib/billing-hours.ts) — pure math, no
// tenant-specific fields, so it copies 1:1.
const CLIENT_GRACE_MIN = 10
const CLEANER_GRACE_MIN = 15

function roundHalfHour(rawMinutes: number, graceMin: number): number {
  const mins = Math.max(0, rawMinutes)
  const halfHours = Math.floor(mins / 30)
  const remainder = mins - halfHours * 30
  return remainder > graceMin ? (halfHours + 1) * 0.5 : halfHours * 0.5
}

/** Client billed half-hours: rounds up only PAST 10 min. Always .0 or .5. */
export function clientBilledHours(rawMinutes: number): number {
  return roundHalfHour(rawMinutes, CLIENT_GRACE_MIN)
}

/** Cleaner paid half-hours: rounds up only PAST 15 min. Always .0 or .5. */
export function cleanerPaidHours(rawMinutes: number): number {
  return roundHalfHour(rawMinutes, CLEANER_GRACE_MIN)
}

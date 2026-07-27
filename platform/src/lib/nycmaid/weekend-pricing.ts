// Weekend (Sat/Sun) surcharge pricing — NYC Maid only, new clients only
// (Jeff, 2026-07-27). Existing clients (matched to an existing `clients` row
// at booking time) keep whichever rate they already had, every day of the
// week — this module only applies once a booking is confirmed to be for a
// brand-new client. Gate every call site with `isNycMaid(tenantId)` from
// ./tenant — this is NOT a platform-wide rate change.
//
// Friday is NOT a weekend day. Only Saturday and Sunday.
export const WEEKEND_SUPPLIES_PROVIDED_RATE = 79
export const WEEKEND_CLIENT_SUPPLIES_RATE = 69
export const WEEKEND_EMERGENCY_RATE = 99

/**
 * Saturday/Sunday check for a plain "YYYY-MM-DD" date string, evaluated at
 * local noon to dodge the UTC-midnight day-shift bug class (see
 * tenant-time.ts / the cleaner-SMS-and-portal-date incident) — mirrors the
 * existing `new Date(dateStr + 'T12:00:00').getDay()` idiom already used for
 * day-of-week elsewhere in the admin booking form.
 */
export function isWeekendDate(dateStr: string): boolean {
  const day = new Date(`${dateStr}T12:00:00`).getDay()
  return day === 0 || day === 6
}

/**
 * Weekend hourly rate for a NEW nycmaid client. `isEmergency` (same-day /
 * under-48hr) takes priority over the supplies choice — mirrors the existing
 * emergency-rate-overrides-supplies-rate behavior on weekdays.
 */
export function weekendHourlyRate(supplies: 'we_bring' | 'client', isEmergency: boolean): number {
  if (isEmergency) return WEEKEND_EMERGENCY_RATE
  return supplies === 'we_bring' ? WEEKEND_SUPPLIES_PROVIDED_RATE : WEEKEND_CLIENT_SUPPLIES_RATE
}

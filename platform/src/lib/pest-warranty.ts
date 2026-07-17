// Pest re-treat guarantee/warranty window — status + suggested defaults.
// See migrations/2026_07_16_pest_treatment_warranty.sql for the schema this
// backs (pest_treatment_logs.warranty_days / warranty_expires_on).

export type WarrantyStatus = 'none' | 'active' | 'expiring_soon' | 'expired'

const EXPIRING_SOON_WINDOW_DAYS = 7

// Days remaining until expiry are computed in application code (not read from
// the DB's generated warranty_expires_on column) so the UI can show a live
// status without an extra round trip, and so this is unit-testable without a
// real Postgres connection.
export function warrantyStatus(
  applicationDate: string | null | undefined,
  warrantyDays: number | null | undefined,
  today: Date = new Date()
): WarrantyStatus {
  if (!applicationDate || !warrantyDays || warrantyDays <= 0) return 'none'

  const applied = new Date(applicationDate + 'T00:00:00Z')
  if (isNaN(applied.getTime())) return 'none'

  const expires = new Date(applied)
  expires.setUTCDate(expires.getUTCDate() + warrantyDays)

  // application_date/warranty_expires_on are date-only columns meant in the
  // business's local (ET) calendar terms (same convention as invoices'
  // due_date / quotes' valid_until). Truncating `today` via its UTC
  // components read the SERVER's/browser's UTC calendar day, not the ET one
  // -- from ~8pm-midnight ET (UTC already rolled to tomorrow), a warranty
  // expiring "today" (ET) was already reported as expired, and one expiring
  // tomorrow read one day closer than it truly was. Extract ET calendar
  // components instead (same technique as lib/recurring.ts's nowNaiveET()).
  const [etYear, etMonth, etDay] = today
    .toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
    .split('-')
    .map(Number)
  const todayUTC = new Date(Date.UTC(etYear, etMonth - 1, etDay))
  const daysUntilExpiry = Math.round((expires.getTime() - todayUTC.getTime()) / 86_400_000)

  if (daysUntilExpiry < 0) return 'expired'
  if (daysUntilExpiry <= EXPIRING_SOON_WINDOW_DAYS) return 'expiring_soon'
  return 'active'
}

export function warrantyExpiresOn(applicationDate: string, warrantyDays: number): string {
  const applied = new Date(applicationDate + 'T00:00:00Z')
  applied.setUTCDate(applied.getUTCDate() + warrantyDays)
  return applied.toISOString().slice(0, 10)
}

// Suggested warranty window by target pest, mirroring the guarantee terms
// site/the-nyc-exterminator's marketing pages actually publish (page.tsx,
// quote-request/page.tsx, faq/page.tsx): 30-day general pest control, 90-day
// bed bug heat treatment, annual (365-day) termite bait-station monitoring.
// A suggestion only — the operator can override per application; nothing
// here is enforced server-side.
export function suggestWarrantyDays(targetPest: string | null | undefined): number {
  const s = (targetPest || '').toLowerCase()
  if (/bed ?bug/.test(s)) return 90
  if (/termite/.test(s)) return 365
  return 30
}

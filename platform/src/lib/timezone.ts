/**
 * Derive a US IANA timezone from a ZIP code. Auto-applied on tenant creation so
 * no tenant sits on UTC — times render in the business's local zone everywhere.
 * Coarse by ZIP prefix; good enough for scheduling display, override in settings.
 */
export function zipToTimezone(zip: string | null | undefined): string {
  const prefix = parseInt((zip || '').slice(0, 3), 10)
  if (isNaN(prefix)) return 'America/New_York'
  if (prefix < 400) return 'America/New_York'
  if (prefix < 800) return 'America/Chicago'
  if (prefix < 900) return 'America/Denver'
  return 'America/Los_Angeles'
}

/** Format an ISO timestamp in a tenant's timezone (falls back to ET). */
export function formatInTz(iso: string, timezone?: string | null): string {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: timezone || 'America/New_York',
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

// seomgr — properties that must never receive an AI-drafted proposal or an
// autopilot apply, regardless of how the fleet-wide crons are scheduled.
// thenycmaid.com is mid-cutover to FullLoop and is documented read-only
// elsewhere in the platform (see tenant-health's own EXCLUDED_TENANTS); the
// old recipes.ts module (never shipped) had this exclusion, but the AI-based
// generators that replaced it (remediate.ts, enrich.ts, competitor-remediate.ts,
// autopilot.ts) did not carry it forward. Configurable via env so a domain can
// be added/removed without a code change.
const DEFAULT_EXCLUDED_DOMAINS = ['thenycmaid.com']

function excludedDomains(): Set<string> {
  const raw = process.env.SEOMGR_EXCLUDED_DOMAINS
  const list = raw
    ? raw.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean)
    : DEFAULT_EXCLUDED_DOMAINS
  return new Set(list)
}

function propertyToDomain(property: string): string {
  if (property.startsWith('sc-domain:')) return property.slice('sc-domain:'.length).toLowerCase()
  try {
    return new URL(property).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return property.toLowerCase()
  }
}

/** True if this GSC property (e.g. 'sc-domain:thenycmaid.com') must be skipped by every seomgr write path. */
export function isExcludedProperty(property: string): boolean {
  return excludedDomains().has(propertyToDomain(property))
}

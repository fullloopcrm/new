// Single source of truth for "is this tenant dark" — statuses where a tenant
// must stop serving its site AND stop accepting new writes through public,
// slug/host-resolved entry points (ingest routes, middleware routing, etc).
// Extracted from middleware.ts so callers outside the request/response cycle
// (API routes that resolve a tenant by slug, not by host) can apply the same
// gate instead of re-deriving their own status list and risking drift.
//
// A tenant serves (site + writes) in every state EXCEPT the ones below. New
// tenants are 'setup'/'pending' and must still be servable immediately
// (booking + lead collection work before full activation) — gating on
// status === 'active' would hide every new tenant until onboarding passed.
export const NON_SERVING_STATUSES = new Set(['suspended', 'cancelled', 'deleted'])

export function tenantServesSite(status: string | null | undefined): boolean {
  return !NON_SERVING_STATUSES.has(status ?? '')
}

// Every status value the platform writes anywhere (provisioning, activation,
// admin actions, cancellation). tenantServesSite() above is a case-sensitive
// EXACT match against NON_SERVING_STATUSES, so any writer that isn't
// constrained to this set (e.g. an admin API accepting a free-text status
// body) can silently fail-open: a value like "Suspended" or "banned" would
// write successfully but never match NON_SERVING_STATUSES, leaving the tenant
// fully serving site + dashboard + writes while admins believe it was cut off.
export const KNOWN_TENANT_STATUSES = new Set(['active', 'setup', 'pending', 'suspended', 'cancelled', 'deleted'])

export function isKnownTenantStatus(status: unknown): status is string {
  return typeof status === 'string' && KNOWN_TENANT_STATUSES.has(status)
}

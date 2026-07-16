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

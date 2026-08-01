/**
 * Identifies platform-internal test/sim tenants so operational health checks
 * (system-check cron, readiness/notification metrics) don't get diluted by
 * seed data pretending to be real tenant activity.
 *
 * Two independent signals, either one is sufficient:
 *
 *  1. `slug` starts with "sim-" — the convention scripts/sim-all-trades.ts
 *     (every simulated tenant it creates) and scripts/sim-cleanup.ts (the
 *     sweep that purges them) already use.
 *
 *  2. `selena_config.business_tagline` embeds a "(sim-<runid>)" marker.
 *     provisionTenant() (src/lib/provision-tenant.ts) bakes the tenant's
 *     *name at provisioning time* into the tagline. A tenant later renamed
 *     to a friendlier display name (found live 2026-08-01: "Tucker's
 *     Landscaping Company", originally provisioned as "Tucker's Landscaping
 *     Company (sim-mrqle65i-0fc7)") keeps this fossil in its tagline even
 *     though its slug/name were changed afterward and no longer carry the
 *     sim- prefix — so it would otherwise silently escape signal 1 and keep
 *     polluting any check that only filters on slug. See readiness ledger
 *     ai-06 evidence, 2026-08-01 pass.
 */
const SIM_TAGLINE_MARKER = /\(sim-[a-z0-9-]+\)/i

export interface TestTenantSignals {
  slug?: string | null
  selena_config?: { business_tagline?: string | null } | null
}

export function isKnownTestTenant(tenant: TestTenantSignals): boolean {
  if (tenant.slug?.startsWith('sim-')) return true
  const tagline = tenant.selena_config?.business_tagline
  return !!tagline && SIM_TAGLINE_MARKER.test(tagline)
}

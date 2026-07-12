/**
 * PROOF OF CONVERSION — getSettings SHARED LIB HELPER (DRY probe) — NOT WIRED, REVERSIBLE.
 *
 * The DRY follow-up to the entities-lib proof. Target is again a shared data-access helper,
 * not an inline route read:
 *   - src/lib/settings.ts :: getSettings(tenantId)   (called by ~24 routes/pages — the single
 *     highest-fanout tenant read in the app; one edit here would scope every caller at once)
 *
 * BUT — unlike listEntities, which was a clean one-line DRY win — getSettings is a MIXED-SOURCE
 * read and therefore a DRY *blocker*. Its data access is a `Promise.all` of TWO reads with
 * DIFFERENT cutover-safety:
 *
 *   A. `tenants`       .select('*').eq('id', tenantId).single()
 *        The TENANT REGISTRY table, keyed by `id` — NOT `tenant_id`. It is deliberately excluded
 *        from the 58-table tenant_isolation set (grep of rls-tier-rollout-order.md = 0). The
 *        gap-closure policy shape `USING (tenant_id = auth.jwt()->>'tenant_id')` cannot even be
 *        applied to it (no `tenant_id` column). Routing this read through `tenantClient` would
 *        default-deny the tenant's OWN settings row for EVERY tenant. → NEVER convert; KEEP on
 *        supabaseAdmin (registry lookups are a distinct access class from tenant-scoped reads).
 *
 *   B. `service_types` .select(...).eq('tenant_id', tenantId).order('sort_order')
 *        A genuine tenant-scoped read — BUT `service_types` is ALSO ABSENT from the tier list
 *        (grep = 0) despite being read tenant-scoped at ~22 call sites. So it has no scheduled
 *        `tenant_isolation` policy: converting this read now would default-deny every tenant's
 *        service list (wrong `standard_rate`, empty services) across all 24 getSettings callers.
 *        → CONVERTIBLE in principle, but HOLD until `service_types` is given a tier slot.
 *
 * NET DRY FINDING: the highest-fanout shared helper is NOT a one-line DRY cutover. It decomposes
 * into (A) a registry read that must stay on supabaseAdmin forever and (B) a scoped read that is
 * blocked on a missing tier. This proof shows the KEEP-SCOPE SPLIT: `service_types` moves to the
 * scoped client, `tenants` stays on supabaseAdmin. It stays HOLD end-to-end until `service_types`
 * is tiered. Two extra cutover caveats: getSettings is memoized (`settingsCache`) — a converted
 * read that default-denies would poison the cache for CACHE_TTL; and this helper is the reason
 * `service_types` needs a tier decision before ANY finance/settings cutover.
 *
 * This proof extracts ONLY the DATA-ACCESS shape (the two-read Promise.all) — the ~100 lines of
 * pure settings derivation that consume `{ tenant, services }` are unchanged by the client swap,
 * so they are not copied here. The live `getSettings` is UNCHANGED. Deleting this directory
 * reverts the proof with zero impact.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '../supabase'
import { tenantClient } from '../tenant-client'

/** The exact columns the live helper reads from service_types (order preserved). */
const SERVICE_TYPES_SELECT = 'name, default_duration_hours, default_hourly_rate, active'

/** The raw sources getSettings' derivation consumes. Shape mirrors the live Promise.all. */
export interface SettingsSources {
  tenant: Record<string, unknown> | null
  services: unknown[]
}

/**
 * Converted DATA-ACCESS of getSettings — the KEEP-SCOPE SPLIT.
 *
 *   - `tenants` (registry, keyed by id)  → KEPT on supabaseAdmin (cannot be tenant-scoped).
 *   - `service_types` (tenant-scoped)    → routed through tenantClient(tenantId).
 *
 * Both reads still run in one `Promise.all`, exactly as live. The ONLY change is which client
 * the `service_types` read uses. HOLD: do not wire until `service_types` has a tier slot.
 *
 * Faithful to live: `tenantRes.data` may be null; `servicesRes.data || []`. No throw here —
 * the live helper tolerates a null tenant and derives defaults (errors are not surfaced from
 * this fetch), so the proof mirrors that rather than adding a throw.
 */
export async function fetchSettingsSourcesConverted(tenantId: string): Promise<SettingsSources> {
  const db: SupabaseClient = tenantClient(tenantId) // scoped client — ONLY for the scoped read
  const [tenantRes, servicesRes] = await Promise.all([
    // KEEP on supabaseAdmin: `tenants` is the registry, keyed by `id`, not a tenant_isolation table.
    supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single(),
    // CONVERT (HOLD until service_types tiered): genuine tenant-scoped read.
    db
      .from('service_types')
      .select(SERVICE_TYPES_SELECT)
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: true }),
  ])

  return {
    tenant: (tenantRes.data as Record<string, unknown> | null) ?? null,
    services: (servicesRes.data as unknown[]) ?? [],
  }
}

/**
 * PROOF OF CONVERSION — catalog (service_types) — NOT WIRED, REVERSIBLE.
 *
 * Low-risk GET read converted to the scoped client:
 *   - src/app/api/catalog/route.ts  (GET: list per-tenant catalog items)
 *
 * What this route adds over prior proofs: a POST-FETCH TRANSFORM. Every prior proof
 * returned `data` (optionally wrapped) essentially verbatim. This one runs a real
 * mapping pass AFTER the query resolves — a legacy-price fallback that fills
 * `price_cents` from the old `default_hourly_rate` column (× 100) when the SKU column
 * is NULL, and infers `per_unit: 'hour'` for those legacy rows. The transform is pure
 * (operates on the returned rows, touches no DB) so it is 100% orthogonal to the
 * client swap: `const db = tenantClient(tenantId)` changes only WHO fetches; the
 * `.map(...)` that shapes the response is copied verbatim. This proof pins that the
 * swap does not disturb post-query response shaping.
 *
 * NO CROSS-TABLE DEPENDENCY: single table `service_types`, no embed, no join. The
 * only filter is the tenant scope `.eq('tenant_id', tenantId)` (KEPT verbatim) plus
 * an `.order('sort_order')`. Floor case for RLS cutover — needs only `service_types`
 * to have its own policy; nothing else is load-bearing. No tier-ordering hold.
 *
 * Auth entry is unchanged: the live GET resolves the tenant via `getTenantForRequest()`
 * directly. This proof takes `tenantId` directly so the isolation test exercises both
 * the fetch scoping and the legacy-price fallback without standing up the auth layer.
 *
 * The live route is UNCHANGED. Deleting this directory reverts the proof with zero impact.
 */
import { tenantClient } from '../tenant-client'

/** The columns the live route selects (order preserved for a faithful proof). */
const CATALOG_COLUMNS =
  'id, name, description, item_type, per_unit, unit_label, price_cents, min_charge_cents, cost_cents, taxable, category, default_duration_hours, default_hourly_rate, active, sort_order'

/** A raw `service_types` row as returned by the select above (only the fields the transform reads are typed). */
interface CatalogRow {
  price_cents: number | null
  per_unit: string | null
  default_hourly_rate: number | null
  [key: string]: unknown
}

/**
 * Converted read path of GET /api/catalog. Fetches the tenant's catalog items through
 * the scoped client, then applies the legacy-price fallback verbatim from the live route.
 */
export async function listCatalogConverted(tenantId: string) {
  const db = tenantClient(tenantId) // was: supabaseAdmin — the post-fetch transform is unchanged
  const { data, error } = await db
    .from('service_types')
    .select(CATALOG_COLUMNS)
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true })
  if (error) throw error

  // Legacy/seeded rows carry the hourly rate in the OLD booking column
  // (default_hourly_rate) but leave the SKU column (price_cents) NULL, which renders
  // every seeded service as $0. Fall back to the hourly rate so existing tenants can
  // quote without retyping prices. (Copied verbatim from the live route.)
  const items = ((data as CatalogRow[] | null) || []).map((row) => {
    const { default_hourly_rate, ...rest } = row
    const priceCents =
      rest.price_cents ?? (default_hourly_rate != null ? Math.round(default_hourly_rate * 100) : null)
    return {
      ...rest,
      price_cents: priceCents,
      per_unit:
        rest.per_unit ?? (rest.price_cents == null && default_hourly_rate != null ? 'hour' : rest.per_unit),
    }
  })
  return items
}

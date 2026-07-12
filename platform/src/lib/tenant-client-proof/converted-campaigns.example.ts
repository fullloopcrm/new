/**
 * PROOF OF CONVERSION — campaigns — NOT WIRED, REVERSIBLE.
 *
 * Low-risk GET read converted to the scoped client:
 *   - src/app/api/campaigns/route.ts  (GET: list campaigns)
 *
 * FLOOR case: a single-table, tenant-scoped `.select('*')` with one `.order()` — no joins,
 * counts, or child reads. The conversion is the two-line change: swap the `supabaseAdmin`
 * import for `tenantClient`, `const db = tenantClient(tenantId)`. The `.eq('tenant_id',
 * tenantId)` is KEPT verbatim (defense-in-depth during the rollout window).
 *
 * NEW VARIANT PINNED — error SHAPE differs from the finance/* floor cases. Unlike
 * chart-of-accounts / recurring-expenses (which `throw` on `error` and let the outer
 * try/catch map to a 500), the live campaigns GET SURFACES the DB error inline as
 * `NextResponse.json({ error: error.message }, { status: 500 })` — it never turns a DB
 * error into an empty list. The client swap is orthogonal to that choice: whichever shape a
 * route uses, `tenantClient` returns the same `{ data, error }` envelope. This proof's helper
 * throws so the isolation test can assert the error is surfaced (not swallowed to `[]`); the
 * live route's own 500-JSON surfacing is unchanged.
 *
 * NO CROSS-TABLE RLS DEPENDENCY: `campaigns` is the only table touched — Tier order #54 in
 * deploy-prep/rls-tier-rollout-order.md. Once its own Stage C+D is done this route converts
 * cleanly with no dependency on any other table's policy. Nothing to flag for the cutover
 * beyond the standard node-runtime constraint on tenantClient.
 *
 * Auth entry is unchanged: the live GET resolves the tenant via `getTenantForRequest()`
 * directly (no `requirePermission(...)` wrapper — POST uses that, GET does not). This proof
 * takes `tenantId` directly so the isolation test exercises the DB path without standing up
 * the auth layer. Auth resolution is orthogonal to the client swap.
 *
 * The live route is UNCHANGED. Deleting this directory reverts the proof with zero impact.
 */
import { tenantClient } from '../tenant-client'

/** Converted read path of GET /api/campaigns (bare tenant-scoped list, newest first). */
export async function listCampaignsConverted(tenantId: string) {
  const db = tenantClient(tenantId) // was: supabaseAdmin
  const { data, error } = await db
    .from('campaigns')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

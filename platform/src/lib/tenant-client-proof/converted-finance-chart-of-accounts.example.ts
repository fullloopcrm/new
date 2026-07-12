/**
 * PROOF OF CONVERSION — finance/chart-of-accounts — NOT WIRED, REVERSIBLE.
 *
 * Low-risk GET read converted to the scoped client:
 *   - src/app/api/finance/chart-of-accounts/route.ts  (GET: list chart_of_accounts)
 *
 * This is the FLOOR case: a single-table, tenant-scoped list with one `.order()` and no
 * joins, counts, or child reads. The conversion is the two-line change — swap the
 * `supabaseAdmin` import for `tenantClient`, and `const db = tenantClient(tenantId)`. The
 * `.eq('tenant_id', tenantId)` is KEPT verbatim (defense-in-depth during the rollout window).
 *
 * NO CROSS-TABLE RLS DEPENDENCY: `chart_of_accounts` is the only table touched. It is Tier
 * order #15 in deploy-prep/rls-tier-rollout-order.md, so once its own Stage C+D is done this
 * route converts cleanly with no dependency on any other table's policy. Nothing to flag for
 * the cutover beyond the standard node-runtime constraint on tenantClient.
 *
 * Auth entry is unchanged: the live route resolves the tenant via
 * `requirePermission('finance.view')`; this proof takes `tenantId` directly so the isolation
 * test can exercise the DB path without standing up the permission layer.
 *
 * The live route is UNCHANGED. Deleting this directory reverts the proof with zero impact.
 */
import { tenantClient } from '../tenant-client'

/** Converted read path of GET /api/finance/chart-of-accounts (bare tenant-scoped list). */
export async function listChartOfAccountsConverted(tenantId: string) {
  const db = tenantClient(tenantId) // was: supabaseAdmin
  const { data, error } = await db
    .from('chart_of_accounts')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('code', { ascending: true })
  if (error) throw error
  return data || []
}

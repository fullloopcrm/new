/**
 * PROOF OF CONVERSION — recurring-expenses — NOT WIRED, REVERSIBLE.
 *
 * Low-risk GET read converted to the scoped client:
 *   - src/app/api/recurring-expenses/route.ts  (GET: list active recurring_expenses)
 *
 * Another single-table scoped list, included to cover a DIFFERENT auth entry point from the
 * finance/* routes: this route resolves the tenant with `getTenantForRequest()` DIRECTLY (no
 * `requirePermission(...)` wrapper). The conversion is unaffected — auth resolution is
 * orthogonal to the client swap — but pinning it here documents that both entry styles
 * (`requirePermission` and bare `getTenantForRequest`) convert identically: swap the import,
 * `const db = tenantClient(tenantId)`, keep every `.eq('tenant_id', tenantId)`.
 *
 * Also exercises the `nullsFirst` order option (`.order('next_due_date', { ascending: true,
 * nullsFirst: false })`) — a passthrough that the client swap leaves untouched.
 *
 * NO CROSS-TABLE RLS DEPENDENCY: `recurring_expenses` is the only table touched (Tier order
 * #20 in deploy-prep/rls-tier-rollout-order.md). Once its own Stage C+D is done this route
 * converts cleanly. Nothing to flag beyond the standard node-runtime constraint on tenantClient.
 *
 * The live route is UNCHANGED. Deleting this directory reverts the proof with zero impact.
 */
import { tenantClient } from '../tenant-client'

/** Converted read path of GET /api/recurring-expenses (active list, nullsFirst order). */
export async function listRecurringExpensesConverted(tenantId: string) {
  const db = tenantClient(tenantId) // was: supabaseAdmin
  const { data, error } = await db
    .from('recurring_expenses')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('next_due_date', { ascending: true, nullsFirst: false })
  if (error) throw error
  return data || []
}

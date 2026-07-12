/**
 * PROOF OF CONVERSION — cleaners (team_members roster) — NOT WIRED, REVERSIBLE.
 *
 * Low-risk GET read converted to the scoped client:
 *   - src/app/api/cleaners/route.ts  (GET: list the tenant's worker roster)
 *
 * What this route adds over prior proofs: a TABLE-ALIAS route whose URL name does not
 * match the table it reads. `/api/cleaners` is a legacy nycmaid compatibility shim that
 * actually selects from `team_members` (see the live route's header comment). Every
 * prior proof read a table that matched its route name; this one pins that the client
 * swap is driven by the TABLE in `.from(...)`, not the route path — so the isolation
 * test asserts the recorded table is `team_members`, catching any future refactor that
 * silently repoints the alias.
 *
 * Secondary NEW variant: MULTI-KEY ORDER where the PRIMARY sort carries an explicit
 * `nullsFirst: false` and the SECONDARY sort takes no options at all
 * (`.order('priority', { ascending: true, nullsFirst: false }).order('name')`). The
 * proof keeps both order calls verbatim so the swap is proven orthogonal to a two-level
 * sort with mixed option shapes (one with opts, one bare).
 *
 * NO CROSS-TABLE DEPENDENCY: single table `team_members`, no embed, no join. The only
 * filter is the tenant scope `.eq('tenant_id', tenantId)` (KEPT verbatim). Floor case
 * for RLS cutover — needs only `team_members` to have its own policy; nothing else is
 * load-bearing, no tier-ordering hold.
 *
 * TIER FLAG (surfaced, not fixed): `team_members` is ABSENT from
 * deploy-prep/rls-tier-rollout-order.md (grep count 0). The list carries `cleaners` (#32)
 * as "Worker identity/roster" but the base table this shim reads is `team_members`. That
 * table needs its own tier slot + policy before this route (or any bookings embed of
 * `team_members!fkey`) is non-vacuous under RLS. Flagging so the tier list can be closed.
 *
 * Auth entry is unchanged: the live GET resolves the tenant via `requirePermission('team.view')`.
 * This proof takes `tenantId` directly so the isolation test exercises fetch scoping and
 * ordering without standing up the permission layer.
 *
 * The live route is UNCHANGED. Deleting this directory reverts the proof with zero impact.
 */
import { tenantClient } from '../tenant-client'

/**
 * Converted read path of GET /api/cleaners. Fetches the tenant's worker roster from
 * `team_members` through the scoped client; the two-level ordering is copied verbatim.
 * Returns the bare row array (matching the live route's `NextResponse.json(data)` shape);
 * surfaces the DB error instead of swallowing it to `[]`.
 */
export async function listCleanersConverted(tenantId: string) {
  const db = tenantClient(tenantId) // was: supabaseAdmin — ordering is unchanged
  const { data, error } = await db
    .from('team_members')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('priority', { ascending: true, nullsFirst: false })
    .order('name')
  if (error) throw error
  return data ?? []
}

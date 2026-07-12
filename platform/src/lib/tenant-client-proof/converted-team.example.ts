/**
 * PROOF OF CONVERSION — team roster read route — NOT WIRED, REVERSIBLE.
 *
 * Low-risk GET read converted to the scoped client:
 *   - src/app/api/team/route.ts  (GET: list the tenant's team_members roster)
 *
 * ANOTHER INDEPENDENT `team_members` WITNESS: this is a separate call site from `cleaners`
 * (`/api/cleaners`, a legacy table-alias route) — same table, different route, different
 * shape. `cleaners` returns the BARE array (`NextResponse.json(data)`) ordered by a two-level
 * `priority`/`name` sort with an explicit `nullsFirst: false`. `team` instead wraps the result
 * as `{ team: data }` and uses a SINGLE bare `.order('created_at', desc)` with no options object
 * at all. The client swap is identical either way — this proof pins that the swap is orthogonal
 * to BOTH the response envelope and the order-clause shape.
 *
 * TIER FLAG (same gap, one more dependent site): `team_members` is ABSENT from
 * deploy-prep/rls-tier-rollout-order.md (grep count 0) — the SAME systemic gap already flagged
 * by `cleaners`, `bookings/closeout`, `schedules`, `crews`, `routes`, and now `setup-checklist`.
 * This route is another independent reader that needs `team_members` tiered + policied before
 * cutover is non-vacuous for it. Floor case otherwise: single table, no embed, no cross-table
 * dependency, no tier-ORDERING hazard.
 *
 * ERROR SHAPE, same family as `campaigns`: the live route surfaces the DB error inline as
 * `NextResponse.json({ error: error.message }, { status: 500 })`, not by throwing into an outer
 * catch (contrast `catalog`/`jobs`/`routes`, which `throw`) — and NOT swallowed to `[]` either
 * (contrast `security-events`/`sidebar-counts`, which swallow). Either way the DB error reaches
 * the client as a 500, never a masked empty roster. This proof's helper throws on error so the
 * isolation test can assert the failure is surfaced, not swallowed; the live route's own
 * inline-JSON surfacing is unchanged by the client swap.
 *
 * Auth entry is unchanged: the live GET resolves the tenant via `getTenantForRequest()`. This
 * proof takes `tenantId` directly. GET-only; the POST half (team member creation, PIN
 * generation, `getSettings` default-fill) is untouched.
 *
 * The live route is UNCHANGED. Deleting this directory reverts the proof with zero impact.
 */
import { tenantClient } from '../tenant-client'

/**
 * Converted read path of GET /api/team. Fetches the tenant's team_members roster through the
 * scoped client, newest-first, wrapped as `{ team }` (matching the live route's shape exactly).
 * Surfaces a read error via `throw` (the live route maps it to a 500), never swallowing to `[]`.
 */
export async function listTeamConverted(tenantId: string) {
  const db = tenantClient(tenantId) // was: supabaseAdmin — order/shape unchanged
  const { data, error } = await db
    .from('team_members')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return { team: data }
}

/**
 * PROOF OF CONVERSION — recurring schedules list — NOT WIRED, REVERSIBLE.
 *
 * Low-risk GET read converted to the scoped client:
 *   - src/app/api/schedules/route.ts  (GET: every recurring schedule for the tenant, with the
 *     client name and the assigned team member's name)
 *
 * What this route adds over prior proofs: a THIRD, INDEPENDENT witness that `team_members` has
 * no tier slot. The read is a single parent (`recurring_schedules`, tier #35) with TWO embeds
 * of opposite cutover-safety:
 *
 *   - `clients(name)`       — child `clients` is tier #1, BEFORE parent #35 → SAFE.
 *   - `team_members(name)`  — `team_members` is ABSENT from rls-tier-rollout-order.md
 *                             (grep count 0). It is scheduled by NO tier, so at the moment
 *                             `recurring_schedules` cuts over there is no guarantee a
 *                             `team_members` policy exists → the embed default-denies and every
 *                             schedule renders with a NULL team member name. INVERSION HAZARD.
 *
 * CUTOVER RULE: HOLD until `team_members` is given its own tier slot (and cut over before this
 * route), OR keep-scope the `team_members(name)` embed on `supabaseAdmin` while the rest of
 * the read moves. Do NOT cut `recurring_schedules` over on the strength of the safe `clients`
 * embed alone.
 *
 * This is the same team_members tier-gap flagged twice already, now hit a THIRD way:
 *   - /api/cleaners            reads `team_members` DIRECTLY (table-alias route).
 *   - /api/bookings/closeout   embeds `team_members!fkey`.
 *   - /api/schedules           embeds `team_members(name)`  ← this file.
 * Three distinct call sites depend on a table with no enable-order → the gap is systemic, not
 * incidental. Fix once: add `team_members` to the tier list before ANY of these cut over.
 *
 * ERROR HANDLING — faithful: the live route returns a 500 inline on a read error and does NOT
 * swallow to `[]`. The extracted function surfaces that by `throw`ing; the route layer maps it
 * to the 500 JSON. Note the live route returns `{ schedules: data }` WITHOUT coalescing to
 * `[]` — this proof mirrors that verbatim rather than "improving" it.
 *
 * Auth entry is unchanged: the live GET authenticates via `getTenantForRequest()`. This proof
 * takes `tenantId` directly. The POST half (create schedule + generate bookings) is untouched.
 *
 * The live route is UNCHANGED. Deleting this directory reverts the proof with zero impact.
 */
import { tenantClient } from '../tenant-client'

/**
 * The columns/embeds the live GET selects (order preserved). `clients(name)` is SAFE (tier #1);
 * `team_members(name)` is the INVERSION HAZARD (untiered) — see the module header cutover rule.
 */
const SCHEDULES_SELECT = '*, clients(name), team_members(name)'

/**
 * Converted read path of GET /api/schedules. Lists every recurring schedule for the tenant
 * (with the clients + team_members embeds) through the scoped client, keeping the tenant
 * scope and the created-at-desc order, and returns the `{ schedules }` payload shape verbatim
 * (no `?? []` — matching the live route). Surfaces a read error via `throw`; never swallows.
 *
 * The ONLY change from the live route is the client: `tenantClient(tenantId)` where it read
 * `supabaseAdmin`. Select, scope and order are byte-for-byte unchanged.
 *
 * HOLD: do not wire this until `team_members` has a tier slot (see module header).
 */
export async function listSchedulesConverted(tenantId: string): Promise<{ schedules: unknown }> {
  const db = tenantClient(tenantId) // was: supabaseAdmin — select/scope/order unchanged
  const { data, error } = await db
    .from('recurring_schedules')
    .select(SCHEDULES_SELECT)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return { schedules: data } // faithful: live route does not coalesce to []
}

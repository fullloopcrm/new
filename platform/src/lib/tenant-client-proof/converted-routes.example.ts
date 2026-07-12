/**
 * PROOF OF CONVERSION — dispatch routes list — NOT WIRED, REVERSIBLE.
 *
 * Low-risk GET read converted to the scoped client:
 *   - src/app/api/routes/route.ts  (GET: the tenant's dispatch routes + assigned member,
 *     with an optional date / member / status / date-range filter set)
 *
 * What this route adds over prior proofs: an OPTIONAL RANGE-FILTER PAIR on the SAME column.
 * The quotes proof introduced the optional-`.eq()` chain (status/client_id/deal_id appended
 * only when supplied). This read goes further — `route_date` participates in FOUR clauses at
 * once, and the swap must leave every one intact:
 *
 *   - a FIXED `.order('route_date', desc)` (primary sort, always present)
 *   - an OPTIONAL exact `.eq('route_date', date)`   when `?date=` is supplied
 *   - an OPTIONAL lower bound `.gte('route_date', from)` when `?from=` is supplied
 *   - an OPTIONAL upper bound `.lte('route_date', to)`   when `?to=` is supplied
 *
 * `from`+`to` together form a BOUNDED RANGE — the first `.gte`/`.lte` pair in the proof set.
 * Plus two more optional exact filters (`team_member_id`, `status`), a secondary
 * `.order('created_at', desc)`, and a `.limit(500)`. The client swap is orthogonal to the
 * whole conditional builder: the base query (select/embed/scope/orders/limit) is byte-for-byte
 * unchanged, and each optional clause is appended exactly as the live route appends it.
 *
 * CROSS-TABLE DEPENDENCY — HOLD (team_members inversion hazard, Nth witness):
 *   - `team_members(id, name, phone, home_latitude, home_longitude)` — `team_members` is
 *     ABSENT from rls-tier-rollout-order.md (grep = 0). Parent `routes` is tier #37. At
 *     cutover, if `team_members` has no policy the embed default-denies → every route renders
 *     with a NULL member sub-object (the dispatch UI loses the assigned worker's name/phone/
 *     home coords). This is the SAME systemic gap flagged in /cleaners, /bookings/closeout,
 *     /schedules and /crews — `team_members` now has FIVE dependent call sites. CUTOVER RULE:
 *     HOLD `routes` until `team_members` gets a tier slot (enabled before `routes` #37) OR
 *     keep-scope that embed; do NOT cut `routes` over on its own #37 slot alone.
 *
 * ERROR HANDLING — faithful to the "surfaced, not swallowed" convention: the live route does
 * `if (error) throw error` (the route's catch maps it to a 500). The extracted function
 * surfaces the read error via `throw`; it does NOT swallow to `[]`.
 *
 * Auth entry is unchanged: the live GET authenticates via `getTenantForRequest()`. This proof
 * takes `tenantId` directly plus the parsed filter object (the URL parsing is the upstream
 * entry, unchanged by the swap). The POST half (route insert + booking back-link) is
 * untouched — this proof only converts the GET read path.
 *
 * The live route is UNCHANGED. Deleting this directory reverts the proof with zero impact.
 */
import { tenantClient } from '../tenant-client'

/** The columns/embed the live GET selects. `team_members(...)` is the (untiered) embed. */
const ROUTES_SELECT = '*, team_members(id, name, phone, home_latitude, home_longitude)'

/** Max rows the live route returns. */
const ROUTES_LIMIT = 500

/** The optional filters the live route reads from the query string (all nullable). */
export interface RoutesFilters {
  /** Exact `route_date` match. */
  date?: string | null
  /** Exact assigned-member match. */
  teamMemberId?: string | null
  /** Exact status match. */
  status?: string | null
  /** Inclusive lower bound on `route_date`. */
  from?: string | null
  /** Inclusive upper bound on `route_date`. */
  to?: string | null
}

/**
 * Converted read path of GET /api/routes. Lists the tenant's dispatch routes (with the
 * untiered `team_members` embed) through the scoped client, keeping the tenant scope, the
 * dual route_date-desc / created_at-desc order and the 500-row limit, then appends the SAME
 * optional filters the live route appends — including the `from`/`to` bounded range on
 * `route_date`. Returns the `{ routes }` payload shape. Surfaces a read error via `throw`
 * (the route maps it to a 500), never swallowing to `[]`.
 *
 * The ONLY change from the live route is the client: `tenantClient(tenantId)` where it read
 * `supabaseAdmin`. Select, scope, orders, limit and the conditional filter chain are unchanged.
 */
export async function listRoutesConverted(
  tenantId: string,
  filters: RoutesFilters = {},
): Promise<{ routes: unknown[] }> {
  const db = tenantClient(tenantId) // was: supabaseAdmin — base query + filter chain unchanged
  let q = db
    .from('routes')
    .select(ROUTES_SELECT)
    .eq('tenant_id', tenantId)
    .order('route_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(ROUTES_LIMIT)

  if (filters.date) q = q.eq('route_date', filters.date)
  if (filters.teamMemberId) q = q.eq('team_member_id', filters.teamMemberId)
  if (filters.status) q = q.eq('status', filters.status)
  if (filters.from) q = q.gte('route_date', filters.from)
  if (filters.to) q = q.lte('route_date', filters.to)

  const { data, error } = await q
  if (error) throw error
  return { routes: data ?? [] }
}

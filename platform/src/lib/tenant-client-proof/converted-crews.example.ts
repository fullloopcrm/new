/**
 * PROOF OF CONVERSION — crews list — NOT WIRED, REVERSIBLE.
 *
 * Low-risk GET read converted to the scoped client:
 *   - src/app/api/crews/route.ts  (GET: every crew for the tenant + its members' names)
 *
 * What this route adds over prior proofs: a TWO-LEVEL NESTED EMBED — the first in the
 * proof set. Every prior embed was single-level (parent → one child, e.g. projects →
 * `clients(name)`). Here the parent `crews` (tier #34) embeds a join table which itself
 * embeds a second table:
 *
 *   crews
 *     └─ crew_members(team_member_id, team_members(id, name))   ← nested one level deeper
 *          └─ team_members(id, name)
 *
 * BOTH embed levels are UNTIERED — a DOUBLE inversion hazard, and the sharpest tier-gap
 * case yet:
 *   - `crew_members` — ABSENT from rls-tier-rollout-order.md (grep = 0). NEW untiered-table
 *     flag: this is the join table that carries the crew↔member assignment; it has never
 *     appeared in the proof set before, so it is a fresh gap, not a re-witness.
 *   - `team_members`  — ABSENT from rls-tier-rollout-order.md (grep = 0). Now the FOURTH
 *     independent call site depending on it (/cleaners direct read, /bookings/closeout
 *     team_members!fkey embed, /schedules team_members(name) embed, and now this NESTED
 *     crews embed). Same systemic gap flagged in those proofs.
 *
 * CUTOVER RULE: HOLD. At cutover, if `crew_members` lacks a policy the whole nested embed
 * default-denies → every crew shows an EMPTY member list; if `team_members` lacks a policy
 * the inner leaf default-denies → every member name collapses to the `'—'` fallback (see the
 * post-fetch shape below). Because the hazard is TWO tables deep, both `crew_members` AND
 * `team_members` need tier slots (enabled BEFORE `crews` #34) before this reads correctly.
 * Do NOT cut `crews` over on its own tier slot alone.
 *
 * POST-FETCH SHAPE (orthogonal to the swap, preserved byte-for-byte): the live route maps the
 * raw rows into `{ id, name, color, active, members: [{ id, name }] }`, flattening PostgREST's
 * Array-or-object embed shape (`Array.isArray(team_members) ? [0] : team_members`) and
 * defaulting a missing/denied member name to `'—'`. That transform is pure and independent of
 * which client issued the read, so it is copied verbatim; the ONLY change is the client.
 *
 * ERROR HANDLING — faithful to the "surfaced, not swallowed" convention: the live route does
 * `if (error) throw error` (the route's catch maps it to a 500). The extracted function
 * surfaces the read error via `throw`; it does NOT swallow to `[]`.
 *
 * Auth entry is unchanged: the live GET authenticates via `getTenantForRequest()`. This proof
 * takes `tenantId` directly so the isolation test exercises the read + nested embed + shape
 * without the auth layer. The POST/PATCH/DELETE halves (and the `crew_members` writes in
 * `setMembers`) are untouched — this proof only converts the GET read path.
 *
 * The live route is UNCHANGED. Deleting this directory reverts the proof with zero impact.
 */
import { tenantClient } from '../tenant-client'

/** The columns/embed the live GET selects: parent + a TWO-LEVEL nested embed. */
const CREWS_SELECT = 'id, name, color, active, crew_members(team_member_id, team_members(id, name))'

/** One assignment row as PostgREST returns it — the inner embed may be object OR array. */
type MemberRow = {
  team_member_id: string
  team_members: { name: string | null } | { name: string | null }[] | null
}

/** The shaped crew the live route returns (member names flattened, `'—'` on missing). */
export interface ShapedCrew {
  id: unknown
  name: unknown
  color: unknown
  active: unknown
  members: Array<{ id: string; name: string }>
}

/**
 * Converted read path of GET /api/crews. Lists every crew for the tenant with its members'
 * names (via the two-level nested `crew_members → team_members` embed) through the scoped
 * client, keeping the tenant scope and the name-asc order, then applies the SAME post-fetch
 * flatten/`'—'` shaping the live route does, returning the `{ crews }` payload shape.
 * Surfaces a read error via `throw` (the route maps it to a 500), never swallowing to `[]`.
 *
 * The ONLY change from the live route is the client: `tenantClient(tenantId)` where it read
 * `supabaseAdmin`. Select (incl. the nested embed), scope, order and shaping are unchanged.
 */
export async function listCrewsConverted(tenantId: string): Promise<{ crews: ShapedCrew[] }> {
  const db = tenantClient(tenantId) // was: supabaseAdmin — select/embed/scope/order/shape unchanged
  const { data: crews, error } = await db
    .from('crews')
    .select(CREWS_SELECT)
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true })
  if (error) throw error

  const shaped: ShapedCrew[] = ((crews as Array<Record<string, unknown>>) || []).map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    active: c.active,
    members: ((c.crew_members || []) as MemberRow[]).map((m) => {
      const tm = Array.isArray(m.team_members) ? m.team_members[0] : m.team_members
      return { id: m.team_member_id, name: tm?.name || '—' }
    }),
  }))
  return { crews: shaped }
}

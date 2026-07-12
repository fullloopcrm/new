/**
 * PROOF OF CONVERSION — projects list — NOT WIRED, REVERSIBLE.
 *
 * Low-risk GET read converted to the scoped client:
 *   - src/app/api/projects/route.ts  (GET: every project for the tenant + the client name)
 *
 * What this route adds over prior proofs: a UNIFORMLY-SAFE parent+child embed — the clean
 * counterpart to the jobs MIXED embed. The read is a single parent (`projects`, tier #29)
 * with exactly ONE embed:
 *
 *   - `clients(name)`  — child `clients` is tier #1, BEFORE parent `projects` #29. SAFE: the
 *                        child policy is load-bearing well before `projects` cuts over, so the
 *                        embed never default-denies at cutover.
 *
 * Because the ONLY embed is a tier-1 child, this is a clean SAFE cutover with NO hold — the
 * opposite end of the spectrum from jobs (`clients` safe BUT `job_payments` #28 after parent
 * #26 → HOLD) and from bookings/closeout (`team_members` untiered → HOLD). Cutover rule:
 * SAFE to swap once `projects` (#29) has its policy; nothing else is load-bearing for THIS
 * read. Contrast the three embed shapes now in the proof set:
 *   - projects      = parent + ONE tier-1 child        → uniformly SAFE (this file)
 *   - jobs          = parent + safe child + late child → SPLIT, HOLD on the late child
 *   - bookings      = parent + safe child + UNtiered   → HOLD on the untiered child
 *
 * ERROR HANDLING — faithful to the "surfaced, not swallowed" convention: the live route
 * returns a 500 inline on a read error (`if (error) return …status:500`). The extracted
 * function surfaces that by `throw`ing; the route layer is what maps it to the 500 JSON. It
 * does NOT swallow to `[]`.
 *
 * Auth entry is unchanged: the live GET authenticates via `getTenantForRequest()`. This proof
 * takes `tenantId` directly so the isolation test exercises the read + embed without the auth
 * layer. The POST half of the live route (project + span-booking insert) is untouched — this
 * proof only converts the GET read path.
 *
 * The live route is UNCHANGED. Deleting this directory reverts the proof with zero impact.
 */
import { tenantClient } from '../tenant-client'

/** The columns/embed the live GET selects. `clients(name)` is the sole (tier-1, safe) embed. */
const PROJECTS_SELECT = '*, clients(name)'

/**
 * Converted read path of GET /api/projects. Lists every project for the tenant (with the
 * safe `clients(name)` embed) through the scoped client, keeping the tenant scope and the
 * start-date-asc order, and returns the `{ projects }` payload shape. Surfaces a read error
 * via `throw` (the route maps it to a 500), never swallowing to `[]`.
 *
 * The ONLY change from the live route is the client: `tenantClient(tenantId)` where it read
 * `supabaseAdmin`. Select, scope and order are byte-for-byte unchanged.
 */
export async function listProjectsConverted(tenantId: string): Promise<{ projects: unknown[] }> {
  const db = tenantClient(tenantId) // was: supabaseAdmin — select/scope/order unchanged
  const { data, error } = await db
    .from('projects')
    .select(PROJECTS_SELECT)
    .eq('tenant_id', tenantId)
    .order('start_date', { ascending: true })
  if (error) throw error
  return { projects: data ?? [] }
}

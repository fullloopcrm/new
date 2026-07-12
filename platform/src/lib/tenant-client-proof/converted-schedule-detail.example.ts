/**
 * PROOF OF CONVERSION — recurring-schedule DETAIL (by id) — NOT WIRED, REVERSIBLE.
 *
 * Low-risk GET read converted to the scoped client:
 *   - src/app/api/schedules/[id]/route.ts  (GET: one schedule by id + its generated bookings)
 *
 * What this route adds over prior proofs (three distinct NEW facts in one read):
 *
 *  1. FIRST BY-ID DETAIL READ off a dynamic `[id]` path segment. Prior `.single()` was the
 *     referrers lookup (by ?code/?email query). This resolves ONE row by its primary key
 *     (`.eq('id', id).single()`), where `id` comes from the route path — the single-object
 *     detail counterpart to all the prior list reads.
 *
 *  2. PARALLEL parent + children via `Promise.all`, on TWO tables joined by the same id:
 *     the parent `recurring_schedules` (`.eq('id', id).single()`) and its children `bookings`
 *     (`.eq('schedule_id', id).order('start_time')`). One reused tenantClient serves both;
 *     the two reads fire concurrently and are stitched into `{ schedule, bookings }`.
 *
 *  3. IDOR LENS — CLEAN WITNESS (this is why the by-id shape is safe to convert). The leader's
 *     IDOR directive: flag any by-id read that omits tenant scope (the W4 selena class). Here
 *     BOTH reads pair the id filter with `.eq('tenant_id', tenantId)`:
 *        parent:   `.eq('id', id).eq('tenant_id', tenantId)`
 *        children: `.eq('schedule_id', id).eq('tenant_id', tenantId)`
 *     so a caller cannot fetch another tenant's schedule (or its bookings) by guessing an id.
 *     NO IDOR — this route already does the right thing; the tests PIN that both filters
 *     survive the swap. Documented as the correct-pattern counter-example to the selena flag.
 *     Under tenantClient the RLS policy re-enforces the same scope, so conversion only tightens
 *     it; keep the explicit `.eq('tenant_id', …)` through the rollout (belt + suspenders).
 *
 * CROSS-TABLE DEPENDENCY on the parent's embed — MIXED (same as the schedules LIST proof):
 *   - `clients(name, phone, address)` — `clients` is tier #1, BEFORE parent
 *     `recurring_schedules` #35. SAFE: the child policy is load-bearing well before the parent
 *     cuts over.
 *   - `team_members(name, phone)` — `team_members` is ABSENT from rls-tier-rollout-order.md
 *     (grep = 0). INVERSION HAZARD: at cutover the embed default-denies → the schedule shows a
 *     NULL team-member sub-object. `team_members` now has SIX dependent call sites. HOLD until
 *     `team_members` gets a tier slot (before #35) or keep-scope that embed.
 *   The children read `bookings` (tier #2) is `.select('*')` — no embed, its own tenant scope.
 *
 * ERROR HANDLING — DELIBERATELY FAITHFUL SWALLOW (like referrers, unlike client-contacts): the
 * live route destructures ONLY `{ data: schedule }` / `{ data: bookings }` and ignores both
 * `error`s. So an RLS default-deny AND a genuine no-row both render `schedule = null` → the
 * route maps that to a 404 (and `bookings` may be null). The proof reproduces that swallow
 * verbatim (it does NOT "improve" the route to throw) and a test pins it, so the silent-denial
 * behavior is documented rather than hidden.
 *
 * Auth entry is unchanged: the live GET authenticates via `getTenantForRequest()`. This proof
 * takes `tenantId` + `id` directly (the auth + path parsing are the upstream entry, unchanged
 * by the swap). The PUT / DELETE halves are untouched — this proof only converts the GET read.
 *
 * The live route is UNCHANGED. Deleting this directory reverts the proof with zero impact.
 */
import { tenantClient } from '../tenant-client'

/** The parent select: mixed embed — clients (tier #1, SAFE) + team_members (untiered, HOLD). */
const SCHEDULE_SELECT = '*, clients(name, phone, address), team_members(name, phone)'

/** The stitched payload the live route returns. `schedule` null → the route's 404. */
export interface ScheduleDetail {
  schedule: Record<string, unknown> | null
  bookings: unknown[] | null
}

/**
 * Converted read path of GET /api/schedules/[id]. Fetches, through ONE reused scoped client
 * and in PARALLEL, the schedule by id (with its mixed clients+team_members embed) and its
 * generated bookings ordered by start_time — BOTH reads keeping BOTH the id filter and the
 * `.eq('tenant_id', …)` scope (IDOR-clean). Returns the `{ schedule, bookings }` pair,
 * faithfully IGNORING both reads' errors (swallow-to-null → the route's 404), matching the
 * live route which destructures only `data`.
 *
 * The ONLY change from the live route is the client: `tenantClient(tenantId)` where it read
 * `supabaseAdmin`. Selects, id filters, tenant scopes, order and the Promise.all are unchanged.
 */
export async function getScheduleDetailConverted(tenantId: string, id: string): Promise<ScheduleDetail> {
  const db = tenantClient(tenantId) // was: supabaseAdmin — both reads keep id + tenant scope
  const [{ data: schedule }, { data: bookings }] = await Promise.all([
    db
      .from('recurring_schedules')
      .select(SCHEDULE_SELECT)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single(),
    db
      .from('bookings')
      .select('*')
      .eq('schedule_id', id)
      .eq('tenant_id', tenantId)
      .order('start_time'),
  ])

  return {
    schedule: (schedule as Record<string, unknown> | null) ?? null,
    bookings: (bookings as unknown[] | null) ?? null,
  }
}

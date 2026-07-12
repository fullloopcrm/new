/**
 * PROOF OF CONVERSION — setup-checklist read route — NOT WIRED, REVERSIBLE.
 *
 * Low-risk GET read converted to the scoped client:
 *   - src/app/api/setup-checklist/route.ts  (GET: onboarding checklist + progress totals)
 *
 * WIDEST FAN-OUT YET: a SIX-way `Promise.all` — five parallel COUNTs (clients, service_types,
 * team_members, bookings, campaigns) plus one parallel DATA query (reviews, `.limit(1)`,
 * existence-check shape, not a count). Prior widest was sidebar-counts' four parallel counts
 * + a sequential connect sub-block; deals-at-risk was three independent full reads. This is the
 * first proof with a `.limit(1)` existence-probe alongside true counts in the SAME Promise.all —
 * the client swap treats both call shapes identically: all six `.from(...)` calls move onto the
 * SAME `tenantClient(tenantId)` instance, every `.eq('tenant_id', ...)` (plus the two chained
 * `.eq('active', true)` / `.eq('status', 'active')` compound filters) is KEPT verbatim.
 *
 * TIER-GAP CENSUS across the six reads (grep of rls-tier-rollout-order.md):
 *   - `clients` — tier #1 (tiered)
 *   - `bookings` — tier #2 (tiered)
 *   - `campaigns` — tier #54 (tiered)
 *   - `reviews` — tier #55 (tiered)
 *   - `service_types` — ABSENT (grep 0) — the SAME untiered gap flagged by `catalog` /
 *     `settings.ts`'s getSettings split.
 *   - `team_members` — ABSENT (grep 0) — the SAME systemic gap flagged by `cleaners` /
 *     `bookings/closeout` / `schedules` / `crews` / `routes`; this is another independent
 *     call site depending on it.
 *
 * CROSS-TABLE CLASS: like deals-at-risk and sidebar-counts, these are SIX INDEPENDENT top-level
 * reads (no embed, no read passes through another's row) — a missing policy on any one of them
 * default-denies THAT read to 0/empty, degrading gracefully (a checklist item just reads as "0
 * done" or "not done yet"), not a null sub-object. HOLD cutover until all six tables are
 * load-bearing so the checklist reports accurate progress; no tier-ORDERING inversion hazard
 * (nothing here is "read through" another row).
 *
 * EXTRACTION SCOPE: the live route uses these six results purely as booleans/counts feeding
 * ~165 lines of pure checklist-section construction (labels, hrefs, `done` flags, then a
 * flatten + count pass for `completed`/`total`). That derivation touches no DB and is identical
 * before/after the swap, so — matching the extraction convention of prior helper/multi-read
 * proofs (deals-at-risk, jobs) — only the six-query data-access is reproduced here; the section
 * construction is unchanged/omitted.
 *
 * Faithful: the live route destructures only the six values it needs from Promise.all — no
 * `error` is captured or checked on any of the six reads (a DB error resolves with `data: null`/
 * `count: null`, which the `|| 0` / `|| []` fallbacks below turn into a "nothing done yet" read,
 * NOT a thrown 500). This proof reproduces that swallow verbatim.
 *
 * Auth entry is unchanged: the live GET resolves the tenant via `getTenantForRequest()`. This
 * proof takes `tenantId` directly. GET-only; the POST half (marking checklist progress) is
 * untouched.
 *
 * The live route is UNCHANGED. Deleting this directory reverts the proof with zero impact.
 */
import { tenantClient } from '../tenant-client'

export interface SetupChecklistCounts {
  clientCount: number
  serviceCount: number
  teamCount: number
  bookingCount: number
  campaignCount: number
  hasReview: boolean
}

/**
 * Converted read path of GET /api/setup-checklist's data-access half. Fetches the six inputs
 * the checklist derivation needs through ONE scoped client, exactly as the live route's
 * `Promise.all` does — five counts plus a one-row reviews existence probe.
 */
export async function setupChecklistCountsConverted(tenantId: string): Promise<SetupChecklistCounts> {
  const db = tenantClient(tenantId) // was: supabaseAdmin — every .from() below is now scoped

  const [
    { count: clientCount },
    { count: serviceCount },
    { count: teamCount },
    { count: bookingCount },
    { count: campaignCount },
    { data: recentReviewReq },
  ] = await Promise.all([
    db.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    db
      .from('service_types')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('active', true),
    db
      .from('team_members')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'active'),
    db.from('bookings').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    db.from('campaigns').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    db.from('reviews').select('id').eq('tenant_id', tenantId).limit(1),
  ])

  return {
    clientCount: clientCount || 0,
    serviceCount: serviceCount || 0,
    teamCount: teamCount || 0,
    bookingCount: bookingCount || 0,
    campaignCount: campaignCount || 0,
    hasReview: !!(recentReviewReq && recentReviewReq.length > 0),
  }
}

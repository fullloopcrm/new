/**
 * PROOF OF CONVERSION — reviews — NOT WIRED, REVERSIBLE.
 *
 * Low-risk GET read converted to the scoped client:
 *   - src/app/api/reviews/route.ts  (GET: list reviews + embedded client name)
 *
 * What this route adds over the floor case: a SINGLE embedded-join select
 * (`clients(name)`) alongside the tenant-scoped list. The conversion is still the two-line
 * client swap; the `.eq('tenant_id', tenantId)` is KEPT verbatim.
 *
 * CROSS-TABLE RLS DEPENDENCY — but the SAFE ordering (the finding here, contrast to
 * bank-accounts): the embedded `clients(name)` reads `clients` THROUGH the scoped client, so
 * `clients` must have an RLS policy before this route converts, or under an authenticated
 * token that embed default-denies and comes back `null` (the review rows still return, but
 * `clients` on each row silently nulls out).
 *
 * Unlike bank-accounts — where the parent (#4) embeds children that are LATER in the tier
 * order (#15/#17), inverting the dependency rule — here the ordering is already correct:
 * parent `reviews` is Tier #55 (Tier 5, last), embedded child `clients` is Tier #1 (Tier 1,
 * first). `clients` becomes load-bearing FAR earlier than `reviews`, so by the time reviews
 * cuts over at #55 the embed's child policy has been in place for four tiers. No hold, no
 * hazard — this is the case the tier order was built to produce. Only note for the cutover:
 * verify `clients` Stage C+D is done (it is, by #1) before flipping reviews.
 *
 * Auth entry is unchanged: the live GET resolves the tenant via `getTenantForRequest()`
 * directly. This proof takes `tenantId` directly so the isolation test exercises the DB path
 * without standing up the auth layer. Auth resolution is orthogonal to the client swap.
 *
 * The live route is UNCHANGED. Deleting this directory reverts the proof with zero impact.
 */
import { tenantClient } from '../tenant-client'

/** Converted read path of GET /api/reviews (tenant-scoped list + embedded client name). */
export async function listReviewsConverted(tenantId: string) {
  const db = tenantClient(tenantId) // was: supabaseAdmin — the clients(name) embed is now scoped too
  const { data, error } = await db
    .from('reviews')
    .select('*, clients(name)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

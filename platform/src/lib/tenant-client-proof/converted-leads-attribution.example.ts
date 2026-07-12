/**
 * PROOF OF CONVERSION — leads/attribution — NOT WIRED, REVERSIBLE.
 *
 * Low-risk GET read converted to the scoped client:
 *   - src/app/api/leads/attribution/route.ts  (GET: referrer breakdown from website_visits)
 *
 * What this route adds: a scoped read feeding IN-MEMORY aggregation (referrer → source
 * bucketing + sort). The conversion is the same two-line change (swap the import;
 * `const db = tenantClient(tenantId)` in place of `supabaseAdmin`); the aggregation is pure
 * JS and unchanged. The base `.eq('tenant_id', tenantId)` is KEPT verbatim.
 *
 * ⚠ CROSS-TABLE RLS DEPENDENCY (website_visits): unlike leads/domains, this route scopes
 * `website_visits` by `tenant_id` DIRECTLY — so the tenant filter is right. BUT
 * `website_visits` is NOT in the 58-table Tier list and has no RLS policy yet, so under an
 * authenticated token this read default-DENIES and attribution silently goes to zero. Do
 * NOT convert this route for real until `website_visits` gets its own tenant policy.
 * See rls-cutover-master-plan.md §"Cross-table read dependencies".
 *
 * The live route is UNCHANGED. Deleting this directory reverts the proof with zero impact.
 *
 * Takes `tenantId`, the precomputed `since` cutoff, and `windowHours` directly — auth
 * resolution (`getTenantForRequest`) and settings load (`getSettings` → attribution window)
 * are unchanged by the conversion, so a real route keeps those lines above this code.
 */
import { tenantClient } from '../tenant-client'

interface VisitRow {
  referrer: string | null
}

/** Classify a raw referrer string into a display source bucket (mirrors the live route). */
function classifyReferrer(ref: string): string {
  if (ref.includes('google')) return 'Google'
  if (ref.includes('bing')) return 'Bing'
  if (ref.includes('chatgpt') || ref.includes('openai')) return 'ChatGPT'
  if (ref.includes('facebook')) return 'Facebook'
  if (ref.includes('instagram')) return 'Instagram'
  if (ref.includes('yelp')) return 'Yelp'
  if (ref !== 'direct') return ref
  return 'direct'
}

/** Converted read path of GET /api/leads/attribution (scoped read + in-memory aggregation). */
export async function attributionConverted(tenantId: string, since: string, windowHours: number) {
  const db = tenantClient(tenantId) // was: supabaseAdmin — the website_visits read is now scoped
  const { data: visits } = await db
    .from('website_visits')
    .select('referrer')
    .eq('tenant_id', tenantId)
    .gte('created_at', since)
    .not('referrer', 'is', null)

  const sources: Record<string, number> = {}
  ;((visits || []) as VisitRow[]).forEach((v) => {
    const ref = v.referrer || 'direct'
    const source = classifyReferrer(ref)
    sources[source] = (sources[source] || 0) + 1
  })

  const attribution = Object.entries(sources)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)

  return {
    attribution,
    total: visits?.length || 0,
    window_hours: windowHours,
  }
}

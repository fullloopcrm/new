/**
 * PROOF OF CONVERSION — security/events read route — NOT WIRED, REVERSIBLE.
 *
 * Low-risk GET read converted to the scoped client:
 *   - src/app/api/security/events/route.ts  (GET: recent security_events for the tenant)
 *
 * NEW TABLE, NEW TIER FLAG: `security_events` has not appeared in the proof set before.
 * grep of deploy-prep/rls-tier-rollout-order.md for `security_events` = 0 — it is ABSENT
 * from the 58-table tier list despite being a genuine tenant-scoped read. Floor case:
 * single table, no embed, no cross-table dependency — SAFE to cut over the moment
 * `security_events` gets its own tier slot + policy; nothing else is load-bearing.
 *
 * Otherwise a plain floor case: `select('*')` + the tenant scope `.eq('tenant_id', tenant.id)`
 * (KEPT verbatim) + `.order('created_at', desc)` + a caller-supplied `.limit()`. The live route
 * clamps the limit upstream of the query (`Math.min(parseInt(query) || 50, 200)`); that clamp
 * is URL-parsing, part of the unchanged auth/param-resolution entry, so this proof takes the
 * already-clamped `limit` as a parameter — same convention as the `routes` proof taking its
 * parsed filter object directly.
 *
 * Faithful to the live route's error handling: `{ data: events }` destructures only `data`,
 * IGNORING the error — an RLS default-deny reads as an empty list, not a thrown 500. This
 * proof reproduces that swallow verbatim (contrast `catalog`/`jobs`, which throw).
 *
 * Auth entry is unchanged: the live GET resolves the tenant via `getTenantForRequest()`. This
 * proof takes `tenantId` directly. GET-only; there is no POST/PUT on this route.
 *
 * The live route is UNCHANGED. Deleting this directory reverts the proof with zero impact.
 */
import { tenantClient } from '../tenant-client'

/** Default page size, mirroring the live route's `Math.min(... || 50, 200)` fallback. */
const DEFAULT_LIMIT = 50

/**
 * Converted read path of GET /api/security/events. Fetches the tenant's recent security
 * events through the scoped client, newest first, capped at `limit`. Matches the live route's
 * error-swallow: a DB error is NOT thrown — the caller sees an empty list, same as no rows.
 */
export async function listSecurityEventsConverted(tenantId: string, limit: number = DEFAULT_LIMIT) {
  const db = tenantClient(tenantId) // was: supabaseAdmin — scope/order/limit unchanged
  const { data: events } = await db
    .from('security_events')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return { events: events ?? [] }
}

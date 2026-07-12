/**
 * PROOF OF CONVERSION — referrer public lookup — NOT WIRED, REVERSIBLE.
 *
 * Low-risk GET read converted to the scoped client:
 *   - src/app/api/referrers/route.ts  (GET: look a referrer up by ?code= or ?email=)
 *
 * What this route adds over prior proofs (four distinct NEW variants in one read):
 *
 *  1. TENANT RESOLVED FROM THE DOMAIN, NOT FROM AUTH. Every prior proof took its tenantId
 *     from an operator auth path (`requirePermission` / `getTenantForRequest`). This is a
 *     PUBLIC, rate-limited endpoint: the live route resolves the tenant from the request's
 *     host via `getTenantFromHeaders()` and scopes with `.eq('tenant_id', lookupTenant.id)`.
 *     The scope key is identical; only WHERE the id comes from differs. The proof takes the
 *     already-resolved `tenantId` directly (the domain resolution is the upstream entry,
 *     unchanged by the swap — same shape as client-contacts taking `clientId` directly).
 *
 *  2. `.ilike()` — a CASE-INSENSITIVE operator, first in the proof set. The email branch
 *     matches `.ilike('email', email)`; the swap must copy it verbatim (not silently
 *     downgrade to `.eq`, which would change match semantics).
 *
 *  3. `.single()` — the read returns ONE OBJECT (or null), not an array. Both branches end
 *     in `.single()`; the converted function returns the row object or `null`, matching the
 *     live route's `NextResponse.json(data)` / 404 shape.
 *
 *  4. TWO DIVERGENT LOOKUP BRANCHES off one reused client: a `code` branch
 *     (`.eq('referral_code', code)`) and an `email` branch (`.ilike('email', email)`). Only
 *     one runs per call; the proof pins that each keeps the tenant scope and its own filter.
 *
 * ERROR HANDLING — DELIBERATELY FAITHFUL DIVERGENCE: unlike the client-contacts proof (which
 * `throw error` so an RLS default-deny surfaces), the live referrers route destructures ONLY
 * `const { data } = ...` and ignores `error`, returning `data ?? null` → the route maps null
 * to 404. So a `.single()` no-row miss AND an RLS denial both render as "not found". The proof
 * reproduces that swallow-to-null verbatim (it does not "improve" the route) and a test pins
 * it, so the silent-denial behavior is documented rather than hidden.
 *
 * NO CROSS-TABLE DEPENDENCY: single table `referrers` (tier #52). Floor case for RLS cutover
 * — needs only `referrers` to have its own policy; nothing else is load-bearing, no
 * tier-ordering hold. SAFE to cut over once `referrers` is enabled.
 *
 * The live route is UNCHANGED. Deleting this directory reverts the proof with zero impact.
 */
import { tenantClient } from '../tenant-client'

/** The columns the live route selects (order preserved for a faithful proof). */
const REFERRER_COLUMNS =
  'id, name, email, referral_code, total_earned, total_paid, preferred_payout, created_at'

/** Lookup key — exactly one of the two the live route accepts (`?code=` or `?email=`). */
export interface ReferrerLookup {
  code?: string | null
  email?: string | null
}

/**
 * Converted read path of GET /api/referrers. Given the domain-resolved `tenantId`, looks a
 * single referrer up by referral code (exact) or by email (case-insensitive `.ilike`),
 * through the scoped client, keeping the tenant scope on BOTH branches. Returns the row
 * object or `null` (null → the live route's 404 / 400). Faithfully SWALLOWS the DB error to
 * null, matching the live route which ignores `error`.
 */
export async function lookupReferrerConverted(
  tenantId: string,
  lookup: ReferrerLookup,
): Promise<Record<string, unknown> | null> {
  const db = tenantClient(tenantId) // was: supabaseAdmin — both branches keep tenant scope

  if (lookup.code) {
    const { data } = await db
      .from('referrers')
      .select(REFERRER_COLUMNS)
      .eq('tenant_id', tenantId)
      .eq('referral_code', lookup.code)
      .single()
    return (data as Record<string, unknown> | null) ?? null
  }

  if (lookup.email) {
    const { data } = await db
      .from('referrers')
      .select(REFERRER_COLUMNS)
      .eq('tenant_id', tenantId)
      .ilike('email', lookup.email)
      .single()
    return (data as Record<string, unknown> | null) ?? null
  }

  // Neither provided — live route returns 400 "Provide code or email"; no DB read happens.
  return null
}

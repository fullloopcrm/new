/**
 * PROOF OF CONVERSION — quotes — NOT WIRED, REVERSIBLE.
 *
 * Low-risk GET read converted to the scoped client:
 *   - src/app/api/quotes/route.ts  (GET: list quotes + embedded client + optional filters)
 *
 * What this route adds over prior proofs: a DYNAMIC optional-filter chain. The base query is
 * a tenant-scoped list with an embedded `clients(id, name, email, phone, address)` join, a
 * `.order()`, and a `.limit(limit)` (capped at 500). On top of that, up to THREE optional
 * `.eq()` filters are chained ONLY when the caller passes the matching query param —
 * `?status=`, `?client_id=`, `?deal_id=`. This is the first proof to pin the
 * conditionally-built-query variant: the client swap leaves the whole builder chain
 * untouched, so `let q = db.from(...); if (x) q = q.eq(...)` converts identically. The
 * `.eq('tenant_id', tenantId)` on the base query is KEPT verbatim.
 *
 * CROSS-TABLE RLS DEPENDENCY — SAFE ordering (same as reviews, not the bank-accounts hazard):
 * the embedded `clients(...)` reads `clients` THROUGH the scoped client, so `clients` must
 * have an RLS policy before this route converts, or under an authenticated token the embed
 * default-denies and nulls out. Tier order already satisfies this: parent `quotes` is Tier
 * #10 (Tier 2), embedded child `clients` is Tier #1 (Tier 1) — `clients` is load-bearing nine
 * rows earlier, so at quotes' cutover the embed's child policy is already in place. No hold.
 * Note for the cutover: the OPTIONAL `client_id` filter also targets a clients FK but is a
 * plain column `.eq()` on `quotes` (not a cross-table read), so it carries no extra dep.
 *
 * Auth entry is unchanged: the live GET resolves the tenant via `getTenantForRequest()`
 * directly. This proof takes `tenantId` + an optional `filters` object directly so the
 * isolation test exercises both the no-filter and all-filters paths without standing up the
 * auth layer. Auth resolution is orthogonal to the client swap.
 *
 * The live route is UNCHANGED. Deleting this directory reverts the proof with zero impact.
 */
import { tenantClient } from '../tenant-client'

/** Optional filters mirrored from the live route's query params. */
export interface QuotesFilters {
  status?: string | null
  clientId?: string | null
  dealId?: string | null
  /** Caller-supplied page size; clamped to 500 exactly as the live route does. */
  limit?: number | null
}

/** Converted read path of GET /api/quotes (embed + dynamic optional-filter chain + limit). */
export async function listQuotesConverted(tenantId: string, filters: QuotesFilters = {}) {
  const db = tenantClient(tenantId) // was: supabaseAdmin — the clients(...) embed is now scoped too
  const limit = Math.min(500, Number(filters.limit) || 100)
  let q = db
    .from('quotes')
    .select('*, clients(id, name, email, phone, address)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (filters.status) q = q.eq('status', filters.status)
  if (filters.clientId) q = q.eq('client_id', filters.clientId)
  if (filters.dealId) q = q.eq('deal_id', filters.dealId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

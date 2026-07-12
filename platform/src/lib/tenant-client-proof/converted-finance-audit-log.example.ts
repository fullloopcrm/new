/**
 * PROOF OF CONVERSION — finance/audit-log — NOT WIRED, REVERSIBLE.
 *
 * Low-risk GET read converted to the scoped client:
 *   - src/app/api/finance/audit-log/route.ts  (GET: searchable audit_log with filters)
 *
 * What this route adds over batches 1–2: CONDITIONAL query-builder chaining. The live
 * route builds `let q = supabaseAdmin.from('audit_log')…` then appends `.eq()/.gte()/.lte()`
 * only when the caller passed that filter. The conversion is still the same two-line change
 * (swap the import; `const q0 = tenantClient(tenantId)` in place of `supabaseAdmin`), and
 * the base `.eq('tenant_id', tenantId)` is KEPT verbatim (defense-in-depth during the RLS
 * rollout window). The optional filters are re-applied identically.
 *
 * The live route is UNCHANGED. Deleting this directory reverts the proof with zero impact.
 * Nothing imports this function, so it adds no route bundle.
 *
 * Takes `tenantId` + the already-parsed filter values directly — auth resolution
 * (`requirePermission('finance.view')` → `tenantId`) and URL parsing are unchanged by the
 * conversion, so a real route keeps those lines above this code.
 */
import { tenantClient } from '../tenant-client'

/** Optional filters, mirroring the live route's URL params (all already parsed/validated). */
export interface AuditLogFilters {
  tableName?: string | null
  rowId?: string | null
  event?: string | null
  entityId?: string | null
  from?: string | null
  to?: string | null
  /** Already clamped by the caller (live route: Math.min(500, n || 100)). */
  limit: number
}

/** Converted read path of GET /api/finance/audit-log (conditional filter chaining). */
export async function auditLogConverted(tenantId: string, filters: AuditLogFilters) {
  const db = tenantClient(tenantId) // was: supabaseAdmin — the .from() below is now scoped
  let q = db
    .from('audit_log')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(filters.limit)
  if (filters.tableName) q = q.eq('table_name', filters.tableName)
  if (filters.rowId) q = q.eq('row_id', filters.rowId)
  if (filters.event) q = q.eq('event', filters.event)
  if (filters.entityId) q = q.eq('entity_id', filters.entityId)
  if (filters.from) q = q.gte('created_at', filters.from)
  if (filters.to) q = q.lte('created_at', filters.to)

  const { data, error } = await q
  if (error) throw error
  return { log: data || [] }
}

/**
 * PROOF OF CONVERSION — invoices list — NOT WIRED, REVERSIBLE.
 *
 * Low-risk GET read converted to the scoped client:
 *   - src/app/api/invoices/route.ts  (GET: list invoices + embedded client)
 *
 * What this route adds over prior variants — WIDEST optional-filter surface yet:
 * FOUR independent optional `.eq()` columns (status, client_id, booking_id, entity_id),
 * each chained only when its query param is present, PLUS a fifth conditional that is
 * itself a TWO-CLAUSE COMPOUND filter gated by a single boolean flag (`overdue=1`):
 *   .lt('due_date', today).not('status', 'in', '(paid,void,refunded)')
 * Every prior conditional in this proof set added exactly one `.eq` per optional param;
 * this is the first case where one boolean flag adds two chained clauses as an atomic
 * unit, and the first use of `.not(col, 'in', list)` (prior `.not()` uses were all
 * `.not(col, 'is', null)` — see leads-attribution / read-routes-batch2). The client swap
 * is still two lines; every `.eq('tenant_id', tenantId)` and the fixed `.order()` +
 * `.limit()` are KEPT verbatim, and clause order (base scope → optional eqs → overdue
 * compound) is preserved exactly as live.
 *
 * CROSS-TABLE EMBED — SAFE ORDER (the clean counterpart to bank-accounts' HOLD):
 * the embed `clients(id, name, email, phone, address)` reads `clients`, which is Tier #1
 * (rls-tier-rollout-order.md) — i.e. it converts BEFORE `invoices` at Tier #3. Unlike
 * bank-accounts (parent #4 embedding children #15/#17, a tier INVERSION that forces a
 * HOLD), here the child's policy is guaranteed to exist by the time the parent converts.
 * No hold needed for this embed; cite this as the reference SAFE-order case alongside
 * the recurring-schedules `clients` embed.
 *
 * Auth entry is unchanged (`requirePermission('finance.view')`); this proof takes
 * `tenantId` + the same optional filter params directly so the isolation test exercises
 * every conditional branch independently.
 *
 * The live route is UNCHANGED. Deleting this directory reverts the proof with zero impact.
 */
import { tenantClient } from '../tenant-client'

export interface ListInvoicesFilters {
  status?: string | null
  clientId?: string | null
  bookingId?: string | null
  entityId?: string | null
  overdueOnly?: boolean
  limit?: number
  /** Injected for a deterministic test; live route uses `new Date()`. */
  today?: string
}

/** Converted read path of GET /api/invoices (4 optional eqs + boolean-gated overdue compound). */
export async function listInvoicesConverted(tenantId: string, filters: ListInvoicesFilters = {}) {
  const db = tenantClient(tenantId) // was: supabaseAdmin
  const limit = Math.min(500, filters.limit || 100)
  let q = db
    .from('invoices')
    .select('*, clients(id, name, email, phone, address)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (filters.status) q = q.eq('status', filters.status)
  if (filters.clientId) q = q.eq('client_id', filters.clientId)
  if (filters.bookingId) q = q.eq('booking_id', filters.bookingId)
  if (filters.entityId) q = q.eq('entity_id', filters.entityId)
  if (filters.overdueOnly) {
    const today = filters.today || new Date().toISOString().slice(0, 10)
    q = q.lt('due_date', today).not('status', 'in', '(paid,void,refunded)')
  }

  const { data, error } = await q
  if (error) throw error
  return data || []
}

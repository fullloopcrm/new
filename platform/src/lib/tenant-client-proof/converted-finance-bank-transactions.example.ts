/**
 * PROOF OF CONVERSION — finance/bank-transactions — NOT WIRED, REVERSIBLE.
 *
 * Low-risk GET read converted to the scoped client:
 *   - src/app/api/finance/bank-transactions/route.ts  (GET: bank_transactions + joins, filters)
 *
 * What this route adds: an embedded-join select (`bank_accounts(...)` and
 * `chart_of_accounts!fk(...)`) ON TOP OF conditional filter chaining. The conversion is the
 * same two-line change (swap the import; `const db = tenantClient(tenantId)` in place of
 * `supabaseAdmin`), and the base `.eq('tenant_id', tenantId)` is KEPT verbatim.
 *
 * ⚠ CROSS-TABLE RLS DEPENDENCY: the select embeds `bank_accounts` and `chart_of_accounts`.
 * Under RLS, PostgREST resolves each embedded resource with the SAME authenticated token,
 * so both `bank_accounts` and `chart_of_accounts` must ALSO carry a tenant policy (or one
 * that default-permits the join) before this route is converted for real — otherwise the
 * embeds default-deny and come back null. Both tables are tenant-owned finance tables and
 * belong in the Tier list; confirm their policies land before wiring this route.
 * See rls-cutover-master-plan.md §"Cross-table read dependencies".
 *
 * The live route is UNCHANGED. Deleting this directory reverts the proof with zero impact.
 *
 * Takes `tenantId` + already-parsed filter values directly — auth resolution
 * (`requirePermission('finance.view')` → `tenantId`) and URL parsing are unchanged.
 */
import { tenantClient } from '../tenant-client'

const BANK_TXN_SELECT =
  '*, bank_accounts(id, name, mask, entity_id), chart_of_accounts!bank_transactions_coa_id_fkey(id, code, name)'

/** Optional filters, mirroring the live route's URL params (all already parsed/validated). */
export interface BankTxnFilters {
  status?: string | null
  bankAccountId?: string | null
  entityId?: string | null
  from?: string | null
  to?: string | null
  /** Already clamped by the caller (live route: Math.min(500, n || 200)). */
  limit: number
}

/** Converted read path of GET /api/finance/bank-transactions (join + conditional filters). */
export async function bankTransactionsConverted(tenantId: string, filters: BankTxnFilters) {
  const db = tenantClient(tenantId) // was: supabaseAdmin — the .from() below is now scoped
  let q = db
    .from('bank_transactions')
    .select(BANK_TXN_SELECT)
    .eq('tenant_id', tenantId)
    .order('txn_date', { ascending: false })
    .limit(filters.limit)

  if (filters.status) q = q.eq('status', filters.status)
  if (filters.bankAccountId) q = q.eq('bank_account_id', filters.bankAccountId)
  if (filters.entityId) q = q.eq('entity_id', filters.entityId)
  if (filters.from) q = q.gte('txn_date', filters.from)
  if (filters.to) q = q.lte('txn_date', filters.to)

  const { data, error } = await q
  if (error) throw error
  return { transactions: data || [] }
}

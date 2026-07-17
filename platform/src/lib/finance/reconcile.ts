/**
 * Bank reconciliation against originated ledger entries — the "teach nothing"
 * core. Because we originate most transactions, a bank line usually corresponds
 * to money we already recorded. So instead of re-categorizing it into
 * income/expense (which double-counts), it should DRAIN a clearing account:
 *
 *   Deposit in  → CR 1050 Undeposited Funds already holds it → DR bank / CR 1050
 *   Payout out  → CR 2450 Payouts in Transit already holds it → DR 2450 / CR bank
 *
 * This module reports the live clearing balances so the categorizer can suggest
 * the clearing account (revenue/expense-neutral) for matching bank lines.
 */
import { supabaseAdmin } from '../supabase'
import { getAccountIdByCode, ensureChartAccounts } from '../ledger'

const PAGE = 1000

/**
 * Net movement on one account across the ledger: Σdebit − Σcredit.
 *
 * `.order('id')` is required alongside `.range()` — without it, Postgres
 * doesn't guarantee stable row order across separate paginated queries, so a
 * multi-page scan can silently skip or double-count lines once an account
 * passes one page of journal lines.
 */
async function accountNetCents(tenantId: string, coaId: string): Promise<number> {
  let net = 0
  let offset = 0
  for (;;) {
    const { data, error } = await supabaseAdmin
      .from('journal_lines')
      .select('debit_cents, credit_cents')
      .eq('tenant_id', tenantId)
      .eq('coa_id', coaId)
      .order('id', { ascending: true })
      .range(offset, offset + PAGE - 1)
    if (error) throw error
    const rows = data || []
    for (const r of rows) net += (Number(r.debit_cents) || 0) - (Number(r.credit_cents) || 0)
    if (rows.length < PAGE) break
    offset += PAGE
  }
  return net
}

export interface ClearingTargets {
  undepositedId: string | null
  /** Debit-positive: money received but not yet reconciled into the bank. */
  undepositedBalanceCents: number
  payoutsInTransitId: string | null
  /** Credit-positive: money committed out but not yet cleared from the bank. */
  payoutsInTransitBalanceCents: number
}

export async function clearingTargets(tenantId: string): Promise<ClearingTargets> {
  await ensureChartAccounts(tenantId)
  const [undepositedId, payoutsInTransitId] = await Promise.all([
    getAccountIdByCode(tenantId, '1050'),
    getAccountIdByCode(tenantId, '2450'),
  ])
  const undepositedBalanceCents = undepositedId ? await accountNetCents(tenantId, undepositedId) : 0
  // 2450 is a liability (credit-normal), so flip the sign to get a positive balance.
  const payoutsInTransitBalanceCents = payoutsInTransitId ? -(await accountNetCents(tenantId, payoutsInTransitId)) : 0
  return { undepositedId, undepositedBalanceCents, payoutsInTransitId, payoutsInTransitBalanceCents }
}

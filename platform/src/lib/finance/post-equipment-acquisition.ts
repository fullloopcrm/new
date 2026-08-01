/**
 * Equipment acquisition → ledger. postEquipmentDepreciationForTenant (see
 * post-depreciation.ts) posts monthly depreciation against 1500 Equipment,
 * but nothing ever posted the ORIGINAL purchase — creating an equipment row
 * with acquisition_cost_cents set the depreciation schedule running against
 * an asset that never existed in the actual books. The Equipment page's book
 * value (acquisition_cost_cents − accumulated_depreciation_cents) is computed
 * straight off the equipment table and looked correct on screen the whole
 * time, but the real balance sheet's 1500 Equipment account sat at $0 while
 * 1510 Accumulated Depreciation kept growing — net book value went negative
 * in the GL for every tenant with equipment.
 *
 * Posting, at acquisition:
 *   DR 1500 Equipment
 *     CR 2000 Accounts Payable
 * Recording the liability rather than assuming cash is deliberate: this
 * system has no "enter bill / pay bill" flow, so the AP entry here plugs into
 * the existing bank-transaction categorization the same way any other
 * vendor bill would — the bookkeeper (or an auto-categorization rule)
 * matches the actual outgoing bank transaction to account 2000 to clear it,
 * exactly like any other payable.
 *
 * Idempotent by (source='equipment_acquisition', source_id=equipmentId) —
 * safe to call more than once, and safe to run as a backfill for equipment
 * rows created before this existed. Only fires once per equipment row: a
 * later cost correction after the initial capitalization is NOT auto-posted
 * (rare in practice — acquisition cost is fixed at purchase) and would need
 * a manual adjusting entry.
 */
import { supabaseAdmin } from '../supabase'
import { postJournalEntry, ensureChartAccounts, getAccountIdByCode, journalEntryExists, type JournalLineInput } from '../ledger'

export interface PostEquipmentAcquisitionResult {
  posted: boolean
  reason?: string
  entryId?: string
}

/** Post the original purchase of one equipment unit to the ledger. */
export async function postEquipmentAcquisition(opts: { tenantId: string; equipmentId: string }): Promise<PostEquipmentAcquisitionResult> {
  const { tenantId, equipmentId } = opts
  const sourceId = equipmentId
  if (await journalEntryExists(tenantId, 'equipment_acquisition', sourceId)) {
    return { posted: false, reason: 'already_posted' }
  }

  const { data: equipment } = await supabaseAdmin
    .from('equipment')
    .select('id, name, acquisition_cost_cents, acquisition_date')
    .eq('tenant_id', tenantId)
    .eq('id', equipmentId)
    .maybeSingle()
  if (!equipment) return { posted: false, reason: 'not_found' }

  const amountCents = Math.round(Number(equipment.acquisition_cost_cents) || 0)
  if (amountCents <= 0) return { posted: false, reason: 'zero_amount' }

  await ensureChartAccounts(tenantId)
  const [equipmentAcct, apAcct] = await Promise.all([
    getAccountIdByCode(tenantId, '1500'),
    getAccountIdByCode(tenantId, '2000'),
  ])
  if (!equipmentAcct || !apAcct) return { posted: false, reason: 'accounts_missing' }

  const lines: JournalLineInput[] = [
    { coa_id: equipmentAcct, debit_cents: amountCents, memo: `Equipment purchase — ${equipment.name}` },
    { coa_id: apAcct, credit_cents: amountCents, memo: `Equipment purchase — ${equipment.name}` },
  ]
  const entryId = await postJournalEntry({
    tenant_id: tenantId,
    entry_date: (equipment.acquisition_date as string) || new Date().toISOString().slice(0, 10),
    memo: `Equipment acquisition — ${equipment.name}`,
    source: 'equipment_acquisition',
    source_id: sourceId,
    lines,
  })
  // NULL means a concurrent caller already claimed this (source, source_id).
  if (entryId === null) return { posted: false, reason: 'already_posted' }
  return { posted: true, entryId }
}

/** Safety net + retro-post: capitalize any active equipment row lacking an acquisition entry. */
export async function backfillUnpostedEquipmentAcquisitions(tenantId: string, limit = 500): Promise<{ posted: number }> {
  const { data: rows } = await supabaseAdmin
    .from('equipment')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('created_at', { ascending: true })
    .limit(limit)

  let posted = 0
  for (const r of rows || []) {
    try {
      const result = await postEquipmentAcquisition({ tenantId, equipmentId: r.id as string })
      if (result.posted) posted++
    } catch (e) {
      console.error('[post-equipment-acquisition] backfill failed', r.id, e)
    }
  }
  return { posted }
}

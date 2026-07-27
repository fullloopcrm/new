/**
 * Equipment depreciation → ledger. Every owned, depreciable equipment unit
 * (acquisition_cost_cents > salvage_value_cents, useful_life_months set)
 * posts one month of straight-line depreciation per calendar month, until
 * fully depreciated down to salvage value.
 *
 * This was previously a documented INTENT with no implementation — the
 * schema comments (2026_07_21_equipment.sql) and the Equipment page's own
 * comment both claimed depreciation "posts to Finance on its own schedule,"
 * but nothing ever called postJournalEntry or wrote
 * equipment.accumulated_depreciation_cents after creation. This closes that.
 *
 * Posting:
 *   DR 5110 Depreciation Expense
 *     CR 1510 Accumulated Depreciation (contra-asset)
 * Idempotent by (source='equipment_depreciation', source_id=`${equipmentId}:${YYYY-MM}`)
 * — safe to call more than once for the same month, and safe to re-run for a
 * past month you skipped (it doesn't require consecutive months, only that
 * accumulated_depreciation_cents hasn't already reached the depreciable base).
 */
import { supabaseAdmin } from '../supabase'
import { postJournalEntry, ensureChartAccounts, getAccountIdByCode, journalEntryExists, type JournalLineInput } from '../ledger'

export interface DepreciationRunResult {
  tenantId: string
  monthKey: string
  posted: { equipmentId: string; name: string; amountCents: number }[]
  skipped: { equipmentId: string; name: string; reason: string }[]
}

interface EquipmentRow {
  id: string
  name: string
  acquisition_cost_cents: number
  salvage_value_cents: number
  useful_life_months: number | null
  accumulated_depreciation_cents: number
  depreciation_method: string
  active: boolean
}

/** One month's straight-line depreciation for one unit, capped at the depreciable base. */
export function monthlyDepreciationCents(e: Pick<EquipmentRow, 'acquisition_cost_cents' | 'salvage_value_cents' | 'useful_life_months' | 'accumulated_depreciation_cents'>): number {
  if (!e.useful_life_months || e.useful_life_months <= 0) return 0
  const depreciableBase = e.acquisition_cost_cents - e.salvage_value_cents
  if (depreciableBase <= 0) return 0
  const remaining = depreciableBase - e.accumulated_depreciation_cents
  if (remaining <= 0) return 0
  const monthly = Math.round(depreciableBase / e.useful_life_months)
  return Math.min(monthly, remaining)
}

/**
 * Post one month of depreciation for every eligible unit on a tenant.
 * monthKey defaults to the current calendar month (YYYY-MM); pass an
 * explicit one to backfill a skipped month.
 */
export async function postEquipmentDepreciationForTenant(tenantId: string, monthKey?: string): Promise<DepreciationRunResult> {
  const key = monthKey || new Date().toISOString().slice(0, 7)
  const entryDate = `${key}-01`

  const { data: equipment } = await supabaseAdmin
    .from('equipment')
    .select('id, name, acquisition_cost_cents, salvage_value_cents, useful_life_months, accumulated_depreciation_cents, depreciation_method, active')
    .eq('tenant_id', tenantId)
    .eq('active', true)

  const result: DepreciationRunResult = { tenantId, monthKey: key, posted: [], skipped: [] }
  if (!equipment || equipment.length === 0) return result

  await ensureChartAccounts(tenantId)
  const [expenseAcct, contraAcct] = await Promise.all([
    getAccountIdByCode(tenantId, '5110'),
    getAccountIdByCode(tenantId, '1510'),
  ])
  if (!expenseAcct || !contraAcct) {
    for (const e of equipment as EquipmentRow[]) result.skipped.push({ equipmentId: e.id, name: e.name, reason: 'accounts_missing' })
    return result
  }

  for (const e of equipment as EquipmentRow[]) {
    const sourceId = `${e.id}:${key}`
    if (await journalEntryExists(tenantId, 'equipment_depreciation', sourceId)) {
      result.skipped.push({ equipmentId: e.id, name: e.name, reason: 'already_posted' })
      continue
    }
    const amountCents = monthlyDepreciationCents(e)
    if (amountCents <= 0) {
      result.skipped.push({ equipmentId: e.id, name: e.name, reason: 'fully_depreciated_or_not_depreciable' })
      continue
    }

    const lines: JournalLineInput[] = [
      { coa_id: expenseAcct, debit_cents: amountCents, memo: `Depreciation — ${e.name}` },
      { coa_id: contraAcct, credit_cents: amountCents, memo: `Depreciation — ${e.name}` },
    ]
    const entryId = await postJournalEntry({
      tenant_id: tenantId,
      entry_date: entryDate,
      memo: `${key} depreciation — ${e.name}`,
      source: 'equipment_depreciation',
      source_id: sourceId,
      lines,
    })
    if (entryId === null) {
      result.skipped.push({ equipmentId: e.id, name: e.name, reason: 'already_posted' })
      continue
    }

    await supabaseAdmin
      .from('equipment')
      .update({ accumulated_depreciation_cents: e.accumulated_depreciation_cents + amountCents })
      .eq('id', e.id)
      .eq('tenant_id', tenantId)

    result.posted.push({ equipmentId: e.id, name: e.name, amountCents })
  }

  return result
}

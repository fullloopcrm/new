/**
 * Equipment acquisition → ledger. Closes the gap where creating an equipment
 * row (with a real acquisition_cost_cents) started a monthly depreciation
 * schedule against an asset that was never actually capitalized in the GL —
 * see post-equipment-acquisition.ts for the full story.
 *
 * Pinned:
 *   - posts DR 1500 Equipment / CR 2000 Accounts Payable, balanced
 *   - idempotent per equipment id — running it twice posts once
 *   - a zero-cost unit posts nothing
 *   - a nonexistent equipment id posts nothing
 *   - backfillUnpostedEquipmentAcquisitions posts every active unit lacking
 *     an acquisition entry and skips already-posted ones
 *   - tenant isolation — only the target tenant's equipment is touched
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'
import { DEFAULT_CHART } from '../ledger'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h), supabase: makeLedgerSupabaseFake(h) }))

import { postEquipmentAcquisition, backfillUnpostedEquipmentAcquisitions } from './post-equipment-acquisition'

const A = 'tenant-A'
const B = 'tenant-B'

function seedChart(tenantId: string) {
  ;(h.store.chart_of_accounts ||= []).push(
    ...DEFAULT_CHART.map((a) => ({ id: `coa-${tenantId}-${a.code}`, tenant_id: tenantId, code: a.code, name: a.name, type: a.type })),
  )
}

function linesByCode(entryId: string, tenantId: string) {
  const codeOf = (coaId: unknown) =>
    (h.store.chart_of_accounts || []).find((c) => c.id === coaId && c.tenant_id === tenantId)?.code as string
  const out: Record<string, { debit: number; credit: number }> = {}
  for (const l of (h.store.journal_entry_lines || []).filter((x) => x.entry_id === entryId)) {
    out[codeOf(l.coa_id)] = { debit: Number(l.debit_cents) || 0, credit: Number(l.credit_cents) || 0 }
  }
  return out
}

function isBalanced(entryId: string): boolean {
  const lines = (h.store.journal_entry_lines || []).filter((l) => l.entry_id === entryId)
  const d = lines.reduce((s, l) => s + Number(l.debit_cents), 0)
  const c = lines.reduce((s, l) => s + Number(l.credit_cents), 0)
  return d === c && d > 0
}

function seedEquipment(id: string, tenantId: string, fields: Record<string, unknown>) {
  ;(h.store.equipment ||= []).push({
    id, tenant_id: tenantId, name: `Unit ${id}`, active: true,
    acquisition_cost_cents: 0, acquisition_date: '2026-07-21',
    ...fields,
  })
}

beforeEach(() => {
  h.seq = 0
  h.store = { chart_of_accounts: [], journal_entries: [], journal_entry_lines: [], equipment: [] }
  seedChart(A)
  seedChart(B)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('postEquipmentAcquisition', () => {
  it('posts DR 1500 Equipment / CR 2000 Accounts Payable, balanced', async () => {
    seedEquipment('eq_1', A, { acquisition_cost_cents: 500000 })
    const r = await postEquipmentAcquisition({ tenantId: A, equipmentId: 'eq_1' })
    expect(r.posted).toBe(true)
    const byCode = linesByCode(r.entryId!, A)
    expect(byCode['1500']).toEqual({ debit: 500000, credit: 0 })
    expect(byCode['2000']).toEqual({ debit: 0, credit: 500000 })
    expect(isBalanced(r.entryId!)).toBe(true)
  })

  it('posts nothing for a zero-cost unit', async () => {
    seedEquipment('eq_zero', A, { acquisition_cost_cents: 0 })
    const r = await postEquipmentAcquisition({ tenantId: A, equipmentId: 'eq_zero' })
    expect(r).toMatchObject({ posted: false, reason: 'zero_amount' })
    expect(h.store.journal_entries).toHaveLength(0)
  })

  it('returns not_found for an equipment id that does not exist', async () => {
    const r = await postEquipmentAcquisition({ tenantId: A, equipmentId: 'nope' })
    expect(r).toMatchObject({ posted: false, reason: 'not_found' })
  })

  it('is idempotent by equipment id: a retry posts nothing new', async () => {
    seedEquipment('eq_dupe', A, { acquisition_cost_cents: 250000 })
    await postEquipmentAcquisition({ tenantId: A, equipmentId: 'eq_dupe' })
    const again = await postEquipmentAcquisition({ tenantId: A, equipmentId: 'eq_dupe' })
    expect(again).toMatchObject({ posted: false, reason: 'already_posted' })
    expect(h.store.journal_entries.filter((e) => e.source === 'equipment_acquisition')).toHaveLength(1)
  })

  it('never touches another tenant\'s equipment', async () => {
    seedEquipment('eq_b', B, { acquisition_cost_cents: 100000 })
    const r = await postEquipmentAcquisition({ tenantId: A, equipmentId: 'eq_b' })
    expect(r).toMatchObject({ posted: false, reason: 'not_found' })
  })
})

describe('backfillUnpostedEquipmentAcquisitions', () => {
  it('posts every active unit lacking an acquisition entry and skips already-posted ones', async () => {
    seedEquipment('bf_1', A, { acquisition_cost_cents: 10000 })
    seedEquipment('bf_2', A, { acquisition_cost_cents: 20000 })
    seedEquipment('bf_zero', A, { acquisition_cost_cents: 0 }) // never posts (zero cost)
    seedEquipment('bf_inactive', A, { acquisition_cost_cents: 30000, active: false }) // excluded

    // Pre-post one so the backfill must skip it, not double-count.
    await postEquipmentAcquisition({ tenantId: A, equipmentId: 'bf_1' })

    const result = await backfillUnpostedEquipmentAcquisitions(A)
    expect(result).toEqual({ posted: 1 }) // bf_2 only

    expect(h.store.journal_entries.filter((e) => e.source === 'equipment_acquisition' && e.tenant_id === A)).toHaveLength(2) // bf_1 (pre) + bf_2 (backfill)
  })

  it('never touches another tenant\'s equipment', async () => {
    seedEquipment('bf_b', B, { acquisition_cost_cents: 90000 })
    const result = await backfillUnpostedEquipmentAcquisitions(A)
    expect(result).toEqual({ posted: 0 })
    expect(h.store.journal_entries.filter((e) => e.tenant_id === B)).toHaveLength(0)
  })
})

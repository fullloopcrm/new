/**
 * Equipment depreciation → ledger. Previously undocumented as *implemented*
 * despite two separate code comments claiming it "posts to Finance on its
 * own schedule" — nothing ever called postJournalEntry or wrote
 * accumulated_depreciation_cents after an equipment row was created. This is
 * the first coverage for the real implementation.
 *
 * Pinned:
 *   - straight-line monthly math, capped at the depreciable base (never
 *     depreciates past salvage value even if useful_life_months undershoots)
 *   - posts DR 5110 Depreciation Expense / CR 1510 Accumulated Depreciation,
 *     balanced
 *   - accumulated_depreciation_cents on the equipment row is updated by the
 *     posted amount
 *   - idempotent per (equipment, month) — running the same month twice posts
 *     once
 *   - a fully-depreciated unit (accumulated >= base) posts nothing
 *   - a unit with no useful_life_months (not on a depreciation schedule)
 *     posts nothing
 *   - tenant isolation — only the target tenant's equipment is touched
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'
import { DEFAULT_CHART } from '../ledger'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h), supabase: makeLedgerSupabaseFake(h) }))

import { postEquipmentDepreciationForTenant, monthlyDepreciationCents } from './post-depreciation'

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

function seedEquipment(id: string, tenantId: string, fields: Record<string, unknown>) {
  ;(h.store.equipment ||= []).push({
    id, tenant_id: tenantId, name: `Unit ${id}`, active: true,
    acquisition_cost_cents: 0, salvage_value_cents: 0, useful_life_months: null,
    accumulated_depreciation_cents: 0, depreciation_method: 'straight_line',
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

describe('monthlyDepreciationCents — straight-line math', () => {
  it('divides the depreciable base evenly across useful_life_months', () => {
    expect(monthlyDepreciationCents({ acquisition_cost_cents: 120000, salvage_value_cents: 0, useful_life_months: 60, accumulated_depreciation_cents: 0 })).toBe(2000)
  })

  it('caps at the remaining depreciable base instead of overshooting salvage value', () => {
    expect(monthlyDepreciationCents({ acquisition_cost_cents: 120000, salvage_value_cents: 0, useful_life_months: 60, accumulated_depreciation_cents: 119000 })).toBe(1000)
  })

  it('returns 0 once fully depreciated', () => {
    expect(monthlyDepreciationCents({ acquisition_cost_cents: 120000, salvage_value_cents: 0, useful_life_months: 60, accumulated_depreciation_cents: 120000 })).toBe(0)
  })

  it('returns 0 with no useful_life_months set (not on a depreciation schedule)', () => {
    expect(monthlyDepreciationCents({ acquisition_cost_cents: 120000, salvage_value_cents: 0, useful_life_months: null, accumulated_depreciation_cents: 0 })).toBe(0)
  })

  it('returns 0 when acquisition cost does not exceed salvage value', () => {
    expect(monthlyDepreciationCents({ acquisition_cost_cents: 5000, salvage_value_cents: 5000, useful_life_months: 24, accumulated_depreciation_cents: 0 })).toBe(0)
  })
})

describe('postEquipmentDepreciationForTenant', () => {
  it('posts a balanced DR 5110 / CR 1510 entry and updates accumulated_depreciation_cents', async () => {
    seedEquipment('eq_1', A, { acquisition_cost_cents: 120000, salvage_value_cents: 0, useful_life_months: 60 })
    const r = await postEquipmentDepreciationForTenant(A, '2026-08')
    expect(r.posted).toHaveLength(1)
    expect(r.posted[0]).toMatchObject({ equipmentId: 'eq_1', amountCents: 2000 })

    const entryId = (h.store.journal_entries || []).find((e) => e.source_id === 'eq_1:2026-08')?.id as string
    const byCode = linesByCode(entryId, A)
    expect(byCode['5110']).toEqual({ debit: 2000, credit: 0 })
    expect(byCode['1510']).toEqual({ debit: 0, credit: 2000 })

    const row = (h.store.equipment || []).find((e) => e.id === 'eq_1')
    expect(row?.accumulated_depreciation_cents).toBe(2000)
  })

  it('running the same month twice posts once (idempotent)', async () => {
    seedEquipment('eq_1', A, { acquisition_cost_cents: 120000, salvage_value_cents: 0, useful_life_months: 60 })
    await postEquipmentDepreciationForTenant(A, '2026-08')
    const r2 = await postEquipmentDepreciationForTenant(A, '2026-08')
    expect(r2.posted).toHaveLength(0)
    expect(r2.skipped[0].reason).toBe('already_posted')
    const row = (h.store.equipment || []).find((e) => e.id === 'eq_1')
    expect(row?.accumulated_depreciation_cents).toBe(2000) // not doubled
  })

  it('skips a fully-depreciated unit', async () => {
    seedEquipment('eq_1', A, { acquisition_cost_cents: 120000, salvage_value_cents: 0, useful_life_months: 60, accumulated_depreciation_cents: 120000 })
    const r = await postEquipmentDepreciationForTenant(A, '2026-08')
    expect(r.posted).toHaveLength(0)
    expect(r.skipped[0].reason).toBe('fully_depreciated_or_not_depreciable')
  })

  it('skips a unit with no useful_life_months', async () => {
    seedEquipment('eq_1', A, { acquisition_cost_cents: 120000, salvage_value_cents: 0, useful_life_months: null })
    const r = await postEquipmentDepreciationForTenant(A, '2026-08')
    expect(r.posted).toHaveLength(0)
  })

  it('tenant isolation: only posts the target tenant\'s equipment', async () => {
    seedEquipment('eq_a', A, { acquisition_cost_cents: 120000, salvage_value_cents: 0, useful_life_months: 60 })
    seedEquipment('eq_b', B, { acquisition_cost_cents: 60000, salvage_value_cents: 0, useful_life_months: 60 })
    const r = await postEquipmentDepreciationForTenant(A, '2026-08')
    expect(r.posted).toHaveLength(1)
    expect(r.posted[0].equipmentId).toBe('eq_a')
    const bRow = (h.store.equipment || []).find((e) => e.id === 'eq_b')
    expect(bRow?.accumulated_depreciation_cents).toBe(0)
  })
})

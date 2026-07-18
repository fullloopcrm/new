import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * PATCH /api/finance/bank-transactions/:id — categorization_patterns write.
 *
 * idx_categ_patterns_tenant_pattern uniquely constrains (tenant_id, pattern)
 * ONLY (2 columns) -- one row per pattern, coa_id is meant to be mutable on
 * that row (categorize-ai.ts's cascading lookup keys on `pattern` alone and
 * trusts whichever coa_id is on that single row). Pre-fix, the existence
 * check here also filtered on `coa_id`, so re-categorizing an
 * already-learned pattern to a DIFFERENT category never matched the
 * existing row, fell into the insert branch, and hit the 2-column unique
 * index -- an error the pre-fix code never even captured. The correction
 * silently vanished and the AI kept suggesting the stale category forever.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
  postJournalEntry: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  requirePermission: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  postJournalEntry: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: (...a: unknown[]) => h.requirePermission(...a),
}))
vi.mock('@/lib/ledger', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ledger')>()
  return { ...actual, postJournalEntry: (...a: unknown[]) => h.postJournalEntry(...a) }
})

import { PATCH } from './route'

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const patchReq = (body: unknown) => new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) })

// normalizeDescription('Starbucks Store 12345') -> 'starbucks store #'
const DESC = 'Starbucks Store 12345'
const PATTERN = 'starbucks store #'

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: h.tenantId }, error: null }))
  h.postJournalEntry.mockReset()
  h.postJournalEntry.mockResolvedValue('je-1')
  h.store = {
    bank_transactions: [
      {
        id: 'txn-1', tenant_id: 'tenant-A', txn_date: '2026-07-01', description: DESC,
        amount_cents: -1200, status: 'pending', bank_account_id: 'acct-1',
        bank_accounts: { coa_id: 'coa-bank' },
      },
      {
        id: 'txn-2', tenant_id: 'tenant-A', txn_date: '2026-07-02', description: 'brand new vendor 99999',
        amount_cents: -500, status: 'pending', bank_account_id: 'acct-1',
        bank_accounts: { coa_id: 'coa-bank' },
      },
    ],
    chart_of_accounts: [
      { id: 'coa-bank', tenant_id: 'tenant-A', code: '1000', name: 'Bank', type: 'asset' },
      { id: 'coa-meals', tenant_id: 'tenant-A', code: '6000', name: 'Meals', type: 'expense' },
      { id: 'coa-office', tenant_id: 'tenant-A', code: '6100', name: 'Office Supplies', type: 'expense' },
    ],
    categorization_patterns: [],
  }
})

describe('PATCH /api/finance/bank-transactions/[id] — categorization_patterns learning write', () => {
  it('inserts a fresh pattern row on first categorization', async () => {
    const res = await PATCH(patchReq({ coa_id: 'coa-meals' }), params('txn-1'))

    expect(res.status).toBe(200)
    expect(h.store.categorization_patterns).toHaveLength(1)
    expect(h.store.categorization_patterns[0]).toMatchObject({
      tenant_id: 'tenant-A', pattern: PATTERN, coa_id: 'coa-meals', hit_count: 1,
    })
  })

  it('increments hit_count when the same category is reaffirmed', async () => {
    h.store.categorization_patterns = [
      { id: 'pat-1', tenant_id: 'tenant-A', pattern: PATTERN, coa_id: 'coa-meals', hit_count: 3 },
    ]

    const res = await PATCH(patchReq({ coa_id: 'coa-meals' }), params('txn-1'))

    expect(res.status).toBe(200)
    expect(h.store.categorization_patterns).toHaveLength(1)
    expect(h.store.categorization_patterns[0]).toMatchObject({ coa_id: 'coa-meals', hit_count: 4 })
  })

  it('overwrites the existing pattern row (not a duplicate insert) when the user corrects the category', async () => {
    h.store.categorization_patterns = [
      { id: 'pat-1', tenant_id: 'tenant-A', pattern: PATTERN, coa_id: 'coa-meals', hit_count: 7 },
    ]

    const res = await PATCH(patchReq({ coa_id: 'coa-office' }), params('txn-1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    // Pre-fix: this 23505'd on the 2-column unique index, was never checked,
    // and would have left a stale duplicate-pattern situation / lost write.
    expect(h.store.categorization_patterns).toHaveLength(1)
    expect(h.store.categorization_patterns[0]).toMatchObject({
      tenant_id: 'tenant-A', pattern: PATTERN, coa_id: 'coa-office', hit_count: 1,
    })
  })

  it('a brand-new pattern for a different transaction still inserts normally', async () => {
    h.store.categorization_patterns = [
      { id: 'pat-1', tenant_id: 'tenant-A', pattern: PATTERN, coa_id: 'coa-meals', hit_count: 7 },
    ]

    const res = await PATCH(patchReq({ coa_id: 'coa-office' }), params('txn-2'))

    expect(res.status).toBe(200)
    expect(h.store.categorization_patterns).toHaveLength(2)
    const fresh = h.store.categorization_patterns.find((r) => r.pattern !== PATTERN)
    expect(fresh).toMatchObject({ tenant_id: 'tenant-A', coa_id: 'coa-office', hit_count: 1 })
  })
})

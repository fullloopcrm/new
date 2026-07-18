import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST /api/finance/receipts/attach — categorization_patterns write. Sibling
 * of the bug fixed in PATCH /api/finance/bank-transactions/[id] (662853c5):
 * idx_categ_patterns_tenant_pattern uniquely constrains (tenant_id, pattern)
 * ONLY (2 columns) -- one row per pattern, coa_id is meant to be mutable on
 * that row. Pre-fix, this route's existence check also filtered on
 * `coa_id`, so an operator correcting the category right here while
 * attaching a receipt (already-learned pattern, different coa_id) never
 * matched the existing row, fell into the insert branch, and hit the
 * 2-column unique index -- an error this route never even captured. The
 * correction silently vanished and the AI kept suggesting the stale
 * category forever.
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

import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

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
    ],
    chart_of_accounts: [
      { id: 'coa-bank', tenant_id: 'tenant-A', code: '1000', name: 'Bank', type: 'asset' },
      { id: 'coa-meals', tenant_id: 'tenant-A', code: '6000', name: 'Meals', type: 'expense' },
      { id: 'coa-office', tenant_id: 'tenant-A', code: '6100', name: 'Office Supplies', type: 'expense' },
    ],
    categorization_patterns: [],
  }
})

const body = (overrides: Record<string, unknown> = {}) => ({
  bank_transaction_id: 'txn-1',
  receipt_path: 'tenants/tenant-A/receipts/r1.pdf',
  coa_id: 'coa-office',
  ...overrides,
})

describe('POST /api/finance/receipts/attach — categorization_patterns learning write', () => {
  it('overwrites the existing pattern row (not a duplicate insert) when the operator corrects the category here', async () => {
    h.store.categorization_patterns = [
      { id: 'pat-1', tenant_id: 'tenant-A', pattern: PATTERN, coa_id: 'coa-meals', hit_count: 7 },
    ]

    const res = await POST(postReq(body()))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    // Pre-fix: this 23505'd on the 2-column unique index, was never checked,
    // and the operator's correction (meals -> office) would have been lost.
    expect(h.store.categorization_patterns).toHaveLength(1)
    expect(h.store.categorization_patterns[0]).toMatchObject({
      tenant_id: 'tenant-A', pattern: PATTERN, coa_id: 'coa-office', hit_count: 1,
    })
  })

  it('increments hit_count when the same category is reaffirmed', async () => {
    h.store.categorization_patterns = [
      { id: 'pat-1', tenant_id: 'tenant-A', pattern: PATTERN, coa_id: 'coa-office', hit_count: 3 },
    ]

    const res = await POST(postReq(body()))

    expect(res.status).toBe(200)
    expect(h.store.categorization_patterns).toHaveLength(1)
    expect(h.store.categorization_patterns[0]).toMatchObject({ coa_id: 'coa-office', hit_count: 4 })
  })

  it('inserts a fresh pattern row when none exists yet', async () => {
    const res = await POST(postReq(body()))

    expect(res.status).toBe(200)
    expect(h.store.categorization_patterns).toHaveLength(1)
    expect(h.store.categorization_patterns[0]).toMatchObject({
      tenant_id: 'tenant-A', pattern: PATTERN, coa_id: 'coa-office', hit_count: 1,
    })
  })

  it('does not touch categorization_patterns when no coa_id is passed (receipt-only attach)', async () => {
    const res = await POST(postReq(body({ coa_id: undefined })))

    expect(res.status).toBe(200)
    expect(h.store.categorization_patterns).toHaveLength(0)
  })
})

/**
 * PUT /api/finance/expenses/:id — reconciled-expense edit guard.
 *
 * DELETE already blocks removing an expense once matched_bank_transaction_id
 * is set (route.delete-guard.test.ts) because tax-export/year-end-zip read
 * `expenses` directly and a reconciled row backs an already-posted ledger
 * entry. PUT had no equivalent guard: any finance.expenses-permitted caller
 * could silently rewrite amount/category/date/entity_id on an already-
 * reconciled expense, diverging the tax-reporting record from what was
 * actually matched/posted with no trace. Fixed by blocking PUT the same way
 * DELETE is blocked, with an atomic CAS (`.is('matched_bank_transaction_id',
 * null)` in the UPDATE's own WHERE) so a match landing between the guard
 * read and the write can't slip a stale edit through underneath it.
 */
import { describe, it, expect, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const { TENANT_A, TENANT_B } = vi.hoisted(() => ({ TENANT_A: 'tenant-A', TENANT_B: 'tenant-B' }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({
    expenses: [
      { id: 'exp-unmatched', tenant_id: TENANT_A, category: 'supplies', amount: 1000, matched_bank_transaction_id: null },
      { id: 'exp-matched', tenant_id: TENANT_A, category: 'rent', amount: 500000, matched_bank_transaction_id: 'txn-1' },
      { id: 'exp-B1', tenant_id: TENANT_B, category: 'supplies', amount: 1000, matched_bank_transaction_id: null },
    ],
  })
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_A }, error: null }),
}))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { supabaseAdmin } from '@/lib/supabase'
import { PUT } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const params = (id: string) => ({ params: Promise.resolve({ id }) })
const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })

describe('PUT /api/finance/expenses/:id — reconciled-expense edit guard', () => {
  it('edits an unreconciled expense normally', async () => {
    const res = await PUT(putReq({ category: 'travel' }), params('exp-unmatched'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.expense.category).toBe('travel')
  })

  it('blocks editing an expense reconciled to a bank transaction', async () => {
    const res = await PUT(putReq({ amount: 1, category: 'hacked' }), params('exp-matched'))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/reconciled/)
    const row = fake._all('expenses').find((r) => r.id === 'exp-matched')
    expect(row?.amount).toBe(500000)
    expect(row?.category).toBe('rent')
  })

  it('leaves the existing not-found behavior alone', async () => {
    const res = await PUT(putReq({ category: 'travel' }), params('exp-nope'))
    expect(res.status).toBe(500)
  })

  it("tenant A still cannot edit tenant B's expense", async () => {
    const res = await PUT(putReq({ category: 'hacked' }), params('exp-B1'))
    expect(res.status).toBe(500)
    expect(fake._all('expenses').find((r) => r.id === 'exp-B1')?.category).toBe('supplies')
  })
})

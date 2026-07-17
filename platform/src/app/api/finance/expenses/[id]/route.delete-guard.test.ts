/**
 * DELETE /api/finance/expenses/:id — reconciled-expense delete guard.
 *
 * The route used to hard-delete unconditionally. matched_bank_transaction_id
 * is only set by the bank-transaction match route, which also posts a real
 * journal entry for the cash outflow — deleting a matched expense silently
 * orphaned the bank transaction's matched_expense_id (ON DELETE SET NULL)
 * and dropped the vendor/receipt/category record backing an already-posted
 * ledger entry out of tax-export/year-end-zip (both read `expenses` directly,
 * not journal_lines), with no unmatch endpoint to reattach it. Fixed by
 * blocking delete when matched_bank_transaction_id is set.
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
import { DELETE } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const params = (id: string) => ({ params: Promise.resolve({ id }) })
const delReq = () => new Request('http://x', { method: 'DELETE' })

describe('DELETE /api/finance/expenses/:id — reconciled-expense delete guard', () => {
  it('deletes an unmatched expense', async () => {
    const res = await DELETE(delReq(), params('exp-unmatched'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(fake._all('expenses').find((r) => r.id === 'exp-unmatched')).toBeUndefined()
  })

  it('blocks deleting an expense reconciled to a bank transaction', async () => {
    const res = await DELETE(delReq(), params('exp-matched'))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/reconciled/)
    expect(fake._all('expenses').find((r) => r.id === 'exp-matched')).toBeDefined()
  })

  it('returns 404 for a nonexistent expense', async () => {
    const res = await DELETE(delReq(), params('exp-nope'))
    expect(res.status).toBe(404)
  })

  it("tenant A cannot delete tenant B's expense", async () => {
    const res = await DELETE(delReq(), params('exp-B1'))
    expect(res.status).toBe(404)
    expect(fake._all('expenses').find((r) => r.id === 'exp-B1')).toBeDefined()
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * finance/expenses/[id] DELETE — ledger reversal wiring.
 *
 * GAP (closed here): DELETE never touched the ledger. An expense that had
 * already been posted (postExpenseToLedger fires on every POST) left its
 * journal entry behind forever once deleted — a stale cost with nothing
 * pointing back to it, permanently overstating cost/understating net
 * profit on the P&L. See src/lib/finance/post-expense.ts
 * (reverseExpenseFromLedger) for the full writeup, including why editing
 * amount/category (PUT) is a separate, still-open gap.
 *
 * Also proves the delete is BLOCKED (not best-effort) when the reversal
 * itself fails for a real reason — unlike expense creation, there is no
 * backfill safety net that could ever find and fix a journal entry
 * orphaned by a deleted expense.
 */

const CTX_TENANT = 'tid-a'

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' })),
  }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  })),
}))

vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

type ReverseResult = { posted: boolean; reason?: string; entryId?: string }
const reverseExpenseFromLedger = vi.fn(async (_opts: { tenantId: string; expenseId: string }): Promise<ReverseResult> => ({ posted: true, entryId: 'je-rev-1' }))
vi.mock('@/lib/finance/post-expense', () => ({
  reverseExpenseFromLedger: (opts: { tenantId: string; expenseId: string }) => reverseExpenseFromLedger(opts),
}))

let deleteCalled = false
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      delete: () => ({
        eq: () => ({
          eq: async () => {
            deleteCalled = true
            return { error: null }
          },
        }),
      }),
    }),
  },
}))

import { DELETE } from './route'

function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  reverseExpenseFromLedger.mockClear()
  deleteCalled = false
})

describe('finance/expenses/[id] DELETE — ledger reversal wiring', () => {
  it('reverses the ledger entry before deleting the expense row', async () => {
    const res = await DELETE(new Request('http://x'), ctx('exp-1'))
    expect(res.status).toBe(200)
    expect(reverseExpenseFromLedger).toHaveBeenCalledWith({ tenantId: CTX_TENANT, expenseId: 'exp-1' })
    expect(deleteCalled).toBe(true)
  })

  it('proceeds with the delete when the expense was never posted to the ledger (no_original_entry)', async () => {
    reverseExpenseFromLedger.mockResolvedValueOnce({ posted: false, reason: 'no_original_entry' })
    const res = await DELETE(new Request('http://x'), ctx('exp-2'))
    expect(res.status).toBe(200)
    expect(deleteCalled).toBe(true)
  })

  it('proceeds with the delete when already reversed (idempotent re-delete-ish call)', async () => {
    reverseExpenseFromLedger.mockResolvedValueOnce({ posted: false, reason: 'already_reversed' })
    const res = await DELETE(new Request('http://x'), ctx('exp-3'))
    expect(res.status).toBe(200)
    expect(deleteCalled).toBe(true)
  })

  it('BLOCKS the delete when the reversal fails for a real reason -- no orphaned journal entry left behind', async () => {
    reverseExpenseFromLedger.mockResolvedValueOnce({ posted: false, reason: 'accounts_missing' })
    const res = await DELETE(new Request('http://x'), ctx('exp-4'))
    expect(res.status).toBe(500)
    expect(deleteCalled).toBe(false)
  })
})

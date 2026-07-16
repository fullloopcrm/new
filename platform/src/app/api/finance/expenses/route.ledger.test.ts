import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * finance/expenses POST — ledger wiring.
 *
 * GAP (closed here): a manually-entered expense never reached the ledger at
 * all -- see src/lib/finance/post-expense.ts for the full writeup. This
 * proves the route actually calls postExpenseToLedger with the newly
 * inserted expense's id, immediately after insert.
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

vi.mock('@/lib/entity', () => ({
  getDefaultEntityId: vi.fn(async () => 'entity-a'),
  entityIdFromUrl: () => null,
}))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

const postExpenseToLedger = vi.fn(async (_opts: { tenantId: string; expenseId: string }) => ({ posted: true, entryId: 'je-1' }))
vi.mock('@/lib/finance/post-expense', () => ({ postExpenseToLedger: (opts: { tenantId: string; expenseId: string }) => postExpenseToLedger(opts) }))

const INSERTED = { id: 'exp-new', tenant_id: CTX_TENANT, category: 'Materials & Supplies', amount: 22000 }
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      insert: () => ({
        select: () => ({
          single: async () => ({ data: INSERTED, error: null }),
        }),
      }),
    }),
  },
}))

import { POST } from './route'

function postReq(body: unknown): Request {
  return { url: 'http://x/api/finance/expenses', json: async () => body } as unknown as Request
}

beforeEach(() => {
  postExpenseToLedger.mockClear()
})

describe('finance/expenses POST — ledger wiring', () => {
  it('posts the newly created expense to the ledger', async () => {
    const res = await POST(postReq({ category: 'Materials & Supplies', amount: 220 }))
    expect(res.status).toBe(201)
    // Fire-and-forget -- give the microtask queue a tick to run.
    await new Promise((r) => setTimeout(r, 0))
    expect(postExpenseToLedger).toHaveBeenCalledWith({ tenantId: CTX_TENANT, expenseId: 'exp-new' })
  })

  it('a ledger-posting failure does not fail expense creation (best-effort)', async () => {
    postExpenseToLedger.mockRejectedValueOnce(new Error('boom'))
    const res = await POST(postReq({ category: 'Materials & Supplies', amount: 220 }))
    expect(res.status).toBe(201)
    await new Promise((r) => setTimeout(r, 0))
  })
})

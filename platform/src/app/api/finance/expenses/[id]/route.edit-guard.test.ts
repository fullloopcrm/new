import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * finance/expenses/[id] PUT — block amount/category edits on an
 * already-posted expense.
 *
 * GAP (documented in post-expense.ts, closed here): PUT never touched the
 * ledger at all. Editing `amount` or `category` on an expense that had
 * already been posted to the ledger -- either at creation (source='expense')
 * or later via bank reconciliation (source='bank_txn', keyed by the matched
 * bank_transactions.id) -- silently left the journal entry frozen at the OLD
 * value forever, drifting the P&L away from what the expenses table itself
 * showed. A correct reverse-then-repost needs a schema decision (migration
 * 061's UNIQUE(tenant_id, source, source_id) allows only one 'expense' entry
 * ever) -- not attempted here. Instead: block the edit (409) so the caller
 * deletes + recreates, which reverses cleanly via reverseExpenseFromLedger.
 *
 * Edits that don't touch amount/category (description, receipt_url, date,
 * entity_id) are NOT blocked -- this is scoped to the $ / CoA drift risk.
 */

const CTX_TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

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

const postedKeys = new Set<string>()
const key = (t: string, s: string, id: string) => `${t}|${s}|${id}`
vi.mock('@/lib/ledger', () => ({
  journalEntryExists: async (tenantId: string, source: string, sourceId: string) => postedKeys.has(key(tenantId, source, sourceId)),
}))

import { PUT } from './route'

function seed() {
  return {
    expenses: [
      { id: 'exp-unposted', tenant_id: CTX_TENANT, category: 'Supplies', amount: 500, matched_bank_transaction_id: null },
      { id: 'exp-posted-creation', tenant_id: CTX_TENANT, category: 'Supplies', amount: 500, matched_bank_transaction_id: null },
      { id: 'exp-posted-bankmatch', tenant_id: CTX_TENANT, category: 'Supplies', amount: 500, matched_bank_transaction_id: 'txn-1' },
    ],
  }
}

function putReq(body: unknown): Request {
  return { url: 'http://x/api/finance/expenses/x', json: async () => body } as unknown as Request
}
function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  postedKeys.clear()
})

describe('finance/expenses/[id] PUT — already-posted amount/category edit guard', () => {
  it('allows an amount edit on an expense never posted to the ledger', async () => {
    const res = await PUT(putReq({ amount: 12 }), ctx('exp-unposted'))
    expect(res.status).toBe(200)
    const upd = h.capture.updates.find((u) => u.table === 'expenses')
    expect(upd!.matched[0].amount).toBe(1200)
  })

  it('BLOCKS an amount edit on an expense posted at creation (source=expense)', async () => {
    postedKeys.add(key(CTX_TENANT, 'expense', 'exp-posted-creation'))
    const res = await PUT(putReq({ amount: 12 }), ctx('exp-posted-creation'))
    expect(res.status).toBe(409)
    expect(h.capture.updates.find((u) => u.table === 'expenses')).toBeFalsy()
  })

  it('BLOCKS a category edit on an expense posted at creation (source=expense)', async () => {
    postedKeys.add(key(CTX_TENANT, 'expense', 'exp-posted-creation'))
    const res = await PUT(putReq({ category: 'Rent' }), ctx('exp-posted-creation'))
    expect(res.status).toBe(409)
  })

  it('BLOCKS an amount edit on an expense posted via bank-match (source=bank_txn on the matched txn)', async () => {
    postedKeys.add(key(CTX_TENANT, 'bank_txn', 'txn-1'))
    const res = await PUT(putReq({ amount: 12 }), ctx('exp-posted-bankmatch'))
    expect(res.status).toBe(409)
    expect(h.capture.updates.find((u) => u.table === 'expenses')).toBeFalsy()
  })

  it('does NOT block edits that skip amount/category, even on a posted expense', async () => {
    postedKeys.add(key(CTX_TENANT, 'expense', 'exp-posted-creation'))
    const res = await PUT(putReq({ description: 'updated note' }), ctx('exp-posted-creation'))
    expect(res.status).toBe(200)
    const upd = h.capture.updates.find((u) => u.table === 'expenses')
    expect(upd!.matched[0].description).toBe('updated note')
  })

  it('does not falsely block a bank-matched expense whose bank txn was never actually posted (e.g. no CoA match at match-time)', async () => {
    // matched_bank_transaction_id is set but no journal entry exists under that key.
    const res = await PUT(putReq({ amount: 12 }), ctx('exp-posted-bankmatch'))
    expect(res.status).toBe(200)
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * finance/bank-transactions/[id]/match POST — expense double-post guard.
 *
 * BUG (fixed here): now that POST /api/finance/expenses posts a manual
 * expense to the ledger immediately at creation (postExpenseToLedger,
 * source='expense'), matching that SAME expense to its real bank line later
 * via this route posted a SECOND, independent journal entry keyed by
 * source='bank_txn' -- the ledger's own journalEntryExists dedup is keyed
 * per-source, so it can't see the two entries are the same underlying cost.
 * Net effect: every bank-matched manual expense would double-count as a
 * cost on the P&L.
 *
 * FIX: before posting the bank_txn-keyed entry, check whether this expense
 * already has a source='expense' journal entry. If so, just link the match
 * (status='matched') without posting again.
 */

const TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: TENANT }, error: null })),
}))
vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {
    status = 401
  },
  getTenantForRequest: vi.fn(),
}))

const postJournalEntry = vi.fn(async (_opts: unknown) => 'je-new')
const alreadyPosted = { current: false }
vi.mock('@/lib/ledger', () => ({
  postJournalEntry: (opts: unknown) => postJournalEntry(opts),
  journalEntryExists: async () => alreadyPosted.current,
}))

import { POST } from './route'

function seed() {
  return {
    bank_transactions: [
      {
        id: 'txn-1', tenant_id: TENANT, txn_date: '2026-07-01', description: 'Home Depot',
        amount_cents: -22000, status: 'pending', bank_account_id: 'ba-1',
        bank_accounts: { coa_id: 'coa-bank' },
      },
    ],
    expenses: [
      { id: 'exp-1', tenant_id: TENANT, category: 'cogs', amount: 22000, matched_bank_transaction_id: null },
    ],
    chart_of_accounts: [
      { id: 'coa-materials', tenant_id: TENANT, type: 'expense', subtype: 'cogs', name: 'Materials & Supplies' },
    ],
  }
}

function post(id: string, body: unknown) {
  return POST(new Request(`http://t/api/finance/bank-transactions/${id}/match`, { method: 'POST', body: JSON.stringify(body) }), {
    params: Promise.resolve({ id }),
  })
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  postJournalEntry.mockClear()
  alreadyPosted.current = false
})

describe('finance/bank-transactions/[id]/match POST — expense double-post guard', () => {
  it('an expense already posted at creation (source=expense) is just linked, not re-posted', async () => {
    alreadyPosted.current = true
    const res = await post('txn-1', { target_type: 'expense', target_id: 'exp-1' })
    expect(res.status).toBe(200)
    expect(postJournalEntry).not.toHaveBeenCalled()

    const txn = h.seed.bank_transactions.find((t) => t.id === 'txn-1')!
    expect(txn.status).toBe('matched')
    expect(txn.matched_expense_id).toBe('exp-1')
    const exp = h.seed.expenses.find((e) => e.id === 'exp-1')!
    expect(exp.matched_bank_transaction_id).toBe('txn-1')
  })

  it('an expense never posted before still posts a bank_txn-keyed entry on match (existing behavior preserved)', async () => {
    alreadyPosted.current = false
    const res = await post('txn-1', { target_type: 'expense', target_id: 'exp-1' })
    expect(res.status).toBe(200)
    expect(postJournalEntry).toHaveBeenCalledTimes(1)
    expect(postJournalEntry.mock.calls[0][0]).toMatchObject({ source: 'bank_txn', source_id: 'txn-1' })

    const txn = h.seed.bank_transactions.find((t) => t.id === 'txn-1')!
    expect(txn.status).toBe('posted')
  })
})

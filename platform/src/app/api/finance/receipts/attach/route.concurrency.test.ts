import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * 💰 TOCTOU / double-post — POST /api/finance/receipts/attach.
 *
 * The categorize branch gated on `txn.status === 'pending'`, a stale
 * snapshot read once at the top of the request. Two concurrent attach
 * requests for the SAME bank transaction (double-click "attach + categorize",
 * or a race against /match or the [id] PATCH categorize route) both passed
 * that check and both posted a journal entry — double-counting the expense
 * in the ledger.
 *
 * Fix: an atomic conditional UPDATE (`status IN (pending,categorized)`) run
 * immediately before postJournalEntry. The loser's claim matches zero rows
 * and is turned away with 400 before the journal is ever posted.
 */

const TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: TENANT }, error: null })),
}))
vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {
    status = 401
  },
}))

const postJournalEntry = vi.fn(async () => 'je-1')
vi.mock('@/lib/ledger', () => ({
  postJournalEntry: (...args: Parameters<typeof postJournalEntry>) => postJournalEntry(...args),
  normalizeDescription: (s: string) => s,
}))

import { POST } from './route'

function seed() {
  return {
    // The harness performs no real join — the embedded select just returns
    // the row verbatim, so `bank_accounts` is seeded directly on the row.
    bank_transactions: [
      {
        id: 'txn-1',
        tenant_id: TENANT,
        txn_date: '2026-07-01',
        description: 'Home Depot',
        amount_cents: -5000,
        status: 'pending',
        bank_account_id: 'ba-1',
        bank_accounts: { coa_id: 'bank-coa-1' },
      },
    ],
    chart_of_accounts: [{ id: 'coa-1', tenant_id: TENANT }],
    categorization_patterns: [] as Record<string, any>[],
  }
}

function post(body: unknown) {
  return POST(new Request('http://t/api/finance/receipts/attach', { method: 'POST', body: JSON.stringify(body) }))
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  postJournalEntry.mockClear()
})

describe('finance/receipts/attach POST — double-post race', () => {
  it('two concurrent attach+categorize requests for the same txn post exactly one journal entry', async () => {
    const body = { bank_transaction_id: 'txn-1', receipt_path: '/r/1.pdf', coa_id: 'coa-1' }
    const [r1, r2] = await Promise.all([post(body), post(body)])
    const bodies = await Promise.all([r1.json(), r2.json()])
    const statuses = [r1.status, r2.status].sort()

    expect(statuses).toEqual([200, 400])
    const loser = bodies.find((b) => 'error' in b)
    expect(loser?.error).toMatch(/already processed/i)

    expect(postJournalEntry).toHaveBeenCalledTimes(1)
    const txn = h.seed.bank_transactions.find((t) => t.id === 'txn-1')!
    expect(txn.status).toBe('posted')
    expect(txn.coa_id).toBe('coa-1')
  })

  it('solo attach+categorize still works (fix does not break the happy path)', async () => {
    const res = await post({ bank_transaction_id: 'txn-1', receipt_path: '/r/1.pdf', coa_id: 'coa-1' })
    expect(res.status).toBe(200)
    expect(postJournalEntry).toHaveBeenCalledTimes(1)
    expect(h.seed.bank_transactions[0].status).toBe('posted')
    expect(h.seed.bank_transactions[0].receipt_path).toBe('/r/1.pdf')
  })

  it('attach WITHOUT coa_id never claims or posts (receipt-only path unaffected)', async () => {
    const res = await post({ bank_transaction_id: 'txn-1', receipt_path: '/r/1.pdf' })
    expect(res.status).toBe(200)
    expect(postJournalEntry).not.toHaveBeenCalled()
    expect(h.seed.bank_transactions[0].status).toBe('pending')
    expect(h.seed.bank_transactions[0].receipt_path).toBe('/r/1.pdf')
  })

  it("wrong-tenant probe: a foreign tenant's transaction is never reachable", async () => {
    h.seed.bank_transactions.push({
      id: 'txn-b',
      tenant_id: OTHER_TENANT,
      txn_date: '2026-07-01',
      description: 'B rent',
      amount_cents: -9900,
      status: 'pending',
      bank_account_id: 'ba-b',
      bank_accounts: { coa_id: 'bank-coa-b' },
    })
    const res = await post({ bank_transaction_id: 'txn-b', receipt_path: '/r/2.pdf', coa_id: 'coa-1' })
    expect(res.status).toBe(404)
    expect(postJournalEntry).not.toHaveBeenCalled()
    const foreign = h.seed.bank_transactions.find((t) => t.id === 'txn-b')!
    expect(foreign.status).toBe('pending')
  })
})

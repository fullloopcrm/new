import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * 💰 TOCTOU / double-post — PATCH /api/finance/bank-transactions/[id].
 *
 * The handler read `txn.status` once for the target-lookup/embed and never
 * re-checked it before posting a journal entry — there was no status guard
 * on the categorize path at all. Two concurrent PATCH requests for the SAME
 * bank transaction (double-click "categorize", or a race against /match or
 * accept-suggestions on the same row) both post a journal entry for the
 * same transaction, double-counting it in the ledger.
 *
 * Fix: an atomic conditional UPDATE (`status IN (pending,categorized)`) run
 * immediately before postJournalEntry, for both the 'ignored' branch and the
 * categorize branch. The loser's claim matches zero rows and is turned away
 * with 400 before the journal is ever posted.
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

import { PATCH } from './route'

function seed() {
  return {
    // The harness performs no real join — `.select('*, bank_accounts(coa_id)')`
    // just returns the row verbatim, so the embed is seeded directly here.
    bank_transactions: [
      {
        id: 'txn-1',
        tenant_id: TENANT,
        txn_date: '2026-07-01',
        description: 'Home Depot',
        amount_cents: -5000,
        status: 'pending',
        bank_account_id: 'ba-1',
        entity_id: null,
        bank_accounts: { coa_id: 'bank-coa-1' },
      },
    ],
    bank_accounts: [{ id: 'ba-1', tenant_id: TENANT, coa_id: 'bank-coa-1' }],
    chart_of_accounts: [{ id: 'coa-1', tenant_id: TENANT }],
    categorization_patterns: [] as Record<string, any>[],
  }
}

function patch(id: string, body: unknown) {
  return PATCH(
    new Request(`http://t/api/finance/bank-transactions/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    { params: Promise.resolve({ id }) },
  )
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  postJournalEntry.mockClear()
})

describe('finance/bank-transactions/[id] PATCH — double-post race', () => {
  it('two concurrent categorize requests for the same txn post exactly one journal entry', async () => {
    const [r1, r2] = await Promise.all([
      patch('txn-1', { coa_id: 'coa-1' }),
      patch('txn-1', { coa_id: 'coa-1' }),
    ])
    const bodies = await Promise.all([r1.json(), r2.json()])
    const statuses = [r1.status, r2.status].sort()

    expect(statuses).toEqual([200, 400])
    const loser = bodies.find((b) => 'error' in b)
    expect(loser?.error).toMatch(/already processed/i)

    // The ledger-critical assertion: postJournalEntry ran exactly once.
    expect(postJournalEntry).toHaveBeenCalledTimes(1)

    const txn = h.seed.bank_transactions.find((t) => t.id === 'txn-1')!
    expect(txn.status).toBe('posted')
    expect(txn.coa_id).toBe('coa-1')
  })

  it('solo categorize still works (fix does not break the happy path)', async () => {
    const res = await patch('txn-1', { coa_id: 'coa-1' })
    expect(res.status).toBe(200)
    expect(postJournalEntry).toHaveBeenCalledTimes(1)
    expect(h.seed.bank_transactions[0].status).toBe('posted')
  })

  it('a second categorize after the first already posted is rejected, not double-posted', async () => {
    const first = await patch('txn-1', { coa_id: 'coa-1' })
    expect(first.status).toBe(200)

    const second = await patch('txn-1', { coa_id: 'coa-1' })
    expect(second.status).toBe(400)
    expect((await second.json()).error).toMatch(/already processed/i)
    expect(postJournalEntry).toHaveBeenCalledTimes(1)
  })

  it('two concurrent "ignore" requests for the same txn: only one succeeds', async () => {
    const [r1, r2] = await Promise.all([
      patch('txn-1', { status: 'ignored' }),
      patch('txn-1', { status: 'ignored' }),
    ])
    const statuses = [r1.status, r2.status].sort()
    expect(statuses).toEqual([200, 400])
    expect(h.seed.bank_transactions[0].status).toBe('ignored')
  })

  it("wrong-tenant probe: PATCHing tenant B's transaction id returns 404, never posts a journal", async () => {
    h.seed.bank_transactions.push({
      id: 'txn-b',
      tenant_id: OTHER_TENANT,
      txn_date: '2026-07-01',
      description: 'B rent',
      amount_cents: -9900,
      status: 'pending',
      bank_account_id: 'ba-b',
      entity_id: null,
    })
    const res = await patch('txn-b', { coa_id: 'coa-1' })
    expect(res.status).toBe(404)
    expect(postJournalEntry).not.toHaveBeenCalled()
    const foreignTxn = h.seed.bank_transactions.find((t) => t.id === 'txn-b')!
    expect(foreignTxn.status).toBe('pending')
  })
})

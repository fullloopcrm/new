/**
 * SINGLE-TXN CATEGORIZE RACE — PATCH /api/finance/bank-transactions/[id]
 * atomic claim.
 *
 * The route fetched the txn, then posted a journal entry and updated status
 * unconditionally, with no check of the txn's CURRENT status at write time.
 * That's not just a concurrency race: even a plain sequential re-submit
 * (double-click, retry after a slow response) on an already-posted txn would
 * post a second journal entry for the same transaction. Fix: guard the
 * status transition to 'posted' with the 'pending' status this request
 * actually read (compare-and-swap) before posting the journal entry.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

const TENANT_ID = 'tenant-1'

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: TENANT_ID }, error: null })),
}))

let postJournalEntryCallCount = 0
vi.mock('@/lib/ledger', async (orig) => {
  const actual = await orig<typeof import('@/lib/ledger')>()
  return {
    ...actual,
    postJournalEntry: vi.fn(async () => {
      postJournalEntryCallCount++
      return `entry-${postJournalEntryCallCount}`
    }),
  }
})

import { supabaseAdmin } from '@/lib/supabase'
import { PATCH } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function req(body: Row): Request {
  return new Request('http://x/api/finance/bank-transactions/txn-1', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

const params = () => Promise.resolve({ id: 'txn-1' })

beforeEach(() => {
  postJournalEntryCallCount = 0
  fake._store.clear()
  fake._seed('bank_transactions', [
    {
      id: 'txn-1',
      tenant_id: TENANT_ID,
      status: 'pending',
      txn_date: '2026-07-01',
      description: 'Office supplies',
      amount_cents: -5000,
      // fake-supabase ignores the select-string, so the embedded join the
      // real route reads (`bank_accounts(coa_id)`) is just seeded literally.
      bank_accounts: { coa_id: 'coa-bank' },
    } as Row,
  ])
  fake._seed('chart_of_accounts', [
    { id: 'coa-expense', tenant_id: TENANT_ID } as Row,
  ])
  fake._seed('categorization_patterns', [])
})

describe('PATCH /api/finance/bank-transactions/[id] — double-submit on categorize', () => {
  it('two concurrent categorize requests post exactly one journal entry', async () => {
    const [a, b] = await Promise.all([
      PATCH(req({ coa_id: 'coa-expense' }), { params: params() }),
      PATCH(req({ coa_id: 'coa-expense' }), { params: params() }),
    ])
    const [aJson, bJson] = await Promise.all([a.json(), b.json()])
    const winners = [aJson, bJson].filter((j) => !j.already_processed)
    const losers = [aJson, bJson].filter((j) => j.already_processed)
    expect(winners.length).toBe(1)
    expect(losers.length).toBe(1)
    expect(postJournalEntryCallCount).toBe(1)
  })

  it('a sequential re-submit after posting is idempotent, not a second entry', async () => {
    const first = await PATCH(req({ coa_id: 'coa-expense' }), { params: params() })
    expect((await first.json()).ok).toBe(true)
    expect(postJournalEntryCallCount).toBe(1)

    const second = await PATCH(req({ coa_id: 'coa-expense' }), { params: params() })
    const secondJson = await second.json()
    expect(secondJson.already_processed).toBe(true)
    expect(postJournalEntryCallCount).toBe(1)
  })
})

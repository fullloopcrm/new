/**
 * ACCEPT-SUGGESTIONS RACE — POST /api/finance/bank-transactions/accept-suggestions
 * atomic claim.
 *
 * The SELECT of 'pending' transactions doesn't lock rows, so a double-click
 * on "Accept all" (or a client retry) can fire two overlapping requests that
 * both read the same pending set and both post a journal entry for the same
 * bank transaction. Fix: guard each row's write with the status this request
 * actually read (compare-and-swap) before posting the journal entry, so the
 * loser sees no claimed row and skips instead of double-posting.
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
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function req(threshold = 0.8): Request {
  return new Request('http://x/api/finance/bank-transactions/accept-suggestions', {
    method: 'POST',
    body: JSON.stringify({ threshold }),
  })
}

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
      suggested_coa_id: 'coa-expense',
      suggested_confidence: 0.95,
      bank_account_id: 'bank-1',
    } as Row,
  ])
  fake._seed('bank_accounts', [
    { id: 'bank-1', tenant_id: TENANT_ID, coa_id: 'coa-bank' } as Row,
  ])
  fake._seed('categorization_patterns', [])
})

describe('POST /api/finance/bank-transactions/accept-suggestions — concurrent double-accept', () => {
  it('two overlapping accept-all calls post exactly one journal entry per transaction', async () => {
    const [a, b] = await Promise.all([POST(req()), POST(req())])
    const [aJson, bJson] = await Promise.all([a.json(), b.json()])

    // Across both responses, exactly one accepted + one skipped for the single txn.
    expect(aJson.accepted + bJson.accepted).toBe(1)
    expect(postJournalEntryCallCount).toBe(1)

    const txn = fake._all('bank_transactions').find((r) => r.id === 'txn-1')!
    expect(txn.status).toBe('posted')
    expect(txn.journal_entry_id).toBe('entry-1')
  })

  it('sequential replay after posting is a no-op, not a second journal entry', async () => {
    await POST(req())
    expect(postJournalEntryCallCount).toBe(1)

    const second = await POST(req())
    const secondJson = await second.json()
    expect(secondJson.accepted).toBe(0)
    expect(postJournalEntryCallCount).toBe(1)
  })
})

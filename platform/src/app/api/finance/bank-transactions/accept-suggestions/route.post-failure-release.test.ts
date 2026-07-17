/**
 * ACCEPT-SUGGESTIONS POST-FAILURE CLAIM RELEASE
 *
 * Same bug as the sibling categorize route's post-failure-release fix: the
 * per-txn claim (status -> 'posted') committed before postJournalEntry ran,
 * with no rollback on failure. Since the top-level SELECT only ever looks at
 * status='pending', a txn stuck at 'posted' with no journal_entry_id would
 * silently drop out of every future accept-suggestions run -- permanently
 * unposted, permanently invisible as broken.
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

vi.mock('@/lib/ledger', async (orig) => {
  const actual = await orig<typeof import('@/lib/ledger')>()
  return {
    ...actual,
    postJournalEntry: vi.fn(async () => {
      throw new Error('boom: transient RPC failure')
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

describe('POST /api/finance/bank-transactions/accept-suggestions — postJournalEntry failure', () => {
  it('releases the claim back to pending so the txn is retryable, not silently dropped', async () => {
    const res = await POST(req())
    const json = await res.json()
    expect(json.accepted).toBe(0)
    expect(json.skipped).toBe(1)

    const txn = fake._all('bank_transactions').find((r) => r.id === 'txn-1')!
    expect(txn.status).toBe('pending')
    expect(txn.journal_entry_id).toBeFalsy()
    expect(txn.coa_id).toBeFalsy()
  })

  it('a retry after the transient failure clears succeeds normally', async () => {
    const { postJournalEntry } = await import('@/lib/ledger')
    const mocked = vi.mocked(postJournalEntry)

    // First call fails (default mock throws).
    await POST(req())
    const txn = fake._all('bank_transactions').find((r) => r.id === 'txn-1')!
    expect(txn.status).toBe('pending')

    // Simulate the transient failure clearing for the retry.
    mocked.mockImplementationOnce(async () => 'entry-recovered')
    const res2 = await POST(req())
    const json2 = await res2.json()
    expect(json2.accepted).toBe(1)

    const txn2 = fake._all('bank_transactions').find((r) => r.id === 'txn-1')!
    expect(txn2.status).toBe('posted')
    expect(txn2.journal_entry_id).toBe('entry-recovered')
  })
})

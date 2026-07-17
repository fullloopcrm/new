/**
 * BANK-TXN MATCH — expense branch's optional journal-post failure must not
 * surface as a request failure.
 *
 * The expense-match claim (bank_transactions.status -> 'matched',
 * expenses.matched_bank_transaction_id) already committed real state before
 * the optional journal-post sub-step runs. Previously, a thrown error from
 * that sub-step propagated to the route's outer catch and returned a 500 --
 * even though the match itself had succeeded. Worse, the caller can't retry:
 * the top-of-route check now rejects with "Already matched" since
 * txn.status is no longer 'pending'. Fix: the journal-post sub-step is
 * wrapped in its own try/catch so a failure there is logged and swallowed,
 * leaving the txn at 'matched' with no journal_entry_id (missing its
 * optional ledger post, not stuck/corrupt), and the request still resolves
 * ok:true.
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
      throw new Error('ledger post blew up')
    }),
  }
})

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function req(body: Row): Request {
  return new Request('http://x/api/finance/bank-transactions/txn-1/match', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

const params = () => Promise.resolve({ id: 'txn-1' })

beforeEach(() => {
  fake._store.clear()
  fake._seed('bank_transactions', [
    {
      id: 'txn-1',
      tenant_id: TENANT_ID,
      status: 'pending',
      txn_date: '2026-07-01',
      description: 'Fuel purchase',
      amount_cents: -5000,
      bank_account_id: 'acct-1',
      bank_accounts: { coa_id: 'coa-bank' },
    } as Row,
  ])
  fake._seed('expenses', [
    { id: 'exp-1', tenant_id: TENANT_ID, category: 'fuel', amount: 50 } as Row,
  ])
  fake._seed('chart_of_accounts', [
    { id: 'coa-fuel', tenant_id: TENANT_ID, type: 'expense', subtype: 'fuel', name: 'Fuel' } as Row,
  ])
})

describe('POST /api/finance/bank-transactions/[id]/match — expense journal-post failure', () => {
  it('still returns ok:true and leaves the expense match committed', async () => {
    const res = await POST(req({ target_type: 'expense', target_id: 'exp-1' }), { params: params() })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json).toEqual({ ok: true })

    const txn = (fake._store.get('bank_transactions') || [])[0]
    expect(txn.status).toBe('matched')
    expect(txn.matched_expense_id).toBe('exp-1')
    expect(txn.journal_entry_id ?? null).toBeNull()

    const expense = (fake._store.get('expenses') || [])[0]
    expect(expense.matched_bank_transaction_id).toBe('txn-1')
  })

  it('is not left in a state a retry can fix, but a re-match attempt correctly reports Already matched (not lost)', async () => {
    await POST(req({ target_type: 'expense', target_id: 'exp-1' }), { params: params() })
    const retry = await POST(req({ target_type: 'expense', target_id: 'exp-1' }), { params: params() })
    const retryJson = await retry.json()
    expect(retry.status).toBe(400)
    expect(retryJson.error).toBe('Already matched')
  })
})

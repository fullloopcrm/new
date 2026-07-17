/**
 * CATEGORIZE POST-FAILURE CLAIM RELEASE — PATCH /api/finance/bank-transactions/[id]
 *
 * The atomic claim (status -> 'posted') committed BEFORE postJournalEntry ran,
 * with no rollback if posting then threw (unbalanced/empty entry, transient
 * RPC error). That left the txn permanently stuck: status='posted' with
 * journal_entry_id still null -- looks categorized in the UI, excluded from
 * every future retry (this route and accept-suggestions both only claim
 * status='pending'), and the ledger silently short by that amount forever.
 * Fix: release the claim back to 'pending' when posting fails, so the
 * request errors visibly and the txn can be retried.
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
  fake._store.clear()
  fake._seed('bank_transactions', [
    {
      id: 'txn-1',
      tenant_id: TENANT_ID,
      status: 'pending',
      txn_date: '2026-07-01',
      description: 'Office supplies',
      amount_cents: -5000,
      bank_accounts: { coa_id: 'coa-bank' },
    } as Row,
  ])
  fake._seed('chart_of_accounts', [
    { id: 'coa-expense', tenant_id: TENANT_ID } as Row,
  ])
})

describe('PATCH /api/finance/bank-transactions/[id] — postJournalEntry failure', () => {
  it('releases the claim back to pending instead of leaving it stuck as posted', async () => {
    const res = await PATCH(req({ coa_id: 'coa-expense' }), { params: params() })
    expect(res.status).toBe(500)

    const txn = fake._all('bank_transactions').find((r) => r.id === 'txn-1')!
    expect(txn.status).toBe('pending')
    expect(txn.journal_entry_id).toBeFalsy()
    expect(txn.coa_id).toBeFalsy()
  })
})

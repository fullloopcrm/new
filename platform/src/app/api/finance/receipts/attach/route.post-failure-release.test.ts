/**
 * RECEIPT-ATTACH POST-FAILURE CLAIM RELEASE
 *
 * Same fix as the sibling categorize route's post-failure-release test:
 * release the claim back to 'pending' when postJournalEntry throws, instead
 * of leaving the txn permanently stuck as 'posted' with no journal_entry_id.
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

function req(body: Row): Request {
  return new Request('http://x/api/finance/receipts/attach', {
    method: 'POST',
    body: JSON.stringify(body),
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
      bank_accounts: { coa_id: 'coa-bank' },
    } as Row,
  ])
  fake._seed('chart_of_accounts', [
    { id: 'coa-expense', tenant_id: TENANT_ID } as Row,
  ])
})

describe('POST /api/finance/receipts/attach — postJournalEntry failure', () => {
  it('releases the claim back to pending instead of leaving it stuck as posted', async () => {
    const res = await POST(req({
      bank_transaction_id: 'txn-1',
      receipt_path: 'receipts/txn-1.pdf',
      coa_id: 'coa-expense',
    }))
    expect(res.status).toBe(500)

    const txn = fake._all('bank_transactions').find((r) => r.id === 'txn-1')!
    expect(txn.status).toBe('pending')
    expect(txn.journal_entry_id).toBeFalsy()
    expect(txn.coa_id).toBeFalsy()
  })
})

/**
 * MISSING entity_id ON THE JOURNAL ENTRY POSTED FROM AN EXPENSE MATCH.
 *
 * Same gap as accept-suggestions/route.entity-id.test.ts, one call site
 * over: the expense-match branch's optional journal post never read the
 * transaction's entity_id, so it silently fell back to the tenant's
 * default entity in lib/finance/ledger-reports.ts's live P&L/balance-sheet/
 * trial-balance queries for any multi-entity tenant.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

const TENANT_ID = 'tenant-1'
const ENTITY_ID = 'entity-secondary'

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: TENANT_ID }, error: null })),
}))

let lastPostArgs: Record<string, unknown> | null = null
vi.mock('@/lib/ledger', async (orig) => {
  const actual = await orig<typeof import('@/lib/ledger')>()
  return {
    ...actual,
    postJournalEntry: vi.fn(async (args: Record<string, unknown>) => {
      lastPostArgs = args
      return 'entry-1'
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
  lastPostArgs = null
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
      entity_id: ENTITY_ID,
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

describe('POST /api/finance/bank-transactions/[id]/match — entity_id propagation', () => {
  it('carries the transaction\'s entity_id onto the posted journal entry', async () => {
    const res = await POST(req({ target_type: 'expense', target_id: 'exp-1' }), { params: params() })
    expect(res.status).toBe(200)
    expect(lastPostArgs?.entity_id).toBe(ENTITY_ID)
  })
})

/**
 * MISSING entity_id ON THE JOURNAL ENTRY POSTED FROM RECEIPT ATTACH+CATEGORIZE.
 *
 * Same gap as accept-suggestions/route.ts and [id]/match/route.ts, one more
 * call site over: bank_transactions.entity_id is populated at import time,
 * but this route (attach a receipt + optionally categorize/post in one step)
 * never read or forwarded it to postJournalEntry, so it silently fell back
 * to the tenant's default entity in lib/finance/ledger-reports.ts's live
 * P&L/balance-sheet/trial-balance for any multi-entity tenant.
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
  return new Request('http://x/api/finance/receipts/attach', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

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
      bank_account_id: 'bank-1',
      entity_id: ENTITY_ID,
      bank_accounts: { coa_id: 'coa-bank' },
    } as Row,
  ])
  fake._seed('chart_of_accounts', [
    { id: 'coa-fuel', tenant_id: TENANT_ID } as Row,
  ])
  fake._seed('categorization_patterns', [])
})

describe('POST /api/finance/receipts/attach — entity_id propagation', () => {
  it('carries the transaction\'s entity_id onto the posted journal entry', async () => {
    const res = await POST(req({ bank_transaction_id: 'txn-1', receipt_path: 'receipts/txn-1.pdf', coa_id: 'coa-fuel' }))
    expect(res.status).toBe(200)
    expect(lastPostArgs?.entity_id).toBe(ENTITY_ID)
  })
})

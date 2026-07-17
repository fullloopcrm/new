/**
 * MISSING entity_id ON JOURNAL ENTRIES POSTED FROM ACCEPT-SUGGESTIONS.
 *
 * bank_transactions.entity_id is now correctly populated at import time
 * (see ../../bank-import/route.entity-id.test.ts), and the sibling
 * categorize endpoint ([id]/route.ts) threads it onto postJournalEntry.
 * This route accepted the categorization suggestion in bulk but never read
 * or forwarded the transaction's entity_id, so postJournalEntry's RPC fell
 * back to the tenant's default entity every time. lib/finance/ledger-reports
 * .ts is the live default source for /api/finance/pnl, /balance-sheet, and
 * /trial-balance, and filters journal_lines by journal_entries.entity_id
 * when an entity is selected -- so for a multi-entity tenant, every bank
 * transaction accepted here silently posted its ledger impact to the wrong
 * entity's books.
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

function req(threshold = 0.8): Request {
  return new Request('http://x/api/finance/bank-transactions/accept-suggestions', {
    method: 'POST',
    body: JSON.stringify({ threshold }),
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
      description: 'Office supplies',
      amount_cents: -5000,
      suggested_coa_id: 'coa-expense',
      suggested_confidence: 0.95,
      bank_account_id: 'bank-1',
      entity_id: ENTITY_ID,
    } as Row,
  ])
  fake._seed('bank_accounts', [
    { id: 'bank-1', tenant_id: TENANT_ID, coa_id: 'coa-bank' } as Row,
  ])
  fake._seed('categorization_patterns', [])
})

describe('POST /api/finance/bank-transactions/accept-suggestions — entity_id propagation', () => {
  it('carries the transaction\'s entity_id onto the posted journal entry', async () => {
    const res = await POST(req())
    expect((await res.json()).accepted).toBe(1)
    expect(lastPostArgs?.entity_id).toBe(ENTITY_ID)
  })
})

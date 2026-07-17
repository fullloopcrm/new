/**
 * PATCH /api/finance/bank-transactions/[id] — recategorizing a previously-seen
 * description pattern to a *different* coa_id than what's already learned.
 *
 * categorization_patterns has a unique index on (tenant_id, pattern) only --
 * NOT (tenant_id, pattern, coa_id). The route's lookup used to filter by
 * coa_id too, so it never found the existing row when the chosen category
 * differed from the one already on file, fell through to the insert branch,
 * and hit a 23505 on that same unique index. Because that insert wasn't
 * wrapped in its own try/catch, the 23505 propagated to the route's outer
 * catch and returned a false 500 -- even though the journal entry had
 * already posted successfully just above it.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  fake._addUniqueConstraint('categorization_patterns', 'pattern')
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
    postJournalEntry: vi.fn(async () => 'entry-1'),
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
    { id: 'coa-software', tenant_id: TENANT_ID } as Row,
  ])
  // Same normalized pattern ("office supplies") already learned under a
  // DIFFERENT coa_id than the one this request will choose.
  fake._seed('categorization_patterns', [
    { id: 'pat-1', tenant_id: TENANT_ID, pattern: 'office supplies', coa_id: 'coa-old', hit_count: 7 } as Row,
  ])
})

describe('PATCH /api/finance/bank-transactions/[id] — recategorize to a different account', () => {
  it('succeeds and bumps hit_count instead of failing on the pattern unique index', async () => {
    const res = await PATCH(req({ coa_id: 'coa-software' }), { params: params() })
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.journal_entry_id).toBeDefined()

    const rows = fake._all('categorization_patterns')
    expect(rows.length).toBe(1)
    expect(rows[0].hit_count).toBe(8)
  })
})

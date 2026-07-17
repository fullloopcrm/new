/**
 * POST /api/finance/receipts/attach — recategorizing a previously-seen
 * description pattern to a *different* coa_id than what's already learned.
 *
 * categorization_patterns has a unique index on (tenant_id, pattern) only --
 * NOT (tenant_id, pattern, coa_id). The route's lookup used to filter by
 * coa_id too, so it never found the existing row when the chosen category
 * differed from the one already on file, fell through to the insert branch,
 * and hit a 23505 on that same unique index. That insert's result was never
 * checked, so the conflict silently vanished: the request still returned
 * `ok: true`, but hit_count quietly stopped incrementing.
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
    { id: 'coa-software', tenant_id: TENANT_ID } as Row,
  ])
  // Same normalized pattern ("office supplies") already learned under a
  // DIFFERENT coa_id than the one this request will choose.
  fake._seed('categorization_patterns', [
    { id: 'pat-1', tenant_id: TENANT_ID, pattern: 'office supplies', coa_id: 'coa-old', hit_count: 2 } as Row,
  ])
})

describe('POST /api/finance/receipts/attach — recategorize to a different account', () => {
  it('succeeds and bumps hit_count instead of silently dropping it', async () => {
    const res = await POST(req({
      bank_transaction_id: 'txn-1',
      receipt_path: 'receipts/txn-1.pdf',
      coa_id: 'coa-software',
    }))
    const json = await res.json()
    expect(json.ok).toBe(true)

    const rows = fake._all('categorization_patterns')
    expect(rows.length).toBe(1)
    expect(rows[0].hit_count).toBe(3)
  })
})

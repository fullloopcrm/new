/**
 * RECEIPT-ATTACH-AND-CATEGORIZE RACE — POST /api/finance/receipts/attach
 *
 * Unlike the sibling categorize route (../../[id]/route.ts) and
 * accept-suggestions, this route posted the journal entry and then wrote
 * status/coa_id/journal_entry_id unconditionally, gated only on the plain
 * `txn.status === 'pending'` read from BEFORE either concurrent call
 * committed anything -- not a compare-and-swap. Two concurrent
 * attach+categorize calls on the same txn (double-click) would both pass
 * that check and both call postJournalEntry; the ledger RPC's own dedup
 * means only one journal entry actually posts, but whichever request's final
 * `.update(updates)` landed LAST would overwrite the winner's
 * journal_entry_id with null (or double-count if dedup weren't atomic) --
 * a linked-journal-entry that silently vanishes from the bank_transactions
 * row even though the ledger entry is real. Fix: claim the row with the same
 * atomic compare-and-swap pattern as the sibling routes.
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

function req(body: Row): Request {
  return new Request('http://x/api/finance/receipts/attach', {
    method: 'POST',
    body: JSON.stringify(body),
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
      bank_accounts: { coa_id: 'coa-bank' },
    } as Row,
  ])
  fake._seed('chart_of_accounts', [
    { id: 'coa-expense', tenant_id: TENANT_ID } as Row,
  ])
  fake._seed('categorization_patterns', [])
})

const body = {
  bank_transaction_id: 'txn-1',
  receipt_path: 'receipts/txn-1.pdf',
  extracted: { vendor: 'Staples' },
  coa_id: 'coa-expense',
}

describe('POST /api/finance/receipts/attach — double-submit attach+categorize', () => {
  it('two concurrent attach calls post exactly one journal entry, keep the real journal_entry_id', async () => {
    const [a, b] = await Promise.all([POST(req(body)), POST(req(body))])
    const [aJson, bJson] = await Promise.all([a.json(), b.json()])
    expect(aJson.ok).toBe(true)
    expect(bJson.ok).toBe(true)
    expect(postJournalEntryCallCount).toBe(1)

    const txn = fake._all('bank_transactions').find((r) => r.id === 'txn-1')!
    expect(txn.status).toBe('posted')
    // Must not be null/overwritten by the losing request's plain update.
    expect(txn.journal_entry_id).toBe('entry-1')
    expect(txn.receipt_path).toBe('receipts/txn-1.pdf')
  })

  it('a sequential re-submit after posting still attaches the receipt without re-posting', async () => {
    await POST(req(body))
    expect(postJournalEntryCallCount).toBe(1)

    const second = await POST(req({ ...body, receipt_path: 'receipts/txn-1-v2.pdf' }))
    const secondJson = await second.json()
    expect(secondJson.already_processed).toBe(true)
    expect(postJournalEntryCallCount).toBe(1)

    const txn = fake._all('bank_transactions').find((r) => r.id === 'txn-1')!
    expect(txn.journal_entry_id).toBe('entry-1')
    expect(txn.receipt_path).toBe('receipts/txn-1-v2.pdf')
  })
})

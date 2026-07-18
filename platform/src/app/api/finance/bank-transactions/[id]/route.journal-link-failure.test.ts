import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * CATEGORIZE POST-COMMIT LINK FAILURE — PATCH /api/finance/bank-transactions/[id]
 *
 * postJournalEntry() succeeding was treated as the end of the risky window --
 * the trailing `.update({ journal_entry_id: entryId })` that links the newly
 * posted entry back onto this row ran OUTSIDE the release-on-failure
 * try/catch (unlike the sibling accept-suggestions route, whose equivalent
 * link write is inside its try). If that write failed (network blip), the
 * entry was already posted for real (source:'bank_txn', source_id:txn.id)
 * but the row was left stuck 'posted' with journal_entry_id null --
 * invisible in the UI's reconciliation link and excluded from every future
 * retry, forever, since status !== 'pending' excludes it from both this
 * route's own claim and accept-suggestions'.
 *
 * Fix: widen the try/catch to cover the link write too, and treat
 * postJournalEntry()'s null return on retry (its own (source,source_id)
 * dedup claim finding the entry this row already posted, per
 * ledger.ts's post_journal_entry RPC) as "look the real id up", not "link
 * nothing" -- so a retry heals the link instead of re-posting a duplicate
 * entry or silently re-nulling the link.
 */

const TENANT_ID = 'tenant-1'
const TXN_ID = 'txn-1'

type Row = Record<string, unknown>
let txnRow: Row
const journalEntries: Row[] = []
let linkAttempts = 0
let postJournalEntryCalls = 0

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: TENANT_ID }, error: null })),
}))

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    let updatePayload: Row = {}
    let isUpdate = false
    const c: Record<string, unknown> = {
      select: () => c,
      eq: () => c,
      update: (p: Row) => { isUpdate = true; updatePayload = p; return c },
      insert: async (p: Row) => { void p; return { data: p, error: null } },
      maybeSingle: async () => {
        if (table === 'bank_transactions' && isUpdate && updatePayload.status === 'posted' && !('journal_entry_id' in updatePayload)) {
          Object.assign(txnRow, updatePayload)
          return { data: { id: txnRow.id }, error: null }
        }
        if (table === 'chart_of_accounts') {
          return { data: { id: 'coa-expense' }, error: null }
        }
        // categorization_patterns lookup — no pre-existing pattern.
        return { data: null, error: null }
      },
      single: async () => {
        if (table === 'bank_transactions' && !isUpdate) {
          return { data: { ...txnRow, bank_accounts: { coa_id: 'coa-bank' } }, error: null }
        }
        return { data: null, error: null }
      },
      then: (resolve: (v: { data: unknown; error: unknown }) => void, reject: (e: unknown) => void) => {
        if (table === 'bank_transactions' && isUpdate && 'journal_entry_id' in updatePayload) {
          linkAttempts++
          if (linkAttempts === 1) {
            reject(new Error('boom: link update failed'))
            return
          }
          Object.assign(txnRow, updatePayload)
          resolve({ data: null, error: null })
          return
        }
        if (table === 'bank_transactions' && isUpdate) {
          // release-on-failure write (status -> 'pending', coa_id/memo -> null)
          Object.assign(txnRow, updatePayload)
          resolve({ data: null, error: null })
          return
        }
        resolve({ data: [], error: null })
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/ledger', async (orig) => {
  const actual = await orig<typeof import('@/lib/ledger')>()
  return {
    ...actual,
    postJournalEntry: vi.fn(async () => {
      postJournalEntryCalls++
      if (postJournalEntryCalls === 1) {
        journalEntries.push({ id: 'entry-1', source: 'bank_txn', source_id: TXN_ID })
        return 'entry-1'
      }
      // RPC's own (tenant, source, source_id) dedup claim: an entry already
      // exists for this row's categorization from the first (failed-to-link)
      // attempt -- not a second real post.
      return null
    }),
    findJournalEntryId: vi.fn(async () => journalEntries[0]?.id ?? null),
  }
})

import { PATCH } from './route'

function req(body: Row): Request {
  return new Request('http://x/api/finance/bank-transactions/txn-1', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

const params = () => Promise.resolve({ id: TXN_ID })

beforeEach(() => {
  linkAttempts = 0
  postJournalEntryCalls = 0
  journalEntries.length = 0
  txnRow = {
    id: TXN_ID,
    tenant_id: TENANT_ID,
    status: 'pending',
    txn_date: '2026-07-01',
    description: 'Office supplies',
    amount_cents: -5000,
    entity_id: null,
    journal_entry_id: null,
    coa_id: null,
    memo: null,
  }
})

describe('PATCH /api/finance/bank-transactions/[id] — journal_entry_id link write failure', () => {
  it('releases the claim (not stuck posted) when the link write fails after a real post', async () => {
    const res = await PATCH(req({ coa_id: 'coa-expense' }), { params: params() })
    expect(res.status).toBe(500)
    expect(postJournalEntryCalls).toBe(1)
    expect(journalEntries).toHaveLength(1)
    // Released, not stuck -- retryable.
    expect(txnRow.status).toBe('pending')
    expect(txnRow.journal_entry_id).toBeFalsy()
  })

  it('a retry after release heals the link without posting a duplicate entry', async () => {
    const first = await PATCH(req({ coa_id: 'coa-expense' }), { params: params() })
    expect(first.status).toBe(500)

    const second = await PATCH(req({ coa_id: 'coa-expense' }), { params: params() })
    const secondJson = await second.json()
    expect(second.status).toBe(200)
    expect(secondJson.journal_entry_id).toBe('entry-1')

    // postJournalEntry was called twice (first real post, second hit the
    // RPC's own dedup claim and returned null) but only ONE entry exists.
    expect(postJournalEntryCalls).toBe(2)
    expect(journalEntries).toHaveLength(1)
    expect(txnRow.status).toBe('posted')
    expect(txnRow.journal_entry_id).toBe('entry-1')
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * postJournalEntry's contract for the post_journal_entry RPC's dedup claim
 * (2026_07_13_journal_entries_dedup_constraint_PROPOSED.sql). The RPC now
 * returns NULL when its atomic INSERT ... ON CONFLICT DO NOTHING against the
 * partial unique index on (tenant_id, source, source_id) loses to a
 * concurrent caller that already posted the same business event — this is
 * the real fix for the race that a plain journalEntryExists() SELECT check
 * can't close (two readers can both see "not posted yet" before either
 * writer commits). NULL must pass straight through as "already posted", not
 * be mistaken for "no entry id returned" and thrown as an error.
 */

let rpcResult: { data: unknown; error: unknown } = { data: 'entry-1', error: null }

vi.mock('./supabase', () => ({
  supabaseAdmin: { rpc: async () => rpcResult },
}))

import { postJournalEntry } from './ledger'

beforeEach(() => {
  rpcResult = { data: 'entry-1', error: null }
})

const LINES = [
  { coa_id: 'acct-debit', debit_cents: 1000 },
  { coa_id: 'acct-credit', credit_cents: 1000 },
]

describe('postJournalEntry — RPC dedup-claim contract', () => {
  it('returns the entry id on a normal (winning) post', async () => {
    rpcResult = { data: 'entry-42', error: null }
    const id = await postJournalEntry({
      tenant_id: 't1', entry_date: '2026-07-13', source: 'refund', source_id: 're_1', lines: LINES,
    })
    expect(id).toBe('entry-42')
  })

  it('returns null (not a thrown error) when the RPC dedup claim loses the race', async () => {
    rpcResult = { data: null, error: null }
    const id = await postJournalEntry({
      tenant_id: 't1', entry_date: '2026-07-13', source: 'refund', source_id: 're_1', lines: LINES,
    })
    expect(id).toBeNull()
  })

  it('still throws on a genuine RPC error (unrelated to the dedup claim)', async () => {
    rpcResult = { data: null, error: new Error('connection reset') }
    await expect(
      postJournalEntry({ tenant_id: 't1', entry_date: '2026-07-13', source: 'refund', source_id: 're_1', lines: LINES }),
    ).rejects.toThrow('connection reset')
  })
})

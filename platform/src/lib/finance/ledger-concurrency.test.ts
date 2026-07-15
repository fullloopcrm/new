import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Ledger concurrency — the residual gap PR#12 (cleaner-payout claim) does NOT
 * close: the journal_entries check-then-insert TOCTOU.
 *
 * The money helpers dedupe with journalEntryExists() THEN post_journal_entry().
 * Two CONCURRENT duplicate deliveries can both pass the existence check before
 * either inserts. Migration 064's post_journal_entry() RPC now enforces
 * UNIQUE(tenant_id, source, source_id) AND resolves the loser atomically inside
 * the RPC itself, returning NULL (not an error) instead of the caller having to
 * catch a 23505 — the DB call, not the prior read, is the gate. ledger.ts
 * postJournalEntry() passes that NULL straight through: the loser gets null
 * back, same as its own journalEntryExists() pre-check finding an existing
 * entry. This suite exercises the REAL postJournalEntry against a mock that
 * enforces exactly that unique index, and proves the concurrent duplicate
 * posts the entry exactly once.
 */

// In-memory journal keyed like the migration-064 partial unique index:
// (tenant_id, source, source_id) WHERE source_id IS NOT NULL.
type Entry = { id: string; tenant_id: string; source: string; source_id: string | null }
let entries: Entry[]
let seq: number
const uqKey = (t: string, s: string, sid: string | null) => `${t}|${s}|${sid}`

// rpc('post_journal_entry', …) models the atomic insert + the UNIQUE index:
// a second row with the same (tenant, source, source_id) resolves the dedupe
// claim INSIDE the RPC and returns NULL — not an error the caller must catch.
const rpc = vi.fn(async (_name: string, p: Record<string, unknown>) => {
  const tenant = String(p.p_tenant_id)
  const source = String(p.p_source ?? 'manual')
  const sourceId = (p.p_source_id as string | null) ?? null
  if (sourceId !== null && entries.some(e => uqKey(e.tenant_id, e.source, e.source_id) === uqKey(tenant, source, sourceId))) {
    return { data: null, error: null }
  }
  const id = `entry_${++seq}`
  entries.push({ id, tenant_id: tenant, source, source_id: sourceId })
  return { data: id, error: null }
})

// from('journal_entries').select('id').eq().eq().eq().limit().maybeSingle()
function journalEntriesBuilder() {
  const f: Record<string, string | null> = {}
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => { f[col] = val === null ? null : String(val); return chain },
    limit: () => chain,
    maybeSingle: async () => {
      const hit = entries.find(e => uqKey(e.tenant_id, e.source, e.source_id) === uqKey(String(f.tenant_id), String(f.source), (f.source_id as string | null) ?? null))
      return { data: hit ? { id: hit.id } : null, error: null }
    },
  }
  return chain
}

vi.mock('../supabase', () => ({
  supabaseAdmin: {
    rpc: (name: string, params: Record<string, unknown>) => rpc(name, params),
    from: (table: string) => {
      if (table === 'journal_entries') return journalEntriesBuilder()
      const noop: Record<string, unknown> = {
        select: () => noop, eq: () => noop, limit: () => noop,
        maybeSingle: async () => ({ data: null, error: null }),
      }
      return noop
    },
  },
}))

import { postJournalEntry } from '../ledger'

const TENANT = 'tenant_1'
const balancedLines = [
  { coa_id: 'acct_dr', debit_cents: 12000 },
  { coa_id: 'acct_cr', credit_cents: 12000 },
]

beforeEach(() => {
  entries = []
  seq = 0
  rpc.mockClear()
})

describe('journal_entries concurrent duplicate does not double-post (migration 064 backstop)', () => {
  it('a second post for the same (tenant, source, source_id) returns null and adds no row', async () => {
    const first = await postJournalEntry({
      tenant_id: TENANT, entry_date: '2026-07-11', source: 'refund', source_id: 're_ABC', lines: balancedLines,
    })
    const second = await postJournalEntry({
      tenant_id: TENANT, entry_date: '2026-07-11', source: 'refund', source_id: 're_ABC', lines: balancedLines,
    })

    expect(first).toBe('entry_1')
    expect(second).toBeNull()           // RPC resolved the dedupe claim internally — null, not a throw
    expect(entries.length).toBe(1)      // exactly one journal entry exists
    expect(rpc).toHaveBeenCalledTimes(2) // both deliveries attempted the insert
  })

  it('simultaneous (Promise.all) duplicate refund posts exactly once', async () => {
    const results = await Promise.all([
      postJournalEntry({ tenant_id: TENANT, entry_date: '2026-07-11', source: 'chargeback', source_id: 'dp_1', lines: balancedLines }),
      postJournalEntry({ tenant_id: TENANT, entry_date: '2026-07-11', source: 'chargeback', source_id: 'dp_1', lines: balancedLines }),
    ])
    expect(entries.length).toBe(1)
    // Exactly one delivery wins (a real id); the other loses the dedupe race
    // and gets null straight from the RPC.
    expect(results.filter((r) => r !== null)).toHaveLength(1)
    expect(results).toContain(null)
  })

  it('positive control: two distinct source_ids each post', async () => {
    await postJournalEntry({ tenant_id: TENANT, entry_date: '2026-07-11', source: 'refund', source_id: 're_ONE', lines: balancedLines })
    await postJournalEntry({ tenant_id: TENANT, entry_date: '2026-07-11', source: 'refund', source_id: 're_TWO', lines: balancedLines })
    expect(entries.length).toBe(2)
  })

  it('cross-tenant control: same source_id under two tenants posts once per tenant', async () => {
    await postJournalEntry({ tenant_id: 'tenant_A', entry_date: '2026-07-11', source: 'refund', source_id: 're_SHARED', lines: balancedLines })
    await postJournalEntry({ tenant_id: 'tenant_B', entry_date: '2026-07-11', source: 'refund', source_id: 're_SHARED', lines: balancedLines })
    await postJournalEntry({ tenant_id: 'tenant_A', entry_date: '2026-07-11', source: 'refund', source_id: 're_SHARED', lines: balancedLines }) // dup of #1
    expect(entries.length).toBe(2)
  })

  it('unbalanced entry still rejected before any insert', async () => {
    await expect(postJournalEntry({
      tenant_id: TENANT, entry_date: '2026-07-11', source: 'refund', source_id: 're_X',
      lines: [{ coa_id: 'a', debit_cents: 100 }, { coa_id: 'b', credit_cents: 50 }],
    })).rejects.toThrow(/unbalanced/i)
    expect(rpc).not.toHaveBeenCalled()
  })
})

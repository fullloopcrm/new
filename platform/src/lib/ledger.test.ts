import { createHash } from 'crypto'

/**
 * ledger.ts — double-entry accounting + bank-transaction dedup fingerprinting.
 * ledger.ts had zero direct unit coverage — every ledger poster
 * (post-revenue/post-labor/post-adjustments) builds on these primitives, but
 * only post-revenue's double-post race was ever pinned by a test. This suite
 * covers the primitives directly: the debit=credit balance guard (the thing
 * that keeps the books valid), the unique-violation-as-idempotent contract
 * every poster relies on, and the chart-of-accounts seeding used by all of
 * them before they can resolve an account id.
 *
 * Mocks `supabaseAdmin.rpc` directly (the shared fake-supabase.ts harness
 * doesn't model RPC calls), matching the pattern in post-revenue-race.test.ts.
 * `rpcOverride`, when set, lets a test control what post_journal_entry
 * resolves to (error / malformed id / duplicate no-op) — defaults to the
 * normal success path so most tests don't need to touch it.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const rpcCalls: Array<{ fn: string; params: Record<string, unknown> }> = []
let rpcOverride: { data: unknown; error: unknown } | null = null

vi.mock('./supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()

  const rpc = async (fn: string, params: Record<string, unknown>) => {
    rpcCalls.push({ fn, params })
    if (fn !== 'post_journal_entry') throw new Error(`unexpected rpc: ${fn}`)
    if (rpcOverride) return rpcOverride
    const id = crypto.randomUUID()
    fake._seed('journal_entries', [
      { id, tenant_id: params.p_tenant_id, source: params.p_source, source_id: params.p_source_id },
    ])
    return { data: id, error: null }
  }

  const admin = { ...fake, rpc }
  return { supabase: admin, supabaseAdmin: admin, __fake: fake }
})

import { supabaseAdmin } from './supabase'
import {
  normalizeDescription,
  transactionFingerprint,
  sha256File,
  isUniqueViolation,
  postJournalEntry,
  seedChartOfAccounts,
  ensureChartAccounts,
  getAccountIdByCode,
  journalEntryExists,
  DEFAULT_CHART,
} from './ledger'

const fake = supabaseAdmin as unknown as FakeSupabase
const TENANT_ID = 'tenant-1'

beforeEach(() => {
  fake._store.clear()
  rpcCalls.length = 0
  rpcOverride = null
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('normalizeDescription', () => {
  it('lowercases, strips punctuation, and masks long numbers', () => {
    expect(normalizeDescription('  ACH  Deposit -  Stripe #4829102938  ')).toBe('ach deposit  stripe ##')
  })

  it('handles empty/undefined input without throwing', () => {
    expect(normalizeDescription('')).toBe('')
    expect(normalizeDescription(undefined as unknown as string)).toBe('')
  })

  it('collapses standalone digit runs of length >= 4 to "#"', () => {
    expect(normalizeDescription('ACME 12345 Corp')).toBe('acme # corp')
    expect(normalizeDescription('9999')).toBe('#')
  })

  it('preserves digit runs shorter than 4', () => {
    expect(normalizeDescription('abc 999')).toBe('abc 999')
    expect(normalizeDescription('order 12')).toBe('order 12')
  })

  it('does NOT collapse digits fused to letters (no word boundary) — documents dedup limitation', () => {
    expect(normalizeDescription('order12345')).toBe('order12345')
  })

  it('keeps a literal # already present', () => {
    expect(normalizeDescription('ref #1234')).toBe('ref ##')
  })

  it('returns "" for whitespace-only input', () => {
    expect(normalizeDescription('   \t\n  ')).toBe('')
  })
})

describe('transactionFingerprint', () => {
  it('is deterministic for identical inputs', () => {
    const a = transactionFingerprint('2026-07-11', 1000, 'Acme Corp')
    const b = transactionFingerprint('2026-07-11', 1000, 'Acme Corp')
    expect(a).toBe(b)
  })

  it('is exactly 32 hex characters', () => {
    const fp = transactionFingerprint('2026-07-11', 1000, 'Acme Corp')
    expect(fp).toMatch(/^[0-9a-f]{32}$/)
  })

  it('folds together descriptions that normalize identically (the dedup property)', () => {
    const a = transactionFingerprint('2026-07-11', 1000, 'ACME  CORP  12345')
    const b = transactionFingerprint('2026-07-11', 1000, 'acme corp 99999')
    expect(a).toBe(b)
  })

  it('is sensitive to the amount', () => {
    const a = transactionFingerprint('2026-07-11', 1000, 'Acme Corp')
    const b = transactionFingerprint('2026-07-11', 1001, 'Acme Corp')
    expect(a).not.toBe(b)
  })

  it('is sensitive to the date', () => {
    const a = transactionFingerprint('2026-07-11', 1000, 'Acme Corp')
    const b = transactionFingerprint('2026-07-12', 1000, 'Acme Corp')
    expect(a).not.toBe(b)
  })

  it('distinguishes a negative amount from its positive (debit vs credit)', () => {
    const credit = transactionFingerprint('2026-07-11', 1000, 'Acme Corp')
    const debit = transactionFingerprint('2026-07-11', -1000, 'Acme Corp')
    expect(credit).not.toBe(debit)
  })

  it('matches an independently computed sha256 slice (pins the algorithm)', () => {
    const expected = createHash('sha256')
      .update('2026-07-11|1000|acme corp')
      .digest('hex')
      .slice(0, 32)
    expect(transactionFingerprint('2026-07-11', 1000, 'Acme Corp')).toBe(expected)
  })
})

describe('sha256File', () => {
  it('returns the well-known sha256 of empty input (full 64 hex chars)', () => {
    expect(sha256File(Buffer.alloc(0))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    )
  })

  it('produces the same hash for a Buffer and an equivalent Uint8Array', () => {
    const buf = Buffer.from([1, 2, 3, 4])
    const arr = new Uint8Array([1, 2, 3, 4])
    expect(sha256File(buf)).toBe(sha256File(arr))
  })

  it('differs when a single byte changes', () => {
    expect(sha256File(Buffer.from([0]))).not.toBe(sha256File(Buffer.from([1])))
  })
})

describe('DEFAULT_CHART invariants', () => {
  it('is non-empty', () => {
    expect(DEFAULT_CHART.length).toBeGreaterThan(0)
  })

  it('has unique account codes (unique index on tenant_id+code depends on this)', () => {
    const codes = DEFAULT_CHART.map(a => a.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('uses only valid 4-digit codes', () => {
    for (const a of DEFAULT_CHART) expect(a.code).toMatch(/^\d{4}$/)
  })

  it('uses only valid AccountType values', () => {
    const valid = new Set(['asset', 'liability', 'equity', 'income', 'expense'])
    for (const a of DEFAULT_CHART) expect(valid.has(a.type)).toBe(true)
  })

  it('marks bank accounts only on asset rows', () => {
    for (const a of DEFAULT_CHART) {
      if (a.is_bank_account) expect(a.type).toBe('asset')
    }
  })
})

describe('isUniqueViolation', () => {
  it('is true for a Postgres 23505 error object', () => {
    expect(isUniqueViolation({ code: '23505', message: 'duplicate key' })).toBe(true)
  })

  it('is false for other error codes', () => {
    expect(isUniqueViolation({ code: '23502', message: 'not null violation' })).toBe(false)
  })

  it('is false for non-object / nullish values', () => {
    expect(isUniqueViolation(null)).toBe(false)
    expect(isUniqueViolation(undefined)).toBe(false)
    expect(isUniqueViolation('boom')).toBe(false)
    expect(isUniqueViolation(new Error('boom'))).toBe(false)
  })
})

describe('postJournalEntry — balance invariant', () => {
  const base = {
    tenant_id: TENANT_ID,
    entry_date: '2026-07-13',
    lines: [] as Array<{ coa_id: string; debit_cents?: number; credit_cents?: number }>,
  }

  it('throws when debits ≠ credits', async () => {
    await expect(postJournalEntry({
      ...base,
      lines: [
        { coa_id: 'a', debit_cents: 1000 },
        { coa_id: 'b', credit_cents: 900 },
      ],
    })).rejects.toThrow(/Unbalanced journal entry: debits 1000, credits 900/)
    expect(rpcCalls.length).toBe(0)
  })

  it('throws "Empty journal entry" when all amounts are zero', async () => {
    await expect(postJournalEntry({
      ...base,
      lines: [
        { coa_id: 'a', debit_cents: 0 },
        { coa_id: 'b', credit_cents: 0 },
      ],
    })).rejects.toThrow(/Empty journal entry/)
    expect(rpcCalls.length).toBe(0)
  })

  it('throws "Empty journal entry" for an empty lines array', async () => {
    await expect(postJournalEntry({ ...base, lines: [] })).rejects.toThrow(/Empty journal entry/)
  })

  it('treats missing debit_cents/credit_cents as 0 when balancing', async () => {
    const id = await postJournalEntry({
      ...base,
      lines: [
        { coa_id: 'a', debit_cents: 500 },
        { coa_id: 'b', credit_cents: 500 },
      ],
    })
    expect(typeof id).toBe('string')
    expect(rpcCalls.length).toBe(1)
  })

  it('posts a balanced multi-line entry via rpc and returns the entry id', async () => {
    const id = await postJournalEntry({
      ...base,
      source: 'manual',
      lines: [
        { coa_id: 'coa-a', debit_cents: 700 },
        { coa_id: 'coa-b', debit_cents: 300 },
        { coa_id: 'coa-c', credit_cents: 1000 },
      ],
    })
    expect(typeof id).toBe('string')
    expect(rpcCalls.length).toBe(1)
    expect(rpcCalls[0].fn).toBe('post_journal_entry')
  })

  it('defaults source to "manual" and null-fills optional params in the RPC payload', async () => {
    await postJournalEntry({
      ...base,
      lines: [
        { coa_id: 'a', debit_cents: 100 },
        { coa_id: 'b', credit_cents: 100 },
      ],
    })
    const { params } = rpcCalls[0]
    expect(params.p_source).toBe('manual')
    expect(params.p_entity_id).toBeNull()
    expect(params.p_memo).toBeNull()
    expect(params.p_lines).toEqual([
      { coa_id: 'a', debit_cents: 100, credit_cents: 0, memo: null },
      { coa_id: 'b', debit_cents: 0, credit_cents: 100, memo: null },
    ])
  })

  it('propagates an RPC error', async () => {
    rpcOverride = { data: null, error: new Error('rpc boom') }
    await expect(postJournalEntry({
      ...base,
      lines: [
        { coa_id: 'a', debit_cents: 100 },
        { coa_id: 'b', credit_cents: 100 },
      ],
    })).rejects.toThrow(/rpc boom/)
  })

  it('returns null (idempotent no-op) when the RPC reports a duplicate post', async () => {
    // post_journal_entry() returns NULL on a (tenant_id, source, source_id)
    // conflict instead of throwing — this is the real idempotency gate, not
    // an error.
    rpcOverride = { data: null, error: null }
    const id = await postJournalEntry({
      ...base,
      lines: [
        { coa_id: 'a', debit_cents: 100 },
        { coa_id: 'b', credit_cents: 100 },
      ],
    })
    expect(id).toBeNull()
  })

  it('throws when the RPC returns a malformed (non-string, non-null) id', async () => {
    rpcOverride = { data: 42, error: null }
    await expect(postJournalEntry({
      ...base,
      lines: [
        { coa_id: 'a', debit_cents: 100 },
        { coa_id: 'b', credit_cents: 100 },
      ],
    })).rejects.toThrow(/no entry id returned/)
  })
})

describe('seedChartOfAccounts', () => {
  it('inserts every DEFAULT_CHART row for a fresh tenant', async () => {
    const inserted = await seedChartOfAccounts(TENANT_ID)
    expect(inserted).toBe(DEFAULT_CHART.length)
    expect(fake._all('chart_of_accounts').filter((r) => r.tenant_id === TENANT_ID).length).toBe(DEFAULT_CHART.length)
  })

  it('is a no-op returning 0 if the tenant already has any accounts', async () => {
    fake._seed('chart_of_accounts', [{ id: 'x', tenant_id: TENANT_ID, code: '1000' }])
    const inserted = await seedChartOfAccounts(TENANT_ID)
    expect(inserted).toBe(0)
    expect(fake._all('chart_of_accounts').filter((r) => r.tenant_id === TENANT_ID).length).toBe(1)
  })
})

describe('ensureChartAccounts', () => {
  it('inserts only the codes a tenant is missing, idempotently', async () => {
    fake._seed('chart_of_accounts', [{ id: 'x', tenant_id: TENANT_ID, code: '1000', name: 'Cash' }])
    await ensureChartAccounts(TENANT_ID)
    const rows = fake._all('chart_of_accounts').filter((r) => r.tenant_id === TENANT_ID)
    expect(rows.length).toBe(DEFAULT_CHART.length)

    // Calling again with the chart already complete inserts nothing further.
    await ensureChartAccounts(TENANT_ID)
    expect(fake._all('chart_of_accounts').filter((r) => r.tenant_id === TENANT_ID).length).toBe(DEFAULT_CHART.length)
  })
})

describe('getAccountIdByCode / journalEntryExists', () => {
  it('resolves an existing code to its row id and null for an unknown code', async () => {
    fake._seed('chart_of_accounts', [{ id: 'coa-4000', tenant_id: TENANT_ID, code: '4000' }])
    expect(await getAccountIdByCode(TENANT_ID, '4000')).toBe('coa-4000')
    expect(await getAccountIdByCode(TENANT_ID, '9999')).toBeNull()
  })

  it('reports whether a journal entry already exists for a (source, source_id) pair', async () => {
    expect(await journalEntryExists(TENANT_ID, 'payout', 'payout-1')).toBe(false)
    fake._seed('journal_entries', [{ id: 'je-1', tenant_id: TENANT_ID, source: 'payout', source_id: 'payout-1' }])
    expect(await journalEntryExists(TENANT_ID, 'payout', 'payout-1')).toBe(true)
    // Different tenant with the same source/source_id must not match (tenant isolation).
    expect(await journalEntryExists('tenant-2', 'payout', 'payout-1')).toBe(false)
  })
})

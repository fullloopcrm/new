import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createHash } from 'crypto'

/**
 * ledger.ts — double-entry accounting + bank-transaction dedup fingerprinting.
 *
 * The load-bearing invariants under test:
 *   - postJournalEntry MUST reject any entry whose debits ≠ credits (the core
 *     accounting invariant; a mismatch corrupts the books) and any empty entry.
 *   - transactionFingerprint MUST be deterministic and MUST fold case /
 *     whitespace / long digit-runs together (that's what lets re-imported bank
 *     rows dedup) — while staying sensitive to date + amount.
 *   - normalizeDescription is the fingerprint's normalizer; its exact behavior
 *     is pinned here so a future edit can't silently change dedup semantics.
 *
 * We mock @supabase/supabase-js's createClient so supabaseAdmin (built from it
 * at import time) returns controllable results — same pattern as
 * rate-limit-db.test.ts. `chainResult` is what an awaited query builder resolves
 * to; `maybeSingleResult` is what `.maybeSingle()` resolves to; `rpcResult` is
 * the `.rpc()` result. Spies capture insert/upsert/rpc payloads.
 */

let rpcResult: { data: unknown; error: unknown }
let maybeSingleResult: { data: unknown }
let chainResult: { data?: unknown; count?: number | null; error?: unknown }
const rpcSpy = vi.fn()
const insertSpy = vi.fn()
const upsertSpy = vi.fn()

function makeBuilder() {
  const b: Record<string, unknown> = {}
  const self = () => b
  b.select = vi.fn(self)
  b.eq = vi.fn(self)
  b.limit = vi.fn(self)
  b.insert = vi.fn((rows: unknown) => { insertSpy(rows); return b })
  b.upsert = vi.fn((rows: unknown, opts: unknown) => { upsertSpy(rows, opts); return b })
  b.maybeSingle = vi.fn(async () => maybeSingleResult)
  b.single = vi.fn(async () => maybeSingleResult)
  // Thenable: any `await builder` (e.g. `.select().eq()` used as a terminal)
  // resolves to chainResult.
  b.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
    Promise.resolve(chainResult).then(res, rej)
  return b
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => makeBuilder(),
    rpc: (name: string, params: unknown) => { rpcSpy(name, params); return Promise.resolve(rpcResult) },
  }),
}))

import {
  postJournalEntry,
  normalizeDescription,
  transactionFingerprint,
  sha256File,
  DEFAULT_CHART,
  seedChartOfAccounts,
  getAccountIdByCode,
  journalEntryExists,
} from './ledger'

beforeEach(() => {
  rpcResult = { data: 'entry-id-1', error: null }
  maybeSingleResult = { data: null }
  chainResult = { data: null, count: null, error: null }
  rpcSpy.mockClear()
  insertSpy.mockClear()
  upsertSpy.mockClear()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('normalizeDescription', () => {
  it('lowercases and trims', () => {
    expect(normalizeDescription('  HELLO World  ')).toBe('hello world')
  })

  it('collapses internal runs of whitespace (spaces, tabs, newlines) to one space', () => {
    expect(normalizeDescription('a\t\tb\n\nc   d')).toBe('a b c d')
  })

  it('collapses standalone digit runs of length >= 4 to "#"', () => {
    expect(normalizeDescription('ACME 12345 Corp')).toBe('acme # corp')
    expect(normalizeDescription('9999')).toBe('#')
  })

  it('preserves digit runs shorter than 4', () => {
    expect(normalizeDescription('abc 999')).toBe('abc 999')
    expect(normalizeDescription('order 12')).toBe('order 12')
  })

  it('collapses multiple long digit runs independently', () => {
    expect(normalizeDescription('12345 67890')).toBe('# #')
  })

  it('does NOT collapse digits fused to letters (no word boundary) — documents dedup limitation', () => {
    // 'r1' is word-word: no \b before the digits, so \b\d{4,}\b cannot match.
    expect(normalizeDescription('order12345')).toBe('order12345')
  })

  it('strips characters outside [a-z0-9# ] (punctuation, accents)', () => {
    expect(normalizeDescription('café')).toBe('caf')
    expect(normalizeDescription('Payment: $50.00!!!')).toBe('payment 5000')
  })

  it('keeps a literal # already present', () => {
    expect(normalizeDescription('ref #1234')).toBe('ref ##')
  })

  it('returns "" for null / undefined / empty (adversarial null input)', () => {
    expect(normalizeDescription(null as unknown as string)).toBe('')
    expect(normalizeDescription(undefined as unknown as string)).toBe('')
    expect(normalizeDescription('')).toBe('')
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
    // Different case, whitespace, and (long) reference numbers → same normalized
    // string → same fingerprint. This is what dedups a re-imported bank row.
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

  it('is deterministic', () => {
    const bytes = Buffer.from('invoice.pdf-contents')
    expect(sha256File(bytes)).toBe(sha256File(bytes))
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

describe('postJournalEntry — balance invariant', () => {
  const base = {
    tenant_id: 't1',
    entry_date: '2026-07-11',
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
    expect(rpcSpy).not.toHaveBeenCalled()
  })

  it('throws "Empty journal entry" when all amounts are zero', async () => {
    await expect(postJournalEntry({
      ...base,
      lines: [
        { coa_id: 'a', debit_cents: 0 },
        { coa_id: 'b', credit_cents: 0 },
      ],
    })).rejects.toThrow(/Empty journal entry/)
    expect(rpcSpy).not.toHaveBeenCalled()
  })

  it('throws "Empty journal entry" for an empty lines array', async () => {
    await expect(postJournalEntry({ ...base, lines: [] })).rejects.toThrow(/Empty journal entry/)
  })

  it('treats missing debit_cents/credit_cents as 0 when balancing', async () => {
    // debit line has no credit_cents, credit line has no debit_cents — balances.
    const id = await postJournalEntry({
      ...base,
      lines: [
        { coa_id: 'a', debit_cents: 500 },
        { coa_id: 'b', credit_cents: 500 },
      ],
    })
    expect(id).toBe('entry-id-1')
    expect(rpcSpy).toHaveBeenCalledOnce()
  })

  it('accepts a multi-line balanced entry and returns the entry id', async () => {
    rpcResult = { data: 'je-42', error: null }
    const id = await postJournalEntry({
      ...base,
      lines: [
        { coa_id: 'a', debit_cents: 700 },
        { coa_id: 'b', debit_cents: 300 },
        { coa_id: 'c', credit_cents: 1000 },
      ],
    })
    expect(id).toBe('je-42')
  })

  it('defaults source to "manual" and null-fills optional params in the RPC payload', async () => {
    await postJournalEntry({
      ...base,
      lines: [
        { coa_id: 'a', debit_cents: 100 },
        { coa_id: 'b', credit_cents: 100 },
      ],
    })
    const [name, params] = rpcSpy.mock.calls[0]
    expect(name).toBe('post_journal_entry')
    expect(params.p_source).toBe('manual')
    expect(params.p_entity_id).toBeNull()
    expect(params.p_memo).toBeNull()
    // Each line's amounts are coerced to numbers (undefined → 0).
    expect(params.p_lines).toEqual([
      { coa_id: 'a', debit_cents: 100, credit_cents: 0, memo: null },
      { coa_id: 'b', debit_cents: 0, credit_cents: 100, memo: null },
    ])
  })

  it('propagates an RPC error', async () => {
    rpcResult = { data: null, error: new Error('rpc boom') }
    await expect(postJournalEntry({
      ...base,
      lines: [
        { coa_id: 'a', debit_cents: 100 },
        { coa_id: 'b', credit_cents: 100 },
      ],
    })).rejects.toThrow(/rpc boom/)
  })

  it('throws when the RPC returns a non-string id (no entry id returned)', async () => {
    rpcResult = { data: null, error: null }
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
  it('is idempotent: returns 0 and inserts nothing when accounts already exist', async () => {
    chainResult = { count: 5, error: null }
    const n = await seedChartOfAccounts('t1')
    expect(n).toBe(0)
    expect(insertSpy).not.toHaveBeenCalled()
  })

  it('seeds the full default chart when none exist', async () => {
    chainResult = { count: 0, error: null }
    const n = await seedChartOfAccounts('t1')
    expect(n).toBe(DEFAULT_CHART.length)
    expect(insertSpy).toHaveBeenCalledOnce()
    const rows = insertSpy.mock.calls[0][0] as Array<{ tenant_id: string }>
    expect(rows).toHaveLength(DEFAULT_CHART.length)
    // Every seeded row is tenant-scoped.
    expect(rows.every(r => r.tenant_id === 't1')).toBe(true)
  })

  it('throws when the insert fails', async () => {
    chainResult = { count: 0, error: { message: 'insert boom' } }
    await expect(seedChartOfAccounts('t1')).rejects.toEqual({ message: 'insert boom' })
  })
})

describe('getAccountIdByCode', () => {
  it('returns the id when the account exists', async () => {
    maybeSingleResult = { data: { id: 'acc-1' } }
    expect(await getAccountIdByCode('t1', '4000')).toBe('acc-1')
  })

  it('returns null when no row matches', async () => {
    maybeSingleResult = { data: null }
    expect(await getAccountIdByCode('t1', '9999')).toBeNull()
  })
})

describe('journalEntryExists', () => {
  it('is true when a matching (source, source_id) entry exists', async () => {
    maybeSingleResult = { data: { id: 'je-1' } }
    expect(await journalEntryExists('t1', 'payment', 'p1')).toBe(true)
  })

  it('is false when no matching entry exists', async () => {
    maybeSingleResult = { data: null }
    expect(await journalEntryExists('t1', 'payment', 'p1')).toBe(false)
  })
})

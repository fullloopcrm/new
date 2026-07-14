/**
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
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const rpcCalls: Array<{ fn: string; params: Record<string, unknown> }> = []

vi.mock('./supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()

  const rpc = async (fn: string, params: Record<string, unknown>) => {
    rpcCalls.push({ fn, params })
    if (fn !== 'post_journal_entry') throw new Error(`unexpected rpc: ${fn}`)
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
})

describe('normalizeDescription', () => {
  it('lowercases, strips punctuation, and masks long numbers', () => {
    expect(normalizeDescription('  ACH  Deposit -  Stripe #4829102938  ')).toBe('ach deposit  stripe ##')
  })

  it('handles empty/undefined input without throwing', () => {
    expect(normalizeDescription('')).toBe('')
    expect(normalizeDescription(undefined as unknown as string)).toBe('')
  })
})

describe('transactionFingerprint', () => {
  it('is stable for the same (date, amount, description)', () => {
    const a = transactionFingerprint('2026-07-13', 5000, 'Stripe payout')
    const b = transactionFingerprint('2026-07-13', 5000, 'Stripe payout')
    expect(a).toBe(b)
  })

  it('differs when the amount changes', () => {
    const a = transactionFingerprint('2026-07-13', 5000, 'Stripe payout')
    const b = transactionFingerprint('2026-07-13', 5001, 'Stripe payout')
    expect(a).not.toBe(b)
  })

  it('is insensitive to description casing/formatting differences normalizeDescription already collapses', () => {
    const a = transactionFingerprint('2026-07-13', 5000, 'Stripe Payout #123456789')
    const b = transactionFingerprint('2026-07-13', 5000, 'stripe   payout #987654321')
    expect(a).toBe(b)
  })
})

describe('sha256File', () => {
  it('hashes identical bytes to the same digest', () => {
    const bytes = Buffer.from('same content')
    expect(sha256File(bytes)).toBe(sha256File(Buffer.from('same content')))
  })

  it('hashes different bytes to different digests', () => {
    expect(sha256File(Buffer.from('a'))).not.toBe(sha256File(Buffer.from('b')))
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

describe('postJournalEntry — balance guard', () => {
  it('throws and never calls rpc when debits and credits are unequal', async () => {
    await expect(
      postJournalEntry({
        tenant_id: TENANT_ID,
        entry_date: '2026-07-13',
        lines: [
          { coa_id: 'coa-a', debit_cents: 1000 },
          { coa_id: 'coa-b', credit_cents: 900 },
        ],
      }),
    ).rejects.toThrow(/Unbalanced journal entry/)
    expect(rpcCalls.length).toBe(0)
  })

  it('throws and never calls rpc for an empty (zero-total) entry', async () => {
    await expect(
      postJournalEntry({
        tenant_id: TENANT_ID,
        entry_date: '2026-07-13',
        lines: [
          { coa_id: 'coa-a', debit_cents: 0 },
          { coa_id: 'coa-b', credit_cents: 0 },
        ],
      }),
    ).rejects.toThrow(/Empty journal entry/)
    expect(rpcCalls.length).toBe(0)
  })

  it('posts a balanced entry via rpc and returns the entry id', async () => {
    const id = await postJournalEntry({
      tenant_id: TENANT_ID,
      entry_date: '2026-07-13',
      source: 'manual',
      lines: [
        { coa_id: 'coa-a', debit_cents: 500 },
        { coa_id: 'coa-b', credit_cents: 500 },
      ],
    })
    expect(typeof id).toBe('string')
    expect(rpcCalls.length).toBe(1)
    expect(rpcCalls[0].fn).toBe('post_journal_entry')
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

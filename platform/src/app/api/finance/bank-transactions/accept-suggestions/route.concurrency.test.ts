import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * 💰 TOCTOU / double-post — POST /api/finance/bank-transactions/accept-suggestions.
 *
 * The batch's initial SELECT (status='pending', confidence >= threshold) is
 * a stale snapshot by the time each loop iteration's postJournalEntry runs.
 * Two concurrent accept-suggestions runs (double-click "accept all", or a
 * race against /match or the [id] PATCH categorize route on one of the same
 * rows) both iterate the same pending row and both post a journal entry for
 * it — double-counting it in the ledger.
 *
 * Fix: an atomic conditional UPDATE (`status = 'pending'`) claimed per-row
 * immediately before postJournalEntry. A losing claim is counted as skipped,
 * not failed, and the row is left untouched by the loser.
 */

const TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: TENANT }, error: null })),
}))
vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {
    status = 401
  },
}))

const postJournalEntry = vi.fn(async () => 'je-1')
vi.mock('@/lib/ledger', () => ({
  postJournalEntry: (...args: Parameters<typeof postJournalEntry>) => postJournalEntry(...args),
  normalizeDescription: (s: string) => s,
}))

import { POST } from './route'

function seed() {
  return {
    bank_transactions: [
      {
        id: 't-1',
        tenant_id: TENANT,
        status: 'pending',
        txn_date: '2026-07-01',
        description: 'Home Depot',
        amount_cents: -5000,
        suggested_coa_id: 'coa-1',
        suggested_confidence: 0.9,
        bank_account_id: 'ba-1',
        coa_id: null,
      },
    ],
    bank_accounts: [{ id: 'ba-1', tenant_id: TENANT, coa_id: 'bank-coa-1' }],
    categorization_patterns: [] as Record<string, any>[],
  }
}

function post(body: unknown) {
  return POST(new Request('http://t/api/finance/bank-transactions/accept-suggestions', { method: 'POST', body: JSON.stringify(body) }))
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  postJournalEntry.mockClear()
})

describe('finance/accept-suggestions POST — double-post race', () => {
  it('two concurrent accept-suggestions runs post exactly one journal entry for the same row', async () => {
    const [r1, r2] = await Promise.all([post({ threshold: 0.8 }), post({ threshold: 0.8 })])
    const bodies = await Promise.all([r1.json(), r2.json()])

    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)
    // Across both runs, exactly one accepted the row and the other skipped it.
    const accepted = bodies.reduce((s, b) => s + b.accepted, 0)
    expect(accepted).toBe(1)

    expect(postJournalEntry).toHaveBeenCalledTimes(1)
    const txn = h.seed.bank_transactions.find((t) => t.id === 't-1')!
    expect(txn.status).toBe('posted')
    expect(txn.coa_id).toBe('coa-1')
  })

  it('solo run still accepts and posts normally (fix does not break the happy path)', async () => {
    const res = await post({ threshold: 0.8 })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true, accepted: 1, skipped: 0 })
    expect(postJournalEntry).toHaveBeenCalledTimes(1)
  })

  it('a second run after the first already posted skips the row, does not double-post', async () => {
    const first = await post({ threshold: 0.8 })
    expect((await first.json()).accepted).toBe(1)

    const second = await post({ threshold: 0.8 })
    // Row no longer status='pending', so the initial SELECT excludes it.
    expect(await second.json()).toMatchObject({ ok: true, accepted: 0 })
    expect(postJournalEntry).toHaveBeenCalledTimes(1)
  })
})

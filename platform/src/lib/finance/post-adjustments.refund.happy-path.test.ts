import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 happy-path lock — refund/credit ledger reversal (postRefundToLedger).
 *
 * Leader order (b): "refund issued -> ledger reversal -> tenant-scoped amounts
 * correct." This exercises the reversal MATH the route delegates to, with the
 * low-level ledger primitives (postJournalEntry / account resolution / dup
 * check) captured so we assert the exact double-entry that gets posted:
 *
 *   Refund reverses a sale →  DR 4000 Service Revenue   CR 1050 Undeposited
 *
 * Locks:
 *   - the reversal debits revenue (4000) and credits undeposited funds (1050),
 *   - the entry is balanced (Σ debits == Σ credits == refund amount),
 *   - the entry is stamped with the issuing tenant's id (tenant-scoped) and
 *     the Stripe refund id as source_id under source='refund',
 *   - two tenants refunding land in their OWN ledgers with their OWN amounts,
 *   - a re-delivered refund (same refund id) posts nothing — no double reversal,
 *   - a zero/negative amount is a no-op.
 *
 * Scope caveat (honest): account CODES are asserted (4000 debit / 1050 credit)
 * via a stubbed getAccountIdByCode; that the chart actually contains those codes
 * with those types is the ledger seed's concern, not this test's.
 */

const h = vi.hoisted(() => {
  const entries: Array<{
    tenant_id: string
    source: string
    source_id: string
    memo?: string
    lines: Array<{ coa_id: string; debit_cents?: number; credit_cents?: number; memo?: string }>
  }> = []
  let existing = false
  return {
    entries,
    setExisting: (v: boolean) => { existing = v },
    reset: () => { entries.length = 0; existing = false },
    ensureChartAccounts: vi.fn(async () => {}),
    // Map every code to a deterministic id we can assert against.
    getAccountIdByCode: vi.fn(async (_tenantId: string, code: string) => `acct-${code}`),
    journalEntryExists: vi.fn(async () => existing),
    postJournalEntry: vi.fn(async (opts: (typeof entries)[number]): Promise<string | null> => {
      entries.push(opts)
      return `entry-${entries.length}`
    }),
  }
})

vi.mock('@/lib/ledger', () => ({
  ensureChartAccounts: h.ensureChartAccounts,
  getAccountIdByCode: h.getAccountIdByCode,
  journalEntryExists: h.journalEntryExists,
  postJournalEntry: h.postJournalEntry,
}))

import { postRefundToLedger } from '@/lib/finance/post-adjustments'

function sum(lines: Array<{ debit_cents?: number; credit_cents?: number }>, side: 'debit_cents' | 'credit_cents'): number {
  return lines.reduce((acc, l) => acc + (l[side] ?? 0), 0)
}

beforeEach(() => {
  h.reset()
  h.postJournalEntry.mockClear()
  h.journalEntryExists.mockClear()
})

describe('postRefundToLedger — refund posts a balanced, tenant-scoped revenue reversal', () => {
  it('reverses the sale: DR 4000 revenue / CR 1050 undeposited, balanced, correct amount', async () => {
    const res = await postRefundToLedger({
      tenantId: 'tenant-A',
      sourceId: 're_1',
      amountCents: 5000,
      memo: 'Refund · booking abcd1234',
    })

    expect(res.posted).toBe(true)
    expect(res.entryId).toBe('entry-1')
    expect(h.entries).toHaveLength(1)

    const entry = h.entries[0]
    // Tenant-scoped + idempotency key wiring.
    expect(entry.tenant_id).toBe('tenant-A')
    expect(entry.source).toBe('refund')
    expect(entry.source_id).toBe('re_1')

    // Reversal direction: revenue (4000) debited, undeposited (1050) credited.
    const debit = entry.lines.find((l) => (l.debit_cents ?? 0) > 0)!
    const credit = entry.lines.find((l) => (l.credit_cents ?? 0) > 0)!
    expect(debit.coa_id).toBe('acct-4000')
    expect(debit.debit_cents).toBe(5000)
    expect(credit.coa_id).toBe('acct-1050')
    expect(credit.credit_cents).toBe(5000)

    // Balanced double-entry.
    expect(sum(entry.lines, 'debit_cents')).toBe(5000)
    expect(sum(entry.lines, 'credit_cents')).toBe(5000)
  })

  it('scopes each tenant\'s refund to its own ledger with its own amount', async () => {
    await postRefundToLedger({ tenantId: 'tenant-A', sourceId: 're_A', amountCents: 5000 })
    await postRefundToLedger({ tenantId: 'tenant-B', sourceId: 're_B', amountCents: 3000 })

    expect(h.entries).toHaveLength(2)
    const a = h.entries.find((e) => e.tenant_id === 'tenant-A')!
    const b = h.entries.find((e) => e.tenant_id === 'tenant-B')!
    expect(sum(a.lines, 'debit_cents')).toBe(5000)
    expect(sum(b.lines, 'debit_cents')).toBe(3000)
    // No bleed: A's entry never carries B's id and vice versa.
    expect(a.source_id).toBe('re_A')
    expect(b.source_id).toBe('re_B')
  })

  it('is idempotent — a re-delivered refund (same refund id) posts no second reversal', async () => {
    h.setExisting(true)
    const res = await postRefundToLedger({ tenantId: 'tenant-A', sourceId: 're_1', amountCents: 5000 })

    expect(res.posted).toBe(false)
    expect(res.reason).toBe('already_posted')
    expect(h.postJournalEntry).not.toHaveBeenCalled()
    expect(h.entries).toHaveLength(0)
  })

  it('is idempotent when postJournalEntry\'s own dedup claim loses a race the journalEntryExists() pre-check missed', async () => {
    // journalEntryExists() is a plain SELECT — a concurrent caller can commit
    // between that check and this one's insert. postJournalEntry now returns
    // null in exactly that case (its RPC's atomic dedup claim lost); this
    // must be treated as already-posted, not passed through as a real id.
    h.postJournalEntry.mockResolvedValueOnce(null)
    const res = await postRefundToLedger({ tenantId: 'tenant-A', sourceId: 're_race', amountCents: 5000 })

    expect(res.posted).toBe(false)
    expect(res.reason).toBe('already_posted')
    expect(res.entryId).toBeUndefined()
  })

  it('does not post a zero or negative refund', async () => {
    const zero = await postRefundToLedger({ tenantId: 'tenant-A', sourceId: 're_0', amountCents: 0 })
    const neg = await postRefundToLedger({ tenantId: 'tenant-A', sourceId: 're_neg', amountCents: -100 })

    expect(zero.posted).toBe(false)
    expect(zero.reason).toBe('zero_amount')
    expect(neg.posted).toBe(false)
    expect(neg.reason).toBe('zero_amount')
    expect(h.postJournalEntry).not.toHaveBeenCalled()
  })
})

describe('postRefundToLedger — tipped payment refunds split proportionally across 4000/4100', () => {
  it('a FULL refund of a tipped payment splits DR 4000 (service) + DR 4100 (tip) exactly reversing the original split', async () => {
    // Original sale: $150 payment = $100 service + $50 tip (postPaymentRevenue
    // would have posted CR 4000 $100 / CR 4100 $50). Refunding the full $150
    // must reverse both, not dump the whole $150 onto 4000.
    const res = await postRefundToLedger({
      tenantId: 'tenant-A',
      sourceId: 're_tip_full',
      amountCents: 15000,
      originalTotalCents: 15000,
      originalTipCents: 5000,
    })

    expect(res.posted).toBe(true)
    const entry = h.entries[0]

    const revenueLine = entry.lines.find((l) => l.coa_id === 'acct-4000')!
    const tipLine = entry.lines.find((l) => l.coa_id === 'acct-4100')!
    const undepositedLine = entry.lines.find((l) => l.coa_id === 'acct-1050')!

    expect(revenueLine.debit_cents).toBe(10000)
    expect(tipLine.debit_cents).toBe(5000)
    expect(undepositedLine.credit_cents).toBe(15000)

    // Balanced double-entry.
    expect(sum(entry.lines, 'debit_cents')).toBe(15000)
    expect(sum(entry.lines, 'credit_cents')).toBe(15000)
  })

  it('a PARTIAL refund of a tipped payment splits at the SAME service/tip ratio as the original sale', async () => {
    // Same $150 ($100 service + $50 tip, 1/3 tip ratio) but only $60 refunded
    // -> $40 service / $20 tip, not $60 straight off service.
    const res = await postRefundToLedger({
      tenantId: 'tenant-A',
      sourceId: 're_tip_partial',
      amountCents: 6000,
      originalTotalCents: 15000,
      originalTipCents: 5000,
    })

    expect(res.posted).toBe(true)
    const entry = h.entries[0]

    const revenueLine = entry.lines.find((l) => l.coa_id === 'acct-4000')!
    const tipLine = entry.lines.find((l) => l.coa_id === 'acct-4100')!
    const undepositedLine = entry.lines.find((l) => l.coa_id === 'acct-1050')!

    expect(revenueLine.debit_cents).toBe(4000)
    expect(tipLine.debit_cents).toBe(2000)
    expect(undepositedLine.credit_cents).toBe(6000)
    expect(sum(entry.lines, 'debit_cents')).toBe(6000)
  })

  it('a tip-free payment (originalTipCents omitted) still posts the pre-existing single-line 4000 reversal, no 4100 line at all', async () => {
    const res = await postRefundToLedger({
      tenantId: 'tenant-A',
      sourceId: 're_no_tip',
      amountCents: 5000,
      originalTotalCents: 5000,
    })

    expect(res.posted).toBe(true)
    const entry = h.entries[0]
    expect(entry.lines.find((l) => l.coa_id === 'acct-4100')).toBeUndefined()
    const revenueLine = entry.lines.find((l) => l.coa_id === 'acct-4000')!
    expect(revenueLine.debit_cents).toBe(5000)
    expect(sum(entry.lines, 'debit_cents')).toBe(5000)
  })

  it('a fully-tip refund (originalTipCents === originalTotalCents) posts the whole amount to 4100, no zero-amount 4000 line', async () => {
    const res = await postRefundToLedger({
      tenantId: 'tenant-A',
      sourceId: 're_all_tip',
      amountCents: 2000,
      originalTotalCents: 2000,
      originalTipCents: 2000,
    })

    expect(res.posted).toBe(true)
    const entry = h.entries[0]
    expect(entry.lines.find((l) => l.coa_id === 'acct-4000')).toBeUndefined()
    const tipLine = entry.lines.find((l) => l.coa_id === 'acct-4100')!
    expect(tipLine.debit_cents).toBe(2000)
    expect(sum(entry.lines, 'debit_cents')).toBe(2000)
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST /api/finance/bank-transactions/:id/match — first route-level
 * regression test (P1/W1 O13 sweep). Real money-write path (matches a bank
 * transaction to an invoice/booking/expense, inserting payments and
 * optionally posting a journal entry) with zero prior route-level coverage
 * (only the shared postgrest-injection sweep touched it, for the `.or()`
 * source-invariant check). `postJournalEntry` is mocked — its own balance
 * invariants have their own unit tests; this file verifies the ROUTE calls
 * it with the right lines and applies its result to the bank_txn row.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
  postJournalEntry: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  requirePermission: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  postJournalEntry: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const raw = makeTenantDbFake(h)
  const fake = {
    from(table: string) {
      const chain = raw.from(table) as Record<string, unknown>
      if (table !== 'chart_of_accounts') return chain
      chain.or = () => chain
      return chain
    },
  }
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: (...a: unknown[]) => h.requirePermission(...a),
}))
vi.mock('@/lib/ledger', () => ({ postJournalEntry: (...a: unknown[]) => h.postJournalEntry(...a) }))

import { POST } from './route'

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: h.tenantId }, error: null }))
  h.postJournalEntry.mockReset()
  h.postJournalEntry.mockResolvedValue('je-1')
  h.store = {
    bank_transactions: [
      { id: 'txn-inflow', tenant_id: 'tenant-A', txn_date: '2026-07-01', description: 'deposit', amount_cents: 15000, status: 'unmatched', bank_account_id: 'acct-1', bank_accounts: { coa_id: 'coa-bank' } },
      { id: 'txn-outflow', tenant_id: 'tenant-A', txn_date: '2026-07-02', description: 'withdrawal', amount_cents: -5000, status: 'unmatched', bank_account_id: 'acct-1', bank_accounts: { coa_id: 'coa-bank' } },
      { id: 'txn-already', tenant_id: 'tenant-A', txn_date: '2026-07-03', description: 'x', amount_cents: 1000, status: 'matched', bank_account_id: 'acct-1', bank_accounts: null },
      { id: 'txn-B1', tenant_id: 'tenant-B', txn_date: '2026-07-01', description: 'other tenant', amount_cents: 15000, status: 'unmatched', bank_account_id: 'acct-B', bank_accounts: null },
    ],
    invoices: [
      { id: 'inv-A1', tenant_id: 'tenant-A', total_cents: 15000, amount_paid_cents: 0, status: 'sent', client_id: 'client-A1', booking_id: 'book-A1' },
      { id: 'inv-B1', tenant_id: 'tenant-B', total_cents: 15000, amount_paid_cents: 0, status: 'sent', client_id: 'client-B1', booking_id: null },
    ],
    bookings: [
      { id: 'book-A1', tenant_id: 'tenant-A', client_id: 'client-A1', payment_status: 'unpaid' },
    ],
    expenses: [
      { id: 'exp-A1', tenant_id: 'tenant-A', category: 'utilities', amount: 5000, matched_bank_transaction_id: null },
    ],
    chart_of_accounts: [
      { id: 'coa-utilities', tenant_id: 'tenant-A', type: 'expense', subtype: 'utilities', name: 'Utilities Expense' },
    ],
    payments: [],
  }
})

describe('POST /match — permission gate + basic validation', () => {
  it('returns the permission error unchanged and never touches the DB', async () => {
    h.requirePermission.mockResolvedValueOnce({
      tenant: null,
      error: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
    })

    const res = await POST(postReq({ target_type: 'invoice', target_id: 'inv-A1' }), params('txn-inflow'))

    expect(res.status).toBe(403)
    expect(h.store.payments.length).toBe(0)
  })

  it('rejects a missing target_type/target_id with 400', async () => {
    const res = await POST(postReq({}), params('txn-inflow'))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'target_type + target_id required' })
  })

  it('returns 404 for a transaction id that does not exist', async () => {
    const res = await POST(postReq({ target_type: 'invoice', target_id: 'inv-A1' }), params('does-not-exist'))

    expect(res.status).toBe(404)
  })

  it("tenant A can never match tenant B's bank transaction", async () => {
    const res = await POST(postReq({ target_type: 'invoice', target_id: 'inv-A1' }), params('txn-B1'))

    expect(res.status).toBe(404)
    expect(h.store.payments.length).toBe(0)
  })

  it('rejects re-matching an already matched/posted transaction', async () => {
    const res = await POST(postReq({ target_type: 'invoice', target_id: 'inv-A1' }), params('txn-already'))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'Already matched' })
    expect(h.store.payments.length).toBe(0)
  })

  it('rejects an unknown target_type', async () => {
    const res = await POST(postReq({ target_type: 'bigfoot', target_id: 'x' }), params('txn-inflow'))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'Unknown target_type: bigfoot' })
  })
})

describe('POST /match — target_type=invoice', () => {
  it('rejects an outflow matching an invoice', async () => {
    const res = await POST(postReq({ target_type: 'invoice', target_id: 'inv-A1' }), params('txn-outflow'))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'Only inflows can match invoices' })
  })

  it('returns 404 when the invoice does not exist', async () => {
    const res = await POST(postReq({ target_type: 'invoice', target_id: 'does-not-exist' }), params('txn-inflow'))

    expect(res.status).toBe(404)
  })

  it("tenant A can never match its bank transaction to tenant B's invoice", async () => {
    const res = await POST(postReq({ target_type: 'invoice', target_id: 'inv-B1' }), params('txn-inflow'))

    expect(res.status).toBe(404)
    expect(h.store.payments.length).toBe(0)
  })

  it('inserts a payment stamped with the tenant_id and marks the bank_txn matched', async () => {
    const res = await POST(postReq({ target_type: 'invoice', target_id: 'inv-A1' }), params('txn-inflow'))

    expect(res.status).toBe(200)
    const payment = h.store.payments[0]
    expect(payment.tenant_id).toBe('tenant-A')
    expect(payment.invoice_id).toBe('inv-A1')
    expect(payment.booking_id).toBe('book-A1')
    expect(payment.client_id).toBe('client-A1')
    expect(payment.amount_cents).toBe(15000)
    expect(payment.method).toBe('bank_match')

    const txn = h.store.bank_transactions.find((t) => t.id === 'txn-inflow')!
    expect(txn.status).toBe('matched')
    expect(txn.matched_invoice_id).toBe('inv-A1')
  })
})

describe('POST /match — target_type=booking', () => {
  it('rejects an outflow matching a booking', async () => {
    const res = await POST(postReq({ target_type: 'booking', target_id: 'book-A1' }), params('txn-outflow'))

    expect(res.status).toBe(400)
  })

  it('returns 404 when the booking does not exist', async () => {
    const res = await POST(postReq({ target_type: 'booking', target_id: 'does-not-exist' }), params('txn-inflow'))

    expect(res.status).toBe(404)
  })

  it('inserts a payment and marks the booking paid, then marks the bank_txn matched', async () => {
    const res = await POST(postReq({ target_type: 'booking', target_id: 'book-A1' }), params('txn-inflow'))

    expect(res.status).toBe(200)
    const payment = h.store.payments[0]
    expect(payment.booking_id).toBe('book-A1')
    expect(payment.tenant_id).toBe('tenant-A')

    const booking = h.store.bookings.find((b) => b.id === 'book-A1')!
    expect(booking.payment_status).toBe('paid')
    expect(booking.payment_method).toBe('bank_match')

    const txn = h.store.bank_transactions.find((t) => t.id === 'txn-inflow')!
    expect(txn.status).toBe('matched')
    expect(txn.matched_booking_id).toBe('book-A1')
  })
})

describe('POST /match — target_type=expense', () => {
  it('rejects an inflow matching an expense', async () => {
    const res = await POST(postReq({ target_type: 'expense', target_id: 'exp-A1' }), params('txn-inflow'))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'Only outflows match expenses' })
  })

  it('returns 404 when the expense does not exist', async () => {
    const res = await POST(postReq({ target_type: 'expense', target_id: 'does-not-exist' }), params('txn-outflow'))

    expect(res.status).toBe(404)
  })

  it('links the expense and marks the bank_txn matched (no journal entry) when no CoA match is found', async () => {
    h.store.chart_of_accounts = []

    const res = await POST(postReq({ target_type: 'expense', target_id: 'exp-A1' }), params('txn-outflow'))

    expect(res.status).toBe(200)
    expect(h.store.expenses[0].matched_bank_transaction_id).toBe('txn-outflow')
    const txn = h.store.bank_transactions.find((t) => t.id === 'txn-outflow')!
    expect(txn.status).toBe('matched')
    expect(txn.matched_expense_id).toBe('exp-A1')
    expect(h.postJournalEntry).not.toHaveBeenCalled()
  })

  it('posts a balanced journal entry and marks the bank_txn posted when a CoA match is found', async () => {
    const res = await POST(postReq({ target_type: 'expense', target_id: 'exp-A1' }), params('txn-outflow'))

    expect(res.status).toBe(200)
    expect(h.postJournalEntry).toHaveBeenCalledTimes(1)
    const call = h.postJournalEntry.mock.calls[0][0] as { tenant_id: string; lines: Array<{ coa_id: string; debit_cents?: number; credit_cents?: number }> }
    expect(call.tenant_id).toBe('tenant-A')
    expect(call.lines).toEqual([
      { coa_id: 'coa-utilities', debit_cents: 5000 },
      { coa_id: 'coa-bank', credit_cents: 5000 },
    ])

    const txn = h.store.bank_transactions.find((t) => t.id === 'txn-outflow')!
    expect(txn.status).toBe('posted')
    expect(txn.coa_id).toBe('coa-utilities')
    expect(txn.journal_entry_id).toBe('je-1')
  })
})

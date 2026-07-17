/**
 * BANK-TXN MATCH RACE — POST /api/finance/bank-transactions/[id]/match
 * atomic claim.
 *
 * The route read the txn's status, then (for an inflow-vs-invoice match)
 * inserted a real `payments` row and only updated `bank_transactions.status`
 * to 'matched' at the very end, with no compare-and-swap on the status it
 * actually read. Two concurrent match requests on the same txn -- a
 * double-click, or two admins racing two different suggested targets --
 * would both pass the status check and each insert a real payment for one
 * bank inflow, double-recording money received. Fix: claim the 'matched'
 * transition with `.eq('status', 'pending')` BEFORE the payment insert /
 * journal post, mirroring the sibling categorize route's fix.
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

vi.mock('@/lib/ledger', async (orig) => {
  const actual = await orig<typeof import('@/lib/ledger')>()
  return {
    ...actual,
    postJournalEntry: vi.fn(async () => 'entry-1'),
  }
})

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function req(body: Row): Request {
  return new Request('http://x/api/finance/bank-transactions/txn-1/match', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

const params = () => Promise.resolve({ id: 'txn-1' })

function seedTxn(overrides: Partial<Row> = {}) {
  fake._seed('bank_transactions', [
    {
      id: 'txn-1',
      tenant_id: TENANT_ID,
      status: 'pending',
      txn_date: '2026-07-01',
      description: 'Client payment',
      amount_cents: 15000,
      bank_account_id: 'acct-1',
      bank_accounts: { coa_id: 'coa-bank' },
      ...overrides,
    } as Row,
  ])
}

beforeEach(() => {
  fake._store.clear()
  fake._seed('invoices', [
    { id: 'inv-1', tenant_id: TENANT_ID, total_cents: 15000, amount_paid_cents: 0, status: 'sent', client_id: 'client-1', booking_id: null } as Row,
    { id: 'inv-2', tenant_id: TENANT_ID, total_cents: 15000, amount_paid_cents: 0, status: 'sent', client_id: 'client-1', booking_id: null } as Row,
  ])
  fake._seed('bookings', [])
  fake._seed('expenses', [])
  fake._seed('payments', [])
})

describe('POST /api/finance/bank-transactions/[id]/match — double-match race', () => {
  it('two concurrent requests to match the SAME invoice insert exactly one payment', async () => {
    seedTxn()
    const [a, b] = await Promise.all([
      POST(req({ target_type: 'invoice', target_id: 'inv-1' }), { params: params() }),
      POST(req({ target_type: 'invoice', target_id: 'inv-1' }), { params: params() }),
    ])
    const [aJson, bJson] = await Promise.all([a.json(), b.json()])
    const winners = [a, b].filter((r) => r.status === 200)
    const losers = [a, b].filter((r) => r.status === 409)
    expect(winners.length).toBe(1)
    expect(losers.length).toBe(1)
    expect([aJson, bJson].some((j) => j.error === 'Already matched')).toBe(true)

    const payments = fake._store.get('payments') || []
    expect(payments.length).toBe(1)

    const txn = (fake._store.get('bank_transactions') || [])[0]
    expect(txn.status).toBe('matched')
    expect(txn.matched_invoice_id).toBe('inv-1')
  })

  it('two concurrent requests matching DIFFERENT invoices only let one win', async () => {
    seedTxn()
    const [a, b] = await Promise.all([
      POST(req({ target_type: 'invoice', target_id: 'inv-1' }), { params: params() }),
      POST(req({ target_type: 'invoice', target_id: 'inv-2' }), { params: params() }),
    ])
    const winners = [a, b].filter((r) => r.status === 200)
    expect(winners.length).toBe(1)

    const payments = fake._store.get('payments') || []
    expect(payments.length).toBe(1)
  })

  it('a sequential re-match after matching is rejected, not a second payment', async () => {
    seedTxn()
    const first = await POST(req({ target_type: 'invoice', target_id: 'inv-1' }), { params: params() })
    expect(first.status).toBe(200)

    const second = await POST(req({ target_type: 'invoice', target_id: 'inv-2' }), { params: params() })
    const secondJson = await second.json()
    expect(second.status).toBe(400)
    expect(secondJson.error).toBe('Already matched')

    const payments = fake._store.get('payments') || []
    expect(payments.length).toBe(1)
  })

  it('releases the claim back to pending if the target is not found', async () => {
    seedTxn()
    const res = await POST(req({ target_type: 'invoice', target_id: 'nonexistent' }), { params: params() })
    expect(res.status).toBe(404)

    const txn = (fake._store.get('bank_transactions') || [])[0]
    expect(txn.status).toBe('pending')
    expect(txn.matched_invoice_id).toBeNull()
  })
})

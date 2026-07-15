import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * 💰 TOCTOU / double-post — POST /api/finance/bank-transactions/[id]/match.
 *
 * The handler used to read bank_transactions.status, then several awaits
 * later (target lookup, payment insert) flip that status to 'matched'/
 * 'posted'. Two concurrent match requests for the SAME bank transaction both
 * passed the stale status check and both inserted a `payments` row — the
 * `trg_payments_recompute_invoice` DB trigger sums `payments` into
 * `invoices.amount_paid_cents`, so a double insert double-counts revenue and
 * can flip an invoice to "overpaid"/incorrectly-paid.
 *
 * Fix: an atomic conditional UPDATE (`status IN (pending,categorized)`) run
 * immediately before the payments insert. Postgres serializes writers on the
 * same row, so only one concurrent caller's claim can succeed; the loser is
 * turned away with 400 before ever touching `payments`.
 *
 * These tests exercise the real route handler via Promise.all — the same
 * technique used in ledger-concurrency.test.ts — against the in-memory
 * harness, which genuinely applies `.eq`/`.in` filters so a losing claim
 * really does match zero rows once the winner's update has landed.
 */

const TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: TENANT }, error: null })),
}))
vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {
    status = 401
  },
  getTenantForRequest: vi.fn(),
}))
vi.mock('@/lib/ledger', () => ({ postJournalEntry: vi.fn(async () => 'je-1') }))

import { POST } from './route'

function seed() {
  return {
    bank_transactions: [
      {
        id: 'txn-1',
        tenant_id: TENANT,
        txn_date: '2026-07-01',
        description: 'Client wire',
        amount_cents: 50000,
        status: 'pending',
        bank_account_id: 'ba-1',
      },
    ],
    invoices: [
      {
        id: 'inv-1',
        tenant_id: TENANT,
        total_cents: 50000,
        amount_paid_cents: 0,
        status: 'sent',
        client_id: 'client-1',
        booking_id: null,
      },
    ],
    payments: [] as Record<string, any>[],
  }
}

function post(id: string, body: unknown) {
  return POST(new Request(`http://t/api/finance/bank-transactions/${id}/match`, { method: 'POST', body: JSON.stringify(body) }), {
    params: Promise.resolve({ id }),
  })
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('finance/bank-transactions/[id]/match POST — double-post race', () => {
  it('two concurrent match requests for the same txn+invoice insert exactly one payment', async () => {
    const [r1, r2] = await Promise.all([
      post('txn-1', { target_type: 'invoice', target_id: 'inv-1' }),
      post('txn-1', { target_type: 'invoice', target_id: 'inv-1' }),
    ])
    const bodies = await Promise.all([r1.json(), r2.json()])
    const statuses = [r1.status, r2.status].sort()

    // Exactly one winner (200) and one loser (400 "Already matched").
    expect(statuses).toEqual([200, 400])
    const loser = bodies.find((b) => 'error' in b)
    expect(loser?.error).toMatch(/already matched/i)

    // The money-critical assertion: only ONE payments row exists, so the
    // invoice's amount_paid_cents trigger sums exactly one payment, not two.
    expect(h.seed.payments.length).toBe(1)
    expect(h.seed.payments[0].amount_cents).toBe(50000)

    // Bank txn lands in a single consistent terminal state.
    const txn = h.seed.bank_transactions.find((t) => t.id === 'txn-1')!
    expect(txn.status).toBe('matched')
    expect(txn.matched_invoice_id).toBe('inv-1')
  })

  it('solo request still matches normally (fix does not break the happy path)', async () => {
    const res = await post('txn-1', { target_type: 'invoice', target_id: 'inv-1' })
    expect(res.status).toBe(200)
    expect(h.seed.payments.length).toBe(1)
    expect(h.seed.bank_transactions[0].status).toBe('matched')
  })

  it('a second request after the first already matched is rejected, not double-posted', async () => {
    const first = await post('txn-1', { target_type: 'invoice', target_id: 'inv-1' })
    expect(first.status).toBe(200)

    const second = await post('txn-1', { target_type: 'invoice', target_id: 'inv-1' })
    expect(second.status).toBe(400)
    expect((await second.json()).error).toMatch(/already/i)
    expect(h.seed.payments.length).toBe(1)
  })

  it("wrong-tenant probe: a foreign tenant's bank txn is never reachable to match", async () => {
    h.seed.bank_transactions.push({
      id: 'txn-b',
      tenant_id: OTHER_TENANT,
      txn_date: '2026-07-01',
      description: 'Other tenant wire',
      amount_cents: 20000,
      status: 'pending',
      bank_account_id: 'ba-b',
    })
    const res = await post('txn-b', { target_type: 'invoice', target_id: 'inv-1' })
    // Acting as TENANT, the select is scoped `.eq('tenant_id', TENANT)`, so
    // tenant B's row is invisible — this must 404, never touch it.
    expect(res.status).toBe(404)
    expect(h.seed.payments.length).toBe(0)
    const foreignTxn = h.seed.bank_transactions.find((t) => t.id === 'txn-b')!
    expect(foreignTxn.status).toBe('pending')
  })
})

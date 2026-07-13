/**
 * BANK-TXN MATCH RACE — POST /api/finance/bank-transactions/[id]/match atomic claim.
 *
 * This route used to guard against double-matching a bank transaction with a
 * plain read of `txn.status` followed, many lines later, by an INSERT of a
 * `payments` row and a final `bank_transactions` status update (audit
 * finding, 2026-07-13): two concurrent match requests for the same
 * transaction — a double-click, or two operators racing to reconcile the
 * same import — could both read status 'pending' before either write
 * landed, and both insert a payment, double-crediting revenue and/or
 * double-marking a booking/invoice paid.
 *
 * The fix claims the bank_transactions row atomically (UPDATE ... WHERE
 * status NOT IN (matched, posted) ... RETURNING) before any payment/journal
 * side effect, and reverts the claim if the target (invoice/booking/expense)
 * turns out not to exist — a client-input error, not the race itself. This
 * suite proves: only one of two concurrent match requests creates a
 * payment, and a bad target_id doesn't leave the txn stuck claimed.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_ID, role: 'owner', tenant: {} }, error: null }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_ID = 'tenant-1'
const TXN_ID = 'txn-1'
const BOOKING_ID = 'booking-1'

function seed(overrides: Partial<Row> = {}) {
  fake._store.clear()
  fake._seed('bank_transactions', [
    {
      id: TXN_ID,
      tenant_id: TENANT_ID,
      txn_date: '2026-07-01',
      description: 'Client payment',
      amount_cents: 15_000,
      status: 'pending',
      bank_account_id: 'acct-1',
      bank_accounts: { coa_id: 'coa-bank' },
      ...overrides,
    },
  ])
  fake._seed('bookings', [{ id: BOOKING_ID, tenant_id: TENANT_ID, client_id: 'client-1' }])
}

function matchRequest(body: Record<string, unknown>) {
  return new Request(`http://x/api/finance/bank-transactions/${TXN_ID}/match`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  seed()
})

describe('POST /api/finance/bank-transactions/[id]/match — concurrent match race', () => {
  it('two concurrent match requests produce exactly one payment, not two', async () => {
    const body = { target_type: 'booking', target_id: BOOKING_ID }
    const results = await Promise.allSettled([
      POST(matchRequest(body), { params: Promise.resolve({ id: TXN_ID }) }),
      POST(matchRequest(body), { params: Promise.resolve({ id: TXN_ID }) }),
    ])

    expect(fake._all('payments').length).toBe(1)

    const bodies = await Promise.all(
      results
        .filter((r) => r.status === 'fulfilled')
        .map((r) => (r as PromiseFulfilledResult<Response>).value.json()),
    )
    const okCount = bodies.filter((b) => b.ok).length
    const alreadyMatchedCount = bodies.filter((b) => b.error === 'Already matched').length
    expect(okCount).toBe(1)
    expect(alreadyMatchedCount).toBe(1)

    const txnRow = fake._all('bank_transactions').find((t) => t.id === TXN_ID)
    expect(txnRow?.status).toBe('matched')
    expect(txnRow?.matched_booking_id).toBe(BOOKING_ID)
  })

  it('a bad target_id reverts the claim instead of leaving the txn stuck matched', async () => {
    const res = await POST(
      matchRequest({ target_type: 'booking', target_id: 'does-not-exist' }),
      { params: Promise.resolve({ id: TXN_ID }) },
    )
    expect(res.status).toBe(404)
    expect(fake._all('payments').length).toBe(0)

    const txnRow = fake._all('bank_transactions').find((t) => t.id === TXN_ID)
    expect(txnRow?.status).toBe('pending')

    // A follow-up match with the real target now succeeds — proving the txn
    // wasn't left permanently stuck 'matched' by the failed attempt.
    const res2 = await POST(
      matchRequest({ target_type: 'booking', target_id: BOOKING_ID }),
      { params: Promise.resolve({ id: TXN_ID }) },
    )
    expect(res2.status).toBe(200)
    expect(fake._all('payments').length).toBe(1)
  })
})

/**
 * POST /api/admin/payments/confirm-match — duplicate payment row race.
 *
 * The route inserted a payments row with ZERO idempotency check (worse than
 * the already-fixed finance/mark-paid race, which at least attempted a
 * check-then-insert): a double-tapped "Confirm Match" button, or two staff
 * members independently matching the same Zelle/Venmo notification, both
 * pass the `unmatched.status === 'matched'` read-check before either write
 * commits, landing two payments rows for one unmatched payment. That doubles
 * the reported revenue in finance/summary and flips the booking to 'paid'
 * (or posts a duplicate tip SMS) off half the real money.
 *
 * FIX: give the insert a deterministic reference_id
 * (`confirm-match-${unmatchedPaymentId}`) so it's backed by migration
 * 065_unique_payments_reference.sql's existing partial unique index on
 * payments(tenant_id, booking_id, reference_id); the route now catches 23505
 * as an idempotent no-op instead of landing a second row. The shared
 * ledger-supabase-fake already simulates that same 23505 for a genuine
 * duplicate insert on `payments`, so this test drives the REAL route handler
 * rather than mocking the error at the call site.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'

const TENANT_ID = 'tenant-cm'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h), supabase: makeLedgerSupabaseFake(h) }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_ID }, error: null }),
}))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(() => Promise.resolve()) }))

import { POST } from './route'

function confirmMatchReq(unmatchedPaymentId: string, bookingId: string) {
  return POST(new Request('http://t', { method: 'POST', body: JSON.stringify({ unmatchedPaymentId, bookingId }) }))
}

beforeEach(() => {
  h.seq = 0
  h.store = {
    unmatched_payments: [
      { id: 'unm-1', tenant_id: TENANT_ID, method: 'zelle', amount_cents: 15000, sender_name: 'Alice', status: 'pending' },
    ],
    bookings: [
      { id: 'bk1', tenant_id: TENANT_ID, client_id: 'client-1', team_member_id: null, hourly_rate: 79, actual_hours: null, price: 15000 },
    ],
    tenants: [{ id: TENANT_ID, name: 'Tenant CM', telnyx_api_key: null, telnyx_phone: null }],
    payments: [],
    notifications: [],
  }
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('concurrent "Confirm Match" for the same unmatched payment', () => {
  it('lands exactly one payments row, not two', async () => {
    const [first, second] = await Promise.all([
      confirmMatchReq('unm-1', 'bk1'),
      confirmMatchReq('unm-1', 'bk1'),
    ])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(h.store.payments).toHaveLength(1)
    expect(h.store.payments[0].reference_id).toBe('confirm-match-unm-1')

    const firstBody = await first.json()
    const secondBody = await second.json()
    // One of the two responses is the real write, the other the deduped no-op.
    const deduped = [firstBody, secondBody].filter((b) => b.deduped)
    expect(deduped).toHaveLength(1)
  })

  it('a normal single call still records the payment (no regression on the non-race path)', async () => {
    const res = await confirmMatchReq('unm-1', 'bk1')
    expect(res.status).toBe(200)
    expect(h.store.payments).toHaveLength(1)
    expect(h.store.payments[0].amount_cents).toBe(15000)
    expect(h.store.payments[0].reference_id).toBe('confirm-match-unm-1')
  })
})

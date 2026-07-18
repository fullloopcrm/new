import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/admin/payments/finalize-match — internal-key trust boundary
 * idempotency coverage.
 *
 * This route is a distinct trust boundary from every other processPayment()
 * caller: it's gated by a single internal API key that's global across ALL
 * tenants (not per-tenant auth), used by automated reconciliation tools, and
 * a natural redelivery source (timeouts/retries on that side). The
 * referenceId-based dedup in processPayment() (partial unique index on
 * (tenant_id, booking_id, reference_id), catching the resulting 23505 as an
 * idempotent no-op — see payment-processor.duplicate-reference.test.ts) was
 * only ever exercised by calling processPayment() directly in unit tests.
 * Nothing exercised the actual HTTP entry point: the internal-key gate, the
 * booking->tenant resolution, and the hand-off into processPayment() wired
 * together. This file closes that gap end-to-end (real POST handler, mocked
 * DB only), and separately proves the auth gate itself fails closed.
 */

const TENANT_ID = 'tenant-1'
const BOOKING_ID = 'booking-1'

type Row = Record<string, unknown>
let bookingRow: Row
const existingPaymentKeys = new Set<string>()
const paymentInserts: Row[] = []

vi.mock('stripe', () => ({
  default: class MockStripe {
    transfers = { create: async () => ({ id: 'tr_1' }) }
    payouts = { create: async () => ({ id: 'po_1' }) }
  },
}))

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    let didUpdate = false
    let updatePayload: Row = {}
    let insertPayload: Row | null = null
    const eqs: Row = {}
    const c: Record<string, unknown> = {
      select: () => c,
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      update: (p: Row) => { didUpdate = true; updatePayload = p; return c },
      insert: (p: Row) => { insertPayload = p; return c },
      single: async () => {
        if (table === 'bookings') {
          const matches = bookingRow.id === eqs.id && (eqs.tenant_id === undefined || bookingRow.tenant_id === eqs.tenant_id)
          return { data: matches ? { ...bookingRow } : null, error: null }
        }
        if (table === 'payments' && insertPayload) {
          const key = `${insertPayload.tenant_id}:${insertPayload.booking_id}:${insertPayload.reference_id}`
          if (existingPaymentKeys.has(key)) {
            return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } }
          }
          existingPaymentKeys.add(key)
          paymentInserts.push({ ...insertPayload })
          return { data: { id: `payment-${paymentInserts.length}` }, error: null }
        }
        if (table === 'tenants') {
          return { data: { id: bookingRow.tenant_id, name: 'T', stripe_api_key: null, telnyx_api_key: null, telnyx_phone: null }, error: null }
        }
        if (table === 'clients') return { data: { phone: null }, error: null }
        return { data: null, error: null }
      },
      then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
        if (table === 'payments') {
          return resolve({ data: paymentInserts.map((p) => ({ amount_cents: p.amount_cents })), error: null })
        }
        if (didUpdate && table === 'bookings') {
          bookingRow = { ...bookingRow, ...updatePayload }
          return resolve({ data: [{ id: bookingRow.id }], error: null })
        }
        return resolve({ data: [], error: null })
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({})) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (v: string) => v }))
vi.mock('@/lib/finance/post-revenue', () => ({ postPaymentRevenue: vi.fn(async () => {}) }))
vi.mock('@/lib/finance/post-labor', () => ({ postPayoutToLedger: vi.fn(async () => {}) }))

import { NextRequest } from 'next/server'
import { POST } from './route'

function req(body: Row, headers: Record<string, string> = { 'x-internal-key': 'test-key-123' }): NextRequest {
  return new NextRequest('http://localhost/api/admin/payments/finalize-match', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  process.env.INTERNAL_API_KEY = 'test-key-123'
  delete process.env.ELCHAPO_MONITOR_KEY
  process.env.STRIPE_SECRET_KEY = 'sk_test_mock'
  existingPaymentKeys.clear()
  paymentInserts.length = 0
  bookingRow = {
    id: BOOKING_ID,
    tenant_id: TENANT_ID,
    team_member_id: null,
    client_id: 'client-owned-by-tenant',
    team_member_pay: null,
    actual_hours: 2,
    hourly_rate: 69,
    pay_rate: 25,
    price: null,
    check_in_time: null,
    start_time: '2026-08-14T18:00:00Z',
    clients: { name: 'Client', phone: null, address: null },
    team_members: null,
  }
})

describe('POST /api/admin/payments/finalize-match — auth gate', () => {
  it('rejects a request with no x-internal-key header', async () => {
    const res = await POST(req({ bookingId: BOOKING_ID, clientId: 'x', method: 'zelle', amountCents: 5000, referenceId: 'ref-1' }, {}))
    expect(res.status).toBe(401)
    expect(paymentInserts).toHaveLength(0)
  })

  it('rejects a request with the wrong x-internal-key', async () => {
    const res = await POST(req({ bookingId: BOOKING_ID, clientId: 'x', method: 'zelle', amountCents: 5000, referenceId: 'ref-1' }, { 'x-internal-key': 'wrong' }))
    expect(res.status).toBe(401)
    expect(paymentInserts).toHaveLength(0)
  })
})

describe('POST /api/admin/payments/finalize-match — referenceId idempotency end-to-end', () => {
  it('a single valid call records exactly one payment', async () => {
    const res = await POST(req({ bookingId: BOOKING_ID, clientId: 'x', method: 'zelle', amountCents: 13_800, referenceId: 'zelle-ref-A' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(paymentInserts).toHaveLength(1)
  })

  it('two concurrent finalize-match POSTs through the real HTTP route with the SAME referenceId do not double-record', async () => {
    const call = () => POST(req({ bookingId: BOOKING_ID, clientId: 'x', method: 'zelle', amountCents: 13_800, referenceId: 'redelivered-ref' }))
    const [a, b] = await Promise.all([call(), call()])
    expect(a.status).toBe(200)
    expect(b.status).toBe(200)
    // Both resolve 200 (finalize-match's contract is redelivery-safe, not a
    // claim/loser-409 pattern) but only ONE payment is ever recorded.
    expect(paymentInserts).toHaveLength(1)
  })

  it('a sequential redelivered call (retry after timeout) is a no-op, not a second payment', async () => {
    const first = await POST(req({ bookingId: BOOKING_ID, clientId: 'x', method: 'zelle', amountCents: 13_800, referenceId: 'retry-ref' }))
    expect(first.status).toBe(200)
    const retry = await POST(req({ bookingId: BOOKING_ID, clientId: 'x', method: 'zelle', amountCents: 13_800, referenceId: 'retry-ref' }))
    expect(retry.status).toBe(200)
    expect(paymentInserts).toHaveLength(1)
  })

  it('booking not found returns 404 without inserting a payment', async () => {
    const res = await POST(req({ bookingId: 'missing-booking', clientId: 'x', method: 'zelle', amountCents: 5000, referenceId: 'ref-x' }))
    expect(res.status).toBe(404)
    expect(paymentInserts).toHaveLength(0)
  })

  it('missing required fields returns 400', async () => {
    const res = await POST(req({ bookingId: BOOKING_ID, method: 'zelle', amountCents: 5000 }))
    expect(res.status).toBe(400)
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * admin/payments/finalize-match POST — internal-key auth + tenant isolation.
 *
 * BUG (fixed here): `clientId` is caller-supplied by an external reconciliation
 * tool and was passed straight into payments.client_id with zero ownership
 * check — only `bookingId` resolved the tenant. A caller holding the internal
 * key (or exploiting the pre-fix naive `!==` key comparison) could attach a
 * FOREIGN tenant's client_id to a payment on this tenant's booking, the same
 * P1-pattern FK-injection class already fixed on POST /api/invoices, POST
 * /api/deals, etc.
 *
 * FIX: verify clientId belongs to the booking's own tenant before calling
 * processPayment(). Also swapped the naive `!==` key comparison for safeEqual
 * (same timing-attack class as CRON_SECRET, fixed de510a4e).
 */

const A = 'tid-a'
const B = 'tid-b'
const KEY = 'super-secret-internal-key'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const processPaymentMock = vi.hoisted(() => vi.fn(async () => ({
  status: 'paid' as const,
  totalReceivedCents: 10000,
  expectedCents: 10000,
  tipCents: 0,
  cleanerPaidCents: 0,
})))
vi.mock('@/lib/payment-processor', () => ({ processPayment: processPaymentMock }))

import { POST } from './route'

function seed() {
  return {
    bookings: [
      { id: 'bk-a1', tenant_id: A, client_id: 'cl-a1' },
    ],
    clients: [
      { id: 'cl-a1', tenant_id: A, name: 'Alice' },
      { id: 'cl-b1', tenant_id: B, name: 'Bob (foreign tenant)' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  processPaymentMock.mockClear()
  process.env.INTERNAL_API_KEY = KEY
})

function req(body: Record<string, unknown>, headers: Record<string, string> = { 'x-internal-key': KEY }) {
  return new Request('http://t', { method: 'POST', body: JSON.stringify(body), headers }) as unknown as import('next/server').NextRequest
}

describe('admin/payments/finalize-match — auth + tenant isolation', () => {
  it('rejects a missing/wrong internal key without calling processPayment', async () => {
    const res = await POST(req(
      { bookingId: 'bk-a1', clientId: 'cl-a1', method: 'zelle', amountCents: 10000, referenceId: 'r1' },
      { 'x-internal-key': 'wrong-key' },
    ))
    expect(res.status).toBe(401)
    expect(processPaymentMock).not.toHaveBeenCalled()
  })

  it('finalizes a match when clientId belongs to the booking\'s own tenant', async () => {
    const res = await POST(req({ bookingId: 'bk-a1', clientId: 'cl-a1', method: 'zelle', amountCents: 10000, referenceId: 'r1' }))
    expect(res.status).toBe(200)
    expect(processPaymentMock).toHaveBeenCalledWith(expect.objectContaining({ clientId: 'cl-a1', bookingId: 'bk-a1' }))
  })

  it("WRONG-TENANT PROBE: foreign clientId is rejected before processPayment runs", async () => {
    const res = await POST(req({ bookingId: 'bk-a1', clientId: 'cl-b1', method: 'zelle', amountCents: 10000, referenceId: 'r1' }))
    expect(res.status).toBe(404)
    expect(processPaymentMock).not.toHaveBeenCalled()
  })
})

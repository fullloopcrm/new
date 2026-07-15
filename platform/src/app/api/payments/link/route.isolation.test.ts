import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — POST /api/payments/link (converted to tenantDb).
 *
 * 💰 Creates a Stripe payment link for a booking's balance and writes the link
 * URL back onto the booking. The booking is read + updated through tenantDb, so
 * `.eq('tenant_id', ctx)` is injected. Requesting a link for ANOTHER tenant's
 * booking id must 404 BEFORE any Stripe link is minted or any row is written —
 * otherwise a caller could generate a payable link against a foreign booking.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn(async () => ({ tenantId: A, role: 'owner' })),
  AuthError: class AuthError extends Error { status = 401 },
}))

const createPaymentLink = vi.fn(async () => ({ url: 'https://pay/link-x' }))
vi.mock('@/lib/stripe', () => ({ createPaymentLink: (...a: unknown[]) => createPaymentLink(...(a as [])) }))

import { POST } from './route'

function seed() {
  return {
    bookings: [
      { id: 'bk-a', tenant_id: A, price: 10000, service_type: 'Clean', payment_link: null },
      { id: 'bk-b', tenant_id: B, price: 9000, service_type: 'Clean', payment_link: null },
    ],
    tenants: [{ id: A, stripe_api_key: 'sk_live_a' }],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  createPaymentLink.mockClear()
})

function post(body: unknown) {
  return POST(new Request('http://t/api/payments/link', { method: 'POST', body: JSON.stringify(body) }))
}

describe('payments/link POST — tenant isolation', () => {
  it('positive control: tenant A mints a link for its OWN booking and saves it', async () => {
    const res = await post({ booking_id: 'bk-a' })
    expect(res.status).toBe(200)
    expect((await res.json()).url).toBe('https://pay/link-x')
    expect(createPaymentLink).toHaveBeenCalledTimes(1)
    expect(h.seed.bookings.find((b) => b.id === 'bk-a')!.payment_link).toBe('https://pay/link-x')
  })

  it("wrong-tenant probe: link for tenant B's booking 404s — no Stripe call, no write", async () => {
    const res = await post({ booking_id: 'bk-b' })
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Booking not found')
    expect(createPaymentLink).not.toHaveBeenCalled()
    expect(h.seed.bookings.find((b) => b.id === 'bk-b')!.payment_link).toBeNull()
    expect(h.capture.updates).toHaveLength(0)
  })
})

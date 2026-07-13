import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of POST
 * /api/payments/checkout. The booking read used to carry a manual
 * .eq('tenant_id', tenant.tenantId) filter. Proves a caller can never create
 * a Stripe checkout session against a foreign tenant's booking sharing the
 * same booking id -- a real money-path IDOR (would leak the foreign
 * tenant's price + client email into the caller's checkout flow).
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-00000000000b'
const BOOKING_ID = 'shared-booking-id'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
const { createCheckoutSession } = vi.hoisted(() => ({
  createCheckoutSession: vi.fn(async (_args: { tenantId: string; bookingId: string; amount: number; customerEmail?: string; serviceName: string }) => ({ url: 'https://stripe/session', id: 'sess-1' })),
}))

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    single: async () => ({ data: matched()[0] ?? null, error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/stripe', () => ({ createCheckoutSession }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: 'aaaaaaaa-0000-0000-0000-00000000000a' }),
  AuthError: class AuthError extends Error {},
}))

import { NextRequest } from 'next/server'
import { POST } from './route'

beforeEach(() => {
  createCheckoutSession.mockClear()
  DB.bookings = [
    { id: BOOKING_ID, tenant_id: TENANT_B, price: 5000, service_type: 'Deep Clean', clients: { email: 'foreign@b.com' } },
  ]
  DB.tenants = [
    { id: TENANT_A, stripe_api_key: 'sk_test_a' },
    { id: TENANT_B, stripe_api_key: 'sk_test_b' },
  ]
})

describe('POST /api/payments/checkout — tenantDb scoping', () => {
  it('404s and never calls Stripe when the booking id belongs to a foreign tenant', async () => {
    const req = new NextRequest('https://x/api/payments/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ booking_id: BOOKING_ID }),
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })

  it('creates a checkout session using only the caller tenant\'s own booking when both tenants share the booking id', async () => {
    DB.bookings.push({ id: BOOKING_ID, tenant_id: TENANT_A, price: 8000, service_type: 'Standard Clean', clients: { email: 'own@a.com' } })
    const req = new NextRequest('https://x/api/payments/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ booking_id: BOOKING_ID }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(createCheckoutSession).toHaveBeenCalledTimes(1)
    const call = createCheckoutSession.mock.calls[0][0]
    expect(call.amount).toBe(8000)
    expect(call.customerEmail).toBe('own@a.com')
    expect(call.tenantId).toBe(TENANT_A)
  })
})

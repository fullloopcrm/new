import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of POST /api/payments/link.
 * Both the booking read and the payment_link update used to carry a manual
 * .eq('tenant_id', tenant.tenantId) filter. Proves a caller can never create
 * or attach a payment link to a foreign tenant's booking sharing the same
 * booking id -- a real money-path IDOR (would leak the foreign tenant's
 * price into the link, and could overwrite their booking's payment_link).
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-00000000000b'
const BOOKING_ID = 'shared-booking-id'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
const { createPaymentLink } = vi.hoisted(() => ({
  createPaymentLink: vi.fn(async () => ({ url: 'https://stripe/link' })),
}))

function updateChain(rows: Row[], values: Row) {
  const filters: Array<(r: Row) => boolean> = []
  const uc: Record<string, unknown> = {
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return uc },
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => {
      rows.filter((r) => filters.every((f) => f(r))).forEach((r) => Object.assign(r, values))
      resolve({ data: null, error: null })
    },
  }
  return uc
}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    single: async () => ({ data: matched()[0] ?? null, error: null }),
    update: (values: Row) => updateChain(rowsOf(), values),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/stripe', () => ({ createPaymentLink }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: 'admin', tenant: {} }),
  AuthError: class AuthError extends Error {},
}))

import { NextRequest } from 'next/server'
import { POST } from './route'

beforeEach(() => {
  createPaymentLink.mockClear()
  DB.bookings = [
    { id: BOOKING_ID, tenant_id: TENANT_B, price: 5000, service_type: 'Deep Clean', payment_link: null },
  ]
  DB.tenants = [{ id: TENANT_A, stripe_api_key: 'sk_test_a' }]
})

describe('POST /api/payments/link — tenantDb scoping', () => {
  it('404s and never calls Stripe when the booking id belongs to a foreign tenant', async () => {
    const req = new NextRequest('https://x/api/payments/link', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ booking_id: BOOKING_ID }),
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
    expect(createPaymentLink).not.toHaveBeenCalled()
  })

  it('creates + attaches the link to only the caller tenant\'s own booking when both tenants share the booking id', async () => {
    DB.bookings.push({ id: BOOKING_ID, tenant_id: TENANT_A, price: 8000, service_type: 'Standard Clean', payment_link: null })
    const req = new NextRequest('https://x/api/payments/link', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ booking_id: BOOKING_ID }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(createPaymentLink).toHaveBeenCalledTimes(1)

    const bookingA = DB.bookings.find((r) => r.tenant_id === TENANT_A)!
    const bookingB = DB.bookings.find((r) => r.tenant_id === TENANT_B)!
    expect(bookingA.payment_link).toBe('https://stripe/link')
    expect(bookingB.payment_link).toBeNull()
  })
})

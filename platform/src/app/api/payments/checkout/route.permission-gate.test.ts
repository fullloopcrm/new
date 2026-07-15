import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/payments/checkout previously called getTenantForRequest() with no
 * requirePermission check at all -- any authenticated tenant member (incl.
 * 'staff', the default role, which lacks bookings.edit and every finance.*
 * permission) could generate a real Stripe Checkout session against any
 * booking using the tenant's own live Stripe key. The sibling PUT
 * /api/bookings/[id] already gates all booking mutations on 'bookings.edit';
 * this route bypassed that gate entirely. Now gated to match.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const BOOKING_ID = 'booking-1'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
const { createCheckoutSession } = vi.hoisted(() => ({
  createCheckoutSession: vi.fn(async () => ({ url: 'https://stripe/session', id: 'sess-1' })),
}))
const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

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
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: currentRole.value, tenant: {} }),
  AuthError: class AuthError extends Error {},
}))

import { NextRequest } from 'next/server'
import { POST } from './route'

beforeEach(() => {
  createCheckoutSession.mockClear()
  currentRole.value = 'staff'
  DB.bookings = [{ id: BOOKING_ID, tenant_id: TENANT_A, price: 8000, service_type: 'Standard Clean', clients: { email: 'own@a.com' } }]
  DB.tenants = [{ id: TENANT_A, stripe_api_key: 'sk_test_a' }]
})

function req() {
  return new NextRequest('https://x/api/payments/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ booking_id: BOOKING_ID }),
  })
}

describe('POST /api/payments/checkout — permission gate', () => {
  it('403s a staff member (default role, no bookings.edit) and never calls Stripe', async () => {
    currentRole.value = 'staff'
    const res = await POST(req())
    expect(res.status).toBe(403)
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })

  it('allows an admin (has bookings.edit) to create the checkout session', async () => {
    currentRole.value = 'admin'
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(createCheckoutSession).toHaveBeenCalledTimes(1)
  })
})

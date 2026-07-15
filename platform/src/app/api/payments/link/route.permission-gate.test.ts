import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/payments/link previously called getTenantForRequest() with no
 * requirePermission check at all -- any authenticated tenant member (incl.
 * 'staff', the default role, which lacks bookings.edit and every finance.*
 * permission) could mint a real Stripe payment link against any booking
 * using the tenant's own live Stripe key, and overwrite that booking's
 * payment_link. Now gated on 'bookings.edit', matching the sibling PUT
 * /api/bookings/[id].
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const BOOKING_ID = 'booking-1'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
const { createPaymentLink } = vi.hoisted(() => ({
  createPaymentLink: vi.fn(async () => ({ url: 'https://stripe/link' })),
}))
const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

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
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: currentRole.value, tenant: {} }),
  AuthError: class AuthError extends Error {},
}))

import { NextRequest } from 'next/server'
import { POST } from './route'

beforeEach(() => {
  createPaymentLink.mockClear()
  currentRole.value = 'staff'
  DB.bookings = [{ id: BOOKING_ID, tenant_id: TENANT_A, price: 8000, service_type: 'Standard Clean', payment_link: null }]
  DB.tenants = [{ id: TENANT_A, stripe_api_key: 'sk_test_a' }]
})

function req() {
  return new NextRequest('https://x/api/payments/link', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ booking_id: BOOKING_ID }),
  })
}

describe('POST /api/payments/link — permission gate', () => {
  it('403s a staff member (default role, no bookings.edit) and never calls Stripe', async () => {
    currentRole.value = 'staff'
    const res = await POST(req())
    expect(res.status).toBe(403)
    expect(createPaymentLink).not.toHaveBeenCalled()
  })

  it('allows an admin (has bookings.edit) to mint the link', async () => {
    currentRole.value = 'admin'
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(createPaymentLink).toHaveBeenCalledTimes(1)
  })
})

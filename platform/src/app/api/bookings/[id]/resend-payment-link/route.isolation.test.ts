import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation + permission gate — POST /api/bookings/:id/resend-payment-link.
 *
 * Mirrors payments/link's own tenant-isolation shape (booking read through
 * tenantDb, so a foreign-tenant booking id 404s before any Stripe/SMS call),
 * plus proves a caller lacking bookings.edit is forbidden and never texts
 * the client or mutates the booking.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

let permissionError: unknown = null
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: A, role: 'owner' }),
  AuthError: class AuthError extends Error { status = 401 },
}))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => (
    permissionError
      ? { tenant: null, error: permissionError }
      : { tenant: { tenantId: A }, error: null }
  ),
}))

const createPaymentLink = vi.fn(async () => ({ url: 'https://pay/fresh-link' }))
vi.mock('@/lib/stripe', () => ({ createPaymentLink: (...a: unknown[]) => createPaymentLink(...(a as [])) }))

const sendClientSMS = vi.fn(async () => ({ sent: 1, skipped: 0 }))
vi.mock('@/lib/nycmaid/client-contacts', () => ({ sendClientSMS: (...a: unknown[]) => sendClientSMS(...(a as [])) }))

const smsAdmins = vi.fn(async () => {})
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: (...a: unknown[]) => smsAdmins(...(a as [])) }))

import { POST } from './route'

function seed() {
  return {
    bookings: [
      { id: 'bk-a', tenant_id: A, price: 10000, service_type: 'Clean', payment_link: null, client_id: 'cl-a', clients: { name: 'Alice', phone: '+15551110000' } },
      { id: 'bk-a-existing', tenant_id: A, price: 5000, service_type: 'Clean', payment_link: 'https://pay/existing-link', client_id: 'cl-a', clients: { name: 'Alice', phone: '+15551110000' } },
      { id: 'bk-b', tenant_id: B, price: 9000, service_type: 'Clean', payment_link: null, client_id: 'cl-b', clients: { name: 'Bob', phone: '+15552220000' } },
    ],
    tenants: [{ id: A, name: 'Test Co', stripe_api_key: 'sk_live_a', telnyx_api_key: 'key-a', telnyx_phone: '+15550000001' }],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  permissionError = null
  createPaymentLink.mockClear()
  sendClientSMS.mockClear()
  smsAdmins.mockClear()
})

function post(id: string) {
  return POST(new Request('http://t', { method: 'POST' }), { params: Promise.resolve({ id }) })
}

describe('resend-payment-link POST — tenant isolation + permission gate', () => {
  it('mints a fresh link when none exists yet, saves it, and texts the client', async () => {
    const res = await post('bk-a')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.url).toBe('https://pay/fresh-link')
    expect(json.sent).toBe(true)
    expect(createPaymentLink).toHaveBeenCalledTimes(1)
    expect(sendClientSMS).toHaveBeenCalledTimes(1)
    expect(h.seed.bookings.find((b) => b.id === 'bk-a')!.payment_link).toBe('https://pay/fresh-link')
  })

  it('reuses an existing payment link instead of minting a new one', async () => {
    const res = await post('bk-a-existing')
    const json = await res.json()
    expect(json.url).toBe('https://pay/existing-link')
    expect(createPaymentLink).not.toHaveBeenCalled()
    expect(sendClientSMS).toHaveBeenCalledTimes(1)
  })

  it("wrong-tenant probe: tenant B's booking 404s — no Stripe/SMS call, no write", async () => {
    const res = await post('bk-b')
    expect(res.status).toBe(404)
    expect(createPaymentLink).not.toHaveBeenCalled()
    expect(sendClientSMS).not.toHaveBeenCalled()
    expect(h.seed.bookings.find((b) => b.id === 'bk-b')!.payment_link).toBeNull()
  })

  it('a role lacking bookings.edit is forbidden and never mints a link or texts the client', async () => {
    const { NextResponse } = await import('next/server')
    permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
    const res = await post('bk-a')
    expect(res.status).toBe(403)
    expect(createPaymentLink).not.toHaveBeenCalled()
    expect(sendClientSMS).not.toHaveBeenCalled()
  })
})

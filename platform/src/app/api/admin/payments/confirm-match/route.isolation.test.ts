import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/admin/payments/confirm-match — tenantDb() conversion wrong-tenant
 * probe (P1/W1 backlog batch). Every lookup/insert/update previously carried
 * its own manual `.eq('tenant_id', tenantId)` (and manually threaded
 * `tenant_id:` fields on insert); those now come solely from the wrapper —
 * this proves a crafted unmatchedPaymentId or bookingId belonging to another
 * tenant can never be matched, and that a legitimate same-tenant match never
 * touches the other tenant's booking or payout state.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle & { tenantId: string }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: h.tenantId }),
  AuthError: class AuthError extends Error { status = 401 },
}))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => {} }))

import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    unmatched_payments: [
      { id: 'unm-A1', tenant_id: 'tenant-A', method: 'zelle', amount_cents: 15800, sender_name: 'Alice', status: 'unmatched' },
      { id: 'unm-B1', tenant_id: 'tenant-B', method: 'zelle', amount_cents: 15800, sender_name: 'Bob', status: 'unmatched' },
    ],
    bookings: [
      { id: 'book-A1', tenant_id: 'tenant-A', client_id: 'client-A1', team_member_id: null, hourly_rate: 79, actual_hours: 2, price: null, payment_status: 'unpaid' },
      { id: 'book-B1', tenant_id: 'tenant-B', client_id: 'client-B1', team_member_id: null, hourly_rate: 79, actual_hours: 2, price: null, payment_status: 'unpaid' },
    ],
    tenants: [
      { id: 'tenant-A', name: 'Tenant A', telnyx_api_key: null, telnyx_phone: null },
      { id: 'tenant-B', name: 'Tenant B', telnyx_api_key: null, telnyx_phone: null },
    ],
    payments: [],
    notifications: [],
  }
})

describe('POST /api/admin/payments/confirm-match — tenant isolation', () => {
  it("tenant A can never match tenant B's unmatched payment", async () => {
    const res = await POST(postReq({ unmatchedPaymentId: 'unm-B1', bookingId: 'book-A1' }))
    expect(res.status).toBe(404)

    const unmB = h.store.unmatched_payments.find((u) => u.id === 'unm-B1')
    expect(unmB?.status).toBe('unmatched')
    expect(h.store.payments.length).toBe(0)
  })

  it("tenant A can never match its own unmatched payment to tenant B's booking", async () => {
    const res = await POST(postReq({ unmatchedPaymentId: 'unm-A1', bookingId: 'book-B1' }))
    expect(res.status).toBe(404)

    const bookingB = h.store.bookings.find((b) => b.id === 'book-B1')
    expect(bookingB?.payment_status).toBe('unpaid')
    expect(h.store.payments.length).toBe(0)
  })

  it("a legitimate same-tenant match inserts a payment stamped with the caller's own tenant_id, never touches the other tenant", async () => {
    const res = await POST(postReq({ unmatchedPaymentId: 'unm-A1', bookingId: 'book-A1' }))
    expect(res.status).toBe(200)

    expect(h.store.payments.length).toBe(1)
    expect(h.store.payments[0].tenant_id).toBe('tenant-A')

    const bookingA = h.store.bookings.find((b) => b.id === 'book-A1')
    const bookingB = h.store.bookings.find((b) => b.id === 'book-B1')
    expect(bookingA?.payment_status).toBe('paid')
    expect(bookingB?.payment_status).toBe('unpaid')

    const notification = h.store.notifications[0]
    expect(notification?.tenant_id).toBe('tenant-A')
  })
})

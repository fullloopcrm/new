import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * requirePermission gate probe — payments/link/route.ts.
 * This route already tenant-scopes its booking read via .eq('tenant_id', ...)
 * — the gap was authz: any authenticated tenant role (incl. 'staff', which
 * rbac.ts denies bookings.edit) could generate a live Stripe payment link
 * (and write it onto the booking) with zero permission check. Proves it now
 * requires bookings.edit and never calls Stripe or mutates the booking when
 * denied.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let createPaymentLinkCalls = 0
vi.mock('@/lib/stripe', () => ({
  createPaymentLink: async () => {
    createPaymentLinkCalls++
    return { url: 'https://stripe.test/link' }
  },
}))

let currentTenantId: string
let permissionError: unknown = null
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: currentTenantId }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => (
    permissionError
      ? { tenant: null, error: permissionError }
      : { tenant: { tenantId: currentTenantId }, error: null }
  ),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const TENANT_ID = 'tenant-A'
const BOOKING_ID = 'bk-1'
const fake = supabaseAdmin as unknown as FakeSupabase

function req(): Request {
  return new Request('http://x', {
    method: 'POST',
    body: JSON.stringify({ booking_id: BOOKING_ID }),
  })
}

beforeEach(() => {
  fake._store.clear()
  currentTenantId = TENANT_ID
  permissionError = null
  createPaymentLinkCalls = 0
  fake._seed('bookings', [
    { id: BOOKING_ID, tenant_id: TENANT_ID, price: 10000, service_type: 'Cleaning', payment_link: null },
  ])
  fake._seed('tenants', [{ id: TENANT_ID, name: 'Test Co', stripe_api_key: 'sk_test_fake' }])
})

describe('payments/link POST — permission gate', () => {
  it('a caller with bookings.edit creates a payment link (positive control)', async () => {
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(createPaymentLinkCalls).toBe(1)
    const booking = fake._all('bookings').find((r) => r.id === BOOKING_ID)!
    expect(booking.payment_link).toBe('https://stripe.test/link')
  })

  it('a role lacking bookings.edit is forbidden and never creates a Stripe link or mutates the booking', async () => {
    permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
    const res = await POST(req())
    expect(res.status).toBe(403)
    expect(createPaymentLinkCalls).toBe(0)
    const booking = fake._all('bookings').find((r) => r.id === BOOKING_ID)!
    expect(booking.payment_link).toBe(null)
  })
})

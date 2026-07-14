import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * requirePermission gate probe — admin/payments/confirm-match/route.ts.
 * This route already tenant-scopes every read/write via explicit
 * .eq('tenant_id', tenantId) — the gap was authz, not isolation: any
 * authenticated tenant role (including one with no finance permissions)
 * could match a Zelle/Venmo payment and mark a booking paid. Proves the
 * route now requires finance.expenses and never mutates state when denied.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})
vi.mock('@/lib/sms', () => ({ sendSMS: async () => {} }))

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
const UNMATCHED_ID = 'unm-1'
const BOOKING_ID = 'bk-1'
const fake = supabaseAdmin as unknown as FakeSupabase

function req(): Request {
  return new Request('http://x', {
    method: 'POST',
    body: JSON.stringify({ unmatchedPaymentId: UNMATCHED_ID, bookingId: BOOKING_ID }),
  })
}

beforeEach(() => {
  fake._store.clear()
  currentTenantId = TENANT_ID
  permissionError = null
  fake._seed('unmatched_payments', [
    { id: UNMATCHED_ID, tenant_id: TENANT_ID, method: 'zelle', amount_cents: 10000, sender_name: 'Jane Doe', status: 'unmatched' },
  ])
  fake._seed('bookings', [
    { id: BOOKING_ID, tenant_id: TENANT_ID, client_id: 'client-1', team_member_id: 'tm-1', hourly_rate: null, actual_hours: null, price: 10000, payment_status: 'pending' },
  ])
  fake._seed('tenants', [{ id: TENANT_ID, name: 'Test Co', telnyx_api_key: null, telnyx_phone: null }])
})

describe('admin/payments/confirm-match POST — permission gate', () => {
  it('a caller with finance.expenses matches the payment (positive control)', async () => {
    const res = await POST(req())
    expect(res.status).toBe(200)

    const unmatched = fake._all('unmatched_payments').find((r) => r.id === UNMATCHED_ID)!
    expect(unmatched.status).toBe('matched')
    const booking = fake._all('bookings').find((r) => r.id === BOOKING_ID)!
    expect(booking.payment_status).toBe('paid')
  })

  it('a role lacking finance.expenses is forbidden and never matches the payment or mutates the booking', async () => {
    permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
    const res = await POST(req())
    expect(res.status).toBe(403)

    const unmatched = fake._all('unmatched_payments').find((r) => r.id === UNMATCHED_ID)!
    expect(unmatched.status).toBe('unmatched')
    const booking = fake._all('bookings').find((r) => r.id === BOOKING_ID)!
    expect(booking.payment_status).toBe('pending')
  })
})

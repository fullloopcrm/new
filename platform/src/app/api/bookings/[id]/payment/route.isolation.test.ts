import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — bookings/[id]/payment/route.ts (docs/adr/0004).
 * Proves the wrapper's injected .eq('tenant_id') stops tenant A's PATCH from
 * marking tenant B's same-id booking paid, even though the request only
 * targets the booking by id.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenantId: string
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
let permissionError: unknown = null
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => (
    permissionError
      ? { tenant: null, error: permissionError }
      : { tenant: { tenantId: currentTenantId }, error: null }
  ),
}))
vi.mock('@/lib/audit', () => ({ audit: async () => ({ success: true }) }))

import { supabaseAdmin } from '@/lib/supabase'
import { PATCH } from './route'

const A_ID = 'tenant-A'
const B_ID = 'tenant-B'
const SHARED_ID = 'bk-shared'
const fake = supabaseAdmin as unknown as FakeSupabase

function paramsFor(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  fake._store.clear()
  currentTenantId = A_ID
  permissionError = null
  fake._seed('bookings', [
    { id: SHARED_ID, tenant_id: A_ID, payment_status: 'pending', status: 'completed' },
    { id: SHARED_ID, tenant_id: B_ID, payment_status: 'pending', status: 'completed' },
  ])
})

describe('bookings/[id]/payment PATCH — tenantDb isolation', () => {
  it("tenant A marks its OWN same-id booking paid (positive control)", async () => {
    const req = new Request('http://x', { method: 'PATCH', body: JSON.stringify({ payment_status: 'paid', payment_method: 'card' }) })
    const res = await PATCH(req, paramsFor(SHARED_ID))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.booking.tenant_id).toBe(A_ID)
    expect(body.booking.payment_status).toBe('paid')
  })

  it("tenant A's payment PATCH never marks tenant B's same-id booking paid", async () => {
    const req = new Request('http://x', { method: 'PATCH', body: JSON.stringify({ payment_status: 'paid', payment_method: 'card' }) })
    await PATCH(req, paramsFor(SHARED_ID))

    const bBooking = fake._all('bookings').find((r) => r.tenant_id === B_ID)!
    expect(bBooking.payment_status).toBe('pending')
    expect(bBooking.status).toBe('completed')
  })
})

describe('bookings/[id]/payment PATCH — permission gate', () => {
  it('a role lacking bookings.edit is forbidden and never mutates the booking', async () => {
    permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
    const req = new Request('http://x', { method: 'PATCH', body: JSON.stringify({ payment_status: 'paid', payment_method: 'card' }) })
    const res = await PATCH(req, paramsFor(SHARED_ID))
    expect(res.status).toBe(403)

    const aBooking = fake._all('bookings').find((r) => r.tenant_id === A_ID)!
    expect(aBooking.payment_status).toBe('pending')
  })
})

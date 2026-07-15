import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — bookings/[id]/status/route.ts (docs/adr/0004).
 * Proves the wrapper's injected .eq('tenant_id') stops tenant A's PATCH from
 * reading OR mutating tenant B's booking/deal rows, even when B's booking
 * shares the SAME id as one of A's (legacy id collision), which the route's
 * previous raw-.eq('id', id).eq('tenant_id', tenantId) form also guarded —
 * this proves the tenantDb rewrite didn't weaken that guarantee.
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

import { supabaseAdmin } from '@/lib/supabase'
import { PATCH } from './route'

const A_ID = 'tenant-A'
const B_ID = 'tenant-B'
const SHARED_ID = 'bk-shared' // same booking id owned by two different tenants
const fake = supabaseAdmin as unknown as FakeSupabase

function paramsFor(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  fake._store.clear()
  currentTenantId = A_ID
  fake._seed('bookings', [
    { id: SHARED_ID, tenant_id: A_ID, status: 'scheduled' },
    { id: SHARED_ID, tenant_id: B_ID, status: 'pending' },
  ])
  fake._seed('deals', [
    { id: 'deal-a', tenant_id: A_ID, booking_id: SHARED_ID, mode: 'booking', stage: 'open' },
    { id: 'deal-b', tenant_id: B_ID, booking_id: SHARED_ID, mode: 'booking', stage: 'open' },
  ])
})

describe('bookings/[id]/status PATCH — tenantDb isolation', () => {
  it("tenant A transitions its OWN booking (positive control)", async () => {
    const req = new Request('http://x', { method: 'PATCH', body: JSON.stringify({ status: 'confirmed' }) })
    const res = await PATCH(req, paramsFor(SHARED_ID))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.booking.tenant_id).toBe(A_ID)
    expect(body.booking.status).toBe('confirmed')
  })

  it("tenant A's PATCH on a same-id booking never mutates tenant B's row — B's booking + deal survive untouched", async () => {
    const req = new Request('http://x', { method: 'PATCH', body: JSON.stringify({ status: 'confirmed' }) })
    await PATCH(req, paramsFor(SHARED_ID))

    const bBooking = fake._all('bookings').find((r) => r.tenant_id === B_ID)!
    expect(bBooking.status).toBe('pending') // untouched — was never 'scheduled' so a leak would have 400'd or mutated it
    const bDeal = fake._all('deals').find((r) => r.tenant_id === B_ID)!
    expect(bDeal.stage).toBe('open')

    const aDeal = fake._all('deals').find((r) => r.tenant_id === A_ID)!
    expect(aDeal.stage).toBe('sold')
  })
})

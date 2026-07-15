import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — bookings/[id]/reset/route.ts (docs/adr/0004).
 * Proves the wrapper's injected .eq('tenant_id') stops tenant A's admin undo
 * from reading OR mutating tenant B's same-id booking.
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
import { POST } from './route'

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
  fake._seed('bookings', [
    { id: SHARED_ID, tenant_id: A_ID, status: 'in_progress', check_in_time: '2026-07-01T09:00:00Z', check_out_time: null, payment_status: 'pending' },
    { id: SHARED_ID, tenant_id: B_ID, status: 'in_progress', check_in_time: '2026-07-02T09:00:00Z', check_out_time: null, payment_status: 'pending' },
  ])
})

describe('bookings/[id]/reset POST — tenantDb isolation', () => {
  it("tenant A undoes its OWN same-id booking's check-in (positive control)", async () => {
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ stage: 'check-in' }) })
    const res = await POST(req, paramsFor(SHARED_ID))
    expect(res.status).toBe(200)
    const aBooking = fake._all('bookings').find((r) => r.tenant_id === A_ID)!
    expect(aBooking.status).toBe('scheduled')
    expect(aBooking.check_in_time).toBeNull()
  })

  it("tenant A's check-in undo never mutates tenant B's same-id booking", async () => {
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ stage: 'check-in' }) })
    await POST(req, paramsFor(SHARED_ID))
    const bBooking = fake._all('bookings').find((r) => r.tenant_id === B_ID)!
    expect(bBooking.status).toBe('in_progress')
    expect(bBooking.check_in_time).toBe('2026-07-02T09:00:00Z')
  })
})

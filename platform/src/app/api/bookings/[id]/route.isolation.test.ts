import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — bookings/[id]/route.ts (docs/adr/0004).
 * Proves the wrapper's injected .eq('tenant_id') stops the GET/PUT/DELETE
 * base booking route from reading OR mutating a foreign tenant's same-id
 * booking, even when both bookings share the same id (legacy collision).
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
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: currentTenantId }, error: null }),
}))
vi.mock('@/lib/audit', () => ({ audit: async () => ({ success: true }) }))
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => {} }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({}) }))
vi.mock('@/lib/messaging/team-sms-resolver', () => ({ teamSmsTemplates: () => ({}) }))

import { supabaseAdmin } from '@/lib/supabase'
import { GET, PUT, DELETE } from './route'

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
    { id: SHARED_ID, tenant_id: A_ID, client_id: 'client-a', notes: 'A note', status: 'scheduled' },
    { id: SHARED_ID, tenant_id: B_ID, client_id: 'client-b', notes: 'B note', status: 'scheduled' },
  ])
})

describe('bookings/[id] GET — tenantDb isolation', () => {
  it("tenant A's GET returns ONLY its own same-id booking (positive control)", async () => {
    const res = await GET(new Request('http://x'), paramsFor(SHARED_ID))
    const body = await res.json()
    expect(body.booking.notes).toBe('A note')
  })

  it("tenant A's GET never returns tenant B's same-id booking", async () => {
    const res = await GET(new Request('http://x'), paramsFor(SHARED_ID))
    const body = await res.json()
    expect(body.booking.notes).not.toBe('B note')
  })
})

describe('bookings/[id] PUT — tenantDb isolation', () => {
  it("tenant A updates its OWN same-id booking (positive control)", async () => {
    const req = new Request('http://x', { method: 'PUT', body: JSON.stringify({ notes: 'A UPDATED' }) })
    const res = await PUT(req, paramsFor(SHARED_ID))
    expect(res.status).toBe(200)
    const aBooking = fake._all('bookings').find((r) => r.tenant_id === A_ID)!
    expect(aBooking.notes).toBe('A UPDATED')
  })

  it("tenant A's PUT never mutates tenant B's same-id booking", async () => {
    const req = new Request('http://x', { method: 'PUT', body: JSON.stringify({ notes: 'A UPDATED' }) })
    await PUT(req, paramsFor(SHARED_ID))
    const bBooking = fake._all('bookings').find((r) => r.tenant_id === B_ID)!
    expect(bBooking.notes).toBe('B note')
  })
})

describe('bookings/[id] DELETE — tenantDb isolation', () => {
  it("tenant A deleting its OWN same-id booking leaves tenant B's booking intact", async () => {
    const res = await DELETE(new Request('http://x'), paramsFor(SHARED_ID))
    expect(res.status).toBe(200)

    const remaining = fake._all('bookings')
    expect(remaining).toHaveLength(1)
    expect(remaining[0].tenant_id).toBe(B_ID)
    expect(remaining[0].notes).toBe('B note')
  })
})

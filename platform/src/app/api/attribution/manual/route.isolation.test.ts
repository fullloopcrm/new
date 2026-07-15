import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — attribution/manual/route.ts (docs/adr/0004).
 * Proves GET only lists the requesting tenant's bookings, and POST's update
 * (attribution) + notification insert are scoped to the requesting tenant
 * even when a foreign tenant's booking shares the same booking_id namespace.
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

import { supabaseAdmin } from '@/lib/supabase'
import { GET, POST } from './route'

const A_ID = 'tenant-A'
const B_ID = 'tenant-B'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  currentTenantId = A_ID
  fake._seed('bookings', [
    { id: 'bk-a', tenant_id: A_ID, start_time: '2026-07-01', created_at: '2026-07-01', price: 100, status: 'scheduled', attributed_domain: null },
    { id: 'bk-b', tenant_id: B_ID, start_time: '2026-07-02', created_at: '2026-07-02', price: 9999, status: 'scheduled', attributed_domain: null },
  ])
  fake._seed('notifications', [])
})

function postReq(body: Record<string, unknown>): Request {
  return new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
}

describe('attribution/manual GET — tenantDb isolation', () => {
  it("tenant A's booking list contains ONLY its own bookings, not tenant B's", async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.bookings.length).toBe(1)
    expect(body.bookings[0].id).toBe('bk-a')
  })
})

describe('attribution/manual POST — tenantDb isolation', () => {
  it("tenant A CANNOT attribute tenant B's booking by passing B's booking_id — the tenant_id filter finds no matching row, B's booking stays untouched", async () => {
    await POST(postReq({ booking_id: 'bk-b', domain: 'evil.com' }))
    const bRow = fake._all('bookings').find((r) => r.id === 'bk-b')!
    expect(bRow.attributed_domain).toBeNull()
  })

  it("tenant A attributing its OWN booking succeeds (positive control)", async () => {
    await POST(postReq({ booking_id: 'bk-a', domain: 'good.com' }))
    const aRow = fake._all('bookings').find((r) => r.id === 'bk-a')!
    expect(aRow.attributed_domain).toBe('good.com')
  })

  it("the notification created by a successful attribution is stamped with the requesting tenant, not a forged one", async () => {
    await POST(postReq({ booking_id: 'bk-a', domain: 'good.com' }))
    const notif = fake._all('notifications').find((r) => r.booking_id === 'bk-a')
    expect(notif?.tenant_id).toBe(A_ID)
  })

  it("LEAK CONTROL: updating bookings by id ALONE (no tenant_id filter) WOULD let tenant A attribute tenant B's booking — proves the route's tenantDb scoping above is load-bearing", async () => {
    const { data } = await supabaseAdmin
      .from('bookings')
      .update({ attributed_domain: 'evil.com' })
      .eq('id', 'bk-b')
      .select()
      .maybeSingle()
    expect((data as { attributed_domain: string } | null)?.attributed_domain).toBe('evil.com')
  })
})

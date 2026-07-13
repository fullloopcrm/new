import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — client/booking/[id]/route.ts (docs/adr/0004).
 * Proves the wrapper's injected .eq('tenant_id') stops tenant A's client
 * portal session from reading tenant B's same-id booking.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenantId: string
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: currentTenantId }),
}))
vi.mock('@/lib/client-auth', () => ({
  protectClientAPI: async (_tenantId: string, clientId: string) => ({ clientId }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

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
    { id: SHARED_ID, tenant_id: A_ID, client_id: 'cl-a', status: 'scheduled' },
    { id: SHARED_ID, tenant_id: B_ID, client_id: 'cl-b', status: 'pending' },
  ])
})

describe('client/booking/[id] GET — tenantDb isolation', () => {
  it("tenant A's client session reads its OWN same-id booking (positive control)", async () => {
    const res = await GET(new Request('http://x'), paramsFor(SHARED_ID))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tenant_id).toBe(A_ID)
    expect(body.client_id).toBe('cl-a')
  })

  it("tenant A's client session never sees tenant B's same-id booking", async () => {
    const res = await GET(new Request('http://x'), paramsFor(SHARED_ID))
    const body = await res.json()
    expect(body.tenant_id).not.toBe(B_ID)
    expect(body.client_id).not.toBe('cl-b')
  })
})

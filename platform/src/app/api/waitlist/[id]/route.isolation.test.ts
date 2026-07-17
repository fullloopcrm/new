import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — waitlist/[id]/route.ts.
 * Proves tenant A's PATCH can only transition its OWN waitlist entry, never a
 * same-id row belonging to tenant B, and that an invalid status value is
 * rejected before ever reaching the database.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenantId: string
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: currentTenantId }, error: null }),
}))
vi.mock('@/lib/tenant-query', () => ({
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
const SHARED_ID = 'wl-shared'
const fake = supabaseAdmin as unknown as FakeSupabase

function paramsFor(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

function patchReq(status: string) {
  return new Request('http://x', { method: 'PATCH', body: JSON.stringify({ status }) })
}

beforeEach(() => {
  fake._store.clear()
  currentTenantId = A_ID
  fake._seed('waitlist', [
    { id: SHARED_ID, tenant_id: A_ID, name: 'Alice A', status: 'open' },
    { id: SHARED_ID, tenant_id: B_ID, name: 'Bob B', status: 'open' },
  ])
})

describe('waitlist/[id] PATCH — tenantDb isolation', () => {
  it("tenant A marks its OWN entry booked (positive control)", async () => {
    const res = await PATCH(patchReq('booked'), paramsFor(SHARED_ID))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.entry.tenant_id).toBe(A_ID)
    expect(body.entry.status).toBe('booked')
  })

  it("tenant A's PATCH on a same-id entry never mutates tenant B's row", async () => {
    await PATCH(patchReq('booked'), paramsFor(SHARED_ID))
    const bEntry = fake._all('waitlist').find((r) => r.tenant_id === B_ID)!
    expect(bEntry.status).toBe('open')
  })

  it('rejects an unrecognized status before touching the database', async () => {
    const res = await PATCH(patchReq('deleted'), paramsFor(SHARED_ID))
    expect(res.status).toBe(400)
    const aEntry = fake._all('waitlist').find((r) => r.tenant_id === A_ID)!
    expect(aEntry.status).toBe('open')
  })
})

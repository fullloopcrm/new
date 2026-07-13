import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — portal/bookings/[id]/route.ts (docs/adr/0004).
 * Proves the wrapper's injected .eq('tenant_id') stops a portal token from
 * one tenant from reading OR mutating another tenant's same-id booking, even
 * when both bookings share the same client_id (id + client_id collision).
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentAuth: { id: string; tid: string } | null
vi.mock('../../auth/token', () => ({
  verifyPortalToken: (_token: string) => currentAuth,
}))
vi.mock('@/lib/notify', () => ({
  notify: async () => {},
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET, PUT } from './route'

const A_ID = 'tenant-A'
const B_ID = 'tenant-B'
const SHARED_CLIENT_ID = 'client-shared'
const SHARED_ID = 'bk-shared'
const fake = supabaseAdmin as unknown as FakeSupabase

function paramsFor(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

function req(method = 'GET', body?: unknown): Request {
  return new Request('http://x/api/portal/bookings/id', {
    method,
    headers: { authorization: 'Bearer whatever' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

beforeEach(() => {
  fake._store.clear()
  currentAuth = { id: SHARED_CLIENT_ID, tid: A_ID }
  fake._seed('bookings', [
    { id: SHARED_ID, tenant_id: A_ID, client_id: SHARED_CLIENT_ID, start_time: '2099-01-01', notes: 'A note' },
    { id: SHARED_ID, tenant_id: B_ID, client_id: SHARED_CLIENT_ID, start_time: '2099-01-02', notes: 'B note' },
  ])
})

describe('portal/bookings/[id] GET — tenantDb isolation', () => {
  it("tenant A's portal token reads its OWN same-id booking (positive control)", async () => {
    const res = await GET(req() as never, paramsFor(SHARED_ID))
    const body = await res.json()
    expect(body.booking.notes).toBe('A note')
  })

  it("tenant A's portal token NEVER returns tenant B's same-id booking", async () => {
    const res = await GET(req() as never, paramsFor(SHARED_ID))
    const body = await res.json()
    expect(body.booking.notes).not.toBe('B note')
  })
})

describe('portal/bookings/[id] PUT — tenantDb isolation', () => {
  it("tenant A's update never mutates tenant B's same-id booking", async () => {
    const res = await PUT(req('PUT', { notes: 'A UPDATED' }) as never, paramsFor(SHARED_ID))
    expect(res.status).toBe(200)

    const aBooking = fake._all('bookings').find((r) => r.tenant_id === A_ID)!
    const bBooking = fake._all('bookings').find((r) => r.tenant_id === B_ID)!
    expect(aBooking.notes).toBe('A UPDATED')
    expect(bBooking.notes).toBe('B note')
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — bookings/batch-update/route.ts (docs/adr/0004).
 * Proves the wrapper's injected .eq('tenant_id') stops tenant A's batch PUT
 * from mutating tenant B's same-id booking, and that attempting to batch a
 * booking id that belongs ONLY to tenant B fails closed (0 rows matched)
 * instead of silently succeeding against nothing.
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
vi.mock('@/lib/audit', () => ({ audit: async () => ({ success: true }) }))
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))

import { supabaseAdmin } from '@/lib/supabase'
import { PUT } from './route'

const A_ID = 'tenant-A'
const B_ID = 'tenant-B'
const SHARED_ID = 'bk-shared'
const B_ONLY_ID = 'bk-b-only'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  currentTenantId = A_ID
  fake._seed('bookings', [
    { id: SHARED_ID, tenant_id: A_ID, notes: 'A note', start_time: '2026-01-01T09:00' },
    { id: SHARED_ID, tenant_id: B_ID, notes: 'B note', start_time: '2026-01-02T09:00' },
    { id: B_ONLY_ID, tenant_id: B_ID, notes: 'B-only note', start_time: '2026-01-03T09:00' },
  ])
})

describe('bookings/batch-update PUT — tenantDb isolation', () => {
  it("tenant A's batch update never mutates tenant B's same-id booking", async () => {
    const req = new Request('http://x', {
      method: 'PUT',
      body: JSON.stringify({ updates: [{ id: SHARED_ID, data: { notes: 'A BATCH UPDATED' } }] }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(200)

    const aBooking = fake._all('bookings').find((r) => r.tenant_id === A_ID)!
    const bBooking = fake._all('bookings').find((r) => r.tenant_id === B_ID && r.id === SHARED_ID)!
    expect(aBooking.notes).toBe('A BATCH UPDATED')
    expect(bBooking.notes).toBe('B note')
  })

  it("batching an id that belongs ONLY to tenant B fails closed, not silently no-op success", async () => {
    const req = new Request('http://x', {
      method: 'PUT',
      body: JSON.stringify({ updates: [{ id: B_ONLY_ID, data: { notes: 'HIJACKED' } }] }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(500)

    const bBooking = fake._all('bookings').find((r) => r.id === B_ONLY_ID)!
    expect(bBooking.notes).toBe('B-only note')
  })
})

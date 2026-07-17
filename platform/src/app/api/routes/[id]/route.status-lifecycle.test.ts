import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * routes.status's declared 'started'/'completed'/'cancelled' values (CHECK
 * constraint + STATUS_COLORS badges on the admin dashboard) were fully
 * supported by this PATCH handler's generic `assignables` whitelist and its
 * started_at/completed_at auto-stamp logic — but zero call site anywhere in
 * the app ever sent them. Item (140)/(141) wire the missing UI triggers; these
 * tests lock in the PATCH behavior they now rely on.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  return { supabaseAdmin: createFakeSupabase() }
})

const TENANT = 'tenant-A'
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { PATCH } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const ROUTE_ID = 'route-1'

function patchReq(body: Record<string, unknown>): Request {
  return new Request('http://x/api/routes/route-1', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}
function params() {
  return { params: Promise.resolve({ id: ROUTE_ID }) }
}

beforeEach(() => {
  fake._store.clear()
  fake._seed('routes', [{ id: ROUTE_ID, tenant_id: TENANT, status: 'published', started_at: null, completed_at: null }])
  fake._seed('bookings', [])
})

describe('PATCH /api/routes/[id] — status lifecycle (cancel / complete)', () => {
  it('persists status: cancelled on a published route', async () => {
    const res = await PATCH(patchReq({ status: 'cancelled' }), params())
    expect(res.status).toBe(200)
    expect(fake._all('routes')[0].status).toBe('cancelled')
  })

  it('persists status: completed and stamps completed_at', async () => {
    const res = await PATCH(patchReq({ status: 'completed' }), params())
    expect(res.status).toBe(200)
    const row = fake._all('routes')[0]
    expect(row.status).toBe('completed')
    expect(row.completed_at).toBeTruthy()
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * PUT/POST /api/admin/sales — cache-invalidation gap.
 *
 * BUG (fixed here): both handlers write `tenants.status` (PUT for a general
 * status/plan edit, POST for the sales-pipeline "activate" action) but never
 * called `invalidateTenantCache()`. Same class already fixed for
 * admin/tenants/[id] and admin/businesses/[id] — without the bust, a tenant
 * suspended/cancelled/reactivated from the sales pipeline keeps resolving
 * through tenant-lookup.ts's warm-edge-isolate cache (tenantServesSite()
 * evaluating the STALE status) for up to the rest of the 5-min TTL.
 */

const T = 'tid-sales'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))

const invalidateTenantCache = vi.fn()
vi.mock('@/lib/tenant-lookup', () => ({ invalidateTenantCache }))

import { PUT, POST } from './route'

function seed() {
  return {
    tenants: [{ id: T, status: 'pending', plan: 'free' }] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  invalidateTenantCache.mockClear()
})

function put(body: unknown) {
  return PUT(new Request('http://t/api/admin/sales', { method: 'PUT', body: JSON.stringify(body) }))
}
function post(body: unknown) {
  return POST(new Request('http://t/api/admin/sales', { method: 'POST', body: JSON.stringify(body) }))
}

describe('PUT /api/admin/sales — cache-invalidation gap', () => {
  it('busts the tenant-lookup cache when status changes', async () => {
    const res = await put({ tenantId: T, status: 'suspended' })

    expect(res.status).toBe(200)
    expect(invalidateTenantCache).toHaveBeenCalledTimes(1)
    expect(invalidateTenantCache).toHaveBeenCalledWith(T)
  })

  it('does not bust the cache when only plan changes (no status write)', async () => {
    const res = await put({ tenantId: T, plan: 'pro' })

    expect(res.status).toBe(200)
    expect(invalidateTenantCache).not.toHaveBeenCalled()
  })
})

describe('POST /api/admin/sales — cache-invalidation gap', () => {
  it('busts the tenant-lookup cache on activation', async () => {
    const res = await post({ tenantId: T })

    expect(res.status).toBe(200)
    expect(invalidateTenantCache).toHaveBeenCalledTimes(1)
    expect(invalidateTenantCache).toHaveBeenCalledWith(T)
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * PATCH /api/admin/tenants — cache-invalidation gap.
 *
 * BUG (fixed here): this route writes `tenants.status` directly (the field
 * `tenantServesSite()` gates every host-resolved entry point on) but never
 * called `invalidateTenantCache()`. tenant-lookup.ts's slug/domain resolver
 * caches for 5 minutes — without a bust, a tenant just suspended/cancelled
 * here keeps resolving through a warm edge isolate's cached (still-serving)
 * entry for up to the rest of the TTL. Same class already fixed for
 * admin/tenants/[id] and admin/businesses/[id]'s own status writes, but this
 * separate list-level PATCH route was never wired in.
 *
 * WRONG-TENANT-PROBE-EQUIVALENT: asserts the cache is busted for the EXACT
 * tenant id that was updated, and only when a status write actually happened.
 */

const T = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))

const invalidateTenantCache = vi.fn()
vi.mock('@/lib/tenant-lookup', () => ({ invalidateTenantCache }))

import { PATCH } from './route'

function seed() {
  return {
    tenants: [{ id: T, status: 'active' }] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  invalidateTenantCache.mockClear()
})

function patch(body: unknown) {
  return PATCH(new Request('http://t/api/admin/tenants', { method: 'PATCH', body: JSON.stringify(body) }))
}

describe('PATCH /api/admin/tenants — cache-invalidation gap', () => {
  it('busts tenant-lookup.ts cache for the updated tenant on a successful status change', async () => {
    const res = await patch({ id: T, status: 'suspended' })

    expect(res.status).toBe(200)
    expect(invalidateTenantCache).toHaveBeenCalledTimes(1)
    expect(invalidateTenantCache).toHaveBeenCalledWith(T)
  })

  it('does not bust the cache when the status is rejected as unknown (no write happened)', async () => {
    const res = await patch({ id: T, status: 'banned' })

    expect(res.status).toBe(400)
    expect(invalidateTenantCache).not.toHaveBeenCalled()
  })
})

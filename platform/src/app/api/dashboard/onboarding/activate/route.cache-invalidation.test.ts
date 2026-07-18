import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/dashboard/onboarding/activate — cache-invalidation gap.
 *
 * BUG (fixed here): flips `tenants.status` pending -> active (this route's
 * own doc comment calls it "Go live") but never called
 * `invalidateTenantCache()`. Same class already fixed for the admin-side
 * status writes (admin/tenants/[id], admin/businesses/[id]) — without the
 * bust, the tenant who just clicked "Go live" can still resolve through
 * tenant-lookup.ts's warm-edge-isolate cache (tenantServesSite() evaluating
 * the STALE pre-active status) for up to the rest of the 5-min TTL, directly
 * after this route reports activation succeeded.
 */

const A = 'tid-a'

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: A,
      tenant: { id: A },
      role: 'owner',
    })),
  }
})

vi.mock('@/lib/onboarding-tasks', () => ({
  checkActivationReadiness: vi.fn(async () => ({ ready: true, tasksRemaining: [], gateBlockers: [] })),
}))

vi.mock('@/lib/vercel-domains', () => ({
  registerCarryingDomain: vi.fn(async () => ({ ok: true, status: 'skipped', domain: 'acme.fullloopcrm.com' })),
}))

vi.mock('@/lib/supabase', () => {
  const chain = () => {
    const q: Record<string, unknown> = {}
    const self = () => q
    q.select = vi.fn(self)
    q.eq = vi.fn(self)
    q.insert = vi.fn(async () => ({ data: null, error: null }))
    q.update = vi.fn(self)
    q.single = vi.fn(async () => ({ data: { id: A, name: 'Acme', status: 'active', slug: 'acme' }, error: null }))
    return q
  }
  return { supabaseAdmin: { from: vi.fn(() => chain()) } }
})

const invalidateTenantCache = vi.fn()
vi.mock('@/lib/tenant-lookup', () => ({ invalidateTenantCache }))

import { POST } from './route'

beforeEach(() => {
  invalidateTenantCache.mockClear()
})

describe('POST /api/dashboard/onboarding/activate — cache-invalidation gap', () => {
  it('busts the tenant-lookup cache for the activated tenant', async () => {
    const res = await POST()

    expect(res.status).toBe(200)
    expect(invalidateTenantCache).toHaveBeenCalledTimes(1)
    expect(invalidateTenantCache).toHaveBeenCalledWith(A)
  })
})

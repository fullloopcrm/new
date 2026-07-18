import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * acceptInviteForAdmin — cache-invalidation gap.
 *
 * BUG (fixed here): flips `tenants.status` setup -> active when an owner
 * accepts their invite, but never called `invalidateTenantCache()`. Same
 * class already fixed for the admin-side status writes (admin/tenants/[id],
 * admin/businesses/[id]) — without the bust, the tenant can still resolve
 * through tenant-lookup.ts's warm-edge-isolate cache (tenantServesSite()
 * evaluating the STALE pre-active status) for up to the rest of the 5-min TTL.
 */

const TENANT_INVITE = {
  id: 'invite_1',
  tenant_id: 'tenant_victim',
  email: 'owner@victim-biz.com',
  role: 'owner',
  accepted: false,
  expires_at: '2099-01-01T00:00:00.000Z',
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenant_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
          insert: () => ({ then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }) }),
        }
      }
      if (table === 'tenant_invites') {
        return {
          update: () => ({
            eq: () => ({ then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }) }),
          }),
        }
      }
      if (table === 'tenants') {
        return {
          update: () => ({
            eq: () => ({
              eq: () => ({ then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }) }),
            }),
          }),
        }
      }
      throw new Error(`unexpected table ${table}`)
    },
  },
}))

vi.mock('@/lib/security', () => ({
  logSecurityEvent: vi.fn(async () => {}),
}))

const invalidateTenantCache = vi.fn()
vi.mock('@/lib/tenant-lookup', () => ({ invalidateTenantCache }))

import { acceptInviteForAdmin } from './accept-invite'

beforeEach(() => {
  invalidateTenantCache.mockClear()
})

describe('acceptInviteForAdmin — cache-invalidation gap', () => {
  it('busts the tenant-lookup cache for the tenant brought out of setup', async () => {
    const recipient = { id: 'admin_recipient', email: 'owner@victim-biz.com' }

    const result = await acceptInviteForAdmin(TENANT_INVITE, recipient)

    expect(result.status).toBe('accepted')
    expect(invalidateTenantCache).toHaveBeenCalledTimes(1)
    expect(invalidateTenantCache).toHaveBeenCalledWith('tenant_victim')
  })

  it('does not bust the cache when the signed-in identity does not match the invite (no write happens)', async () => {
    const attacker = { id: 'admin_attacker', email: 'staff@some-other-biz.com' }

    const result = await acceptInviteForAdmin(TENANT_INVITE, attacker)

    expect(result.status).toBe('email_mismatch')
    expect(invalidateTenantCache).not.toHaveBeenCalled()
  })
})

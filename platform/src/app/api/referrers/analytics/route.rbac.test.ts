import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/referrers/analytics — permission gate.
 *
 * BUG (fixed here): the route only called getTenantForRequest(), which
 * succeeds for ANY tenant_members row regardless of role, then returned
 * referrer names/earnings, referred-booking revenue, and click/session
 * analytics with zero permission check. rbac.ts grants 'referrals.view'
 * only to owner/admin/manager -- 'staff' explicitly does not hold it -- so
 * any staff-tier tenant member could call this endpoint directly (no UI
 * needed; nothing in the dashboard even calls this route today) and read
 * referral earnings/PII the RBAC catalog says they shouldn't see. Same
 * class as the GET /api/settings gap fixed in P60.
 *
 * FIX: requirePermission('referrals.view') gates the route, matching the
 * permission catalog's own description and every sibling /api/referrers/*
 * route's existing admin/token gate.
 */

const A = 'tid-a'

const roleHolder = vi.hoisted(() => ({ role: 'owner' as string }))
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
      role: roleHolder.role,
    })),
  }
})

vi.mock('@/lib/supabase', () => {
  const chain = () => {
    const q: Record<string, unknown> = {}
    const self = () => q
    q.select = vi.fn(self)
    q.eq = vi.fn(self)
    q.not = vi.fn(self)
    q.order = vi.fn(async () => ({ data: [] }))
    return q
  }
  return { supabaseAdmin: { from: vi.fn(() => chain()) } }
})

import { GET } from './route'

beforeEach(() => {
  roleHolder.role = 'owner'
})

describe('GET /api/referrers/analytics — permission probe', () => {
  it('owner (has referrals.view) can load analytics', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it("'manager' (has referrals.view per rbac.ts) can load analytics", async () => {
    roleHolder.role = 'manager'
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' (no referrals.view) is forbidden", async () => {
    roleHolder.role = 'staff'
    const res = await GET()
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.overview).toBeUndefined()
    expect(body.topReferrers).toBeUndefined()
  })
})

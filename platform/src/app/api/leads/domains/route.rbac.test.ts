import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/leads/domains — permission gate.
 *
 * BUG (fixed here): only called getTenantForRequest() (any authenticated
 * role), unlike its siblings on the same lead_clicks/website_visits surface —
 * leads/override, leads/verify, leads/block — which all require 'leads.view'.
 * rbac.ts grants 'leads.view' to owner/admin/manager, not 'staff'. Same class
 * as leads/feed, leads/attribution, leads/visits (fixed alongside this one).
 *
 * FIX: requirePermission('leads.view') on GET, matching the siblings.
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
    q.order = vi.fn(async () => ({ data: [] }))
    return q
  }
  return { supabaseAdmin: { from: vi.fn(() => chain()) } }
})

import { GET } from './route'

beforeEach(() => {
  roleHolder.role = 'owner'
})

describe('GET /api/leads/domains — permission probe', () => {
  it('owner (has leads.view) can load domains', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it("manager (has leads.view per rbac.ts) can load domains", async () => {
    roleHolder.role = 'manager'
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' (no leads.view) is forbidden", async () => {
    roleHolder.role = 'staff'
    const res = await GET()
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.domains).toBeUndefined()
  })
})

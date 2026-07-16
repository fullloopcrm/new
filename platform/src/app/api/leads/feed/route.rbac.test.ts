import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/leads/feed — permission gate.
 *
 * BUG (fixed here): only called getTenantForRequest() (any authenticated
 * role) and returned client PII (name/email/phone/address/notes), booking
 * revenue, and visitor click/session analytics with zero permission check.
 * rbac.ts grants 'leads.view' to owner/admin/manager, not 'staff' — same
 * class as leads/override, leads/verify, leads/block (already gated) and
 * leads/attribution, leads/domains, leads/visits (fixed alongside this one).
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

// Generic thenable chain: every builder method returns itself so any await
// point in a `.select().eq().gte().order().limit()`-shaped chain resolves to
// an empty result set — the route only needs valid shapes to reach a 200.
vi.mock('@/lib/supabase', () => {
  const chain = () => {
    const q: Record<string, unknown> = {}
    const self = () => q
    q.select = vi.fn(self)
    q.eq = vi.fn(self)
    q.gte = vi.fn(self)
    q.order = vi.fn(self)
    q.limit = vi.fn(self)
    q.then = (resolve: (v: { data: unknown[] }) => void) => resolve({ data: [] })
    return q
  }
  return { supabaseAdmin: { from: vi.fn(() => chain()) } }
})

import { GET } from './route'

beforeEach(() => {
  roleHolder.role = 'owner'
})

function get() {
  return GET(new Request('http://t/api/leads/feed') as unknown as import('next/server').NextRequest)
}

describe('GET /api/leads/feed — permission probe', () => {
  it('owner (has leads.view) can load the feed', async () => {
    const res = await get()
    expect(res.status).toBe(200)
  })

  it("manager (has leads.view per rbac.ts) can load the feed", async () => {
    roleHolder.role = 'manager'
    const res = await get()
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' (no leads.view) is forbidden", async () => {
    roleHolder.role = 'staff'
    const res = await get()
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.feed).toBeUndefined()
    expect(body.stats).toBeUndefined()
  })
})

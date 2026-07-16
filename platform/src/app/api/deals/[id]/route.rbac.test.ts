import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET/PATCH/DELETE /api/deals/[id] — permission gate.
 *
 * BUG (fixed here): every handler only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check. rbac.ts grants
 * 'sales.view' to every role including staff, but 'sales.edit' only to
 * owner/admin/manager. Before this fix a 'staff' session could read, edit,
 * or delete any single deal directly via the API.
 *
 * FIX: requirePermission('sales.view') on GET, requirePermission('sales.edit')
 * on PATCH/DELETE, matching the existing documents/* routes' pattern.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

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

import { GET, PATCH, DELETE } from './route'

function seed() {
  return {
    deals: [
      { id: 'deal-1', tenant_id: A, title: 'Existing deal', value_cents: 0, probability: 10 },
    ],
    deal_activities: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  roleHolder.role = 'owner'
})

const params = () => ({ params: Promise.resolve({ id: 'deal-1' }) })

describe('GET /api/deals/[id] — permission probe', () => {
  it('owner (has sales.view) can read a deal', async () => {
    const res = await GET(new Request('http://t'), params())
    expect(res.status).toBe(200)
  })

  it("'staff' (has sales.view per rbac.ts) can read a deal", async () => {
    roleHolder.role = 'staff'
    const res = await GET(new Request('http://t'), params())
    expect(res.status).toBe(200)
  })
})

describe('PATCH /api/deals/[id] — permission probe', () => {
  function req() {
    return new Request('http://t', { method: 'PATCH', body: JSON.stringify({ notes: 'updated' }) })
  }

  it('owner (has sales.edit) can update a deal', async () => {
    const res = await PATCH(req(), params())
    expect(res.status).toBe(200)
    expect(h.capture.updates.some((u) => u.table === 'deals')).toBe(true)
  })

  it("PERMISSION PROBE: 'staff' (no sales.edit) is forbidden and nothing is updated", async () => {
    roleHolder.role = 'staff'
    const res = await PATCH(req(), params())
    expect(res.status).toBe(403)
    expect(h.capture.updates.some((u) => u.table === 'deals')).toBe(false)
  })
})

describe('DELETE /api/deals/[id] — permission probe', () => {
  it('owner (has sales.edit) can delete a deal', async () => {
    const res = await DELETE(new Request('http://t', { method: 'DELETE' }), params())
    expect(res.status).toBe(200)
    expect(h.capture.deletes.some((d) => d.table === 'deals')).toBe(true)
  })

  it("PERMISSION PROBE: 'staff' (no sales.edit) is forbidden and nothing is deleted", async () => {
    roleHolder.role = 'staff'
    const res = await DELETE(new Request('http://t', { method: 'DELETE' }), params())
    expect(res.status).toBe(403)
    expect(h.capture.deletes.some((d) => d.table === 'deals')).toBe(false)
  })
})

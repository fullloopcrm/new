import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET/POST/PUT/DELETE /api/deals — permission gate.
 *
 * BUG (fixed here): every handler only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check. rbac.ts grants
 * 'sales.view' to every role including staff, but 'sales.edit' only to
 * owner/admin/manager — staff can view the sales.view-gated `documents`
 * routes but is not supposed to create/edit/delete deals. Before this fix a
 * 'staff' session could create, update, or delete any deal directly via the
 * API (the dashboard nav hides `/dashboard/sales` from roles lacking
 * `leads.view`, which staff also lacks, but that's a UI gate, not an API one).
 *
 * FIX: requirePermission('sales.view') on GET, requirePermission('sales.edit')
 * on POST/PUT/DELETE, matching the existing documents/* routes' pattern.
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

// Real requirePermission + real rbac run against the mocked tenant-query above,
// so a 'staff' role is denied by the ACTUAL permission table, not a stub.
import { GET, POST, PUT, DELETE } from './route'

function seed() {
  return {
    deals: [
      { id: 'deal-1', tenant_id: A, status: 'active', client_id: null, title: 'Existing deal', follow_up_at: null, probability: 10, value_cents: 0, stage: 'new' },
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

describe('GET /api/deals — permission probe', () => {
  it('owner (has sales.view) can list deals', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it("'staff' (has sales.view per rbac.ts) can list deals", async () => {
    roleHolder.role = 'staff'
    const res = await GET()
    expect(res.status).toBe(200)
  })
})

describe('POST /api/deals — permission probe', () => {
  function req() {
    return new Request('http://t', { method: 'POST', body: JSON.stringify({ title: 'New deal' }) })
  }

  it('owner (has sales.edit) can create a deal', async () => {
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(h.capture.inserts.some((i) => i.table === 'deals')).toBe(true)
  })

  it("PERMISSION PROBE: 'staff' (no sales.edit) is forbidden and nothing is created", async () => {
    roleHolder.role = 'staff'
    const res = await POST(req())
    expect(res.status).toBe(403)
    expect(h.capture.inserts.some((i) => i.table === 'deals')).toBe(false)
  })
})

describe('PUT /api/deals — permission probe', () => {
  function req() {
    return new Request('http://t', { method: 'PUT', body: JSON.stringify({ id: 'deal-1', notes: 'updated' }) })
  }

  it('owner (has sales.edit) can update a deal', async () => {
    const res = await PUT(req())
    expect(res.status).toBe(200)
    expect(h.capture.updates.some((u) => u.table === 'deals')).toBe(true)
  })

  it("PERMISSION PROBE: 'staff' (no sales.edit) is forbidden and nothing is updated", async () => {
    roleHolder.role = 'staff'
    const res = await PUT(req())
    expect(res.status).toBe(403)
    expect(h.capture.updates.some((u) => u.table === 'deals')).toBe(false)
  })
})

describe('DELETE /api/deals — permission probe', () => {
  function req() {
    return new Request('http://t', { method: 'DELETE', body: JSON.stringify({ id: 'deal-1' }) })
  }

  it('owner (has sales.edit) can delete a deal', async () => {
    const res = await DELETE(req())
    expect(res.status).toBe(200)
    expect(h.capture.deletes.some((d) => d.table === 'deals')).toBe(true)
  })

  it("PERMISSION PROBE: 'staff' (no sales.edit) is forbidden and nothing is deleted", async () => {
    roleHolder.role = 'staff'
    const res = await DELETE(req())
    expect(res.status).toBe(403)
    expect(h.capture.deletes.some((d) => d.table === 'deals')).toBe(false)
  })
})

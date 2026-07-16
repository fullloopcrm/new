import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET/POST /api/deals/at-risk — permission gate.
 *
 * BUG (fixed here): the outreach worklist (full client PII: name/email/
 * phone/address + booking spend history) and its outreach-status mutation
 * only called getTenantForRequest() (proves tenant membership at ANY role)
 * with zero permission check. rbac.ts grants 'sales.view' to every role but
 * 'sales.edit' only to owner/admin/manager — before this fix a 'staff'
 * session could mutate any client's outreach status directly via the API.
 *
 * FIX: requirePermission('sales.view') on GET, requirePermission('sales.edit')
 * on POST.
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

import { GET, POST } from './route'

function seed() {
  return {
    clients: [
      { id: 'client-1', tenant_id: A, name: 'Jeff Tucker', email: 'jeff@example.com', phone: '555', address: '123 Main', status: 'active', created_at: '2026-01-01', do_not_service: false, last_outreach_at: null, outreach_count: 0, outreach_status: 'none' },
    ],
    bookings: [],
    deals: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  roleHolder.role = 'owner'
})

describe('GET /api/deals/at-risk — permission probe', () => {
  it('owner (has sales.view) can load the outreach worklist', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it("'staff' (has sales.view per rbac.ts) can load the outreach worklist", async () => {
    roleHolder.role = 'staff'
    const res = await GET()
    expect(res.status).toBe(200)
  })
})

describe('POST /api/deals/at-risk — permission probe', () => {
  function req() {
    return new Request('http://t', { method: 'POST', body: JSON.stringify({ client_id: 'client-1', action: 'touch', current_count: 0 }) })
  }

  it('owner (has sales.edit) can mutate outreach status', async () => {
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(h.capture.updates.some((u) => u.table === 'clients')).toBe(true)
  })

  it("PERMISSION PROBE: 'staff' (no sales.edit) is forbidden and nothing is mutated", async () => {
    roleHolder.role = 'staff'
    const res = await POST(req())
    expect(res.status).toBe(403)
    expect(h.capture.updates.some((u) => u.table === 'clients')).toBe(false)
  })
})

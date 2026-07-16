import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET/POST /api/quotes — permission gate.
 *
 * BUG (fixed here): both handlers only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check. rbac.ts grants
 * 'sales.view' to every role including staff, but 'sales.edit' only to
 * owner/admin/manager — same sales.view/sales.edit split already enforced on
 * documents/* and (this round) deals/*. Before this fix a 'staff' session
 * could list every quote (client PII embedded) and create quotes directly
 * via the API.
 *
 * FIX: requirePermission('sales.view') on GET, requirePermission('sales.edit')
 * on POST, matching documents/* and deals/route.ts exactly.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (t: string) => holder.from!(t),
    rpc: async () => ({ data: 1, error: null }),
  },
}))

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
import { GET, POST } from './route'

function seed() {
  return {
    quotes: [
      { id: 'quote-1', tenant_id: A, status: 'draft', client_id: null, deal_id: null, title: 'Existing quote' },
    ],
    clients: [],
    deals: [],
    deal_activities: [],
    quote_activity: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  roleHolder.role = 'owner'
})

describe('GET /api/quotes — permission probe', () => {
  it('owner (has sales.view) can list quotes', async () => {
    const res = await GET(new Request('http://t'))
    expect(res.status).toBe(200)
  })

  it("'staff' (has sales.view per rbac.ts) can list quotes", async () => {
    roleHolder.role = 'staff'
    const res = await GET(new Request('http://t'))
    expect(res.status).toBe(200)
  })
})

describe('POST /api/quotes — permission probe', () => {
  function req() {
    return new Request('http://t', { method: 'POST', body: JSON.stringify({ title: 'New quote' }) })
  }

  it('owner (has sales.edit) can create a quote', async () => {
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(h.capture.inserts.some((i) => i.table === 'quotes')).toBe(true)
  })

  it("PERMISSION PROBE: 'staff' (no sales.edit) is forbidden and nothing is created", async () => {
    roleHolder.role = 'staff'
    const res = await POST(req())
    expect(res.status).toBe(403)
    expect(h.capture.inserts.some((i) => i.table === 'quotes')).toBe(false)
  })
})

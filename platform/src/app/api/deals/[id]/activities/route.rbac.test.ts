import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET/POST /api/deals/[id]/activities — permission gate.
 *
 * BUG (fixed here): reading and logging deal activity (notes/calls/texts/
 * emails/quotes on a deal) only called getTenantForRequest() (proves tenant
 * membership at ANY role) with zero permission check. rbac.ts grants
 * 'sales.view' to every role but 'sales.edit' only to owner/admin/manager —
 * before this fix a 'staff' session could log arbitrary activity entries
 * against any deal directly via the API.
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
    deals: [{ id: 'deal-1', tenant_id: A, title: 'Existing deal' }],
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

describe('GET /api/deals/[id]/activities — permission probe', () => {
  it('owner (has sales.view) can read activities', async () => {
    const res = await GET(new Request('http://t'), params())
    expect(res.status).toBe(200)
  })

  it("'staff' (has sales.view per rbac.ts) can read activities", async () => {
    roleHolder.role = 'staff'
    const res = await GET(new Request('http://t'), params())
    expect(res.status).toBe(200)
  })
})

describe('POST /api/deals/[id]/activities — permission probe', () => {
  function req() {
    return new Request('http://t', { method: 'POST', body: JSON.stringify({ type: 'note', description: 'called client' }) })
  }

  it('owner (has sales.edit) can log an activity', async () => {
    const res = await POST(req(), params())
    expect(res.status).toBe(200)
    expect(h.capture.inserts.some((i) => i.table === 'deal_activities')).toBe(true)
  })

  it("PERMISSION PROBE: 'staff' (no sales.edit) is forbidden and nothing is logged", async () => {
    roleHolder.role = 'staff'
    const res = await POST(req(), params())
    expect(res.status).toBe(403)
    expect(h.capture.inserts.some((i) => i.table === 'deal_activities')).toBe(false)
  })
})

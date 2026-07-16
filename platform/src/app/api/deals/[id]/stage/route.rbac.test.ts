import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/deals/[id]/stage — permission gate.
 *
 * BUG (fixed here): moving a deal to a new pipeline stage only called
 * getTenantForRequest() (proves tenant membership at ANY role) with zero
 * permission check. rbac.ts grants 'sales.edit' to owner/admin/manager only
 * — before this fix a 'staff' session could move any deal through the
 * pipeline (including closing it as sold/lost) directly via the API.
 *
 * FIX: requirePermission('sales.edit'), matching deals/route.ts + deals/[id].
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

import { POST } from './route'

function seed() {
  return {
    deals: [
      { id: 'deal-1', tenant_id: A, stage: 'new', title: 'Existing deal', value_cents: 0, probability: 10 },
    ],
    deal_activities: [],
    quotes: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  roleHolder.role = 'owner'
})

function req() {
  return new Request('http://t', { method: 'POST', body: JSON.stringify({ stage: 'qualifying' }) })
}
const params = () => ({ params: Promise.resolve({ id: 'deal-1' }) })

describe('POST /api/deals/[id]/stage — permission probe', () => {
  it('owner (has sales.edit) can move a deal to a new stage', async () => {
    const res = await POST(req(), params())
    expect(res.status).toBe(200)
    expect(h.capture.updates.some((u) => u.table === 'deals')).toBe(true)
  })

  it("PERMISSION PROBE: 'staff' (no sales.edit) is forbidden and the stage is unchanged", async () => {
    roleHolder.role = 'staff'
    const res = await POST(req(), params())
    expect(res.status).toBe(403)
    expect(h.capture.updates.some((u) => u.table === 'deals')).toBe(false)
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/deals/manual — permission gate.
 *
 * BUG (fixed here): manual lead/deal creation (operator-side) only called
 * getTenantForRequest() (proves tenant membership at ANY role) with zero
 * permission check. rbac.ts grants 'sales.edit' to owner/admin/manager only
 * — before this fix a 'staff' session could create arbitrary deals (and the
 * client rows backing them) directly via the API.
 *
 * FIX: requirePermission('sales.edit'), matching deals/route.ts's POST.
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

vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => ({ success: true })) }))
const { ownerAlert } = vi.hoisted(() => ({ ownerAlert: vi.fn(async () => {}) }))
vi.mock('@/lib/messaging/owner-alerts', () => ({ ownerAlert }))

import { POST } from './route'

function seed() {
  return { clients: [], deals: [], deal_activities: [] }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  roleHolder.role = 'owner'
  ownerAlert.mockClear()
})

function req() {
  return new Request('http://t', {
    method: 'POST',
    body: JSON.stringify({ name: 'Jeff Tucker', phone: '5551234567', email: 'jeff@example.com' }),
  })
}

describe('POST /api/deals/manual — permission probe', () => {
  it('owner (has sales.edit) can create a manual lead/deal', async () => {
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(h.capture.inserts.some((i) => i.table === 'deals')).toBe(true)
  })

  it("PERMISSION PROBE: 'staff' (no sales.edit) is forbidden and nothing is created", async () => {
    roleHolder.role = 'staff'
    const res = await POST(req())
    expect(res.status).toBe(403)
    expect(h.capture.inserts.some((i) => i.table === 'deals')).toBe(false)
    expect(h.capture.inserts.some((i) => i.table === 'clients')).toBe(false)
  })
})

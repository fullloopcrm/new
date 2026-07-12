import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — GET /api/finance/pending (converted to tenantDb).
 *
 * The pending-payments list reads `bookings` through tenantDb, so a foreign
 * tenant's unpaid/unpaid-cleaner booking never surfaces in another tenant's
 * pending queue.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

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
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: A, tenant: { id: A }, role: 'owner' })),
  }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: A, tenant: { id: A }, role: 'owner', userId: 'u1' },
    error: null,
  })),
}))

import { GET } from './route'

function seed() {
  return {
    bookings: [
      { id: 'bk-a1', tenant_id: A, status: 'completed', price: 100, team_member_pay: 40, actual_hours: 2, payment_status: 'unpaid', team_member_paid: false, start_time: '2026-01-02' },
      { id: 'bk-b1', tenant_id: B, status: 'completed', price: 999, team_member_pay: 400, actual_hours: 9, payment_status: 'unpaid', team_member_paid: false, start_time: '2026-01-03' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('finance/pending — tenant isolation', () => {
  it("lists only the acting tenant's pending bookings, never a foreign tenant's", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = (body as Array<{ id: string }>).map((b) => b.id)
    expect(ids).toEqual(['bk-a1'])
    expect(ids).not.toContain('bk-b1')
  })
})

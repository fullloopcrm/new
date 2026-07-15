import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — GET /api/clients/stats (converted to tenantDb).
 *
 * Every count/aggregate reads `clients`/`bookings` through tenantDb, so a foreign
 * tenant's clients and paid bookings never inflate the acting tenant's totals or
 * revenue.
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

import { GET } from './route'

function seed() {
  return {
    clients: [
      { id: 'cli-a1', tenant_id: A, status: 'active', source: 'referral', created_at: '2020-01-01' },
      { id: 'cli-a2', tenant_id: A, status: 'inactive', source: 'web', created_at: '2020-01-01' },
      { id: 'cli-b1', tenant_id: B, status: 'active', source: 'referral', created_at: '2020-01-01' },
    ],
    bookings: [
      { id: 'bk-a', tenant_id: A, price: 100, client_id: 'cli-a1', payment_status: 'paid' },
      { id: 'bk-b', tenant_id: B, price: 999, client_id: 'cli-b1', payment_status: 'paid' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('clients/stats — tenant isolation', () => {
  it("counts and revenue exclude a foreign tenant's clients and paid bookings", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    // 2 tenant-A clients only (tenant-B's cli-b1 excluded).
    expect(body.total).toBe(2)
    expect(body.active).toBe(1)
    // Only tenant A's paid booking (100) — tenant B's 999 must not leak in.
    expect(body.totalRevenue).toBe(100)
    expect(body.avgLtv).toBe(100)
  })
})

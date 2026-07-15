import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — GET /api/clients/analytics (converted to tenantDb).
 *
 * LTV + lifecycle metrics are derived from completed `bookings` read through
 * tenantDb, so a foreign tenant's completed bookings never contribute a client
 * row, inflate totalLtv, or move the lifecycle counts in another tenant's
 * analytics. `getSettings` is stubbed so the probe needs no settings seed.
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

vi.mock('@/lib/settings', () => ({
  getSettings: vi.fn(async () => ({ active_client_threshold_days: 30, at_risk_threshold_days: 90 })),
}))

import { GET } from './route'

function seed() {
  const recent = new Date().toISOString()
  return {
    bookings: [
      { id: 'bk-a1', tenant_id: A, client_id: 'cl-a', price: 100, status: 'completed', start_time: recent, clients: { name: 'Client A' } },
      { id: 'bk-a2', tenant_id: A, client_id: 'cl-a', price: 250, status: 'completed', start_time: recent, clients: { name: 'Client A' } },
      { id: 'bk-b1', tenant_id: B, client_id: 'cl-b', price: 999, status: 'completed', start_time: recent, clients: { name: 'Client B' } },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('clients/analytics — tenant isolation', () => {
  it("client LTV rows and summary exclude a foreign tenant's bookings", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()

    const ids = (body.clients as Array<{ client_id: string }>).map((c) => c.client_id)
    expect(ids).toEqual(['cl-a'])
    expect(ids).not.toContain('cl-b')

    expect(body.summary.totalClients).toBe(1)
    // A's two completed bookings (100 + 250); B's 999 must not leak in.
    expect(body.summary.totalLtv).toBe(350)
  })
})

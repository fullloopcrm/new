import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — /api/deals/at-risk (converted to tenantDb).
 *
 * GET buckets active clients using three tenant-scoped reads (clients,
 * bookings, deals) — a foreign tenant's client, bookings, and deals must never
 * appear or influence the buckets. POST outreach actions update `clients`
 * through tenantDb, so a foreign client_id matches no row (no cross-tenant write).
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

import { GET, POST } from './route'

function seed() {
  return {
    clients: [
      { id: 'cl-a1', tenant_id: A, name: 'Client A', email: null, phone: null, address: null, status: 'active', created_at: '2026-01-01', do_not_service: false, last_outreach_at: null, outreach_count: 0, outreach_status: 'none' },
      { id: 'cl-b1', tenant_id: B, name: 'Client B', email: null, phone: null, address: null, status: 'active', created_at: '2026-01-02', do_not_service: false, last_outreach_at: null, outreach_count: 0, outreach_status: 'none' },
    ],
    bookings: [
      { id: 'bk-b1', tenant_id: B, client_id: 'cl-b1', start_time: '2026-01-01', status: 'completed', price: 500 },
    ],
    deals: [
      { id: 'dl-b1', tenant_id: B, client_id: 'cl-b1', status: 'active' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('deals/at-risk — tenant isolation', () => {
  it("GET never surfaces a foreign tenant's client, bookings, or deals", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.totalClients).toBe(1)
    const allShown = [...body.workable, ...body.withUpcoming, ...body.onBoard].map((c: { id: string }) => c.id)
    expect(allShown).toEqual(['cl-a1'])
    expect(allShown).not.toContain('cl-b1')

    // Client A has zero bookings/deals of its own; A must land in `workable`
    // (foreign B booking/deal must NOT flip A to withUpcoming/onBoard).
    expect(body.workable.map((c: { id: string }) => c.id)).toEqual(['cl-a1'])
    expect(body.onBoard).toEqual([])
  })

  it('POST outreach cannot touch a foreign tenant client', async () => {
    const req = new Request('http://t/api/deals/at-risk', {
      method: 'POST',
      body: JSON.stringify({ client_id: 'cl-b1', action: 'touch', current_count: 0 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200) // route reports success even on no-op

    // No client row was actually updated (foreign id filtered out by tenant scope).
    const clientUpdates = h.capture.updates.filter((u) => u.table === 'clients')
    expect(clientUpdates.every((u) => u.matched.length === 0)).toBe(true)

    // Foreign row is untouched.
    const foreign = h.seed.clients.find((c) => c.id === 'cl-b1')!
    expect(foreign.outreach_status).toBe('none')
    expect(foreign.outreach_count).toBe(0)
  })
})

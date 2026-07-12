import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — /api/bookings/[id]/status (PATCH, converted to tenantDb).
 *
 * The booking lookup + update + mirrored-deal sync now all run through
 * tenantDb, so a booking id belonging to a FOREIGN tenant resolves to "Not
 * found" (404) and neither the booking nor any deal is ever touched.
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

vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { PATCH } from './route'

function seed() {
  return {
    bookings: [
      { id: 'bk-a1', tenant_id: A, status: 'pending' },
      { id: 'bk-b1', tenant_id: B, status: 'pending' },
    ],
    deals: [
      { id: 'deal-a1', tenant_id: A, booking_id: 'bk-a1', mode: 'booking', stage: 'quoted' },
      { id: 'deal-b1', tenant_id: B, booking_id: 'bk-b1', mode: 'booking', stage: 'quoted' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}
function req(status: string) {
  return new Request('http://t', { method: 'PATCH', body: JSON.stringify({ status }) })
}

describe('bookings/[id]/status — tenant isolation', () => {
  it("PATCH transitions the acting tenant's own booking and syncs its mirror deal", async () => {
    const res = await PATCH(req('scheduled'), params('bk-a1'))
    expect(res.status).toBe(200)

    const own = h.seed.bookings.find((b) => b.id === 'bk-a1')!
    expect(own.status).toBe('scheduled')
    const ownDeal = h.seed.deals.find((d) => d.id === 'deal-a1')!
    expect(ownDeal.stage).toBe('sold')
  })

  it("WRONG-TENANT PROBE: PATCH against a foreign tenant's booking id returns 404, nothing changes", async () => {
    const res = await PATCH(req('scheduled'), params('bk-b1'))
    expect(res.status).toBe(404)

    const foreign = h.seed.bookings.find((b) => b.id === 'bk-b1')!
    expect(foreign.status).toBe('pending')
    const foreignDeal = h.seed.deals.find((d) => d.id === 'deal-b1')!
    expect(foreignDeal.stage).toBe('quoted')
  })

  it('rejects an invalid transition before writing', async () => {
    const res = await PATCH(req('paid'), params('bk-a1'))
    expect(res.status).toBe(400)
    const own = h.seed.bookings.find((b) => b.id === 'bk-a1')!
    expect(own.status).toBe('pending')
  })
})

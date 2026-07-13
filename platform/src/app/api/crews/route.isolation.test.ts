import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — GET /api/crews (converted to tenantDb).
 *
 * A crew belonging to another tenant must never appear in the caller tenant's
 * list. (crew_members is an un-scoped join table by design — see the route's
 * own note — but the crew row itself is tenant-scoped through tenantDb.)
 */

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'

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
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: CTX_TENANT,
      tenant: { id: CTX_TENANT },
      role: 'owner',
    })),
  }
})

import { GET, DELETE } from './route'

function seed() {
  return {
    crews: [
      { id: 'crew-a', tenant_id: CTX_TENANT, name: 'Alpha', color: null, active: true, crew_members: [] },
      { id: 'crew-b', tenant_id: OTHER_TENANT, name: 'Bravo', color: null, active: true, crew_members: [] },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('crews GET — tenant isolation', () => {
  it('wrong-tenant probe: only the caller tenant\'s crews are listed', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    const names = body.crews.map((c: { name: string }) => c.name)
    expect(names).toContain('Alpha')
    expect(names).not.toContain('Bravo')
    const ids = body.crews.map((c: { id: string }) => c.id)
    expect(ids).not.toContain('crew-b')
  })
})

// Regression: DELETE used to report `{ ok: true }` unconditionally even when
// the tenant filter silently matched zero rows for a foreign id — same
// response-honesty bug class as the admin/ai-chat update/cancel_bookings fix.
// Fixed by chaining `.select('id')` on the delete and checking the match count.
describe('crews DELETE — tenant isolation', () => {
  it('wrong-tenant probe: deleting a foreign tenant crew reports 404, not ok:true', async () => {
    const res = await DELETE(new Request('http://t/api/crews?id=crew-b', { method: 'DELETE' }))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.ok).not.toBe(true)
    expect(h.seed.crews.some((c) => c.id === 'crew-b')).toBe(true)
  })

  it("deleting the acting tenant's own crew reports ok:true and actually removes it", async () => {
    const res = await DELETE(new Request('http://t/api/crews?id=crew-a', { method: 'DELETE' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(h.seed.crews.some((c) => c.id === 'crew-a')).toBe(false)
  })
})

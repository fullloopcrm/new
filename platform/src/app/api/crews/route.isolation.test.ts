import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness, type Row } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — /api/crews (converted to tenantDb).
 *
 * A crew belonging to another tenant must never appear in the caller tenant's
 * list, must never be mutated by that tenant's PATCH/DELETE, and a new crew
 * must always be stamped with the authenticated tenant. `crew_members` is an
 * un-scoped join table by design (no tenant_id column of its own — see the
 * route's own note), so PATCH must 404 on a foreign crew id BEFORE calling
 * setMembers(), or a caller could wipe and repopulate another tenant's crew
 * roster (deploy-prep/cross-tenant-leak-register.md P0).
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

import { GET, POST, PATCH, DELETE } from './route'

function seed() {
  return {
    crews: [
      { id: 'crew-a', tenant_id: CTX_TENANT, name: 'Alpha', color: null, active: true, crew_members: [] },
      { id: 'crew-b', tenant_id: OTHER_TENANT, name: 'Bravo', color: null, active: true, crew_members: [] },
    ],
    crew_members: [
      { crew_id: 'crew-b', team_member_id: 'tm-b' },
    ],
    team_members: [
      { id: 'tm-a', tenant_id: CTX_TENANT, name: 'A Worker' },
      { id: 'tm-b', tenant_id: OTHER_TENANT, name: 'B Worker' },
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

describe('crews POST — tenantDb stamping', () => {
  it('stamps the new crew with the authenticated tenant', async () => {
    const req = new Request('http://x/api/crews', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Crew' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    const insert = h.capture.inserts.find((i) => i.table === 'crews' && i.rows.some((r) => r.id === body.id))
    expect(insert?.rows[0]?.tenant_id).toBe(CTX_TENANT)
  })
})

describe("crews PATCH — CANNOT touch another tenant's crew or its roster (fixed IDOR)", () => {
  it("404s on a foreign tenant's crew id BEFORE calling setMembers — B's crew_members survive untouched", async () => {
    const req = new Request('http://x/api/crews', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'crew-b', name: 'HACKED', member_ids: ['tm-a'] }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(404)

    // B's crew row must be untouched.
    const bCrew = h.seed.crews.find((r: Row) => r.id === 'crew-b')!
    expect(bCrew.name).toBe('Bravo')

    // B's crew_members must be untouched — this is the actual exploit this
    // test guards: before the fix, setMembers() ran unconditionally and would
    // have deleted this row and inserted tenant A's team member instead.
    expect(h.seed.crew_members).toEqual([{ crew_id: 'crew-b', team_member_id: 'tm-b' }])
  })

  it('a genuine PATCH on the authenticated tenant\'s own crew still replaces members normally (positive control)', async () => {
    h.seed.crew_members.push({ crew_id: 'crew-a', team_member_id: 'tm-a' })
    const req = new Request('http://x/api/crews', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'crew-a', name: 'Crew A Renamed', member_ids: ['tm-a'] }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    expect(h.seed.crews.find((r: Row) => r.id === 'crew-a')!.name).toBe('Crew A Renamed')
    expect(h.seed.crew_members.filter((m: Row) => m.crew_id === 'crew-a')).toMatchObject([{ crew_id: 'crew-a', team_member_id: 'tm-a' }])
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
    expect(h.seed.crews.some((c: Row) => c.id === 'crew-b')).toBe(true)
  })

  it("deleting the acting tenant's own crew reports ok:true and actually removes it", async () => {
    const res = await DELETE(new Request('http://t/api/crews?id=crew-a', { method: 'DELETE' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(h.seed.crews.some((c: Row) => c.id === 'crew-a')).toBe(false)
  })
})

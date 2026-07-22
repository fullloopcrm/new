import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * PUT /api/team/[id] -- regression for the post-nycmaid-cutover profile
 * rebuild. The smart scheduler (lib/smart-schedule.ts) reads address,
 * has_car, labor_only, service_zones, max_travel_minutes, schedule,
 * working_days, home_by_time directly off team_members; this allowlist is
 * what actually lets the admin profile page write real values into those
 * columns instead of them staying null forever.
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

const auditSpy = vi.hoisted(() => vi.fn(async () => {}))

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: 'tenant-A',
      tenant: { id: 'tenant-A' },
      role: 'owner',
    })),
  }
})
vi.mock('@/lib/audit', () => ({ audit: auditSpy }))

import { GET, PUT, DELETE } from './route'

const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })
const paramsFor = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  h.seq = 0
  auditSpy.mockClear()
  h.store = {
    team_members: [
      {
        id: 'tm-1', tenant_id: 'tenant-A', name: 'Gloria', address: null,
        has_car: false, labor_only: false, service_zones: [], working_days: null,
        schedule: null, home_by_time: null, max_travel_minutes: null,
      },
    ],
  }
})

describe('PUT /api/team/[id] -- smart-scheduling profile fields', () => {
  it('persists address, transportation, service-zone, and schedule fields', async () => {
    const res = await PUT(putReq({
      address: '128 Vermont St, Brooklyn, NY',
      has_car: true,
      labor_only: false,
      service_zones: ['brooklyn', 'queens'],
      max_travel_minutes: 45,
      working_days: ['1', '2', '3'],
      schedule: { '1': { start: '08:00', end: '17:00' } },
      home_by_time: '18:00',
    }), paramsFor('tm-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.member.address).toBe('128 Vermont St, Brooklyn, NY')
    expect(body.member.has_car).toBe(true)
    expect(body.member.service_zones).toEqual(['brooklyn', 'queens'])
    expect(body.member.max_travel_minutes).toBe(45)
    expect(body.member.working_days).toEqual(['1', '2', '3'])
    expect(body.member.home_by_time).toBe('18:00')
    expect(auditSpy).toHaveBeenCalledWith(expect.objectContaining({ action: 'team.updated', entityId: 'tm-1' }))
  })

  it('ignores fields not on the allowlist (no schema-breaking writes)', async () => {
    const res = await PUT(putReq({ tenant_id: 'tenant-B', id: 'someone-else', not_a_real_field: 'x' }), paramsFor('tm-1'))
    expect(res.status).toBe(200)
    const stored = h.store.team_members.find((m) => m.id === 'tm-1')
    expect(stored?.tenant_id).toBe('tenant-A') // unchanged -- tenant_id is not in the allowlist
    expect(stored?.not_a_real_field).toBeUndefined()
  })
})

describe('GET /api/team/[id]', () => {
  it('returns the full row including the smart-scheduling fields', async () => {
    h.store.team_members[0].address = '150 W 47th St, New York, NY'
    const res = await GET(new Request('http://x'), paramsFor('tm-1'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.member.address).toBe('150 W 47th St, New York, NY')
  })
})

describe('DELETE /api/team/[id]', () => {
  it('removes the row and audits the deletion', async () => {
    const res = await DELETE(new Request('http://x'), paramsFor('tm-1'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(h.store.team_members.find((m) => m.id === 'tm-1')).toBeUndefined()
    expect(auditSpy).toHaveBeenCalledWith(expect.objectContaining({ action: 'team.deleted', entityId: 'tm-1' }))
  })
})

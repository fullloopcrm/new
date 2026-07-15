import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — cross-tenant foreign-key injection on POST /api/routes.
 *
 * This route is UNCONVERTED (raw `supabaseAdmin`, not `tenantDb`).
 *
 * BUG (fixed here): `body.team_member_id` was only looked up (and therefore
 * only ever verified tenant-owned) when start_latitude/start_longitude were
 * BOTH missing from the body — the insert itself always used
 * `body.team_member_id` verbatim, unverified, regardless of whether the
 * lookup ran or what it found. `team_members` has no cross-tenant FK check,
 * and `GET /api/routes` embeds `team_members(id, name, phone,
 * home_latitude, home_longitude)` unscoped by tenant off this row's FK — so
 * a foreign team_member_id would surface another tenant's employee name/
 * phone/home address back on the very next read.
 *
 * FIX: `body.team_member_id`, when supplied, is now always verified
 * tenant-owned before insert (independent of whether start lat/lng were also
 * supplied); a miss 404s before any row is written.
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

import { POST } from './route'

function seed() {
  return {
    routes: [] as Record<string, unknown>[],
    team_members: [
      { id: 'tm-a', tenant_id: CTX_TENANT, home_latitude: 40.1, home_longitude: -73.1, address: '1 A St' },
      { id: 'tm-b', tenant_id: OTHER_TENANT, name: 'Victim Employee', phone: '555-0000', home_latitude: 41.2, home_longitude: -74.2, address: '9 B Ave' },
    ],
    tenants: [{ id: CTX_TENANT, hq_latitude: 40.0, hq_longitude: -73.0, address: 'HQ' }],
    bookings: [],
  }
}

function postReq(body: unknown): Request {
  return { url: 'http://x/api/routes', json: async () => body } as unknown as Request
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('routes POST — cross-tenant team_member_id FK injection fixed', () => {
  it('LOCKED: a foreign team_member_id 404s before any route is inserted', async () => {
    const res = await POST(postReq({ route_date: '2026-08-01', team_member_id: 'tm-b' }))
    expect(res.status).toBe(404)
    expect(h.capture.inserts.find((i) => i.table === 'routes')).toBeUndefined()
  })

  it('LOCKED: a foreign team_member_id 404s even when start_latitude/start_longitude are ALSO supplied (previously skipped the lookup entirely)', async () => {
    const res = await POST(
      postReq({ route_date: '2026-08-01', team_member_id: 'tm-b', start_latitude: 41.2, start_longitude: -74.2 }),
    )
    expect(res.status).toBe(404)
    expect(h.capture.inserts.find((i) => i.table === 'routes')).toBeUndefined()
  })

  it('CONTROL: an own-tenant team_member_id still creates the route with that member\'s home as the start point', async () => {
    const res = await POST(postReq({ route_date: '2026-08-01', team_member_id: 'tm-a' }))
    expect(res.status).toBe(200)
    const row = h.capture.inserts.find((i) => i.table === 'routes')!.rows[0]
    expect(row.team_member_id).toBe('tm-a')
    expect(row.start_latitude).toBe(40.1)
    expect(row.start_longitude).toBe(-73.1)
  })

  it('CONTROL: omitting team_member_id falls back to tenant HQ and creates the route', async () => {
    const res = await POST(postReq({ route_date: '2026-08-01' }))
    expect(res.status).toBe(200)
    const row = h.capture.inserts.find((i) => i.table === 'routes')!.rows[0]
    expect(row.team_member_id).toBeNull()
    expect(row.start_latitude).toBe(40.0)
  })
})

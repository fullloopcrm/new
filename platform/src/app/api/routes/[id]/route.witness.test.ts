import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — cross-tenant foreign-key injection on PATCH /api/routes/[id].
 *
 * BUG (fixed here): `team_member_id` was in the PATCH `assignables` allow-list
 * with zero tenant-ownership check, unlike POST /api/routes (which already
 * verifies this exact FK — see ./route.witness.test.ts one level up).
 * `team_members` has no cross-tenant FK constraint, and both GET /api/routes
 * and GET /api/routes/[id] embed `team_members(id, name, phone,
 * home_latitude, home_longitude)` unscoped by tenant off this column — so a
 * foreign team_member_id written via PATCH would surface another tenant's
 * employee name/phone/home address on the next read (and POST
 * /api/routes/[id]/publish would text that foreign employee via this
 * tenant's own Telnyx account).
 *
 * FIX: `team_member_id`, when supplied and non-null, is now verified
 * tenant-owned before the update; a miss 404s before any row is written.
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

import { PATCH } from './route'

function seed() {
  return {
    routes: [{ id: 'route-1', tenant_id: CTX_TENANT, team_member_id: null, status: 'draft', stops: [] }],
    team_members: [
      { id: 'tm-a', tenant_id: CTX_TENANT, name: 'Own Employee', phone: '555-1111' },
      { id: 'tm-b', tenant_id: OTHER_TENANT, name: 'Victim Employee', phone: '555-0000' },
    ],
    bookings: [],
  }
}

function patchReq(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

function ctx() {
  return { params: Promise.resolve({ id: 'route-1' }) }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('routes PATCH [id] — cross-tenant team_member_id FK injection fixed', () => {
  it('LOCKED: a foreign team_member_id 404s before the route is updated', async () => {
    const res = await PATCH(patchReq({ team_member_id: 'tm-b' }), ctx())
    expect(res.status).toBe(404)
    expect(h.capture.updates.find((u) => u.table === 'routes')).toBeUndefined()
  })

  it('CONTROL: an own-tenant team_member_id still updates the route', async () => {
    const res = await PATCH(patchReq({ team_member_id: 'tm-a' }), ctx())
    expect(res.status).toBe(200)
    const upd = h.capture.updates.find((u) => u.table === 'routes')!
    expect(upd.values.team_member_id).toBe('tm-a')
  })

  it('CONTROL: unrelated fields (status) still update without touching team_member_id', async () => {
    const res = await PATCH(patchReq({ status: 'optimized' }), ctx())
    expect(res.status).toBe(200)
    const upd = h.capture.updates.find((u) => u.table === 'routes')!
    expect(upd.values.status).toBe('optimized')
    expect('team_member_id' in upd.values).toBe(false)
  })

  it('CONTROL: explicitly clearing team_member_id (null) is allowed with no ownership lookup', async () => {
    const res = await PATCH(patchReq({ team_member_id: null }), ctx())
    expect(res.status).toBe(200)
    const upd = h.capture.updates.find((u) => u.table === 'routes')!
    expect(upd.values.team_member_id).toBeNull()
  })
})

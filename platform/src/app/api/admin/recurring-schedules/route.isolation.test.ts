import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — GET /api/admin/recurring-schedules (converted to tenantDb).
 *
 * The list SELECT runs through tenantDb (`.eq('tenant_id', ctx)`), so a recurring
 * schedule owned by ANOTHER tenant must never appear in the response. The
 * per-schedule "next booking" sub-query is also tenant-scoped. This is the
 * wrong-tenant probe on a list route.
 */

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  })),
}))

// POST-only dep — mocked so importing the route doesn't pull the real token lib.
vi.mock('@/lib/tokens', () => ({ generateToken: () => 'tok' }))

import { GET, POST } from './route'

function seed() {
  return {
    recurring_schedules: [
      { id: 'rs-a', tenant_id: CTX_TENANT, client_id: 'c-a', recurring_type: 'weekly', created_at: '2026-01-02' },
      { id: 'rs-b', tenant_id: OTHER_TENANT, client_id: 'c-b', recurring_type: 'weekly', created_at: '2026-01-01' },
    ],
    clients: [
      { id: 'c-a', tenant_id: CTX_TENANT },
    ],
    team_members: [
      { id: 'tm-a1', tenant_id: CTX_TENANT },
      { id: 'tm-b1', tenant_id: OTHER_TENANT },
    ],
    client_properties: [
      { id: 'prop-a', tenant_id: CTX_TENANT, client_id: 'c-a' },
      { id: 'prop-b', tenant_id: OTHER_TENANT, client_id: 'c-b' },
    ],
    bookings: [],
  }
}

function postReq(body: unknown): Request {
  return { url: 'http://t/api/admin/recurring-schedules', json: async () => body } as unknown as Request
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('admin/recurring-schedules GET — tenant isolation', () => {
  it("wrong-tenant probe: list excludes the foreign tenant's schedule", async () => {
    const res = await GET(new Request('http://t/api/admin/recurring-schedules'))
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = (body as Array<{ id: string }>).map((s) => s.id)
    expect(ids).toContain('rs-a')
    expect(ids).not.toContain('rs-b')
  })
})

/**
 * POST — cross-tenant team_member_id / cleaner_id regression test.
 *
 * BUG (fixed here): a caller-supplied `team_member_id` (or its `cleaner_id`
 * alias) was written straight into the new `recurring_schedules` row AND
 * every generated `bookings` row, with no check that it belonged to the
 * acting tenant. Same bug class as [id]/route.ts PUT and
 * [id]/exception/route.ts POST — team_members has no cross-tenant FK check.
 */
describe('admin/recurring-schedules POST — cross-tenant team_member_id guard', () => {
  it('cross-tenant team_member_id probe: rejects a foreign team member id with 400', async () => {
    const res = await POST(postReq({
      client_id: 'c-a', team_member_id: 'tm-b1', recurring_type: 'weekly', start_date: '2026-08-10',
    }))
    expect(res.status).toBe(400)
    const insert = h.capture.inserts.find((i) => i.table === 'recurring_schedules')
    expect(insert).toBeUndefined()
  })

  it('cross-tenant cleaner_id alias probe: also rejects a foreign id with 400', async () => {
    const res = await POST(postReq({
      client_id: 'c-a', cleaner_id: 'tm-b1', recurring_type: 'weekly', start_date: '2026-08-10',
    }))
    expect(res.status).toBe(400)
    const insert = h.capture.inserts.find((i) => i.table === 'recurring_schedules')
    expect(insert).toBeUndefined()
  })

  it('same-tenant team_member_id succeeds', async () => {
    const res = await POST(postReq({
      client_id: 'c-a', team_member_id: 'tm-a1', recurring_type: 'weekly', start_date: '2026-08-10', dates: ['2026-08-10'],
    }))
    expect(res.status).toBe(200)
    const insert = h.capture.inserts.find((i) => i.table === 'recurring_schedules')
    expect(insert?.rows[0]?.team_member_id).toBe('tm-a1')
  })
})

/**
 * POST — cross-tenant property_id regression test.
 *
 * BUG (fixed here): a caller-supplied `property_id` was written straight into
 * the new `recurring_schedules` row AND every generated `bookings` row, with
 * no check that it belonged to the acting tenant's client. client_properties
 * has its own tenant_id and no cross-tenant FK check; GET /api/bookings embeds
 * client_properties(*) unscoped by tenant off bookings.property_id, so a
 * foreign id here would leak another tenant's client address/lat-long. Same
 * guard already applied to POST /api/client/recurring.
 */
describe('admin/recurring-schedules POST — cross-tenant property_id guard', () => {
  it('cross-tenant property_id probe: rejects a foreign tenant\'s property with 400', async () => {
    const res = await POST(postReq({
      client_id: 'c-a', property_id: 'prop-b', recurring_type: 'weekly', start_date: '2026-08-10',
    }))
    expect(res.status).toBe(400)
    const insert = h.capture.inserts.find((i) => i.table === 'recurring_schedules')
    expect(insert).toBeUndefined()
  })

  it('same-tenant property_id succeeds and is stamped on the schedule + generated bookings', async () => {
    const res = await POST(postReq({
      client_id: 'c-a', property_id: 'prop-a', recurring_type: 'weekly', start_date: '2026-08-10', dates: ['2026-08-10'],
    }))
    expect(res.status).toBe(200)
    const scheduleInsert = h.capture.inserts.find((i) => i.table === 'recurring_schedules')
    expect(scheduleInsert?.rows[0]?.property_id).toBe('prop-a')
    const bookingInsert = h.capture.inserts.find((i) => i.table === 'bookings')
    expect(bookingInsert?.rows[0]?.property_id).toBe('prop-a')
  })
})

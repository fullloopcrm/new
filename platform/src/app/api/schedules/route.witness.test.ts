import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — cross-tenant FK injection on POST /api/schedules. FIXED.
 *
 * Converted route (tenantDb), but tenantDb only stamps/filters the ROW's OWN
 * tenant_id on insert — it does not validate a caller-supplied client_id/
 * team_member_id FK belongs to this tenant. GET /api/schedules embeds
 * clients(name)/team_members(name) unscoped by tenant off these FKs, and every
 * generated booking below carries the same foreign id, which GET /api/bookings
 * then embeds with full client/team-member PII (name/phone/address) — same
 * exfil class as the already-fixed POST /api/bookings (register P1) and
 * POST /api/admin/recurring-schedules (team_member_id guard).
 *
 * LOCKED: these assertions prove the ownership guards fire.
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

// validate() is pure; stub it to pass the schema keys straight through
// (readable ids instead of real UUIDs) so we drive the exact fields under test.
vi.mock('@/lib/validate', () => ({
  validate: (body: Record<string, unknown>, schema: Record<string, unknown>) => {
    const data: Record<string, unknown> = {}
    for (const k of Object.keys(schema)) if (body[k] !== undefined) data[k] = body[k]
    return { data, error: null }
  },
}))

vi.mock('@/lib/audit', () => ({ audit: async () => {} }))

import { POST } from './route'

function seed() {
  return {
    recurring_schedules: [] as Record<string, unknown>[],
    bookings: [] as Record<string, unknown>[],
    clients: [
      { id: 'client-a', tenant_id: CTX_TENANT, name: 'A-Client' },
      { id: 'client-b', tenant_id: OTHER_TENANT, name: 'B-Client' },
    ],
    team_members: [
      { id: 'tm-a', tenant_id: CTX_TENANT, name: 'A-Member' },
      { id: 'tm-b', tenant_id: OTHER_TENANT, name: 'B-Member' },
    ],
    service_types: [] as Record<string, unknown>[],
  }
}

function postReq(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('schedules POST — cross-tenant FK injection LOCKED', () => {
  it('LOCKED: a foreign client_id 404s before any schedule is inserted', async () => {
    const res = await POST(postReq({ client_id: 'client-b', recurring_type: 'weekly' }))
    expect(res.status).toBe(404)
    expect(h.capture.inserts.find((i) => i.table === 'recurring_schedules')).toBeUndefined()
  })

  it('LOCKED: a foreign team_member_id 404s before any schedule is inserted', async () => {
    const res = await POST(postReq({ client_id: 'client-a', team_member_id: 'tm-b', recurring_type: 'weekly' }))
    expect(res.status).toBe(404)
    expect(h.capture.inserts.find((i) => i.table === 'recurring_schedules')).toBeUndefined()
  })

  it('CONTROL: own-tenant client_id + team_member_id still create a schedule + bookings', async () => {
    const res = await POST(postReq({ client_id: 'client-a', team_member_id: 'tm-a', recurring_type: 'weekly' }))
    expect(res.status).toBe(201)
    const schedule = h.capture.inserts.find((i) => i.table === 'recurring_schedules')!.rows[0]
    expect(schedule.client_id).toBe('client-a')
    expect(schedule.team_member_id).toBe('tm-a')
    const bookingInsert = h.capture.inserts.find((i) => i.table === 'bookings')
    expect(bookingInsert).toBeDefined()
    expect(bookingInsert!.rows[0].client_id).toBe('client-a')
  })
})

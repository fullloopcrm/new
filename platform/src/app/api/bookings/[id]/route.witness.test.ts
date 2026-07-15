import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — cross-tenant client_id/team_member_id/service_type_id FK injection
 * on PUT /api/bookings/[id].
 *
 * UNCONVERTED route (raw `supabaseAdmin`). Unlike POST /api/bookings (register
 * P1, already fixed), this PUT accepted all three FKs via `pick(body, [...])`
 * with NO ownership check before the update. Worse than a dangling reference:
 * the route's OWN response — `.select('*, clients(name, phone, address,
 * email), team_members!bookings_team_member_id_fkey(name, phone)')` — embeds
 * the joined row directly, so a foreign id leaks another tenant's client/
 * team-member PII in the very same PUT response (and every subsequent GET).
 *
 * FIXED: client_id, team_member_id, and service_type_id are now each verified
 * tenant-owned before the update runs; 404 on any miss. Same guard as POST.
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
  return { AuthError, getTenantForRequest: vi.fn() }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  })),
}))

vi.mock('@/lib/audit', () => ({ audit: async () => {} }))
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => {} }))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: () => '' }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => '', reschedule: () => '' }) }))
vi.mock('@/lib/availability', () => ({ checkMemberDayOff: async () => ({ unavailable: false }) }))

import { PUT } from './route'

function seed() {
  return {
    bookings: [
      { id: 'bk-a', tenant_id: CTX_TENANT, status: 'draft', client_id: 'client-a', team_member_id: 'tm-a', service_type_id: 'svc-a', start_time: '2026-08-01T10:00:00Z' },
    ],
    clients: [
      { id: 'client-a', tenant_id: CTX_TENANT, name: 'A-Client', phone: null },
      { id: 'client-b', tenant_id: OTHER_TENANT, name: 'B-Client', phone: null },
    ],
    team_members: [
      { id: 'tm-a', tenant_id: CTX_TENANT, name: 'A-Member', phone: null },
      { id: 'tm-b', tenant_id: OTHER_TENANT, name: 'B-Member', phone: null },
    ],
    service_types: [
      { id: 'svc-a', tenant_id: CTX_TENANT, name: 'Alpha Standard Clean' },
      { id: 'svc-b', tenant_id: OTHER_TENANT, name: 'Bravo Deep Clean' },
    ],
    tenants: [{ id: CTX_TENANT, name: 'Alpha' }],
  }
}

function putReq(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}
function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('bookings/[id] PUT — FK injection WITNESS', () => {
  it('LOCK: a foreign client_id is rejected (400), booking untouched', async () => {
    const res = await PUT(putReq({ client_id: 'client-b' }), ctx('bk-a'))
    expect(res.status).toBe(400)
    const upd = h.capture.updates.find((u) => u.table === 'bookings')
    expect(upd).toBeFalsy()
    expect(h.seed.bookings.find((r) => r.id === 'bk-a')!.client_id).toBe('client-a')
  })

  it('LOCK: a foreign team_member_id is rejected (400), booking untouched', async () => {
    const res = await PUT(putReq({ team_member_id: 'tm-b' }), ctx('bk-a'))
    expect(res.status).toBe(400)
    const upd = h.capture.updates.find((u) => u.table === 'bookings')
    expect(upd).toBeFalsy()
    expect(h.seed.bookings.find((r) => r.id === 'bk-a')!.team_member_id).toBe('tm-a')
  })

  it('LOCK: a foreign service_type_id is rejected (400), booking untouched', async () => {
    const res = await PUT(putReq({ service_type_id: 'svc-b' }), ctx('bk-a'))
    expect(res.status).toBe(400)
    const upd = h.capture.updates.find((u) => u.table === 'bookings')
    expect(upd).toBeFalsy()
    expect(h.seed.bookings.find((r) => r.id === 'bk-a')!.service_type_id).toBe('svc-a')
  })

  it('CONTROL: explicit own-tenant FKs pass the ownership check and update the booking', async () => {
    const res = await PUT(putReq({ client_id: 'client-a', team_member_id: 'tm-a', service_type_id: 'svc-a', notes: 'Updated' }), ctx('bk-a'))
    expect(res.status).toBe(200)
    const upd = h.capture.updates.find((u) => u.table === 'bookings')
    expect(upd!.matched[0].notes).toBe('Updated')
  })

  it('CONTROL: omitting FKs still allows an unrelated field update', async () => {
    const res = await PUT(putReq({ notes: 'Renamed' }), ctx('bk-a'))
    expect(res.status).toBe(200)
    const upd = h.capture.updates.find((u) => u.table === 'bookings')
    expect(upd!.matched[0].notes).toBe('Renamed')
  })
})

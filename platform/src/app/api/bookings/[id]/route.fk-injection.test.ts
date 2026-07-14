/**
 * PUT /api/bookings/[id] — cross-tenant FK injection on client_id/
 * team_member_id/service_type_id (P9-P11 register, same class W2 found on
 * p1-w2/p1-w3). The route pick()ed these fields into the update payload with
 * only `.eq('tenant_id', tenantId)` on the WHERE clause -- nothing verified
 * the FK VALUES themselves belonged to the caller's tenant, so a caller with
 * legit edit access to their OWN booking could reassign it to another
 * tenant's client/team member/service type and exfiltrate that row's PII via
 * the clients()/team_members() joins on both this route's GET and this PUT's
 * own response.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
}))

vi.mock('@/lib/supabase', () => {
  const fake = makeSupabaseFake(h, { detachReads: true })
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...a: unknown[]) => h.requirePermission(...a) }))
vi.mock('@/lib/availability', () => ({ checkMemberDayOff: vi.fn(async () => ({ unavailable: false })) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ ok: true })) }))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: () => 'assigned' }))
vi.mock('@/lib/messaging/client-sms', () => ({
  clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => '', reschedule: () => '', cancellation: () => '' }),
}))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { PUT } from './route'

const TENANT_A = 'tenant-A'
const TENANT_B = 'tenant-B'

const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_A }, error: null }))
  h.store = {
    bookings: [{ id: 'book-1', tenant_id: TENANT_A, client_id: 'client-A1', team_member_id: 'tm-A1', status: 'scheduled', start_time: '2026-08-01T09:00:00' }],
    clients: [{ id: 'client-A1', tenant_id: TENANT_A, name: 'Pat A' }, { id: 'client-B1', tenant_id: TENANT_B, name: 'Pat B (secret)' }],
    team_members: [{ id: 'tm-A1', tenant_id: TENANT_A, name: 'Sam A' }, { id: 'tm-B1', tenant_id: TENANT_B, name: 'Sam B' }],
    service_types: [{ id: 'svc-A1', tenant_id: TENANT_A, name: 'Deep Clean' }],
    tenants: [{ id: TENANT_A, name: 'Acme', telnyx_api_key: null, telnyx_phone: null }],
  }
})

describe('PUT /api/bookings/[id] — cross-tenant FK injection', () => {
  it("rejects a client_id belonging to another tenant instead of writing it", async () => {
    const res = await PUT(putReq({ client_id: 'client-B1' }), params('book-1'))

    expect(res.status).toBe(400)
    expect(h.store.bookings[0].client_id).toBe('client-A1')
  })

  it("rejects a team_member_id belonging to another tenant", async () => {
    const res = await PUT(putReq({ team_member_id: 'tm-B1' }), params('book-1'))

    expect(res.status).toBe(400)
    expect(h.store.bookings[0].team_member_id).toBe('tm-A1')
  })

  it("rejects a service_type_id that doesn't belong to this tenant", async () => {
    const res = await PUT(putReq({ service_type_id: 'not-a-real-service-type' }), params('book-1'))

    expect(res.status).toBe(400)
  })

  it('still updates the booking when the FK genuinely belongs to the caller tenant', async () => {
    const res = await PUT(putReq({ client_id: 'client-A1', notes: 'updated' }), params('book-1'))

    expect(res.status).toBe(200)
    expect(h.store.bookings[0].notes).toBe('updated')
  })
})

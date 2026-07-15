import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * PUT /api/bookings/[id] previously wrote caller-supplied client_id /
 * team_member_id verbatim via pick() with no check that they belonged to
 * the authenticated tenant. The response (and every later GET) joins
 * clients(name, phone, address, email) / team_members(name, phone), so a
 * foreign id let a staff member of tenant A pull another tenant's client or
 * staff PII into their own booking — same class already fixed on booking
 * create (534a5834) and the booking team-update sibling route (5ead35e8).
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const OTHER_TENANT = 'cccccccc-9999-8888-7777-666666666666'
const OWN_CLIENT = 'dddddddd-0001-0001-0001-000000000001'
const FOREIGN_CLIENT = 'dddddddd-0002-0002-0002-000000000002'
const OWN_MEMBER = 'ffffffff-0001-0001-0001-000000000001'
const FOREIGN_MEMBER = 'ffffffff-0002-0002-0002-000000000002'
const BOOKING_ID = 'booking-1'

type Row = Record<string, any>

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Row[]>,
})) as unknown as FakeStoreHandle
const store = () => h.store

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))
vi.mock('@/lib/availability', () => ({ checkMemberDayOff: async () => ({ unavailable: false }) }))
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => {} }))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: () => '' }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({}) }))
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))

import { PUT as UPDATE } from '@/app/api/bookings/[id]/route'

function jsonReq(body: Row): Request {
  return new Request(`http://t.test/api/bookings/${BOOKING_ID}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PUT /api/bookings/[id] — client_id/team_member_id tenant scoping', () => {
  beforeEach(() => {
    h.seq = 0
    h.store = {
      bookings: [{ id: BOOKING_ID, tenant_id: TENANT, client_id: OWN_CLIENT, team_member_id: null, status: 'pending', start_time: '2026-08-01T10:00:00Z' }],
      tenants: [{ id: TENANT, name: 'Own Biz' }],
      clients: [
        { id: OWN_CLIENT, tenant_id: TENANT, name: 'Own Client' },
        { id: FOREIGN_CLIENT, tenant_id: OTHER_TENANT, name: 'Foreign Client' },
      ],
      team_members: [
        { id: OWN_MEMBER, tenant_id: TENANT, name: 'Own Member' },
        { id: FOREIGN_MEMBER, tenant_id: OTHER_TENANT, name: 'Foreign Member' },
      ],
    }
  })

  it('rejects a client_id belonging to another tenant', async () => {
    const res = await UPDATE(jsonReq({ client_id: FOREIGN_CLIENT }), { params: Promise.resolve({ id: BOOKING_ID }) })
    expect(res.status).toBe(400)
    expect(store().bookings[0].client_id).toBe(OWN_CLIENT)
  })

  it('rejects a team_member_id belonging to another tenant', async () => {
    const res = await UPDATE(jsonReq({ team_member_id: FOREIGN_MEMBER }), { params: Promise.resolve({ id: BOOKING_ID }) })
    expect(res.status).toBe(400)
    expect(store().bookings[0].team_member_id).toBe(null)
  })

  it('accepts a client_id/team_member_id belonging to the authenticated tenant', async () => {
    const res = await UPDATE(jsonReq({ team_member_id: OWN_MEMBER }), { params: Promise.resolve({ id: BOOKING_ID }) })
    expect(res.status).toBe(200)
    expect(store().bookings[0].team_member_id).toBe(OWN_MEMBER)
  })

  it('accepts an update that does not touch client_id/team_member_id', async () => {
    const res = await UPDATE(jsonReq({ notes: 'hello' }), { params: Promise.resolve({ id: BOOKING_ID }) })
    expect(res.status).toBe(200)
    expect(store().bookings[0].notes).toBe('hello')
  })
})

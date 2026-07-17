import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/bookings previously inserted `body.client_id`/`property_id`/
 * `team_member_id` verbatim with no check that they belong to the
 * authenticated tenant. Both the create response and every later GET join
 * clients(name, phone, address), client_properties(*), and
 * team_members(name, phone), so a foreign id let a staff member of tenant A
 * pull another tenant's client/property/staff PII into a booking that still
 * lives under tenant A's own tenant_id (cross-tenant PII leak, same class
 * already fixed on quotes/invoices in 7907701b).
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const OTHER_TENANT = 'cccccccc-9999-8888-7777-666666666666'
const OWN_CLIENT = 'dddddddd-0001-0001-0001-000000000001'
const FOREIGN_CLIENT = 'dddddddd-0002-0002-0002-000000000002'
const OWN_PROPERTY = 'eeeeeeee-0001-0001-0001-000000000001'
const FOREIGN_PROPERTY = 'eeeeeeee-0002-0002-0002-000000000002'
const OWN_MEMBER = 'ffffffff-0001-0001-0001-000000000001'
const FOREIGN_MEMBER = 'ffffffff-0002-0002-0002-000000000002'

type Row = Record<string, any>
const store: Record<string, Row[]> = {}
let idSeq = 0
const genId = (table: string) => `${table}-${++idSeq}`

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let notIn: { col: string; val: string } | null = null
    let kind: 'read' | 'insert' | 'update' = 'read'
    let payload: Row | Row[] = {}
    const match = (r: Row) => Object.entries(eqs).every(([k, v]) => r[k] === v)
    function doInsert(): Row[] {
      const rows = Array.isArray(payload) ? payload : [payload]
      const inserted = rows.map((r) => ({ id: r.id ?? genId(table), ...r }))
      store[table] = [...(store[table] || []), ...inserted]
      return inserted
    }
    const c: Record<string, unknown> = {
      select: () => c,
      insert: (p: Row | Row[]) => { kind = 'insert'; payload = p; return c },
      update: (p: Row) => { kind = 'update'; payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      not: (col: string, _op: string, val: string) => { notIn = { col, val }; return c },
      lt: () => c,
      gt: () => c,
      gte: () => c,
      lte: () => c,
      order: () => c,
      range: () => c,
      limit: () => c,
      single: async () => {
        if (kind === 'insert') { const [row] = doInsert(); return { data: row, error: null } }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
      },
      then: (res: (v: { data: unknown; error: unknown; count?: number }) => unknown) => {
        if (kind === 'insert') { const rows = doInsert(); return res({ data: rows, error: null }) }
        void notIn
        const rows = (store[table] || []).filter(match)
        return res({ data: rows, error: null, count: rows.length })
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) { super(message); this.status = status }
  },
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))

vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({ require_team_member: false, booking_buffer_minutes: 0, auto_confirm_bookings: false, default_booking_status: 'scheduled' }),
}))

vi.mock('@/lib/availability', () => ({
  checkMemberDayOff: async () => ({ unavailable: false }),
}))

vi.mock('@/lib/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => {} }))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: () => '' }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => '' }) }))
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))

import { POST as CREATE } from '@/app/api/bookings/route'

function jsonReq(body: Row): Request {
  return new Request('http://t.test/api/bookings', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/bookings — client/property/team-member tenant scoping', () => {
  beforeEach(() => {
    store.bookings = []
    store.tenants = [{ id: TENANT, name: 'Own Biz' }]
    store.clients = [
      { id: OWN_CLIENT, tenant_id: TENANT, name: 'Own Client', phone: '+15550001111', address: '1 Own St' },
      { id: FOREIGN_CLIENT, tenant_id: OTHER_TENANT, name: 'Foreign Client', phone: '+15559998888', address: '1 Foreign St' },
    ]
    store.client_properties = [
      { id: OWN_PROPERTY, tenant_id: TENANT, client_id: OWN_CLIENT, address: 'Own Property Rd' },
      { id: FOREIGN_PROPERTY, tenant_id: OTHER_TENANT, client_id: FOREIGN_CLIENT, address: 'Foreign Property Rd' },
    ]
    store.team_members = [
      { id: OWN_MEMBER, tenant_id: TENANT, name: 'Own Member', phone: '+15551112222' },
      { id: FOREIGN_MEMBER, tenant_id: OTHER_TENANT, name: 'Foreign Member', phone: '+15553334444' },
    ]
    idSeq = 0
  })

  it('rejects a client_id belonging to another tenant', async () => {
    const res = await CREATE(jsonReq({ client_id: FOREIGN_CLIENT, start_time: '2026-08-01T10:00:00Z' }))
    expect(res.status).toBe(404)
    expect(store.bookings.length).toBe(0)
  })

  it('rejects a property_id belonging to another tenant', async () => {
    const res = await CREATE(jsonReq({ client_id: OWN_CLIENT, property_id: FOREIGN_PROPERTY, start_time: '2026-08-01T10:00:00Z' }))
    expect(res.status).toBe(404)
    expect(store.bookings.length).toBe(0)
  })

  it('rejects a team_member_id belonging to another tenant', async () => {
    const res = await CREATE(jsonReq({ client_id: OWN_CLIENT, team_member_id: FOREIGN_MEMBER, start_time: '2026-08-01T10:00:00Z' }))
    expect(res.status).toBe(404)
    expect(store.bookings.length).toBe(0)
  })

  it('accepts client_id/property_id/team_member_id all belonging to the authenticated tenant', async () => {
    const res = await CREATE(jsonReq({
      client_id: OWN_CLIENT, property_id: OWN_PROPERTY, team_member_id: OWN_MEMBER, start_time: '2026-08-01T10:00:00Z',
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.booking.client_id).toBe(OWN_CLIENT)
    expect(store.bookings.length).toBe(1)
  })
})

describe('POST /api/bookings — emergency/repeat-path fields were silently dropped by the allowlist', () => {
  beforeEach(() => {
    store.bookings = []
    store.tenants = [{ id: TENANT, name: 'Own Biz' }]
    store.clients = [
      { id: OWN_CLIENT, tenant_id: TENANT, name: 'Own Client', phone: '+15550001111', address: '1 Own St' },
    ]
    store.client_properties = []
    store.team_members = []
    idSeq = 0
  })

  it('persists price, hourly_rate, raw service_type, and max_hours sent by the emergency-booking + repeat-enable UI paths', async () => {
    const res = await CREATE(jsonReq({
      client_id: OWN_CLIENT, start_time: '2026-08-01T10:00:00Z',
      price: 250, hourly_rate: 69, service_type: 'Emergency / Same-Day', max_hours: 4,
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.booking.price).toBe(250)
    expect(body.booking.hourly_rate).toBe(69)
    expect(body.booking.service_type).toBe('Emergency / Same-Day')
    expect(body.booking.max_hours).toBe(4)
  })

  it('maps the emergency form\'s cleaner_pay_rate onto the real pay_rate column so the broadcast SMS shows the admin\'s actual urgent rate', async () => {
    const res = await CREATE(jsonReq({
      client_id: OWN_CLIENT, start_time: '2026-08-01T10:00:00Z', cleaner_pay_rate: 75,
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.booking.pay_rate).toBe(75)
  })
})

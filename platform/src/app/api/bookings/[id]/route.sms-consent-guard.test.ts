import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * PUT/DELETE /api/bookings/[id] — client confirmation/reschedule/cancellation
 * email/SMS never checked sms_consent or do_not_service (P1/W2 fresh-ground,
 * same missing-consent-check bug class as POST /api/bookings, sibling route
 * fixed in the same round — this is the PRIMARY admin-facing booking-update
 * path).
 *
 * BUG (fixed here): all 3 client-facing sends (confirm-on-status-change,
 * reschedule-on-time-change, cancel-on-delete) fired on phone/client-id
 * presence alone. A do_not_service (banned) or sms_consent=false
 * (STOP-revoked) client still got real booking-lifecycle emails/texts.
 *
 * FIX: email sends now gate on `!do_not_service`; SMS sends now also gate
 * on `sms_consent !== false && !do_not_service`.
 *
 * `bookings` gets a hand-rolled table mock (not the shared
 * createTenantDbHarness) because the route reads the pre-update row
 * (`oldBooking`) and then updates+re-reads the SAME row for change
 * detection (statusChanged/timeChanged) — the shared harness returns live
 * object references from `.select()`, so a later `.update()` retroactively
 * mutates the earlier `oldBooking` read too (same reference), permanently
 * masking any before/after diff. A real Postgres SELECT is a snapshot, not
 * a live reference, so this mock shallow-copies each row on read to match.
 */

type Row = Record<string, unknown>

function makeBookingsTable(rows: Row[]) {
  return () => {
    const filters: Array<(r: Row) => boolean> = []
    let op: 'select' | 'update' | 'delete' = 'select'
    let updateValues: Row = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      select: () => chain,
      update: (values: Row) => { op = 'update'; updateValues = values; return chain },
      delete: () => { op = 'delete'; return chain },
      eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return chain },
      single: async () => {
        const hit = rows.filter((r) => filters.every((f) => f(r)))
        if (op === 'update') {
          hit.forEach((r) => Object.assign(r, updateValues))
        } else if (op === 'delete') {
          hit.forEach((r) => { const idx = rows.indexOf(r); if (idx >= 0) rows.splice(idx, 1) })
        }
        return hit.length ? { data: { ...hit[0] }, error: null } : { data: null, error: { code: 'PGRST116' } }
      },
    }
    return chain
  }
}

const CTX_TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'], bookingsRows: [] as Row[] }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (t: string) => (t === 'bookings' ? makeBookingsTable(holder.bookingsRows)() : holder.from!(t)),
  },
}))

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

const notifyMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))
const sendSMSMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))

vi.mock('@/lib/audit', () => ({ audit: async () => {} }))
vi.mock('@/lib/notify', () => ({ notify: (opts: Record<string, unknown>) => notifyMock(opts) }))
vi.mock('@/lib/sms', () => ({ sendSMS: (opts: Record<string, unknown>) => sendSMSMock(opts) }))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: () => '' }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => 'confirmed!', reschedule: () => 'rescheduled!', cancellation: () => 'cancelled!' }) }))
vi.mock('@/lib/availability', () => ({ checkMemberDayOff: async () => ({ unavailable: false }) }))

import { PUT, DELETE } from './route'

const blockedClient = { name: 'Blocked Client', phone: '3005551111', sms_consent: false, do_not_service: false }
const dnsClient = { name: 'DNS Client', phone: '3005554444', sms_consent: true, do_not_service: true }
const controlClient = { name: 'Control Client', phone: '3005552222', sms_consent: true, do_not_service: false }

function bookingsSeed(): Row[] {
  return [
    { id: 'bk-confirm-blocked', tenant_id: CTX_TENANT, client_id: 'c-blocked', status: 'draft', team_member_id: null, start_time: '2026-08-01T10:00:00Z', service_type_id: null, clients: blockedClient },
    { id: 'bk-confirm-dns', tenant_id: CTX_TENANT, client_id: 'c-dns', status: 'draft', team_member_id: null, start_time: '2026-08-01T10:00:00Z', service_type_id: null, clients: dnsClient },
    { id: 'bk-confirm-control', tenant_id: CTX_TENANT, client_id: 'c-control', status: 'draft', team_member_id: null, start_time: '2026-08-01T10:00:00Z', service_type_id: null, clients: controlClient },
    { id: 'bk-reschedule-blocked', tenant_id: CTX_TENANT, client_id: 'c-blocked', status: 'confirmed', team_member_id: null, start_time: '2026-08-01T10:00:00Z', service_type_id: null, clients: blockedClient },
    { id: 'bk-reschedule-control', tenant_id: CTX_TENANT, client_id: 'c-control', status: 'confirmed', team_member_id: null, start_time: '2026-08-01T10:00:00Z', service_type_id: null, clients: controlClient },
    { id: 'bk-cancel-blocked', tenant_id: CTX_TENANT, client_id: 'c-blocked', status: 'confirmed', team_member_id: null, start_time: '2026-08-01T10:00:00Z', service_type_id: null, clients: blockedClient },
    { id: 'bk-cancel-dns', tenant_id: CTX_TENANT, client_id: 'c-dns', status: 'confirmed', team_member_id: null, start_time: '2026-08-01T10:00:00Z', service_type_id: null, clients: dnsClient },
    { id: 'bk-cancel-control', tenant_id: CTX_TENANT, client_id: 'c-control', status: 'confirmed', team_member_id: null, start_time: '2026-08-01T10:00:00Z', service_type_id: null, clients: controlClient },
  ]
}

function seed() {
  return {
    clients: [
      { id: 'c-blocked', tenant_id: CTX_TENANT, ...blockedClient },
      { id: 'c-dns', tenant_id: CTX_TENANT, ...dnsClient },
      { id: 'c-control', tenant_id: CTX_TENANT, ...controlClient },
    ],
    tenants: [{ id: CTX_TENANT, name: 'Alpha', telnyx_api_key: 'key', telnyx_phone: '+15550000000' }],
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
  holder.bookingsRows = bookingsSeed()
  notifyMock.mockClear()
  sendSMSMock.mockClear()
})

describe('bookings/[id] PUT — sms_consent / do_not_service gate on confirmation (status -> scheduled)', () => {
  it('BLOCKED: sms_consent=false client is not texted the confirmation (email still sent)', async () => {
    const res = await PUT(putReq({ status: 'scheduled' }), ctx('bk-confirm-blocked'))
    expect(res.status).toBe(200)
    expect(sendSMSMock).not.toHaveBeenCalled()
    expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({ recipientId: 'c-blocked' }))
  })

  it('BLOCKED: do_not_service=true client gets neither confirmation email nor SMS', async () => {
    const res = await PUT(putReq({ status: 'scheduled' }), ctx('bk-confirm-dns'))
    expect(res.status).toBe(200)
    expect(sendSMSMock).not.toHaveBeenCalled()
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it('CONTROL: sms_consent=true, do_not_service=false client gets both', async () => {
    const res = await PUT(putReq({ status: 'scheduled' }), ctx('bk-confirm-control'))
    expect(res.status).toBe(200)
    expect(sendSMSMock).toHaveBeenCalledWith(expect.objectContaining({ to: '3005552222' }))
    expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({ recipientId: 'c-control' }))
  })
})

describe('bookings/[id] PUT — sms_consent gate on reschedule (start_time change)', () => {
  it('BLOCKED: sms_consent=false client is not texted the reschedule notice', async () => {
    const res = await PUT(putReq({ start_time: '2026-08-02T11:00:00Z' }), ctx('bk-reschedule-blocked'))
    expect(res.status).toBe(200)
    expect(sendSMSMock).not.toHaveBeenCalled()
  })

  it('CONTROL: consented client is still texted the reschedule notice', async () => {
    const res = await PUT(putReq({ start_time: '2026-08-02T11:00:00Z' }), ctx('bk-reschedule-control'))
    expect(res.status).toBe(200)
    expect(sendSMSMock).toHaveBeenCalledWith(expect.objectContaining({ to: '3005552222' }))
  })
})

describe('bookings/[id] DELETE — sms_consent / do_not_service gate on cancellation', () => {
  it('BLOCKED: sms_consent=false client is not texted the cancellation (email still sent)', async () => {
    const res = await DELETE(putReq({}), ctx('bk-cancel-blocked'))
    expect(res.status).toBe(200)
    expect(sendSMSMock).not.toHaveBeenCalled()
    expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({ recipientId: 'c-blocked' }))
  })

  it('BLOCKED: do_not_service=true client gets neither cancellation email nor SMS', async () => {
    const res = await DELETE(putReq({}), ctx('bk-cancel-dns'))
    expect(res.status).toBe(200)
    expect(sendSMSMock).not.toHaveBeenCalled()
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it('CONTROL: consented client gets both cancellation email and SMS', async () => {
    const res = await DELETE(putReq({}), ctx('bk-cancel-control'))
    expect(res.status).toBe(200)
    expect(sendSMSMock).toHaveBeenCalledWith(expect.objectContaining({ to: '3005552222' }))
    expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({ recipientId: 'c-control' }))
  })
})

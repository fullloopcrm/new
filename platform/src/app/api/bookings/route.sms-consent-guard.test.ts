import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/bookings — client confirmation email/SMS never checked
 * sms_consent or do_not_service (P1/W2 fresh-ground, same missing-consent-
 * check bug class as payment-processor.ts, client/book, client/reschedule,
 * schedules/pause, campaigns, reviews/request — this is the PRIMARY
 * admin-facing booking-create path every non-project tenant uses).
 *
 * BUG (fixed here): the client confirmation email fired unconditionally
 * (the guard was `if (data.clients?.phone || true)` — the `|| true` made
 * the phone check a no-op) and the client confirmation SMS fired on phone
 * presence alone. A do_not_service (banned) or sms_consent=false
 * (STOP-revoked) client still got a real "your booking is confirmed"
 * email/text on every admin-created booking.
 *
 * FIX: the email now gates on `!do_not_service`; the SMS now also gates on
 * `sms_consent !== false && !do_not_service`.
 */

const CTX_TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'], h: null as null | Harness }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (t: string) => holder.from!(t),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn !== 'create_admin_booking_atomic') throw new Error(`unexpected rpc: ${fn}`)
      // The harness doesn't do real foreign-table joins, so embed the
      // matching seeded clients() row here -- the route's follow-up
      // `.select('*, clients(...))` re-read then surfaces it, same trick
      // sim-all-trades.ts uses for join probes.
      const clientRow = holder.h!.seed.clients.find((c) => c.id === args.p_client_id)
      const row = holder.h!.from('bookings').insert({
        tenant_id: args.p_tenant_id,
        client_id: args.p_client_id,
        team_member_id: args.p_team_member_id,
        service_type: args.p_service_type,
        start_time: args.p_start_time,
        end_time: args.p_end_time,
        status: args.p_status,
        clients: clientRow ? { name: clientRow.name, phone: clientRow.phone, address: null, sms_consent: clientRow.sms_consent, do_not_service: clientRow.do_not_service } : null,
      })
      const { data } = await row.select().single()
      return { data: { created: true, booking: data }, error: null }
    },
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
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' })),
  }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  })),
}))

vi.mock('@/lib/validate', () => ({
  validate: (body: Record<string, unknown>, schema: Record<string, unknown>) => {
    const data: Record<string, unknown> = {}
    for (const k of Object.keys(schema)) if (body[k] !== undefined) data[k] = body[k]
    return { data, error: null }
  },
}))

vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({
    require_team_member: false,
    booking_buffer_minutes: 0,
    auto_confirm_bookings: false,
    default_booking_status: 'scheduled',
  }),
}))

const notifyMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))
const sendSMSMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))

vi.mock('@/lib/audit', () => ({ audit: async () => {} }))
vi.mock('@/lib/notify', () => ({ notify: (opts: Record<string, unknown>) => notifyMock(opts) }))
vi.mock('@/lib/sms', () => ({ sendSMS: (opts: Record<string, unknown>) => sendSMSMock(opts) }))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: () => '' }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => 'confirmed!' }) }))
vi.mock('@/lib/client-properties', () => ({ applyPropertyToBookingClient: () => {} }))
vi.mock('@/lib/availability', () => ({ checkMemberDayOff: async () => ({ unavailable: false }) }))
vi.mock('@/lib/day-availability', () => ({ slotWithinHours: () => true, hoursWindowForDate: () => null }))
vi.mock('@/lib/cleaner-availability', () => ({ timestampToMin: () => 0 }))
vi.mock('@/lib/schedule/duration-class', () => ({ deriveDurationClass: () => null }))

import { POST } from './route'

function seed() {
  return {
    bookings: [] as Record<string, unknown>[],
    clients: [
      { id: 'client-blocked', tenant_id: CTX_TENANT, name: 'Blocked Client', phone: '3005551111', sms_consent: false, do_not_service: false },
      { id: 'client-dns', tenant_id: CTX_TENANT, name: 'DNS Client', phone: '3005554444', sms_consent: true, do_not_service: true },
      { id: 'client-control', tenant_id: CTX_TENANT, name: 'Control Client', phone: '3005552222', sms_consent: true, do_not_service: false },
    ],
    team_members: [
      { id: 'tm-active', tenant_id: CTX_TENANT, name: 'Active Amy', schedule: null, max_jobs_per_day: null },
    ],
    hr_employee_profiles: [
      { id: 'p1', tenant_id: CTX_TENANT, team_member_id: 'tm-active', hr_status: 'active' },
    ],
    tenants: [{ id: CTX_TENANT, name: 'Alpha', telnyx_api_key: 'key', telnyx_phone: '+15550000000' }],
  }
}

function postReq(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  holder.h = h
  notifyMock.mockClear()
  sendSMSMock.mockClear()
})

describe('bookings POST — sms_consent / do_not_service gate on client confirmation', () => {
  it('BLOCKED: sms_consent=false client is not texted the confirmation (email still sent)', async () => {
    const res = await POST(postReq({ client_id: 'client-blocked', team_member_id: 'tm-active', start_time: '2026-08-01T10:00:00Z' }))
    expect(res.status).toBe(201)
    expect(sendSMSMock).not.toHaveBeenCalled()
    expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({ recipientId: 'client-blocked', channel: 'email' }))
  })

  it('BLOCKED: do_not_service=true client gets neither the confirmation email nor SMS', async () => {
    const res = await POST(postReq({ client_id: 'client-dns', team_member_id: 'tm-active', start_time: '2026-08-01T10:00:00Z' }))
    expect(res.status).toBe(201)
    expect(sendSMSMock).not.toHaveBeenCalled()
    expect(notifyMock).not.toHaveBeenCalledWith(expect.objectContaining({ recipientId: 'client-dns' }))
  })

  it('CONTROL: sms_consent=true, do_not_service=false client gets both email and SMS', async () => {
    const res = await POST(postReq({ client_id: 'client-control', team_member_id: 'tm-active', start_time: '2026-08-01T10:00:00Z' }))
    expect(res.status).toBe(201)
    expect(sendSMSMock).toHaveBeenCalledWith(expect.objectContaining({ to: '3005552222' }))
    expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({ recipientId: 'client-control', channel: 'email' }))
  })
})

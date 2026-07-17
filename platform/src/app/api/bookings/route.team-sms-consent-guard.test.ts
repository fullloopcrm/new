import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/bookings — team-member assignment SMS never checked
 * team_members.sms_consent (P1/W2 fresh-ground: this route's own
 * route.sms-consent-guard.test.ts fixed the client-side confirmation gate
 * on the exact same POST, one field over — the "Team member assignment SMS"
 * right below it never gated on sms_consent, same missing-check shape as
 * the 8 sites already fixed elsewhere: bookings/[id], bookings/batch,
 * cron/reminders, cron/late-check-in, routes/[id]/publish,
 * admin/find-cleaner/send, bookings/broadcast, admin/payments/confirm-match).
 *
 * This is the PRIMARY admin-facing booking-create path every non-project
 * tenant uses. A crew member who revoked SMS consent still got a real
 * "you're on the job" text on every admin-created booking assigned to them.
 *
 * FIX: the assignment SMS now also gates on `sms_consent !== false`.
 *
 * Same RPC-mock trick as route.sms-consent-guard.test.ts (the harness
 * doesn't do real foreign-table joins, so the mocked
 * create_admin_booking_atomic RPC embeds the matching seeded team_members()
 * row on the inserted booking, extended here to also carry sms_consent).
 */

const CTX_TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'], h: null as null | Harness }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (t: string) => holder.from!(t),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn !== 'create_admin_booking_atomic') throw new Error(`unexpected rpc: ${fn}`)
      const clientRow = holder.h!.seed.clients.find((c) => c.id === args.p_client_id)
      const memberRow = holder.h!.seed.team_members.find((m) => m.id === args.p_team_member_id)
      const row = holder.h!.from('bookings').insert({
        tenant_id: args.p_tenant_id,
        client_id: args.p_client_id,
        team_member_id: args.p_team_member_id,
        service_type: args.p_service_type,
        start_time: args.p_start_time,
        end_time: args.p_end_time,
        status: args.p_status,
        clients: clientRow ? { name: clientRow.name, phone: clientRow.phone, address: null, sms_consent: clientRow.sms_consent, do_not_service: clientRow.do_not_service } : null,
        team_members: memberRow ? { name: memberRow.name, phone: memberRow.phone, sms_consent: memberRow.sms_consent } : null,
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
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: () => 'assignment!' }))
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
      { id: 'client-control', tenant_id: CTX_TENANT, name: 'Control Client', phone: '3005552222', sms_consent: true, do_not_service: false },
    ],
    team_members: [
      { id: 'tm-blocked', tenant_id: CTX_TENANT, name: 'Blocked Crew', phone: '3005553333', sms_consent: false, schedule: null, max_jobs_per_day: null },
      { id: 'tm-control', tenant_id: CTX_TENANT, name: 'Control Crew', phone: '3005554444', sms_consent: true, schedule: null, max_jobs_per_day: null },
    ],
    hr_employee_profiles: [
      { id: 'p1', tenant_id: CTX_TENANT, team_member_id: 'tm-blocked', hr_status: 'active' },
      { id: 'p2', tenant_id: CTX_TENANT, team_member_id: 'tm-control', hr_status: 'active' },
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

describe('bookings POST — sms_consent gate on team-member assignment SMS', () => {
  it('BLOCKED: a crew member who revoked sms_consent is not texted the assignment', async () => {
    const res = await POST(postReq({ client_id: 'client-control', team_member_id: 'tm-blocked', start_time: '2026-08-01T10:00:00Z' }))
    expect(res.status).toBe(201)
    const targets = sendSMSMock.mock.calls.map((c) => (c[0] as { to?: string }).to)
    expect(targets).not.toContain('3005553333')
  })

  it('CONTROL: a consented crew member still gets the assignment SMS', async () => {
    const res = await POST(postReq({ client_id: 'client-control', team_member_id: 'tm-control', start_time: '2026-08-01T10:00:00Z' }))
    expect(res.status).toBe(201)
    const targets = sendSMSMock.mock.calls.map((c) => (c[0] as { to?: string }).to)
    expect(targets).toContain('3005554444')
  })
})

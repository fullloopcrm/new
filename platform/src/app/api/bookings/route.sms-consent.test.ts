/**
 * POST /api/bookings — the client booking-confirmation SMS branch called the
 * raw sendSMS() from '@/lib/sms' with no sms_consent check, same
 * consent-bypass bug class as notify.ts/cron/confirmations/payment-reminder.
 * webhooks/telnyx's STOP handler sets clients.sms_consent=false tenant-wide
 * (a legally-required blanket opt-out) -- this route ignored it, so an
 * opted-out client got a "Booking Confirmed" SMS every time a booking was
 * created for them directly (this route bypasses notify() and calls
 * sendSMS() itself).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

const CLIENT_ID = '11111111-1111-1111-1111-111111111111'
const TEAM_MEMBER_ID = '22222222-2222-2222-2222-222222222222'

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  getTenantForRequest: vi.fn(),
  requirePermission: vi.fn(),
  getSettings: vi.fn(),
  checkMemberDayOff: vi.fn(),
  slotWithinHours: vi.fn(),
  hoursWindowForDate: vi.fn(),
  notify: vi.fn(),
  sendSMS: vi.fn(),
  audit: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  getTenantForRequest: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  requirePermission: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  getSettings: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  checkMemberDayOff: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  slotWithinHours: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  hoursWindowForDate: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  notify: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  sendSMS: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  audit: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const raw = makeTenantDbFake(h)
  const fake = {
    from(table: string) {
      const chain = raw.from(table) as Record<string, unknown>
      if (table !== 'bookings') return chain
      // The shared fake's insert-then-select doesn't perform real PostgREST
      // joins (it just echoes back the inserted row) -- this route's
      // `.select('*, clients(...), team_members(...)')` after insert relies
      // on those joins to reach the client's phone/sms_consent for the SMS
      // branch under test, so stitch them in from the fake store the same
      // way real PostgREST would.
      const origSingle = chain.single as () => Promise<{ data: Record<string, unknown> | null; error: unknown }>
      chain.single = async () => {
        const result = await origSingle()
        if (result.data) {
          const client = (h.store.clients || []).find((c) => c.id === result.data!.client_id) || null
          const teamMember = (h.store.team_members || []).find((t) => t.id === result.data!.team_member_id) || null
          result.data = { ...result.data, clients: client, team_members: teamMember }
        }
        return result
      }
      return chain
    },
  }
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: (...a: unknown[]) => h.getTenantForRequest(...a),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: (...a: unknown[]) => h.requirePermission(...a),
}))
vi.mock('@/lib/settings', () => ({ getSettings: (...a: unknown[]) => h.getSettings(...a) }))
vi.mock('@/lib/availability', () => ({ checkMemberDayOff: (...a: unknown[]) => h.checkMemberDayOff(...a) }))
vi.mock('@/lib/day-availability', () => ({
  slotWithinHours: (...a: unknown[]) => h.slotWithinHours(...a),
  hoursWindowForDate: (...a: unknown[]) => h.hoursWindowForDate(...a),
}))
vi.mock('@/lib/notify', () => ({ notify: (...a: unknown[]) => h.notify(...a) }))
vi.mock('@/lib/sms', () => ({ sendSMS: (...a: unknown[]) => h.sendSMS(...a) }))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: () => 'team sms body' }))
vi.mock('@/lib/messaging/client-sms', () => ({
  clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => 'confirmation sms' }),
}))
vi.mock('@/lib/audit', () => ({ audit: (...a: unknown[]) => h.audit(...a) }))

import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

const validCreateBody = {
  client_id: CLIENT_ID,
  team_member_id: TEAM_MEMBER_ID,
  start_time: '2026-08-15T09:00:00',
  end_time: '2026-08-15T11:00:00',
}

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.getTenantForRequest.mockReset()
  h.getTenantForRequest.mockImplementation(async () => ({ tenantId: h.tenantId }))
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: h.tenantId }, error: null }))
  h.getSettings.mockReset()
  h.getSettings.mockResolvedValue({ booking_buffer_minutes: 0 })
  h.checkMemberDayOff.mockReset()
  h.checkMemberDayOff.mockResolvedValue({ unavailable: false })
  h.slotWithinHours.mockReset()
  h.slotWithinHours.mockReturnValue(true)
  h.hoursWindowForDate.mockReset()
  h.hoursWindowForDate.mockReturnValue(null)
  h.notify.mockReset()
  h.notify.mockResolvedValue({ success: true })
  h.sendSMS.mockReset()
  h.sendSMS.mockResolvedValue({ ok: true })
  h.audit.mockReset()
  h.audit.mockResolvedValue(undefined)
  h.store = {
    bookings: [],
    team_members: [
      { id: TEAM_MEMBER_ID, tenant_id: 'tenant-A', name: 'Carl', phone: null, schedule: null, max_jobs_per_day: null },
    ],
    service_types: [],
    clients: [{ id: CLIENT_ID, tenant_id: 'tenant-A', name: 'Pat', phone: '+15550001111', sms_consent: true }],
    tenants: [{ id: 'tenant-A', name: 'Acme Cleaning', telnyx_api_key: 'k', telnyx_phone: '+15550000000' }],
  }
})

describe('POST /api/bookings — client confirmation sms_consent gate', () => {
  it('does NOT text a client who opted out (sms_consent:false)', async () => {
    h.store.clients[0].sms_consent = false

    const res = await POST(postReq(validCreateBody))

    expect(res.status).toBe(201)
    expect(h.sendSMS).not.toHaveBeenCalled()
  })

  it('still texts a client with consent (sms_consent:true)', async () => {
    const res = await POST(postReq(validCreateBody))

    expect(res.status).toBe(201)
    expect(h.sendSMS).toHaveBeenCalledTimes(1)
    expect(h.sendSMS).toHaveBeenCalledWith(expect.objectContaining({ to: '+15550001111' }))
  })

  it('still texts a client with no explicit opt-out (sms_consent unset)', async () => {
    h.store.clients[0].sms_consent = undefined

    const res = await POST(postReq(validCreateBody))

    expect(res.status).toBe(201)
    expect(h.sendSMS).toHaveBeenCalledTimes(1)
  })
})

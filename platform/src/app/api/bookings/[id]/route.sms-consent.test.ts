import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PUT/DELETE /api/bookings/[id] sent the client confirm/reschedule/cancel SMS
 * and the team-member assignment SMS via a raw sendSMS() call with no
 * sms_consent check — unlike payment-processor.ts/notify-team.ts/
 * notify-team-member.ts, which all gate SMS on `sms_consent !== false`. A
 * client or team member who'd replied STOP still got these booking texts.
 * Mock harness mirrors route.notify-race.test.ts's bookingsStore approach.
 */

const BOOKING_ID = 'booking-1'
const TENANT = 'T'

const bookingsStore = [{
  id: BOOKING_ID,
  tenant_id: TENANT,
  status: 'pending',
  team_member_id: 'member-A',
  start_time: '2026-08-01T10:00:00Z',
  client_id: 'client-1',
  notes: null as string | null,
  clients: { name: 'Own Client', phone: '+15551234567', sms_consent: true as boolean | null },
  team_members: { name: 'Own Member', phone: '+15557654321', sms_consent: true as boolean | null },
}]

const { notify, sendSMS } = vi.hoisted(() => ({
  notify: vi.fn(async () => {}),
  sendSMS: vi.fn(async () => {}),
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))
vi.mock('@/lib/availability', () => ({ checkMemberDayOff: async () => ({ unavailable: false }) }))
vi.mock('@/lib/notify', () => ({ notify }))
vi.mock('@/lib/sms', () => ({ sendSMS }))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: () => 'assigned' }))
vi.mock('@/lib/messaging/client-sms', () => ({
  clientSmsTemplatesFor: async () => ({
    bookingConfirmation: () => 'confirmed',
    reschedule: () => 'rescheduled',
    cancellation: () => 'cancelled',
  }),
}))
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))
vi.mock('@/lib/booking-delete-guard', () => ({ checkBookingDeletable: async () => ({ deletable: true }) }))

vi.mock('@/lib/supabase', () => {
  function from(table: string) {
    const eqs: Record<string, unknown> = {}
    const neqs: Record<string, unknown> = {}
    let updatePatch: Record<string, unknown> | null = null
    const rows = () => (table === 'bookings' ? bookingsStore : table === 'tenants' ? [{ id: TENANT, name: 'Biz', telnyx_api_key: 'k', telnyx_phone: '+1000' }] : table === 'team_members' ? [{ id: 'member-A', tenant_id: TENANT }, { id: 'member-B', tenant_id: TENANT }] : table === 'clients' ? [{ id: 'client-1', tenant_id: TENANT }] : [])
    const matches = (row: Record<string, unknown>) =>
      Object.entries(eqs).every(([k, v]) => row[k] === v) &&
      Object.entries(neqs).every(([k, v]) => row[k] !== v)
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: (col: string, val: unknown) => { eqs[col] = val; return chain },
      neq: (col: string, val: unknown) => { neqs[col] = val; return chain },
      not: () => chain,
      update: (patch: Record<string, unknown>) => { updatePatch = patch; return chain },
      delete: () => chain,
      maybeSingle: async () => {
        const found = rows().find(matches) as Record<string, unknown> | undefined
        if (!found) return { data: null, error: null }
        if (updatePatch) Object.assign(found, updatePatch)
        return { data: found, error: null }
      },
      single: async () => {
        const found = rows().find(matches) as Record<string, unknown> | undefined
        if (!found) return { data: null, error: { message: 'not found' } }
        if (updatePatch) Object.assign(found, updatePatch)
        return { data: found, error: null }
      },
      then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: null, error: null }),
    }
    return chain
  }
  return { supabaseAdmin: { from } }
})

import { PUT, DELETE } from '@/app/api/bookings/[id]/route'

const params = { params: Promise.resolve({ id: BOOKING_ID }) }
function req(body: Record<string, unknown>): Request {
  return new Request(`https://app.fullloop.example/api/bookings/${BOOKING_ID}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  bookingsStore[0].status = 'pending'
  bookingsStore[0].team_member_id = 'member-A'
  bookingsStore[0].start_time = '2026-08-01T10:00:00Z'
  bookingsStore[0].clients.sms_consent = true
  bookingsStore[0].team_members.sms_consent = true
  notify.mockClear()
  sendSMS.mockClear()
})

describe('PUT /api/bookings/[id] — sms_consent gate', () => {
  it('does not SMS the client on confirm when sms_consent is false', async () => {
    bookingsStore[0].clients.sms_consent = false
    const res = await PUT(req({ status: 'scheduled' }), params)
    expect(res.status).toBe(200)
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it('SMS the client on confirm when consented', async () => {
    const res = await PUT(req({ status: 'scheduled' }), params)
    expect(res.status).toBe(200)
    expect(sendSMS).toHaveBeenCalledTimes(1)
  })

  it('does not SMS the team member on reassignment when sms_consent is false', async () => {
    bookingsStore[0].team_members.sms_consent = false
    const res = await PUT(req({ team_member_id: 'member-B' }), params)
    expect(res.status).toBe(200)
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it('SMS the team member on reassignment when consented', async () => {
    const res = await PUT(req({ team_member_id: 'member-B' }), params)
    expect(res.status).toBe(200)
    expect(sendSMS).toHaveBeenCalledTimes(1)
  })

  it('does not SMS the client on reschedule when sms_consent is false', async () => {
    bookingsStore[0].clients.sms_consent = false
    const res = await PUT(req({ start_time: '2026-08-02T10:00:00Z' }), params)
    expect(res.status).toBe(200)
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it('SMS the client on reschedule when consented', async () => {
    const res = await PUT(req({ start_time: '2026-08-02T10:00:00Z' }), params)
    expect(res.status).toBe(200)
    expect(sendSMS).toHaveBeenCalledTimes(1)
  })
})

describe('DELETE /api/bookings/[id] — sms_consent gate', () => {
  it('does not SMS the client on cancellation when sms_consent is false', async () => {
    bookingsStore[0].clients.sms_consent = false
    const res = await DELETE(new Request('https://x'), params)
    expect(res.status).toBe(200)
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it('SMS the client on cancellation when consented', async () => {
    const res = await DELETE(new Request('https://x'), params)
    expect(res.status).toBe(200)
    expect(sendSMS).toHaveBeenCalledTimes(1)
  })
})

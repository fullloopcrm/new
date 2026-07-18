import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * POST /api/bookings/broadcast SMS-blasted every active team member via a raw
 * sendSMS() call with no sms_consent check — unlike payment-processor.ts,
 * notify-team.ts, and the campaign senders, which all gate on
 * `sms_consent !== false` before texting a team member/client. A team member
 * who'd replied STOP to opt out still got broadcast texts here.
 */

const TENANT = 'tenant-1'
const BOOKING = 'booking-1'

let members: Record<string, unknown>[]
const sendSMS = vi.fn(async () => ({}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: TENANT }, error: null })),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'tenants') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { name: 'Acme', telnyx_api_key: 'tk', telnyx_phone: '+15550000000', resend_api_key: null, primary_color: '#000' } }) }) }) }
      }
      if (table === 'bookings') {
        return { select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: { id: BOOKING, start_time: '2026-08-01T14:00:00Z', pay_rate: 45, clients: { name: 'Client', address: '123 St' } } }) }) }) }) }
      }
      if (table === 'team_members') {
        return { select: () => ({ eq: () => ({ eq: async () => ({ data: members }) }) }) }
      }
      if (table === 'notifications') {
        return {
          select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ gte: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null }) }) }) }) }) }) }),
          insert: async () => ({ data: null }),
        }
      }
      throw new Error(`unexpected table ${table}`)
    }),
  },
}))

vi.mock('@/lib/sms', () => ({ sendSMS }))
vi.mock('@/lib/sms-templates', () => ({ smsUrgentBroadcast: vi.fn(() => 'sms body') }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => ({ success: true })) }))

beforeEach(() => {
  sendSMS.mockClear()
})

describe('POST /api/bookings/broadcast — sms_consent gate', () => {
  it('does not SMS a team member who opted out (sms_consent: false)', async () => {
    members = [{ id: 'm1', name: 'Opted Out', phone: '+15551110000', email: null, sms_consent: false }]
    const { POST } = await import('./route')
    const res = await POST(new Request('http://x/api/bookings/broadcast', { method: 'POST', body: JSON.stringify({ booking_id: BOOKING }) }))
    expect(res.status).toBe(200)
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it('still SMS a team member with consent (sms_consent: true or null/undefined)', async () => {
    members = [{ id: 'm1', name: 'Opted In', phone: '+15551110000', email: null, sms_consent: true }]
    const { POST } = await import('./route')
    const res = await POST(new Request('http://x/api/bookings/broadcast', { method: 'POST', body: JSON.stringify({ booking_id: BOOKING }) }))
    expect(res.status).toBe(200)
    expect(sendSMS).toHaveBeenCalledTimes(1)
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * POST /api/bookings/batch sent the client-confirmation and cleaner-assignment
 * SMS via a raw sendSMS() call with no sms_consent check — same gap as
 * bookings/route.ts (single-create path), fixed the same way: gate on
 * `sms_consent !== false` before texting.
 */

const TENANT = 'tenant-1'
const CLIENT_ID = '11111111-1111-1111-1111-111111111111'
const MEMBER_ID = '22222222-2222-2222-2222-222222222222'

let firstRow: Record<string, unknown>
const sendSMS = vi.fn(async () => ({}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: TENANT }, error: null })),
}))
vi.mock('@/lib/tokens', () => ({ generateToken: () => 'tok' }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => ({})) }))
vi.mock('@/lib/sms', () => ({ sendSMS }))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: () => 'assigned' }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => 'confirmed' }) }))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'clients') {
        return { select: () => ({ eq: () => ({ in: async () => ({ data: [{ id: CLIENT_ID }] }) }) }) }
      }
      if (table === 'team_members') {
        return { select: () => ({ eq: () => ({ in: async () => ({ data: [{ id: MEMBER_ID }] }) }) }) }
      }
      if (table === 'bookings') {
        return {
          insert: () => ({
            select: async () => ({ data: [firstRow], error: null }),
          }),
        }
      }
      if (table === 'tenants') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { telnyx_api_key: 'tk', telnyx_phone: '+15550000000', resend_api_key: null, email_from: null, name: 'Acme' } }) }) }) }
      }
      throw new Error(`unexpected table ${table}`)
    }),
  },
}))

function jsonReq(body: Record<string, unknown>): Request {
  return new Request('http://t.test/api/bookings/batch', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  sendSMS.mockClear()
})

describe('POST /api/bookings/batch — sms_consent gate', () => {
  it('does not SMS a client who opted out (sms_consent: false)', async () => {
    firstRow = { id: 'b1', status: 'scheduled', start_time: '2026-08-01T10:00:00Z', clients: { name: 'Client', phone: '+15551110000', sms_consent: false }, team_members: null }
    const { POST } = await import('./route')
    const res = await POST(jsonReq({ bookings: [{ client_id: CLIENT_ID, start_time: '2026-08-01T10:00:00Z' }] }))
    expect(res.status).toBe(200)
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it('SMS a client with consent', async () => {
    firstRow = { id: 'b1', status: 'scheduled', start_time: '2026-08-01T10:00:00Z', clients: { name: 'Client', phone: '+15551110000', sms_consent: true }, team_members: null }
    const { POST } = await import('./route')
    const res = await POST(jsonReq({ bookings: [{ client_id: CLIENT_ID, start_time: '2026-08-01T10:00:00Z' }] }))
    expect(res.status).toBe(200)
    expect(sendSMS).toHaveBeenCalledTimes(1)
  })

  it('does not SMS a cleaner/team member who opted out', async () => {
    firstRow = { id: 'b1', status: 'scheduled', start_time: '2026-08-01T10:00:00Z', clients: null, team_members: { name: 'Cleaner', phone: '+15552220000', sms_consent: false } }
    const { POST } = await import('./route')
    const res = await POST(jsonReq({ bookings: [{ team_member_id: MEMBER_ID, start_time: '2026-08-01T10:00:00Z' }] }))
    expect(res.status).toBe(200)
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it('SMS a cleaner/team member with consent', async () => {
    firstRow = { id: 'b1', status: 'scheduled', start_time: '2026-08-01T10:00:00Z', clients: null, team_members: { name: 'Cleaner', phone: '+15552220000', sms_consent: true } }
    const { POST } = await import('./route')
    const res = await POST(jsonReq({ bookings: [{ team_member_id: MEMBER_ID, start_time: '2026-08-01T10:00:00Z' }] }))
    expect(res.status).toBe(200)
    expect(sendSMS).toHaveBeenCalledTimes(1)
  })
})

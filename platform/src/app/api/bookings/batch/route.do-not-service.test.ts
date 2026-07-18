import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * POST /api/bookings/batch sent the client-confirmation SMS with no
 * do_not_service check — same gap as bookings/route.ts (single-create path).
 */

const TENANT = 'tenant-1'
const CLIENT_ID = '11111111-1111-1111-1111-111111111111'

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
        return { select: () => ({ eq: () => ({ in: async () => ({ data: [] }) }) }) }
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

describe('POST /api/bookings/batch — do_not_service gate', () => {
  it('does not SMS a client flagged do_not_service, even with sms_consent true', async () => {
    firstRow = { id: 'b1', status: 'scheduled', start_time: '2026-08-01T10:00:00Z', clients: { name: 'Client', phone: '+15551110000', sms_consent: true, do_not_service: true }, team_members: null }
    const { POST } = await import('./route')
    const res = await POST(jsonReq({ bookings: [{ client_id: CLIENT_ID, start_time: '2026-08-01T10:00:00Z' }] }))
    expect(res.status).toBe(200)
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it('SMS a client not flagged do_not_service', async () => {
    firstRow = { id: 'b1', status: 'scheduled', start_time: '2026-08-01T10:00:00Z', clients: { name: 'Client', phone: '+15551110000', sms_consent: true, do_not_service: false }, team_members: null }
    const { POST } = await import('./route')
    const res = await POST(jsonReq({ bookings: [{ client_id: CLIENT_ID, start_time: '2026-08-01T10:00:00Z' }] }))
    expect(res.status).toBe(200)
    expect(sendSMS).toHaveBeenCalledTimes(1)
  })
})

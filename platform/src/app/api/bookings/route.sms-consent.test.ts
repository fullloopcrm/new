import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * POST /api/bookings sent the client-confirmation and team-assignment SMS via
 * a raw sendSMS() call with no sms_consent check — unlike payment-processor.ts
 * /notify-team.ts/notify-team-member.ts, which all gate SMS on
 * `sms_consent !== false`. A client or team member who'd replied STOP still
 * got these booking texts.
 */

const TENANT = 'tenant-1'

let clientRow: Record<string, unknown> | null
let memberRow: Record<string, unknown> | null
const sendSMS = vi.fn(async () => ({}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: TENANT }, error: null })),
}))
vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) { super(message); this.status = status }
  },
}))
vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({ require_team_member: false, booking_buffer_minutes: 0, auto_confirm_bookings: false, default_booking_status: 'scheduled' }),
}))
vi.mock('@/lib/availability', () => ({ checkMemberDayOff: async () => ({ unavailable: false }) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/sms', () => ({ sendSMS }))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: () => 'assigned' }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => 'confirmed' }) }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'tenants') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { name: 'Acme', telnyx_api_key: 'tk', telnyx_phone: '+15550000000' } }) }) }) }
      }
      if (table === 'clients') {
        return { select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: { id: '11111111-1111-1111-1111-111111111111' } }) }) }) }) }
      }
      if (table === 'team_members') {
        return { select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: memberRow ? { id: '22222222-2222-2222-2222-222222222222' } : null }) }) }) }) }
      }
      if (table === 'bookings') {
        const conflictChain: Record<string, unknown> = {
          eq: () => conflictChain,
          not: () => conflictChain,
          lt: () => conflictChain,
          gt: () => conflictChain,
          neq: () => conflictChain,
          then: (resolve: (v: { data: unknown[] }) => unknown) => resolve({ data: [] }),
        }
        return {
          select: () => conflictChain,
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: {
                  id: 'booking-1',
                  start_time: '2026-08-01T10:00:00Z',
                  client_id: '11111111-1111-1111-1111-111111111111',
                  team_member_id: memberRow ? '22222222-2222-2222-2222-222222222222' : null,
                  clients: clientRow,
                  team_members: memberRow,
                },
                error: null,
              }),
            }),
          }),
        }
      }
      throw new Error(`unexpected table ${table}`)
    }),
  },
}))

function jsonReq(body: Record<string, unknown>): Request {
  return new Request('http://t.test/api/bookings', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  sendSMS.mockClear()
})

describe('POST /api/bookings — sms_consent gate', () => {
  it('does not SMS a client who opted out (sms_consent: false)', async () => {
    clientRow = { id: '11111111-1111-1111-1111-111111111111', name: 'Client', phone: '+15551110000', address: '1 St', sms_consent: false }
    memberRow = null
    const { POST } = await import('./route')
    const res = await POST(jsonReq({ client_id: '11111111-1111-1111-1111-111111111111', start_time: '2026-08-01T10:00:00Z' }))
    expect(res.status).toBe(201)
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it('SMS a client with consent (sms_consent: true)', async () => {
    clientRow = { id: '11111111-1111-1111-1111-111111111111', name: 'Client', phone: '+15551110000', address: '1 St', sms_consent: true }
    memberRow = null
    const { POST } = await import('./route')
    const res = await POST(jsonReq({ client_id: '11111111-1111-1111-1111-111111111111', start_time: '2026-08-01T10:00:00Z' }))
    expect(res.status).toBe(201)
    expect(sendSMS).toHaveBeenCalledTimes(1)
  })

  it('does not SMS a team member who opted out (sms_consent: false)', async () => {
    clientRow = null
    memberRow = { id: '22222222-2222-2222-2222-222222222222', name: 'Member', phone: '+15552220000', sms_consent: false }
    const { POST } = await import('./route')
    const res = await POST(jsonReq({ client_id: '11111111-1111-1111-1111-111111111111', team_member_id: '22222222-2222-2222-2222-222222222222', start_time: '2026-08-01T10:00:00Z' }))
    expect(res.status).toBe(201)
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it('SMS a team member with consent (sms_consent: true)', async () => {
    clientRow = null
    memberRow = { id: '22222222-2222-2222-2222-222222222222', name: 'Member', phone: '+15552220000', sms_consent: true }
    const { POST } = await import('./route')
    const res = await POST(jsonReq({ client_id: '11111111-1111-1111-1111-111111111111', team_member_id: '22222222-2222-2222-2222-222222222222', start_time: '2026-08-01T10:00:00Z' }))
    expect(res.status).toBe(201)
    expect(sendSMS).toHaveBeenCalledTimes(1)
  })
})

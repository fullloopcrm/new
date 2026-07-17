import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/bookings/broadcast — the SMS leg never checked
 * team_members.sms_consent (P1/W2 fresh-ground, same missing-check shape as
 * this route's own terminated-crew guard, one column over).
 *
 * team_members.sms_consent is a real, crew-editable column since the
 * team-portal/preferences fix — a crew member who revoked SMS consent still
 * received the "URGENT JOB AVAILABLE $X/hr" text every time this route fired
 * (no preview/confirm step, sends straight to every active-and-not-terminated
 * roster row). The email leg is unaffected by sms_consent by design (a
 * separate, unrelated consent surface), so a consent-revoked crew member
 * still gets the email broadcast — only the text is suppressed.
 *
 * FIX: the SMS-broadcast branch now also gates on
 * `member.sms_consent !== false`.
 */

const TENANT = 'tid-a'

const { sendSMS, notify } = vi.hoisted(() => ({
  sendSMS: vi.fn(async (_opts: { to: string; body: string; telnyxApiKey: string; telnyxPhone: string }) => {}),
  notify: vi.fn(async (..._args: { message: string }[]) => {}),
}))
vi.mock('@/lib/sms', () => ({ sendSMS }))
vi.mock('@/lib/sms-templates', () => ({ smsUrgentBroadcast: () => 'sms' }))
vi.mock('@/lib/notify', () => ({ notify }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: TENANT }, error: null })),
}))

const membersHolder = vi.hoisted(() => ({
  rows: [] as { id: string; name: string; phone: string | null; email: string | null; sms_consent: boolean | null }[],
}))
vi.mock('@/lib/hr', () => ({
  getTerminatedTeamMemberIds: vi.fn(async () => []),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { name: 'Acme', telnyx_api_key: 'key', telnyx_phone: '+15551234567', resend_api_key: 'rk', primary_color: null }, error: null }) }) }) }
      }
      if (table === 'bookings') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    id: 'bk-1', tenant_id: TENANT,
                    start_time: '2026-08-01T10:00:00Z', end_time: '2026-08-01T12:00:00Z',
                    pay_rate: 40, service_type: 'Standard Clean', notes: null,
                    clients: { name: 'Client A', address: '123 Main St' },
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'team_members') {
        return { select: () => ({ eq: () => ({ eq: async () => ({ data: membersHolder.rows, error: null }) }) }) }
      }
      if (table === 'notifications') {
        return { insert: async () => ({ error: null }) }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  },
}))

import { POST } from './route'

function req() {
  return new Request('http://t/api/bookings/broadcast', { method: 'POST', body: JSON.stringify({ booking_id: 'bk-1' }) })
}

beforeEach(() => {
  sendSMS.mockClear()
  notify.mockClear()
  membersHolder.rows = []
})

describe('POST /api/bookings/broadcast — sms_consent gate', () => {
  it('BLOCKED: a crew member who revoked sms_consent is not texted, but is still emailed', async () => {
    membersHolder.rows = [{ id: 'tm-blocked', name: 'Blocked Worker', phone: '+15559990001', email: 'blocked@example.com', sms_consent: false }]

    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(sendSMS).not.toHaveBeenCalled()
    expect(notify).toHaveBeenCalledTimes(1)
  })

  it('CONTROL: a consented crew member is still texted and emailed', async () => {
    membersHolder.rows = [{ id: 'tm-control', name: 'Control Worker', phone: '+15559990002', email: 'control@example.com', sms_consent: true }]

    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(sendSMS).toHaveBeenCalledTimes(1)
    expect(sendSMS.mock.calls[0][0]).toMatchObject({ to: '+15559990002' })
    expect(notify).toHaveBeenCalledTimes(1)
  })
})

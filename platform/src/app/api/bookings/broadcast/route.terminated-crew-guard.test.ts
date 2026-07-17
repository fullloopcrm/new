import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/bookings/broadcast — terminated-crew guard (P1/W2 fresh-ground).
 *
 * Same bug class as the find-cleaner mass-SMS broadcast (see
 * find-cleaner/preview + find-cleaner/send terminated-crew-guard tests), but
 * worse: this route queries team_members.status='active' with zero
 * hr_status check AND has no preview/confirm step -- it sends the "URGENT
 * JOB AVAILABLE $X/hr, first to claim gets it" SMS/email straight to every
 * "active" row, including a fired worker whose HR termination only ever
 * touches hr_employee_profiles.hr_status, never team_members.status.
 *
 * FIX: cross-reference getTerminatedTeamMemberIds against the active roster
 * and drop terminated ids before the send loop.
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
  rows: [] as { id: string; name: string; phone: string | null; email: string | null }[],
}))
const hrHolder = vi.hoisted(() => ({ terminated: new Set<string>() }))
vi.mock('@/lib/hr', () => ({
  getTerminatedTeamMemberIds: vi.fn(async (_tenantId: string, ids: string[]) =>
    ids.filter((id) => hrHolder.terminated.has(id))
  ),
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
  hrHolder.terminated = new Set()
  membersHolder.rows = []
})

describe('POST /api/bookings/broadcast — terminated-crew guard', () => {
  it('BLOCKED: a fired worker still status=active is not texted or emailed', async () => {
    membersHolder.rows = [{ id: 'tm-terminated', name: 'Fired Worker', phone: '+15559990001', email: 'fired@example.com' }]
    hrHolder.terminated = new Set(['tm-terminated'])

    const res = await POST(req())
    expect(res.status).toBe(400) // falls through to "No active team members"
    expect(sendSMS).not.toHaveBeenCalled()
    expect(notify).not.toHaveBeenCalled()
  })

  it('CONTROL: an active worker is still texted and emailed', async () => {
    membersHolder.rows = [{ id: 'tm-active', name: 'Active Worker', phone: '+15559990002', email: 'active@example.com' }]

    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(sendSMS).toHaveBeenCalledTimes(1)
    expect(notify).toHaveBeenCalledTimes(1)
  })

  it('MIXED: fired worker silently dropped, active worker still gets the broadcast', async () => {
    membersHolder.rows = [
      { id: 'tm-terminated', name: 'Fired Worker', phone: '+15559990001', email: 'fired@example.com' },
      { id: 'tm-active', name: 'Active Worker', phone: '+15559990002', email: 'active@example.com' },
    ]
    hrHolder.terminated = new Set(['tm-terminated'])

    const res = await POST(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(sendSMS).toHaveBeenCalledTimes(1)
    expect(sendSMS.mock.calls[0][0]).toMatchObject({ to: '+15559990002' })
    expect(body.sentTo).toBe(1)
    expect(body.reports.find((r: { name: string }) => r.name === 'Fired Worker')).toBeUndefined()
    expect(body.reports.find((r: { name: string }) => r.name === 'Active Worker')).toBeDefined()
  })
})

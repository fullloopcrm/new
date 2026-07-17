import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/cron/daily-summary — team_members.sms_consent guard on the 3-day
 * team lookahead SMS (P1/W2 fresh-ground, same missing-check shape as the
 * other sms_consent sites fixed this session: bookings/[id], bookings/batch,
 * POST /api/bookings, cron/reminders, cron/late-check-in,
 * cron/confirmations, routes/[id]/publish, admin/find-cleaner/send,
 * bookings/broadcast, admin/payments/confirm-match).
 *
 * team_members.sms_consent is a real, crew-editable column. Before this
 * fix, the "here are your next 3 days of jobs" SMS fired on `member.phone`
 * presence alone — a crew member who revoked SMS consent still got a real
 * text every daily-summary cron pass. Email + in-app notifications are
 * intentionally untouched — only the SMS leg is gated.
 */

const TENANT_ID = 'tid-cron-daily-summary-consent'

let teamMembersRows: Record<string, unknown>[] = []
let bookingsRows: Record<string, unknown>[] = []

const notifyMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))
vi.mock('@/lib/notify', () => ({ notify: (opts: Record<string, unknown>) => notifyMock(opts) }))

const sendSMSMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))
vi.mock('@/lib/sms', () => ({ sendSMS: (opts: Record<string, unknown>) => sendSMSMock(opts) }))

vi.mock('@/lib/sms-templates', () => ({
  smsDailySummary: vi.fn(() => 'summary'),
}))

vi.mock('@/lib/hr', () => ({ getTerminatedTeamMemberIds: vi.fn(async () => []) }))

type Filter = (row: Record<string, unknown>) => boolean

function makeTable(getRows: () => Record<string, unknown>[]) {
  return () => {
    const filters: Filter[] = []
    let limitN: number | undefined

    const dateCmp = (col: string, val: unknown, cmp: (a: number, b: number) => boolean): Filter =>
      (r) => cmp(new Date(r[col] as string).getTime(), new Date(val as string).getTime())

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      select: () => chain,
      eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return chain },
      neq: (col: string, val: unknown) => { filters.push((r) => r[col] !== val); return chain },
      in: (col: string, val: unknown[]) => { filters.push((r) => val.includes(r[col])); return chain },
      is: (col: string, val: unknown) => {
        filters.push((r) => (val === null ? r[col] === null || r[col] === undefined : r[col] === val))
        return chain
      },
      like: () => chain,
      gte: (col: string, val: unknown) => { filters.push(dateCmp(col, val, (a, b) => a >= b)); return chain },
      lte: (col: string, val: unknown) => { filters.push(dateCmp(col, val, (a, b) => a <= b)); return chain },
      gt: (col: string, val: unknown) => { filters.push(dateCmp(col, val, (a, b) => a > b)); return chain },
      lt: (col: string, val: unknown) => { filters.push(dateCmp(col, val, (a, b) => a < b)); return chain },
      not: () => chain,
      or: () => chain,
      order: () => chain,
      limit: (n: number) => { limitN = n; return chain },
      returns: () => chain,
      insert: () => ({ then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }) }),
      single: async () => {
        const hit = getRows().filter((r) => filters.every((f) => f(r)))
        return hit.length ? { data: hit[0], error: null } : { data: null, error: { code: 'PGRST116' } }
      },
      then: (resolve: (v: { data: unknown; error: null; count?: number }) => void) => {
        let hit = getRows().filter((r) => filters.every((f) => f(r)))
        if (limitN != null) hit = hit.slice(0, limitN)
        resolve({ data: hit, error: null, count: hit.length })
      },
    }
    return chain
  }
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') {
        return makeTable(() => [{
          id: TENANT_ID, name: 'Acme Cleaning', status: 'active', telnyx_api_key: 'tkey', telnyx_phone: '+15559990000', resend_api_key: null,
        }])()
      }
      if (table === 'team_members') return makeTable(() => teamMembersRows)()
      if (table === 'hr_employee_profiles') return makeTable(() => [])()
      if (table === 'bookings') return makeTable(() => bookingsRows)()
      if (table === 'recurring_schedules') return makeTable(() => [])()
      return makeTable(() => [])()
    },
  },
}))

import { GET } from './route'

function req() {
  return new Request('http://t/api/cron/daily-summary', { headers: { authorization: 'Bearer test-secret' } })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  notifyMock.mockClear()
  sendSMSMock.mockClear()

  teamMembersRows = [
    { id: 'tm-consented', tenant_id: TENANT_ID, name: 'Consenting Carl', phone: '+15550000001', email: 'carl@x.com', status: 'active', sms_consent: true },
    { id: 'tm-revoked', tenant_id: TENANT_ID, name: 'Revoked Rita', phone: '+15550000002', email: 'rita@x.com', status: 'active', sms_consent: false },
  ]

  const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
  bookingsRows = [
    {
      id: 'b-consented', tenant_id: TENANT_ID, team_member_id: 'tm-consented', status: 'confirmed',
      start_time: inTwoDays, end_time: inTwoDays, service_type: 'Clean',
      clients: { name: 'Alice', phone: null, address: null },
    },
    {
      id: 'b-revoked', tenant_id: TENANT_ID, team_member_id: 'tm-revoked', status: 'confirmed',
      start_time: inTwoDays, end_time: inTwoDays, service_type: 'Clean',
      clients: { name: 'Bob', phone: null, address: null },
    },
  ]
})

describe('cron/daily-summary — 3-day team lookahead sms_consent guard', () => {
  it('skips a crew member who revoked sms_consent, still texts one who consents (email/in-app untouched)', async () => {
    const res = await GET(req())
    expect(res.status).toBe(200)

    const teamSmsTo = sendSMSMock.mock.calls.map((c) => (c[0] as { to?: string }).to)
    expect(teamSmsTo).toContain('+15550000001')
    expect(teamSmsTo).not.toContain('+15550000002')

    // Email/in-app fan-out is untouched by this fix — both members still
    // get notified there.
    const teamNotifyIds = notifyMock.mock.calls
      .map((c) => c[0] as { recipientType?: string; recipientId?: string })
      .filter((o) => o.recipientType === 'team_member')
      .map((o) => o.recipientId)
    expect(teamNotifyIds).toContain('tm-consented')
    expect(teamNotifyIds).toContain('tm-revoked')
  })
})

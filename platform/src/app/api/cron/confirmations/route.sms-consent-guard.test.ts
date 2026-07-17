import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * GET /api/cron/confirmations — sms_consent/do_not_service gate on the
 * client day-before confirmation SMS (P1/W2 fresh-ground, 15th call site of
 * this session's missing-consent-check bug class — the direct-sendSMS()
 * sweep the prior round believed "the LAST ones" didn't cover this cron
 * file's client-facing block; the team-member confirm-request block already
 * has its own terminated-crew guard, see
 * route.terminated-crew-guard.test.ts, and is untouched by this fix).
 *
 * BUG (fixed here): the "just confirming your appointment tomorrow" text
 * fired on `client?.phone` presence alone, at 1pm the day before every
 * scheduled/confirmed booking. A client who had texted STOP
 * (sms_consent=false) or who is flagged do_not_service still got a real
 * day-before confirmation text.
 *
 * FIX: the client send now also gates on
 * `sms_consent !== false && !do_not_service`.
 */

const TENANT_ID = 'tid-cron-confirmations-consent'

let bookingsRows: Record<string, unknown>[] = []

const sendSMSMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))
vi.mock('@/lib/sms', () => ({ sendSMS: (opts: Record<string, unknown>) => sendSMSMock(opts) }))

vi.mock('@/lib/comms-prefs', () => ({
  getCommPrefs: vi.fn(async () => ({ comms: { confirmation_reminder: { sms: true } } })),
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
          id: TENANT_ID, name: 'Acme Cleaning', status: 'active', telnyx_api_key: 'tkey', telnyx_phone: '+15559990000',
        }])()
      }
      if (table === 'bookings') return makeTable(() => bookingsRows)()
      return makeTable(() => [])()
    },
  },
}))

import { GET } from './route'

function req() {
  return new Request('http://t/api/cron/confirmations', { headers: { authorization: 'Bearer test-secret' } })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  sendSMSMock.mockClear()

  // 1pm the "day before" gate — pin system time to 13:00 local so the
  // client day-before confirmation block runs.
  const now = new Date()
  now.setHours(13, 0, 0, 0)
  vi.useFakeTimers()
  vi.setSystemTime(now)

  const tomorrowStart = new Date(now)
  tomorrowStart.setDate(tomorrowStart.getDate() + 1)
  tomorrowStart.setHours(10, 0, 0, 0)

  bookingsRows = [
    {
      id: 'bk-blocked', tenant_id: TENANT_ID, client_id: 'c-blocked', status: 'scheduled', start_time: tomorrowStart.toISOString(), service_type: 'cleaning', team_member_id: null,
      clients: { name: 'Blocked Client', phone: '3005551111', sms_consent: false, do_not_service: false },
      team_members: null,
    },
    {
      id: 'bk-dns', tenant_id: TENANT_ID, client_id: 'c-dns', status: 'scheduled', start_time: tomorrowStart.toISOString(), service_type: 'cleaning', team_member_id: null,
      clients: { name: 'DNS Client', phone: '3005554444', sms_consent: true, do_not_service: true },
      team_members: null,
    },
    {
      id: 'bk-control', tenant_id: TENANT_ID, client_id: 'c-control', status: 'scheduled', start_time: tomorrowStart.toISOString(), service_type: 'cleaning', team_member_id: null,
      clients: { name: 'Control Client', phone: '3005552222', sms_consent: true, do_not_service: false },
      team_members: null,
    },
    {
      id: 'bk-null-consent', tenant_id: TENANT_ID, client_id: 'c-null', status: 'scheduled', start_time: tomorrowStart.toISOString(), service_type: 'cleaning', team_member_id: null,
      clients: { name: 'Null Consent Client', phone: '3005553333', sms_consent: null, do_not_service: false },
      team_members: null,
    },
  ]
})

afterEach(() => {
  vi.useRealTimers()
})

describe('cron/confirmations GET — client day-before confirmation', () => {
  it('BLOCKED: sms_consent=false client is not texted the day-before confirmation', async () => {
    await GET(req())
    const to = sendSMSMock.mock.calls.map((c) => (c[0] as { to?: string }).to)
    expect(to).not.toContain('3005551111')
  })

  it('BLOCKED: do_not_service=true client is not texted even with sms_consent=true', async () => {
    await GET(req())
    const to = sendSMSMock.mock.calls.map((c) => (c[0] as { to?: string }).to)
    expect(to).not.toContain('3005554444')
  })

  it('CONTROL: sms_consent=true, do_not_service=false client is still texted', async () => {
    await GET(req())
    const to = sendSMSMock.mock.calls.map((c) => (c[0] as { to?: string }).to)
    expect(to).toContain('3005552222')
  })

  it('CONTROL: sms_consent=null (never explicitly asked) defaults to allowed', async () => {
    await GET(req())
    const to = sendSMSMock.mock.calls.map((c) => (c[0] as { to?: string }).to)
    expect(to).toContain('3005553333')
  })

  it('only the control + null-consent clients get texted out of all 4 seeded bookings', async () => {
    await GET(req())
    expect(sendSMSMock).toHaveBeenCalledTimes(2)
  })
})

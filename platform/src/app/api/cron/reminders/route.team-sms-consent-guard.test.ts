import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * GET /api/cron/reminders — the hour-before TEAM-MEMBER SMS reminder never
 * checked team_members.sms_consent (P1/W2 fresh-ground: the client SMS
 * reminder in the exact same loop iteration DOES gate on sms_consent/
 * do_not_service — see route.sms-consent-guard.test.ts — but the team-member
 * reminder right below it never did).
 *
 * team_members.sms_consent is a real, crew-editable column since the
 * team-portal/preferences fix (crew's own SMS toggle) — a crew member who
 * revoked SMS consent still got texted "Job in 2 hours" every hourly cron
 * pass for every upcoming assigned booking.
 *
 * FIX: the team-member SMS send now also gates on `member?.sms_consent !== false`.
 */

const TENANT_ID = 'tid-cron-reminders-team-consent'

let bookingsRows: Record<string, unknown>[] = []

const notifyMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))
vi.mock('@/lib/notify', () => ({ notify: (opts: Record<string, unknown>) => notifyMock(opts) }))

const sendSMSMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))
vi.mock('@/lib/sms', () => ({ sendSMS: (opts: Record<string, unknown>) => sendSMSMock(opts) }))

vi.mock('@/lib/comms-prefs', () => ({
  getCommPrefs: vi.fn(async () => ({
    timing: { reminder_days: [1], reminder_hours_before: [2] },
    comms: { booking_reminder: { sms: true } },
  })),
}))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/push', () => ({ sendPushToClient: vi.fn(async () => {}) }))
vi.mock('@/lib/messaging/client-sms', () => ({
  clientSmsTemplatesFor: vi.fn(async () => ({ reminder: () => 'client reminder text' })),
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
      single: async () => {
        const hit = getRows().filter((r) => filters.every((f) => f(r)))
        return hit.length ? { data: hit[0], error: null } : { data: null, error: { code: 'PGRST116' } }
      },
      then: (resolve: (v: { data: unknown; error: null }) => void) => {
        let hit = getRows().filter((r) => filters.every((f) => f(r)))
        if (limitN != null) hit = hit.slice(0, limitN)
        resolve({ data: hit, error: null })
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
          id: TENANT_ID, name: 'Acme Cleaning', status: 'active', telnyx_api_key: 'tkey', telnyx_phone: '+15559990000', resend_api_key: 'rkey',
        }])()
      }
      if (table === 'bookings') return makeTable(() => bookingsRows)()
      return makeTable(() => [])()
    },
  },
}))

import { GET } from './route'

function req() {
  return new Request('http://t/api/cron/reminders', { headers: { authorization: 'Bearer test-secret' } })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  notifyMock.mockClear()
  sendSMSMock.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('cron/reminders — hour-before team-member reminder — sms_consent gate', () => {
  function setHourBasedTime() {
    vi.useFakeTimers()
    const now = new Date('2026-08-05T12:00:00.000Z')
    vi.setSystemTime(now)
    const soon = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    soon.setMinutes(30, 0, 0)
    return soon
  }

  it('BLOCKED: a crew member who revoked sms_consent is not texted the 2hr reminder', async () => {
    const soon = setHourBasedTime()
    bookingsRows = [{
      id: 'b1', tenant_id: TENANT_ID, client_id: null, team_member_id: 'tm-blocked', service_type: 'Clean',
      status: 'confirmed', start_time: soon.toISOString(),
      clients: null,
      team_members: { name: 'Blocked Crew', phone: '+15556660000', sms_consent: false },
    }]
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(sendSMSMock).not.toHaveBeenCalledWith(expect.objectContaining({ to: '+15556660000' }))
  })

  it('CONTROL: a consenting crew member is texted the 2hr reminder', async () => {
    const soon = setHourBasedTime()
    bookingsRows = [{
      id: 'b2', tenant_id: TENANT_ID, client_id: null, team_member_id: 'tm-control', service_type: 'Clean',
      status: 'confirmed', start_time: soon.toISOString(),
      clients: null,
      team_members: { name: 'Control Crew', phone: '+15557770000', sms_consent: true },
    }]
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(sendSMSMock).toHaveBeenCalledWith(expect.objectContaining({ to: '+15557770000' }))
  })
})

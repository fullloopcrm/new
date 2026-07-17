import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * GET /api/cron/confirmations — team_members.sms_consent guard on the
 * hourly team confirmation-request resend (P1/W2 fresh-ground: this route's
 * own route.sms-consent-guard.test.ts explicitly scoped OUT this block --
 * "the team-member confirm-request block already has its own
 * terminated-crew guard ... and is untouched by this fix" -- leaving it
 * open. Same missing-check shape as the other sms_consent sites fixed this
 * session: bookings/[id], bookings/batch, POST /api/bookings,
 * cron/reminders, cron/late-check-in, cron/daily-summary,
 * routes/[id]/publish, admin/find-cleaner/send, bookings/broadcast,
 * admin/payments/confirm-match.
 *
 * team_members.sms_consent is a real, crew-editable column. Before this
 * fix, a crew member who revoked SMS consent still got "please confirm
 * your job" texts every hour for up to 48 hours before a job.
 *
 * FIX: the team-member confirm-request send now also gates on
 * `member.sms_consent !== false`.
 */

const TENANT_ID = 'tid-cron-confirmations-team-consent'

let bookingsRows: Record<string, unknown>[] = []
let notificationsRows: Record<string, unknown>[] = []

const sendSMSMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))
vi.mock('@/lib/sms', () => ({ sendSMS: (opts: Record<string, unknown>) => sendSMSMock(opts) }))

vi.mock('@/lib/comms-prefs', () => ({
  getCommPrefs: vi.fn(async () => ({
    comms: { confirmation_reminder: { sms: true } },
  })),
}))

vi.mock('@/lib/hr', () => ({ getTerminatedTeamMemberIds: vi.fn(async () => []) }))

type Filter = (row: Record<string, unknown>) => boolean

function makeTable(getRows: () => Record<string, unknown>[], onInsert?: (row: Record<string, unknown>) => void) {
  return () => {
    const filters: Filter[] = []
    let limitN: number | undefined
    let order: { col: string; ascending: boolean } | undefined

    const dateCmp = (col: string, val: unknown, cmp: (a: number, b: number) => boolean): Filter =>
      (r) => cmp(new Date(r[col] as string).getTime(), new Date(val as string).getTime())

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      select: () => chain,
      eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return chain },
      neq: (col: string, val: unknown) => { filters.push((r) => r[col] !== val); return chain },
      in: (col: string, val: unknown[]) => { filters.push((r) => val.includes(r[col])); return chain },
      is: (col: string, val: unknown) => {
        filters.push((r) => (val === null ? r[col] === null || r[col] === undefined : r[col] !== null && r[col] !== undefined))
        return chain
      },
      gte: (col: string, val: unknown) => { filters.push(dateCmp(col, val, (a, b) => a >= b)); return chain },
      lte: (col: string, val: unknown) => { filters.push(dateCmp(col, val, (a, b) => a <= b)); return chain },
      gt: (col: string, val: unknown) => { filters.push(dateCmp(col, val, (a, b) => a > b)); return chain },
      lt: (col: string, val: unknown) => { filters.push(dateCmp(col, val, (a, b) => a < b)); return chain },
      not: () => chain,
      or: () => chain,
      order: (col: string, opts?: { ascending?: boolean }) => { order = { col, ascending: opts?.ascending !== false }; return chain },
      limit: (n: number) => { limitN = n; return chain },
      returns: () => chain,
      insert: (row: Record<string, unknown>) => {
        onInsert?.(row)
        return { then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }) }
      },
      single: async () => {
        let hit = getRows().filter((r) => filters.every((f) => f(r)))
        if (order) hit = [...hit].sort((a, b) => {
          const av = new Date(a[order!.col] as string).getTime()
          const bv = new Date(b[order!.col] as string).getTime()
          return order!.ascending ? av - bv : bv - av
        })
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
          id: TENANT_ID, name: 'Acme Cleaning', status: 'active', telnyx_api_key: 'tkey', telnyx_phone: '+15559990000',
        }])()
      }
      if (table === 'bookings') return makeTable(() => bookingsRows)()
      if (table === 'notifications') return makeTable(() => notificationsRows, (row) => notificationsRows.push(row))()
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
  notificationsRows = []
})

afterEach(() => {
  vi.useRealTimers()
})

describe('cron/confirmations — hourly team confirm-request resend sms_consent guard', () => {
  it('skips a crew member who revoked sms_consent, still texts one who consents', async () => {
    const now = new Date()
    const soon = new Date(now.getTime() + 4 * 60 * 60 * 1000)

    bookingsRows = [
      {
        id: 'b-consented', tenant_id: TENANT_ID, team_member_id: 'tm-consented', status: 'scheduled',
        start_time: soon.toISOString(), end_time: soon.toISOString(),
        clients: { name: 'Alice', address: '1 Main St' },
        team_members: { name: 'Consenting Carl', phone: '+15550000001', sms_consent: true },
      },
      {
        id: 'b-revoked', tenant_id: TENANT_ID, team_member_id: 'tm-revoked', status: 'scheduled',
        start_time: soon.toISOString(), end_time: soon.toISOString(),
        clients: { name: 'Bob', address: '2 Main St' },
        team_members: { name: 'Revoked Rita', phone: '+15550000002', sms_consent: false },
      },
    ]

    const res = await GET(req())
    expect(res.status).toBe(200)

    const smsTargets = sendSMSMock.mock.calls.map((c) => (c[0] as { to?: string }).to)
    expect(smsTargets).toContain('+15550000001')
    expect(smsTargets).not.toContain('+15550000002')
  })
})

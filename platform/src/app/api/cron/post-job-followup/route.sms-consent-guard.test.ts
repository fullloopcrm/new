import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/cron/post-job-followup — sms_consent/do_not_service gate on the
 * review-request SMS (P1/W2 fresh-ground, 14th call site of this session's
 * missing-consent-check bug class — the direct-sendSMS() sweep the prior
 * round believed "the LAST ones" didn't cover this cron file).
 *
 * BUG (fixed here): both the standalone-booking review request and the
 * job-level review request fired on `client?.phone` presence alone. A
 * client who had texted STOP (sms_consent=false) or who is flagged
 * do_not_service still got a real "how did everything go" review-request
 * text 2 hours after every completed job.
 *
 * FIX: both sends now also gate on
 * `sms_consent !== false && !do_not_service`.
 */

const TENANT_ID = 'tid-post-job-followup'

let bookingsRows: Record<string, unknown>[] = []
let jobsRows: Record<string, unknown>[] = []

const sendSMSMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))
vi.mock('@/lib/sms', () => ({ sendSMS: (opts: Record<string, unknown>) => sendSMSMock(opts) }))

vi.mock('@/lib/settings', () => ({
  getSettings: vi.fn(async () => ({
    chatbot_enabled: true,
    review_followup_enabled: true,
    review_followup_delay_hours: 2,
    google_review_link: 'https://g.page/r/test/review',
  })),
}))

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
      update: () => ({ eq: () => ({ then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }) }) }),
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
          id: TENANT_ID, name: 'Acme Cleaning', status: 'active', telnyx_api_key: 'tkey', telnyx_phone: '+15559990000', domain: null, slug: 'acme',
        }])()
      }
      if (table === 'bookings') return makeTable(() => bookingsRows)()
      if (table === 'jobs') return makeTable(() => jobsRows)()
      return makeTable(() => [])()
    },
  },
}))

import { GET } from './route'

function req() {
  return new Request('http://t/api/cron/post-job-followup', { headers: { authorization: 'Bearer test-secret' } })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  sendSMSMock.mockClear()
  jobsRows = []

  const checkOutTime = new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString()

  bookingsRows = [
    {
      id: 'bk-blocked', tenant_id: TENANT_ID, client_id: 'c-blocked', status: 'completed', job_id: null, notes: null, check_out_time: checkOutTime,
      clients: { name: 'Blocked Client', phone: '3005551111', sms_consent: false, do_not_service: false },
    },
    {
      id: 'bk-dns', tenant_id: TENANT_ID, client_id: 'c-dns', status: 'completed', job_id: null, notes: null, check_out_time: checkOutTime,
      clients: { name: 'DNS Client', phone: '3005554444', sms_consent: true, do_not_service: true },
    },
    {
      id: 'bk-control', tenant_id: TENANT_ID, client_id: 'c-control', status: 'completed', job_id: null, notes: null, check_out_time: checkOutTime,
      clients: { name: 'Control Client', phone: '3005552222', sms_consent: true, do_not_service: false },
    },
    {
      id: 'bk-null-consent', tenant_id: TENANT_ID, client_id: 'c-null', status: 'completed', job_id: null, notes: null, check_out_time: checkOutTime,
      clients: { name: 'Null Consent Client', phone: '3005553333', sms_consent: null, do_not_service: false },
    },
  ]
})

describe('cron/post-job-followup GET — standalone-booking review request', () => {
  it('BLOCKED: sms_consent=false client is not texted the review request', async () => {
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
})

describe('cron/post-job-followup GET — job-level review request', () => {
  beforeEach(() => {
    bookingsRows = []
    const completedAt = new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString()
    jobsRows = [
      {
        id: 'job-blocked', tenant_id: TENANT_ID, client_id: 'c-blocked', status: 'completed', completed_at: completedAt,
        clients: { name: 'Blocked Client', phone: '3005555555', sms_consent: false, do_not_service: false },
      },
      {
        id: 'job-control', tenant_id: TENANT_ID, client_id: 'c-control', status: 'completed', completed_at: completedAt,
        clients: { name: 'Control Client', phone: '3005556666', sms_consent: true, do_not_service: false },
      },
    ]
  })

  it('BLOCKED: sms_consent=false client is not texted the job review request', async () => {
    await GET(req())
    const to = sendSMSMock.mock.calls.map((c) => (c[0] as { to?: string }).to)
    expect(to).not.toContain('3005555555')
  })

  it('CONTROL: consented client still gets the job review request', async () => {
    await GET(req())
    const to = sendSMSMock.mock.calls.map((c) => (c[0] as { to?: string }).to)
    expect(to).toContain('3005556666')
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/cron/payment-followup-daily — sms_consent/do_not_service gate on
 * the unpaid-balance chase SMS (P1/W2 fresh-ground, 16th call site of this
 * session's missing-consent-check bug class — the same TCPA-exposure shape
 * as the sibling cron/payment-reminder's +15min nudge, fixed on this branch
 * earlier this session, but a separate cron file the direct-sendSMS()
 * sweep the prior round believed "the LAST ones" didn't reach).
 *
 * BUG (fixed here): the "your balance is still open" chase text fired on
 * `client?.phone` presence alone, up to 3x/day (8am/12pm/6pm ET) until the
 * booking was marked paid. A client who had texted STOP (sms_consent=false)
 * or who is flagged do_not_service still got a real payment-chase SMS.
 *
 * FIX: the send now also gates on
 * `sms_consent !== false && !do_not_service`.
 */

const TENANT_ID = 'tid-payment-followup-daily'

let bookingsRows: Record<string, unknown>[] = []
let smsLogsRows: Record<string, unknown>[] = []

const sendSMSMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))
vi.mock('@/lib/sms', () => ({ sendSMS: (opts: Record<string, unknown>) => sendSMSMock(opts) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => ({})) }))

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
          id: TENANT_ID, name: 'Acme Cleaning', status: 'active', telnyx_api_key: 'tkey', telnyx_phone: '+15559990000', payment_link: 'https://pay.example.com/acme', owner_phone: null, phone: null,
        }])()
      }
      if (table === 'bookings') return makeTable(() => bookingsRows)()
      if (table === 'sms_logs') return makeTable(() => smsLogsRows)()
      return makeTable(() => [])()
    },
  },
}))

import { GET } from './route'

function req() {
  return new Request('http://t/api/cron/payment-followup-daily?force=1', { headers: { authorization: 'Bearer test-secret' } })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  sendSMSMock.mockClear()
  smsLogsRows = []

  const endTime = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()

  bookingsRows = [
    {
      id: 'bk-blocked', tenant_id: TENANT_ID, client_id: 'c-blocked', status: 'completed', price: 10000, end_time: endTime, payment_status: 'unpaid', payment_method: null,
      clients: { name: 'Blocked Client', phone: '3005551111', sms_consent: false, do_not_service: false },
    },
    {
      id: 'bk-dns', tenant_id: TENANT_ID, client_id: 'c-dns', status: 'completed', price: 10000, end_time: endTime, payment_status: 'unpaid', payment_method: null,
      clients: { name: 'DNS Client', phone: '3005554444', sms_consent: true, do_not_service: true },
    },
    {
      id: 'bk-control', tenant_id: TENANT_ID, client_id: 'c-control', status: 'completed', price: 10000, end_time: endTime, payment_status: 'unpaid', payment_method: null,
      clients: { name: 'Control Client', phone: '3005552222', sms_consent: true, do_not_service: false },
    },
    {
      id: 'bk-null-consent', tenant_id: TENANT_ID, client_id: 'c-null', status: 'completed', price: 10000, end_time: endTime, payment_status: 'unpaid', payment_method: null,
      clients: { name: 'Null Consent Client', phone: '3005553333', sms_consent: null, do_not_service: false },
    },
  ]
})

describe('cron/payment-followup-daily GET — unpaid-balance chase SMS', () => {
  it('BLOCKED: sms_consent=false client is not texted the payment chase', async () => {
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

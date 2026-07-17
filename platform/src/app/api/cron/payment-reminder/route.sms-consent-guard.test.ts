import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * cron/payment-reminder GET (generic non-nycmaid tenant path) — the +15min
 * client nudge never checked sms_consent or do_not_service (P1/W2
 * fresh-ground, same missing-consent-check bug class as
 * payment-followup-daily's fix on p1-w1 (commit 359c1d50) — a separate cron
 * file with the same real-money "chase until paid" shape, but wired to the
 * raw consent-blind sendSMS() from '@/lib/sms' instead of a consent-aware
 * wrapper).
 *
 * BUG (fixed here): the +15min "just following up on your payment" nudge
 * fired on `client?.phone` presence alone. A client who had texted STOP
 * (sms_consent=false) or who is flagged do_not_service still got a real
 * payment-chase SMS every ~5 minutes this cron ran until the booking was
 * marked paid.
 *
 * FIX: the nudge send now also gates on
 * `client.sms_consent !== false && !client.do_not_service`. The +60min
 * admin escalation is deliberately left ungated — it contacts the tenant
 * owner, not the client, same scope every other fix this session applies
 * (schedules/pause, reviews/request).
 */

const TENANT_ID = 'tid-payment-reminder'

let bookingsRows: Record<string, unknown>[] = []

const sendSMSMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))
vi.mock('@/lib/sms', () => ({ sendSMS: (opts: Record<string, unknown>) => sendSMSMock(opts) }))

vi.mock('@/lib/comms-prefs', () => ({
  getCommPrefs: vi.fn(async () => ({ comms: { payment_reminder: { sms: true } } })),
}))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/nycmaid/payment-reminder', () => ({
  runNycMaidPaymentReminder: vi.fn(async () => ({ nudges: 0, flagged: 0 })),
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
      update: () => ({
        eq: () => ({ eq: () => ({ then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }) }) }),
        neq: () => ({ lt: () => ({ is: () => ({ then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }) }) }) }),
      }),
      insert: () => ({ then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }) }),
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
          id: TENANT_ID, name: 'Acme Cleaning', status: 'active', telnyx_api_key: 'tkey', telnyx_phone: '+15559990000', owner_phone: null, phone: null,
        }])()
      }
      if (table === 'bookings') return makeTable(() => bookingsRows)()
      return makeTable(() => [])()
    },
  },
}))

import { GET } from './route'

function req() {
  return new Request('http://t/api/cron/payment-reminder', { headers: { authorization: 'Bearer test-secret' } })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  sendSMSMock.mockClear()

  // 20 minutes past the 15-min alert -> in the <30min "nudge" branch.
  const alertTime = new Date(Date.now() - 20 * 60 * 1000).toISOString()

  bookingsRows = [
    {
      id: 'bk-blocked', tenant_id: TENANT_ID, payment_status: 'pending', payment_reminder_sent_at: null, fifteen_min_alert_time: alertTime,
      clients: { name: 'Blocked Client', phone: '3005551111', sms_consent: false, do_not_service: false },
    },
    {
      id: 'bk-dns', tenant_id: TENANT_ID, payment_status: 'pending', payment_reminder_sent_at: null, fifteen_min_alert_time: alertTime,
      clients: { name: 'DNS Client', phone: '3005554444', sms_consent: true, do_not_service: true },
    },
    {
      id: 'bk-control', tenant_id: TENANT_ID, payment_status: 'pending', payment_reminder_sent_at: null, fifteen_min_alert_time: alertTime,
      clients: { name: 'Control Client', phone: '3005552222', sms_consent: true, do_not_service: false },
    },
    {
      id: 'bk-null-consent', tenant_id: TENANT_ID, payment_status: 'pending', payment_reminder_sent_at: null, fifteen_min_alert_time: alertTime,
      clients: { name: 'Null Consent Client', phone: '3005553333', sms_consent: null, do_not_service: false },
    },
  ]
})

describe('cron/payment-reminder GET — sms_consent / do_not_service gate on the +15min client nudge', () => {
  it('BLOCKED: sms_consent=false client is not texted the payment nudge', async () => {
    const res = await GET(req())
    expect(res.status).toBe(200)
    const to = sendSMSMock.mock.calls.map((c) => (c[0] as { to?: string }).to)
    expect(to).not.toContain('3005551111')
  })

  it('BLOCKED: do_not_service=true client is not texted even with sms_consent=true', async () => {
    const res = await GET(req())
    expect(res.status).toBe(200)
    const to = sendSMSMock.mock.calls.map((c) => (c[0] as { to?: string }).to)
    expect(to).not.toContain('3005554444')
  })

  it('CONTROL: sms_consent=true, do_not_service=false client is still texted', async () => {
    const res = await GET(req())
    expect(res.status).toBe(200)
    const to = sendSMSMock.mock.calls.map((c) => (c[0] as { to?: string }).to)
    expect(to).toContain('3005552222')
  })

  it('CONTROL: sms_consent=null (never explicitly asked) defaults to allowed', async () => {
    const res = await GET(req())
    expect(res.status).toBe(200)
    const to = sendSMSMock.mock.calls.map((c) => (c[0] as { to?: string }).to)
    expect(to).toContain('3005553333')
  })

  it('only the control + null-consent clients get texted out of all 4 seeded bookings', async () => {
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(sendSMSMock).toHaveBeenCalledTimes(2)
  })
})

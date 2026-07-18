import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * cron/payment-followup-daily GET — tenantServesSite() status gate on the
 * tenant fetch itself.
 *
 * BUG (fixed here): the tenant fetch filtered `.eq('status', 'active')`
 * instead of tenantServesSite(). That's STRICTER than the session's usual
 * "dead tenant kept getting serviced" bug class — it also silently excluded
 * 'setup'/'pending' tenants, which tenant-status.ts's own docstring says
 * must still be servable (their public site + booking flow is already live
 * per middleware's gate). An unpaid completed booking never got its
 * real-money payment-chase text until the tenant flipped to 'active'.
 *
 * FIX: fetch all tenants (with status) and filter in-memory via
 * tenantServesSite() — excludes only suspended/cancelled/deleted, includes
 * setup/pending/active.
 */

const ACTIVE_TENANT_ID = 't-active'
const PENDING_TENANT_ID = 't-pending'
const SUSPENDED_TENANT_ID = 't-suspended'

let tenantRows: Record<string, unknown>[]
let bookingRows: Record<string, unknown>[]

const sendSMSMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))
vi.mock('@/lib/sms', () => ({ sendSMS: (opts: Record<string, unknown>) => sendSMSMock(opts) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => ({ success: true })) }))

type Filter = (row: Record<string, unknown>) => boolean

function makeTable(getRows: () => Record<string, unknown>[]) {
  return () => {
    const filters: Filter[] = []
    const dateCmp = (col: string, val: unknown, cmp: (a: number, b: number) => boolean): Filter =>
      (r) => cmp(new Date(r[col] as string).getTime(), new Date(val as string).getTime())
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      select: () => chain,
      eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return chain },
      not: (col: string, op: string, val: unknown) => {
        if (op === 'in') {
          const values = String(val).replace(/[()"]/g, '').split(',')
          filters.push((r) => !values.includes(r[col] as string))
        } else {
          filters.push((r) => (val === null ? r[col] != null : true))
        }
        return chain
      },
      is: (col: string, val: unknown) => {
        filters.push((r) => (val === null ? r[col] == null : r[col] === val))
        return chain
      },
      gt: (col: string, val: unknown) => { filters.push((r) => Number(r[col]) > Number(val)); return chain },
      gte: (col: string, val: unknown) => { filters.push(dateCmp(col, val, (a, b) => a >= b)); return chain },
      insert: () => ({ then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }) }),
      then: (resolve: (v: { data: unknown; error: null; count: number }) => void) => {
        const hit = getRows().filter((r) => filters.every((f) => f(r)))
        resolve({ data: hit, error: null, count: hit.length })
      },
    }
    return chain
  }
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => makeTable(() => {
      if (table === 'tenants') return tenantRows
      if (table === 'bookings') return bookingRows
      if (table === 'sms_logs') return []
      return []
    })(),
  },
}))

import { GET } from './route'

function req() {
  return new Request('http://t/api/cron/payment-followup-daily?force=1', { headers: { authorization: 'Bearer test-secret' } })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  sendSMSMock.mockClear()

  tenantRows = [
    { id: ACTIVE_TENANT_ID, name: 'Active Co', status: 'active', telnyx_api_key: 'tkey', telnyx_phone: '+15559990000', sms_number: null, payment_link: 'https://pay.example.com/active', owner_phone: null, phone: null },
    { id: PENDING_TENANT_ID, name: 'Onboarding Co', status: 'pending', telnyx_api_key: 'tkey', telnyx_phone: '+15559990001', sms_number: null, payment_link: 'https://pay.example.com/pending', owner_phone: null, phone: null },
    { id: SUSPENDED_TENANT_ID, name: 'Dead Co', status: 'suspended', telnyx_api_key: 'tkey', telnyx_phone: '+15559990002', sms_number: null, payment_link: 'https://pay.example.com/dead', owner_phone: null, phone: null },
  ]

  const endTime = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()

  function unpaid(tenantId: string, id: string, phone: string) {
    return {
      id, tenant_id: tenantId, client_id: `c-${id}`, price: 10000, end_time: endTime,
      status: 'completed', payment_status: 'unpaid', payment_method: null,
      clients: { name: 'Client', phone, sms_consent: true, do_not_service: false },
    }
  }

  bookingRows = [
    unpaid(ACTIVE_TENANT_ID, 'bk-active', '3005551000'),
    unpaid(PENDING_TENANT_ID, 'bk-pending', '3005552000'),
    unpaid(SUSPENDED_TENANT_ID, 'bk-suspended', '3005553000'),
  ]
})

describe('cron/payment-followup-daily GET — tenantServesSite() status gate on the tenant fetch', () => {
  it('BLOCKED: a suspended tenant\'s unpaid booking gets no payment-chase text', async () => {
    await GET(req())
    const to = sendSMSMock.mock.calls.map((c) => (c[0] as { to?: string }).to)
    expect(to).not.toContain('3005553000')
  })

  it("CONTROL: a 'pending' (onboarding) tenant's unpaid booking still gets the payment-chase text", async () => {
    await GET(req())
    const to = sendSMSMock.mock.calls.map((c) => (c[0] as { to?: string }).to)
    expect(to).toContain('3005552000')
  })

  it("CONTROL: an active tenant's unpaid booking still gets the payment-chase text", async () => {
    await GET(req())
    const to = sendSMSMock.mock.calls.map((c) => (c[0] as { to?: string }).to)
    expect(to).toContain('3005551000')
  })
})

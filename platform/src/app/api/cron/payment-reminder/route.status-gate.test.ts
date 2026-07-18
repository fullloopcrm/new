import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * cron/payment-reminder GET — tenantServesSite() status gate on the tenant
 * fetch itself.
 *
 * BUG (fixed here): the tenant fetch filtered `.eq('status', 'active')`
 * instead of tenantServesSite(). That's STRICTER than the session's usual
 * "dead tenant kept getting serviced" bug class — it also silently excluded
 * 'setup'/'pending' tenants, which tenant-status.ts's own docstring says
 * must still be servable (their public site + booking flow is already live
 * per middleware's gate). A real booking taken during a tenant's onboarding
 * window got zero payment nudges/escalations until the tenant flipped to
 * 'active'.
 *
 * FIX: fetch all tenants (with status) and filter in-memory via
 * tenantServesSite() — excludes only suspended/cancelled/deleted, includes
 * setup/pending/active.
 */

const ACTIVE_TENANT_ID = 't-active'
const PENDING_TENANT_ID = 't-pending'
const SUSPENDED_TENANT_ID = 't-suspended'

let tenantRows: Record<string, unknown>[]
let bookingsRows: Record<string, unknown>[]

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
      if (table === 'tenants') return makeTable(() => tenantRows)()
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

  const alertTime = new Date(Date.now() - 20 * 60 * 1000).toISOString() // 20min -> <30min nudge branch

  tenantRows = [
    { id: ACTIVE_TENANT_ID, name: 'Active Co', status: 'active', telnyx_api_key: 'tkey', telnyx_phone: '+15559990000', owner_phone: null, phone: null },
    { id: PENDING_TENANT_ID, name: 'Onboarding Co', status: 'pending', telnyx_api_key: 'tkey', telnyx_phone: '+15559990001', owner_phone: null, phone: null },
    { id: SUSPENDED_TENANT_ID, name: 'Dead Co', status: 'suspended', telnyx_api_key: 'tkey', telnyx_phone: '+15559990002', owner_phone: null, phone: null },
  ]

  bookingsRows = [
    {
      id: 'bk-active', tenant_id: ACTIVE_TENANT_ID, payment_status: 'pending', payment_reminder_sent_at: null, fifteen_min_alert_time: alertTime,
      clients: { name: 'Active Client', phone: '3005551000', sms_consent: true, do_not_service: false },
    },
    {
      id: 'bk-pending', tenant_id: PENDING_TENANT_ID, payment_status: 'pending', payment_reminder_sent_at: null, fifteen_min_alert_time: alertTime,
      clients: { name: 'Pending Client', phone: '3005552000', sms_consent: true, do_not_service: false },
    },
    {
      id: 'bk-suspended', tenant_id: SUSPENDED_TENANT_ID, payment_status: 'pending', payment_reminder_sent_at: null, fifteen_min_alert_time: alertTime,
      clients: { name: 'Dead Tenant Client', phone: '3005553000', sms_consent: true, do_not_service: false },
    },
  ]
})

describe('cron/payment-reminder GET — tenantServesSite() status gate on the tenant fetch', () => {
  it('BLOCKED: a suspended tenant gets no payment nudge', async () => {
    const res = await GET(req())
    expect(res.status).toBe(200)
    const to = sendSMSMock.mock.calls.map((c) => (c[0] as { to?: string }).to)
    expect(to).not.toContain('3005553000')
  })

  it("CONTROL: a 'pending' (onboarding) tenant still gets its payment nudge", async () => {
    const res = await GET(req())
    expect(res.status).toBe(200)
    const to = sendSMSMock.mock.calls.map((c) => (c[0] as { to?: string }).to)
    expect(to).toContain('3005552000')
  })

  it('CONTROL: an active tenant still gets its payment nudge', async () => {
    const res = await GET(req())
    expect(res.status).toBe(200)
    const to = sendSMSMock.mock.calls.map((c) => (c[0] as { to?: string }).to)
    expect(to).toContain('3005551000')
  })

  it('only the active + pending tenants are texted, not the suspended one', async () => {
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(sendSMSMock).toHaveBeenCalledTimes(2)
  })
})

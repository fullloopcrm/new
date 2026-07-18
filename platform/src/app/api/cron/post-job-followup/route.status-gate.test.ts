import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * cron/post-job-followup GET — tenantServesSite() status gate on the tenant
 * fetch itself.
 *
 * BUG (fixed here): the tenant fetch filtered `.eq('status', 'active')`
 * instead of tenantServesSite(). That's STRICTER than the session's usual
 * "dead tenant kept getting serviced" bug class — it also silently excluded
 * 'setup'/'pending' tenants, which tenant-status.ts's own docstring says
 * must still be servable (their public site + booking flow is already live
 * per middleware's gate). A real completed booking taken during a tenant's
 * onboarding window got zero post-job review-request texts until the tenant
 * flipped to 'active'.
 *
 * FIX: fetch all tenants (with status) and filter in-memory via
 * tenantServesSite() — excludes only suspended/cancelled/deleted, includes
 * setup/pending/active.
 */

const ACTIVE_TENANT_ID = 't-active'
const PENDING_TENANT_ID = 't-pending'
const SUSPENDED_TENANT_ID = 't-suspended'

let tenantRows: Record<string, unknown>[]
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
      if (table === 'tenants') return makeTable(() => tenantRows)()
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

  tenantRows = [
    { id: ACTIVE_TENANT_ID, name: 'Active Co', status: 'active', telnyx_api_key: 'tkey', telnyx_phone: '+15559990000', domain: null, slug: 'active-co' },
    { id: PENDING_TENANT_ID, name: 'Onboarding Co', status: 'pending', telnyx_api_key: 'tkey', telnyx_phone: '+15559990001', domain: null, slug: 'onboarding-co' },
    { id: SUSPENDED_TENANT_ID, name: 'Dead Co', status: 'suspended', telnyx_api_key: 'tkey', telnyx_phone: '+15559990002', domain: null, slug: 'dead-co' },
  ]

  const checkOutTime = new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString()

  bookingsRows = [
    {
      id: 'bk-active', tenant_id: ACTIVE_TENANT_ID, client_id: 'c-active', status: 'completed', job_id: null, notes: null, check_out_time: checkOutTime,
      clients: { name: 'Active Client', phone: '3005551000', sms_consent: true, do_not_service: false },
    },
    {
      id: 'bk-pending', tenant_id: PENDING_TENANT_ID, client_id: 'c-pending', status: 'completed', job_id: null, notes: null, check_out_time: checkOutTime,
      clients: { name: 'Pending Client', phone: '3005552000', sms_consent: true, do_not_service: false },
    },
    {
      id: 'bk-suspended', tenant_id: SUSPENDED_TENANT_ID, client_id: 'c-suspended', status: 'completed', job_id: null, notes: null, check_out_time: checkOutTime,
      clients: { name: 'Dead Tenant Client', phone: '3005553000', sms_consent: true, do_not_service: false },
    },
  ]
})

describe('cron/post-job-followup GET — tenantServesSite() status gate on the tenant fetch', () => {
  it('BLOCKED: a suspended tenant gets no review-request text', async () => {
    await GET(req())
    const to = sendSMSMock.mock.calls.map((c) => (c[0] as { to?: string }).to)
    expect(to).not.toContain('3005553000')
  })

  it("CONTROL: a 'pending' (onboarding) tenant still gets its review-request text", async () => {
    await GET(req())
    const to = sendSMSMock.mock.calls.map((c) => (c[0] as { to?: string }).to)
    expect(to).toContain('3005552000')
  })

  it('CONTROL: an active tenant still gets its review-request text', async () => {
    await GET(req())
    const to = sendSMSMock.mock.calls.map((c) => (c[0] as { to?: string }).to)
    expect(to).toContain('3005551000')
  })

  it('only the active + pending tenants are texted, not the suspended one', async () => {
    await GET(req())
    expect(sendSMSMock).toHaveBeenCalledTimes(2)
  })
})

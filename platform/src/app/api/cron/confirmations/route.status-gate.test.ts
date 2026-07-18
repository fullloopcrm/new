import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * cron/confirmations GET — tenantServesSite() status gate on the tenant
 * fetch itself.
 *
 * BUG (fixed here): the tenant fetch filtered `.eq('status', 'active')`
 * instead of tenantServesSite(). That's STRICTER than the session's usual
 * "dead tenant kept getting serviced" bug class — it also silently excluded
 * 'setup'/'pending' tenants, which tenant-status.ts's own docstring says
 * must still be servable (their public site + booking flow is already live
 * per middleware's gate). An unconfirmed team-member job never got its
 * hourly confirm-request resend until the tenant flipped to 'active'.
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
vi.mock('@/lib/comms-prefs', () => ({ getCommPrefs: vi.fn(async () => ({ comms: { confirmation_reminder: { sms: true } } })) }))
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
      in: (col: string, val: unknown[]) => { filters.push((r) => val.includes(r[col])); return chain },
      not: (col: string, _op: string, val: unknown) => { filters.push((r) => (val === null ? r[col] != null : true)); return chain },
      gte: (col: string, val: unknown) => { filters.push(dateCmp(col, val, (a, b) => a >= b)); return chain },
      lte: (col: string, val: unknown) => { filters.push(dateCmp(col, val, (a, b) => a <= b)); return chain },
      order: () => chain,
      limit: (n: number) => { limitN = n; return chain },
      returns: () => chain,
      insert: () => ({ then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }) }),
      single: async () => ({ data: null, error: { code: 'PGRST116' } }),
      then: (resolve: (v: { data: unknown; error: null; count: number }) => void) => {
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
    from: (table: string) => makeTable(() => {
      if (table === 'tenants') return tenantRows
      if (table === 'bookings') return bookingRows
      return []
    })(),
  },
}))

import { GET } from './route'

function req() {
  return new Request('http://t/api/cron/confirmations', { headers: { authorization: 'Bearer test-secret' } })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  sendSMSMock.mockClear()

  tenantRows = [
    { id: ACTIVE_TENANT_ID, name: 'Active Co', status: 'active', telnyx_api_key: 'tkey', telnyx_phone: '+15559990000' },
    { id: PENDING_TENANT_ID, name: 'Onboarding Co', status: 'pending', telnyx_api_key: 'tkey', telnyx_phone: '+15559990001' },
    { id: SUSPENDED_TENANT_ID, name: 'Dead Co', status: 'suspended', telnyx_api_key: 'tkey', telnyx_phone: '+15559990002' },
  ]

  const startTime = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()

  function job(tenantId: string, id: string, phone: string) {
    return {
      id, tenant_id: tenantId, start_time: startTime, end_time: startTime, team_member_id: `tm-${id}`,
      status: 'scheduled',
      clients: { name: 'Client', address: '1 Main St' },
      team_members: { name: 'Cleaner', phone, sms_consent: true },
    }
  }

  bookingRows = [
    job(ACTIVE_TENANT_ID, 'bk-active', '3005551000'),
    job(PENDING_TENANT_ID, 'bk-pending', '3005552000'),
    job(SUSPENDED_TENANT_ID, 'bk-suspended', '3005553000'),
  ]
})

describe('cron/confirmations GET — tenantServesSite() status gate on the tenant fetch', () => {
  it('BLOCKED: a suspended tenant\'s unconfirmed job gets no confirm-request resend', async () => {
    await GET(req())
    const to = sendSMSMock.mock.calls.map((c) => (c[0] as { to?: string }).to)
    expect(to).not.toContain('3005553000')
  })

  it("CONTROL: a 'pending' (onboarding) tenant's unconfirmed job still gets the resend", async () => {
    await GET(req())
    const to = sendSMSMock.mock.calls.map((c) => (c[0] as { to?: string }).to)
    expect(to).toContain('3005552000')
  })

  it("CONTROL: an active tenant's unconfirmed job still gets the resend", async () => {
    await GET(req())
    const to = sendSMSMock.mock.calls.map((c) => (c[0] as { to?: string }).to)
    expect(to).toContain('3005551000')
  })
})

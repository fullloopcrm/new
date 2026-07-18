import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * cron/outreach GET — tenantServesSite() status gate on the tenant fetch
 * itself.
 *
 * BUG (fixed here): the tenant fetch filtered `.eq('status', 'active')`
 * instead of tenantServesSite(). That's STRICTER than the session's usual
 * "dead tenant kept getting serviced" bug class — it also silently excluded
 * 'setup'/'pending' tenants, which tenant-status.ts's own docstring says
 * must still be servable (their public site + booking flow is already live
 * per middleware's gate). An eligible client never got the seasonal win-back
 * outreach text until the tenant flipped to 'active'.
 *
 * FIX: fetch all tenants (with status) and filter in-memory via
 * tenantServesSite() — excludes only suspended/cancelled/deleted, includes
 * setup/pending/active.
 */

const ACTIVE_TENANT_ID = 't-active'
const PENDING_TENANT_ID = 't-pending'
const SUSPENDED_TENANT_ID = 't-suspended'

let tenantRows: Record<string, unknown>[]
let clientRows: Record<string, unknown>[]

const sendSMSMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))
vi.mock('@/lib/sms', () => ({ sendSMS: (opts: Record<string, unknown>) => sendSMSMock(opts) }))
vi.mock('@/lib/comms-prefs', () => ({ getCommPrefs: vi.fn(async () => ({ comms: { retention: { sms: true } } })) }))
vi.mock('@/lib/outreach', () => ({
  getActiveMoments: () => [{ id: 'moment-1' }],
  pickMessage: () => 'Hey! Long time no see.',
  qualifiesForMoment: () => true,
}))

type Filter = (row: Record<string, unknown>) => boolean

function makeTable(table: string, getRows: () => Record<string, unknown>[]) {
  return () => {
    const filters: Filter[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      select: () => chain,
      eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return chain },
      neq: (col: string, val: unknown) => { filters.push((r) => r[col] !== val); return chain },
      in: (col: string, val: unknown[]) => { filters.push((r) => val.includes(r[col])); return chain },
      not: (col: string, _op: string, val: unknown) => { filters.push((r) => (val === null ? r[col] != null : true)); return chain },
      gte: () => chain,
      update: () => ({ eq: () => ({ eq: () => ({ then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }) }) }) }),
      insert: () => ({ then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }) }),
      then: (resolve: (v: { data: unknown; error: null }) => void) => {
        resolve({ data: getRows().filter((r) => filters.every((f) => f(r))), error: null })
      },
    }
    return chain
  }
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => makeTable(table, () => {
      if (table === 'tenants') return tenantRows
      if (table === 'clients') return clientRows
      return []
    })(),
  },
}))

import { GET } from './route'

function req() {
  return new Request('http://t/api/cron/outreach', { headers: { authorization: 'Bearer test-secret' } })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  sendSMSMock.mockClear()

  tenantRows = [
    { id: ACTIVE_TENANT_ID, name: 'Active Co', status: 'active', telnyx_api_key: 'tkey', telnyx_phone: '+15559990000', selena_config: null },
    { id: PENDING_TENANT_ID, name: 'Onboarding Co', status: 'pending', telnyx_api_key: 'tkey', telnyx_phone: '+15559990001', selena_config: null },
    { id: SUSPENDED_TENANT_ID, name: 'Dead Co', status: 'suspended', telnyx_api_key: 'tkey', telnyx_phone: '+15559990002', selena_config: null },
  ]

  clientRows = [
    { id: 'c-active', tenant_id: ACTIVE_TENANT_ID, status: 'active', name: 'Active Client', phone: '3005551000', pet_name: null, pet_type: null, do_not_service: false, sms_marketing_opt_out: false, sms_consent: true, outreach_count: 0 },
    { id: 'c-pending', tenant_id: PENDING_TENANT_ID, status: 'active', name: 'Pending Client', phone: '3005552000', pet_name: null, pet_type: null, do_not_service: false, sms_marketing_opt_out: false, sms_consent: true, outreach_count: 0 },
    { id: 'c-suspended', tenant_id: SUSPENDED_TENANT_ID, status: 'active', name: 'Dead Client', phone: '3005553000', pet_name: null, pet_type: null, do_not_service: false, sms_marketing_opt_out: false, sms_consent: true, outreach_count: 0 },
  ]
})

describe('cron/outreach GET — tenantServesSite() status gate on the tenant fetch', () => {
  it('BLOCKED: a suspended tenant\'s client gets no seasonal outreach text', async () => {
    await GET(req())
    const to = sendSMSMock.mock.calls.map((c) => (c[0] as { to?: string }).to)
    expect(to).not.toContain('3005553000')
  })

  it("CONTROL: a 'pending' (onboarding) tenant's client still gets the outreach text", async () => {
    await GET(req())
    const to = sendSMSMock.mock.calls.map((c) => (c[0] as { to?: string }).to)
    expect(to).toContain('3005552000')
  })

  it("CONTROL: an active tenant's client still gets the outreach text", async () => {
    await GET(req())
    const to = sendSMSMock.mock.calls.map((c) => (c[0] as { to?: string }).to)
    expect(to).toContain('3005551000')
  })
})

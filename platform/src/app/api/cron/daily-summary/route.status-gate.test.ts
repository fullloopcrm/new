import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * cron/daily-summary GET — tenantServesSite() status gate on the tenant
 * fetch itself.
 *
 * BUG (fixed here): the tenant fetch filtered `.eq('status', 'active')`
 * instead of tenantServesSite(). That's STRICTER than the session's usual
 * "dead tenant kept getting serviced" bug class — it also silently excluded
 * 'setup'/'pending' tenants, which tenant-status.ts's own docstring says
 * must still be servable (their public site + booking flow is already live
 * per middleware's gate). A tenant's admin never got the 8am daily summary
 * email until the tenant flipped to 'active'.
 *
 * FIX: fetch all tenants (with status) and filter in-memory via
 * tenantServesSite() — excludes only suspended/cancelled/deleted, includes
 * setup/pending/active.
 */

const ACTIVE_TENANT_ID = 't-active'
const PENDING_TENANT_ID = 't-pending'
const SUSPENDED_TENANT_ID = 't-suspended'

let tenantRows: Record<string, unknown>[]

const notifyMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))
vi.mock('@/lib/notify', () => ({ notify: (opts: Record<string, unknown>) => notifyMock(opts) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/hr', () => ({ getTerminatedTeamMemberIds: vi.fn(async () => []) }))

type Filter = (row: Record<string, unknown>) => boolean

function makeTable(getRows: () => Record<string, unknown>[]) {
  return () => {
    const filters: Filter[] = []
    let limitN: number | undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      select: () => chain,
      eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return chain },
      not: () => chain,
      in: (col: string, val: unknown[]) => { filters.push((r) => val.includes(r[col])); return chain },
      gte: () => chain,
      lte: () => chain,
      lt: () => chain,
      gt: () => chain,
      order: () => chain,
      limit: (n: number) => { limitN = n; return chain },
      returns: () => chain,
      insert: () => ({ then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }) }),
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
    from: (table: string) => makeTable(() => (table === 'tenants' ? tenantRows : []))(),
  },
}))

import { GET } from './route'

function req() {
  return new Request('http://t/api/cron/daily-summary', { headers: { authorization: 'Bearer test-secret' } })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  notifyMock.mockClear()

  tenantRows = [
    { id: ACTIVE_TENANT_ID, name: 'Active Co', status: 'active', telnyx_api_key: 'tkey', telnyx_phone: '+15559990000', resend_api_key: 'rkey' },
    { id: PENDING_TENANT_ID, name: 'Onboarding Co', status: 'pending', telnyx_api_key: 'tkey', telnyx_phone: '+15559990001', resend_api_key: 'rkey' },
    { id: SUSPENDED_TENANT_ID, name: 'Dead Co', status: 'suspended', telnyx_api_key: 'tkey', telnyx_phone: '+15559990002', resend_api_key: 'rkey' },
  ]
})

describe('cron/daily-summary GET — tenantServesSite() status gate on the tenant fetch', () => {
  it('BLOCKED: a suspended tenant gets no daily summary email', async () => {
    await GET(req())
    const tenantIds = notifyMock.mock.calls.map((c) => (c[0] as { tenantId?: string }).tenantId)
    expect(tenantIds).not.toContain(SUSPENDED_TENANT_ID)
  })

  it("CONTROL: a 'pending' (onboarding) tenant still gets its daily summary email", async () => {
    await GET(req())
    const tenantIds = notifyMock.mock.calls.map((c) => (c[0] as { tenantId?: string }).tenantId)
    expect(tenantIds).toContain(PENDING_TENANT_ID)
  })

  it('CONTROL: an active tenant still gets its daily summary email', async () => {
    await GET(req())
    const tenantIds = notifyMock.mock.calls.map((c) => (c[0] as { tenantId?: string }).tenantId)
    expect(tenantIds).toContain(ACTIVE_TENANT_ID)
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * cron/rating-prompt GET — tenantServesSite() status gate on the tenant
 * fetch itself.
 *
 * BUG (fixed here): the tenant fetch filtered `.eq('status', 'active')`
 * instead of tenantServesSite(). That's STRICTER than the session's usual
 * "dead tenant kept getting serviced" bug class — it also silently excluded
 * 'setup'/'pending' tenants, which tenant-status.ts's own docstring says
 * must still be servable (their public site + booking flow is already live
 * per middleware's gate). A completed, checked-out job never got its
 * post-service rating prompt until the tenant flipped to 'active'.
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

const sendClientSMSMock = vi.fn(async (_clientId: string, ..._rest: unknown[]) => ({ success: true }))
vi.mock('@/lib/nycmaid/client-contacts', () => ({ sendClientSMS: (clientId: string, ...rest: unknown[]) => sendClientSMSMock(clientId, ...rest) }))
vi.mock('@/lib/messaging/client-sms', () => ({
  clientSmsTemplatesFor: vi.fn(async () => ({ ratingQ1: () => 'How was your service today?' })),
}))
vi.mock('@/lib/nycmaid/auth', () => ({ protectCronAPI: () => null }))

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
      is: (col: string, val: unknown) => {
        filters.push((r) => (val === null ? r[col] == null : r[col] === val))
        return chain
      },
      not: () => chain,
      gte: (col: string, val: unknown) => { filters.push(dateCmp(col, val, (a, b) => a >= b)); return chain },
      lte: (col: string, val: unknown) => { filters.push(dateCmp(col, val, (a, b) => a <= b)); return chain },
      limit: (n: number) => { limitN = n; return chain },
      update: () => ({ eq: () => ({ eq: () => ({ then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }) }) }) }),
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
    from: (table: string) => makeTable(() => {
      if (table === 'tenants') return tenantRows
      if (table === 'bookings') return bookingRows
      return []
    })(),
  },
}))

import { GET } from './route'

function req() {
  return new Request('http://t/api/cron/rating-prompt')
}

beforeEach(() => {
  sendClientSMSMock.mockClear()

  tenantRows = [
    { id: ACTIVE_TENANT_ID, name: 'Active Co', status: 'active' },
    { id: PENDING_TENANT_ID, name: 'Onboarding Co', status: 'pending' },
    { id: SUSPENDED_TENANT_ID, name: 'Dead Co', status: 'suspended' },
  ]

  const checkOutTime = new Date(Date.now() - 45 * 60 * 1000).toISOString()

  function job(tenantId: string, id: string, clientId: string) {
    return {
      id, tenant_id: tenantId, client_id: clientId, cleaner_id: null, start_time: checkOutTime,
      status: 'completed', check_out_time: checkOutTime, rating_prompt_sent_at: null,
      clients: { name: 'Client' }, cleaners: null,
    }
  }

  bookingRows = [
    job(ACTIVE_TENANT_ID, 'bk-active', 'c-active'),
    job(PENDING_TENANT_ID, 'bk-pending', 'c-pending'),
    job(SUSPENDED_TENANT_ID, 'bk-suspended', 'c-suspended'),
  ]
})

describe('cron/rating-prompt GET — tenantServesSite() status gate on the tenant fetch', () => {
  it('BLOCKED: a suspended tenant\'s completed job gets no rating prompt', async () => {
    await GET(req())
    const clientIds = sendClientSMSMock.mock.calls.map((c) => c[0])
    expect(clientIds).not.toContain('c-suspended')
  })

  it("CONTROL: a 'pending' (onboarding) tenant's completed job still gets the rating prompt", async () => {
    await GET(req())
    const clientIds = sendClientSMSMock.mock.calls.map((c) => c[0])
    expect(clientIds).toContain('c-pending')
  })

  it("CONTROL: an active tenant's completed job still gets the rating prompt", async () => {
    await GET(req())
    const clientIds = sendClientSMSMock.mock.calls.map((c) => c[0])
    expect(clientIds).toContain('c-active')
  })
})

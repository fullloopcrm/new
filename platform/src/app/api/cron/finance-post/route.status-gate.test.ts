import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * cron/finance-post POST — tenantServesSite() status gate on the tenant
 * fetch itself.
 *
 * BUG (fixed here): the tenant fetch filtered `.eq('status', 'active')`
 * instead of tenantServesSite(). That's STRICTER than the session's usual
 * "dead tenant kept getting serviced" bug class — it also silently excluded
 * 'setup'/'pending' tenants, which tenant-status.ts's own docstring says
 * must still be servable (their public site + booking flow is already live
 * per middleware's gate). A real booking taken during a tenant's onboarding
 * window never got its revenue/labor/commissions posted to the ledger by
 * this safety-net job until the tenant flipped to 'active'.
 *
 * FIX: fetch all tenants (with status) and filter in-memory via
 * tenantServesSite() — excludes only suspended/cancelled/deleted, includes
 * setup/pending/active.
 */

const ACTIVE_TENANT_ID = 't-active'
const PENDING_TENANT_ID = 't-pending'
const SUSPENDED_TENANT_ID = 't-suspended'

let tenantRows: Record<string, unknown>[]

const revenueMock = vi.fn(async (_id: string) => ({ revenuePosted: 0, cogsPosted: 0 }))
const laborMock = vi.fn(async (_id: string) => ({ payouts: 0, payroll: 0 }))
const commissionsMock = vi.fn(async (_id: string) => ({ accrued: 0, paid: 0 }))
vi.mock('@/lib/finance/post-revenue', () => ({ backfillRevenueFromBookings: (id: string) => revenueMock(id) }))
vi.mock('@/lib/finance/post-labor', () => ({ backfillUnpostedLabor: (id: string) => laborMock(id) }))
vi.mock('@/lib/finance/post-adjustments', () => ({ backfillUnpostedCommissions: (id: string) => commissionsMock(id) }))

type Filter = (row: Record<string, unknown>) => boolean

function makeTable(getRows: () => Record<string, unknown>[]) {
  return () => {
    const filters: Filter[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      select: () => chain,
      eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return chain },
      then: (resolve: (v: { data: unknown; error: null }) => void) => {
        resolve({ data: getRows().filter((r) => filters.every((f) => f(r))), error: null })
      },
    }
    return chain
  }
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => makeTable(() => (table === 'tenants' ? tenantRows : []))() },
}))

import { POST } from './route'

function req() {
  return new Request('http://t/api/cron/finance-post', { method: 'POST', headers: { authorization: 'Bearer test-secret' } })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  revenueMock.mockClear()
  laborMock.mockClear()
  commissionsMock.mockClear()

  tenantRows = [
    { id: ACTIVE_TENANT_ID, status: 'active' },
    { id: PENDING_TENANT_ID, status: 'pending' },
    { id: SUSPENDED_TENANT_ID, status: 'suspended' },
  ]
})

describe('cron/finance-post POST — tenantServesSite() status gate on the tenant fetch', () => {
  it('BLOCKED: a suspended tenant never gets its ledger backfilled', async () => {
    await POST(req())
    expect(revenueMock).not.toHaveBeenCalledWith(SUSPENDED_TENANT_ID)
    expect(laborMock).not.toHaveBeenCalledWith(SUSPENDED_TENANT_ID)
    expect(commissionsMock).not.toHaveBeenCalledWith(SUSPENDED_TENANT_ID)
  })

  it("CONTROL: a 'pending' (onboarding) tenant still gets its ledger backfilled", async () => {
    await POST(req())
    expect(revenueMock).toHaveBeenCalledWith(PENDING_TENANT_ID)
    expect(laborMock).toHaveBeenCalledWith(PENDING_TENANT_ID)
    expect(commissionsMock).toHaveBeenCalledWith(PENDING_TENANT_ID)
  })

  it('CONTROL: an active tenant still gets its ledger backfilled', async () => {
    await POST(req())
    expect(revenueMock).toHaveBeenCalledWith(ACTIVE_TENANT_ID)
  })
})

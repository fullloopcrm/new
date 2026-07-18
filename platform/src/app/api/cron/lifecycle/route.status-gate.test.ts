import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * cron/lifecycle GET — tenantServesSite() status gate on the tenant fetch
 * itself.
 *
 * BUG (fixed here): the tenant fetch filtered `.eq('status', 'active')`
 * instead of tenantServesSite(). That's STRICTER than the session's usual
 * "dead tenant kept getting serviced" bug class — it also silently excluded
 * 'setup'/'pending' tenants, which tenant-status.ts's own docstring says
 * must still be servable (their public site + booking flow is already live
 * per middleware's gate). A tenant's clients never had their New/Active/
 * At-Risk/Churned lifecycle stage updated until the tenant flipped to
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
const clientsTenantIdsSeen: string[] = []

vi.mock('@/lib/error-tracking', () => ({ trackError: vi.fn(async () => {}) }))

type Filter = (row: Record<string, unknown>) => boolean

function makeTable(table: string, getRows: () => Record<string, unknown>[]) {
  return () => {
    const filters: Filter[] = []
    let limitN: number | undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      select: () => chain,
      eq: (col: string, val: unknown) => {
        if (table === 'clients' && col === 'tenant_id') clientsTenantIdsSeen.push(val as string)
        filters.push((r) => r[col] === val)
        return chain
      },
      in: (col: string, val: unknown[]) => { filters.push((r) => val.includes(r[col])); return chain },
      lt: () => chain,
      gte: () => chain,
      limit: (n: number) => { limitN = n; return chain },
      update: () => chain,
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
    from: (table: string) => makeTable(table, () => (table === 'tenants' ? tenantRows : []))(),
  },
}))

import { GET } from './route'

function req() {
  return new Request('http://t/api/cron/lifecycle', { headers: { authorization: 'Bearer test-secret' } })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  clientsTenantIdsSeen.length = 0

  tenantRows = [
    { id: ACTIVE_TENANT_ID, name: 'Active Co', status: 'active' },
    { id: PENDING_TENANT_ID, name: 'Onboarding Co', status: 'pending' },
    { id: SUSPENDED_TENANT_ID, name: 'Dead Co', status: 'suspended' },
  ]
})

describe('cron/lifecycle GET — tenantServesSite() status gate on the tenant fetch', () => {
  it("BLOCKED: a suspended tenant's clients are never processed", async () => {
    await GET(req())
    expect(clientsTenantIdsSeen).not.toContain(SUSPENDED_TENANT_ID)
  })

  it("CONTROL: a 'pending' (onboarding) tenant's clients are still processed", async () => {
    await GET(req())
    expect(clientsTenantIdsSeen).toContain(PENDING_TENANT_ID)
  })

  it("CONTROL: an active tenant's clients are still processed", async () => {
    await GET(req())
    expect(clientsTenantIdsSeen).toContain(ACTIVE_TENANT_ID)
  })
})

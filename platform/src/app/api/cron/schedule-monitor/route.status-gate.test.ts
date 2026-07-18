import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * cron/schedule-monitor GET — tenantServesSite() status gate on the tenant
 * fetch itself.
 *
 * BUG (fixed here): the tenant fetch filtered `.eq('status', 'active')`
 * instead of tenantServesSite(). That's STRICTER than the session's usual
 * "dead tenant kept getting serviced" bug class — it also silently excluded
 * 'setup'/'pending' tenants, which tenant-status.ts's own docstring says
 * must still be servable (their public site + booking flow is already live
 * per middleware's gate). A real booking taken during a tenant's onboarding
 * window never got schedule-conflict detection (or the self-healing
 * reconcile) until the tenant flipped to 'active'.
 *
 * FIX: fetch all tenants (with status) and filter in-memory via
 * tenantServesSite() — excludes only suspended/cancelled/deleted, includes
 * setup/pending/active.
 */

const ACTIVE_TENANT_ID = 't-active'
const PENDING_TENANT_ID = 't-pending'
const SUSPENDED_TENANT_ID = 't-suspended'

let tenantRows: Record<string, unknown>[]
const bookingsTenantIdsSeen: string[] = []

vi.mock('@/lib/hr', () => ({ getTerminatedTeamMemberIds: vi.fn(async () => []) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))

type Filter = (row: Record<string, unknown>) => boolean

function makeTable(table: string, getRows: () => Record<string, unknown>[]) {
  return () => {
    const filters: Filter[] = []
    let limitN: number | undefined

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      select: () => chain,
      eq: (col: string, val: unknown) => {
        if (table === 'bookings' && col === 'tenant_id') bookingsTenantIdsSeen.push(val as string)
        filters.push((r) => r[col] === val)
        return chain
      },
      neq: () => chain,
      in: (col: string, val: unknown[]) => { filters.push((r) => val.includes(r[col])); return chain },
      is: (col: string, val: unknown) => {
        filters.push((r) => (val === null ? r[col] == null : r[col] === val))
        return chain
      },
      gte: () => chain,
      lte: () => chain,
      gt: () => chain,
      lt: () => chain,
      not: () => chain,
      or: () => chain,
      order: () => chain,
      limit: (n: number) => { limitN = n; return chain },
      returns: () => chain,
      update: () => ({ in: () => ({ then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }) }) }),
      insert: () => ({ then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }) }),
      single: async () => ({ data: null, error: { code: 'PGRST116' } }),
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
  return new Request('http://t/api/cron/schedule-monitor', { headers: { authorization: 'Bearer test-secret' } })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  bookingsTenantIdsSeen.length = 0

  tenantRows = [
    { id: ACTIVE_TENANT_ID, name: 'Active Co', status: 'active' },
    { id: PENDING_TENANT_ID, name: 'Onboarding Co', status: 'pending' },
    { id: SUSPENDED_TENANT_ID, name: 'Dead Co', status: 'suspended' },
  ]
})

describe('cron/schedule-monitor GET — tenantServesSite() status gate on the tenant fetch', () => {
  it('BLOCKED: a suspended tenant is never scanned for schedule issues', async () => {
    await GET(req())
    expect(bookingsTenantIdsSeen).not.toContain(SUSPENDED_TENANT_ID)
  })

  it("CONTROL: a 'pending' (onboarding) tenant is still scanned", async () => {
    await GET(req())
    expect(bookingsTenantIdsSeen).toContain(PENDING_TENANT_ID)
  })

  it('CONTROL: an active tenant is still scanned', async () => {
    await GET(req())
    expect(bookingsTenantIdsSeen).toContain(ACTIVE_TENANT_ID)
  })
})

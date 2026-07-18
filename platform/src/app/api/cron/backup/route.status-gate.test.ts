import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * cron/backup GET — tenantServesSite() status gate on the tenant fetch
 * itself.
 *
 * BUG (fixed here): the tenant fetch filtered `.eq('status', 'active')`
 * instead of tenantServesSite(). That's STRICTER than the session's usual
 * "dead tenant kept getting serviced" bug class — it also silently excluded
 * 'setup'/'pending' tenants, which tenant-status.ts's own docstring says
 * must still be servable (their public site + booking flow is already live
 * per middleware's gate). A tenant's real onboarding-window data (clients,
 * bookings, etc.) never got a nightly JSON snapshot until the tenant
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
const uploadPaths: string[] = []

type Filter = (row: Record<string, unknown>) => boolean

function makeTable(getRows: () => Record<string, unknown>[]) {
  return () => {
    const filters: Filter[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      select: () => chain,
      eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return chain },
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
    from: (table: string) => makeTable(() => (table === 'tenants' ? tenantRows : []))(),
    storage: {
      from: () => ({
        upload: async (path: string) => { uploadPaths.push(path); return { error: null } },
      }),
    },
  },
}))

import { GET } from './route'

function req() {
  return new Request('http://t/api/cron/backup', { headers: { authorization: 'Bearer test-secret' } })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  uploadPaths.length = 0

  tenantRows = [
    { id: ACTIVE_TENANT_ID, name: 'Active Co', slug: 'active-co', status: 'active' },
    { id: PENDING_TENANT_ID, name: 'Onboarding Co', slug: 'onboarding-co', status: 'pending' },
    { id: SUSPENDED_TENANT_ID, name: 'Dead Co', slug: 'dead-co', status: 'suspended' },
  ]
})

describe('cron/backup GET — tenantServesSite() status gate on the tenant fetch', () => {
  it('BLOCKED: a suspended tenant gets no nightly snapshot', async () => {
    await GET(req())
    expect(uploadPaths.some((p) => p.includes('dead-co'))).toBe(false)
  })

  it("CONTROL: a 'pending' (onboarding) tenant still gets its nightly snapshot", async () => {
    await GET(req())
    expect(uploadPaths.some((p) => p.includes('onboarding-co'))).toBe(true)
  })

  it('CONTROL: an active tenant still gets its nightly snapshot', async () => {
    await GET(req())
    expect(uploadPaths.some((p) => p.includes('active-co'))).toBe(true)
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * cron/phone-fixup GET — tenantServesSite() status gate on the tenant fetch
 * itself.
 *
 * BUG (fixed here): the tenant fetch filtered `.eq('status', 'active')`
 * instead of tenantServesSite(). That's STRICTER than the session's usual
 * "dead tenant kept getting serviced" bug class — it also silently excluded
 * 'setup'/'pending' tenants, which tenant-status.ts's own docstring says
 * must still be servable (their public site + booking flow is already live
 * per middleware's gate). A cleaner with a bad phone number never got the
 * self-correct email link until the tenant flipped to 'active'.
 *
 * FIX: fetch all tenants (with status) and filter in-memory via
 * tenantServesSite() — excludes only suspended/cancelled/deleted, includes
 * setup/pending/active.
 */

const ACTIVE_TENANT_ID = 't-active'
const PENDING_TENANT_ID = 't-pending'
const SUSPENDED_TENANT_ID = 't-suspended'

let tenantRows: Record<string, unknown>[]
let cleanerRows: Record<string, unknown>[]

const sendEmailMock = vi.fn(async (_to: string, ..._rest: unknown[]) => ({ success: true }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: (to: string, ...rest: unknown[]) => sendEmailMock(to, ...rest) }))
vi.mock('@/lib/nycmaid/auth', () => ({ protectCronAPI: () => null }))
vi.mock('@/lib/nycmaid/phone-validator', () => ({ validateUsPhone: (p: string) => ({ valid: p === 'good' }) }))
vi.mock('@/lib/nycmaid/phone-fixup-token', () => ({ createPhoneFixupToken: () => 'tok' }))
vi.mock('@/lib/domains', () => ({ getPrimaryTenantDomain: vi.fn(async () => null) }))

type Filter = (row: Record<string, unknown>) => boolean

function makeTable(table: string, getRows: () => Record<string, unknown>[]) {
  return () => {
    const filters: Filter[] = []
    let limitN: number | undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      select: () => chain,
      eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return chain },
      gte: () => chain,
      limit: (n: number) => { limitN = n; return chain },
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
    from: (table: string) => makeTable(table, () => {
      if (table === 'tenants') return tenantRows
      if (table === 'cleaners') return cleanerRows
      return []
    })(),
  },
}))

import { GET } from './route'

function req() {
  return new Request('http://t/api/cron/phone-fixup')
}

beforeEach(() => {
  sendEmailMock.mockClear()

  tenantRows = [
    { id: ACTIVE_TENANT_ID, name: 'Active Co', status: 'active', domain: null, website_url: null },
    { id: PENDING_TENANT_ID, name: 'Onboarding Co', status: 'pending', domain: null, website_url: null },
    { id: SUSPENDED_TENANT_ID, name: 'Dead Co', status: 'suspended', domain: null, website_url: null },
  ]

  cleanerRows = [
    { id: 'cl-active', tenant_id: ACTIVE_TENANT_ID, name: 'Active Cleaner', email: 'a@x.com', phone: 'bad', active: true },
    { id: 'cl-pending', tenant_id: PENDING_TENANT_ID, name: 'Pending Cleaner', email: 'p@x.com', phone: 'bad', active: true },
    { id: 'cl-suspended', tenant_id: SUSPENDED_TENANT_ID, name: 'Dead Cleaner', email: 's@x.com', phone: 'bad', active: true },
  ]
})

describe('cron/phone-fixup GET — tenantServesSite() status gate on the tenant fetch', () => {
  it('BLOCKED: a suspended tenant\'s cleaners get no phone-fixup email', async () => {
    await GET(req())
    const to = sendEmailMock.mock.calls.map((c) => c[0])
    expect(to).not.toContain('s@x.com')
  })

  it("CONTROL: a 'pending' (onboarding) tenant's cleaners still get the phone-fixup email", async () => {
    await GET(req())
    const to = sendEmailMock.mock.calls.map((c) => c[0])
    expect(to).toContain('p@x.com')
  })

  it("CONTROL: an active tenant's cleaners still get the phone-fixup email", async () => {
    await GET(req())
    const to = sendEmailMock.mock.calls.map((c) => c[0])
    expect(to).toContain('a@x.com')
  })
})

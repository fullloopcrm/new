import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * sync-google-reviews cron — tenantServesSite() status gate.
 *
 * Same bug class as every other cross-tenant fan-out fixed this session:
 * this loop never checked tenantServesSite() before spending a real Google
 * API call + writing review rows + firing an admin notification for a
 * suspended/cancelled/deleted tenant.
 */

const getValidAccessToken = vi.fn(async (_tenantId: string) => 'token-123')
const getGoogleBusiness = vi.fn(async (_tenantId: string) => ({ location_name: 'accounts/1/locations/1' }))
vi.mock('@/lib/google', () => ({
  getValidAccessToken: (...args: [string]) => getValidAccessToken(...args),
  getGoogleBusiness: (...args: [string]) => getGoogleBusiness(...args),
}))

const fetchMock = vi.fn(async () => ({
  ok: true,
  json: async () => ({ reviews: [] }),
}))
vi.stubGlobal('fetch', fetchMock)

const SUSPENDED_TENANT_ID = 't-suspended'
const ACTIVE_TENANT_ID = 't-active'

let tenantRows: Record<string, unknown>[]

function tenantsBuilder() {
  const obj: Record<string, unknown> = {
    select: () => obj,
    not: () => obj,
    then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: tenantRows, error: null }).then(resolve),
  }
  return obj
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') return tenantsBuilder()
      throw new Error(`unexpected table ${table}`)
    },
  },
}))

process.env.CRON_SECRET = 'test-cron-secret'
const { GET } = await import('./route')

function req() {
  return new Request('http://t/api/cron/sync-google-reviews', {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  })
}

beforeEach(() => {
  getValidAccessToken.mockClear()
  getGoogleBusiness.mockClear()
  fetchMock.mockClear()
})

describe('sync-google-reviews cron — tenantServesSite() status gate', () => {
  it.each(['suspended', 'cancelled', 'deleted'])(
    'skips a %s tenant entirely (no Google API call), but still syncs an active tenant',
    async (status) => {
      tenantRows = [
        { id: SUSPENDED_TENANT_ID, name: 'Suspended Co', status, google_tokens: { access_token: 'x' }, google_business: {} },
        { id: ACTIVE_TENANT_ID, name: 'Active Co', status: 'active', google_tokens: { access_token: 'y' }, google_business: {} },
      ]

      const res = await GET(req())
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(getValidAccessToken).toHaveBeenCalledTimes(1)
      expect(getValidAccessToken).toHaveBeenCalledWith(ACTIVE_TENANT_ID)
      expect(body.results).toEqual([{ tenant: 'Active Co', synced: 0, new: 0 }])
    },
  )

  it.each(['active', 'setup', 'pending'])('still syncs a %s tenant', async (status) => {
    tenantRows = [{ id: ACTIVE_TENANT_ID, name: 'Active Co', status, google_tokens: { access_token: 'y' }, google_business: {} }]

    const res = await GET(req())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(getValidAccessToken).toHaveBeenCalledTimes(1)
    expect(body.results).toEqual([{ tenant: 'Active Co', synced: 0, new: 0 }])
  })
})

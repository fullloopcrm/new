import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * auto-reply-reviews cron — tenantServesSite() status gate.
 *
 * Same bug class as sync-google-reviews (fixed earlier this session): this
 * loop never checked tenantServesSite() before spending a real Google
 * Business Profile API call to post a PUBLIC reply on a tenant's behalf — a
 * suspended/cancelled/deleted tenant kept auto-replying to its Google
 * reviews indefinitely.
 */

const autoReplyReviews = vi.fn(async (_tenantId: string) => 1)
vi.mock('@/lib/google-reviews', () => ({
  autoReplyReviews: (tenantId: string) => autoReplyReviews(tenantId),
}))

const SUSPENDED_TENANT_ID = 't-suspended'
const ACTIVE_TENANT_ID = 't-active'

let settingsRows: Record<string, unknown>[]
let tenantStatusMap: Record<string, string | null>

function tenantSettingsBuilder() {
  const obj: Record<string, unknown> = {
    select: () => obj,
    eq: () => obj,
    then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: settingsRows, error: null }).then(resolve),
  }
  return obj
}

function tenantsBuilder() {
  const state: { ids: string[] } = { ids: [] }
  const obj: Record<string, unknown> = {
    select: () => obj,
    in: (_col: string, vals: string[]) => {
      state.ids = vals
      return obj
    },
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve({
        data: state.ids.map((id) => ({ id, status: tenantStatusMap[id] ?? null })),
        error: null,
      }).then(resolve),
  }
  return obj
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenant_settings') return tenantSettingsBuilder()
      if (table === 'tenants') return tenantsBuilder()
      throw new Error(`unexpected table ${table}`)
    },
  },
}))

process.env.CRON_SECRET = 'test-cron-secret'
const { GET } = await import('./route')

function req() {
  return new Request('http://t/api/cron/auto-reply-reviews', {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  })
}

beforeEach(() => {
  autoReplyReviews.mockClear()
})

describe('auto-reply-reviews cron — tenantServesSite() status gate', () => {
  it.each(['suspended', 'cancelled', 'deleted'])(
    'does not auto-reply for a %s tenant, but still replies for an active tenant',
    async (status) => {
      tenantStatusMap = { [SUSPENDED_TENANT_ID]: status, [ACTIVE_TENANT_ID]: 'active' }
      settingsRows = [
        { tenant_id: SUSPENDED_TENANT_ID },
        { tenant_id: ACTIVE_TENANT_ID },
      ]

      const res = await GET(req())
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(autoReplyReviews).toHaveBeenCalledTimes(1)
      expect(autoReplyReviews).toHaveBeenCalledWith(ACTIVE_TENANT_ID)
      expect(body.results).toEqual([{ tenant_id: ACTIVE_TENANT_ID, replied: 1 }])
    },
  )

  it.each(['active', 'setup', 'pending'])('still replies for a %s tenant', async (status) => {
    tenantStatusMap = { [ACTIVE_TENANT_ID]: status }
    settingsRows = [{ tenant_id: ACTIVE_TENANT_ID }]

    const res = await GET(req())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(autoReplyReviews).toHaveBeenCalledTimes(1)
    expect(body.results).toEqual([{ tenant_id: ACTIVE_TENANT_ID, replied: 1 }])
  })
})

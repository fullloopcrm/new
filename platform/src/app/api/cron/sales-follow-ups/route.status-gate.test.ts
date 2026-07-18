import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * sales-follow-ups cron — tenantServesSite() status gate.
 *
 * Same bug class as every other cross-tenant fan-out fixed this session:
 * deals carries no tenant status of its own, and this loop never checked
 * tenantServesSite() before notifying admins (and SMSing them, for nycmaid)
 * about a due follow-up on a suspended/cancelled/deleted tenant.
 */

const notify = vi.fn(async (_arg: unknown) => ({}))
vi.mock('@/lib/notify', () => ({ notify: (arg: unknown) => notify(arg) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
const smsAdmins = vi.fn(async (_arg: string) => ({}))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: (arg: string) => smsAdmins(arg) }))

const SUSPENDED_TENANT_ID = 't-suspended'
const ACTIVE_TENANT_ID = 't-active'

let dealRows: Record<string, unknown>[]
let tenantStatusMap: Record<string, string | null>

function dealsBuilder() {
  const obj: Record<string, unknown> = {
    select: () => obj,
    not: () => obj,
    lte: () => obj,
    gte: () => obj,
    then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: dealRows, error: null }).then(resolve),
  }
  return obj
}

function notificationsBuilder() {
  const obj: Record<string, unknown> = {
    select: () => obj,
    eq: () => obj,
    gte: () => obj,
    then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve),
  }
  return obj
}

function tenantsBuilder() {
  const eqs: Record<string, unknown> = {}
  const obj: Record<string, unknown> = {
    select: () => obj,
    in: (_col: string, vals: string[]) => {
      eqs.__in = vals
      return obj
    },
    then: (resolve: (v: unknown) => unknown) => {
      const ids = (eqs.__in as string[] | undefined) || []
      return Promise.resolve({ data: ids.map((id) => ({ id, status: tenantStatusMap[id] ?? null })), error: null }).then(resolve)
    },
  }
  return obj
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'deals') return dealsBuilder()
      if (table === 'notifications') return notificationsBuilder()
      if (table === 'tenants') return tenantsBuilder()
      throw new Error(`unexpected table ${table}`)
    },
  },
}))

process.env.CRON_SECRET = 'test-cron-secret'
const { GET } = await import('./route')

function req() {
  return new Request('http://t/api/cron/sales-follow-ups', {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  })
}

beforeEach(() => {
  notify.mockClear()
  smsAdmins.mockClear()
})

describe('sales-follow-ups cron — tenantServesSite() status gate', () => {
  it.each(['suspended', 'cancelled', 'deleted'])(
    'skips a %s tenant\'s due deal, but still notifies an active tenant\'s admin',
    async (status) => {
      tenantStatusMap = { [SUSPENDED_TENANT_ID]: status, [ACTIVE_TENANT_ID]: 'active' }
      dealRows = [
        { id: 'd1', tenant_id: SUSPENDED_TENANT_ID, follow_up_at: new Date().toISOString(), follow_up_note: 'call back', clients: { name: 'Sue' } },
        { id: 'd2', tenant_id: ACTIVE_TENANT_ID, follow_up_at: new Date().toISOString(), follow_up_note: 'call back', clients: { name: 'Al' } },
      ]

      const res = await GET(req())
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.reminded).toBe(1)
      expect(notify).toHaveBeenCalledTimes(1)
      expect(notify).toHaveBeenCalledWith(expect.objectContaining({ tenantId: ACTIVE_TENANT_ID }))
    },
  )

  it.each(['active', 'setup', 'pending'])('still notifies a %s tenant\'s admin', async (status) => {
    tenantStatusMap = { [ACTIVE_TENANT_ID]: status }
    dealRows = [
      { id: 'd1', tenant_id: ACTIVE_TENANT_ID, follow_up_at: new Date().toISOString(), follow_up_note: 'call back', clients: { name: 'Al' } },
    ]

    const res = await GET(req())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.reminded).toBe(1)
    expect(notify).toHaveBeenCalledTimes(1)
  })
})

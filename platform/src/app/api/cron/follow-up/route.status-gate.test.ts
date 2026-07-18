import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * follow-up cron — tenantServesSite() status gate.
 *
 * Same bug class as every other cross-tenant fan-out fixed this session
 * (Telegram, Telnyx webhooks, comhub-email, generate-recurring cron): this
 * loop queried bookings across ALL tenants with zero tenant status filter,
 * so a suspended/cancelled/deleted tenant's completed booking still
 * triggered a real promotional "thank you, book again" email to that
 * tenant's own customer 3 days later.
 */

const notify = vi.fn(async (_arg: unknown) => ({}))
vi.mock('@/lib/notify', () => ({ notify: (arg: unknown) => notify(arg) }))

const SUSPENDED_TENANT_ID = 't-suspended'
const ACTIVE_TENANT_ID = 't-active'

let bookingRows: Record<string, unknown>[]
let tenantStatusMap: Record<string, string | null>

function tenantsBuilder() {
  const eqs: Record<string, unknown> = {}
  const obj: Record<string, unknown> = {
    select: () => obj,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return obj
    },
    single: async () => ({
      data: eqs.id ? { name: 'Some Biz', status: tenantStatusMap[eqs.id as string] ?? null } : null,
      error: null,
    }),
  }
  return obj
}

function bookingsBuilder() {
  const obj: Record<string, unknown> = {
    select: () => obj,
    in: () => obj,
    gte: () => obj,
    lte: () => obj,
    then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: bookingRows, error: null }).then(resolve),
  }
  return obj
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') return tenantsBuilder()
      if (table === 'bookings') return bookingsBuilder()
      throw new Error(`unexpected table ${table}`)
    },
  },
}))

process.env.CRON_SECRET = 'test-cron-secret'
const { GET } = await import('./route')

function req() {
  return new Request('http://t/api/cron/follow-up', {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  })
}

beforeEach(() => {
  notify.mockClear()
})

describe('follow-up cron — tenantServesSite() status gate', () => {
  it.each(['suspended', 'cancelled', 'deleted'])(
    'skips a %s tenant\'s completed booking, but still emails an active tenant\'s customer',
    async (status) => {
      tenantStatusMap = { [SUSPENDED_TENANT_ID]: status, [ACTIVE_TENANT_ID]: 'active' }
      bookingRows = [
        { id: 'b1', tenant_id: SUSPENDED_TENANT_ID, client_id: 'c1', service_type: 'Cleaning', clients: { name: 'Sue', do_not_service: false } },
        { id: 'b2', tenant_id: ACTIVE_TENANT_ID, client_id: 'c2', service_type: 'Cleaning', clients: { name: 'Al', do_not_service: false } },
      ]

      const res = await GET(req())
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.follow_ups_sent).toBe(1)
      expect(notify).toHaveBeenCalledTimes(1)
      expect(notify).toHaveBeenCalledWith(expect.objectContaining({ tenantId: ACTIVE_TENANT_ID }))
    },
  )

  it.each(['active', 'setup', 'pending'])('still emails a %s tenant\'s customer', async (status) => {
    tenantStatusMap = { [ACTIVE_TENANT_ID]: status }
    bookingRows = [
      { id: 'b1', tenant_id: ACTIVE_TENANT_ID, client_id: 'c1', service_type: 'Cleaning', clients: { name: 'Al', do_not_service: false } },
    ]

    const res = await GET(req())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.follow_ups_sent).toBe(1)
    expect(notify).toHaveBeenCalledTimes(1)
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * no-show-check cron — tenantServesSite() status gate.
 *
 * Same bug class as every other cross-tenant fan-out fixed this session:
 * bookings carries no tenant status of its own, and this loop never checked
 * tenantServesSite() before flipping a booking to no_show and notifying
 * admins — a suspended/cancelled/deleted tenant's stale bookings kept
 * getting auto-flipped and alerted on indefinitely.
 */

const notify = vi.fn(async (_arg: unknown) => ({}))
vi.mock('@/lib/notify', () => ({ notify: (arg: unknown) => notify(arg) }))

const SUSPENDED_TENANT_ID = 't-suspended'
const ACTIVE_TENANT_ID = 't-active'

let candidateRows: Record<string, unknown>[]
let tenantStatusMap: Record<string, string | null>
const flippedBookingIds: string[] = []

function bookingsBuilder() {
  const obj: Record<string, unknown> = {
    select: () => obj,
    in: () => obj,
    is: () => obj,
    lt: () => obj,
    gt: () => obj,
    limit: () => obj,
    eq: () => obj,
    update: (patch: Record<string, unknown>) => {
      // Track which booking gets flipped via the chained .eq('id', ...) call.
      const chain: Record<string, unknown> = {
        eq: (col: string, val: unknown) => {
          if (col === 'id' && patch.status === 'no_show') flippedBookingIds.push(val as string)
          return chain
        },
      }
      return chain
    },
    then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: candidateRows, error: null }).then(resolve),
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
      if (table === 'bookings') return bookingsBuilder()
      if (table === 'tenants') return tenantsBuilder()
      throw new Error(`unexpected table ${table}`)
    },
  },
}))

process.env.CRON_SECRET = 'test-cron-secret'
const { GET } = await import('./route')

function req() {
  return new Request('http://t/api/cron/no-show-check', {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  })
}

beforeEach(() => {
  notify.mockClear()
  flippedBookingIds.length = 0
})

describe('no-show-check cron — tenantServesSite() status gate', () => {
  it.each(['suspended', 'cancelled', 'deleted'])(
    'does not flip or notify for a %s tenant, but still flips+notifies for an active tenant',
    async (status) => {
      tenantStatusMap = { [SUSPENDED_TENANT_ID]: status, [ACTIVE_TENANT_ID]: 'active' }
      candidateRows = [
        { id: 'b1', tenant_id: SUSPENDED_TENANT_ID, start_time: new Date().toISOString(), client_id: 'c1', team_member_id: 'm1', clients: { name: 'Sue' }, team_members: { name: 'Meg' } },
        { id: 'b2', tenant_id: ACTIVE_TENANT_ID, start_time: new Date().toISOString(), client_id: 'c2', team_member_id: 'm2', clients: { name: 'Al' }, team_members: { name: 'Bob' } },
      ]

      const res = await GET(req())
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.flipped).toBe(1)
      expect(flippedBookingIds).toEqual(['b2'])
      expect(notify).toHaveBeenCalledTimes(1)
      expect(notify).toHaveBeenCalledWith(expect.objectContaining({ tenantId: ACTIVE_TENANT_ID }))
    },
  )

  it.each(['active', 'setup', 'pending'])('still flips+notifies for a %s tenant', async (status) => {
    tenantStatusMap = { [ACTIVE_TENANT_ID]: status }
    candidateRows = [
      { id: 'b1', tenant_id: ACTIVE_TENANT_ID, start_time: new Date().toISOString(), client_id: 'c1', team_member_id: 'm1', clients: { name: 'Al' }, team_members: { name: 'Bob' } },
    ]

    const res = await GET(req())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.flipped).toBe(1)
    expect(notify).toHaveBeenCalledTimes(1)
  })
})

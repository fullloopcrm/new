import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * cron/confirmation-reminder GET — tenantServesSite() status gate on the
 * tenant fetch itself.
 *
 * BUG (fixed here): the tenant fetch filtered `.eq('status', 'active')`
 * instead of tenantServesSite(). That's STRICTER than the session's usual
 * "dead tenant kept getting serviced" bug class — it also silently excluded
 * 'setup'/'pending' tenants, which tenant-status.ts's own docstring says
 * must still be servable (their public site + booking flow is already live
 * per middleware's gate). A pending, unconfirmed booking never got its
 * confirmation-reminder text until the tenant flipped to 'active'.
 *
 * FIX: fetch all tenants (with status) and filter in-memory via
 * tenantServesSite() — excludes only suspended/cancelled/deleted, includes
 * setup/pending/active.
 */

const ACTIVE_TENANT_ID = 't-active'
const PENDING_TENANT_ID = 't-pending'
const SUSPENDED_TENANT_ID = 't-suspended'

let tenantRows: Record<string, unknown>[]
let bookingRows: Record<string, unknown>[]

const sendClientSMSMock = vi.fn(async (_clientId: string, ..._rest: unknown[]) => ({ success: true }))
vi.mock('@/lib/nycmaid/client-contacts', () => ({ sendClientSMS: (clientId: string, ...rest: unknown[]) => sendClientSMSMock(clientId, ...rest) }))
vi.mock('@/lib/messaging/client-sms', () => ({
  clientSmsTemplatesFor: vi.fn(async () => ({ confirmationReminder: () => 'please confirm' })),
}))
vi.mock('@/lib/nycmaid/auth', () => ({ protectCronAPI: () => null }))

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
      lte: () => chain,
      limit: (n: number) => { limitN = n; return chain },
      then: (resolve: (v: { data: unknown; error: null; count: number }) => void) => {
        let hit = getRows().filter((r) => filters.every((f) => f(r)))
        if (limitN != null) hit = hit.slice(0, limitN)
        resolve({ data: hit, error: null, count: hit.length })
      },
    }
    return chain
  }
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => makeTable(table, () => {
      if (table === 'tenants') return tenantRows
      if (table === 'bookings') return bookingRows
      return []
    })(),
  },
}))

import { GET } from './route'

function req() {
  return new Request('http://t/api/cron/confirmation-reminder')
}

beforeEach(() => {
  sendClientSMSMock.mockClear()

  tenantRows = [
    { id: ACTIVE_TENANT_ID, status: 'active' },
    { id: PENDING_TENANT_ID, status: 'pending' },
    { id: SUSPENDED_TENANT_ID, status: 'suspended' },
  ]

  const createdAt = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const startTime = new Date(Date.now() + 60 * 60 * 1000).toISOString()

  bookingRows = [
    { id: 'bk-active', tenant_id: ACTIVE_TENANT_ID, client_id: 'c-active', status: 'pending', created_at: createdAt, start_time: startTime, notes: null, clients: { name: 'Active Client', phone: '3005551000' } },
    { id: 'bk-pending', tenant_id: PENDING_TENANT_ID, client_id: 'c-pending', status: 'pending', created_at: createdAt, start_time: startTime, notes: null, clients: { name: 'Pending Client', phone: '3005552000' } },
    { id: 'bk-suspended', tenant_id: SUSPENDED_TENANT_ID, client_id: 'c-suspended', status: 'pending', created_at: createdAt, start_time: startTime, notes: null, clients: { name: 'Dead Client', phone: '3005553000' } },
  ]
})

describe('cron/confirmation-reminder GET — tenantServesSite() status gate on the tenant fetch', () => {
  it('BLOCKED: a suspended tenant\'s pending booking gets no confirmation-reminder text', async () => {
    await GET(req())
    const clientIds = sendClientSMSMock.mock.calls.map((c) => c[0])
    expect(clientIds).not.toContain('c-suspended')
  })

  it("CONTROL: a 'pending' (onboarding) tenant's pending booking still gets the text", async () => {
    await GET(req())
    const clientIds = sendClientSMSMock.mock.calls.map((c) => c[0])
    expect(clientIds).toContain('c-pending')
  })

  it("CONTROL: an active tenant's pending booking still gets the text", async () => {
    await GET(req())
    const clientIds = sendClientSMSMock.mock.calls.map((c) => c[0])
    expect(clientIds).toContain('c-active')
  })
})

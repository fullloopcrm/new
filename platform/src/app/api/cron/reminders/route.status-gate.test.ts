import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * cron/reminders GET — tenantServesSite() status gate on the tenant fetch
 * itself.
 *
 * BUG (fixed here): the tenant fetch filtered `.eq('status', 'active')`
 * instead of tenantServesSite(). That's STRICTER than the session's usual
 * "dead tenant kept getting serviced" bug class — it also silently excluded
 * 'setup'/'pending' tenants, which tenant-status.ts's own docstring says
 * must still be servable (their public site + booking flow is already live
 * per middleware's gate). A real booking taken during a tenant's onboarding
 * window got zero reminders until the tenant flipped to 'active'.
 *
 * FIX: fetch all tenants (with status) and filter in-memory via
 * tenantServesSite() — excludes only suspended/cancelled/deleted, includes
 * setup/pending/active.
 */

const ACTIVE_TENANT_ID = 't-active'
const PENDING_TENANT_ID = 't-pending'
const SUSPENDED_TENANT_ID = 't-suspended'

let tenantRows: Record<string, unknown>[]
let bookingsRows: Record<string, unknown>[] = []

const notifyMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))
vi.mock('@/lib/notify', () => ({ notify: (opts: Record<string, unknown>) => notifyMock(opts) }))

const sendSMSMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))
vi.mock('@/lib/sms', () => ({ sendSMS: (opts: Record<string, unknown>) => sendSMSMock(opts) }))

vi.mock('@/lib/comms-prefs', () => ({
  getCommPrefs: vi.fn(async () => ({
    timing: { reminder_days: [1], reminder_hours_before: [2] },
    comms: { booking_reminder: { sms: true } },
  })),
}))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/push', () => ({ sendPushToClient: vi.fn(async () => {}) }))
vi.mock('@/lib/messaging/client-sms', () => ({
  clientSmsTemplatesFor: vi.fn(async () => ({ reminder: () => 'client reminder text' })),
}))
vi.mock('@/lib/hr', () => ({ getTerminatedTeamMemberIds: vi.fn(async () => []) }))

type Filter = (row: Record<string, unknown>) => boolean

function makeTable(getRows: () => Record<string, unknown>[]) {
  return () => {
    const filters: Filter[] = []
    let limitN: number | undefined

    const dateCmp = (col: string, val: unknown, cmp: (a: number, b: number) => boolean): Filter =>
      (r) => cmp(new Date(r[col] as string).getTime(), new Date(val as string).getTime())

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      select: () => chain,
      eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return chain },
      neq: (col: string, val: unknown) => { filters.push((r) => r[col] !== val); return chain },
      in: (col: string, val: unknown[]) => { filters.push((r) => val.includes(r[col])); return chain },
      is: (col: string, val: unknown) => {
        filters.push((r) => (val === null ? r[col] === null || r[col] === undefined : r[col] === val))
        return chain
      },
      gte: (col: string, val: unknown) => { filters.push(dateCmp(col, val, (a, b) => a >= b)); return chain },
      lte: (col: string, val: unknown) => { filters.push(dateCmp(col, val, (a, b) => a <= b)); return chain },
      gt: (col: string, val: unknown) => { filters.push(dateCmp(col, val, (a, b) => a > b)); return chain },
      lt: (col: string, val: unknown) => { filters.push(dateCmp(col, val, (a, b) => a < b)); return chain },
      not: () => chain,
      or: () => chain,
      order: () => chain,
      limit: (n: number) => { limitN = n; return chain },
      returns: () => chain,
      insert: () => ({ then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }) }),
      single: async () => {
        const hit = getRows().filter((r) => filters.every((f) => f(r)))
        return hit.length ? { data: hit[0], error: null } : { data: null, error: { code: 'PGRST116' } }
      },
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
    from: (table: string) => {
      if (table === 'tenants') return makeTable(() => tenantRows)()
      if (table === 'bookings') return makeTable(() => bookingsRows)()
      return makeTable(() => [])()
    },
  },
}))

import { GET } from './route'

function req() {
  return new Request('http://t/api/cron/reminders', { headers: { authorization: 'Bearer test-secret' } })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  notifyMock.mockClear()
  sendSMSMock.mockClear()

  tenantRows = [
    { id: ACTIVE_TENANT_ID, name: 'Active Co', status: 'active', telnyx_api_key: 'tkey', telnyx_phone: '+15559990000', resend_api_key: 'rkey' },
    { id: PENDING_TENANT_ID, name: 'Onboarding Co', status: 'pending', telnyx_api_key: 'tkey', telnyx_phone: '+15559990001', resend_api_key: 'rkey' },
    { id: SUSPENDED_TENANT_ID, name: 'Dead Co', status: 'suspended', telnyx_api_key: 'tkey', telnyx_phone: '+15559990002', resend_api_key: 'rkey' },
  ]
})

afterEach(() => {
  vi.useRealTimers()
})

describe('cron/reminders — tenantServesSite() status gate on the tenant fetch', () => {
  function setDayBasedTime() {
    vi.useFakeTimers()
    const now = new Date()
    now.setHours(8, 0, 0, 0) // day-based reminders only fire at local hour 8
    vi.setSystemTime(now)
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(10, 0, 0, 0)
    return tomorrow
  }

  function bookingFor(tenantId: string, id: string, phone: string) {
    const tomorrow = setDayBasedTime()
    return {
      id, tenant_id: tenantId, client_id: `c-${id}`, team_member_id: null, service_type: 'Clean',
      status: 'confirmed', start_time: tomorrow.toISOString(), end_time: tomorrow.toISOString(),
      clients: { name: 'Client', phone, email: `${id}@x.com`, sms_consent: true, do_not_service: false },
      team_members: null,
    }
  }

  it('BLOCKED: a suspended tenant gets no reminder email or SMS', async () => {
    setDayBasedTime()
    bookingsRows = [bookingFor(SUSPENDED_TENANT_ID, 'b-suspended', '+15553000000')]
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(sendSMSMock).not.toHaveBeenCalled()
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it("CONTROL: a 'pending' (onboarding) tenant still gets its reminder email + SMS", async () => {
    setDayBasedTime()
    bookingsRows = [bookingFor(PENDING_TENANT_ID, 'b-pending', '+15552000000')]
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(sendSMSMock).toHaveBeenCalledWith(expect.objectContaining({ to: '+15552000000' }))
    expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({ recipientId: 'c-b-pending', channel: 'email' }))
  })

  it('CONTROL: an active tenant still gets its reminder email + SMS', async () => {
    setDayBasedTime()
    bookingsRows = [bookingFor(ACTIVE_TENANT_ID, 'b-active', '+15551000000')]
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(sendSMSMock).toHaveBeenCalledWith(expect.objectContaining({ to: '+15551000000' }))
    expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({ recipientId: 'c-b-active', channel: 'email' }))
  })
})

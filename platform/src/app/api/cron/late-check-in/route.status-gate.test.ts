import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * cron/late-check-in GET — tenantServesSite() status gate on the tenant
 * fetch itself.
 *
 * BUG (fixed here): the tenant fetch filtered `.eq('status', 'active')`
 * instead of tenantServesSite(). That's STRICTER than the session's usual
 * "dead tenant kept getting serviced" bug class — it also silently excluded
 * 'setup'/'pending' tenants, which tenant-status.ts's own docstring says
 * must still be servable (their public site + booking flow is already live
 * per middleware's gate). A real booking taken during a tenant's onboarding
 * window got zero late-check-in/check-out monitoring until the tenant
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
let bookingsRows: Record<string, unknown>[] = []
let notificationsRows: Record<string, unknown>[] = []

const sendSMSMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))
vi.mock('@/lib/sms', () => ({ sendSMS: (opts: Record<string, unknown>) => Promise.resolve(sendSMSMock(opts)) }))

vi.mock('@/lib/comms-prefs', () => ({
  getCommPrefs: vi.fn(async () => ({
    comms: { team_late_alert: { sms: true }, owner_late_alert: { sms: true } },
  })),
}))
vi.mock('@/lib/push', () => ({ sendPushToTenantAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/error-tracking', () => ({ trackError: vi.fn(async () => {}) }))
vi.mock('@/lib/hr', () => ({ getTerminatedTeamMemberIds: vi.fn(async () => []) }))
vi.mock('@/lib/sms-templates', () => ({
  smsLateCheckInTeam: () => 'late check-in team text',
  smsLateCheckInAdmin: () => 'late check-in admin text',
  smsLateCheckOutTeam: () => 'late check-out team text',
  smsLateCheckOutAdmin: () => 'late check-out admin text',
}))

type Filter = (row: Record<string, unknown>) => boolean

function makeTable(getRows: () => Record<string, unknown>[], onInsert?: (row: Record<string, unknown>) => void) {
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
        filters.push((r) => (val === null ? r[col] === null || r[col] === undefined : r[col] !== null && r[col] !== undefined))
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
      insert: (row: Record<string, unknown>) => {
        onInsert?.(row)
        return { then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }) }
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
      if (table === 'notifications') return makeTable(() => notificationsRows, (row) => notificationsRows.push(row))()
      return makeTable(() => [])()
    },
  },
}))

import { GET } from './route'

function req() {
  return new Request('http://t/api/cron/late-check-in', { headers: { authorization: 'Bearer test-secret' } })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  sendSMSMock.mockClear()
  notificationsRows = []

  tenantRows = [
    { id: ACTIVE_TENANT_ID, name: 'Active Co', status: 'active', telnyx_api_key: 'tkey', telnyx_phone: '+15559990000', owner_phone: '+15551000000', phone: null },
    { id: PENDING_TENANT_ID, name: 'Onboarding Co', status: 'pending', telnyx_api_key: 'tkey', telnyx_phone: '+15559990001', owner_phone: '+15551000001', phone: null },
    { id: SUSPENDED_TENANT_ID, name: 'Dead Co', status: 'suspended', telnyx_api_key: 'tkey', telnyx_phone: '+15559990002', owner_phone: '+15551000002', phone: null },
  ]
})

afterEach(() => {
  vi.useRealTimers()
})

describe('cron/late-check-in — tenantServesSite() status gate on the tenant fetch', () => {
  it('BLOCKED: a suspended tenant gets no late check-in alert', async () => {
    vi.useFakeTimers()
    const now = new Date('2026-08-05T12:00:00.000Z')
    vi.setSystemTime(now)
    const startedAgo = new Date(now.getTime() - 15 * 60 * 1000)

    bookingsRows = [{
      id: 'b-suspended', tenant_id: SUSPENDED_TENANT_ID, team_member_id: 'tm-1', status: 'scheduled',
      start_time: startedAgo.toISOString(), check_in_time: null,
      clients: { name: 'Client', phone: '+15552220000' },
      team_members: { name: 'Crew', phone: '+15550000009', sms_consent: true },
    }]

    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(sendSMSMock).not.toHaveBeenCalled()
  })

  it("CONTROL: a 'pending' (onboarding) tenant still gets its late check-in alert", async () => {
    vi.useFakeTimers()
    const now = new Date('2026-08-05T12:00:00.000Z')
    vi.setSystemTime(now)
    const startedAgo = new Date(now.getTime() - 15 * 60 * 1000)

    bookingsRows = [{
      id: 'b-pending', tenant_id: PENDING_TENANT_ID, team_member_id: 'tm-2', status: 'scheduled',
      start_time: startedAgo.toISOString(), check_in_time: null,
      clients: { name: 'Client', phone: '+15552220001' },
      team_members: { name: 'Crew', phone: '+15550000010', sms_consent: true },
    }]

    const res = await GET(req())
    expect(res.status).toBe(200)
    const smsTargets = sendSMSMock.mock.calls.map((c) => (c[0] as { to?: string }).to)
    expect(smsTargets).toContain('+15550000010')
    expect(smsTargets).toContain('+15551000001')
  })

  it('CONTROL: an active tenant still gets its late check-in alert', async () => {
    vi.useFakeTimers()
    const now = new Date('2026-08-05T12:00:00.000Z')
    vi.setSystemTime(now)
    const startedAgo = new Date(now.getTime() - 15 * 60 * 1000)

    bookingsRows = [{
      id: 'b-active', tenant_id: ACTIVE_TENANT_ID, team_member_id: 'tm-3', status: 'scheduled',
      start_time: startedAgo.toISOString(), check_in_time: null,
      clients: { name: 'Client', phone: '+15552220002' },
      team_members: { name: 'Crew', phone: '+15550000011', sms_consent: true },
    }]

    const res = await GET(req())
    expect(res.status).toBe(200)
    const smsTargets = sendSMSMock.mock.calls.map((c) => (c[0] as { to?: string }).to)
    expect(smsTargets).toContain('+15550000011')
    expect(smsTargets).toContain('+15551000000')
  })
})

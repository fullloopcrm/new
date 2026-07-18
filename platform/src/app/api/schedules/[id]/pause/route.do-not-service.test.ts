import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/schedules/[id]/pause texts the client "your recurring service
 * is paused" with zero sms_consent/do_not_service check -- the same class
 * of gap already closed on the booking-lifecycle SMS pipeline (14fa0888)
 * and the team-portal running-late/checkout push notifications. A
 * DNS-flagged client (or one who replied STOP) still got this text
 * whenever an admin paused their recurring schedule.
 */

const TENANT = 'aaaaaaaa-2222-3333-4444-555555555555'
const SCHEDULE_ID = 'sch-1'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function updateChain(rows: Row[], values: Row) {
  const filters: Array<(r: Row) => boolean> = []
  const uc: Record<string, unknown> = {
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return uc },
    in: (col: string, vals: unknown[]) => { filters.push((r) => vals.includes(r[col])); return uc },
    gte: (col: string, val: unknown) => { filters.push((r) => (r[col] as string) >= (val as string)); return uc },
    lte: (col: string, val: unknown) => { filters.push((r) => (r[col] as string) <= (val as string)); return uc },
    select: () => uc,
    single: async () => {
      const matches = rows.filter((r) => filters.every((f) => f(r)))
      matches.forEach((r) => Object.assign(r, values))
      return { data: matches[0] ?? null, error: matches[0] ? null : { message: 'not found' } }
    },
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => {
      const matches = rows.filter((r) => filters.every((f) => f(r)))
      matches.forEach((r) => Object.assign(r, values))
      resolve({ data: matches, error: null })
    },
  }
  return uc
}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  const rowsOf = (): Row[] => DB[table] || []
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    update: (values: Row) => updateChain(rowsOf(), values),
    insert: (row: Row) => { DB[table] = [...(DB[table] || []), row]; return { then: (resolve: (v: unknown) => void) => resolve({ data: row, error: null }) } },
    single: async () => ({ data: matched()[0] ?? null, error: null }),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
const { sendSMS } = vi.hoisted(() => ({ sendSMS: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/sms', () => ({ sendSMS }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))

import { POST } from '@/app/api/schedules/[id]/pause/route'

function makeReq(pausedUntil: string): Request {
  return new Request('http://x', { method: 'POST', body: JSON.stringify({ paused_until: pausedUntil }) })
}
const params = () => ({ params: Promise.resolve({ id: SCHEDULE_ID }) })

beforeEach(() => {
  sendSMS.mockClear()
  DB.tenants = [{ id: TENANT, name: 'Tenant A', telnyx_api_key: 'k', telnyx_phone: '+15550000000' }]
  DB.notifications = []
  DB.bookings = [
    { id: 'b1', tenant_id: TENANT, schedule_id: SCHEDULE_ID, status: 'scheduled', start_time: '2099-01-01T00:00:00' },
  ]
})

describe('POST /api/schedules/[id]/pause — do_not_service / sms_consent gate', () => {
  it('does not SMS the client when flagged do_not_service', async () => {
    DB.recurring_schedules = [{
      id: SCHEDULE_ID, tenant_id: TENANT, recurring_type: 'weekly', status: 'active',
      clients: { name: 'Client', phone: '+15551110000', email: 'c@example.com', sms_consent: true, do_not_service: true },
    }]
    const res = await POST(makeReq('2099-02-01'), params())
    expect(res.status).toBe(200)
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it('does not SMS the client who opted out of SMS', async () => {
    DB.recurring_schedules = [{
      id: SCHEDULE_ID, tenant_id: TENANT, recurring_type: 'weekly', status: 'active',
      clients: { name: 'Client', phone: '+15551110000', email: 'c@example.com', sms_consent: false, do_not_service: false },
    }]
    const res = await POST(makeReq('2099-02-01'), params())
    expect(res.status).toBe(200)
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it('SMS the client when not flagged do_not_service and opted in', async () => {
    DB.recurring_schedules = [{
      id: SCHEDULE_ID, tenant_id: TENANT, recurring_type: 'weekly', status: 'active',
      clients: { name: 'Client', phone: '+15551110000', email: 'c@example.com', sms_consent: true, do_not_service: false },
    }]
    const res = await POST(makeReq('2099-02-01'), params())
    expect(res.status).toBe(200)
    expect(sendSMS).toHaveBeenCalledTimes(1)
  })
})

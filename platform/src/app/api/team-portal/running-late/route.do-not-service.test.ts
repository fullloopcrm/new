import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/team-portal/running-late sent the client "running late" SMS with
 * no do_not_service check. This route is team-member-authenticated (not
 * client-authenticated), so it isn't covered by protectClientAPI()'s
 * do_not_service block the way client/reschedule/[id]/route.ts is — a team
 * member reporting late on a DNS-flagged client's booking still texted them.
 */

const TENANT = 'aaaaaaaa-0000-0000-0000-00000000000a'
const MEMBER_ID = 'shared-member-id'
const BOOKING_ID = 'shared-booking-id'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function updateChain(rows: Row[], values: Row) {
  const filters: Array<(r: Row) => boolean> = []
  const orFilters: Array<(r: Row) => boolean> = []
  const uc: Record<string, unknown> = {
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return uc },
    or: (expr: string) => {
      const conds = expr.split(',').map((part) => {
        const [col, op, val] = part.split('.')
        return (r: Row) => {
          if (op === 'is' && val === 'null') return r[col] == null
          if (op === 'lt') return r[col] != null && String(r[col]) < val
          return false
        }
      })
      orFilters.push((r) => conds.some((c) => c(r)))
      return uc
    },
    select: () => uc,
    maybeSingle: async () => {
      const matches = rows.filter((r) => filters.every((f) => f(r)) && orFilters.every((f) => f(r)))
      matches.forEach((r) => Object.assign(r, values))
      return { data: matches[0] ?? null, error: null }
    },
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => {
      rows.filter((r) => filters.every((f) => f(r)) && orFilters.every((f) => f(r))).forEach((r) => Object.assign(r, values))
      resolve({ data: null, error: null })
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
    single: async () => ({ data: matched()[0] ?? null, error: null }),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
const { sendSMS, sendPushToClient } = vi.hoisted(() => ({ sendSMS: vi.fn(() => Promise.resolve()), sendPushToClient: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/sms', () => ({ sendSMS }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/push', () => ({ sendPushToTenantAdmins: vi.fn(() => Promise.resolve()), sendPushToClient }))
vi.mock('@/lib/sms-templates', () => ({ smsRunningLateClient: () => '', smsRunningLateAdmin: () => '' }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(() => Promise.resolve({ allowed: true, remaining: 4 })) }))

process.env.TEAM_PORTAL_SECRET = 'unit-test-team-portal-secret'
import { NextRequest } from 'next/server'
import { createToken } from '@/app/api/team-portal/auth/token'
import { POST } from './route'

function makeReq(eta: number): NextRequest {
  const token = createToken(MEMBER_ID, TENANT, 30, 'worker')
  return new NextRequest('https://x/api/team-portal/running-late', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ bookingId: BOOKING_ID, eta }),
  })
}

beforeEach(() => {
  sendSMS.mockClear()
  sendPushToClient.mockClear()
  DB.team_members = [{ id: MEMBER_ID, tenant_id: TENANT, status: 'active' }]
  DB.tenants = [{ id: TENANT, name: 'Tenant A', owner_phone: null, phone: null, telnyx_api_key: 'k', telnyx_phone: '+15550000000' }]
})

describe('POST /api/team-portal/running-late — do_not_service gate', () => {
  it('does not SMS or push the client when flagged do_not_service', async () => {
    DB.bookings = [{ id: BOOKING_ID, tenant_id: TENANT, team_member_id: MEMBER_ID, client_id: 'client-a', start_time: new Date().toISOString(), running_late_at: null, running_late_eta: null, clients: { name: 'Client', phone: '+15551110000', sms_consent: true, do_not_service: true }, team_members: { name: 'Member' } }]
    const res = await POST(makeReq(10))
    expect(res.status).toBe(200)
    expect(sendSMS).not.toHaveBeenCalled()
    expect(sendPushToClient).not.toHaveBeenCalled()
  })

  it('SMS and push the client when not flagged do_not_service', async () => {
    DB.bookings = [{ id: BOOKING_ID, tenant_id: TENANT, team_member_id: MEMBER_ID, client_id: 'client-a', start_time: new Date().toISOString(), running_late_at: null, running_late_eta: null, clients: { name: 'Client', phone: '+15551110000', sms_consent: true, do_not_service: false }, team_members: { name: 'Member' } }]
    const res = await POST(makeReq(10))
    expect(res.status).toBe(200)
    expect(sendSMS).toHaveBeenCalledTimes(1)
    expect(sendPushToClient).toHaveBeenCalledTimes(1)
  })
})

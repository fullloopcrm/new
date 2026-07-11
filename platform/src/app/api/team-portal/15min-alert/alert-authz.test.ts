import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * 15min-alert authz regression. The route fires real admin + client payment SMS,
 * writes the alert timestamp, and can open admin tasks — and used to be
 * UNAUTHENTICATED, keyed only on a caller-supplied bookingId. Anyone who knew a
 * bookingId (any tenant) could spam payment texts / drive charges.
 *
 * Now it requires a field-staff bearer token, rejects cross-tenant bookings
 * (404, no existence leak), and rejects same-tenant bookings the caller has no
 * visibility of (403). On every reject: ZERO SMS / notify / booking writes.
 */

const TENANT = 'aaaaaaaa-0000-0000-0000-000000000001'
const OTHER_TENANT = 'ffffffff-0000-0000-0000-0000000000ff'
const MEMBER_A = '11111111-0000-0000-0000-000000000001'
const MEMBER_OTHER = '99999999-0000-0000-0000-000000000099'

type Booking = { tenant_id: string; team_member_id: string | null }
const state: { booking: Booking | null } = { booking: null }

const calls = { adminSms: 0, clientSms: 0, notify: 0, bookingUpdates: 0 }

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    let selectStr = ''
    let isUpdate = false
    const c: Record<string, unknown> = {
      select: (s = '') => { selectStr = s; return c },
      update: () => { isUpdate = true; return c },
      insert: () => c,
      eq: () => c,
      in: () => c,
      not: () => c,
      order: () => c,
      limit: async () => ({ data: [], error: null }),
      single: async () => {
        if (table === 'team_members' && selectStr.includes('status')) return { data: { status: 'active' }, error: null }
        if (table === 'tenants' && selectStr.includes('selena_config')) return { data: { selena_config: null }, error: null }
        if (table === 'tenants') return { data: { name: 'T', telnyx_api_key: null, telnyx_phone: null, payment_link: null }, error: null }
        if (table === 'bookings') {
          return state.booking
            ? { data: { id: 'bk', client_id: null, start_time: '2026-08-01T10:00:00', check_in_time: '2026-08-01T10:00:00', check_out_time: null, service_type: 'regular', hourly_rate: 69, pay_rate: 25, price: 0, notes: null, max_hours: null, team_size: 1, payment_status: 'unpaid', fifteen_min_alert_time: null, clients: null, team_members: { name: 'M', pay_rate: 25 }, ...state.booking }, error: null }
            : { data: null, error: null }
        }
        return { data: null, error: null }
      },
      then: (res: (v: { data: unknown[]; error: null }) => unknown) => {
        if (isUpdate && table === 'bookings') calls.bookingUpdates++
        return res({ data: [], error: null })
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t), rpc: async () => ({ data: null, error: null }) } }
})

vi.mock('@/lib/notify', () => ({ notify: async () => { calls.notify++ } }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: async () => { calls.adminSms++ } }))
vi.mock('@/lib/nycmaid/client-contacts', () => ({ sendClientSMS: async () => { calls.clientSms++; return { sent: 1, skipped: 0 } } }))

import { NextRequest } from 'next/server'
import { createToken } from '@/app/api/team-portal/auth/token'
import { POST } from './route'

function req(bookingId: string, token?: string): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (token) headers.authorization = `Bearer ${token}`
  return new NextRequest('https://x/api/team-portal/15min-alert', {
    method: 'POST',
    headers,
    body: JSON.stringify({ bookingId }),
  })
}

beforeEach(() => {
  process.env.TEAM_PORTAL_SECRET = 'unit-test-team-portal-secret'
  state.booking = null
  calls.adminSms = 0; calls.clientSms = 0; calls.notify = 0; calls.bookingUpdates = 0
})

describe('15min-alert authz', () => {
  it('REJECTS (401) with no bearer token — no SMS, no write', async () => {
    state.booking = { tenant_id: TENANT, team_member_id: MEMBER_A }
    const res = await POST(req('bk'))
    expect(res.status).toBe(401)
    expect(calls).toMatchObject({ adminSms: 0, clientSms: 0, notify: 0, bookingUpdates: 0 })
  })

  it('REJECTS (404) a cross-tenant booking — no existence leak, no side effects', async () => {
    state.booking = { tenant_id: OTHER_TENANT, team_member_id: MEMBER_A }
    const token = createToken(MEMBER_A, TENANT, 0, 'worker')
    const res = await POST(req('bk', token))
    expect(res.status).toBe(404)
    expect(calls).toMatchObject({ adminSms: 0, clientSms: 0, notify: 0, bookingUpdates: 0 })
  })

  it("REJECTS (403) a same-tenant booking the worker isn't on — no side effects", async () => {
    state.booking = { tenant_id: TENANT, team_member_id: MEMBER_OTHER }
    const token = createToken(MEMBER_A, TENANT, 0, 'worker')
    const res = await POST(req('bk', token))
    expect(res.status).toBe(403)
    expect(calls).toMatchObject({ adminSms: 0, clientSms: 0, notify: 0, bookingUpdates: 0 })
  })

  it('ALLOWS the assigned worker in-tenant (fires the alert)', async () => {
    state.booking = { tenant_id: TENANT, team_member_id: MEMBER_A }
    const token = createToken(MEMBER_A, TENANT, 0, 'worker')
    const res = await POST(req('bk', token))
    expect(res.status).toBe(200)
    expect(calls.adminSms).toBeGreaterThan(0)
    expect(calls.bookingUpdates).toBeGreaterThan(0)
  })
})

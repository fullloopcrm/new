import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — team-portal/15min-alert/route.ts (docs/adr/0004).
 * The initial booking lookup is by id alone (tenant unknown until the row
 * resolves — same tenant-scope-ok shape as portal/auth verify_code), but once
 * `tenantId` is read off the resolved booking, the mark-as-alerted UPDATE and
 * the undelivered-payment admin_tasks escalation are now scoped via tenantDb.
 * The LEAK CONTROL proves the store has no implicit tenant scoping: `bookings.id`
 * is a real PK in production so two tenants can never literally share one row's
 * id, but the update-by-id-alone shape this route used to have is exactly what
 * every other tenantDb LEAK CONTROL in this suite calls out as unsafe-by-construction.
 */

vi.hoisted(() => {
  process.env.TEAM_PORTAL_SECRET = 'test-team-portal-secret'
})

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})
vi.mock('@/lib/notify', () => ({ notify: async () => ({}) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: async () => {} }))

import { supabaseAdmin } from '@/lib/supabase'
import { sendClientSMS } from '@/lib/nycmaid/client-contacts'
import { createToken } from '../auth/token'

vi.mock('@/lib/nycmaid/client-contacts', () => ({
  sendClientSMS: vi.fn(async () => ({ sent: 1, skipped: 0 })),
}))

import { POST } from './route'

const A_ID = 'tenant-A'
const B_ID = 'tenant-B'
const A_BOOKING = 'bk-a'
const B_BOOKING = 'bk-b'
const A_WORKER = 'tm-a'
const B_WORKER = 'tm-b'
const fake = supabaseAdmin as unknown as FakeSupabase

function booking(id: string, tenantId: string, clientId: string, teamMemberId: string) {
  return { id, tenant_id: tenantId, team_member_id: teamMemberId, start_time: '2026-07-13T10:00:00Z', end_time: '2026-07-13T12:00:00Z', check_in_time: '2026-07-13T10:00:00Z', check_out_time: null, service_type: 'regular', hourly_rate: 69, pay_rate: 25, price: 138, notes: null, max_hours: null, team_size: 1, client_id: clientId, payment_status: 'pending', fifteen_min_alert_time: null, clients: { name: `${tenantId} Client`, phone: '+15550001', email: 'a@x.com', address: '10001' }, team_members: { name: `${tenantId} Worker`, pay_rate: 25 } }
}

beforeEach(() => {
  fake._store.clear()
  fake._seed('bookings', [booking(A_BOOKING, A_ID, 'client-a', A_WORKER), booking(B_BOOKING, B_ID, 'client-b', B_WORKER)])
  fake._seed('tenants', [
    { id: A_ID, name: 'A Co', telnyx_api_key: null, telnyx_phone: null, payment_link: null },
    { id: B_ID, name: 'B Co', telnyx_api_key: null, telnyx_phone: null, payment_link: null },
  ])
  fake._seed('team_members', [
    { id: A_WORKER, tenant_id: A_ID, status: 'active' },
    { id: B_WORKER, tenant_id: B_ID, status: 'active' },
  ])
  vi.mocked(sendClientSMS).mockClear()
  vi.mocked(sendClientSMS).mockResolvedValue({ sent: 1, skipped: 0 })
})

afterEach(() => {
  vi.useRealTimers()
})

function req(bookingId: string, token: string): NextRequest {
  return new NextRequest('http://x/api/team-portal/15min-alert', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify({ bookingId, force: true }),
  })
}

describe('team-portal/15min-alert POST — auth', () => {
  it('rejects a request with no bearer token', async () => {
    const res = await POST(new NextRequest('http://x/api/team-portal/15min-alert', {
      method: 'POST',
      body: JSON.stringify({ bookingId: A_BOOKING, force: true }),
    }))
    expect(res.status).toBe(401)
  })

  it("rejects tenant A's worker firing the alert on tenant B's booking (cross-tenant + not-assigned)", async () => {
    const token = createToken(A_WORKER, A_ID)
    const res = await POST(req(B_BOOKING, token))
    expect(res.status).toBe(404)
    const bRow = fake._all('bookings').find((r) => r.id === B_BOOKING)
    expect(bRow?.fifteen_min_alert_time).toBeNull()
  })
})

describe('team-portal/15min-alert POST — tenantDb isolation', () => {
  it("firing the alert for tenant A's booking (as its assigned worker) stamps ONLY tenant A's row, leaving tenant B's unrelated booking untouched", async () => {
    const token = createToken(A_WORKER, A_ID)
    const res = await POST(req(A_BOOKING, token))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    const rows = fake._all('bookings')
    const aRow = rows.find((r) => r.id === A_BOOKING)
    const bRow = rows.find((r) => r.id === B_BOOKING)
    expect(aRow?.fifteen_min_alert_time).not.toBeNull()
    expect(bRow?.fifteen_min_alert_time).toBeNull()
  })
})

describe('team-portal/15min-alert POST — undelivered-payment escalation isolation', () => {
  it("when the client SMS never lands, the admin_tasks escalation is stamped with the booking's OWN tenant_id via tenantDb, not a caller-suppliable value", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.mocked(sendClientSMS).mockResolvedValue({ sent: 0, skipped: 0 })

    const token = createToken(A_WORKER, A_ID)
    const resPromise = POST(req(A_BOOKING, token))
    // Route retries once with a 60s backoff before giving up and escalating.
    await vi.advanceTimersByTimeAsync(65_000)
    const res = await resPromise

    expect(res.status).toBe(200)
    const tasks = fake._all('admin_tasks')
    expect(tasks).toHaveLength(1)
    expect(tasks[0].tenant_id).toBe(A_ID)
    expect(tasks[0].related_id).toBe(A_BOOKING)
  }, 15_000)
})

describe('LEAK CONTROL', () => {
  it("updating bookings' fifteen_min_alert_time by id ALONE (no tenant_id filter) WOULD stamp every row sharing that id regardless of tenant — proves the route's tenantDb scoping is load-bearing", async () => {
    const SHARED_ID = 'bk-shared'
    fake._seed('bookings', [
      { id: SHARED_ID, tenant_id: A_ID, fifteen_min_alert_time: null },
      { id: SHARED_ID, tenant_id: B_ID, fifteen_min_alert_time: null },
    ])
    await supabaseAdmin
      .from('bookings') // tenant-scope-ok: deliberate unscoped LEAK CONTROL probe, proves the route's tenantDb filter is load-bearing
      .update({ fifteen_min_alert_time: '2026-07-13T12:00:00Z' })
      .eq('id', SHARED_ID)
    const rows = fake._all('bookings').filter((b) => b.id === SHARED_ID)
    expect(rows).toHaveLength(2)
    expect(rows.every((b) => b.fifteen_min_alert_time === '2026-07-13T12:00:00Z')).toBe(true)
  })
})

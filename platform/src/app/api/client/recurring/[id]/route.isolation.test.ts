/**
 * PUT /api/client/recurring/[id] — the client-side edit endpoint that didn't
 * exist before this rebuild. Guards:
 *  1. AUTH: no session -> rejected before any read/write.
 *  2. OWNERSHIP: another client's (or another tenant's) schedule id -> 404,
 *     same shape as a nonexistent id (never confirms which ids are real).
 *  3. FIELD WHITELIST: pricing fields (hourly_rate/pay_rate/discount_percent)
 *     in the request body are silently ignored, not applied -- a client must
 *     never be able to set their own rate.
 *  4. NEVER DUPLICATES: editing updates the existing row in place; no second
 *     recurring_schedules row is ever created by this route.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextResponse } from 'next/server'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

const TENANT_ID = 'tenant-A'
const OTHER_TENANT_ID = 'tenant-B'
const CLIENT_ID = 'client-a'
const OTHER_CLIENT_ID = 'client-b'

let sessionClientId: string | null
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: TENANT_ID }),
}))
vi.mock('@/lib/client-auth', () => ({
  protectClientAPI: async (_tenantId: string, requiredClientId?: string) => {
    if (!sessionClientId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    if (requiredClientId && requiredClientId !== sessionClientId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    return { clientId: sessionClientId }
  },
}))
const notifyMock = vi.hoisted(() => vi.fn(async () => ({ success: true })))
vi.mock('@/lib/notify', () => ({ notify: notifyMock }))

import { supabaseAdmin } from '@/lib/supabase'
import { PUT } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

const OWN_SCHEDULE = 'sched-own'
const OTHER_CLIENT_SCHEDULE = 'sched-other-client'
const OTHER_TENANT_SCHEDULE = 'sched-other-tenant'

beforeEach(() => {
  fake._store.clear()
  notifyMock.mockClear()
  sessionClientId = CLIENT_ID
  fake._seed('clients', [
    { id: CLIENT_ID, tenant_id: TENANT_ID },
    { id: OTHER_CLIENT_ID, tenant_id: TENANT_ID },
  ])
  fake._seed('recurring_schedules', [
    {
      id: OWN_SCHEDULE, tenant_id: TENANT_ID, client_id: CLIENT_ID,
      recurring_type: 'weekly', day_of_week: 1, days_of_week: null,
      preferred_time: '09:00', duration_hours: 3, hourly_rate: 60, discount_percent: 10,
    },
    {
      id: OTHER_CLIENT_SCHEDULE, tenant_id: TENANT_ID, client_id: OTHER_CLIENT_ID,
      recurring_type: 'weekly', day_of_week: 2, days_of_week: null,
      preferred_time: '10:00', duration_hours: 3, hourly_rate: 60, discount_percent: 0,
    },
    {
      id: OTHER_TENANT_SCHEDULE, tenant_id: OTHER_TENANT_ID, client_id: CLIENT_ID,
      recurring_type: 'weekly', day_of_week: 1, days_of_week: null,
      preferred_time: '09:00', duration_hours: 3, hourly_rate: 60, discount_percent: 0,
    },
  ])
  fake._seed('bookings', [
    {
      id: 'bk-own-1', tenant_id: TENANT_ID, schedule_id: OWN_SCHEDULE, client_id: CLIENT_ID,
      status: 'scheduled', start_time: '2099-01-05T09:00:00', end_time: '2099-01-05T12:00:00',
    },
  ])
  fake._seed('team_members', [
    { id: 'tm-active', tenant_id: TENANT_ID, active: true },
    { id: 'tm-inactive', tenant_id: TENANT_ID, active: false },
    { id: 'tm-other-tenant', tenant_id: OTHER_TENANT_ID, active: true },
  ])
})

function req(body: Record<string, unknown>): Request {
  return new Request('http://x/api/client/recurring/x', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}
const params = (id: string) => ({ params: Promise.resolve({ id }) })

describe('PUT /api/client/recurring/[id] — auth', () => {
  it('rejects an unauthenticated caller before touching the schedule', async () => {
    sessionClientId = null
    const res = await PUT(req({ preferred_time: '14:00' }), params(OWN_SCHEDULE))
    expect(res.status).toBe(401)
    expect(fake._store.get('recurring_schedules')?.find((s) => s.id === OWN_SCHEDULE)?.preferred_time).toBe('09:00')
  })
})

describe('PUT /api/client/recurring/[id] — ownership', () => {
  it("404s on another client's schedule, in the same tenant", async () => {
    const res = await PUT(req({ preferred_time: '14:00' }), params(OTHER_CLIENT_SCHEDULE))
    expect(res.status).toBe(404)
    const sched = fake._store.get('recurring_schedules')?.find((s) => s.id === OTHER_CLIENT_SCHEDULE)
    expect(sched?.preferred_time).toBe('10:00') // untouched
  })

  it("404s on this client's OWN schedule id if it belongs to a different tenant", async () => {
    const res = await PUT(req({ preferred_time: '14:00' }), params(OTHER_TENANT_SCHEDULE))
    expect(res.status).toBe(404)
  })

  it('404s on a nonexistent schedule id, same shape as a real-but-foreign one', async () => {
    const res = await PUT(req({ preferred_time: '14:00' }), params('does-not-exist'))
    expect(res.status).toBe(404)
  })
})

describe('PUT /api/client/recurring/[id] — edits own schedule correctly', () => {
  it('updates the existing row in place and never creates a second schedule row', async () => {
    const before = fake._store.get('recurring_schedules')?.length
    const res = await PUT(req({ preferred_time: '14:00' }), params(OWN_SCHEDULE))
    expect(res.status).toBe(200)
    expect(fake._store.get('recurring_schedules')?.length).toBe(before)
    const sched = fake._store.get('recurring_schedules')?.find((s) => s.id === OWN_SCHEDULE)
    expect(sched?.preferred_time).toBe('14:00')
  })

  it('syncs the future booking onto the new time', async () => {
    await PUT(req({ preferred_time: '15:00' }), params(OWN_SCHEDULE))
    const booking = fake._store.get('bookings')?.find((b) => b.id === 'bk-own-1')
    expect(String(booking?.start_time)).toContain('15:00:00')
  })

  it('fires exactly one client notification when the day/time moves', async () => {
    await PUT(req({ day_of_week: 3 }), params(OWN_SCHEDULE))
    expect(notifyMock).toHaveBeenCalledTimes(1)
  })

  it('ignores hourly_rate/pay_rate/discount_percent in the body -- a client cannot set their own rate', async () => {
    const res = await PUT(req({ hourly_rate: 1, pay_rate: 999, discount_percent: 100 }), params(OWN_SCHEDULE))
    expect(res.status).toBe(200)
    const sched = fake._store.get('recurring_schedules')?.find((s) => s.id === OWN_SCHEDULE)
    expect(sched?.hourly_rate).toBe(60)
    expect(sched?.discount_percent).toBe(10)
    expect(sched?.pay_rate).toBeUndefined()
  })

  it('rejects a cleaner_id belonging to another tenant', async () => {
    const res = await PUT(req({ cleaner_id: 'tm-other-tenant' }), params(OWN_SCHEDULE))
    expect(res.status).toBe(400)
  })

  it('rejects an inactive cleaner_id', async () => {
    const res = await PUT(req({ cleaner_id: 'tm-inactive' }), params(OWN_SCHEDULE))
    expect(res.status).toBe(400)
  })

  it('accepts a valid active cleaner_id in this tenant', async () => {
    const res = await PUT(req({ cleaner_id: 'tm-active' }), params(OWN_SCHEDULE))
    expect(res.status).toBe(200)
    const sched = fake._store.get('recurring_schedules')?.find((s) => s.id === OWN_SCHEDULE)
    expect(sched?.team_member_id).toBe('tm-active')
  })
})

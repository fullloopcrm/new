import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * DELETE /api/bookings/[id]?cancel_series=true — BookingsAdmin.tsx's
 * "Cancel > All future". Regression coverage for the bug found live
 * 2026-07-26 (commit 4f6df2042): the route accepted the query param but
 * never read it, silently hard-deleting only the single clicked booking
 * and leaving the schedule + every other future booking 'scheduled' forever.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake, __fake: fake }
})
vi.mock('@/lib/tenant-supabase', async () => {
  const mod = await import('@/lib/supabase') as unknown as { __fake: unknown }
  return { tenantClient: async () => mod.__fake }
})

const TENANT_ID = 'tenant-A'
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_ID }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))
const roleHolder = vi.hoisted(() => ({ role: 'owner' }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_ID, role: roleHolder.role }, error: null }),
  overridesFor: () => null,
}))
vi.mock('@/lib/audit', () => ({ audit: async () => ({ success: true }) }))
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => {} }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({}) }))
vi.mock('@/lib/messaging/team-sms-resolver', () => ({ teamSmsTemplates: () => ({}) }))
vi.mock('@/lib/comms-prefs', () => ({ isCommEnabled: async () => false }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))

import { supabaseAdmin } from '@/lib/supabase'
import { DELETE } from './route'

const SCHEDULE_ID = 'sched-1'
const CLICKED_ID = 'bk-clicked' // the 3rd occurrence — cancel-series should cancel this + everything after
const fake = supabaseAdmin as unknown as FakeSupabase

function paramsFor(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

function req(cancelSeries: boolean): Request {
  const url = cancelSeries ? 'http://x?cancel_series=true' : 'http://x'
  return new Request(url, { method: 'DELETE' })
}

beforeEach(() => {
  fake._store.clear()
  roleHolder.role = 'owner'
  fake._seed('recurring_schedules', [
    { id: SCHEDULE_ID, tenant_id: TENANT_ID, status: 'active' },
  ])
  fake._seed('bookings', [
    { id: 'bk-past', tenant_id: TENANT_ID, schedule_id: SCHEDULE_ID, client_id: 'c1', status: 'completed', start_time: '2026-07-01T10:00:00' },
    { id: 'bk-before-clicked', tenant_id: TENANT_ID, schedule_id: SCHEDULE_ID, client_id: 'c1', status: 'scheduled', start_time: '2026-07-08T10:00:00' },
    { id: CLICKED_ID, tenant_id: TENANT_ID, schedule_id: SCHEDULE_ID, client_id: 'c1', status: 'scheduled', start_time: '2026-07-15T10:00:00' },
    { id: 'bk-after-1', tenant_id: TENANT_ID, schedule_id: SCHEDULE_ID, client_id: 'c1', status: 'scheduled', start_time: '2026-07-22T10:00:00' },
    { id: 'bk-after-2', tenant_id: TENANT_ID, schedule_id: SCHEDULE_ID, client_id: 'c1', status: 'pending', start_time: '2026-07-29T10:00:00' },
    // Different schedule entirely — must never be touched.
    { id: 'bk-other-schedule', tenant_id: TENANT_ID, schedule_id: 'sched-2', client_id: 'c2', status: 'scheduled', start_time: '2026-07-20T10:00:00' },
  ])
})

describe('DELETE /api/bookings/[id]?cancel_series=true', () => {
  it('a role with bookings.edit but not bookings.delete (e.g. virtual_assistant) can still cancel_series — it is a status update, not a delete', async () => {
    roleHolder.role = 'virtual_assistant'
    const res = await DELETE(req(true), paramsFor(CLICKED_ID))
    expect(res.status).toBe(200)
    const byId = (id: string) => fake._all('bookings').find((r) => r.id === id)!
    expect(byId(CLICKED_ID).status).toBe('cancelled')
  })

  it('cancels the schedule itself', async () => {
    await DELETE(req(true), paramsFor(CLICKED_ID))
    const schedule = fake._all('recurring_schedules').find((r) => r.id === SCHEDULE_ID)!
    expect(schedule.status).toBe('cancelled')
  })

  it('cancels the clicked booking and every scheduled/pending booking from it forward', async () => {
    await DELETE(req(true), paramsFor(CLICKED_ID))
    const byId = (id: string) => fake._all('bookings').find((r) => r.id === id)!
    expect(byId(CLICKED_ID).status).toBe('cancelled')
    expect(byId('bk-after-1').status).toBe('cancelled')
    expect(byId('bk-after-2').status).toBe('cancelled')
  })

  it('does NOT touch a booking before the clicked one (already-passed history stays intact)', async () => {
    await DELETE(req(true), paramsFor(CLICKED_ID))
    const before = fake._all('bookings').find((r) => r.id === 'bk-before-clicked')!
    expect(before.status).toBe('scheduled')
  })

  it('does NOT touch a completed booking even if its date is in the future window', async () => {
    await DELETE(req(true), paramsFor(CLICKED_ID))
    const past = fake._all('bookings').find((r) => r.id === 'bk-past')!
    expect(past.status).toBe('completed')
  })

  it('does NOT touch bookings on a different schedule', async () => {
    await DELETE(req(true), paramsFor(CLICKED_ID))
    const other = fake._all('bookings').find((r) => r.id === 'bk-other-schedule')!
    expect(other.status).toBe('scheduled')
  })

  it('soft-cancels rather than hard-deleting — every row still exists after the call', async () => {
    const before = fake._all('bookings').length
    await DELETE(req(true), paramsFor(CLICKED_ID))
    expect(fake._all('bookings')).toHaveLength(before)
  })

  it('returns the cancelled-schedule + cancelled-bookings counts', async () => {
    const res = await DELETE(req(true), paramsFor(CLICKED_ID))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.schedule_cancelled).toBe(true)
    expect(body.bookings_cancelled).toBe(3) // clicked + bk-after-1 + bk-after-2
  })

  it('cancel_series=false (or absent) falls through to the normal single-booking delete path, untouched', async () => {
    const res = await DELETE(req(false), paramsFor(CLICKED_ID))
    expect(res.status).toBe(200)
    expect(fake._all('bookings').find((r) => r.id === CLICKED_ID)).toBeUndefined() // hard-deleted, not cancelled
    // The rest of the series is unaffected by a single non-series delete.
    const after1 = fake._all('bookings').find((r) => r.id === 'bk-after-1')!
    expect(after1.status).toBe('scheduled')
  })

  it('cancel_series=true on a booking with no schedule_id falls through to single-booking delete, not an error', async () => {
    fake._seed('bookings', [
      { id: 'bk-standalone', tenant_id: TENANT_ID, schedule_id: null, client_id: 'c1', status: 'scheduled', start_time: '2026-08-01T10:00:00' },
    ])
    const res = await DELETE(req(true), paramsFor('bk-standalone'))
    expect(res.status).toBe(200)
    expect(fake._all('bookings').find((r) => r.id === 'bk-standalone')).toBeUndefined()
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * bookings/[id] DELETE -- global bug reported by W4, fixed here (leader
 * dispatch 16:27). The handler unconditionally HARD-DELETED every booking
 * regardless of query params -- hard_delete and cancel_series were read
 * nowhere in the code (the request param was even named `_request` to mark
 * it unused). BookingsAdmin.tsx's Cancel/Cancel-series buttons all expect a
 * SOFT cancel (status='cancelled') and re-fetch the booking afterward,
 * expecting it to still exist -- the old behavior 404'd that re-fetch and
 * silently corrupted the modal. Only the separate "permanently delete"
 * button (shown only once a booking is already cancelled) should ever
 * remove the row, via hard_delete=true.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
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
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_ID }, error: null }),
}))
const auditCalls: Array<{ action: string; details?: unknown }> = []
vi.mock('@/lib/audit', () => ({ audit: async (args: { action: string; details?: unknown }) => { auditCalls.push(args) } }))
const notifyCalls: Array<unknown> = []
vi.mock('@/lib/notify', () => ({ notify: async (args: unknown) => { notifyCalls.push(args) } }))
const smsCalls: Array<unknown> = []
vi.mock('@/lib/sms', () => ({ sendSMS: async (args: unknown) => { smsCalls.push(args) } }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({ cancellation: () => 'Cancelled.' }) }))
vi.mock('@/lib/messaging/team-sms-resolver', () => ({ teamSmsTemplates: () => ({}) }))
vi.mock('@/lib/comms-prefs', () => ({ isCommEnabled: async () => true }))

import { supabaseAdmin } from '@/lib/supabase'
import { DELETE } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function paramsFor(id: string) {
  return { params: Promise.resolve({ id }) }
}
function req(url: string) {
  return new Request(url)
}

beforeEach(() => {
  fake._store.clear()
  auditCalls.length = 0
  notifyCalls.length = 0
  smsCalls.length = 0
  fake._seed('tenants', [{ id: TENANT_ID, name: 'Test Co', telnyx_api_key: null, telnyx_phone: null }])
  fake._seed('bookings', [
    { id: 'bk-1', tenant_id: TENANT_ID, client_id: 'client-1', status: 'scheduled', start_time: '2026-08-01T14:00:00', schedule_id: null },
  ])
})

describe('DELETE /api/bookings/[id] — plain cancel (no params)', () => {
  it('soft-cancels the booking instead of removing the row', async () => {
    const res = await DELETE(req('http://x/api/bookings/bk-1'), paramsFor('bk-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.cancelled).toBe(true)

    const row = fake._all('bookings').find((r) => r.id === 'bk-1')
    expect(row).toBeDefined() // still exists -- the old bug's core failure
    expect(row!.status).toBe('cancelled')
  })

  it('skips notifications when skip_email=true', async () => {
    await DELETE(req('http://x/api/bookings/bk-1?skip_email=true'), paramsFor('bk-1'))
    expect(notifyCalls).toHaveLength(0)
  })
})

describe('DELETE /api/bookings/[id] — cancel_series=true', () => {
  beforeEach(() => {
    fake._store.clear()
    fake._seed('tenants', [{ id: TENANT_ID, name: 'Test Co', telnyx_api_key: null, telnyx_phone: null }])
    fake._seed('recurring_schedules', [{ id: 'sched-1', tenant_id: TENANT_ID, status: 'active' }])
    fake._seed('bookings', [
      { id: 'bk-past', tenant_id: TENANT_ID, client_id: 'client-1', status: 'completed', start_time: '2020-01-01T14:00:00', schedule_id: 'sched-1' },
      { id: 'bk-target', tenant_id: TENANT_ID, client_id: 'client-1', status: 'scheduled', start_time: '2099-01-01T14:00:00', schedule_id: 'sched-1' },
      { id: 'bk-future', tenant_id: TENANT_ID, client_id: 'client-1', status: 'confirmed', start_time: '2099-01-02T14:00:00', schedule_id: 'sched-1' },
    ])
  })

  it('cancels the target booking and every future sibling under the same schedule, pauses the schedule, and leaves the past booking alone', async () => {
    const res = await DELETE(req('http://x/api/bookings/bk-target?cancel_series=true'), paramsFor('bk-target'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.cancelled).toBe(true)

    const rows = fake._all('bookings')
    expect(rows.find((r) => r.id === 'bk-target')!.status).toBe('cancelled')
    expect(rows.find((r) => r.id === 'bk-future')!.status).toBe('cancelled')
    expect(rows.find((r) => r.id === 'bk-past')!.status).toBe('completed') // untouched

    const schedule = fake._all('recurring_schedules').find((r) => r.id === 'sched-1')!
    expect(schedule.status).toBe('cancelled')
  })
})

describe('DELETE /api/bookings/[id] — hard_delete=true', () => {
  it('rejects hard-deleting a booking that is not already cancelled', async () => {
    const res = await DELETE(req('http://x/api/bookings/bk-1?hard_delete=true'), paramsFor('bk-1'))
    expect(res.status).toBe(400)
    expect(fake._all('bookings').find((r) => r.id === 'bk-1')).toBeDefined()
  })

  it('permanently removes a booking that is already cancelled', async () => {
    fake._store.clear()
    fake._seed('tenants', [{ id: TENANT_ID, name: 'Test Co', telnyx_api_key: null, telnyx_phone: null }])
    fake._seed('bookings', [{ id: 'bk-1', tenant_id: TENANT_ID, client_id: 'client-1', status: 'cancelled', start_time: '2026-08-01T14:00:00', schedule_id: null }])

    const res = await DELETE(req('http://x/api/bookings/bk-1?hard_delete=true'), paramsFor('bk-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.hard_deleted).toBe(true)
    expect(fake._all('bookings').find((r) => r.id === 'bk-1')).toBeUndefined()
    expect(auditCalls.some((a) => a.action === 'booking.hard_deleted')).toBe(true)
  })
})

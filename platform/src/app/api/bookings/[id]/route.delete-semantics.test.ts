import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * DELETE /api/bookings/[id] ignored all three query params BookingsAdmin
 * sends it (`cancel_series`, `hard_delete`, `skip_email`) and unconditionally
 * hard-deleted the single clicked booking every time, regardless of intent:
 *
 *  - Plain "Cancel" (no params, shown for every non-cancelled status
 *    INCLUDING completed/paid) permanently erased the row — same
 *    "destructive op on a record with financial significance" shape as item
 *    (118), just the whole row instead of one column, and reachable by
 *    clicking what the UI labels a routine "Cancel", not a delete.
 *  - "Permanently delete" (hard_delete=true, UI only shows this for an
 *    already-cancelled booking) did the exact same unconditional delete —
 *    no server-side check the booking was actually cancelled first.
 *  - "Cancel All Future" on a recurring series (cancel_series=true) silently
 *    no-op'd the series: only the one clicked booking was deleted, the
 *    schedule kept generating new bookings and every other future occurrence
 *    stayed fully live — the admin is told success but nothing about the
 *    series actually changed.
 *
 * Proves the fix: default cancels (status flip, row preserved), hard_delete
 * is rejected unless the booking is already cancelled, and cancel_series
 * cancels the whole recurring_schedules row plus its future bookings.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

const TENANT_ID = 'tenant-delete-semantics'
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_ID }, error: null }),
}))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => ({})) }))
const { notifyMock, sendSMSMock } = vi.hoisted(() => ({
  notifyMock: vi.fn(async () => ({})),
  sendSMSMock: vi.fn(async () => ({})),
}))
vi.mock('@/lib/notify', () => ({ notify: notifyMock }))
vi.mock('@/lib/sms', () => ({ sendSMS: sendSMSMock }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({ cancellation: () => 'sms body' }) }))
vi.mock('@/lib/messaging/team-sms-resolver', () => ({ teamSmsTemplates: () => ({}) }))

import { supabaseAdmin } from '@/lib/supabase'
import { DELETE } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function del(id: string, qs = ''): Promise<Response> {
  return DELETE(new Request(`http://x/api/bookings/${id}${qs}`, { method: 'DELETE' }), { params: Promise.resolve({ id }) })
}

beforeEach(() => {
  fake._store.clear()
  notifyMock.mockClear()
  sendSMSMock.mockClear()
  fake._seed('tenants', [{ id: TENANT_ID, name: 'Test Co', telnyx_api_key: null, telnyx_phone: null, timezone: 'America/New_York' }])
})

describe('DELETE /api/bookings/[id] — default (plain "Cancel") soft-cancels instead of hard-deleting', () => {
  it('preserves the row with status flipped to cancelled', async () => {
    fake._seed('bookings', [
      { id: 'bk-1', tenant_id: TENANT_ID, client_id: null, status: 'completed', start_time: '2026-08-10T10:00:00.000Z' },
    ])
    const res = await del('bk-1')
    expect(res.status).toBe(200)
    const row = fake._all('bookings').find((r) => r.id === 'bk-1')
    expect(row).toBeDefined()
    expect(row!.status).toBe('cancelled')
  })

  it('skip_email=true suppresses the client cancellation notification', async () => {
    fake._seed('bookings', [
      { id: 'bk-2', tenant_id: TENANT_ID, client_id: 'client-1', status: 'scheduled', start_time: '2026-08-10T10:00:00.000Z', clients: { name: 'Alice', phone: null, sms_consent: true } },
    ])
    await del('bk-2', '?skip_email=true')
    expect(notifyMock).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/bookings/[id]?hard_delete=true — only allowed on an already-cancelled booking', () => {
  it('rejects hard_delete on a non-cancelled booking, leaving it untouched', async () => {
    fake._seed('bookings', [
      { id: 'bk-3', tenant_id: TENANT_ID, client_id: null, status: 'scheduled', start_time: '2026-08-10T10:00:00.000Z' },
    ])
    const res = await del('bk-3', '?hard_delete=true')
    expect(res.status).toBe(400)
    const row = fake._all('bookings').find((r) => r.id === 'bk-3')
    expect(row).toBeDefined()
    expect(row!.status).toBe('scheduled')
  })

  it('permanently removes an already-cancelled booking (positive control)', async () => {
    fake._seed('bookings', [
      { id: 'bk-4', tenant_id: TENANT_ID, client_id: null, status: 'cancelled', start_time: '2026-08-10T10:00:00.000Z' },
    ])
    const res = await del('bk-4', '?hard_delete=true')
    expect(res.status).toBe(200)
    const row = fake._all('bookings').find((r) => r.id === 'bk-4')
    expect(row).toBeUndefined()
  })
})

describe('DELETE /api/bookings/[id]?cancel_series=true — cancels the whole recurring series, not just the clicked booking', () => {
  it('cancels the schedule and every future scheduled/pending booking on it', async () => {
    fake._seed('recurring_schedules', [{ id: 'sched-1', tenant_id: TENANT_ID, status: 'active' }])
    fake._seed('bookings', [
      { id: 'bk-clicked', tenant_id: TENANT_ID, schedule_id: 'sched-1', status: 'scheduled', start_time: '2099-01-01T10:00:00.000Z', client_id: null },
      { id: 'bk-future', tenant_id: TENANT_ID, schedule_id: 'sched-1', status: 'pending', start_time: '2099-01-08T10:00:00.000Z', client_id: null },
      { id: 'bk-past', tenant_id: TENANT_ID, schedule_id: 'sched-1', status: 'completed', start_time: '2020-01-01T10:00:00.000Z', client_id: null },
      { id: 'bk-other-schedule', tenant_id: TENANT_ID, schedule_id: 'sched-2', status: 'scheduled', start_time: '2099-01-01T10:00:00.000Z', client_id: null },
    ])

    const res = await del('bk-clicked', '?cancel_series=true')
    expect(res.status).toBe(200)

    const schedule = fake._all('recurring_schedules').find((r) => r.id === 'sched-1')
    expect(schedule!.status).toBe('cancelled')

    const rows = fake._all('bookings')
    expect(rows.find((r) => r.id === 'bk-clicked')!.status).toBe('cancelled')
    expect(rows.find((r) => r.id === 'bk-future')!.status).toBe('cancelled')
    // Already-completed booking on the same schedule keeps its history.
    expect(rows.find((r) => r.id === 'bk-past')!.status).toBe('completed')
    // A different schedule's booking is untouched.
    expect(rows.find((r) => r.id === 'bk-other-schedule')!.status).toBe('scheduled')
  })

  it('sends no client notification for a series cancellation (bulk admin action, same convention as recurring-schedules DELETE)', async () => {
    fake._seed('recurring_schedules', [{ id: 'sched-3', tenant_id: TENANT_ID, status: 'active' }])
    fake._seed('bookings', [
      { id: 'bk-5', tenant_id: TENANT_ID, schedule_id: 'sched-3', status: 'scheduled', start_time: '2099-01-01T10:00:00.000Z', client_id: 'client-1', clients: { name: 'Alice', phone: null, sms_consent: true } },
    ])
    await del('bk-5', '?cancel_series=true')
    expect(notifyMock).not.toHaveBeenCalled()
  })
})

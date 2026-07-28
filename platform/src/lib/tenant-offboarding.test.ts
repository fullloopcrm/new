/**
 * Tests for the tenant offboarding cascade (offboardTenant).
 *
 * Covers the original scope (cancel every non-cancelled recurring_schedules
 * row + notify affected clients — regression coverage so this doesn't
 * silently break while extending the function) plus the new scope Jeff
 * signed off on 2026-07-28: also cancel every already-generated,
 * not-yet-occurred booking for the tenant, leaving completed/paid/no_show
 * history untouched.
 *
 * The GDPR export leg (collectGdprExport → JSZip → storage upload) is
 * stubbed out — it's covered separately in gdpr-export.test.ts and isn't
 * what this suite is verifying.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

// Relative to the real clock (not faked — offboardTenant's export leg runs
// real JSZip compression, which hangs indefinitely under vi.useFakeTimers()
// since its internal scheduling never gets to run).
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const NOW = Date.now()
const PAST = new Date(NOW - 7 * DAY).toISOString()
const FUTURE_SOON = new Date(NOW + 6 * HOUR).toISOString()
const FUTURE_LATER = new Date(NOW + 7 * DAY).toISOString()

const TENANT_ID = 'tenant-A'
const OTHER_TENANT_ID = 'tenant-B'

// ── hoisted mock handles ──
const h = vi.hoisted(() => ({
  notifyCalls: [] as Array<{ tenantId: string; type: string; title: string; message: string; recipientId: string }>,
}))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  // offboardTenant also uploads a zip export to storage — not under test
  // here (see gdpr-export.test.ts), so stub it out as a no-op success.
  const withStorage = Object.assign(fake, {
    storage: { from: () => ({ upload: async () => ({ error: null }) }) },
  })
  return { supabaseAdmin: withStorage }
})

vi.mock('@/lib/notify', () => ({
  notify: async (params: { tenantId: string; type: string; title: string; message: string; recipientId: string }) => {
    h.notifyCalls.push(params)
    return { success: true }
  },
}))

vi.mock('@/lib/gdpr-export', () => ({
  collectGdprExport: async () => ({
    generated_at: new Date(NOW).toISOString(),
    tenant_id: TENANT_ID,
    client_id: null,
    counts: { bookings: 0, invoices: 0, communications: 0, notes: 0 },
    sections: { bookings: [], invoices: [], communications: [], notes: [] },
  }),
  rowsToCsv: () => '',
  buildManifestText: () => '',
}))

vi.mock('@/lib/audit', () => ({ audit: async () => ({ success: true }) }))

import { supabaseAdmin } from '@/lib/supabase'
import { offboardTenant } from './tenant-offboarding'

const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  h.notifyCalls.length = 0
})

describe('offboardTenant — recurring schedules (original scope, regression coverage)', () => {
  beforeEach(() => {
    fake._seed('recurring_schedules', [
      { id: 'sched-1', tenant_id: TENANT_ID, client_id: 'c1', status: 'active' },
      { id: 'sched-2', tenant_id: TENANT_ID, client_id: 'c2', status: 'paused' },
      { id: 'sched-already-cancelled', tenant_id: TENANT_ID, client_id: 'c3', status: 'cancelled' },
      { id: 'sched-other-tenant', tenant_id: OTHER_TENANT_ID, client_id: 'c9', status: 'active' },
    ])
  })

  it('cancels every non-cancelled schedule for the tenant', async () => {
    const result = await offboardTenant(TENANT_ID)
    expect(result.schedulesCancelled).toBe(2)
    const s1 = fake._all('recurring_schedules').find((r) => r.id === 'sched-1')!
    const s2 = fake._all('recurring_schedules').find((r) => r.id === 'sched-2')!
    expect(s1.status).toBe('cancelled')
    expect(s2.status).toBe('cancelled')
  })

  it('does not touch a schedule already cancelled', async () => {
    await offboardTenant(TENANT_ID)
    const already = fake._all('recurring_schedules').find((r) => r.id === 'sched-already-cancelled')!
    expect(already.status).toBe('cancelled') // was already, untouched by count
    const result = await offboardTenant(TENANT_ID) // second call, idempotency check
    expect(result.schedulesCancelled).toBe(0)
  })

  it('does not touch another tenant\'s schedule', async () => {
    await offboardTenant(TENANT_ID)
    const other = fake._all('recurring_schedules').find((r) => r.id === 'sched-other-tenant')!
    expect(other.status).toBe('active')
  })

  it('notifies each affected client by SMS', async () => {
    await offboardTenant(TENANT_ID)
    const recipients = h.notifyCalls.map((c) => c.recipientId).sort()
    expect(recipients).toEqual(['c1', 'c2'])
    expect(h.notifyCalls.every((c) => c.type === 'booking_cancelled')).toBe(true)
  })
})

describe('offboardTenant — future bookings (new scope, 2026-07-28)', () => {
  beforeEach(() => {
    fake._seed('bookings', [
      { id: 'bk-past-completed', tenant_id: TENANT_ID, client_id: 'c1', status: 'completed', start_time: PAST },
      { id: 'bk-past-paid', tenant_id: TENANT_ID, client_id: 'c1', status: 'paid', start_time: PAST },
      { id: 'bk-past-no-show', tenant_id: TENANT_ID, client_id: 'c1', status: 'no_show', start_time: PAST },
      { id: 'bk-future-scheduled', tenant_id: TENANT_ID, client_id: 'c2', status: 'scheduled', start_time: FUTURE_SOON },
      { id: 'bk-future-pending', tenant_id: TENANT_ID, client_id: 'c3', status: 'pending', start_time: FUTURE_LATER },
      { id: 'bk-future-confirmed', tenant_id: TENANT_ID, client_id: 'c4', status: 'confirmed', start_time: FUTURE_LATER },
      { id: 'bk-future-already-cancelled', tenant_id: TENANT_ID, client_id: 'c5', status: 'cancelled', start_time: FUTURE_LATER },
      { id: 'bk-other-tenant-future', tenant_id: OTHER_TENANT_ID, client_id: 'c9', status: 'scheduled', start_time: FUTURE_LATER },
    ])
  })

  it('cancels every future, not-yet-occurred booking for the tenant', async () => {
    const result = await offboardTenant(TENANT_ID)
    expect(result.bookingsCancelled).toBe(3) // scheduled + pending + confirmed
    const byId = (id: string) => fake._all('bookings').find((r) => r.id === id)!
    expect(byId('bk-future-scheduled').status).toBe('cancelled')
    expect(byId('bk-future-pending').status).toBe('cancelled')
    expect(byId('bk-future-confirmed').status).toBe('cancelled')
  })

  it('does NOT touch completed, paid, or no_show bookings even though this is the tenant being offboarded', async () => {
    await offboardTenant(TENANT_ID)
    const byId = (id: string) => fake._all('bookings').find((r) => r.id === id)!
    expect(byId('bk-past-completed').status).toBe('completed')
    expect(byId('bk-past-paid').status).toBe('paid')
    expect(byId('bk-past-no-show').status).toBe('no_show')
  })

  it('does not re-count a booking that was already cancelled', async () => {
    const result = await offboardTenant(TENANT_ID)
    expect(result.bookingsCancelled).toBe(3)
    const already = fake._all('bookings').find((r) => r.id === 'bk-future-already-cancelled')!
    expect(already.status).toBe('cancelled')
  })

  it('does not touch a future booking belonging to another tenant', async () => {
    await offboardTenant(TENANT_ID)
    const other = fake._all('bookings').find((r) => r.id === 'bk-other-tenant-future')!
    expect(other.status).toBe('scheduled')
  })

  it('soft-cancels rather than deleting — every booking row still exists', async () => {
    const before = fake._all('bookings').length
    await offboardTenant(TENANT_ID)
    expect(fake._all('bookings')).toHaveLength(before)
  })

  it('notifies each client with a cancelled future booking', async () => {
    await offboardTenant(TENANT_ID)
    const recipients = h.notifyCalls.map((c) => c.recipientId).sort()
    expect(recipients).toEqual(['c2', 'c3', 'c4'])
  })

  it('a booking-only client (no recurring schedule) gets booking-specific wording, not the recurring-service message', async () => {
    await offboardTenant(TENANT_ID)
    const call = h.notifyCalls.find((c) => c.recipientId === 'c2')!
    expect(call.message).toMatch(/upcoming appointment/i)
    expect(call.message).not.toMatch(/recurring service/i)
  })

  it('a past-dated booking still marked scheduled (never closed out) is left alone — only start_time in the future counts', async () => {
    fake._seed('bookings', [
      { id: 'bk-stale-scheduled', tenant_id: TENANT_ID, client_id: 'c6', status: 'scheduled', start_time: PAST },
    ])
    await offboardTenant(TENANT_ID)
    const stale = fake._all('bookings').find((r) => r.id === 'bk-stale-scheduled')!
    expect(stale.status).toBe('scheduled')
  })
})

describe('offboardTenant — combined schedule + booking cancellation for the same client', () => {
  beforeEach(() => {
    fake._seed('recurring_schedules', [
      { id: 'sched-1', tenant_id: TENANT_ID, client_id: 'c1', status: 'active' },
    ])
    fake._seed('bookings', [
      { id: 'bk-1', tenant_id: TENANT_ID, schedule_id: 'sched-1', client_id: 'c1', status: 'scheduled', start_time: FUTURE_SOON },
    ])
  })

  it('sends a single combined notification per client rather than two separate ones', async () => {
    await offboardTenant(TENANT_ID)
    const c1Calls = h.notifyCalls.filter((c) => c.recipientId === 'c1')
    expect(c1Calls).toHaveLength(1)
    expect(c1Calls[0].message).toMatch(/recurring service/i)
    expect(c1Calls[0].message).toMatch(/upcoming appointments/i)
  })

  it('reports both counts correctly in the result', async () => {
    const result = await offboardTenant(TENANT_ID)
    expect(result.schedulesCancelled).toBe(1)
    expect(result.bookingsCancelled).toBe(1)
    expect(result.clientsNotified).toBe(1)
  })
})

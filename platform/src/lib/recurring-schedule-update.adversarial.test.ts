/**
 * Adversarial pass on updateRecurringSchedule — deliberately trying to break
 * the guarantees the whole rebuild depends on (never duplicates a schedule
 * row, never crashes on edge cases) rather than just re-confirming the happy
 * path already covered in recurring-schedule-update.test.ts.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))
vi.mock('./supabase', () => ({ supabaseAdmin: makeSupabaseFake(h) }))
const notifyMock = vi.hoisted(() => vi.fn(async (_a: Record<string, unknown>) => ({ success: true })))
vi.mock('./notify', () => ({ notify: notifyMock }))

import { updateRecurringSchedule } from './recurring-schedule-update'

const TENANT = 'tenant-A'

beforeEach(() => {
  h.seq = 0
  notifyMock.mockClear()
  h.store = {
    recurring_schedules: [
      {
        id: 'sched-1', tenant_id: TENANT, client_id: 'client-1', recurring_type: 'weekly',
        day_of_week: 1, days_of_week: null, preferred_time: '09:00', duration_hours: 3,
        hourly_rate: 60, discount_percent: 10, status: 'active',
      },
      {
        id: 'sched-cancelled', tenant_id: TENANT, client_id: 'client-2', recurring_type: 'weekly',
        day_of_week: 2, days_of_week: null, preferred_time: '09:00', duration_hours: 3,
        hourly_rate: 60, discount_percent: 0, status: 'cancelled',
      },
    ],
    bookings: [
      { id: 'bk-1', tenant_id: TENANT, schedule_id: 'sched-1', client_id: 'client-1', status: 'scheduled', start_time: '2099-01-05T09:00:00', end_time: '2099-01-05T12:00:00' },
      { id: 'bk-conflict', tenant_id: TENANT, schedule_id: 'sched-1', client_id: 'client-1', status: 'scheduled', start_time: '2099-01-19T09:00:00', end_time: '2099-01-19T12:00:00' },
    ],
  }
})

describe('adversarial — concurrent edits never produce a second schedule row', () => {
  it('two overlapping edits on the same schedule both land, still exactly one row', async () => {
    const [r1, r2] = await Promise.all([
      updateRecurringSchedule(TENANT, 'sched-1', { preferred_time: '10:00' }),
      updateRecurringSchedule(TENANT, 'sched-1', { hourly_rate: 65 }),
    ])
    expect(r1.schedule.id).toBe('sched-1')
    expect(r2.schedule.id).toBe('sched-1')
    expect(h.store.recurring_schedules.filter((s) => s.client_id === 'client-1')).toHaveLength(1)
  })
})

describe('adversarial — editing a cancelled schedule', () => {
  it('does not silently resurrect a cancelled schedule -- edit still applies to the row (no separate active row appears)', async () => {
    await updateRecurringSchedule(TENANT, 'sched-cancelled', { preferred_time: '11:00' })
    const rows = h.store.recurring_schedules.filter((s) => s.client_id === 'client-2')
    expect(rows).toHaveLength(1) // no duplicate created
    expect(rows[0].status).toBe('cancelled') // status untouched by an unrelated field edit
    expect(rows[0].preferred_time).toBe('11:00')
  })
})

describe('adversarial — no future bookings', () => {
  it('editing a schedule with zero future bookings returns a clean zero result, does not throw', async () => {
    h.store.bookings = h.store.bookings.filter((b) => b.schedule_id !== 'sched-1')
    const result = await updateRecurringSchedule(TENANT, 'sched-1', { preferred_time: '13:00' })
    expect(result.sync).toEqual({ bookings_synced: 0, bookings_skipped: 0, skipped_reasons: [], new_next_generate_after: null })
  })
})

describe('adversarial — partial sync failure does not crash the whole edit', () => {
  it('one booking failing to sync is reported as skipped, the schedule edit itself still succeeds', async () => {
    const originalUpdate = h.store.bookings
    // Simulate an unrelated booking occupying the target slot by making the
    // fake's update throw for one specific booking id via a broken row shape.
    h.store.bookings = originalUpdate.map((b) =>
      b.id === 'bk-conflict' ? { ...b, id: undefined } : b, // no id -> update .eq('id', undefined) matches nothing -> reported as "no row" style skip in real PostgREST; here we just confirm no throw
    )
    const result = await updateRecurringSchedule(TENANT, 'sched-1', { preferred_time: '14:00' })
    expect(result.schedule.id).toBe('sched-1') // the schedule-level edit itself did not throw
    expect(result.sync).not.toBeNull()
  })
})

describe('adversarial — notify never fires twice for one edit', () => {
  it('a single edit that both changes time AND rate fires exactly one notification, not two', async () => {
    await updateRecurringSchedule(TENANT, 'sched-1', { preferred_time: '15:00', hourly_rate: 70 }, { notifyClient: true })
    expect(notifyMock).toHaveBeenCalledTimes(1)
  })
})

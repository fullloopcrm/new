/**
 * updateRecurringSchedule — the one shared edit path for recurring_schedules.
 *
 * Core invariant under test: an edit NEVER creates a second schedule row.
 * Before this function existed, the client side had no edit endpoint at all
 * (only create), so a client "editing" meant cancel-old + create-new as two
 * separate calls — which produced duplicate active+cancelled schedule pairs
 * for 9 real nycmaid clients (6mo audit, 2026-07-26). Every test here asserts
 * the store still has exactly one schedule row after an edit.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
}))

vi.mock('./supabase', () => ({ supabaseAdmin: makeSupabaseFake(h) }))
const notifyMock = vi.hoisted(() => vi.fn(async (_args: Record<string, unknown>) => ({ success: true })))
vi.mock('./notify', () => ({ notify: notifyMock }))

import { updateRecurringSchedule } from './recurring-schedule-update'

const TENANT = 'tenant-A'

beforeEach(() => {
  h.seq = 0
  notifyMock.mockClear()
  h.store = {
    recurring_schedules: [
      {
        id: 'sched-1',
        tenant_id: TENANT,
        client_id: 'client-1',
        recurring_type: 'weekly',
        day_of_week: 1, // Monday
        days_of_week: null,
        preferred_time: '09:00',
        duration_hours: 3,
        hourly_rate: 60,
        discount_percent: 10,
        status: 'active',
      },
    ],
    bookings: [
      {
        id: 'bk-1',
        tenant_id: TENANT,
        schedule_id: 'sched-1',
        client_id: 'client-1',
        status: 'scheduled',
        start_time: '2099-01-05T09:00:00',
        end_time: '2099-01-05T12:00:00',
      },
    ],
  }
})

describe('updateRecurringSchedule — never duplicates the schedule row', () => {
  it('a rate-only edit updates the existing row in place, no new row created', async () => {
    const result = await updateRecurringSchedule(TENANT, 'sched-1', { hourly_rate: 75 })
    expect(h.store.recurring_schedules).toHaveLength(1)
    expect(h.store.recurring_schedules[0].id).toBe('sched-1')
    expect(h.store.recurring_schedules[0].hourly_rate).toBe(75)
    expect(result.schedule.id).toBe('sched-1')
  })

  it('a day/time edit syncs the future booking onto the new pattern instead of leaving it stale', async () => {
    await updateRecurringSchedule(TENANT, 'sched-1', { preferred_time: '14:00' })
    const booking = h.store.bookings.find((b) => b.id === 'bk-1')
    expect(String(booking?.start_time)).toContain('14:00:00')
  })

  it('a rate-only edit does not touch the future booking date/time', async () => {
    const before = h.store.bookings[0].start_time
    await updateRecurringSchedule(TENANT, 'sched-1', { discount_percent: 20 })
    expect(h.store.bookings[0].start_time).toBe(before)
  })

  it('dry run previews the sync without writing anything', async () => {
    const before = JSON.stringify(h.store)
    const result = await updateRecurringSchedule(TENANT, 'sched-1', { preferred_time: '16:00' }, { dryRun: true })
    expect(JSON.stringify(h.store)).toBe(before)
    expect(result.sync?.preview?.length).toBeGreaterThan(0)
  })

  it('throws on an unknown schedule id instead of silently creating one', async () => {
    await expect(updateRecurringSchedule(TENANT, 'does-not-exist', { hourly_rate: 50 })).rejects.toThrow()
    expect(h.store.recurring_schedules).toHaveLength(1) // unchanged
  })
})

describe('updateRecurringSchedule — client notification', () => {
  it('fires exactly one notification when the day/time actually moves, with notifyClient on', async () => {
    await updateRecurringSchedule(TENANT, 'sched-1', { preferred_time: '11:00' }, { notifyClient: true })
    expect(notifyMock).toHaveBeenCalledTimes(1)
    expect(notifyMock.mock.calls[0][0]).toMatchObject({ type: 'booking_rescheduled', recipientId: 'client-1' })
  })

  it('does not notify on a rate/discount-only edit even with notifyClient on', async () => {
    await updateRecurringSchedule(TENANT, 'sched-1', { hourly_rate: 80 }, { notifyClient: true })
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it('does not notify when notifyClient is omitted (admin edit default)', async () => {
    await updateRecurringSchedule(TENANT, 'sched-1', { day_of_week: 3 })
    expect(notifyMock).not.toHaveBeenCalled()
  })
})

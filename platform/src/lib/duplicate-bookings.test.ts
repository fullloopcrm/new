import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

const TENANT_A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'], rpc: null as null | Harness['rpc'] }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (t: string) => holder.from!(t), rpc: (fn: string, args: Record<string, unknown>) => holder.rpc!(fn, args) },
}))
const auditMock = vi.hoisted(() => vi.fn(async () => ({ success: true })))
vi.mock('@/lib/audit', () => ({ audit: auditMock }))
const notifyMock = vi.hoisted(() => vi.fn(async () => ({ success: true })))
vi.mock('@/lib/notify', () => ({ notify: notifyMock }))
vi.mock('@/lib/recurring', () => ({ nowNaiveET: () => '2026-08-01T00:00:00' }))

import { findDuplicateBookingGroups, resolveDuplicateBookingGroup, sweepTenantDuplicateBookings } from './duplicate-bookings'

function seed() {
  return {
    bookings: [] as Record<string, unknown>[],
    recurring_schedules: [] as Record<string, unknown>[],
    notifications: [] as Record<string, unknown>[],
    deals: [] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  holder.rpc = h.rpc
  auditMock.mockClear()
  notifyMock.mockClear()
})

describe('findDuplicateBookingGroups', () => {
  it('flags a client with two active bookings on the same date from different schedules', async () => {
    h.seed.bookings.push(
      { id: 'bk-1', tenant_id: TENANT_A, client_id: 'c1', schedule_id: 'sched-old', service_type: 'standard', status: 'scheduled', start_time: '2026-09-01T09:00:00', clients: { name: 'Troy Bailey' } },
      { id: 'bk-2', tenant_id: TENANT_A, client_id: 'c1', schedule_id: 'sched-new', service_type: 'standard', status: 'scheduled', start_time: '2026-09-01T14:00:00', clients: { name: 'Troy Bailey' } },
    )
    const groups = await findDuplicateBookingGroups(TENANT_A)
    expect(groups).toHaveLength(1)
    expect(groups[0].date).toBe('2026-09-01')
    expect(groups[0].bookings).toHaveLength(2)
  })

  it('does not flag a legitimate recurring series across different dates', async () => {
    h.seed.bookings.push(
      { id: 'bk-1', tenant_id: TENANT_A, client_id: 'c1', schedule_id: 'sched-a', service_type: 'standard', status: 'scheduled', start_time: '2026-09-01T09:00:00', clients: { name: 'Troy Bailey' } },
      { id: 'bk-2', tenant_id: TENANT_A, client_id: 'c1', schedule_id: 'sched-a', service_type: 'standard', status: 'scheduled', start_time: '2026-09-22T09:00:00', clients: { name: 'Troy Bailey' } },
    )
    const groups = await findDuplicateBookingGroups(TENANT_A)
    expect(groups).toHaveLength(0)
  })

  it('ignores cancelled bookings', async () => {
    h.seed.bookings.push(
      { id: 'bk-1', tenant_id: TENANT_A, client_id: 'c1', schedule_id: 'sched-old', service_type: 'standard', status: 'cancelled', start_time: '2026-09-01T09:00:00', clients: { name: 'Troy Bailey' } },
      { id: 'bk-2', tenant_id: TENANT_A, client_id: 'c1', schedule_id: 'sched-new', service_type: 'standard', status: 'scheduled', start_time: '2026-09-01T14:00:00', clients: { name: 'Troy Bailey' } },
    )
    const groups = await findDuplicateBookingGroups(TENANT_A)
    expect(groups).toHaveLength(0)
  })
})

describe('resolveDuplicateBookingGroup', () => {
  it('auto-cancels the booking from the newer schedule, keeps the older schedule\'s booking', async () => {
    h.seed.recurring_schedules.push(
      { id: 'sched-old', tenant_id: TENANT_A, created_at: '2026-01-01T00:00:00Z' },
      { id: 'sched-new', tenant_id: TENANT_A, created_at: '2026-07-01T00:00:00Z' },
    )
    h.seed.bookings.push(
      { id: 'bk-old', tenant_id: TENANT_A, client_id: 'c1', schedule_id: 'sched-old', service_type: 'standard', status: 'scheduled', start_time: '2026-09-01T09:00:00', clients: { name: 'Troy Bailey', phone: '5551234567', email: null } },
      { id: 'bk-new', tenant_id: TENANT_A, client_id: 'c1', schedule_id: 'sched-new', service_type: 'standard', status: 'scheduled', start_time: '2026-09-01T14:00:00', clients: { name: 'Troy Bailey', phone: '5551234567', email: null } },
    )
    const groups = await findDuplicateBookingGroups(TENANT_A)
    const result = await resolveDuplicateBookingGroup(groups[0])

    expect(result.autoResolved).toBe(true)
    expect(result.keptBookingId).toBe('bk-old')
    expect(result.autoCancelledBookingIds).toEqual(['bk-new'])

    const cancelled = h.seed.bookings.find((b) => b.id === 'bk-new')!
    expect(cancelled.status).toBe('cancelled')
    const kept = h.seed.bookings.find((b) => b.id === 'bk-old')!
    expect(kept.status).toBe('scheduled')

    // Finance/deal-sync/audit side effects ran (booking-cancel.ts's applyStatusChangeSideEffects).
    expect(auditMock).toHaveBeenCalledWith(expect.objectContaining({
      action: 'booking.duplicate_auto_cancelled',
      entityId: 'bk-new',
      details: expect.objectContaining({ keptBookingId: 'bk-old' }),
    }))
    // No client-facing notification for a system-initiated duplicate cancel.
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it('does not auto-cancel when the colliding bookings are different services', async () => {
    h.seed.recurring_schedules.push(
      { id: 'sched-old', tenant_id: TENANT_A, created_at: '2026-01-01T00:00:00Z' },
      { id: 'sched-new', tenant_id: TENANT_A, created_at: '2026-07-01T00:00:00Z' },
    )
    h.seed.bookings.push(
      { id: 'bk-old', tenant_id: TENANT_A, client_id: 'c1', schedule_id: 'sched-old', service_type: 'standard', status: 'scheduled', start_time: '2026-09-01T09:00:00', clients: { name: 'Troy Bailey' } },
      { id: 'bk-new', tenant_id: TENANT_A, client_id: 'c1', schedule_id: 'sched-new', service_type: 'carpet', status: 'scheduled', start_time: '2026-09-01T14:00:00', clients: { name: 'Troy Bailey' } },
    )
    const groups = await findDuplicateBookingGroups(TENANT_A)
    const result = await resolveDuplicateBookingGroup(groups[0])

    expect(result.autoResolved).toBe(false)
    expect(result.autoCancelledBookingIds).toEqual([])
    expect(h.seed.bookings.find((b) => b.id === 'bk-old')!.status).toBe('scheduled')
    expect(h.seed.bookings.find((b) => b.id === 'bk-new')!.status).toBe('scheduled')
  })
})

describe('sweepTenantDuplicateBookings', () => {
  it('auto-cancels true duplicates and notifies admin describing the action taken', async () => {
    h.seed.recurring_schedules.push(
      { id: 'sched-old', tenant_id: TENANT_A, created_at: '2026-01-01T00:00:00Z' },
      { id: 'sched-new', tenant_id: TENANT_A, created_at: '2026-07-01T00:00:00Z' },
    )
    h.seed.bookings.push(
      { id: 'bk-old', tenant_id: TENANT_A, client_id: 'c1', schedule_id: 'sched-old', service_type: 'standard', status: 'scheduled', start_time: '2026-09-01T09:00:00', clients: { name: 'Troy Bailey', phone: '555', email: null } },
      { id: 'bk-new', tenant_id: TENANT_A, client_id: 'c1', schedule_id: 'sched-new', service_type: 'standard', status: 'scheduled', start_time: '2026-09-01T14:00:00', clients: { name: 'Troy Bailey', phone: '555', email: null } },
    )
    const result = await sweepTenantDuplicateBookings(TENANT_A)

    expect(result.autoCancelled).toBe(1)
    expect(result.flaggedForReview).toBe(0)
    expect(result.notified).toBe(1)
    expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({
      recipientType: 'admin',
      title: 'Duplicate Booking Auto-Cancelled',
    }))
  })

  it('flags mixed-service collisions for review instead of auto-cancelling', async () => {
    h.seed.recurring_schedules.push(
      { id: 'sched-old', tenant_id: TENANT_A, created_at: '2026-01-01T00:00:00Z' },
      { id: 'sched-new', tenant_id: TENANT_A, created_at: '2026-07-01T00:00:00Z' },
    )
    h.seed.bookings.push(
      { id: 'bk-old', tenant_id: TENANT_A, client_id: 'c1', schedule_id: 'sched-old', service_type: 'standard', status: 'scheduled', start_time: '2026-09-01T09:00:00', clients: { name: 'Troy Bailey' } },
      { id: 'bk-new', tenant_id: TENANT_A, client_id: 'c1', schedule_id: 'sched-new', service_type: 'carpet', status: 'scheduled', start_time: '2026-09-01T14:00:00', clients: { name: 'Troy Bailey' } },
    )
    const result = await sweepTenantDuplicateBookings(TENANT_A)

    expect(result.autoCancelled).toBe(0)
    expect(result.flaggedForReview).toBe(1)
    expect(result.notified).toBe(1)
    expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Duplicate Recurring Schedule Detected' }))
  })
})

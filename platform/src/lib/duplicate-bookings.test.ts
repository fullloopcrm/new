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
      { id: 'bk-1', tenant_id: TENANT_A, client_id: 'c1', schedule_id: 'sched-old', service_type: 'standard', status: 'scheduled', start_time: '2026-09-01T09:00:00', created_at: '2026-01-01T00:00:00Z', clients: { name: 'Troy Bailey' } },
      { id: 'bk-2', tenant_id: TENANT_A, client_id: 'c1', schedule_id: 'sched-new', service_type: 'standard', status: 'scheduled', start_time: '2026-09-01T14:00:00', created_at: '2026-07-01T00:00:00Z', clients: { name: 'Troy Bailey' } },
    )
    const groups = await findDuplicateBookingGroups(TENANT_A)
    expect(groups).toHaveLength(1)
    expect(groups[0].date).toBe('2026-09-01')
    expect(groups[0].bookings).toHaveLength(2)
  })

  // Real prod pattern found 2026-08-14: a NYC Maid customer had 142 ACTIVE
  // bookings with schedule_id NULL, ~71 same-date pairs -- a client-booking
  // race (two near-simultaneous inserts), not a duplicate recurring schedule.
  // The schedule_id-linked-only version of this detector never caught it.
  it('flags two one-off bookings (no schedule_id) on the same date -- the real prod pattern', async () => {
    h.seed.bookings.push(
      { id: 'bk-1', tenant_id: TENANT_A, client_id: 'c1', schedule_id: null, service_type: null, status: 'scheduled', start_time: '2027-08-23T09:00:00', created_at: '2026-08-11T12:25:28Z', clients: { name: 'Catherine Mollerus' } },
      { id: 'bk-2', tenant_id: TENANT_A, client_id: 'c1', schedule_id: null, service_type: null, status: 'scheduled', start_time: '2027-08-23T13:00:00', created_at: '2026-08-11T12:27:12Z', clients: { name: 'Catherine Mollerus' } },
    )
    const groups = await findDuplicateBookingGroups(TENANT_A)
    expect(groups).toHaveLength(1)
    expect(groups[0].bookings).toHaveLength(2)
  })

  it('does not flag a legitimate recurring series across different dates', async () => {
    h.seed.bookings.push(
      { id: 'bk-1', tenant_id: TENANT_A, client_id: 'c1', schedule_id: 'sched-a', service_type: 'standard', status: 'scheduled', start_time: '2026-09-01T09:00:00', created_at: '2026-01-01T00:00:00Z', clients: { name: 'Troy Bailey' } },
      { id: 'bk-2', tenant_id: TENANT_A, client_id: 'c1', schedule_id: 'sched-a', service_type: 'standard', status: 'scheduled', start_time: '2026-09-22T09:00:00', created_at: '2026-01-01T00:00:00Z', clients: { name: 'Troy Bailey' } },
    )
    const groups = await findDuplicateBookingGroups(TENANT_A)
    expect(groups).toHaveLength(0)
  })

  it('ignores cancelled bookings', async () => {
    h.seed.bookings.push(
      { id: 'bk-1', tenant_id: TENANT_A, client_id: 'c1', schedule_id: 'sched-old', service_type: 'standard', status: 'cancelled', start_time: '2026-09-01T09:00:00', created_at: '2026-01-01T00:00:00Z', clients: { name: 'Troy Bailey' } },
      { id: 'bk-2', tenant_id: TENANT_A, client_id: 'c1', schedule_id: 'sched-new', service_type: 'standard', status: 'scheduled', start_time: '2026-09-01T14:00:00', created_at: '2026-07-01T00:00:00Z', clients: { name: 'Troy Bailey' } },
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
      { id: 'bk-old', tenant_id: TENANT_A, client_id: 'c1', schedule_id: 'sched-old', service_type: 'standard', status: 'scheduled', start_time: '2026-09-01T09:00:00', created_at: '2026-01-01T00:00:00Z', clients: { name: 'Troy Bailey', phone: '5551234567', email: null } },
      { id: 'bk-new', tenant_id: TENANT_A, client_id: 'c1', schedule_id: 'sched-new', service_type: 'standard', status: 'scheduled', start_time: '2026-09-01T14:00:00', created_at: '2026-07-01T00:00:00Z', clients: { name: 'Troy Bailey', phone: '5551234567', email: null } },
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

  it('auto-cancels one-off (no schedule_id) duplicates, keeping the earlier-created booking', async () => {
    h.seed.bookings.push(
      { id: 'bk-first', tenant_id: TENANT_A, client_id: 'c1', schedule_id: null, service_type: null, status: 'scheduled', start_time: '2027-08-23T09:00:00', created_at: '2026-08-11T12:25:28Z', clients: { name: 'Catherine Mollerus', phone: '+19144502875', email: 'catherine.mollerus@gmail.com' } },
      { id: 'bk-second', tenant_id: TENANT_A, client_id: 'c1', schedule_id: null, service_type: null, status: 'scheduled', start_time: '2027-08-23T13:00:00', created_at: '2026-08-11T12:27:12Z', clients: { name: 'Catherine Mollerus', phone: '+19144502875', email: 'catherine.mollerus@gmail.com' } },
    )
    const groups = await findDuplicateBookingGroups(TENANT_A)
    const result = await resolveDuplicateBookingGroup(groups[0])

    expect(result.autoResolved).toBe(true)
    expect(result.keptBookingId).toBe('bk-first')
    expect(result.autoCancelledBookingIds).toEqual(['bk-second'])
    expect(h.seed.bookings.find((b) => b.id === 'bk-second')!.status).toBe('cancelled')
    expect(h.seed.bookings.find((b) => b.id === 'bk-first')!.status).toBe('scheduled')
  })

  it('does not auto-cancel when the colliding bookings are different services', async () => {
    h.seed.recurring_schedules.push(
      { id: 'sched-old', tenant_id: TENANT_A, created_at: '2026-01-01T00:00:00Z' },
      { id: 'sched-new', tenant_id: TENANT_A, created_at: '2026-07-01T00:00:00Z' },
    )
    h.seed.bookings.push(
      { id: 'bk-old', tenant_id: TENANT_A, client_id: 'c1', schedule_id: 'sched-old', service_type: 'standard', status: 'scheduled', start_time: '2026-09-01T09:00:00', created_at: '2026-01-01T00:00:00Z', clients: { name: 'Troy Bailey' } },
      { id: 'bk-new', tenant_id: TENANT_A, client_id: 'c1', schedule_id: 'sched-new', service_type: 'carpet', status: 'scheduled', start_time: '2026-09-01T14:00:00', created_at: '2026-07-01T00:00:00Z', clients: { name: 'Troy Bailey' } },
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
      { id: 'bk-old', tenant_id: TENANT_A, client_id: 'c1', schedule_id: 'sched-old', service_type: 'standard', status: 'scheduled', start_time: '2026-09-01T09:00:00', created_at: '2026-01-01T00:00:00Z', clients: { name: 'Troy Bailey', phone: '555', email: null } },
      { id: 'bk-new', tenant_id: TENANT_A, client_id: 'c1', schedule_id: 'sched-new', service_type: 'standard', status: 'scheduled', start_time: '2026-09-01T14:00:00', created_at: '2026-07-01T00:00:00Z', clients: { name: 'Troy Bailey', phone: '555', email: null } },
    )
    const result = await sweepTenantDuplicateBookings(TENANT_A)

    expect(result.autoCancelled).toBe(1)
    expect(result.flaggedForReview).toBe(0)
    expect(result.notified).toBe(1)
    expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({
      recipientType: 'admin',
      title: 'Duplicate Bookings Auto-Cancelled',
    }))
  })

  it('flags mixed-service collisions for review instead of auto-cancelling', async () => {
    h.seed.recurring_schedules.push(
      { id: 'sched-old', tenant_id: TENANT_A, created_at: '2026-01-01T00:00:00Z' },
      { id: 'sched-new', tenant_id: TENANT_A, created_at: '2026-07-01T00:00:00Z' },
    )
    h.seed.bookings.push(
      { id: 'bk-old', tenant_id: TENANT_A, client_id: 'c1', schedule_id: 'sched-old', service_type: 'standard', status: 'scheduled', start_time: '2026-09-01T09:00:00', created_at: '2026-01-01T00:00:00Z', clients: { name: 'Troy Bailey' } },
      { id: 'bk-new', tenant_id: TENANT_A, client_id: 'c1', schedule_id: 'sched-new', service_type: 'carpet', status: 'scheduled', start_time: '2026-09-01T14:00:00', created_at: '2026-07-01T00:00:00Z', clients: { name: 'Troy Bailey' } },
    )
    const result = await sweepTenantDuplicateBookings(TENANT_A)

    expect(result.autoCancelled).toBe(0)
    expect(result.flaggedForReview).toBe(1)
    expect(result.notified).toBe(1)
    expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Duplicate Bookings Detected' }))
  })

  // Regression (2026-08-14 incident): a single sweep resolving many
  // collisions used to call notify() once PER collision -- 72 separate
  // emails to one admin inbox for one nycmaid run. Must be exactly one
  // notify() call per sweep, no matter how many collisions it resolves.
  it('sends exactly ONE notify() call for a sweep that resolves many collisions', async () => {
    h.seed.recurring_schedules.push({ id: 'sched-old', tenant_id: TENANT_A, created_at: '2026-01-01T00:00:00Z' })
    for (let i = 0; i < 5; i++) {
      h.seed.bookings.push(
        { id: `bk-${i}-a`, tenant_id: TENANT_A, client_id: `c${i}`, schedule_id: null, service_type: null, status: 'scheduled', start_time: `2026-09-0${i + 1}T09:00:00`, created_at: '2026-08-01T12:00:00Z', clients: { name: `Client ${i}`, phone: '555', email: null } },
        { id: `bk-${i}-b`, tenant_id: TENANT_A, client_id: `c${i}`, schedule_id: null, service_type: null, status: 'scheduled', start_time: `2026-09-0${i + 1}T14:00:00`, created_at: '2026-08-01T12:05:00Z', clients: { name: `Client ${i}`, phone: '555', email: null } },
      )
    }
    const result = await sweepTenantDuplicateBookings(TENANT_A)

    expect(result.autoCancelled).toBe(5)
    expect(result.notified).toBe(1)
    expect(notifyMock).toHaveBeenCalledTimes(1)
    expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Auto-cancelled 5 duplicate booking(s) across 5 collision(s)') }))
  })
})

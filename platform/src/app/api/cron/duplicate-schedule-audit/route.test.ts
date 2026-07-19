import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * cron/duplicate-schedule-audit (nycmaid ref 33d97974, "the Daniel Mazur
 * incident", ported P1/W2). Flags a client with 2+ active recurring
 * schedules generating bookings on the SAME calendar date — the real
 * duplicate signal, not merely "same day_of_week + preferred_time" (which
 * also matches legitimate offset-biweekly service that never collides on
 * an actual date).
 */

process.env.CRON_SECRET = 'test-cron-secret'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const notifyMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))
vi.mock('@/lib/notify', () => ({ notify: (opts: Record<string, unknown>) => notifyMock(opts) }))

import { GET } from './route'

const TENANT_A = 'tid-a'
const TENANT_SUSPENDED = 'tid-suspended'

function cronReq(): Request {
  return new Request('http://t/api/cron/duplicate-schedule-audit', {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  })
}

function futureISO(daysOut: number): string {
  return new Date(Date.now() + daysOut * 86400000).toISOString()
}

let h: Harness
beforeEach(() => {
  notifyMock.mockClear()
  h = createTenantDbHarness({
    tenants: [
      { id: TENANT_A, status: 'active' },
      { id: TENANT_SUSPENDED, status: 'suspended' },
    ],
    bookings: [],
    notifications: [],
  })
  holder.from = h.from
})

describe('cron/duplicate-schedule-audit', () => {
  it('FLAGGED: two distinct schedule_ids for the same client landing on the same date', async () => {
    const collideDate = futureISO(10)
    h.seed.bookings!.push(
      { id: 'b1', tenant_id: TENANT_A, client_id: 'c-dup', schedule_id: 'sched-1', status: 'scheduled', start_time: collideDate, clients: { name: 'Daniel Mazur' } },
      { id: 'b2', tenant_id: TENANT_A, client_id: 'c-dup', schedule_id: 'sched-2', status: 'scheduled', start_time: collideDate, clients: { name: 'Daniel Mazur' } },
    )

    const res = await GET(cronReq())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.flagged).toBe(1)
    expect(body.notified).toBe(1)
    expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: TENANT_A,
      type: 'duplicate_recurring_schedule',
      message: expect.stringContaining('Daniel Mazur has 2+ active recurring schedules'),
    }))
  })

  it('CONTROL: offset biweekly modeled as two schedules never colliding on the same date is NOT flagged', async () => {
    h.seed.bookings!.push(
      { id: 'b1', tenant_id: TENANT_A, client_id: 'c-fanny', schedule_id: 'sched-1', status: 'scheduled', start_time: futureISO(7), clients: { name: 'Fanny Kuang' } },
      { id: 'b2', tenant_id: TENANT_A, client_id: 'c-fanny', schedule_id: 'sched-2', status: 'scheduled', start_time: futureISO(14), clients: { name: 'Fanny Kuang' } },
    )

    const res = await GET(cronReq())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.flagged).toBe(0)
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it('SUSPENDED TENANT: a colliding pair belonging to a non-serving tenant is not flagged/notified', async () => {
    const collideDate = futureISO(10)
    h.seed.bookings!.push(
      { id: 'b1', tenant_id: TENANT_SUSPENDED, client_id: 'c-dup', schedule_id: 'sched-1', status: 'scheduled', start_time: collideDate, clients: { name: 'Ghost Client' } },
      { id: 'b2', tenant_id: TENANT_SUSPENDED, client_id: 'c-dup', schedule_id: 'sched-2', status: 'scheduled', start_time: collideDate, clients: { name: 'Ghost Client' } },
    )

    const res = await GET(cronReq())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.flagged).toBe(0)
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it('DEDUPE: does not re-notify within 6 days for the same still-unresolved (tenant, client)', async () => {
    const collideDate = futureISO(10)
    h.seed.bookings!.push(
      { id: 'b1', tenant_id: TENANT_A, client_id: 'c-dup', schedule_id: 'sched-1', status: 'scheduled', start_time: collideDate, clients: { name: 'Daniel Mazur' } },
      { id: 'b2', tenant_id: TENANT_A, client_id: 'c-dup', schedule_id: 'sched-2', status: 'scheduled', start_time: collideDate, clients: { name: 'Daniel Mazur' } },
    )
    h.seed.notifications!.push({
      id: 'n1', tenant_id: TENANT_A, type: 'duplicate_recurring_schedule',
      message: 'Daniel Mazur has 2+ active recurring schedules generating bookings on the same date(s): earlier. Review and deactivate the duplicate.',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    })

    const res = await GET(cronReq())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.flagged).toBe(1)
    expect(body.notified).toBe(0)
    expect(notifyMock).not.toHaveBeenCalled()
  })
})

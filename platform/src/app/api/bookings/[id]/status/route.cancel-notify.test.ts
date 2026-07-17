import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * PATCH /api/bookings/[id]/status — the operator dashboard's cancel button —
 * transitioned a booking's status with zero notification wiring, unlike its
 * sibling POST /api/portal/bookings/[id] (the client-portal self-cancel
 * route), which already SMS's the assigned tech when a client cancels. A tech
 * assigned to a same-day emergency job that an admin cancelled from the
 * dashboard had no way to find out short of checking the app themselves —
 * they could still show up to a job that no longer exists. This proves the
 * fix: notify() fires an SMS to the assigned team member on cancellation,
 * mirroring the portal route's existing behavior.
 */

const { notifyMock } = vi.hoisted(() => ({
  notifyMock: vi.fn(async (..._args: unknown[]) => ({ success: true })),
}))
vi.mock('@/lib/notify', () => ({ notify: notifyMock }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenantId: string
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: currentTenantId, role: 'owner' }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

import { supabaseAdmin } from '@/lib/supabase'
import { PATCH } from './route'

const TENANT_ID = 'tenant-cancel-notify'
const TECH_ID = 'tech-1'
const fake = supabaseAdmin as unknown as FakeSupabase

function paramsFor(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

function req(status: string): Request {
  return new Request('http://x', { method: 'PATCH', body: JSON.stringify({ status }) })
}

beforeEach(() => {
  fake._store.clear()
  notifyMock.mockClear()
  currentTenantId = TENANT_ID
})

describe('bookings/[id]/status PATCH — cancellation notifies the assigned tech', () => {
  it('SMS-notifies the assigned team member when a scheduled job is cancelled', async () => {
    fake._seed('bookings', [
      { id: 'bk-1', tenant_id: TENANT_ID, status: 'scheduled', team_member_id: TECH_ID, start_time: '2099-01-15T10:00:00Z' },
    ])
    const res = await PATCH(req('cancelled'), paramsFor('bk-1'))
    expect(res.status).toBe(200)
    expect(notifyMock).toHaveBeenCalledTimes(1)
    const call = notifyMock.mock.calls[0]?.[0] as Record<string, unknown>
    expect(call.tenantId).toBe(TENANT_ID)
    expect(call.type).toBe('booking_cancelled')
    expect(call.channel).toBe('sms')
    expect(call.recipientType).toBe('team_member')
    expect(call.recipientId).toBe(TECH_ID)
    expect(call.bookingId).toBe('bk-1')
  })

  it('does not notify when the booking has no assigned team member', async () => {
    fake._seed('bookings', [
      { id: 'bk-2', tenant_id: TENANT_ID, status: 'scheduled', team_member_id: null, start_time: '2099-01-15T10:00:00Z' },
    ])
    const res = await PATCH(req('cancelled'), paramsFor('bk-2'))
    expect(res.status).toBe(200)
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it('does not notify on non-cancellation transitions', async () => {
    fake._seed('bookings', [
      { id: 'bk-3', tenant_id: TENANT_ID, status: 'scheduled', team_member_id: TECH_ID, start_time: '2099-01-15T10:00:00Z' },
    ])
    const res = await PATCH(req('confirmed'), paramsFor('bk-3'))
    expect(res.status).toBe(200)
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it('does not fail the cancellation if notify() throws', async () => {
    notifyMock.mockRejectedValueOnce(new Error('boom'))
    fake._seed('bookings', [
      { id: 'bk-4', tenant_id: TENANT_ID, status: 'scheduled', team_member_id: TECH_ID, start_time: '2099-01-15T10:00:00Z' },
    ])
    const res = await PATCH(req('cancelled'), paramsFor('bk-4'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.booking.status).toBe('cancelled')
  })
})

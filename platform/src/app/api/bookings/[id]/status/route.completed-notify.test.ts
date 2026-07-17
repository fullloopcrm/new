import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * PATCH /api/bookings/[id]/status — `booking_completed` has been a declared
 * NotificationType since this codebase's beginning, with a real color-badge
 * entry on the admin's own /dashboard/notifications feed — but this route,
 * the only place a booking ever transitions to 'completed', never called
 * notify() for it. Same "declared type, real UI, never fired" shape as items
 * (63)/(66)/(67)'s quote-lifecycle gaps. This proves the fix: notify() fires
 * once, to the admin, the moment a job is marked completed.
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

const TENANT_ID = 'tenant-completed-notify'
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

describe('bookings/[id]/status PATCH — completion notifies the admin', () => {
  it('notifies the admin once when a job transitions to completed', async () => {
    fake._seed('bookings', [
      { id: 'bk-1', tenant_id: TENANT_ID, status: 'in_progress', team_member_id: TECH_ID, start_time: '2099-01-15T10:00:00Z' },
    ])
    const res = await PATCH(req('completed'), paramsFor('bk-1'))
    expect(res.status).toBe(200)
    expect(notifyMock).toHaveBeenCalledTimes(1)
    const call = notifyMock.mock.calls[0]?.[0] as Record<string, unknown>
    expect(call.tenantId).toBe(TENANT_ID)
    expect(call.type).toBe('booking_completed')
    expect(call.channel).toBe('email')
    expect(call.recipientType).toBe('admin')
    expect(call.bookingId).toBe('bk-1')
  })

  it('does not notify on non-completion transitions', async () => {
    fake._seed('bookings', [
      { id: 'bk-2', tenant_id: TENANT_ID, status: 'scheduled', team_member_id: TECH_ID, start_time: '2099-01-15T10:00:00Z' },
    ])
    const res = await PATCH(req('confirmed'), paramsFor('bk-2'))
    expect(res.status).toBe(200)
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it('does not fail the completion if notify() throws', async () => {
    notifyMock.mockRejectedValueOnce(new Error('boom'))
    fake._seed('bookings', [
      { id: 'bk-3', tenant_id: TENANT_ID, status: 'in_progress', team_member_id: TECH_ID, start_time: '2099-01-15T10:00:00Z' },
    ])
    const res = await PATCH(req('completed'), paramsFor('bk-3'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.booking.status).toBe('completed')
  })
})

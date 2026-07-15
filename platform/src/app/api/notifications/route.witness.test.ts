import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/notifications (type: '15min_warning') — cross-tenant booking_id
 * FK injection.
 *
 * `booking_id` is a caller-supplied FK into `bookings` with no cross-tenant
 * ownership check — the `notifications` insert stamped it verbatim before
 * this fix, and the (unscoped) `.single()` re-fetch used for the follow-up
 * client SMS would silently no-op on a foreign id rather than reject the
 * request. Same dangling-FK class as P7/P15/P19/P21/P23/P24 in
 * deploy-prep/cross-tenant-leak-register.md.
 *
 * FIX: booking_id, when supplied, is now verified tenant-owned (tenantDb
 * auto-scopes by tenant_id) before the notification row is ever inserted; a
 * miss 400s and no row is written.
 */

const TENANT_A = 'tid-a'
const TENANT_B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn(async () => ({ tenantId: TENANT_A })),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))
const notifyMock = vi.hoisted(() => vi.fn(async (_args: Record<string, unknown>) => ({ success: true })))
vi.mock('@/lib/notify', () => ({ notify: notifyMock }))
vi.mock('@/lib/csrf-guard', () => ({ isCrossSiteRequest: () => false }))

import { POST } from './route'

function seed() {
  return {
    bookings: [
      { id: 'bk-a', tenant_id: TENANT_A, client_id: 'cl-a', check_in_time: null, hourly_rate: 50 },
      { id: 'bk-b', tenant_id: TENANT_B, client_id: 'cl-b', check_in_time: null, hourly_rate: 75 },
    ],
    clients: [
      { id: 'cl-a', tenant_id: TENANT_A, name: 'Alice A', phone: '555-0001' },
      { id: 'cl-b', tenant_id: TENANT_B, name: 'Bob B', phone: '555-0002' },
    ],
    notifications: [] as Array<{ id: string; tenant_id: string; booking_id: string | null }>,
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  notifyMock.mockClear()
})

function req(body: Record<string, unknown>) {
  return new NextRequest('http://t/api/notifications', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/notifications (15min_warning) — booking_id FK-ownership guard', () => {
  it('rejects a foreign-tenant booking_id, writes no notification, sends no SMS', async () => {
    const res = await POST(req({ type: '15min_warning', booking_id: 'bk-b' }))
    expect(res.status).toBe(400)
    expect(h.seed.notifications.length).toBe(0)
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it('rejects a nonexistent booking_id', async () => {
    const res = await POST(req({ type: '15min_warning', booking_id: 'bk-nope' }))
    expect(res.status).toBe(400)
    expect(h.seed.notifications.length).toBe(0)
  })

  it('CONTROL: own-tenant booking_id creates the notification and sends the SMS', async () => {
    const res = await POST(req({ type: '15min_warning', booking_id: 'bk-a' }))
    expect(res.status).toBe(200)
    expect(h.seed.notifications.length).toBe(1)
    expect(h.seed.notifications[0].booking_id).toBe('bk-a')
    expect(notifyMock).toHaveBeenCalledTimes(1)
    expect(notifyMock.mock.calls[0][0]).toMatchObject({ recipientId: 'cl-a', tenantId: TENANT_A })
  })

  it('CONTROL: omitted booking_id still creates the in-app notification, no SMS', async () => {
    const res = await POST(req({ type: '15min_warning', message: 'heads up' }))
    expect(res.status).toBe(200)
    expect(h.seed.notifications.length).toBe(1)
    expect(h.seed.notifications[0].booking_id).toBeNull()
    expect(notifyMock).not.toHaveBeenCalled()
  })
})

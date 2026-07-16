import { describe, it, expect, vi } from 'vitest'

/**
 * PUT /api/portal/bookings/[id] fires a real SMS to the assigned team member
 * plus an admin email on every reschedule/cancel, with no other cap -- a
 * client looping this endpoint is unmetered SMS/email-cost-abuse. Now capped
 * at 10 requests / 10 minutes per client (same pattern as
 * team-portal/running-late).
 */

const { rateLimitAllowed, notifyMock } = vi.hoisted(() => ({
  rateLimitAllowed: { value: true },
  notifyMock: vi.fn(async () => {}),
}))

process.env.PORTAL_SECRET = 'unit-test-portal-secret'

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => ({ allowed: rateLimitAllowed.value, remaining: rateLimitAllowed.value ? 1 : 0 }),
}))

vi.mock('@/lib/notify', () => ({ notify: notifyMock }))

vi.mock('@/lib/tenant-db', () => ({
  tenantDb: (_tenantId: string) => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: async () => ({
              data: { start_time: '2026-08-01T10:00:00Z', end_time: '2026-08-01T12:00:00Z', team_member_id: null, clients: { name: 'Jane' } },
              error: null,
            }),
          }),
        }),
      }),
      update: () => ({
        eq: () => ({
          eq: () => ({
            select: () => ({
              single: async () => ({ data: { id: 'booking-1' }, error: null }),
            }),
          }),
        }),
      }),
    }),
  }),
}))

import { NextRequest } from 'next/server'
import { createToken } from '@/app/api/portal/auth/token'
import { PUT } from './route'

function makeRequest(body: Record<string, unknown>) {
  const token = createToken('client-1', 'tenant-1')
  return new NextRequest('https://x/api/portal/bookings/booking-1', {
    method: 'PUT',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PUT /api/portal/bookings/[id] — rate limit', () => {
  it('429s once the per-client rate limit is exhausted, without touching the booking', async () => {
    rateLimitAllowed.value = false
    const res = await PUT(makeRequest({ status: 'cancelled' }), { params: Promise.resolve({ id: 'booking-1' }) })
    expect(res.status).toBe(429)
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it('allows a normal request through', async () => {
    rateLimitAllowed.value = true
    const res = await PUT(makeRequest({ notes: 'Please use the back door' }), { params: Promise.resolve({ id: 'booking-1' }) })
    expect(res.status).toBe(200)
  })
})

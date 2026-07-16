import { describe, it, expect, vi } from 'vitest'

/**
 * W4 adversarial pass: PUT /api/portal/bookings/[id] previously let a client
 * cancel a booking regardless of its current status, so a booking already
 * marked completed/paid could be flipped straight to 'cancelled' with no
 * refund/payroll reconciliation -- this endpoint has no downstream
 * accounting effect of its own, unlike the staff-side
 * api/bookings/[id]/status route which enforces a VALID_TRANSITIONS state
 * machine that already blocks cancel from completed/paid.
 */

const { notifyMock } = vi.hoisted(() => ({ notifyMock: vi.fn(async () => {}) }))

process.env.PORTAL_SECRET = 'unit-test-portal-secret'

vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 1 }) }))
vi.mock('@/lib/notify', () => ({ notify: notifyMock }))

const bookingStatus: { value: string } = { value: 'completed' }
const updateCalled = { value: false }

vi.mock('@/lib/tenant-db', () => ({
  tenantDb: (_tenantId: string) => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: async () => ({
              data: { status: bookingStatus.value, start_time: '2026-08-01T10:00:00Z', end_time: '2026-08-01T12:00:00Z', team_member_id: null, clients: { name: 'Jane' } },
              error: null,
            }),
          }),
        }),
      }),
      update: () => {
        updateCalled.value = true
        return {
          eq: () => ({
            eq: () => ({
              select: () => ({
                single: async () => ({ data: { id: 'booking-1', status: 'cancelled' }, error: null }),
              }),
            }),
          }),
        }
      },
      insert: async () => ({ data: null, error: null }),
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

describe('PUT /api/portal/bookings/[id] — terminal-status cancel guard', () => {
  it.each(['completed', 'paid', 'cancelled', 'no_show'])(
    'rejects cancelling a %s booking without ever calling update',
    async (status) => {
      bookingStatus.value = status
      updateCalled.value = false
      const res = await PUT(makeRequest({ status: 'cancelled' }), { params: Promise.resolve({ id: 'booking-1' }) })
      expect(res.status).toBe(400)
      expect(updateCalled.value).toBe(false)
      expect(notifyMock).not.toHaveBeenCalled()
    }
  )

  it('allows cancelling a still-open booking', async () => {
    bookingStatus.value = 'scheduled'
    updateCalled.value = false
    const res = await PUT(makeRequest({ status: 'cancelled' }), { params: Promise.resolve({ id: 'booking-1' }) })
    expect(res.status).toBe(200)
    expect(updateCalled.value).toBe(true)
  })
})

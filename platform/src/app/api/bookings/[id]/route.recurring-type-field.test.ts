import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * REGRESSION — PUT /api/bookings/[id]'s pick() allowlist silently dropped
 * recurring_type (not in the list at all), so EditBookingForm.tsx converting
 * a one-time booking to recurring saved successfully with no error while
 * recurring_type never reached the database. Fixed by adding it to the
 * allowlist (route.ts:68). This locks that it stays in the list.
 */

const CTX_TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return { AuthError, getTenantForRequest: vi.fn() }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  })),
}))

vi.mock('@/lib/audit', () => ({ audit: async () => {} }))
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => {} }))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: () => '' }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => '', reschedule: () => '' }) }))
vi.mock('@/lib/availability', () => ({ checkMemberDayOff: async () => ({ unavailable: false }) }))

import { PUT } from './route'

function seed() {
  return {
    bookings: [
      { id: 'bk-a', tenant_id: CTX_TENANT, status: 'scheduled', client_id: null, team_member_id: null, service_type_id: null, start_time: '2026-09-01T09:00:00' },
    ],
    tenants: [{ id: CTX_TENANT, name: 'Alpha' }],
  }
}

function putReq(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}
function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('bookings/[id] PUT — recurring_type survives the field allowlist', () => {
  it('LOCK: recurring_type in the body reaches the bookings UPDATE', async () => {
    const res = await PUT(putReq({ recurring_type: 'Weekly', force: true }), ctx('bk-a'))
    expect(res.status).toBe(200)
    const upd = h.capture.updates.find((u) => u.table === 'bookings')
    expect(upd).toBeTruthy()
    expect(upd?.values).toHaveProperty('recurring_type', 'Weekly')
  })

  it('LOCK: recurring_type: null (turning repeat off) also reaches the UPDATE', async () => {
    const res = await PUT(putReq({ recurring_type: null, force: true }), ctx('bk-a'))
    expect(res.status).toBe(200)
    const upd = h.capture.updates.find((u) => u.table === 'bookings')
    expect(upd?.values).toHaveProperty('recurring_type', null)
  })
})

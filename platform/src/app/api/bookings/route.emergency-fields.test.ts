import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * POST /api/bookings — price/hourly_rate/service_type/is_emergency mutation
 * probe. This is the ONE booking-creation path BookingsAdmin.tsx's own
 * "Emergency / Same-Day" manual-create flow posts to (every other create
 * flow — client/book, portal/bookings, the 3 forked selena.ts assistants,
 * selena-legacy, selena/core — already sets is_emergency + the tenant's
 * configured emergency_rate). validate()'s schema here was a strict
 * allowlist that omitted all four fields, so an admin-created emergency
 * booking silently got price=0/hourly_rate=null/service_type=null/
 * is_emergency=null regardless of what the operator entered — and
 * checkout's `editingBooking.hourly_rate || 69` fallback then silently
 * charged the tenant's default rate instead of the emergency rate.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenantId: string
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: currentTenantId }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: currentTenantId }, error: null }),
}))
vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({
    require_team_member: false,
    auto_confirm_bookings: false,
    default_booking_status: 'scheduled',
    booking_buffer_minutes: 0,
  }),
}))
vi.mock('@/lib/availability', () => ({ checkMemberDayOff: async () => ({ unavailable: false }) }))
vi.mock('@/lib/day-availability', () => ({
  slotWithinHours: () => true,
  hoursWindowForDate: () => null,
}))
vi.mock('@/lib/cleaner-availability', () => ({ timestampToMin: () => 600 }))
vi.mock('@/lib/notify', () => ({ notify: async () => ({}) }))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => ({}) }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => 'sms' }) }))
vi.mock('@/lib/messaging/team-sms-resolver', () => ({ teamSmsTemplates: () => ({ jobAssignment: () => 'sms' }) }))
vi.mock('@/lib/client-properties', () => ({ applyPropertyToBookingClient: () => {} }))
vi.mock('@/lib/schedule/duration-class', () => ({ deriveDurationClass: () => null }))
vi.mock('@/lib/audit', () => ({ audit: async () => ({}) }))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const A_ID = 'tenant-A'
const CLIENT_A = '22222222-2222-2222-2222-222222222222'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  currentTenantId = A_ID
  fake._seed('tenants', [{ id: A_ID, name: 'A Co' }])
  fake._seed('clients', [{ id: CLIENT_A, tenant_id: A_ID, name: 'Client A' }])
})

describe('POST /api/bookings — emergency-booking fields persist', () => {
  it('an emergency create with price/hourly_rate/service_type/is_emergency in the body actually saves all four, not just the FK/date fields', async () => {
    const req = new Request('http://x/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        client_id: CLIENT_A,
        start_time: '2026-08-10T10:00:00.000Z',
        service_type: 'Emergency / Same-Day',
        price: 20000,
        hourly_rate: 100,
        is_emergency: true,
        status: 'available',
        force: true,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.booking.price).toBe(20000)
    expect(body.booking.hourly_rate).toBe(100)
    expect(body.booking.service_type).toBe('Emergency / Same-Day')
    expect(body.booking.is_emergency).toBe(true)
  })

  it("an emergency create's per-job pay_rate persists (validate()'s allowlist had no pay-rate field at all, under any name, until now)", async () => {
    const req = new Request('http://x/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        client_id: CLIENT_A,
        start_time: '2026-08-12T10:00:00.000Z',
        pay_rate: 45,
        force: true,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.booking.pay_rate).toBe(45)
  })

  it('a normal (non-emergency) create omitting these fields still works — no regression, price/hourly_rate default to whatever the DB/insert leaves them', async () => {
    const req = new Request('http://x/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        client_id: CLIENT_A,
        start_time: '2026-08-11T10:00:00.000Z',
        force: true,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.booking.is_emergency).toBeFalsy()
  })
})

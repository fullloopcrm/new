import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Same billing-gap archetype as P11.8 (POST /api/client/book) and P11.16/17
 * (AI/SMS create_booking, 4 forked assistants): POST /api/portal/bookings —
 * the logged-in client portal's self-book route — had ZERO same-day pricing
 * logic. A same-day booking here was always billed the flat service_types
 * rate and never flagged is_emergency, regardless of the tenant's configured
 * selena_config.emergency_rate. This proves the fix.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentAuth: { id: string; tid: string } | null
vi.mock('../auth/token', () => ({
  verifyPortalToken: (_token: string) => currentAuth,
}))

vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({ allow_same_day: true, min_days_ahead: 0 }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const TENANT_ID = 'tenant-emergency'
const CLIENT_ID = 'client-emergency'
const SVC_ID = 'svc-emergency'
const fake = supabaseAdmin as unknown as FakeSupabase

function req(body: unknown): Request {
  return new Request('http://x/api/portal/bookings', {
    method: 'POST',
    headers: { authorization: 'Bearer whatever' },
    body: JSON.stringify(body),
  })
}

function todayStr(): string {
  return new Date().toLocaleDateString('en-CA')
}

beforeEach(() => {
  fake._store.clear()
  currentAuth = { id: CLIENT_ID, tid: TENANT_ID }
  fake._seed('service_types', [{ id: SVC_ID, tenant_id: TENANT_ID, name: 'Standard Cleaning', default_duration_hours: 2, default_hourly_rate: 75 }])
})

describe('portal self-book — a same-day booking applies the configured emergency_rate', () => {
  it('bills at emergency_rate and flags is_emergency, overriding the configured service rate', async () => {
    fake._seed('tenants', [{ id: TENANT_ID, selena_config: { emergency_available: true, emergency_rate: 130 } }])
    const res = await POST(req({ start_time: `${todayStr()}T10:00:00`, service_type_id: SVC_ID }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.booking.hourly_rate).toBe(130)
    expect(body.booking.price).toBe(130 * 2 * 100)
    expect(body.booking.is_emergency).toBe(true)
  })

  it('a same-day booking with no emergency_rate configured is still flagged is_emergency but keeps the normal rate', async () => {
    fake._seed('tenants', [{ id: TENANT_ID, selena_config: null }])
    const res = await POST(req({ start_time: `${todayStr()}T10:00:00`, service_type_id: SVC_ID }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.booking.hourly_rate).toBe(75)
    expect(body.booking.price).toBe(75 * 2 * 100)
    expect(body.booking.is_emergency).toBe(true)
  })

  it('a future-dated booking is not flagged emergency even with emergency_rate configured', async () => {
    fake._seed('tenants', [{ id: TENANT_ID, selena_config: { emergency_available: true, emergency_rate: 130 } }])
    const res = await POST(req({ start_time: '2099-01-15T10:00:00', service_type_id: SVC_ID }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.booking.hourly_rate).toBe(75)
    expect(body.booking.price).toBe(75 * 2 * 100)
    expect(body.booking.is_emergency).toBe(false)
  })

  // "Today" must be computed in the TENANT's own timezone, not the server
  // runtime's default (UTC on Vercel). A Pacific tenant's local evening
  // rolls into the next UTC calendar day hours before local midnight — the
  // old getFullYear/getMonth/getDate()-based day-boundary comparison used
  // the server's UTC day for both "now" and the requested start, so a
  // tomorrow-morning booking made on a Pacific evening was incorrectly
  // flagged same-day/emergency (both sides had already rolled to the same
  // UTC date even though they're different Pacific calendar days).
  describe('day-boundary is computed in the tenant timezone, not the server default', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('a Pacific tenant booking tomorrow morning is NOT flagged emergency, even though UTC has already rolled to that calendar date', async () => {
      // 7:30pm PDT on July 17 = 2026-07-18T02:30:00Z -- UTC day is already July 18.
      vi.setSystemTime(new Date('2026-07-18T02:30:00.000Z'))
      fake._seed('tenants', [{ id: TENANT_ID, timezone: 'America/Los_Angeles', selena_config: { emergency_available: true, emergency_rate: 130 } }])
      // 8am PDT July 18 -- genuinely "tomorrow" for a Pacific customer.
      const res = await POST(req({ start_time: '2026-07-18T08:00:00-07:00', service_type_id: SVC_ID }))
      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.booking.is_emergency).toBe(false)
      expect(body.booking.hourly_rate).toBe(75)
    })

    it('a Pacific tenant booking later the same evening IS still flagged emergency at that same real moment', async () => {
      vi.setSystemTime(new Date('2026-07-18T02:30:00.000Z'))
      fake._seed('tenants', [{ id: TENANT_ID, timezone: 'America/Los_Angeles', selena_config: { emergency_available: true, emergency_rate: 130 } }])
      // 9pm PDT July 17 -- later the same Pacific calendar day as "now".
      const res = await POST(req({ start_time: '2026-07-17T21:00:00-07:00', service_type_id: SVC_ID }))
      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.booking.is_emergency).toBe(true)
      expect(body.booking.hourly_rate).toBe(130)
    })
  })
})

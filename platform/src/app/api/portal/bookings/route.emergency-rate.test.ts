import { describe, it, expect, beforeEach, vi } from 'vitest'
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
})

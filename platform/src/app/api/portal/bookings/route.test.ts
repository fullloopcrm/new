import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET/POST /api/portal/bookings — first route-level regression test (P1/W1
 * O13 sweep). Customer-portal self-service booking, gated by a bearer
 * portal token (not admin auth) — zero prior coverage of the token gate, the
 * allow_same_day/min_days_ahead scheduling-rule enforcement, the tenant-
 * scoped service_type_id lookup (a client can't post another tenant's
 * service id), or the recurring-discount pricing. `applyRecurringDiscount`
 * runs for real (pure/cheap); `verifyPortalToken`/`getSettings` are mocked.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  verifyPortalToken: vi.fn(),
  getSettings: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  verifyPortalToken: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  getSettings: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('../auth/token', () => ({ verifyPortalToken: (...a: unknown[]) => h.verifyPortalToken(...a) }))
vi.mock('@/lib/settings', () => ({ getSettings: (...a: unknown[]) => h.getSettings(...a) }))

import { GET, POST } from './route'

const AUTH = { id: 'client-A1', tid: 'tenant-A' }

const getReq = (token?: string) =>
  new NextRequest('http://x/api/test', { headers: token ? { authorization: `Bearer ${token}` } : {} })
const postReq = (body: unknown, token = 'valid-token') =>
  new Request('http://x', { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: JSON.stringify(body) })

// A far-future date so allow_same_day/min_days_ahead defaults never interfere
// with tests that aren't specifically about those rules.
const FUTURE_DATE = '2099-06-15T09:00:00'

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.verifyPortalToken.mockReset()
  h.verifyPortalToken.mockImplementation((...args: unknown[]) => (args[0] === 'valid-token' ? AUTH : null))
  h.getSettings.mockReset()
  h.getSettings.mockResolvedValue({ allow_same_day: true, min_days_ahead: 0 })
  h.store = {
    bookings: [
      { id: 'book-A1', tenant_id: 'tenant-A', client_id: 'client-A1', start_time: '2026-07-01T09:00:00', status: 'scheduled' },
      { id: 'book-A2-other-client', tenant_id: 'tenant-A', client_id: 'client-A2', start_time: '2026-07-02T09:00:00', status: 'scheduled' },
      { id: 'book-B1', tenant_id: 'tenant-B', client_id: 'client-A1', start_time: '2026-07-01T09:00:00', status: 'scheduled' },
    ],
    service_types: [
      { id: 'svc-A1', tenant_id: 'tenant-A', name: 'Deep Clean', default_duration_hours: 3, default_hourly_rate: 50 },
      { id: 'svc-B1', tenant_id: 'tenant-B', name: 'Other Tenant Service', default_duration_hours: 2, default_hourly_rate: 40 },
    ],
  }
})

describe('GET /api/portal/bookings — token gate', () => {
  it('returns 401 when no bearer token is supplied', async () => {
    const res = await GET(getReq())

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: 'Unauthorized' })
  })

  it('returns 401 for an invalid/unverifiable token', async () => {
    const res = await GET(getReq('garbage'))

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: 'Invalid token' })
  })
})

describe('GET /api/portal/bookings — scoping', () => {
  it("returns only the authenticated client's own bookings within their tenant", async () => {
    const res = await GET(getReq('valid-token'))
    const json = await res.json()

    const ids = json.bookings.map((b: { id: string }) => b.id)
    expect(ids).toEqual(['book-A1'])
    expect(ids).not.toContain('book-A2-other-client')
    expect(ids).not.toContain('book-B1')
  })
})

describe('POST /api/portal/bookings — token gate', () => {
  it('returns 401 when no bearer token is supplied', async () => {
    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ start_time: FUTURE_DATE }) }))

    expect(res.status).toBe(401)
  })

  it('returns 401 for an invalid token', async () => {
    const res = await POST(postReq({ start_time: FUTURE_DATE }, 'garbage'))

    expect(res.status).toBe(401)
  })
})

describe('POST /api/portal/bookings — start_time + scheduling-rule validation', () => {
  it('rejects a missing/unparseable start_time with 400', async () => {
    const res = await POST(postReq({ start_time: 'not-a-date' }))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'Invalid start_time' })
  })

  it('rejects booking in the past', async () => {
    const res = await POST(postReq({ start_time: '2020-01-01T09:00:00' }))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'Cannot book in the past' })
  })

  it('rejects a same-day booking when allow_same_day is false', async () => {
    h.getSettings.mockResolvedValue({ allow_same_day: false, min_days_ahead: 0 })
    // Local-date components, matching how the route itself computes "today"
    // (new Date().getFullYear/getMonth/getDate, not toISOString which is UTC
    // and drifts a day off local "today" near midnight UTC).
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    const res = await POST(postReq({ start_time: `${today}T09:00:00` }))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'Same-day bookings are not accepted. Please choose a future date.' })
  })

  it('rejects a booking that does not meet min_days_ahead notice', async () => {
    h.getSettings.mockResolvedValue({ allow_same_day: true, min_days_ahead: 5 })
    const soon = new Date()
    soon.setDate(soon.getDate() + 2)
    const soonDate = soon.toISOString().split('T')[0]

    const res = await POST(postReq({ start_time: `${soonDate}T09:00:00` }))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toContain('at least 5 days notice')
  })
})

describe('POST /api/portal/bookings — service_type_id tenant scoping', () => {
  it("rejects a service_type_id belonging to another tenant as 'Invalid service'", async () => {
    const res = await POST(postReq({ start_time: FUTURE_DATE, service_type_id: 'svc-B1' }))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'Invalid service' })
  })

  it('resolves a valid own-tenant service_type_id to its name and computed price', async () => {
    const res = await POST(postReq({ start_time: FUTURE_DATE, service_type_id: 'svc-A1' }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.booking.service_type).toBe('Deep Clean')
    expect(json.booking.price).toBe(50 * 3 * 100)
  })
})

describe('POST /api/portal/bookings — recurring discount', () => {
  it('applies a 20% discount for weekly recurring bookings', async () => {
    const res = await POST(postReq({ start_time: FUTURE_DATE, service_type_id: 'svc-A1', recurring_type: 'weekly' }))
    const json = await res.json()

    const basePrice = 50 * 3 * 100
    expect(json.booking.price).toBe(Math.round(basePrice * 0.8))
  })

  it('applies a 10% discount for monthly recurring bookings', async () => {
    const res = await POST(postReq({ start_time: FUTURE_DATE, service_type_id: 'svc-A1', recurring_type: 'monthly' }))
    const json = await res.json()

    const basePrice = 50 * 3 * 100
    expect(json.booking.price).toBe(Math.round(basePrice * 0.9))
  })

  it('normalizes the bare "monthly" cadence to monthly_date before storing -- RecurringType (lib/recurring.ts) has no bare "monthly" member, so an unnormalized value would render as unformatted raw text ("Schedule: monthly") instead of a label ("Schedule: Monthly")', async () => {
    const res = await POST(postReq({ start_time: FUTURE_DATE, service_type_id: 'svc-A1', recurring_type: 'monthly' }))
    const json = await res.json()

    expect(json.booking.recurring_type).toBe('monthly_date')
  })

  it('applies no discount when recurring_type is "none"', async () => {
    const res = await POST(postReq({ start_time: FUTURE_DATE, service_type_id: 'svc-A1', recurring_type: 'none' }))
    const json = await res.json()

    expect(json.booking.price).toBe(50 * 3 * 100)
    expect(json.booking.recurring_type).toBeNull()
  })
})

describe('POST /api/portal/bookings — creation', () => {
  it('creates a pending booking scoped to the authenticated client and tenant', async () => {
    const res = await POST(postReq({ start_time: FUTURE_DATE, notes: 'ring bell', special_instructions: 'gate code 1234' }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.booking.status).toBe('pending')
    expect(json.booking.client_id).toBe('client-A1')
    expect(json.booking.tenant_id).toBe('tenant-A')
    expect(json.booking.notes).toBe('ring bell')
    expect(json.booking.special_instructions).toBe('gate code 1234')
    expect(json.booking.price).toBeNull()
  })
})

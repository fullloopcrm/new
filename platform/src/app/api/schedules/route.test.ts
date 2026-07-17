import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET/POST /api/schedules — first route-level regression test (P1/W1 O13
 * sweep). Distinct from admin/recurring-schedules (different route tree,
 * same underlying tables — both now gated via requirePermission after the
 * P1/W1 broad-hunt found this tree was only checking session auth, not the
 * schedules.view/schedules.create RBAC permission). Zero prior coverage of
 * schedule creation + the first-4-weeks booking generation, the
 * tenant-scoped service_type_id lookup, or tenant isolation on the list.
 * `generateRecurringDates` is mocked to return controlled dates — its own
 * recurrence-math has separate unit tests; this file verifies the ROUTE
 * turns those dates into booking rows correctly.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  getTenantForRequest: vi.fn(),
  audit: vi.fn(),
  generateRecurringDates: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  getTenantForRequest: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  audit: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  generateRecurringDates: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

const CLIENT_ID = '11111111-1111-1111-1111-111111111111'
const SERVICE_TYPE_ID = '22222222-2222-2222-2222-222222222222'

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: (...a: unknown[]) => h.getTenantForRequest(...a),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))
vi.mock('@/lib/audit', () => ({ audit: (...a: unknown[]) => h.audit(...a) }))
vi.mock('@/lib/recurring', async () => {
  const actual = await vi.importActual<typeof import('@/lib/recurring')>('@/lib/recurring')
  return { ...actual, generateRecurringDates: (...a: unknown[]) => h.generateRecurringDates(...a) }
})

import { GET, POST } from './route'
import { AuthError } from '@/lib/tenant-query'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.getTenantForRequest.mockReset()
  h.getTenantForRequest.mockImplementation(async () => ({ tenantId: h.tenantId, role: 'owner' }))
  h.audit.mockReset()
  h.audit.mockResolvedValue(undefined)
  h.generateRecurringDates.mockReset()
  h.generateRecurringDates.mockReturnValue([new Date('2026-08-01T09:00:00'), new Date('2026-08-08T09:00:00')])
  h.store = {
    recurring_schedules: [
      { id: 'sched-A1', tenant_id: 'tenant-A', client_id: CLIENT_ID, recurring_type: 'weekly', status: 'active' },
      { id: 'sched-B1', tenant_id: 'tenant-B', client_id: 'client-B1', recurring_type: 'weekly', status: 'active' },
    ],
    service_types: [{ id: SERVICE_TYPE_ID, tenant_id: 'tenant-A', name: 'Deep Clean' }],
    bookings: [],
  }
})

describe('GET /api/schedules', () => {
  it('propagates an AuthError from getTenantForRequest unchanged', async () => {
    h.getTenantForRequest.mockRejectedValueOnce(new AuthError('Unauthorized', 401))

    const res = await GET()

    expect(res.status).toBe(401)
  })

  it("only ever returns the caller tenant's own schedules", async () => {
    const res = await GET()
    const json = await res.json()

    const ids = json.schedules.map((s: { id: string }) => s.id)
    expect(ids).toContain('sched-A1')
    expect(ids).not.toContain('sched-B1')
  })
})

describe('POST /api/schedules — validation', () => {
  it('rejects a missing client_id with 400', async () => {
    const res = await POST(postReq({ recurring_type: 'weekly' }))

    expect(res.status).toBe(400)
  })

  it('rejects a missing recurring_type with 400', async () => {
    const res = await POST(postReq({ client_id: CLIENT_ID }))

    expect(res.status).toBe(400)
  })

  // recurring_type only had a bare string/max-50 check here -- an invalid
  // value (e.g. 'monthly', which isn't in RecurringType) would insert a
  // schedule that generateRecurringDates' switch (no default case) silently
  // treats as zero dates forever, both here and on every future cron refill.
  it('rejects a recurring_type that is not a valid RecurringType with 400, and creates no schedule', async () => {
    const before = h.store.recurring_schedules.length
    const res = await POST(postReq({ client_id: CLIENT_ID, recurring_type: 'monthly' }))

    expect(res.status).toBe(400)
    expect(h.store.recurring_schedules).toHaveLength(before)
  })
})

describe('POST /api/schedules — creation + booking generation', () => {
  it('creates an active schedule and generates one booking per date returned by generateRecurringDates', async () => {
    const res = await POST(postReq({ client_id: CLIENT_ID, recurring_type: 'weekly', duration_hours: 2 }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.schedule.status).toBe('active')
    expect(json.schedule.tenant_id).toBe('tenant-A')
    expect(json.bookingsCreated).toBe(2)

    const created = h.store.bookings.filter((b) => b.schedule_id === json.schedule.id)
    expect(created).toHaveLength(2)
    expect(created.every((b) => b.tenant_id === 'tenant-A')).toBe(true)
    expect(created.every((b) => b.status === 'scheduled')).toBe(true)
    expect(created[0].start_time).toBe(new Date('2026-08-01T09:00:00').toISOString())
    const startMs = new Date(created[0].start_time as string).getTime()
    const endMs = new Date(created[0].end_time as string).getTime()
    expect(endMs - startMs).toBe(2 * 3600_000)
  })

  it('creates the schedule but inserts zero bookings when there are no generated dates', async () => {
    h.generateRecurringDates.mockReturnValue([])

    const res = await POST(postReq({ client_id: CLIENT_ID, recurring_type: 'weekly' }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.bookingsCreated).toBe(0)
    expect(h.store.bookings.length).toBe(0)
  })

  it("resolves service_type_id to a tenant-scoped name on every generated booking, never another tenant's service", async () => {
    const res = await POST(postReq({ client_id: CLIENT_ID, recurring_type: 'weekly', service_type_id: SERVICE_TYPE_ID }))
    const json = await res.json()

    expect(res.status).toBe(201)
    const created = h.store.bookings.filter((b) => b.schedule_id === json.schedule.id)
    expect(created.every((b) => b.service_type === 'Deep Clean')).toBe(true)
  })

  it('logs a schedule.created audit event with the recurring_type and booking count', async () => {
    const res = await POST(postReq({ client_id: CLIENT_ID, recurring_type: 'weekly' }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(h.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-A',
        action: 'schedule.created',
        entityId: json.schedule.id,
        details: { recurring_type: 'weekly', bookingsCreated: 2 },
      })
    )
  })
})

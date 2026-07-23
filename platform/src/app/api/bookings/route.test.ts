import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET/POST /api/bookings — first route-level regression test (P1/W1 O13
 * sweep). The main booking-creation path with the most guard rails in the
 * codebase (day-off, scheduling conflict + buffer, working-hours,
 * max-jobs-per-day) had zero coverage. Every DB-touching helper (settings,
 * day-off/hours/conflict checks, audit, notify/SMS) is mocked so this file
 * tests the ROUTE's own orchestration/branching — which guard fires when,
 * in what order, and that a rejected guard never reaches the insert — not
 * each helper's internal logic (those have their own unit tests).
 * `validate()` and `timestampToMin()` are simple/pure and run for real.
 */

const CLIENT_ID = '11111111-1111-1111-1111-111111111111'
const TEAM_MEMBER_ID = '22222222-2222-2222-2222-222222222222'
const SERVICE_TYPE_ID = '33333333-3333-3333-3333-333333333333'
// Belong to tenant-B — used to prove the FK-ownership check, not just the
// validate() uuid-FORMAT check (a malformed id like 'client-B1' would get
// rejected by validate() regardless of the ownership fix, a false-positive).
const OTHER_TENANT_CLIENT_ID = '44444444-4444-4444-4444-444444444444'
const OTHER_TENANT_TEAM_MEMBER_ID = '55555555-5555-5555-5555-555555555555'
const OTHER_TENANT_SERVICE_TYPE_ID = '66666666-6666-6666-6666-666666666666'
const OTHER_TENANT_PROPERTY_ID = '77777777-7777-7777-7777-777777777777'

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  getTenantForRequest: vi.fn(),
  requirePermission: vi.fn(),
  getSettings: vi.fn(),
  checkMemberDayOff: vi.fn(),
  slotWithinHours: vi.fn(),
  hoursWindowForDate: vi.fn(),
  notify: vi.fn(),
  sendSMS: vi.fn(),
  audit: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  getTenantForRequest: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  requirePermission: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  getSettings: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  checkMemberDayOff: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  slotWithinHours: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  hoursWindowForDate: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  notify: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  sendSMS: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  audit: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const raw = makeTenantDbFake(h)
  const fake = {
    from(table: string) {
      const chain = raw.from(table) as Record<string, unknown>
      if (table !== 'bookings') return chain
      // The shared fake's `.not()` only implements the (col, 'is', null) shape —
      // this route's day-off/conflict/max-jobs guards all use
      // `.not('status', 'in', '("cancelled","no_show")')`, which the fake would
      // otherwise silently no-op (matching every row regardless of status).
      // Recompute directly against the store once a not-in filter is seen, using
      // the same filter set the route actually chains (eq/gt/lt/gte/lte).
      const filters: {
        eqs: Record<string, unknown>
        gts: Array<{ col: string; val: unknown }>
        lts: Array<{ col: string; val: unknown }>
        gtes: Array<{ col: string; val: unknown }>
        ltes: Array<{ col: string; val: unknown }>
        notIn: { col: string; vals: string[] } | null
      } = { eqs: {}, gts: [], lts: [], gtes: [], ltes: [], notIn: null }
      const wrap = (name: string) => {
        const orig = chain[name] as (...a: unknown[]) => unknown
        chain[name] = (...args: unknown[]) => {
          if (name === 'eq') filters.eqs[args[0] as string] = args[1]
          if (name === 'gt') filters.gts.push({ col: args[0] as string, val: args[1] })
          if (name === 'lt') filters.lts.push({ col: args[0] as string, val: args[1] })
          if (name === 'gte') filters.gtes.push({ col: args[0] as string, val: args[1] })
          if (name === 'lte') filters.ltes.push({ col: args[0] as string, val: args[1] })
          return orig(...args)
        }
      }
      ;['eq', 'gt', 'lt', 'gte', 'lte'].forEach(wrap)
      // The shared fake has no `.range()` at all (GET's pagination call) — a
      // no-op pass-through is enough since the fake never paginates anyway.
      chain.range = () => chain
      const origNot = chain.not as (col: string, op: string, val: unknown) => unknown
      chain.not = (col: string, op: string, val: unknown) => {
        if (op === 'in' && typeof val === 'string') {
          filters.notIn = { col, vals: val.replace(/^\(|\)$/g, '').split(',').map((s) => s.trim().replace(/^"|"$/g, '')) }
        }
        return origNot(col, op, val)
      }
      const origThen = chain.then as (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => unknown
      chain.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
        if (!filters.notIn) return origThen(res, rej)
        const nf = filters.notIn
        const rows = (h.store.bookings || []).filter((r) => {
          for (const [col, val] of Object.entries(filters.eqs)) if (r[col] !== val) return false
          for (const f of filters.gts) if (!(String(r[f.col]) > String(f.val))) return false
          for (const f of filters.lts) if (!(String(r[f.col]) < String(f.val))) return false
          for (const f of filters.gtes) if (!(String(r[f.col]) >= String(f.val))) return false
          for (const f of filters.ltes) if (!(String(r[f.col]) <= String(f.val))) return false
          if (nf.vals.includes(r[nf.col] as string)) return false
          return true
        })
        return Promise.resolve({ data: rows, count: rows.length, error: null }).then(res, rej)
      }
      return chain
    },
    // Booking creation now runs atomically inside a single Postgres RPC
    // (create_admin_booking_atomic — see migrations/2026_07_13_admin_booking_atomic.sql):
    // the conflict-window and daily-cap CHECKS themselves moved server-side
    // (closing a TOCTOU race — see the route's own comment above the call),
    // even though the JS layer still precomputes the window/cap inputs. The
    // fake has to reproduce that check here, not just perform the insert.
    rpc: async (fnName: string, params: Record<string, unknown>) => {
      if (fnName !== 'create_admin_booking_atomic') {
        return { data: null, error: { message: `unmocked rpc ${fnName}` } }
      }
      const bookings = h.store.bookings || (h.store.bookings = [])
      const isActive = (b: Record<string, unknown>) => b.status !== 'cancelled' && b.status !== 'no_show'
      if (params.p_team_member_id && params.p_conflict_start && params.p_conflict_end) {
        const conflicts = bookings.filter((b) =>
          b.tenant_id === params.p_tenant_id &&
          b.team_member_id === params.p_team_member_id &&
          isActive(b) &&
          String(b.start_time) < String(params.p_conflict_end) &&
          String(b.end_time) > String(params.p_conflict_start)
        )
        if (conflicts.length > 0) {
          return {
            data: {
              created: false,
              reason: 'conflict',
              conflicts: conflicts.map((c) => ({ id: c.id, start: c.start_time, end: c.end_time })),
            },
            error: null,
          }
        }
      }
      if (params.p_team_member_id && params.p_max_jobs_per_day && params.p_day_start && params.p_day_end) {
        const count = bookings.filter((b) =>
          b.tenant_id === params.p_tenant_id &&
          b.team_member_id === params.p_team_member_id &&
          isActive(b) &&
          String(b.start_time) >= String(params.p_day_start) &&
          String(b.start_time) <= String(params.p_day_end)
        ).length
        if (count >= Number(params.p_max_jobs_per_day)) {
          return { data: { created: false, reason: 'max_jobs' }, error: null }
        }
      }
      const row = {
        id: `bk-new-${++h.seq}`,
        tenant_id: params.p_tenant_id,
        client_id: params.p_client_id,
        property_id: params.p_property_id,
        team_member_id: params.p_team_member_id,
        service_type_id: params.p_service_type_id,
        service_type: params.p_service_type,
        start_time: params.p_start_time,
        end_time: params.p_end_time,
        notes: params.p_notes,
        special_instructions: params.p_special_instructions,
        status: params.p_status,
      }
      bookings.push(row)
      return { data: { created: true, booking: { id: row.id } }, error: null }
    },
  }
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
vi.mock('@/lib/require-permission', () => ({
  requirePermission: (...a: unknown[]) => h.requirePermission(...a),
}))
vi.mock('@/lib/settings', () => ({ getSettings: (...a: unknown[]) => h.getSettings(...a) }))
vi.mock('@/lib/availability', () => ({ checkMemberDayOff: (...a: unknown[]) => h.checkMemberDayOff(...a) }))
vi.mock('@/lib/day-availability', () => ({
  slotWithinHours: (...a: unknown[]) => h.slotWithinHours(...a),
  hoursWindowForDate: (...a: unknown[]) => h.hoursWindowForDate(...a),
}))
vi.mock('@/lib/notify', () => ({ notify: (...a: unknown[]) => h.notify(...a) }))
vi.mock('@/lib/sms', () => ({ sendSMS: (...a: unknown[]) => h.sendSMS(...a) }))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: () => 'sms body' }))
vi.mock('@/lib/messaging/client-sms', () => ({
  clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => 'confirmation sms' }),
}))
vi.mock('@/lib/audit', () => ({ audit: (...a: unknown[]) => h.audit(...a) }))

import { GET, POST } from './route'

const getReq = (qs = '') => new NextRequest(`http://x/api/test${qs}`)
const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

const validCreateBody = {
  client_id: CLIENT_ID,
  team_member_id: TEAM_MEMBER_ID,
  start_time: '2026-08-15T09:00:00',
  end_time: '2026-08-15T11:00:00',
}

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.getTenantForRequest.mockReset()
  h.getTenantForRequest.mockImplementation(async () => ({ tenantId: h.tenantId, tenant: { slug: h.tenantId } }))
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: h.tenantId }, error: null }))
  h.getSettings.mockReset()
  h.getSettings.mockResolvedValue({ booking_buffer_minutes: 0 })
  h.checkMemberDayOff.mockReset()
  h.checkMemberDayOff.mockResolvedValue({ unavailable: false })
  h.slotWithinHours.mockReset()
  h.slotWithinHours.mockReturnValue(true)
  h.hoursWindowForDate.mockReset()
  h.hoursWindowForDate.mockReturnValue(null)
  h.notify.mockReset()
  h.notify.mockResolvedValue({ success: true })
  h.sendSMS.mockReset()
  h.sendSMS.mockResolvedValue({ ok: true })
  h.audit.mockReset()
  h.audit.mockResolvedValue(undefined)
  h.store = {
    bookings: [
      { id: 'book-A1', tenant_id: 'tenant-A', client_id: CLIENT_ID, team_member_id: TEAM_MEMBER_ID, status: 'scheduled', start_time: '2026-08-01T09:00:00', end_time: '2026-08-01T11:00:00' },
      { id: 'book-B1', tenant_id: 'tenant-B', client_id: 'client-B1', team_member_id: 'tm-B1', status: 'scheduled', start_time: '2026-08-01T09:00:00', end_time: '2026-08-01T11:00:00' },
    ],
    team_members: [
      { id: TEAM_MEMBER_ID, tenant_id: 'tenant-A', name: 'Carl', schedule: null, max_jobs_per_day: null },
    ],
    service_types: [{ id: SERVICE_TYPE_ID, tenant_id: 'tenant-A', name: 'Deep Clean' }],
    clients: [{ id: CLIENT_ID, tenant_id: 'tenant-A', name: 'Pat' }],
    tenants: [{ id: 'tenant-A', name: 'Acme Cleaning', telnyx_api_key: null, telnyx_phone: null }],
  }
})

describe('GET /api/bookings — permission + tenant isolation', () => {
  it('propagates an AuthError from getTenantForRequest unchanged', async () => {
    const { AuthError } = await import('@/lib/tenant-query')
    h.getTenantForRequest.mockRejectedValueOnce(new AuthError('Unauthorized', 401))

    const res = await GET(getReq())

    expect(res.status).toBe(401)
  })

  it("only ever returns the caller tenant's own bookings", async () => {
    const res = await GET(getReq())
    const json = await res.json()

    const ids = json.bookings.map((b: { id: string }) => b.id)
    expect(ids).toContain('book-A1')
    expect(ids).not.toContain('book-B1')
    expect(json.total).toBe(1)
  })

  it('filters by status/client_id/team_member_id/date range query params', async () => {
    h.store.bookings.push({ id: 'book-A2', tenant_id: 'tenant-A', client_id: CLIENT_ID, team_member_id: TEAM_MEMBER_ID, status: 'cancelled', start_time: '2026-08-02T09:00:00', end_time: '2026-08-02T11:00:00' })

    const res = await GET(getReq('?status=scheduled'))
    const json = await res.json()

    expect(json.bookings.map((b: { id: string }) => b.id)).toEqual(['book-A1'])
  })
})

describe('POST /api/bookings — permission gate + validation', () => {
  it('returns the permission error unchanged and never creates a booking', async () => {
    h.requirePermission.mockResolvedValueOnce({
      tenant: null,
      error: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
    })

    const res = await POST(postReq(validCreateBody))

    expect(res.status).toBe(403)
    expect(h.store.bookings.length).toBe(2)
  })

  it('rejects a missing client_id with 400', async () => {
    const res = await POST(postReq({ start_time: '2026-08-15T09:00:00' }))

    expect(res.status).toBe(400)
  })

  it('rejects a missing start_time with 400', async () => {
    const res = await POST(postReq({ client_id: CLIENT_ID }))

    expect(res.status).toBe(400)
  })

  it('rejects booking creation without a team member when require_team_member is set', async () => {
    h.getSettings.mockResolvedValue({ require_team_member: true, booking_buffer_minutes: 0 })

    const res = await POST(postReq({ client_id: CLIENT_ID, start_time: '2026-08-15T09:00:00' }))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toContain('team member must be assigned')
  })
})

describe('POST /api/bookings — day-off / conflict / hours / max-jobs guards', () => {
  it('rejects when the team member has the day off, and never inserts', async () => {
    h.checkMemberDayOff.mockResolvedValue({ unavailable: true, reason: 'Carl has requested 2026-08-15 off.' })

    const res = await POST(postReq(validCreateBody))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.unavailable).toBe(true)
    expect(h.store.bookings.length).toBe(2)
  })

  it('skips the day-off check when force is true', async () => {
    const res = await POST(postReq({ ...validCreateBody, force: true }))

    expect(res.status).toBe(201)
    expect(h.checkMemberDayOff).not.toHaveBeenCalled()
  })

  it('rejects a scheduling conflict with an overlapping booking for the same team member', async () => {
    h.store.bookings.push({
      id: 'book-conflict', tenant_id: 'tenant-A', client_id: CLIENT_ID, team_member_id: TEAM_MEMBER_ID,
      status: 'scheduled',
      // The route compares against Date-converted (timezone-dependent) ISO
      // strings (new Date(startTime).toISOString()), not the naive input string
      // — so a conflicting fixture has to go through the same conversion to
      // compare correctly regardless of the test runner's local timezone.
      start_time: new Date('2026-08-15T10:00:00').toISOString(),
      end_time: new Date('2026-08-15T12:00:00').toISOString(),
    })

    const res = await POST(postReq(validCreateBody))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.conflicts.map((c: { id: string }) => c.id)).toContain('book-conflict')
    expect(h.store.bookings.length).toBe(3)
  })

  it('ignores cancelled/no_show bookings when checking for conflicts', async () => {
    h.store.bookings.push({
      id: 'book-cancelled', tenant_id: 'tenant-A', client_id: CLIENT_ID, team_member_id: TEAM_MEMBER_ID,
      status: 'cancelled',
      start_time: new Date('2026-08-15T10:00:00').toISOString(),
      end_time: new Date('2026-08-15T12:00:00').toISOString(),
    })

    const res = await POST(postReq(validCreateBody))

    expect(res.status).toBe(201)
  })

  it('rejects a slot outside the team member’s working hours', async () => {
    h.slotWithinHours.mockReturnValue(false)
    h.hoursWindowForDate.mockReturnValue({ start: 9 * 60, end: 17 * 60 })

    const res = await POST(postReq(validCreateBody))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.reason).toBe('outside_hours')
    expect(json.error).toContain('9 AM')
  })

  it('rejects once the team member is already at their daily job cap', async () => {
    h.store.team_members[0].max_jobs_per_day = 1
    h.store.bookings.push({
      id: 'book-today', tenant_id: 'tenant-A', client_id: CLIENT_ID, team_member_id: TEAM_MEMBER_ID,
      status: 'scheduled', start_time: '2026-08-15T06:00:00', end_time: '2026-08-15T08:00:00',
    })

    const res = await POST(postReq(validCreateBody))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.reason).toBe('max_jobs')
  })
})

describe('POST /api/bookings — creation', () => {
  it('creates a booking with status from settings.default_booking_status', async () => {
    h.getSettings.mockResolvedValue({ booking_buffer_minutes: 0, default_booking_status: 'pending_review' })

    const res = await POST(postReq(validCreateBody))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.booking.status).toBe('pending_review')
  })

  it('forces status to confirmed when auto_confirm_bookings is set, overriding default_booking_status', async () => {
    h.getSettings.mockResolvedValue({ booking_buffer_minutes: 0, auto_confirm_bookings: true, default_booking_status: 'pending_review' })

    const res = await POST(postReq(validCreateBody))
    const json = await res.json()

    expect(json.booking.status).toBe('confirmed')
  })

  it('resolves service_type_id to a tenant-scoped service_type name', async () => {
    const res = await POST(postReq({ ...validCreateBody, service_type_id: SERVICE_TYPE_ID }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.booking.service_type).toBe('Deep Clean')
  })

  it('stamps the new booking with the caller tenant_id and logs an audit event', async () => {
    const res = await POST(postReq(validCreateBody))

    expect(res.status).toBe(201)
    const created = h.store.bookings.find((b) => b.client_id === CLIENT_ID && b.start_time === '2026-08-15T09:00:00')!
    expect(created.tenant_id).toBe('tenant-A')
    expect(h.audit).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant-A', action: 'booking.created' }))
  })

  it('never lets a booking-creation failure crash the request even if notification dispatch throws', async () => {
    h.notify.mockRejectedValueOnce(new Error('notify down'))

    const res = await POST(postReq(validCreateBody))

    expect(res.status).toBe(201)
  })
})

describe('POST /api/bookings — cross-tenant FK injection', () => {
  beforeEach(() => {
    h.store.clients.push({ id: OTHER_TENANT_CLIENT_ID, tenant_id: 'tenant-B', name: 'Other Tenant Client (secret)' })
    h.store.team_members.push({ id: OTHER_TENANT_TEAM_MEMBER_ID, tenant_id: 'tenant-B', name: 'Other Tenant Cleaner', schedule: null, max_jobs_per_day: null })
    h.store.service_types.push({ id: OTHER_TENANT_SERVICE_TYPE_ID, tenant_id: 'tenant-B', name: 'Other Tenant Service' })
    h.store.client_properties = [{ id: OTHER_TENANT_PROPERTY_ID, tenant_id: 'tenant-B', client_id: OTHER_TENANT_CLIENT_ID, address: '1 Other Tenant Way' }]
  })

  it("rejects a client_id belonging to another tenant instead of creating the booking (and leaking it via the clients() join)", async () => {
    const res = await POST(postReq({ ...validCreateBody, client_id: OTHER_TENANT_CLIENT_ID }))

    expect(res.status).toBe(404)
    expect(h.store.bookings.some((b) => b.client_id === OTHER_TENANT_CLIENT_ID)).toBe(false)
  })

  it("rejects a team_member_id belonging to another tenant", async () => {
    const res = await POST(postReq({ ...validCreateBody, team_member_id: OTHER_TENANT_TEAM_MEMBER_ID }))

    expect(res.status).toBe(404)
  })

  it("rejects a service_type_id belonging to another tenant", async () => {
    const res = await POST(postReq({ ...validCreateBody, service_type_id: OTHER_TENANT_SERVICE_TYPE_ID }))

    expect(res.status).toBe(404)
  })

  it("rejects a property_id belonging to another tenant", async () => {
    const res = await POST(postReq({ ...validCreateBody, property_id: OTHER_TENANT_PROPERTY_ID }))

    expect(res.status).toBe(404)
  })

  it('still creates the booking when every FK genuinely belongs to the caller tenant', async () => {
    const res = await POST(postReq(validCreateBody))

    expect(res.status).toBe(201)
  })
})

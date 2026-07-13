import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — cross-tenant READ + FK injection on POST /api/bookings. FIXED.
 *
 * UNCONVERTED route (raw `supabaseAdmin`). See deploy-prep/cross-tenant-leak-register.md P1.
 *
 * Two defects, both now closed:
 *
 *  1. SERVICE-TYPE NAME READ (cross-tenant READ): the `service_types` lookup now
 *     carries `.eq('tenant_id', tenantId)`, so a foreign `service_type_id` matches
 *     nothing and its name never reaches the booking.
 *
 *  2. CLIENT_ID FK INJECTION: `client_id` is now verified owned by the acting
 *     tenant (`clients` lookup scoped `.eq('tenant_id', tenantId)`) before any
 *     other work runs; a foreign id 404s before insert.
 *
 * LOCKED: these assertions prove the guards fire. A regression that removes
 * either `.eq('tenant_id', ...)` filter flips them back to a leak.
 */

const CTX_TENANT = 'tid-a' // attacker
const OTHER_TENANT = 'tid-b' // victim

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'], h: null as null | Harness }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (t: string) => holder.from!(t),
    // Models migrations/2026_07_13_admin_booking_atomic.sql: none of these
    // tests assign a team_member_id, so the real function's conflict/cap
    // checks never trigger — this just performs the INSERT through the
    // harness so `h.capture.inserts` still records it.
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn !== 'create_admin_booking_atomic') throw new Error(`unexpected rpc: ${fn}`)
      const row = holder.h!.from('bookings').insert({
        tenant_id: args.p_tenant_id,
        client_id: args.p_client_id,
        property_id: args.p_property_id,
        team_member_id: args.p_team_member_id,
        service_type_id: args.p_service_type_id,
        service_type: args.p_service_type,
        start_time: args.p_start_time,
        end_time: args.p_end_time,
        notes: args.p_notes,
        special_instructions: args.p_special_instructions,
        status: args.p_status,
      })
      const { data } = await row.select().single()
      return { data: { created: true, booking: data }, error: null }
    },
  },
}))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: CTX_TENANT,
      tenant: { id: CTX_TENANT },
      role: 'owner',
    })),
  }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  })),
}))

// validate() is pure; stub it to pass the schema keys straight through (readable
// ids instead of real UUIDs) so we drive the exact fields under test.
vi.mock('@/lib/validate', () => ({
  validate: (body: Record<string, unknown>, schema: Record<string, unknown>) => {
    const data: Record<string, unknown> = {}
    for (const k of Object.keys(schema)) if (body[k] !== undefined) data[k] = body[k]
    return { data, error: null }
  },
}))

// Settings that reach the insert with no team_member_id branch taken.
vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({
    require_team_member: false,
    booking_buffer_minutes: 0,
    auto_confirm_bookings: false,
    default_booking_status: 'scheduled',
  }),
}))

// DB-free / network-free stubs for the post-insert side effects.
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => {} }))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: () => '' }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => '' }) }))
vi.mock('@/lib/client-properties', () => ({ applyPropertyToBookingClient: () => {} }))
vi.mock('@/lib/availability', () => ({ checkMemberDayOff: async () => ({ unavailable: false }) }))
vi.mock('@/lib/day-availability', () => ({ slotWithinHours: () => true, hoursWindowForDate: () => null }))
vi.mock('@/lib/cleaner-availability', () => ({ timestampToMin: () => 0 }))
vi.mock('@/lib/schedule/duration-class', () => ({ deriveDurationClass: () => null }))

import { POST } from './route'

function seed() {
  return {
    bookings: [] as Record<string, unknown>[],
    clients: [
      { id: 'client-a', tenant_id: CTX_TENANT, name: 'A-Client', phone: null },
      { id: 'client-b', tenant_id: OTHER_TENANT, name: 'B-Client', phone: null },
    ],
    // Victim's service type — its NAME must not reach tenant A.
    service_types: [
      { id: 'svc-a', tenant_id: CTX_TENANT, name: 'Alpha Standard Clean' },
      { id: 'svc-b', tenant_id: OTHER_TENANT, name: 'Bravo Deep Clean' },
    ],
    team_members: [
      { id: 'tm-a', tenant_id: CTX_TENANT, name: 'A-Member', schedule: null, max_jobs_per_day: null },
      { id: 'tm-b', tenant_id: OTHER_TENANT, name: 'B-Member', schedule: null, max_jobs_per_day: null },
    ],
    tenants: [{ id: CTX_TENANT, name: 'Alpha' }],
  }
}

function postReq(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  holder.h = h
})

describe('bookings POST — cross-tenant READ + FK injection LOCKED', () => {
  it('LOCKED: a foreign service_type_id is scoped out — its name never reaches tenant A\'s booking', async () => {
    const res = await POST(
      postReq({ client_id: 'client-a', service_type_id: 'svc-b', start_time: '2026-08-01T10:00:00Z' }),
    )
    expect(res.status).toBe(201)
    const json = (await res.json()) as { booking: Record<string, unknown> }

    // Tenant B's service-type name must NOT cross into tenant A's booking.
    // (Post-atomic-fix, the unset value is an explicit column NULL — same as
    // a real Postgres insert — rather than an absent JS key.)
    expect(json.booking.service_type).toBeNull()

    const row = h.capture.inserts.find((i) => i.table === 'bookings')!.rows[0]
    expect(row.tenant_id).toBe(CTX_TENANT)
    expect(row.service_type).toBeNull()
  })

  it('LOCKED: a foreign client_id 404s before any booking is inserted', async () => {
    const res = await POST(
      postReq({ client_id: 'client-b', start_time: '2026-08-01T10:00:00Z' }),
    )
    expect(res.status).toBe(404)

    expect(h.capture.inserts.find((i) => i.table === 'bookings')).toBeUndefined()
  })

  it('CONTROL: own tenant\'s client_id + service_type_id still create a booking with the correct name', async () => {
    const res = await POST(
      postReq({ client_id: 'client-a', service_type_id: 'svc-a', start_time: '2026-08-01T10:00:00Z' }),
    )
    expect(res.status).toBe(201)
    const json = (await res.json()) as { booking: Record<string, unknown> }
    expect(json.booking.service_type).toBe('Alpha Standard Clean')

    const row = h.capture.inserts.find((i) => i.table === 'bookings')!.rows[0]
    expect(row.tenant_id).toBe(CTX_TENANT)
    expect(row.client_id).toBe('client-a')
    expect(row.service_type).toBe('Alpha Standard Clean')
  })

  it('LOCKED: a foreign team_member_id 404s before any booking is inserted', async () => {
    // tm-b belongs to OTHER_TENANT. team_members has no cross-tenant FK check,
    // so without an explicit ownership guard this would sail through and
    // cross-tenant-assign tenant B's employee to tenant A's booking.
    const res = await POST(
      postReq({ client_id: 'client-a', team_member_id: 'tm-b', start_time: '2026-08-01T10:00:00Z' }),
    )
    expect(res.status).toBe(404)
    expect(h.capture.inserts.find((i) => i.table === 'bookings')).toBeUndefined()
  })

  it('CONTROL: own tenant\'s team_member_id still creates a booking assigned to that member', async () => {
    const res = await POST(
      postReq({ client_id: 'client-a', team_member_id: 'tm-a', start_time: '2026-08-01T10:00:00Z' }),
    )
    expect(res.status).toBe(201)
    const row = h.capture.inserts.find((i) => i.table === 'bookings')!.rows[0]
    expect(row.team_member_id).toBe('tm-a')
  })
})

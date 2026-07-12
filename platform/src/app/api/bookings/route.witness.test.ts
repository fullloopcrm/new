import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — cross-tenant READ + FK injection on POST /api/bookings.
 *
 * UNCONVERTED route (raw `supabaseAdmin`). HARD-tier, and the strongest leak in
 * this batch because it performs an actual cross-tenant READ, not just a dangling
 * reference write. See deploy-prep/tenantdb-rollout-plan.md §5b.
 *
 * Two distinct defects, both live TODAY:
 *
 *  1. SERVICE-TYPE NAME READ (cross-tenant READ):
 *     The route resolves the service-type name with
 *         supabaseAdmin.from('service_types').select('name').eq('id', service_type_id)   // NO tenant filter
 *     and copies `svc.name` onto the new booking. A caller in tenant A passing
 *     tenant B's `service_type_id` reads B's service-type NAME and stamps it on
 *     A's booking. (The team_member_id lookups on this route ARE scoped
 *     `.eq('tenant_id', A)`; this one is not.)
 *
 *  2. CLIENT_ID FK INJECTION:
 *     `client_id` is only UUID-format-validated, never ownership-checked, then
 *     inserted `{ ...validated, tenant_id: A }`. A's booking references B's client.
 *
 * Assert the leak is CURRENTLY LIVE. When guards land (scope the service_types
 * read to `tenantId`; verify client_id ownership), FLIP these assertions.
 *
 * Mutation-safe: assertion (1) reads the ACTUAL copied service_type name; adding
 * `.eq('tenant_id', tenantId)` to the service_types read filters B's row out, so
 * `svc` is null, `service_type` is never set, and the assertion fails.
 */

const CTX_TENANT = 'tid-a' // attacker
const OTHER_TENANT = 'tid-b' // victim

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
    service_types: [{ id: 'svc-b', tenant_id: OTHER_TENANT, name: 'Bravo Deep Clean' }],
    team_members: [] as Record<string, unknown>[],
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
})

describe('bookings POST — cross-tenant READ + FK injection WITNESS', () => {
  it('LEAK: the foreign service_type_id read (no tenant filter) copies tenant B\'s service-type name onto tenant A\'s booking', async () => {
    const res = await POST(
      postReq({ client_id: 'client-a', service_type_id: 'svc-b', start_time: '2026-08-01T10:00:00Z' }),
    )
    expect(res.status).toBe(201)
    const json = (await res.json()) as { booking: Record<string, unknown> }

    // Tenant B's service-type name has crossed into tenant A's booking.
    expect(json.booking.service_type).toBe('Bravo Deep Clean')

    const row = h.capture.inserts.find((i) => i.table === 'bookings')!.rows[0]
    expect(row.tenant_id).toBe(CTX_TENANT)
    expect(row.service_type).toBe('Bravo Deep Clean')
  })

  it('LEAK: a foreign client_id (UUID-validated only, never ownership-checked) is stored on the acting tenant\'s booking', async () => {
    const res = await POST(
      postReq({ client_id: 'client-b', start_time: '2026-08-01T10:00:00Z' }),
    )
    expect(res.status).toBe(201)

    const row = h.capture.inserts.find((i) => i.table === 'bookings')!.rows[0]
    expect(row.tenant_id).toBe(CTX_TENANT)
    expect(row.client_id).toBe('client-b') // tenant B's client
  })
})

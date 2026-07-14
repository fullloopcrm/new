/**
 * Happy-path lifecycle test: recurring schedule → generated occurrences,
 * tenant-scoped (P1/W1 queue item a).
 *
 * Drives the REAL POST /api/admin/recurring-schedules handler against one
 * shared in-memory Supabase fake (same pattern as
 * lead/lead-capture-attribution.test.ts & crews/route.test.ts), so tenant
 * scoping shows up as real row placement rather than a mocked return value.
 *
 * Lifecycle asserted:
 *   1. CREATE SCHEDULE      — a `recurring_schedules` row lands, tenant-scoped.
 *   2. GENERATE OCCURRENCES — the 6-week horizon fans out into `bookings`,
 *      each carrying schedule_id + the caller's tenant_id + recurring_type.
 *   3. TENANT SCOPE         — a client_id owned by ANOTHER tenant is rejected
 *      (404) and writes nothing, so the schedule can't straddle tenants.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

// ── shared mutable store, hoisted so vi.mock factories can reach it ──
const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
}))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeSupabaseFake(h), supabase: makeSupabaseFake(h) }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: h.tenantId }, error: null }),
}))
// Deterministic, non-repeating team-member tokens for the generated bookings.
vi.mock('@/lib/tokens', () => ({ generateToken: () => `tok-${(h.seq += 1)}` }))

import { POST } from './route'

const TENANT = 'tenant-A'
const OTHER = 'tenant-B'

const req = (body: unknown) =>
  new Request('http://acme.example.com/api/admin/recurring-schedules', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  h.tenantId = TENANT
  h.seq = 0
  h.store = {
    clients: [
      { id: 'client-A', tenant_id: TENANT, name: 'Acme Client' },
      { id: 'client-B', tenant_id: OTHER, name: 'Other Client' },
    ],
    team_members: [
      { id: 'tm-A', tenant_id: TENANT, name: 'Team Member A' },
      { id: 'tm-B', tenant_id: OTHER, name: 'Team Member B (secret)' },
    ],
    client_properties: [
      { id: 'prop-A', tenant_id: TENANT, address: '1 Acme Way' },
      { id: 'prop-B', tenant_id: OTHER, address: '2 Other Ave (secret)' },
    ],
    recurring_schedules: [],
    bookings: [],
  }
})

const validBody = {
  client_id: 'client-A',
  recurring_type: 'weekly',
  start_date: '2026-08-03', // Mon
  preferred_time: '10:00',
  duration_hours: 3,
  price: 150,
  service_type: 'Standard Cleaning',
}

describe('recurring schedule → occurrences (happy path)', () => {
  it('creates a tenant-scoped recurring_schedules row', async () => {
    const res = await POST(req(validBody))
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(h.store.recurring_schedules).toHaveLength(1)
    const schedule = h.store.recurring_schedules[0]
    expect(schedule.tenant_id).toBe(TENANT)
    expect(schedule).toMatchObject({ client_id: 'client-A', recurring_type: 'weekly', status: 'active' })
    expect(body.schedule.id).toBe(schedule.id)
  })

  it('fans the 6-week horizon out into bookings tied to the schedule + tenant', async () => {
    const res = await POST(req(validBody))
    const body = await res.json()
    const scheduleId = h.store.recurring_schedules[0].id

    // Weekly across a 42-day horizon → at least the first handful of visits.
    expect(body.bookings_created).toBeGreaterThan(0)
    expect(h.store.bookings).toHaveLength(body.bookings_created)

    for (const bk of h.store.bookings) {
      expect(bk.tenant_id).toBe(TENANT)
      expect(bk.schedule_id).toBe(scheduleId)
      expect(bk.recurring_type).toBe('weekly')
      expect(bk.client_id).toBe('client-A')
      expect(bk.status).toBe('scheduled')
    }
    // First occurrence sits on the requested start date at the preferred time.
    expect(String(h.store.bookings[0].start_time)).toBe('2026-08-03T10:00:00')
  })

  it("rejects a client owned by another tenant and writes nothing (tenant scope)", async () => {
    const res = await POST(req({ ...validBody, client_id: 'client-B' }))
    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toMatchObject({ error: 'Client not found' })

    expect(h.store.recurring_schedules).toHaveLength(0)
    expect(h.store.bookings).toHaveLength(0)
  })

  it("rejects a team_member_id belonging to another tenant and writes nothing (FK injection)", async () => {
    const res = await POST(req({ ...validBody, team_member_id: 'tm-B' }))
    expect(res.status).toBe(400)

    expect(h.store.recurring_schedules).toHaveLength(0)
    expect(h.store.bookings).toHaveLength(0)
  })

  it("rejects a property_id belonging to another tenant and writes nothing (FK injection)", async () => {
    const res = await POST(req({ ...validBody, property_id: 'prop-B' }))
    expect(res.status).toBe(400)

    expect(h.store.recurring_schedules).toHaveLength(0)
    expect(h.store.bookings).toHaveLength(0)
  })

  it('still creates the schedule when team_member_id/property_id genuinely belong to the caller tenant', async () => {
    const res = await POST(req({ ...validBody, team_member_id: 'tm-A', property_id: 'prop-A' }))
    expect(res.status).toBe(200)

    expect(h.store.recurring_schedules).toHaveLength(1)
    expect(h.store.recurring_schedules[0]).toMatchObject({ team_member_id: 'tm-A', property_id: 'prop-A' })
  })
})

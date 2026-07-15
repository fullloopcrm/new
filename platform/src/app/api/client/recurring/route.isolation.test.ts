/**
 * CLIENT RECURRING BOOKING — auth + ownership gates.
 *
 * Two bugs closed here, both against the same route:
 *
 * 1. AUTH GAP: client_id came straight from the request body with zero
 *    authentication. An unauthenticated caller (or one holding a session for a
 *    DIFFERENT client) could create a real recurring booking series (with
 *    real pricing) against ANY client and silently overwrite that client's
 *    preferred_team_member_id (deploy-prep/none-write-routes-triage.md row 3).
 *    Fixed via protectClientAPI, scoped to the tenant resolved from the
 *    request's domain (getTenantFromHeaders) — same pattern as the other
 *    /api/client/* routes.
 *
 * 2. OWNERSHIP GAPS: cleaner_id / extra_cleaner_ids / property_id came
 *    straight from client input with no ownership check, letting a client
 *    point their recurring schedule + every generated booking's FK at any
 *    team_members/client_properties row — including another tenant's, an
 *    inactive one in their own tenant, or (for property_id) another CLIENT's
 *    property within the same tenant.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextResponse } from 'next/server'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

const TENANT_ID = 'tenant-A'
const OTHER_TENANT_ID = 'tenant-B'
const CLIENT_ID = 'client-a'
const OTHER_CLIENT_ID = 'client-b'

let sessionClientId: string | null
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: TENANT_ID }),
}))
vi.mock('@/lib/client-auth', () => ({
  protectClientAPI: async (_tenantId: string, requiredClientId?: string) => {
    if (!sessionClientId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    if (requiredClientId && requiredClientId !== sessionClientId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    return { clientId: sessionClientId }
  },
}))
vi.mock('@/lib/tokens', () => ({ generateToken: () => 'tok-123' }))
vi.mock('@/lib/nycmaid/client-contacts', () => ({
  sendClientEmail: vi.fn(async () => ({ ok: true })),
  sendClientSMS: vi.fn(async () => ({ ok: true })),
}))
vi.mock('@/lib/messaging/client-email', () => ({
  confirmationEmailFor: async () => ({ subject: 'x', html: 'x' }),
}))
vi.mock('@/lib/messaging/client-sms', () => ({
  clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => 'x' }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  sessionClientId = CLIENT_ID
  fake._seed('clients', [
    { id: CLIENT_ID, tenant_id: TENANT_ID, preferred_team_member_id: null },
    { id: OTHER_CLIENT_ID, tenant_id: OTHER_TENANT_ID, preferred_team_member_id: 'tm-b' },
  ])
  // Repeat-client gate requires >=1 completed booking.
  fake._seed('bookings', [{ id: 'bk-prior', tenant_id: TENANT_ID, client_id: CLIENT_ID, status: 'completed' }])
  fake._seed('team_members', [
    { id: 'tm-a-active', tenant_id: TENANT_ID, active: true },
    { id: 'tm-a-inactive', tenant_id: TENANT_ID, active: false },
    { id: 'tm-b', tenant_id: OTHER_TENANT_ID, active: true },
  ])
  fake._seed('client_properties', [
    { id: 'prop-a1', tenant_id: TENANT_ID, client_id: CLIENT_ID },
    { id: 'prop-b1', tenant_id: OTHER_TENANT_ID, client_id: OTHER_CLIENT_ID },
  ])
})

function body(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    client_id: CLIENT_ID,
    frequency: 'weekly',
    start_date: '2026-08-03',
    time: '10:00',
    hours: 2,
    ...overrides,
  }
}

function req(overrides: Record<string, unknown> = {}): Request {
  return new Request('http://x/api/client/recurring', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body(overrides)),
  })
}

describe('POST /api/client/recurring — auth gate', () => {
  it('no session → 401, no booking series created', async () => {
    sessionClientId = null
    const res = await POST(req())
    expect(res.status).toBe(401)
    expect(fake._all('recurring_schedules')).toHaveLength(0)
  })

  it("wrong-tenant probe: client A's session can never create a series or overwrite data for client B", async () => {
    // Session belongs to client A, but the body smuggles client B's id.
    const res = await POST(req({ client_id: OTHER_CLIENT_ID }))
    expect(res.status).toBe(403)
    expect(fake._all('recurring_schedules')).toHaveLength(0)
    const { data: untouched } = await fake.from('clients').select('preferred_team_member_id').eq('id', OTHER_CLIENT_ID).single()
    expect((untouched as { preferred_team_member_id: string | null } | null)?.preferred_team_member_id).toBe('tm-b')
  })
})

describe('POST /api/client/recurring — team_member ownership gate', () => {
  it("rejects an assignment to another tenant's team member — 400, no schedule/new bookings created", async () => {
    const res = await POST(req({ cleaner_id: 'tm-b' }))
    expect(res.status).toBe(400)
    expect(fake._all('recurring_schedules')).toHaveLength(0)
    expect(fake._all('bookings')).toHaveLength(1) // only the seeded prior booking
  })

  it('rejects an assignment to an inactive team member in the same tenant — 400', async () => {
    const res = await POST(req({ cleaner_id: 'tm-a-inactive' }))
    expect(res.status).toBe(400)
    expect(fake._all('recurring_schedules')).toHaveLength(0)
  })

  it('rejects a foreign extra_cleaner_ids entry even when cleaner_id is valid — 400', async () => {
    const res = await POST(req({ cleaner_id: 'tm-a-active', extra_cleaner_ids: ['tm-b'] }))
    expect(res.status).toBe(400)
    expect(fake._all('recurring_schedules')).toHaveLength(0)
  })

  it('allows an active, same-tenant assignment (positive control)', async () => {
    const res = await POST(req({ cleaner_id: 'tm-a-active' }))
    expect(res.status).toBe(200)
    const resBody = await res.json()
    expect(resBody.bookings_created).toBeGreaterThan(0)
    const schedule = fake._all('recurring_schedules')[0]
    expect(schedule.team_member_id).toBe('tm-a-active')
  })
})

describe('POST /api/client/recurring — property ownership gate', () => {
  it("cross-client probe: rejects another client's property even within the same tenant — 400", async () => {
    const res = await POST(req({ property_id: 'prop-b1' }))
    expect(res.status).toBe(400)
    expect(fake._all('recurring_schedules')).toHaveLength(0)
  })

  it('allows the client\'s own property (positive control)', async () => {
    const res = await POST(req({ property_id: 'prop-a1' }))
    expect(res.status).toBe(200)
    const schedule = fake._all('recurring_schedules')[0]
    expect(schedule.property_id).toBe('prop-a1')
  })
})

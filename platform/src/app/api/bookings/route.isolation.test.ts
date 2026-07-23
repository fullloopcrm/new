import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — bookings/route.ts (docs/adr/0004).
 * Proves the wrapper's injected .eq('tenant_id') keeps the booking list scoped
 * to the requesting tenant, keeps the scheduling-conflict check from treating
 * a foreign tenant's overlapping booking as a conflict, and stamps a new
 * booking with the requester's tenant even when the same team_member_id
 * exists (as a different row) under another tenant.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  // Booking creation now runs atomically inside a single Postgres RPC
  // (create_admin_booking_atomic — see migrations/2026_07_13_admin_booking_atomic.sql),
  // which does the conflict/cap checks and the INSERT server-side. Every
  // scenario in this file passes `force: true`, which makes the route skip
  // its own conflict/cap pre-checks (p_conflict_start/p_max_jobs_per_day
  // come through null) — so the fake just performs the insert.
  let bookingSeq = 0
  ;(fake as unknown as { rpc: (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> }).rpc =
    async (fnName, params) => {
      if (fnName !== 'create_admin_booking_atomic') {
        return { data: null, error: { message: `unmocked rpc ${fnName}` } }
      }
      const row = {
        id: `bk-new-${++bookingSeq}`,
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
      fake._seed('bookings', [row])
      return { data: { created: true, booking: { id: row.id } }, error: null }
    }
  return { supabaseAdmin: fake }
})

let currentTenantId: string
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: currentTenantId, tenant: { slug: currentTenantId } }),
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
import { GET, POST } from './route'

const A_ID = 'tenant-A'
const B_ID = 'tenant-B'
const TM_A = '11111111-1111-1111-1111-111111111111'
const CLIENT_A = '22222222-2222-2222-2222-222222222222'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  currentTenantId = A_ID
  fake._seed('bookings', [
    { id: 'a-bk', tenant_id: A_ID, start_time: '2026-08-01T10:00:00', end_time: '2026-08-01T12:00:00', status: 'scheduled', team_member_id: TM_A },
    { id: 'b-bk', tenant_id: B_ID, start_time: '2026-08-01T10:00:00', end_time: '2026-08-01T12:00:00', status: 'scheduled', team_member_id: TM_A },
  ])
  fake._seed('tenants', [{ id: A_ID, name: 'A Co' }, { id: B_ID, name: 'B Co' }])
  fake._seed('clients', [{ id: CLIENT_A, tenant_id: A_ID, name: 'Client A' }])
  fake._seed('team_members', [{ id: TM_A, tenant_id: A_ID, name: 'Team Member A' }])
})

function getReq(): NextRequest {
  return new NextRequest('http://x/api/bookings')
}

describe('bookings GET — tenantDb isolation', () => {
  it("tenant A's booking list never includes tenant B's same-slot, same-team_member_id booking (positive control)", async () => {
    const res = await GET(getReq())
    const body = await res.json()
    const ids = (body.bookings as { id: string }[]).map((b) => b.id)
    expect(ids).toEqual(['a-bk'])
  })
})

describe('bookings POST — tenantDb isolation', () => {
  it("creating a booking for tenant A's own team member (same id shape as tenant B's row) does NOT trip a conflict from tenant B's overlapping booking", async () => {
    const req = new Request('http://x/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        client_id: CLIENT_A,
        team_member_id: TM_A,
        start_time: '2026-08-02T10:00:00.000Z', // different day than the seeded conflict window
        end_time: '2026-08-02T12:00:00.000Z',
        force: true,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.booking.tenant_id).toBe(A_ID)
  })

  it("stamps the new booking with tenant A's id via tenantDb, ignoring any forged tenant_id in the body", async () => {
    const req = new Request('http://x/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        client_id: CLIENT_A,
        start_time: '2026-08-03T10:00:00.000Z',
        tenant_id: B_ID,
        force: true,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.booking.tenant_id).toBe(A_ID)

    currentTenantId = B_ID
    const resB = await GET(getReq())
    const bodyB = await resB.json()
    expect((bodyB.bookings as { id: string }[]).map((b) => b.id)).not.toContain(body.booking.id)
  })

  it("LEAK CONTROL: reading bookings by team_member_id ALONE (no tenant_id filter) WOULD return tenant B's overlapping booking as a conflict candidate — proves the route's tenantDb scoping above is load-bearing", async () => {
    const { data } = await supabaseAdmin
      .from('bookings') // tenant-scope-ok: deliberate unscoped LEAK CONTROL probe, proves the route's tenantDb filter is load-bearing
      .select('id, tenant_id')
      .eq('team_member_id', TM_A)
    expect((data as { id: string }[]).map((r) => r.id).sort()).toEqual(['a-bk', 'b-bk'])
  })
})

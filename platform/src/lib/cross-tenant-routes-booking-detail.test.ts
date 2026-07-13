/**
 * CROSS-TENANT SELF-ATTACK — booking [id] sub-routes not covered by the
 * cross-tenant-routes.test.ts family suite.
 *
 * Extends that suite (which covers /api/bookings/[id], /api/portal/bookings/[id],
 * /api/selena, /api/errors, /api/team-portal/jobs/claim) to the remaining
 * booking-detail [id] routes:
 *   - /api/bookings/[id]/status         (admin_token cookie)
 *   - /api/bookings/[id]/payment        (admin_token cookie)
 *   - /api/bookings/[id]/team           (admin_token cookie)
 *   - /api/bookings/[id]/reset          (admin_token cookie)
 *   - /api/booking-notes/[id]           (admin_token cookie, DELETE)
 *   - /api/client/booking/[id]          (client-portal session cookie)
 *
 * Same approach as the sibling suite: real route handlers, only the network
 * boundary (supabase, cookies/headers) faked — so a forgotten tenant filter
 * on any of these routes fails a REAL cross-tenant read/mutation, not a mock.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const env = vi.hoisted(() => ({
  cookies: new Map<string, string>(),
  headers: new Map<string, string>(),
}))

vi.hoisted(() => {
  process.env.ADMIN_TOKEN_SECRET = 'test-admin-token-secret'
  process.env.TENANT_HEADER_SIG_SECRET = 'test-tenant-header-secret'
  process.env.PORTAL_SECRET = 'test-portal-secret'
})

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => {
      const v = env.cookies.get(name)
      return v === undefined ? undefined : { name, value: v }
    },
  }),
  headers: async () => ({
    get: (name: string) => env.headers.get(name) ?? null,
  }),
}))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { signTenantHeader } from './tenant-header-sig'
import { createTenantAdminToken } from '@/app/api/admin-auth/route'
import { createClientSession } from '@/lib/client-auth'
import { PATCH as statusPATCH } from '@/app/api/bookings/[id]/status/route'
import { PATCH as paymentPATCH } from '@/app/api/bookings/[id]/payment/route'
import { GET as teamGET, PUT as teamPUT } from '@/app/api/bookings/[id]/team/route'
import { POST as resetPOST } from '@/app/api/bookings/[id]/reset/route'
import { DELETE as noteDELETE } from '@/app/api/booking-notes/[id]/route'
import { GET as clientBookingGET } from '@/app/api/client/booking/[id]/route'

const A_ID = '11111111-1111-1111-1111-111111111111'
const B_ID = '22222222-2222-2222-2222-222222222222'
const fake = supabaseAdmin as unknown as FakeSupabase
const SHARED_ID = 'shared-row-id' // same id used across BOTH tenants' rows

function paramsFor(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

function setAdminSessionFor(tenantId: string): void {
  env.headers.set('x-tenant-id', tenantId)
  env.headers.set('x-tenant-sig', signTenantHeader(tenantId))
  env.cookies.set('admin_token', createTenantAdminToken(tenantId, 'tm-owner', 'owner'))
}

function reseed() {
  fake._store.clear()
  env.cookies.clear()
  env.headers.clear()
  fake._seed('tenants', [
    { id: A_ID, name: 'Tenant A', slug: 'a', status: 'active' },
    { id: B_ID, name: 'Tenant B', slug: 'b', status: 'active' },
  ])
  fake._seed('bookings', [
    { id: SHARED_ID, tenant_id: A_ID, client_id: 'cl-a', status: 'scheduled', payment_status: 'pending', start_time: '2026-07-01', check_in_time: '2026-07-01T09:00:00Z', check_out_time: null, team_member_id: 'tm-a' },
    { id: SHARED_ID, tenant_id: B_ID, client_id: 'cl-b', status: 'pending', payment_status: 'pending', start_time: '2026-07-02', check_in_time: '2026-07-02T09:00:00Z', check_out_time: null, team_member_id: 'tm-b' },
  ])
  fake._seed('deals', [
    { id: 'deal-a', tenant_id: A_ID, booking_id: SHARED_ID, mode: 'booking', stage: 'open' },
    { id: 'deal-b', tenant_id: B_ID, booking_id: SHARED_ID, mode: 'booking', stage: 'open' },
  ])
  fake._seed('booking_team_members', [
    { tenant_id: A_ID, booking_id: SHARED_ID, team_member_id: 'tm-a', is_lead: true, position: 1 },
    { tenant_id: B_ID, booking_id: SHARED_ID, team_member_id: 'tm-b', is_lead: true, position: 1 },
  ])
  fake._seed('booking_notes', [
    { id: SHARED_ID, tenant_id: A_ID, images: [] },
    { id: SHARED_ID, tenant_id: B_ID, images: [] },
  ])
  fake._seed('clients', [
    { id: 'cl-a', tenant_id: A_ID, name: 'A Client', do_not_service: false },
    { id: 'cl-a2', tenant_id: A_ID, name: 'A2 Client', do_not_service: false },
    { id: 'cl-b', tenant_id: B_ID, name: 'B Client', do_not_service: false },
  ])
}
beforeEach(reseed)

describe('CROSS-TENANT ATTACK · bookings/[id]/status', () => {
  it('tenant A transitions its own same-id booking (positive control)', async () => {
    setAdminSessionFor(A_ID)
    const req = new Request('http://x', { method: 'PATCH', body: JSON.stringify({ status: 'confirmed' }) })
    const res = await statusPATCH(req, paramsFor(SHARED_ID))
    expect(res.status).toBe(200)
  })

  it("tenant A's status PATCH never mutates tenant B's same-id booking or deal", async () => {
    setAdminSessionFor(A_ID)
    const req = new Request('http://x', { method: 'PATCH', body: JSON.stringify({ status: 'confirmed' }) })
    await statusPATCH(req, paramsFor(SHARED_ID))
    const bBooking = fake._all('bookings').find((r) => r.tenant_id === B_ID)!
    expect(bBooking.status).toBe('pending')
    const bDeal = fake._all('deals').find((r) => r.tenant_id === B_ID)!
    expect(bDeal.stage).toBe('open')
  })
})

describe('CROSS-TENANT ATTACK · bookings/[id]/payment', () => {
  it("tenant A's payment PATCH never marks tenant B's same-id booking paid", async () => {
    setAdminSessionFor(A_ID)
    const req = new Request('http://x', { method: 'PATCH', body: JSON.stringify({ payment_status: 'paid', payment_method: 'card' }) })
    await paymentPATCH(req, paramsFor(SHARED_ID))
    const bBooking = fake._all('bookings').find((r) => r.tenant_id === B_ID)!
    expect(bBooking.payment_status).toBe('pending')
  })
})

describe('CROSS-TENANT ATTACK · bookings/[id]/team', () => {
  it("tenant A GET of its own same-id booking's team returns ONLY tenant A's member", async () => {
    setAdminSessionFor(A_ID)
    const res = await teamGET(new Request('http://x'), paramsFor(SHARED_ID))
    const body = await res.json()
    expect(body.lead).toBe('tm-a')
  })

  it("tenant A's team PUT never touches tenant B's booking_team_members rows for the same-id booking", async () => {
    setAdminSessionFor(A_ID)
    const req = new Request('http://x', { method: 'PUT', body: JSON.stringify({ lead_id: null, extra_team_member_ids: [], team_size: 1 }) })
    await teamPUT(req, paramsFor(SHARED_ID))
    const bRows = fake._all('booking_team_members').filter((r) => r.tenant_id === B_ID)
    expect(bRows).toHaveLength(1)
    expect(bRows[0].team_member_id).toBe('tm-b')
    const bBooking = fake._all('bookings').find((r) => r.tenant_id === B_ID)!
    expect(bBooking.team_member_id).toBe('tm-b')
  })
})

describe('CROSS-TENANT ATTACK · bookings/[id]/reset', () => {
  it("tenant A's check-in undo never mutates tenant B's same-id booking", async () => {
    setAdminSessionFor(A_ID)
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ stage: 'check-in' }) })
    await resetPOST(req, paramsFor(SHARED_ID))
    const bBooking = fake._all('bookings').find((r) => r.tenant_id === B_ID)!
    expect(bBooking.check_in_time).toBe('2026-07-02T09:00:00Z')
  })
})

describe('CROSS-TENANT ATTACK · booking-notes/[id] DELETE', () => {
  it("tenant A's DELETE never removes tenant B's same-id note", async () => {
    setAdminSessionFor(A_ID)
    const res = await noteDELETE(new Request('http://x', { method: 'DELETE' }), paramsFor(SHARED_ID))
    expect(res.status).toBe(200)
    expect(fake._all('booking_notes').some((r) => r.tenant_id === B_ID)).toBe(true)
    expect(fake._all('booking_notes').some((r) => r.tenant_id === A_ID)).toBe(false)
  })
})

describe('CROSS-TENANT ATTACK · client/booking/[id]', () => {
  function clientReqFor(clientId: string, tenantId: string): Request {
    const cookie = createClientSession(clientId, tenantId)
    env.headers.set('x-tenant-id', tenantId)
    env.headers.set('x-tenant-sig', signTenantHeader(tenantId))
    env.cookies.set('client_session', cookie)
    return new Request('http://x')
  }

  it("client A's own tenant session reads its OWN same-id booking (positive control)", async () => {
    const res = await clientBookingGET(clientReqFor('cl-a', A_ID), paramsFor(SHARED_ID))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tenant_id).toBe(A_ID)
  })

  it("a DIFFERENT client's session in the SAME tenant cannot read cl-a's booking (client_id bound in session) → 401/403", async () => {
    const res = await clientBookingGET(clientReqFor('cl-a2', A_ID), paramsFor(SHARED_ID))
    expect([401, 403]).toContain(res.status)
  })

  it("a client session cookie signed for tenant A is REJECTED on tenant B's headers (cross-tenant session replay) → 401", async () => {
    const cookie = createClientSession('cl-a', A_ID)
    env.headers.set('x-tenant-id', B_ID)
    env.headers.set('x-tenant-sig', signTenantHeader(B_ID))
    env.cookies.set('client_session', cookie)
    const res = await clientBookingGET(new Request('http://x'), paramsFor(SHARED_ID))
    expect(res.status).toBe(401)
  })
})

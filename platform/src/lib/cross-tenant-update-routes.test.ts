/**
 * CROSS-TENANT ATTACK — UPDATE routes on the highest-value tables not already
 * covered by cross-tenant-routes.test.ts (booking/portal/selena/errors/team-
 * portal/attribution/referrer families): tenant_members (identity/role),
 * invoices (money), and payment-matching (money). Same harness/fake-supabase
 * pattern as the sibling suite — see that file's header for why the fake is
 * deliberately unscoped by default.
 *
 * Each family proves: tenant A supplying tenant B's row id mutates NOTHING in
 * B's row. A LEAK CONTROL per family proves the fake would have let the leak
 * through without the route's tenant filter, so a green test is meaningful.
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
  return { supabase: fake, supabaseAdmin: fake }
})

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))

import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { signTenantHeader } from './tenant-header-sig'
import { createTenantAdminToken } from '@/app/api/admin-auth/route'
import { PUT as userPUT } from '@/app/api/admin/users/[id]/route'
import { PATCH as invoicePATCH } from '@/app/api/invoices/[id]/route'
import { POST as confirmMatchPOST } from '@/app/api/admin/payments/confirm-match/route'

const A_ID = '11111111-1111-1111-1111-111111111111'
const B_ID = '22222222-2222-2222-2222-222222222222'
const fake = supabaseAdmin as unknown as FakeSupabase

function reseed() {
  fake._store.clear()
  env.cookies.clear()
  env.headers.clear()
  fake._seed('tenants', [
    { id: A_ID, name: 'Tenant A', slug: 'a', status: 'active', selena_config: null },
    { id: B_ID, name: 'Tenant B', slug: 'b', status: 'active', selena_config: null },
  ])
  fake._seed('tenant_members', [
    { id: 'tm-owner-a', tenant_id: A_ID, role: 'owner', name: 'Owner A', email: 'owner-a@example.com', phone: null },
    { id: 'tm-owner-b', tenant_id: B_ID, role: 'owner', name: 'Owner B — confidential', email: 'owner-b@example.com', phone: null },
  ])
  fake._seed('invoices', [
    { id: 'inv-a', tenant_id: A_ID, status: 'draft', client_id: 'cl-a', total_cents: 10000 },
    { id: 'inv-b', tenant_id: B_ID, status: 'draft', client_id: 'cl-b', total_cents: 99999 },
  ])
  fake._seed('unmatched_payments', [
    { id: 'ump-a', tenant_id: A_ID, method: 'zelle', amount_cents: 5000, sender_name: 'A Sender', status: 'unmatched', raw_email_id: null },
    { id: 'ump-b', tenant_id: B_ID, method: 'zelle', amount_cents: 9999, sender_name: 'B Sender — confidential', status: 'unmatched', raw_email_id: null },
  ])
  fake._seed('bookings', [
    { id: 'bk-a', tenant_id: A_ID, client_id: 'cl-a', status: 'completed', price: 5000, hourly_rate: 50, actual_hours: 2, payment_status: 'pending' },
    { id: 'bk-b', tenant_id: B_ID, client_id: 'cl-b', status: 'completed', price: 9999, hourly_rate: 99, actual_hours: 2, payment_status: 'pending' },
  ])
}
beforeEach(reseed)

function paramsFor(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

function setAdminSessionFor(tenantId: string, memberId: string, role = 'owner'): void {
  env.headers.set('x-tenant-id', tenantId)
  env.headers.set('x-tenant-sig', signTenantHeader(tenantId))
  env.cookies.set('admin_token', createTenantAdminToken(tenantId, memberId, role))
}

describe('CROSS-TENANT ATTACK · tenant_members — PUT /api/admin/users/[id]', () => {
  it("tenant A PUT targeting tenant B's member id mutates nothing — B's row survives untouched", async () => {
    setAdminSessionFor(A_ID, 'tm-owner-a')
    const req = new Request('http://x', { method: 'PUT', body: JSON.stringify({ name: 'HACKED', role: 'owner' }) }) as unknown as NextRequest
    await userPUT(req, paramsFor('tm-owner-b'))
    const bRow = fake._all('tenant_members').find((r) => r.id === 'tm-owner-b')!
    expect(bRow.name).toBe('Owner B — confidential')
    expect(bRow.tenant_id).toBe(B_ID)
  })

  it('tenant A PUT on its OWN member id succeeds (positive control)', async () => {
    setAdminSessionFor(A_ID, 'tm-owner-a')
    const req = new Request('http://x', { method: 'PUT', body: JSON.stringify({ name: 'Renamed A' }) }) as unknown as NextRequest
    const res = await userPUT(req, paramsFor('tm-owner-a'))
    expect(res.status).toBe(200)
    expect(fake._all('tenant_members').find((r) => r.id === 'tm-owner-a')!.name).toBe('Renamed A')
  })

  it("LEAK CONTROL: updating tenant_members by id ALONE (no tenant_id filter) WOULD let tenant A rename tenant B's owner — proves tenantDb's tenant_id filter above is load-bearing", async () => {
    await fake.from('tenant_members').update({ name: 'HACKED VIA RAW ACCESS' }).eq('id', 'tm-owner-b')
    expect(fake._all('tenant_members').find((r) => r.id === 'tm-owner-b')!.name).toBe('HACKED VIA RAW ACCESS')
  })
})

describe('CROSS-TENANT ATTACK · invoices — PATCH /api/invoices/[id]', () => {
  it("tenant A PATCH targeting tenant B's invoice id mutates nothing — B's row survives untouched", async () => {
    setAdminSessionFor(A_ID, 'tm-owner-a')
    const req = new Request('http://x', { method: 'PATCH', body: JSON.stringify({ total_cents: 1 }) })
    const res = await invoicePATCH(req, paramsFor('inv-b'))
    expect(res.status).toBe(404)
    const bRow = fake._all('invoices').find((r) => r.id === 'inv-b')!
    expect(bRow.total_cents).toBe(99999)
    expect(bRow.tenant_id).toBe(B_ID)
  })
})

describe('CROSS-TENANT ATTACK · payments — POST /api/admin/payments/confirm-match', () => {
  it("tenant A matching tenant A's unmatched payment to tenant B's booking id touches neither B's booking nor leaks its data", async () => {
    setAdminSessionFor(A_ID, 'tm-owner-a')
    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ unmatchedPaymentId: 'ump-a', bookingId: 'bk-b' }),
    })
    const res = await confirmMatchPOST(req)
    // booking lookup is tenant-scoped (db = tenantDb(tenantId)), so tenant B's
    // booking id resolves to nothing under tenant A's context.
    expect(res.status).toBe(404)
    const bBooking = fake._all('bookings').find((r) => r.id === 'bk-b')!
    expect(bBooking.payment_status).toBe('pending')
    const aUnmatched = fake._all('unmatched_payments').find((r) => r.id === 'ump-a')!
    expect(aUnmatched.status).toBe('unmatched')
  })

  it("tenant A matching tenant B's unmatched payment id to tenant A's own booking touches nothing — B's payment survives", async () => {
    setAdminSessionFor(A_ID, 'tm-owner-a')
    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ unmatchedPaymentId: 'ump-b', bookingId: 'bk-a' }),
    })
    const res = await confirmMatchPOST(req)
    expect(res.status).toBe(404)
    const bUnmatched = fake._all('unmatched_payments').find((r) => r.id === 'ump-b')!
    expect(bUnmatched.status).toBe('unmatched')
    const aBooking = fake._all('bookings').find((r) => r.id === 'bk-a')!
    expect(aBooking.payment_status).toBe('pending')
  })

  it('tenant A matching its OWN payment to its OWN booking succeeds (positive control)', async () => {
    setAdminSessionFor(A_ID, 'tm-owner-a')
    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ unmatchedPaymentId: 'ump-a', bookingId: 'bk-a' }),
    })
    const res = await confirmMatchPOST(req)
    expect(res.status).toBe(200)
    expect(fake._all('bookings').find((r) => r.id === 'bk-a')!.payment_status).toBe('paid')
  })
})

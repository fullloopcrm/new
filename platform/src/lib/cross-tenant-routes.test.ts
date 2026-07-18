/**
 * CROSS-TENANT SELF-ATTACK — real route handlers (booking / portal / selena /
 * errors / team-portal).
 *
 * Extends the 46c53454 suite (crypto gates in cross-tenant-attack.test.ts,
 * foreign-id DB isolation in cross-tenant-db.test.ts, resolver integration in
 * cross-tenant-resolver.test.ts) by driving ACTUAL Next.js route
 * handlers end-to-end, with only the network boundary faked.
 *
 * Routes covered (one per family, picked because none had a dedicated test):
 *   - booking: src/app/api/bookings/[id]/route.ts        (operator dashboard,
 *     admin_token cookie via getTenantForRequest/requirePermission)
 *   - portal:  src/app/api/portal/bookings/[id]/route.ts (client-portal bearer
 *     token via verifyPortalToken — id+tenant BOTH bound in the token)
 *   - selena:  src/app/api/selena/route.ts GET ?convoId= (operator dashboard,
 *     admin_token cookie via getTenantForRequest)
 *   - errors:  src/app/api/errors/route.ts POST (public, unauthenticated —
 *     tenant attribution only from a signed x-tenant-id/x-tenant-sig header
 *     pair, never from the request body)
 *   - team-portal: src/app/api/team-portal/jobs/claim/route.ts POST
 *     (field-staff bearer token via verifyToken — booking_id is caller-
 *     supplied, tenant_id filter must stop a cross-tenant claim)
 *
 * The selena case caught a REAL bug: the convoId branch queried
 * sms_conversation_messages by conversation_id alone, with no check that the
 * conversation belonged to the requesting tenant — tenant A could read tenant
 * B's full SMS transcript (PII: name/phone/address/email) by guessing a
 * convoId. Fixed in the same commit as this test by adding the tenant-verify
 * lookup that the sibling src/app/api/admin/selena/route.ts already had.
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
  process.env.TEAM_PORTAL_SECRET = 'test-team-portal-secret'
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
  const { fakeClaimOpenJobRpc } = await import('@/app/api/team-portal/jobs/claim/claim-open-job-rpc-fake')
  const rpc = fakeClaimOpenJobRpc(fake)
  return { supabase: fake, supabaseAdmin: { ...fake, rpc }, __fake: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { signTenantHeader } from './tenant-header-sig'
import { createTenantAdminToken } from '@/app/api/admin-auth/route'
import { createToken as createPortalToken } from '@/app/api/portal/auth/token'
import { GET as bookingGET, PUT as bookingPUT, DELETE as bookingDELETE } from '@/app/api/bookings/[id]/route'
import { GET as portalBookingGET, PUT as portalBookingPUT } from '@/app/api/portal/bookings/[id]/route'
import { GET as selenaGET } from '@/app/api/selena/route'
import { POST as errorsPOST } from '@/app/api/errors/route'
import { createToken as createTeamToken } from '@/app/api/team-portal/auth/token'
import { POST as jobsClaimPOST } from '@/app/api/team-portal/jobs/claim/route'
import { GET as attributionManualGET, POST as attributionManualPOST } from '@/app/api/attribution/manual/route'
import { GET as referrerCodeGET } from '@/app/api/referrers/[code]/route'
import { POST as referrerAuthRequestPOST } from '@/app/api/referrers/auth/request/route'
import { POST as referrerAuthVerifyPOST } from '@/app/api/referrers/auth/verify/route'
import { createReferrerToken, hashOtp } from '@/lib/referrer-portal-auth'
import { GET as portalServicesGET } from '@/app/api/portal/services/route'
import { POST as bookingNotesUploadPOST } from '@/app/api/booking-notes/upload/route'
import { PUT as referralPUT } from '@/app/api/referrals/[id]/route'
import { POST as jobsReleasePOST } from '@/app/api/team-portal/jobs/release/route'
import { POST as jobsReassignPOST } from '@/app/api/team-portal/jobs/reassign/route'
import { GET as availabilityGET, PUT as availabilityPUT } from '@/app/api/team-portal/availability/route'

const A_ID = '11111111-1111-1111-1111-111111111111'
const B_ID = '22222222-2222-2222-2222-222222222222'
const fake = supabaseAdmin as unknown as FakeSupabase

const ids = {
  booking: { a: 'bk-a', b: 'bk-b', aOpen: 'bk-a-open', bOpen: 'bk-b-open' },
  client: { a: 'cl-a', a2: 'cl-a2', b: 'cl-b' },
  convo: { a: 'convo-a', b: 'convo-b' },
  member: { a: 'tm-a', b: 'tm-b', a2: 'tm-a2', aManager: 'tm-a-manager' },
  referrer: { a: 'ref-a', b: 'ref-b' },
}

function reseed() {
  fake._store.clear()
  env.cookies.clear()
  env.headers.clear()
  fake._seed('tenants', [
    { id: A_ID, name: 'Tenant A', slug: 'a', status: 'active', selena_config: null },
    { id: B_ID, name: 'Tenant B', slug: 'b', status: 'active', selena_config: null },
  ])
  fake._seed('clients', [
    { id: ids.client.a, tenant_id: A_ID, name: 'A Client', phone: '+15550001', address: '1 A St', email: 'a@example.com', do_not_service: false },
    { id: ids.client.a2, tenant_id: A_ID, name: 'A2 Client', phone: '+15550002', address: '2 A St', email: 'a2@example.com', do_not_service: false },
    { id: ids.client.b, tenant_id: B_ID, name: 'B Client', phone: '+15550003', address: '1 B St', email: 'b@example.com', do_not_service: false },
  ])
  fake._seed('bookings', [
    { id: ids.booking.a, tenant_id: A_ID, client_id: ids.client.a, status: 'scheduled', start_time: '2026-07-01', notes: 'orig-a' },
    { id: ids.booking.b, tenant_id: B_ID, client_id: ids.client.b, status: 'scheduled', start_time: '2026-07-02', notes: 'orig-b' },
    { id: ids.booking.aOpen, tenant_id: A_ID, client_id: ids.client.a, status: 'scheduled', start_time: '2099-01-01', team_member_id: null },
    { id: ids.booking.bOpen, tenant_id: B_ID, client_id: ids.client.b, status: 'scheduled', start_time: '2099-01-01', team_member_id: null },
    { id: 'bk-a-assigned', tenant_id: A_ID, client_id: ids.client.a, status: 'confirmed', start_time: '2099-02-01', team_member_id: ids.member.a },
    { id: 'bk-b-assigned', tenant_id: B_ID, client_id: ids.client.b, status: 'confirmed', start_time: '2099-02-02', team_member_id: ids.member.b },
  ])
  fake._seed('team_members', [
    { id: ids.member.a, tenant_id: A_ID, status: 'active', role: 'worker', pay_rate: 20, max_jobs_per_day: null, name: 'Worker A', notes: JSON.stringify({ availability: { working_days: [1, 2, 3, 4, 5], blocked_dates: ['2026-08-01'] } }) },
    { id: ids.member.b, tenant_id: B_ID, status: 'active', role: 'worker', pay_rate: 22, max_jobs_per_day: null, name: 'Worker B', notes: JSON.stringify({ availability: { working_days: [1, 2, 3, 4, 5], blocked_dates: ['2026-09-01'] } }) },
    { id: ids.member.a2, tenant_id: A_ID, status: 'active', role: 'worker', pay_rate: 21, max_jobs_per_day: null, name: 'Worker A2', notes: null },
    { id: ids.member.aManager, tenant_id: A_ID, status: 'active', role: 'manager', pay_rate: 30, max_jobs_per_day: null, name: 'Manager A', notes: null },
  ])
  // Office/admin-PIN accounts (tenant_members, distinct from field-staff
  // team_members) — getTenantForRequest() re-reads the current role from here
  // on every request (instant-revocation fix), so setAdminSessionFor's minted
  // tm-owner token needs a backing row per tenant.
  fake._seed('tenant_members', [
    { id: 'tm-owner', tenant_id: A_ID, role: 'owner', name: 'Owner A' },
    { id: 'tm-owner', tenant_id: B_ID, role: 'owner', name: 'Owner B' },
  ])
  fake._seed('sms_conversations', [
    { id: ids.convo.a, tenant_id: A_ID, phone: '+15550001', name: 'A Convo', client_id: null, state: 'active', booking_checklist: null },
    { id: ids.convo.b, tenant_id: B_ID, phone: '+15550003', name: 'B Convo', client_id: null, state: 'active', booking_checklist: null },
  ])
  fake._seed('sms_conversation_messages', [
    { id: 'msg-a', conversation_id: ids.convo.a, direction: 'inbound', message: 'A secret message', created_at: '2026-07-01' },
    { id: 'msg-b', conversation_id: ids.convo.b, direction: 'inbound', message: 'B secret message — SSN 555-00-1234', created_at: '2026-07-02' },
  ])
  fake._seed('referrers', [
    { id: ids.referrer.a, tenant_id: A_ID, name: 'Referrer A', email: 'shared@example.com', referral_code: 'CODEA', status: 'active', commission_rate: 0.1, total_earned: 100, total_paid: 20, otp_hash: null, otp_expires_at: null },
    { id: ids.referrer.b, tenant_id: B_ID, name: 'Referrer B', email: 'shared@example.com', referral_code: 'CODEB', status: 'active', commission_rate: 0.15, total_earned: 200, total_paid: 50, otp_hash: null, otp_expires_at: null },
  ])
  fake._seed('referral_commissions', [
    { id: 'comm-a', tenant_id: A_ID, referrer_id: ids.referrer.a, client_name: 'A Client', commission_amount: 500, status: 'pending', paid_via: null, created_at: '2026-07-01' },
    { id: 'comm-b', tenant_id: B_ID, referrer_id: ids.referrer.b, client_name: 'B Client — confidential', commission_amount: 900, status: 'pending', paid_via: null, created_at: '2026-07-02' },
  ])
  fake._seed('service_types', [
    { id: 'svc-a', tenant_id: A_ID, name: 'Standard Clean A', description: null, default_duration_hours: 2, default_hourly_rate: 50, pricing_model: 'hourly', price_cents: null, per_unit: null, unit_label: null, min_charge_cents: null, active: true, sort_order: 1 },
    { id: 'svc-b', tenant_id: B_ID, name: 'Standard Clean B — confidential rate', description: null, default_duration_hours: 2, default_hourly_rate: 999, pricing_model: 'hourly', price_cents: null, per_unit: null, unit_label: null, min_charge_cents: null, active: true, sort_order: 1 },
  ])
  fake._seed('booking_notes', [
    { id: 'note-a', tenant_id: A_ID, booking_id: ids.booking.a, author_type: 'admin', author_name: 'Admin A', content: 'A note', images: [] },
    { id: 'note-b', tenant_id: B_ID, booking_id: ids.booking.b, author_type: 'admin', author_name: 'Admin B', content: 'B note — confidential', images: [] },
  ])
  fake._seed('referrals', [
    { id: 'referral-a', tenant_id: A_ID, name: 'Referral A', email: 'refa@example.com', referral_code: 'RCODEA', commission_rate: 0.1, status: 'active' },
    { id: 'referral-b', tenant_id: B_ID, name: 'Referral B — confidential', email: 'refb@example.com', referral_code: 'RCODEB', commission_rate: 0.15, status: 'active' },
  ])
}
beforeEach(reseed)

function paramsFor(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

function setAdminSessionFor(tenantId: string): void {
  env.headers.set('x-tenant-id', tenantId)
  env.headers.set('x-tenant-sig', signTenantHeader(tenantId))
  env.cookies.set('admin_token', createTenantAdminToken(tenantId, 'tm-owner', 'owner'))
}

describe('CROSS-TENANT ATTACK · booking family — /api/bookings/[id]', () => {
  it('tenant A GET of its OWN booking succeeds (positive control)', async () => {
    setAdminSessionFor(A_ID)
    const res = await bookingGET(new Request('http://x'), paramsFor(ids.booking.a))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.booking.id).toBe(ids.booking.a)
  })

  it("tenant A GET of tenant B's booking id → 404, no data leak", async () => {
    setAdminSessionFor(A_ID)
    const res = await bookingGET(new Request('http://x'), paramsFor(ids.booking.b))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.booking).toBeUndefined()
  })

  it("tenant A PUT targeting tenant B's booking id mutates nothing — B's row survives untouched", async () => {
    setAdminSessionFor(A_ID)
    const req = new Request('http://x', { method: 'PUT', body: JSON.stringify({ notes: 'HACKED' }) })
    await bookingPUT(req, paramsFor(ids.booking.b))
    const bRow = fake._all('bookings').find((r) => r.id === ids.booking.b)!
    expect(bRow.notes).toBe('orig-b')
    expect(bRow.tenant_id).toBe(B_ID)
  })

  it("tenant A DELETE targeting tenant B's booking id removes nothing — B's row survives", async () => {
    setAdminSessionFor(A_ID)
    const res = await bookingDELETE(new Request('http://x', { method: 'DELETE' }), paramsFor(ids.booking.b))
    expect(res.status).toBe(404) // tenantDb's scoped pre-fetch finds nothing, same as GET's 404 above
    expect(fake._all('bookings').some((r) => r.id === ids.booking.b)).toBe(true)
  })

  it('REJECTS the request entirely with no admin session → 401, before any query runs', async () => {
    const res = await bookingGET(new Request('http://x'), paramsFor(ids.booking.a))
    expect(res.status).toBe(401)
  })
})

describe('CROSS-TENANT ATTACK · portal family — /api/portal/bookings/[id]', () => {
  it("client A's OWN portal token reads its OWN booking (positive control)", async () => {
    const token = createPortalToken(ids.client.a, A_ID)
    const req = new Request('http://x', { headers: { authorization: `Bearer ${token}` } })
    const res = await portalBookingGET(req, paramsFor(ids.booking.a))
    expect(res.status).toBe(200)
  })

  it("client A's portal token CANNOT read tenant B's booking id (tenant_id bound in token) → 404", async () => {
    const token = createPortalToken(ids.client.a, A_ID)
    const req = new Request('http://x', { headers: { authorization: `Bearer ${token}` } })
    const res = await portalBookingGET(req, paramsFor(ids.booking.b))
    expect(res.status).toBe(404)
  })

  it("client A's portal token CANNOT read a DIFFERENT client's booking in the SAME tenant (client_id bound in token) → 404", async () => {
    // booking A belongs to client A, not client A2 — proves client_id scoping,
    // not just tenant_id scoping, gates the row.
    const token = createPortalToken(ids.client.a2, A_ID)
    const req = new Request('http://x', { headers: { authorization: `Bearer ${token}` } })
    const res = await portalBookingGET(req, paramsFor(ids.booking.a))
    expect(res.status).toBe(404)
  })

  it("client A's portal token CANNOT cancel tenant B's booking via PUT — B's row survives untouched", async () => {
    const token = createPortalToken(ids.client.a, A_ID)
    const req = new Request('http://x', {
      method: 'PUT',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'cancelled' }),
    })
    const res = await portalBookingPUT(req, paramsFor(ids.booking.b))
    expect(res.status).toBe(404)
    const bRow = fake._all('bookings').find((r) => r.id === ids.booking.b)!
    expect(bRow.status).toBe('scheduled')
  })

  it('REJECTS a forged tenant id inside a tampered token (bad hmac) → 401', async () => {
    const token = createPortalToken(ids.client.a, A_ID)
    const [payloadB64, sig] = token.split('.')
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString())
    payload.tid = B_ID
    const forged = Buffer.from(JSON.stringify(payload)).toString('base64') + '.' + sig
    const req = new Request('http://x', { headers: { authorization: `Bearer ${forged}` } })
    const res = await portalBookingGET(req, paramsFor(ids.booking.b))
    expect(res.status).toBe(401)
  })
})

describe('CROSS-TENANT ATTACK · selena family — /api/selena?convoId= (was a REAL IDOR, now fixed)', () => {
  it("tenant A reading its OWN convoId returns its OWN messages (positive control)", async () => {
    setAdminSessionFor(A_ID)
    const res = await selenaGET(new Request(`http://x?convoId=${ids.convo.a}`) as unknown as import('next/server').NextRequest)
    const body = await res.json()
    expect(body.messages.length).toBe(1)
    expect(body.messages[0].message).toBe('A secret message')
  })

  it("tenant A passing tenant B's convoId gets EMPTY messages — cannot read B's SMS transcript", async () => {
    setAdminSessionFor(A_ID)
    const res = await selenaGET(new Request(`http://x?convoId=${ids.convo.b}`) as unknown as import('next/server').NextRequest)
    const body = await res.json()
    expect(body.messages).toEqual([])
  })

  it("LEAK CONTROL: querying sms_conversation_messages by conversation_id ALONE (no tenant check) DOES return B's message — proves the ownership lookup above is load-bearing", async () => {
    const { data } = await supabaseAdmin
      .from('sms_conversation_messages')
      .select('direction, message, created_at')
      .eq('conversation_id', ids.convo.b)
    expect((data as { message: string }[])[0].message).toContain('SSN')
  })
})

describe('CROSS-TENANT ATTACK · errors family — /api/errors (unauthenticated, signed-header tenant attribution)', () => {
  it('a genuine signed x-tenant-id/x-tenant-sig header pair attributes the error to that tenant (positive control)', async () => {
    const req = new Request('http://x', {
      method: 'POST',
      headers: { 'x-tenant-id': A_ID, 'x-tenant-sig': signTenantHeader(A_ID) },
      body: JSON.stringify({ message: 'positive-control-boom', source: 'test' }),
    })
    const res = await errorsPOST(req)
    expect(res.status).toBe(200)
    const logged = fake._all('error_logs').find((r) => r.message === 'positive-control-boom')
    expect(logged?.tenant_id).toBe(A_ID)
  })

  it("REJECTS a body-supplied tenantId — a caller cannot attribute a junk error to tenant B just by putting it in the JSON body", async () => {
    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ message: 'forged-body-tenant', source: 'test', tenantId: B_ID }),
    })
    const res = await errorsPOST(req)
    expect(res.status).toBe(200)
    const logged = fake._all('error_logs').find((r) => r.message === 'forged-body-tenant')
    expect(logged?.tenant_id).toBeNull()
  })

  it("REJECTS tenant A's signature replayed under tenant B's header id — files as anonymous, not attributed to EITHER tenant", async () => {
    const req = new Request('http://x', {
      method: 'POST',
      headers: { 'x-tenant-id': B_ID, 'x-tenant-sig': signTenantHeader(A_ID) },
      body: JSON.stringify({ message: 'cross-sig-replay', source: 'test' }),
    })
    const res = await errorsPOST(req)
    expect(res.status).toBe(200)
    const logged = fake._all('error_logs').find((r) => r.message === 'cross-sig-replay')
    expect(logged?.tenant_id).toBeNull()
  })

  it('REJECTS a tampered signature (single flipped char) — files as anonymous', async () => {
    const sig = signTenantHeader(A_ID)
    const flipped = (sig[0] === 'a' ? 'b' : 'a') + sig.slice(1)
    const req = new Request('http://x', {
      method: 'POST',
      headers: { 'x-tenant-id': A_ID, 'x-tenant-sig': flipped },
      body: JSON.stringify({ message: 'tampered-sig', source: 'test' }),
    })
    const res = await errorsPOST(req)
    expect(res.status).toBe(200)
    const logged = fake._all('error_logs').find((r) => r.message === 'tampered-sig')
    expect(logged?.tenant_id).toBeNull()
  })
})

describe('CROSS-TENANT ATTACK · team-portal family — /api/team-portal/jobs/claim', () => {
  it("worker A claims tenant A's own unassigned job (positive control)", async () => {
    const token = createTeamToken(ids.member.a, A_ID, 20, 'worker')
    const req = new Request('http://x', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ booking_id: ids.booking.aOpen }),
    })
    const res = await jobsClaimPOST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.booking.team_member_id).toBe(ids.member.a)
  })

  it("worker A CANNOT claim tenant B's unassigned job by passing tenant B's booking_id — the tenant_id filter finds no matching row → 404, B's booking stays unassigned", async () => {
    const token = createTeamToken(ids.member.a, A_ID, 20, 'worker')
    const req = new Request('http://x', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ booking_id: ids.booking.bOpen }),
    })
    const res = await jobsClaimPOST(req)
    // The route's overlap-guard pre-fetch (tenant-scoped) now finds no row for a
    // cross-tenant id and returns 404 before reaching the atomic-claim update
    // (which previously reported this same cross-tenant case as 409 "already
    // taken" — 404 is the more accurate status; the security property (blocked,
    // B's booking untouched) is unchanged).
    expect(res.status).toBe(404)
    const bRow = fake._all('bookings').find((r) => r.id === ids.booking.bOpen)!
    expect(bRow.team_member_id).toBeNull()
    expect(bRow.tenant_id).toBe(B_ID)
  })

  it('REJECTS the claim entirely with no bearer token → 401, before any query runs', async () => {
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ booking_id: ids.booking.aOpen }) })
    const res = await jobsClaimPOST(req)
    expect(res.status).toBe(401)
  })

  it("LEAK CONTROL: updating bookings by id ALONE (no tenant_id filter) WOULD let worker A claim tenant B's job — proves the route's .eq('tenant_id', auth.tid) filter above is load-bearing", async () => {
    const { data } = await supabaseAdmin
      .from('bookings')
      .update({ team_member_id: ids.member.a })
      .eq('id', ids.booking.bOpen)
      .is('team_member_id', null)
      .select()
      .maybeSingle()
    expect((data as { team_member_id: string } | null)?.team_member_id).toBe(ids.member.a)
  })
})

describe('CROSS-TENANT ATTACK · attribution family — /api/attribution/manual (tenantDb, W3 backlog)', () => {
  it("tenant A GET lists only its OWN bookings for manual attribution (positive control)", async () => {
    setAdminSessionFor(A_ID)
    const res = await attributionManualGET()
    const body = await res.json()
    const returnedIds = (body.bookings as { id: string }[]).map((b) => b.id)
    expect(returnedIds).toContain(ids.booking.a)
    expect(returnedIds).not.toContain(ids.booking.b)
  })

  it("tenant A POST attributing tenant B's booking_id finds no matching row — B's booking stays unattributed", async () => {
    setAdminSessionFor(A_ID)
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ booking_id: ids.booking.b, domain: 'evil.com' }) })
    await attributionManualPOST(req)
    const bRow = fake._all('bookings').find((r) => r.id === ids.booking.b)!
    expect(bRow.attributed_domain).toBeUndefined()
  })

  it('tenant A POST attributing its OWN booking succeeds (positive control)', async () => {
    setAdminSessionFor(A_ID)
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ booking_id: ids.booking.a, domain: 'good.com' }) })
    const res = await attributionManualPOST(req)
    expect(res.status).toBe(200)
    const aRow = fake._all('bookings').find((r) => r.id === ids.booking.a)!
    expect(aRow.attributed_domain).toBe('good.com')
  })
})

describe('CROSS-TENANT ATTACK · referrer family — /api/referrers/[code] + auth/request + auth/verify (tenantDb, W3 backlog)', () => {
  it("referrer A's own session token reads its OWN code and sees only its OWN commissions (positive control)", async () => {
    const token = createReferrerToken(ids.referrer.a, A_ID)
    const req = new Request('http://x', { headers: { authorization: `Bearer ${token}` } })
    const res = await referrerCodeGET(req, { params: Promise.resolve({ code: 'CODEA' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.referrer.id).toBe(ids.referrer.a)
    expect(body.commissions.map((c: { id: string }) => c.id)).toEqual(['comm-a'])
    expect(JSON.stringify(body)).not.toContain('confidential')
  })

  it("referrer A's token requesting tenant B's code (CODEB) → 403, no commissions/domain leak", async () => {
    const token = createReferrerToken(ids.referrer.a, A_ID)
    const req = new Request('http://x', { headers: { authorization: `Bearer ${token}` } })
    const res = await referrerCodeGET(req, { params: Promise.resolve({ code: 'CODEB' }) })
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.commissions).toBeUndefined()
  })

  it('REJECTS a token whose tid was swapped to tenant B without re-signing (forged token) → 401', async () => {
    const token = createReferrerToken(ids.referrer.a, A_ID)
    const [payloadB64, sig] = token.split('.')
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString())
    payload.tid = B_ID
    const forged = Buffer.from(JSON.stringify(payload)).toString('base64') + '.' + sig
    const req = new Request('http://x', { headers: { authorization: `Bearer ${forged}` } })
    const res = await referrerCodeGET(req, { params: Promise.resolve({ code: 'CODEA' }) })
    expect(res.status).toBe(401)
  })

  it("OTP request against tenant A's host for an email that only matches tenant B's referrer row does NOT set an OTP on tenant B's row (cross-tenant email collision)", async () => {
    setAdminSessionFor(A_ID) // sets genuine x-tenant-id/x-tenant-sig for A_ID via env.headers
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ email: 'shared@example.com' }) })
    const res = await referrerAuthRequestPOST(req as unknown as import('next/server').NextRequest)
    expect(res.status).toBe(200) // always {ok:true} — doesn't reveal match/no-match
    const aRow = fake._all('referrers').find((r) => r.id === ids.referrer.a)!
    const bRow = fake._all('referrers').find((r) => r.id === ids.referrer.b)!
    expect(aRow.otp_hash).not.toBeNull() // A's own referrer with that email DID get an OTP
    expect(bRow.otp_hash).toBeNull() // B's referrer (same email, different tenant) stayed untouched
  })

  it("a code minted for tenant B's referrer cannot verify through tenant A's host — scoped lookup finds no row", async () => {
    const code = '123456'
    fake._all('referrers').find((r) => r.id === ids.referrer.b)!.otp_hash = hashOtp(code)
    fake._all('referrers').find((r) => r.id === ids.referrer.b)!.otp_expires_at = new Date(Date.now() + 60_000).toISOString()

    setAdminSessionFor(A_ID)
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ email: 'shared@example.com', code }) })
    const res = await referrerAuthVerifyPOST(req as unknown as import('next/server').NextRequest)
    expect(res.status).toBe(401)
  })

  it("LEAK CONTROL: querying referral_commissions by referrer_id ALONE (no tenant_id filter) would still return only that referrer's rows, but confirms tenant_id is stored and load-bearing for defense-in-depth", async () => {
    const { data } = await supabaseAdmin
      .from('referral_commissions')
      .select('client_name, tenant_id')
      .eq('referrer_id', ids.referrer.b)
    expect((data as { client_name: string; tenant_id: string }[])[0].tenant_id).toBe(B_ID)
  })
})

describe('CROSS-TENANT ATTACK · portal family — /api/portal/services (tenantDb, W3 backlog)', () => {
  it("client A's portal token sees only tenant A's active service types (positive control)", async () => {
    const token = createPortalToken(ids.client.a, A_ID)
    const req = new Request('http://x', { headers: { authorization: `Bearer ${token}` } }) as unknown as import('next/server').NextRequest
    const res = await portalServicesGET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.services.map((s: { id: string }) => s.id)).toEqual(['svc-a'])
    expect(JSON.stringify(body)).not.toContain('confidential')
  })

  it('REJECTS a token whose tid was swapped to tenant B without re-signing (forged token) → 401, no tenant B pricing leak', async () => {
    const token = createPortalToken(ids.client.a, A_ID)
    const [payloadB64, sig] = token.split('.')
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString())
    payload.tid = B_ID
    const forged = Buffer.from(JSON.stringify(payload)).toString('base64') + '.' + sig
    const req = new Request('http://x', { headers: { authorization: `Bearer ${forged}` } }) as unknown as import('next/server').NextRequest
    const res = await portalServicesGET(req)
    expect(res.status).toBe(401)
  })
})

describe('CROSS-TENANT ATTACK · booking family — /api/booking-notes/upload (tenantDb, W3 backlog)', () => {
  it('tenant A uploads a note (image-URL mode) — stamped with tenant A regardless of what the caller sends', async () => {
    setAdminSessionFor(A_ID)
    const formData = new FormData()
    formData.set('booking_id', ids.booking.a)
    formData.set('author_type', 'admin')
    formData.set('author_name', 'Admin A')
    formData.set('content', 'note from A')
    formData.set('image_urls', JSON.stringify(['http://x/img.jpg']))
    const req = new Request('http://x', { method: 'POST', body: formData }) as unknown as import('next/server').NextRequest
    const res = await bookingNotesUploadPOST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tenant_id).toBe(A_ID)
  })

  it('REJECTS the upload entirely with no admin session → 401, before any insert runs', async () => {
    const formData = new FormData()
    formData.set('booking_id', ids.booking.a)
    formData.set('image_urls', JSON.stringify(['http://x/img.jpg']))
    const req = new Request('http://x', { method: 'POST', body: formData }) as unknown as import('next/server').NextRequest
    const res = await bookingNotesUploadPOST(req)
    expect(res.status).toBe(401)
    expect(fake._all('booking_notes').length).toBe(2) // only the two seeded rows — nothing inserted
  })
})

describe('CROSS-TENANT ATTACK · referrer family — /api/referrals/[id] (tenantDb, W3 backlog)', () => {
  it("tenant A PUT on its OWN referral succeeds (positive control)", async () => {
    setAdminSessionFor(A_ID)
    const req = new Request('http://x', { method: 'PUT', body: JSON.stringify({ commission_rate: 0.2 }) })
    const res = await referralPUT(req, { params: Promise.resolve({ id: 'referral-a' }) })
    expect(res.status).toBe(200)
    const aRow = fake._all('referrals').find((r) => r.id === 'referral-a')!
    expect(aRow.commission_rate).toBe(0.2)
  })

  it("tenant A PUT targeting tenant B's referral id mutates nothing — B's row survives untouched", async () => {
    setAdminSessionFor(A_ID)
    const req = new Request('http://x', { method: 'PUT', body: JSON.stringify({ commission_rate: 0.99 }) })
    const res = await referralPUT(req, { params: Promise.resolve({ id: 'referral-b' }) })
    expect(res.status).toBe(500) // scoped update matches 0 rows -> .single() errors, no cross-tenant write
    const bRow = fake._all('referrals').find((r) => r.id === 'referral-b')!
    expect(bRow.commission_rate).toBe(0.15)
  })
})

describe('CROSS-TENANT ATTACK · team-portal family — /api/team-portal/jobs/release (tenantDb, W3 backlog)', () => {
  it("worker A releases their OWN assigned job back to the pool (positive control)", async () => {
    const token = createTeamToken(ids.member.a, A_ID, 20, 'worker')
    const req = new Request('http://x', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ booking_id: 'bk-a-assigned' }),
    })
    const res = await jobsReleasePOST(req)
    expect(res.status).toBe(200)
    const aRow = fake._all('bookings').find((r) => r.id === 'bk-a-assigned')!
    expect(aRow.team_member_id).toBeNull()
    expect(aRow.status).toBe('scheduled')
  })

  it("worker A CANNOT release tenant B's job by passing tenant B's booking_id — the tenant_id filter finds no matching row → 403, B's job stays assigned to worker B", async () => {
    const token = createTeamToken(ids.member.a, A_ID, 20, 'worker')
    const req = new Request('http://x', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ booking_id: 'bk-b-assigned' }),
    })
    const res = await jobsReleasePOST(req)
    expect(res.status).toBe(403)
    const bRow = fake._all('bookings').find((r) => r.id === 'bk-b-assigned')!
    expect(bRow.team_member_id).toBe(ids.member.b)
    expect(bRow.tenant_id).toBe(B_ID)
  })
})

describe('CROSS-TENANT ATTACK · team-portal family — /api/team-portal/jobs/reassign (tenantDb, W3 backlog)', () => {
  it("manager A reassigns tenant A's own open job to another in-tenant worker (positive control)", async () => {
    const token = createTeamToken(ids.member.aManager, A_ID, 30, 'manager')
    const req = new Request('http://x', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ booking_id: ids.booking.aOpen, to_member_id: ids.member.a2 }),
    })
    const res = await jobsReassignPOST(req)
    expect(res.status).toBe(200)
    const aRow = fake._all('bookings').find((r) => r.id === ids.booking.aOpen)!
    expect(aRow.team_member_id).toBe(ids.member.a2)
  })

  it("manager A CANNOT reassign tenant B's job by passing tenant B's booking_id — tenant-scoped lookup finds no row → 404, B's job stays assigned to worker B", async () => {
    const token = createTeamToken(ids.member.aManager, A_ID, 30, 'manager')
    const req = new Request('http://x', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ booking_id: 'bk-b-assigned', to_member_id: ids.member.a2 }),
    })
    const res = await jobsReassignPOST(req)
    expect(res.status).toBe(404)
    const bRow = fake._all('bookings').find((r) => r.id === 'bk-b-assigned')!
    expect(bRow.team_member_id).toBe(ids.member.b)
    expect(bRow.tenant_id).toBe(B_ID)
  })
})

describe('CROSS-TENANT ATTACK · team-portal family — /api/team-portal/availability (tenantDb, W3 backlog)', () => {
  it("worker A reads their OWN blocked dates, not tenant B's (positive control)", async () => {
    const token = createTeamToken(ids.member.a, A_ID, 20, 'worker')
    const req = new Request('http://x', { headers: { authorization: `Bearer ${token}` } }) as unknown as import('next/server').NextRequest
    const res = await availabilityGET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.availability.blocked_dates).toEqual(['2026-08-01'])
  })

  it("worker A's PUT updates only worker A's own team_members row — worker B's notes stay untouched", async () => {
    const token = createTeamToken(ids.member.a, A_ID, 20, 'worker')
    const req = new Request('http://x', {
      method: 'PUT',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ availability: { working_days: [1, 2, 3, 4, 5], blocked_dates: ['2026-08-01'] } }),
    }) as unknown as import('next/server').NextRequest
    const res = await availabilityPUT(req)
    expect(res.status).toBe(200)
    const bRow = fake._all('team_members').find((r) => r.id === ids.member.b)!
    const bNotes = JSON.parse(bRow.notes as string)
    expect(bNotes.availability.blocked_dates).toEqual(['2026-09-01'])
  })
})

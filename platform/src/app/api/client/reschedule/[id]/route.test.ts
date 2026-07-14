/**
 * Client PUT /api/client/reschedule/[id] wrote body.team_member_id straight
 * into the booking's UPDATE with no ownership check, unlike the sibling PUT
 * /api/client/preferred-cleaner which validates the target is an active
 * team_members row in the caller's own tenant. A client who obtained any
 * team_members UUID (own tenant's inactive/terminated staff, or another
 * tenant's if the id ever leaked) could point their booking's team_member_id
 * FK at it. Since embedded PostgREST joins like
 * team_members!bookings_team_member_id_fkey(name/pay_rate) don't auto-scope
 * to the outer table's tenant, this could leak a foreign employee's name/pay
 * rate into this tenant's booking views, and let a client bypass the
 * active-roster gate. Ported from commit 376df9d9 (other worktree), never
 * merged to this branch.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

process.env.PORTAL_SECRET = 'portal-test-secret'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: TENANT_ID, timezone: 'America/New_York', name: 'Test Co' }),
}))

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/notify-team-member', () => ({ notifyTeamMember: vi.fn().mockResolvedValue(undefined) }))

let cookieJar = new Map<string, { value: string }>()
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => cookieJar.get(name),
  }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { createClientSession } from '@/lib/client-auth'
import { PUT } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_ID = 'tenant-1'
const OTHER_TENANT_ID = 'tenant-2'
const CLIENT_ID = 'client-owner'
const BOOKING_ID = 'bk-a'
const ACTIVE_MEMBER_ID = 'tm-a-active'
const INACTIVE_MEMBER_ID = 'tm-a-inactive'
const FOREIGN_MEMBER_ID = 'tm-b-foreign'

function seed() {
  fake._store.clear()
  fake._seed('clients', [
    { id: CLIENT_ID, tenant_id: TENANT_ID, do_not_service: false },
  ])
  fake._seed('bookings', [
    { id: BOOKING_ID, tenant_id: TENANT_ID, client_id: CLIENT_ID, start_time: '2026-08-02T10:00:00.000Z', end_time: '2026-08-02T11:00:00.000Z', clients: { name: 'Owner', email: null, phone: null }, team_members: null },
  ])
  fake._seed('team_members', [
    { id: ACTIVE_MEMBER_ID, tenant_id: TENANT_ID, active: true },
    { id: INACTIVE_MEMBER_ID, tenant_id: TENANT_ID, active: false },
    { id: FOREIGN_MEMBER_ID, tenant_id: OTHER_TENANT_ID, active: true },
  ])
  fake._seed('email_logs', [])
}

function withSession(clientId: string, tenantId: string) {
  cookieJar = new Map([['client_session', { value: createClientSession(clientId, tenantId) }]])
}

function putReq(body: Record<string, unknown>) {
  return PUT(
    new Request(`http://x/api/client/reschedule/${BOOKING_ID}`, { method: 'PUT', body: JSON.stringify(body) }),
    { params: Promise.resolve({ id: BOOKING_ID }) },
  )
}

beforeEach(() => {
  seed()
  withSession(CLIENT_ID, TENANT_ID)
})

describe('PUT /api/client/reschedule/[id] — team_member_id ownership', () => {
  it("rejects reassigning to another tenant's team member — 400, booking untouched", async () => {
    const res = await putReq({ start_time: '2026-08-05T10:00:00.000Z', end_time: '2026-08-05T11:00:00.000Z', team_member_id: FOREIGN_MEMBER_ID })
    expect(res.status).toBe(400)
    const row = fake._store.get('bookings')?.find((r) => r.id === BOOKING_ID)
    expect(row?.team_member_id).toBeFalsy()
  })

  it('rejects reassigning to an inactive team member in the same tenant — 400', async () => {
    const res = await putReq({ start_time: '2026-08-05T10:00:00.000Z', end_time: '2026-08-05T11:00:00.000Z', team_member_id: INACTIVE_MEMBER_ID })
    expect(res.status).toBe(400)
    const row = fake._store.get('bookings')?.find((r) => r.id === BOOKING_ID)
    expect(row?.team_member_id).toBeFalsy()
  })

  it('allows reassigning to an active team member in the same tenant (positive control)', async () => {
    const res = await putReq({ start_time: '2026-08-05T10:00:00.000Z', end_time: '2026-08-05T11:00:00.000Z', team_member_id: ACTIVE_MEMBER_ID })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.team_member_id).toBe(ACTIVE_MEMBER_ID)
  })

  it('allows rescheduling time without touching team_member_id', async () => {
    const res = await putReq({ start_time: '2026-08-05T10:00:00.000Z', end_time: '2026-08-05T11:00:00.000Z' })
    expect(res.status).toBe(200)
  })
})

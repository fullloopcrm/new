import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — client/reschedule/[id]/route.ts (docs/adr/0004).
 * Proves the wrapper's injected .eq('tenant_id') stops a client-portal PUT
 * from finding/mutating a booking that belongs to a foreign tenant, even when
 * that booking id is guessed correctly.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenant: { id: string; timezone: string | null; resend_api_key: string | null; telnyx_api_key: string | null; telnyx_phone: string | null; name: string; email_from: string | null }
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => currentTenant,
}))
vi.mock('@/lib/client-auth', () => ({
  protectClientAPI: async () => ({ clientId: 'client-a' }),
}))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => ({}) }))
vi.mock('@/lib/email', () => ({ sendEmail: async () => ({}) }))
vi.mock('@/lib/notify', () => ({ notify: async () => ({}) }))
vi.mock('@/lib/notify-team-member', () => ({ notifyTeamMember: async () => ({}) }))
vi.mock('@/lib/sms-templates', () => ({ smsJobRescheduled: () => 'job rescheduled' }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplates: () => ({ reschedule: () => 'rescheduled' }) }))

import { supabaseAdmin } from '@/lib/supabase'
import { PUT } from './route'

const A_ID = 'tenant-A'
const B_ID = 'tenant-B'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  currentTenant = { id: A_ID, timezone: 'America/New_York', resend_api_key: null, telnyx_api_key: null, telnyx_phone: null, name: 'Tenant A Co', email_from: null }
  fake._seed('bookings', [
    { id: 'bk-a', tenant_id: A_ID, client_id: 'client-a', start_time: '2026-08-01T10:00:00.000Z', end_time: '2026-08-01T11:00:00.000Z', status: 'confirmed', recurring_type: 'weekly', clients: { name: 'A Client' }, team_members: null },
    { id: 'bk-b', tenant_id: B_ID, client_id: 'client-b', start_time: '2026-08-02T10:00:00.000Z', end_time: '2026-08-02T11:00:00.000Z', status: 'confirmed', recurring_type: 'weekly', clients: { name: 'B Client' }, team_members: null },
  ])
  fake._seed('email_logs', [])
  fake._seed('team_members', [
    { id: 'tm-a-active', tenant_id: A_ID, active: true },
    { id: 'tm-a-inactive', tenant_id: A_ID, active: false },
    { id: 'tm-b', tenant_id: B_ID, active: true },
  ])
})

function putReq(body: Record<string, unknown>): Request {
  return new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })
}
function paramsFor(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

describe('client/reschedule PUT — tenantDb isolation', () => {
  it("tenant A rescheduling its OWN booking succeeds (positive control)", async () => {
    const res = await PUT(putReq({ start_time: '2026-08-05T10:00:00.000Z', end_time: '2026-08-05T11:00:00.000Z' }), paramsFor('bk-a'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.start_time).toBe('2026-08-05T10:00:00.000Z')
  })

  it("tenant A CANNOT reschedule tenant B's booking by guessing its id — 404, B's row survives untouched", async () => {
    const res = await PUT(putReq({ start_time: '2026-09-01T00:00:00.000Z' }), paramsFor('bk-b'))
    expect(res.status).toBe(404)
    const bRow = fake._all('bookings').find((r) => r.id === 'bk-b')!
    expect(bRow.start_time).toBe('2026-08-02T10:00:00.000Z')
  })

  it("LEAK CONTROL: fetching bookings by id ALONE (no tenant_id filter) WOULD find tenant B's booking — proves the route's tenantDb scoping above is load-bearing", async () => {
    const { data } = await supabaseAdmin.from('bookings').select('*').eq('id', 'bk-b').maybeSingle()
    expect((data as { tenant_id: string } | null)?.tenant_id).toBe(B_ID)
  })

  it("client CANNOT reassign their own booking to another tenant's team member — 400, team_member_id untouched", async () => {
    const res = await PUT(putReq({ start_time: '2026-08-05T10:00:00.000Z', end_time: '2026-08-05T11:00:00.000Z', team_member_id: 'tm-b' }), paramsFor('bk-a'))
    expect(res.status).toBe(400)
    const aRow = fake._all('bookings').find((r) => r.id === 'bk-a')!
    expect(aRow.team_member_id).toBeFalsy()
  })

  it("client CANNOT reassign to an inactive team member in their own tenant — 400", async () => {
    const res = await PUT(putReq({ start_time: '2026-08-05T10:00:00.000Z', end_time: '2026-08-05T11:00:00.000Z', team_member_id: 'tm-a-inactive' }), paramsFor('bk-a'))
    expect(res.status).toBe(400)
  })

  it("client CAN reassign to an active team member in their own tenant (positive control)", async () => {
    const res = await PUT(putReq({ start_time: '2026-08-05T10:00:00.000Z', end_time: '2026-08-05T11:00:00.000Z', team_member_id: 'tm-a-active' }), paramsFor('bk-a'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.team_member_id).toBe('tm-a-active')
  })
})

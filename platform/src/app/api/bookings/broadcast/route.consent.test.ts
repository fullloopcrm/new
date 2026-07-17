import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * bookings/broadcast/route.ts sent the "URGENT JOB AVAILABLE" broadcast SMS
 * to every active team member with zero sms_consent check — the one place
 * in the codebase that pages the whole roster for an emergency job ignored
 * the STOP-webhook opt-out that every other team-facing SMS site respects
 * (notifyTeamMember, team-portal/running-late, etc).
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenantId: string
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: currentTenantId }, error: null }),
}))
const sendSMSSpy = vi.fn(async (opts: { to: string }) => ({}))
vi.mock('@/lib/sms', () => ({ sendSMS: (opts: { to: string }) => sendSMSSpy(opts) }))
vi.mock('@/lib/sms-templates', () => ({ smsUrgentBroadcast: () => 'sms body' }))
vi.mock('@/lib/notify', () => ({ notify: async () => ({}) }))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const TENANT_ID = 'tenant-a'
const BOOKING_ID = 'bk-a'
const fake = supabaseAdmin as unknown as FakeSupabase

function postReq(): Request {
  return new Request('http://x', { method: 'POST', body: JSON.stringify({ booking_id: BOOKING_ID }) })
}

beforeEach(() => {
  fake._store.clear()
  sendSMSSpy.mockClear()
  currentTenantId = TENANT_ID
  fake._seed('tenants', [
    { id: TENANT_ID, name: 'Tenant Co', telnyx_api_key: 'key-a', telnyx_phone: '+15550000001', resend_api_key: null, primary_color: null },
  ])
  fake._seed('bookings', [
    { id: BOOKING_ID, tenant_id: TENANT_ID, start_time: '2026-08-01T10:00:00.000Z', end_time: null, pay_rate: 45, service_type: 'Deep Clean', notes: null, clients: { name: 'Client', address: 'Addr' } },
  ])
  fake._seed('team_members', [
    { id: 'tm-opted-in', tenant_id: TENANT_ID, name: 'Opted In', phone: '+15551110001', email: 'in@x.com', status: 'active', sms_consent: true },
    { id: 'tm-opted-out', tenant_id: TENANT_ID, name: 'Opted Out', phone: '+15551110002', email: 'out@x.com', status: 'active', sms_consent: false },
    { id: 'tm-unset', tenant_id: TENANT_ID, name: 'Unset', phone: '+15551110003', email: 'unset@x.com', status: 'active' },
  ])
})

describe('bookings/broadcast POST — sms_consent gate', () => {
  it('does not SMS a team member who opted out, but still SMSes consenting/unset members', async () => {
    const res = await POST(postReq())
    const body = await res.json()
    expect(res.status).toBe(200)

    const smsedPhones = sendSMSSpy.mock.calls.map(c => c[0].to)
    expect(smsedPhones).toContain('+15551110001')
    expect(smsedPhones).toContain('+15551110003')
    expect(smsedPhones).not.toContain('+15551110002')

    const outReport = body.reports.find((r: { name: string }) => r.name === 'Opted Out')
    expect(outReport.sms).toBe(false)
  })
})

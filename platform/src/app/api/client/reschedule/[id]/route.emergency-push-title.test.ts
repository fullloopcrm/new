import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * PUT /api/client/reschedule/[id]'s team-member notifyTeamMember() call
 * hardcoded a generic 'Job Rescheduled' title/message and never passed
 * isEmergency, even when this exact route's own becomesEmergency logic
 * (see route.emergency-rate.test.ts) had just flagged the booking as a
 * same-day emergency a few lines above. Combined with
 * notify-team-member.emergency-quiet-hours.test.ts's fix, an assigned
 * tech whose routine job just got moved into a same-day emergency by the
 * client got a generic push notification that quiet hours could — and
 * did — silently drop overnight. Proves the call site now threads
 * isEmergency + an urgency-aware title/message through.
 */

const { notifyTeamMemberMock } = vi.hoisted(() => ({
  notifyTeamMemberMock: vi.fn(async (..._args: unknown[]) => ({})),
}))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})
let currentTenant: { id: string; timezone: string | null; resend_api_key: string | null; telnyx_api_key: string | null; telnyx_phone: string | null; name: string; email_from: string | null; selena_config?: { emergency_available?: boolean; emergency_rate?: number } | null }
vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => currentTenant }))
vi.mock('@/lib/client-auth', () => ({ protectClientAPI: async () => ({ clientId: 'client-push' }) }))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => ({}) }))
vi.mock('@/lib/email', () => ({ sendEmail: async () => ({}) }))
vi.mock('@/lib/notify', () => ({ notify: async () => ({}) }))
vi.mock('@/lib/notify-team-member', () => ({ notifyTeamMember: notifyTeamMemberMock }))
vi.mock('@/lib/sms-templates', () => ({ smsJobRescheduled: () => 'job rescheduled' }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplates: () => ({ reschedule: () => 'rescheduled' }) }))

import { supabaseAdmin } from '@/lib/supabase'
import { PUT } from './route'

const TENANT_ID = 'tenant-push'
const CLIENT_ID = 'client-push'
const MEMBER_ID = 'tm-push'
const fake = supabaseAdmin as unknown as FakeSupabase

function todayStr(): string {
  return new Date().toLocaleDateString('en-CA')
}
function putReq(body: Record<string, unknown>): Request {
  return new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })
}
function paramsFor(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}
async function flush() {
  await new Promise((r) => setTimeout(r, 0))
}

beforeEach(() => {
  fake._store.clear()
  notifyTeamMemberMock.mockClear()
  currentTenant = { id: TENANT_ID, timezone: 'America/New_York', resend_api_key: null, telnyx_api_key: null, telnyx_phone: null, name: 'Tenant Co', email_from: null, selena_config: { emergency_available: true, emergency_rate: 130 } }
  fake._seed('email_logs', [])
})

describe('client reschedule PUT — team-member push title/isEmergency wiring', () => {
  it('rescheduling an assigned booking to TODAY passes isEmergency:true and an urgent title/message to notifyTeamMember', async () => {
    fake._seed('bookings', [
      { id: 'bk-push-1', tenant_id: TENANT_ID, client_id: CLIENT_ID, team_member_id: MEMBER_ID, start_time: '2099-01-15T10:00:00.000Z', end_time: '2099-01-15T12:00:00.000Z', hourly_rate: 75, price: 15000, is_emergency: false, clients: { name: 'A Client' }, team_members: null },
    ])
    const res = await PUT(putReq({ start_time: `${todayStr()}T14:00:00.000Z`, end_time: `${todayStr()}T16:00:00.000Z` }), paramsFor('bk-push-1'))
    expect(res.status).toBe(200)
    await flush()

    expect(notifyTeamMemberMock).toHaveBeenCalledTimes(1)
    const call = notifyTeamMemberMock.mock.calls[0]?.[0] as Record<string, unknown>
    expect(call.isEmergency).toBe(true)
    expect(call.title).toBe('🚨 Job Rescheduled — Now Urgent')
    expect(call.message).toContain('urgent')
  })

  it('rescheduling to a future date (control) passes isEmergency:false and the generic title', async () => {
    fake._seed('bookings', [
      { id: 'bk-push-2', tenant_id: TENANT_ID, client_id: CLIENT_ID, team_member_id: MEMBER_ID, start_time: '2099-01-15T10:00:00.000Z', end_time: '2099-01-15T12:00:00.000Z', hourly_rate: 75, price: 15000, is_emergency: false, clients: { name: 'A Client' }, team_members: null },
    ])
    const res = await PUT(putReq({ start_time: '2099-02-01T10:00:00.000Z', end_time: '2099-02-01T12:00:00.000Z' }), paramsFor('bk-push-2'))
    expect(res.status).toBe(200)
    await flush()

    expect(notifyTeamMemberMock).toHaveBeenCalledTimes(1)
    const call = notifyTeamMemberMock.mock.calls[0]?.[0] as Record<string, unknown>
    expect(call.isEmergency).toBe(false)
    expect(call.title).toBe('Job Rescheduled')
  })
})

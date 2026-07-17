import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Same billing-gap archetype as P11.8 (POST /api/client/book), P11.16/17
 * (AI/SMS create_booking), and the portal self-book fix (POST
 * /api/portal/bookings): PUT /api/client/reschedule/[id] — the client-facing
 * reschedule endpoint — only ever wrote start_time/end_time/team_member_id.
 * A client could book routine service for next week (routine rate,
 * is_emergency=false), then use THIS endpoint to move it to today, and the
 * row's price/is_emergency were never re-evaluated: it stayed billed at the
 * routine rate and invisible to every is_emergency-reading consumer. This
 * proves the fix.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenant: { id: string; timezone: string | null; resend_api_key: string | null; telnyx_api_key: string | null; telnyx_phone: string | null; name: string; email_from: string | null; selena_config?: { emergency_available?: boolean; emergency_rate?: number } | null }
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => currentTenant,
}))
vi.mock('@/lib/client-auth', () => ({
  protectClientAPI: async () => ({ clientId: 'client-emergency' }),
}))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => ({}) }))
vi.mock('@/lib/email', () => ({ sendEmail: async () => ({}) }))
vi.mock('@/lib/notify', () => ({ notify: async () => ({}) }))
vi.mock('@/lib/notify-team-member', () => ({ notifyTeamMember: async () => ({}) }))
vi.mock('@/lib/sms-templates', () => ({ smsJobRescheduled: () => 'job rescheduled' }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplates: () => ({ reschedule: () => 'rescheduled' }) }))

import { supabaseAdmin } from '@/lib/supabase'
import { PUT } from './route'

const TENANT_ID = 'tenant-emergency'
const CLIENT_ID = 'client-emergency'
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

beforeEach(() => {
  fake._store.clear()
  currentTenant = { id: TENANT_ID, timezone: 'America/New_York', resend_api_key: null, telnyx_api_key: null, telnyx_phone: null, name: 'Tenant Co', email_from: null, selena_config: { emergency_available: true, emergency_rate: 130 } }
  fake._seed('bookings', [
    { id: 'bk-1', tenant_id: TENANT_ID, client_id: CLIENT_ID, start_time: '2099-01-15T10:00:00.000Z', end_time: '2099-01-15T12:00:00.000Z', status: 'confirmed', recurring_type: 'weekly', hourly_rate: 75, price: 15000, is_emergency: false, clients: { name: 'A Client' }, team_members: null },
  ])
  fake._seed('email_logs', [])
})

describe('client reschedule PUT — rescheduling to today applies the configured emergency_rate', () => {
  it('rescheduling a routine future booking to TODAY overrides hourly_rate/price to the configured emergency_rate and flags is_emergency', async () => {
    const res = await PUT(putReq({ start_time: `${todayStr()}T14:00:00.000Z`, end_time: `${todayStr()}T16:00:00.000Z` }), paramsFor('bk-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.is_emergency).toBe(true)
    expect(body.hourly_rate).toBe(130)
    expect(body.price).toBe(130 * 2 * 100)
  })

  it('rescheduling to today with NO emergency_rate configured still flags is_emergency but keeps the original rate', async () => {
    currentTenant.selena_config = null
    const res = await PUT(putReq({ start_time: `${todayStr()}T14:00:00.000Z`, end_time: `${todayStr()}T16:00:00.000Z` }), paramsFor('bk-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.is_emergency).toBe(true)
    expect(body.hourly_rate).toBe(75)
    expect(body.price).toBe(15000)
  })

  it('rescheduling to a future date leaves is_emergency false and the rate untouched (control)', async () => {
    const res = await PUT(putReq({ start_time: '2099-02-01T10:00:00.000Z', end_time: '2099-02-01T12:00:00.000Z' }), paramsFor('bk-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.is_emergency).toBe(false)
    expect(body.hourly_rate).toBe(75)
    expect(body.price).toBe(15000)
  })

  it('a team-member-only reassignment (no start_time in the body) never touches pricing or is_emergency', async () => {
    fake._seed('team_members', [{ id: 'tm-a', tenant_id: TENANT_ID, active: true }])
    const res = await PUT(putReq({ team_member_id: 'tm-a' }), paramsFor('bk-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.team_member_id).toBe('tm-a')
    expect(body.is_emergency).toBe(false)
    expect(body.hourly_rate).toBe(75)
    expect(body.price).toBe(15000)
  })

  // "Today" must be computed in the tenant's OWN timezone (the `tz` local
  // already used for oldDate/oldTime two lines above the fix), not the
  // server runtime's default (UTC on Vercel). A Pacific tenant's local
  // evening rolls into the next UTC calendar day hours before local
  // midnight — comparing raw UTC calendar-date substrings silently missed
  // same-day emergencies during that window.
  describe('day-boundary is computed in the tenant timezone, not the server default', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('rescheduling a Pacific tenant booking to tomorrow morning is NOT flagged emergency, even though UTC has already rolled to that calendar date', async () => {
      // 7:30pm PDT on July 17 = 2026-07-18T02:30:00Z -- UTC day is already July 18.
      vi.setSystemTime(new Date('2026-07-18T02:30:00.000Z'))
      currentTenant.timezone = 'America/Los_Angeles'
      const res = await PUT(putReq({ start_time: '2026-07-18T08:00:00-07:00', end_time: '2026-07-18T10:00:00-07:00' }), paramsFor('bk-1'))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.is_emergency).toBe(false)
      expect(body.hourly_rate).toBe(75)
      expect(body.price).toBe(15000)
    })

    it('rescheduling a Pacific tenant booking to later the same evening IS flagged emergency at that same real moment', async () => {
      vi.setSystemTime(new Date('2026-07-18T02:30:00.000Z'))
      currentTenant.timezone = 'America/Los_Angeles'
      const res = await PUT(putReq({ start_time: '2026-07-17T21:00:00-07:00', end_time: '2026-07-17T23:00:00-07:00' }), paramsFor('bk-1'))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.is_emergency).toBe(true)
      expect(body.hourly_rate).toBe(130)
    })
  })
})

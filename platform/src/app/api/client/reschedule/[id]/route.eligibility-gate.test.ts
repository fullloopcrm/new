import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Fresh ground in the destructive-op-no-server-guard thread (items
 * 118/122/123/124): PUT /api/client/reschedule/[id] backs all four
 * consumer-facing reschedule pages (site/book, wash-and-fold-hoboken,
 * wash-and-fold-nyc, the-florida-maid). Every one of them computes an
 * identical client-side canReschedule() gate — one-time bookings can never
 * be rescheduled, recurring ones need 7+ days notice — purely to decide
 * whether the "Reschedule" button/page renders. None of it was ever
 * enforced on this route, and the route never checked booking status
 * either, so a client hitting it directly could jump the notice window,
 * reschedule a one-time booking, or silently move a cancelled booking's
 * date forward (status untouched, so it stayed invisible to admin —
 * bookings queries filter .neq('status','cancelled')) while believing the
 * reschedule succeeded. Proves the ported guard.
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
  protectClientAPI: async () => ({ clientId: 'client-gate' }),
}))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => ({}) }))
vi.mock('@/lib/email', () => ({ sendEmail: async () => ({}) }))
vi.mock('@/lib/notify', () => ({ notify: async () => ({}) }))
vi.mock('@/lib/notify-team-member', () => ({ notifyTeamMember: async () => ({}) }))
vi.mock('@/lib/sms-templates', () => ({ smsJobRescheduled: () => 'job rescheduled' }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplates: () => ({ reschedule: () => 'rescheduled' }) }))

import { supabaseAdmin } from '@/lib/supabase'
import { PUT } from './route'

const TENANT_ID = 'tenant-gate'
const CLIENT_ID = 'client-gate'
const fake = supabaseAdmin as unknown as FakeSupabase

function futureIso(daysFromNow: number): string {
  return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString()
}
function putReq(body: Record<string, unknown>): Request {
  return new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })
}
function paramsFor(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  fake._store.clear()
  currentTenant = { id: TENANT_ID, timezone: 'America/New_York', resend_api_key: null, telnyx_api_key: null, telnyx_phone: null, name: 'Tenant Co', email_from: null }
  fake._seed('email_logs', [])
})

describe('client reschedule PUT — server-side eligibility gate', () => {
  it('rejects rescheduling a one-time (non-recurring) booking — 400, row untouched', async () => {
    const originalStart = futureIso(30)
    fake._seed('bookings', [
      { id: 'bk-one-time', tenant_id: TENANT_ID, client_id: CLIENT_ID, start_time: originalStart, end_time: originalStart, status: 'confirmed', recurring_type: null, clients: { name: 'A Client' }, team_members: null },
    ])
    const res = await PUT(putReq({ start_time: futureIso(35), end_time: futureIso(35) }), paramsFor('bk-one-time'))
    expect(res.status).toBe(400)
    const row = fake._all('bookings').find((r) => r.id === 'bk-one-time')!
    expect(row.start_time).toBe(originalStart)
  })

  it('rejects rescheduling a recurring booking inside the 7-day notice window — 400', async () => {
    fake._seed('bookings', [
      { id: 'bk-too-soon', tenant_id: TENANT_ID, client_id: CLIENT_ID, start_time: futureIso(3), end_time: futureIso(3), status: 'confirmed', recurring_type: 'weekly', clients: { name: 'A Client' }, team_members: null },
    ])
    const res = await PUT(putReq({ start_time: futureIso(10), end_time: futureIso(10) }), paramsFor('bk-too-soon'))
    expect(res.status).toBe(400)
  })

  it('allows rescheduling a recurring booking that is 7+ days out (positive control)', async () => {
    fake._seed('bookings', [
      { id: 'bk-ok', tenant_id: TENANT_ID, client_id: CLIENT_ID, start_time: futureIso(10), end_time: futureIso(10), status: 'confirmed', recurring_type: 'weekly', clients: { name: 'A Client' }, team_members: null },
    ])
    const res = await PUT(putReq({ start_time: futureIso(20), end_time: futureIso(20) }), paramsFor('bk-ok'))
    expect(res.status).toBe(200)
  })

  it('rejects rescheduling a completed booking — 400, row untouched (money-integrity: prevents a completed job from being silently moved)', async () => {
    const originalStart = futureIso(-2)
    fake._seed('bookings', [
      { id: 'bk-completed', tenant_id: TENANT_ID, client_id: CLIENT_ID, start_time: originalStart, end_time: originalStart, status: 'completed', recurring_type: 'weekly', clients: { name: 'A Client' }, team_members: null },
    ])
    const res = await PUT(putReq({ start_time: futureIso(30), end_time: futureIso(30) }), paramsFor('bk-completed'))
    expect(res.status).toBe(400)
    const row = fake._all('bookings').find((r) => r.id === 'bk-completed')!
    expect(row.start_time).toBe(originalStart)
  })

  it('rejects rescheduling an already-cancelled booking — 400, so it cannot be silently resurrected with a new date while status stays cancelled', async () => {
    fake._seed('bookings', [
      { id: 'bk-cancelled', tenant_id: TENANT_ID, client_id: CLIENT_ID, start_time: futureIso(20), end_time: futureIso(20), status: 'cancelled', recurring_type: 'weekly', clients: { name: 'A Client' }, team_members: null },
    ])
    const res = await PUT(putReq({ start_time: futureIso(30), end_time: futureIso(30) }), paramsFor('bk-cancelled'))
    expect(res.status).toBe(400)
  })

  it('a team-member-only reassignment (no start_time/end_time in the body) is never subject to the reschedule gate, even on an ineligible booking', async () => {
    fake._seed('bookings', [
      { id: 'bk-reassign', tenant_id: TENANT_ID, client_id: CLIENT_ID, start_time: futureIso(1), end_time: futureIso(1), status: 'confirmed', recurring_type: null, clients: { name: 'A Client' }, team_members: null },
    ])
    fake._seed('team_members', [{ id: 'tm-gate', tenant_id: TENANT_ID, active: true }])
    const res = await PUT(putReq({ team_member_id: 'tm-gate' }), paramsFor('bk-reassign'))
    expect(res.status).toBe(200)
  })
})

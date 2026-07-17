import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Item (26): extending item (7)/P11.22's fix. That fix ported is_emergency/
 * pay_rate into jobAssignment()'s signature and wired it into the ONE call
 * site that existed then — the lead-assignment path in the main
 * /api/bookings/[id] PUT route. This route (multi-tech "extras" management,
 * added after item 7 landed) has its own separate jobAssignment() call site
 * that never got the same wiring, even though the booking row it already
 * fetches (`select('*, clients(*)')`) has both fields on it. Net effect: on
 * a multi-tech emergency job, the LEAD's SMS says "URGENT —" with the pay
 * premium; every EXTRA team member added alongside them gets a byte-identical
 * SMS to a routine job — no urgency signal, no premium-pay line, and no
 * emergency marker on the in-app/push notification title either. Proves the
 * fix: both fields now flow through to the real jobAssignment() template
 * output, and the push title gets the same 🚨 convention items (20)/(24)/
 * P11.27 already established elsewhere.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenantId: string
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: currentTenantId, role: 'owner' }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

const notifyCalls: Array<{ title: string; smsMessage?: string }> = []
vi.mock('@/lib/notify-team', () => ({
  notifyTeamMember: async (opts: { title: string; smsMessage?: string }) => {
    notifyCalls.push({ title: opts.title, smsMessage: opts.smsMessage })
    return { teamMemberName: 'Extra Tech', email: false, sms: true, inApp: true, quietHours: false }
  },
  formatDeliveryReport: () => 'sent',
}))

import { supabaseAdmin } from '@/lib/supabase'
import { PUT } from './route'

const TENANT_ID = 'tenant-emergency-team'
const BOOKING_ID = 'bk-emergency-team'
const fake = supabaseAdmin as unknown as FakeSupabase

function paramsFor(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

function seed(isEmergency: boolean) {
  fake._store.clear()
  notifyCalls.length = 0
  currentTenantId = TENANT_ID
  fake._seed('bookings', [
    {
      id: BOOKING_ID,
      tenant_id: TENANT_ID,
      team_member_id: 'tm-lead',
      team_size: 1,
      start_time: '2099-01-15T14:00:00.000Z',
      hourly_rate: 75,
      pay_rate: 130,
      is_emergency: isEmergency,
      clients: { name: 'A Client' },
    },
  ])
  fake._seed('booking_team_members', [
    { tenant_id: TENANT_ID, booking_id: BOOKING_ID, team_member_id: 'tm-lead', is_lead: true, position: 1 },
  ])
  fake._seed('tenants', [
    { id: TENANT_ID, name: 'Acme Plumbing', slug: 'acme-plumbing', industry: 'plumbing' },
  ])
  fake._seed('team_members', [
    { id: 'tm-lead', tenant_id: TENANT_ID, active: true },
    { id: 'tm-extra', tenant_id: TENANT_ID, active: true, name: 'Extra Tech', pin: '1234' },
  ])
}

describe('bookings/[id]/team PUT — extras SMS/push now carry emergency status (item 26)', () => {
  it('an extra added to an EMERGENCY job gets "URGENT —" + the pay premium in their SMS, and a 🚨 push title', async () => {
    seed(true)
    const req = new Request('http://x', {
      method: 'PUT',
      body: JSON.stringify({ lead_id: 'tm-lead', extra_team_member_ids: ['tm-extra'], team_size: 2 }),
    })
    const res = await PUT(req, paramsFor(BOOKING_ID))
    expect(res.status).toBe(200)

    expect(notifyCalls).toHaveLength(1)
    expect(notifyCalls[0].smsMessage).toContain('URGENT —')
    expect(notifyCalls[0].smsMessage).toContain('Pay: $130/hr')
    expect(notifyCalls[0].title).toBe('🚨 Added to Emergency Team Job')
  })

  it('an extra added to a ROUTINE job gets a plain SMS/push, no urgency wording (control)', async () => {
    seed(false)
    const req = new Request('http://x', {
      method: 'PUT',
      body: JSON.stringify({ lead_id: 'tm-lead', extra_team_member_ids: ['tm-extra'], team_size: 2 }),
    })
    const res = await PUT(req, paramsFor(BOOKING_ID))
    expect(res.status).toBe(200)

    expect(notifyCalls).toHaveLength(1)
    expect(notifyCalls[0].smsMessage).not.toContain('URGENT')
    expect(notifyCalls[0].smsMessage).not.toContain('Pay: $130/hr')
    expect(notifyCalls[0].title).toBe('Added to Team Job')
  })
})

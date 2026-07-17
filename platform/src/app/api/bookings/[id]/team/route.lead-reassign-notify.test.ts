import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Item (97): this route updates bookings.team_member_id (the lead) directly
 * and never actually goes through /api/bookings/[id] PUT, despite this
 * file's own former header comment claiming "lead is handled by the main
 * PUT path" — so swapping a booking's lead here notified neither the
 * outgoing lead nor the incoming one; only newly-added extras were ever
 * notified. Proves: a lead swap now SMS/pushes both the outgoing lead
 * (removed) and the incoming lead (assigned), a first-time lead assignment
 * (no prior lead) only notifies the incoming lead, an explicit unassign
 * (lead_id: null) only notifies the outgoing lead, and a no-op (lead
 * unchanged) notifies neither.
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

const notifyCalls: Array<{ teamMemberId: string; type: string; title: string; smsMessage?: string }> = []
vi.mock('@/lib/notify-team-member', () => ({
  notifyTeamMember: async (opts: { teamMemberId: string; type: string; title: string; smsMessage?: string }) => {
    notifyCalls.push({ teamMemberId: opts.teamMemberId, type: opts.type, title: opts.title, smsMessage: opts.smsMessage })
    return { memberName: 'Tech', push: true, email: false, sms: true, inApp: true, quietHours: false }
  },
  formatDeliveryReport: () => 'sent',
}))

import { supabaseAdmin } from '@/lib/supabase'
import { PUT } from './route'

const TENANT_ID = 'tenant-lead-reassign'
const BOOKING_ID = 'bk-lead-reassign'
const OLD_LEAD_ID = 'tm-old-lead'
const NEW_LEAD_ID = 'tm-new-lead'
const fake = supabaseAdmin as unknown as FakeSupabase

function paramsFor(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

function putReq(body: Record<string, unknown>) {
  return PUT(
    new Request('http://x', { method: 'PUT', body: JSON.stringify(body) }),
    paramsFor(BOOKING_ID),
  )
}

function seed(existingLeadId: string | null) {
  fake._store.clear()
  notifyCalls.length = 0
  currentTenantId = TENANT_ID
  fake._seed('bookings', [
    {
      id: BOOKING_ID,
      tenant_id: TENANT_ID,
      team_member_id: existingLeadId,
      team_size: 1,
      start_time: '2099-01-15T14:00:00.000Z',
      clients: { name: 'A Client' },
    },
  ])
  fake._seed(
    'booking_team_members',
    existingLeadId
      ? [{ tenant_id: TENANT_ID, booking_id: BOOKING_ID, team_member_id: existingLeadId, is_lead: true, position: 1 }]
      : [],
  )
  fake._seed('tenants', [{ id: TENANT_ID, name: 'Acme Plumbing', slug: 'acme-plumbing', industry: 'plumbing' }])
  fake._seed('team_members', [
    { id: OLD_LEAD_ID, tenant_id: TENANT_ID, active: true, name: 'Old Lead' },
    { id: NEW_LEAD_ID, tenant_id: TENANT_ID, active: true, name: 'New Lead' },
  ])
}

describe('bookings/[id]/team PUT — lead reassignment now notifies both sides (item 97)', () => {
  it('a true lead swap notifies BOTH the outgoing lead (removed) and the incoming lead (assigned)', async () => {
    seed(OLD_LEAD_ID)
    const res = await putReq({ lead_id: NEW_LEAD_ID, extra_team_member_ids: [], team_size: 1 })
    expect(res.status).toBe(200)

    const recipients = notifyCalls.map((c) => c.teamMemberId)
    expect(recipients).toContain(OLD_LEAD_ID)
    expect(recipients).toContain(NEW_LEAD_ID)
    const removal = notifyCalls.find((c) => c.teamMemberId === OLD_LEAD_ID)
    expect(removal?.type).toBe('job_cancelled')
    const assignment = notifyCalls.find((c) => c.teamMemberId === NEW_LEAD_ID)
    expect(assignment?.type).toBe('job_assignment')
  })

  it('a first-time lead assignment (no prior lead) only notifies the incoming lead', async () => {
    seed(null)
    const res = await putReq({ lead_id: NEW_LEAD_ID, extra_team_member_ids: [], team_size: 1 })
    expect(res.status).toBe(200)

    const recipients = notifyCalls.map((c) => c.teamMemberId)
    expect(recipients).not.toContain(OLD_LEAD_ID)
    expect(recipients).toContain(NEW_LEAD_ID)
  })

  it('an explicit unassign (lead_id: null) only notifies the outgoing lead', async () => {
    seed(OLD_LEAD_ID)
    const res = await putReq({ lead_id: null, extra_team_member_ids: [], team_size: 1 })
    expect(res.status).toBe(200)

    const recipients = notifyCalls.map((c) => c.teamMemberId)
    expect(recipients).toContain(OLD_LEAD_ID)
    expect(recipients).not.toContain(NEW_LEAD_ID)
    const removal = notifyCalls.find((c) => c.teamMemberId === OLD_LEAD_ID)
    expect(removal?.smsMessage).toMatch(/removed/i)
  })

  it('an unchanged lead notifies no one (control)', async () => {
    seed(OLD_LEAD_ID)
    const res = await putReq({ lead_id: OLD_LEAD_ID, extra_team_member_ids: [], team_size: 1 })
    expect(res.status).toBe(200)
    expect(notifyCalls).toHaveLength(0)
  })
})

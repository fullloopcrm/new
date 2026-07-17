import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/routes/[id]/publish — never checked team_members.sms_consent
 * before texting a full day's client names/addresses to the assigned
 * driver's phone (P1/W2 fresh-ground, same missing-check shape as this
 * route's own terminated-crew guard, one column over).
 *
 * team_members.sms_consent is a real, crew-editable column since the
 * team-portal/preferences fix — a crew member who revoked SMS consent still
 * got their full route texted every time an admin clicked "Publish", since
 * SMS is this route's only delivery mechanism (no in-app/email fallback).
 *
 * FIX: 400s with a clear error (same shape as the existing "no phone number"
 * 400 immediately above it) when the assigned team member's sms_consent is
 * false, instead of sending unconditionally.
 */

const CTX_TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'], h: null as null | Harness }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: CTX_TENANT,
      tenant: { id: CTX_TENANT },
      role: 'owner',
    })),
  }
})

vi.mock('@/lib/hr', () => ({ getTerminatedTeamMemberIds: vi.fn(async () => []) }))

const sendSMS = vi.fn(async (_args: Record<string, unknown>) => ({ sent: true }))
vi.mock('@/lib/sms', () => ({ sendSMS: (args: Record<string, unknown>) => sendSMS(args) }))

import { POST } from './route'

function seed() {
  return {
    routes: [
      {
        id: 'route-blocked',
        tenant_id: CTX_TENANT,
        route_date: '2026-08-01',
        status: 'draft',
        stops: [],
        team_member_id: 'tm-blocked',
        team_members: { id: 'tm-blocked', name: 'Blocked Crew', phone: '+15550001111', sms_consent: false },
      },
      {
        id: 'route-control',
        tenant_id: CTX_TENANT,
        route_date: '2026-08-01',
        status: 'draft',
        stops: [],
        team_member_id: 'tm-control',
        team_members: { id: 'tm-control', name: 'Control Crew', phone: '+15550002222', sms_consent: true },
      },
    ] as Record<string, unknown>[],
    tenants: [{ id: CTX_TENANT, name: 'Acme', telnyx_api_key: 'plaintext-key', telnyx_phone: '+15551234567' }],
    hr_employee_profiles: [],
  }
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  holder.h = h
  sendSMS.mockClear()
})

describe('routes/[id]/publish POST — sms_consent gate', () => {
  it('BLOCKED: publishing to a crew member who revoked sms_consent 400s, no SMS sent', async () => {
    const res = await POST({} as Request, ctx('route-blocked'))
    expect(res.status).toBe(400)
    expect(sendSMS).not.toHaveBeenCalled()
    expect(h.capture.updates.find((u) => u.table === 'routes')).toBeUndefined()
  })

  it('CONTROL: publishing to a consented crew member still sends the SMS', async () => {
    const res = await POST({} as Request, ctx('route-control'))
    expect(res.status).toBe(200)
    expect(sendSMS).toHaveBeenCalledTimes(1)
    const update = h.capture.updates.find((u) => u.table === 'routes')!
    expect(update.values.status).toBe('published')
  })
})

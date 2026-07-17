import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/routes/[id]/publish — terminated-crew guard (P1/W2 fresh-ground).
 *
 * The POST/PATCH /api/routes fixes (same round) block *assigning* a
 * terminated team member to a route, but a route assigned while its driver
 * was still active can sit in 'draft' for days before publish -- and publish
 * is the action that actually SMS-texts a full day's client names and
 * addresses to that phone number, using the tenant's own Telnyx account.
 * A termination after assignment but before publish was never caught here.
 * Same "doesn't retroactively unassign, must gate at use-time too" reasoning
 * as the team-portal token check (af2ec97d).
 *
 * FIX: re-check getTerminatedTeamMemberIds on the route's assigned team
 * member right before the SMS send.
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

const sendSMS = vi.fn(async (_args: Record<string, unknown>) => ({ sent: true }))
vi.mock('@/lib/sms', () => ({ sendSMS: (args: Record<string, unknown>) => sendSMS(args) }))

import { POST } from './route'

function seed() {
  return {
    routes: [
      {
        id: 'route-a',
        tenant_id: CTX_TENANT,
        route_date: '2026-08-01',
        status: 'draft',
        stops: [],
        team_member_id: 'tm-terminated',
        team_members: { id: 'tm-terminated', name: 'Let Go Larry', phone: '+15550001111' },
      },
      {
        id: 'route-b',
        tenant_id: CTX_TENANT,
        route_date: '2026-08-01',
        status: 'draft',
        stops: [],
        team_member_id: 'tm-active',
        team_members: { id: 'tm-active', name: 'Active Amy', phone: '+15550002222' },
      },
    ] as Record<string, unknown>[],
    tenants: [{ id: CTX_TENANT, name: 'Acme', telnyx_api_key: 'plaintext-key', telnyx_phone: '+15551234567' }],
    hr_employee_profiles: [
      { id: 'p1', tenant_id: CTX_TENANT, team_member_id: 'tm-terminated', hr_status: 'terminated' },
      { id: 'p2', tenant_id: CTX_TENANT, team_member_id: 'tm-active', hr_status: 'active' },
    ],
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

describe('routes/[id]/publish POST — terminated-crew guard', () => {
  it('BLOCKED: publishing a route assigned to a now-terminated team member 400s, no SMS sent', async () => {
    const res = await POST({} as Request, ctx('route-a'))
    expect(res.status).toBe(400)
    expect(sendSMS).not.toHaveBeenCalled()
    expect(h.capture.updates.find((u) => u.table === 'routes')).toBeUndefined()
  })

  it('CONTROL: publishing a route assigned to an active team member still sends the SMS', async () => {
    const res = await POST({} as Request, ctx('route-b'))
    expect(res.status).toBe(200)
    expect(sendSMS).toHaveBeenCalledTimes(1)
    const update = h.capture.updates.find((u) => u.table === 'routes')!
    expect(update.values.status).toBe('published')
  })
})
